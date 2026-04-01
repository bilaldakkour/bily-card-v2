import mongoose from 'mongoose'
import { connectDb } from '@/modules/db/connection'
import { ApiError } from '@/core/http'
import { UserModel, WalletDepositRequestModel, WalletTransactionModel } from '@/domain/models'

export async function getWalletSummary(userId: string) {
  await connectDb()

  const user = (await UserModel.findById(userId).select({ walletBalanceMinor: 1 }).lean()) as any
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

  const transactions = await WalletTransactionModel.find({ userId })
    .select({ type: 1, amountMinor: 1, balanceAfterMinor: 1, note: 1, referenceType: 1, referenceId: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  return {
    balanceMinor: user.walletBalanceMinor,
    transactions: transactions.map((tx: any) => ({
      _id: String(tx._id),
      type: tx.type,
      amountMinor: tx.amountMinor,
      balanceAfterMinor: tx.balanceAfterMinor,
      referenceType: tx.referenceType ?? null,
      referenceId: tx.referenceId ?? null,
      note: tx.note ?? '',
      createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : null,
    })),
  }
}

export async function getDepositRequestsForUser(userId: string) {
  await connectDb()

  const deposits = await WalletDepositRequestModel.find({ userId })
    .select({ amountMinor: 1, receiptUrl: 1, status: 1, adminNote: 1, createdAt: 1, reviewedAt: 1 })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  return deposits.map((deposit: any) => ({
    _id: String(deposit._id),
    amountMinor: deposit.amountMinor,
    receiptUrl: deposit.receiptUrl ?? '',
    status: deposit.status,
    adminNote: deposit.adminNote ?? '',
    createdAt: deposit.createdAt ? new Date(deposit.createdAt).toISOString() : null,
    reviewedAt: deposit.reviewedAt ? new Date(deposit.reviewedAt).toISOString() : null,
  }))
}

export async function getDepositRequestsForAdmin(status?: 'pending' | 'approved' | 'rejected') {
  await connectDb()

  const query = status ? { status } : {}
  return WalletDepositRequestModel.find(query)
    .select({ amountMinor: 1, receiptUrl: 1, status: 1, adminNote: 1, createdAt: 1, reviewedAt: 1, userId: 1 })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()
}

export async function createDepositRequest(userId: string, amountMinor: number, receiptUrl: string) {
  await connectDb()

  if (amountMinor <= 0) throw new ApiError(400, 'INVALID_AMOUNT', 'Amount must be positive')

  return WalletDepositRequestModel.create({
    userId,
    amountMinor,
    receiptUrl,
    status: 'pending',
  })
}

export async function approveDeposit(depositId: string, adminId: string) {
  await connectDb()
  const session = await mongoose.startSession()

  try {
    await session.withTransaction(async () => {
      const deposit = await WalletDepositRequestModel.findById(depositId).session(session)
      if (!deposit) throw new ApiError(404, 'DEPOSIT_NOT_FOUND', 'Deposit not found')
      if (deposit.status !== 'pending') throw new ApiError(409, 'DEPOSIT_ALREADY_REVIEWED', 'Deposit already reviewed')

      const user = await UserModel.findById(deposit.userId).session(session)
      if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found')

      user.walletBalanceMinor += deposit.amountMinor
      await user.save({ session })

      deposit.status = 'approved'
      deposit.reviewedBy = new mongoose.Types.ObjectId(adminId)
      deposit.reviewedAt = new Date()
      await deposit.save({ session })

      await WalletTransactionModel.create(
        [
          {
            userId: user._id,
            type: 'deposit',
            amountMinor: deposit.amountMinor,
            balanceAfterMinor: user.walletBalanceMinor,
            referenceType: 'deposit_request',
            referenceId: String(deposit._id),
            note: 'Deposit approved',
          },
        ],
        { session }
      )
    })
  } finally {
    await session.endSession()
  }
}

export async function rejectDeposit(input: { depositId: string; adminId: string; note?: string }) {
  await connectDb()

  const deposit = await WalletDepositRequestModel.findById(input.depositId)
  if (!deposit) throw new ApiError(404, 'DEPOSIT_NOT_FOUND', 'Deposit not found')
  if (deposit.status !== 'pending') throw new ApiError(409, 'DEPOSIT_ALREADY_REVIEWED', 'Deposit already reviewed')

  deposit.status = 'rejected'
  deposit.adminNote = input.note ?? ''
  deposit.reviewedBy = new mongoose.Types.ObjectId(input.adminId)
  deposit.reviewedAt = new Date()
  await deposit.save()

  return { id: String(deposit._id), status: deposit.status }
}
