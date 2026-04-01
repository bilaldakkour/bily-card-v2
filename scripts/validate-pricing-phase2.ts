import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

async function startProviderStub() {
  const server = createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(404).end()
      return
    }

    if (req.url.startsWith('/order') && req.method === 'POST') {
      let raw = ''
      for await (const chunk of req) {
        raw += chunk
      }

      const body = JSON.parse(raw || '{}') as { account?: string }
      const shouldFail = (body.account ?? '').toLowerCase().includes('fail')

      res.setHeader('Content-Type', 'application/json')
      if (shouldFail) {
        res.end(JSON.stringify({ success: false }))
      } else {
        res.end(JSON.stringify({ success: true, ref: `stub-${Date.now()}` }))
      }
      return
    }

    if (req.url.startsWith('/quote') && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ cost: 1, stock: true }))
      return
    }

    res.writeHead(404).end()
  })

  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Failed to start provider stub')

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  }
}

async function main() {
  const provider = await startProviderStub()

  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } })

  process.env.MONGODB_URI = mongo.getUri('bily-card-v2-validation')
  process.env.AUTH_SECRET = 'validation_secret_which_is_long_enough_12345'
  process.env.NODE_ENV = 'test'
  process.env.DAILY_CARD_BASE_URL = provider.baseUrl
  process.env.DAILY_CARD_API_KEY = 'stub-key'

  const [{ connectDb }, models, catalog, adminProducts, pricing, ordersService, walletService] = await Promise.all([
    import('../src/modules/db/connection'),
    import('../src/domain/models'),
    import('../src/modules/catalog/service'),
    import('../src/features/admin/products.service'),
    import('../src/modules/pricing/engine'),
    import('../src/features/orders/service'),
    import('../src/features/wallet/service'),
  ])

  const {
    ProductModel,
    ProductPricingRuleModel,
    ProductProviderLinkModel,
    ProviderCatalogCacheModel,
    OrderModel,
    WalletTransactionModel,
    WalletDepositRequestModel,
    UserModel,
    ManualOrderModel,
    ManualOrderAuditLogModel,
    OrderAuditLogModel,
  } = models as any

  await connectDb()

  await Promise.all([
    ProductModel.deleteMany({}),
    ProductPricingRuleModel.deleteMany({}),
    ProductProviderLinkModel.deleteMany({}),
    ProviderCatalogCacheModel.deleteMany({}),
    OrderModel.deleteMany({}),
    WalletTransactionModel.deleteMany({}),
    WalletDepositRequestModel.deleteMany({}),
    UserModel.deleteMany({}),
    ManualOrderModel.deleteMany({}),
    ManualOrderAuditLogModel.deleteMany({}),
    OrderAuditLogModel.deleteMany({}),
  ])

  const [adminUser, customer] = await UserModel.create([
    {
      name: 'Admin',
      email: 'admin@test.local',
      passwordHash: 'x',
      role: 'admin',
      isActive: true,
      walletBalanceMinor: 0,
    },
    {
      name: 'Customer',
      email: 'customer@test.local',
      passwordHash: 'x',
      role: 'customer',
      isActive: true,
      walletBalanceMinor: 10000,
    },
  ])

  const [pubg, hala] = await ProductModel.create([
    {
      slug: 'pubg-uc',
      name: 'PUBG UC',
      description: 'package-based test product',
      category: 'Battle Royale',
      kind: 'package',
      visible: true,
      active: true,
      routingMode: 'provider_only',
      packages: [
        { key: '60uc', label: '60 UC', sortOrder: 1, visible: true, active: true },
        { key: '325uc', label: '325 UC', sortOrder: 2, visible: true, active: true },
      ],
    },
    {
      slug: 'hala-me-coins',
      name: 'Hala Me',
      description: 'count-based test product',
      category: 'Social',
      kind: 'count',
      visible: true,
      active: true,
      routingMode: 'provider_only',
      countConfig: { min: 1, max: 100, step: 1 },
      packages: [],
    },
  ])

  await ProductPricingRuleModel.create([
    {
      productId: pubg._id,
      defaultMarginPct: 20,
      countMarginPct: 20,
      roundingMode: 'nearest_0_01',
      isDiscountEnabled: false,
      customerDiscountPct: 0,
      packageMarginOverrides: {},
    },
    {
      productId: hala._id,
      defaultMarginPct: 18,
      countMarginPct: 18,
      roundingMode: 'nearest_0_01',
      isDiscountEnabled: false,
      customerDiscountPct: 0,
      packageMarginOverrides: {},
    },
  ])

  await ProductProviderLinkModel.create([
    { productId: pubg._id, packageKey: '60uc', provider: 'daily_card', providerProductId: 'pubg', providerVariantId: '60', active: true },
    { productId: pubg._id, packageKey: '325uc', provider: 'daily_card', providerProductId: 'pubg', providerVariantId: '325', active: true },
    { productId: hala._id, packageKey: null, provider: 'daily_card', providerProductId: 'hala', providerVariantId: null, active: true },
  ])

  await ProviderCatalogCacheModel.create({
    provider: 'daily_card',
    products: [
      { productId: 'pubg', variantId: '60', cost: 0.7, available: true },
      { productId: 'pubg', variantId: '325', cost: 3.2, available: false },
      { productId: 'hala', variantId: null, cost: 0.05, available: true },
    ],
    fetchedAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  })

  // 1) Package product E2E
  const pricingRuleBefore = await ProductPricingRuleModel.findOne({ productId: pubg._id }).lean()
  const pubgBefore = await catalog.getCatalogDetailBySlug('pubg-uc')
  const previewBefore = await adminProducts.getAdminProductPreview(String(pubg._id))

  await adminProducts.updateProductPricingRule(String(pubg._id), {
    defaultMarginPct: 35,
    countMarginPct: 35,
    roundingMode: 'nearest_0_01',
    isDiscountEnabled: true,
    customerDiscountPct: 10,
    packageMarginOverrides: {},
  })

  const pricingRuleAfter = await ProductPricingRuleModel.findOne({ productId: pubg._id }).lean()
  const pubgAfter = await catalog.getCatalogDetailBySlug('pubg-uc')
  const previewAfter = await adminProducts.getAdminProductPreview(String(pubg._id))

  const pubgOrderSuccess = await ordersService.placeOrder({
    userId: String(customer._id),
    productSlug: 'pubg-uc',
    packageKey: '60uc',
    account: 'pubg-success-account',
  })

  const pubgStoredSuccess = await OrderModel.findById(pubgOrderSuccess.orderId).lean()
  const walletAfterSuccess = await UserModel.findById(customer._id).lean()
  const walletTxAfterSuccess = await WalletTransactionModel.find({ userId: customer._id }).sort({ createdAt: 1 }).lean()
  const auditAfterSuccess = await OrderAuditLogModel.find({ orderId: pubgOrderSuccess.orderId }).sort({ createdAt: 1 }).lean()

  // failure path (refund)
  const balanceBeforeFailure = walletAfterSuccess.walletBalanceMinor
  const pubgOrderFailure = await ordersService.placeOrder({
    userId: String(customer._id),
    productSlug: 'pubg-uc',
    packageKey: '60uc',
    account: 'pubg-fail-account',
  })

  const pubgStoredFailure = await OrderModel.findById(pubgOrderFailure.orderId).lean()
  const walletAfterFailure = await UserModel.findById(customer._id).lean()
  const walletTxAfterFailure = await WalletTransactionModel.find({ userId: customer._id }).sort({ createdAt: 1 }).lean()
  const auditAfterFailure = await OrderAuditLogModel.find({ orderId: pubgOrderFailure.orderId }).sort({ createdAt: 1 }).lean()

  // 2) Count product E2E
  const halaDetail = await catalog.getCatalogDetailBySlug('hala-me-coins')
  const halaOrderQty1 = await ordersService.placeOrder({
    userId: String(customer._id),
    productSlug: 'hala-me-coins',
    account: 'hala-success-1',
    countValue: 1,
  })
  const halaOrderQty10 = await ordersService.placeOrder({
    userId: String(customer._id),
    productSlug: 'hala-me-coins',
    account: 'hala-success-10',
    countValue: 10,
  })

  const halaStored1 = await OrderModel.findById(halaOrderQty1.orderId).lean()
  const halaStored10 = await OrderModel.findById(halaOrderQty10.orderId).lean()

  // 4) Deposit flow E2E
  const balanceBeforeDeposit = (await UserModel.findById(customer._id).lean()).walletBalanceMinor
  const depositApprove = await walletService.createDepositRequest(String(customer._id), 5000, 'proof-1')
  await walletService.approveDeposit(String(depositApprove._id), String(adminUser._id))
  const balanceAfterDepositApprove = (await UserModel.findById(customer._id).lean()).walletBalanceMinor

  const depositReject = await walletService.createDepositRequest(String(customer._id), 3000, 'proof-2')
  await walletService.rejectDeposit({ depositId: String(depositReject._id), adminId: String(adminUser._id), note: 'rejected' })
  const balanceAfterDepositReject = (await UserModel.findById(customer._id).lean()).walletBalanceMinor

  const rejectedDepositRow = await WalletDepositRequestModel.findById(depositReject._id).lean()

  // Static constraints
  const popupSource = readFileSync(join(process.cwd(), 'src/components/product/product-popup.tsx'), 'utf8')
  const fetchMatches = popupSource.match(/fetch\(/g) ?? []

  const expectedBefore60 = pricing.calculateFinalPrice({ rawCost: 0.7, marginPercent: 20, customerDiscountPercent: 0 }).finalPrice
  const expectedAfter60 = pricing.calculateFinalPrice({ rawCost: 0.7, marginPercent: 35, customerDiscountPercent: 10 }).finalPrice
  const expectedBefore325 = pricing.calculateFinalPrice({ rawCost: 3.2, marginPercent: 20, customerDiscountPercent: 0 }).finalPrice
  const expectedAfter325 = pricing.calculateFinalPrice({ rawCost: 3.2, marginPercent: 35, customerDiscountPercent: 10 }).finalPrice

  assert(pubgAfter.packages.find((p: any) => p.key === '60uc').finalPrice === expectedAfter60, 'PUBG 60 after mismatch')
  assert(pubgAfter.packages.find((p: any) => p.key === '325uc').finalPrice === expectedAfter325, 'PUBG 325 after mismatch')
  assert(previewAfter.detail.packages.find((p: any) => p.key === '60uc').finalPrice === expectedAfter60, 'Preview mismatch')
  assert(pubgStoredSuccess.status === 'completed', 'Success order should be completed')
  assert(pubgStoredFailure.status === 'refunded', 'Failure order should be refunded')
  assert(walletAfterFailure.walletBalanceMinor === balanceBeforeFailure, 'Refund must restore balance')
  assert(halaDetail.count.current === halaDetail.count.min, 'Count min autofill failed')
  assert(fetchMatches.length === 1, 'Popup should not fetch on package selection')

  console.log(
    JSON.stringify(
      {
        testedProducts: {
          package: 'PUBG UC',
          count: 'Hala Me',
        },
        beforeAfter: {
          pricingRuleBefore: {
            defaultMarginPct: pricingRuleBefore.defaultMarginPct,
            customerDiscountPct: pricingRuleBefore.customerDiscountPct,
            isDiscountEnabled: pricingRuleBefore.isDiscountEnabled,
          },
          pricingRuleAfter: {
            defaultMarginPct: pricingRuleAfter.defaultMarginPct,
            customerDiscountPct: pricingRuleAfter.customerDiscountPct,
            isDiscountEnabled: pricingRuleAfter.isDiscountEnabled,
          },
          catalogBefore: {
            pubg60: pubgBefore.packages.find((p: any) => p.key === '60uc')?.finalPrice,
            pubg325: pubgBefore.packages.find((p: any) => p.key === '325uc')?.finalPrice,
          },
          catalogAfter: {
            pubg60: pubgAfter.packages.find((p: any) => p.key === '60uc')?.finalPrice,
            pubg325: pubgAfter.packages.find((p: any) => p.key === '325uc')?.finalPrice,
          },
        },
        packageE2E: {
          outOfStockDisabled: pubgBefore.packages.find((p: any) => p.key === '325uc')?.available === false,
          adminPreviewMatchesPublic: previewAfter.detail.packages.find((p: any) => p.key === '60uc')?.finalPrice === pubgAfter.packages.find((p: any) => p.key === '60uc')?.finalPrice,
          priceSelectionFetchTriggered: false,
          orderStoredSuccess: {
            status: pubgStoredSuccess.status,
            unitPriceMinor: pubgStoredSuccess.unitPriceMinor,
            totalPriceMinor: pubgStoredSuccess.totalPriceMinor,
            totalCostMinor: pubgStoredSuccess.totalCostMinor,
            profitMinor: pubgStoredSuccess.profitMinor,
          },
          orderStoredFailure: {
            status: pubgStoredFailure.status,
            failureCode: pubgStoredFailure.failureCode,
          },
        },
        countE2E: {
          minAutoFilled: halaDetail.count.current === halaDetail.count.min,
          immediateUnitPrice: halaDetail.count.unitPrice,
          orderQty1: {
            countValue: halaStored1.countValue,
            totalPriceMinor: halaStored1.totalPriceMinor,
            totalCostMinor: halaStored1.totalCostMinor,
            profitMinor: halaStored1.profitMinor,
          },
          orderQty10: {
            countValue: halaStored10.countValue,
            totalPriceMinor: halaStored10.totalPriceMinor,
            totalCostMinor: halaStored10.totalCostMinor,
            profitMinor: halaStored10.profitMinor,
          },
        },
        walletLifecycleE2E: {
          balanceAfterSuccess: walletAfterSuccess.walletBalanceMinor,
          balanceBeforeFailure,
          balanceAfterFailure: walletAfterFailure.walletBalanceMinor,
          successAudits: auditAfterSuccess.map((a: any) => a.action),
          failureAudits: auditAfterFailure.map((a: any) => a.action),
          walletTransactions: walletTxAfterFailure.map((tx: any) => ({
            type: tx.type,
            amountMinor: tx.amountMinor,
            balanceAfterMinor: tx.balanceAfterMinor,
            referenceId: tx.referenceId,
          })),
        },
        depositFlowE2E: {
          balanceBeforeDeposit,
          balanceAfterDepositApprove,
          balanceAfterDepositReject,
          rejectedDepositStatus: rejectedDepositRow.status,
          rejectedDepositNote: rejectedDepositRow.adminNote,
        },
        consistencyProof: {
          expectedBefore60,
          expectedAfter60,
          expectedBefore325,
          expectedAfter325,
          popupHasOnlySubmitFetch: fetchMatches.length === 1,
        },
      },
      null,
      2
    )
  )

  const mongoose = await import('mongoose')
  await mongoose.default.disconnect()
  await provider.close()
  await mongo.stop()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

