import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { ApiError } from '@/core/http'
import { HomeBannerModel } from '@/domain/models'
import { connectDb } from '@/modules/db/connection'
import type { HomeBanner } from './banner.types'

const defaultHomeBanners = [
  {
    title: 'شحن ألعاب بسرعة فائقة',
    subtitle: 'تنفيذ سريع وتجربة شراء مرتبة لمحبي الألعاب الرقمية.',
    imageUrl: '/test.jpg',
    linkUrl: '/products',
    badge: 'شحن فوري',
    isActive: true,
    sortOrder: 1,
  },
  {
    title: 'بطاقات وتطبيقات رقمية',
    subtitle: 'تصفح أفضل البطاقات والاشتراكات الرقمية في مكان واحد.',
    imageUrl: '/test1.jpg',
    linkUrl: '/products?segment=cards',
    badge: 'عرض خاص',
    isActive: true,
    sortOrder: 2,
  },
]

function mapBanner(doc: any): HomeBanner {
  return {
    id: String(doc._id),
    title: doc.title,
    subtitle: doc.subtitle ?? '',
    imageUrl: doc.imageUrl,
    linkUrl: doc.linkUrl || undefined,
    badge: doc.badge || undefined,
    isActive: Boolean(doc.isActive),
    sortOrder: Number(doc.sortOrder ?? 1),
  }
}

async function ensureDefaultHomeBanners() {
  const count = await HomeBannerModel.countDocuments({})
  if (count > 0) return
  await HomeBannerModel.insertMany(defaultHomeBanners)
}

export async function listHomeBanners() {
  await connectDb()
  await ensureDefaultHomeBanners()

  const rows = await HomeBannerModel.find({})
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()

  return rows.map(mapBanner)
}

export async function getHomeActiveBanners() {
  const banners = await listHomeBanners()
  return banners.filter((banner) => banner.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function createHomeBanner(input: {
  title: string
  subtitle?: string
  imageUrl: string
  linkUrl?: string
  badge?: string
  isActive?: boolean
  sortOrder?: number
}) {
  await connectDb()

  const created = await HomeBannerModel.create({
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() ?? '',
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl?.trim() ?? '',
    badge: input.badge?.trim() ?? '',
    isActive: input.isActive ?? true,
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 1,
  })

  return mapBanner(created.toObject())
}

export async function updateHomeBanner(
  id: string,
  input: Partial<{
    title: string
    subtitle: string
    linkUrl: string
    badge: string
    isActive: boolean
    sortOrder: number
  }>
) {
  await connectDb()

  const update: Record<string, unknown> = {}
  if (typeof input.title === 'string') update.title = input.title.trim()
  if (typeof input.subtitle === 'string') update.subtitle = input.subtitle.trim()
  if (typeof input.linkUrl === 'string') update.linkUrl = input.linkUrl.trim()
  if (typeof input.badge === 'string') update.badge = input.badge.trim()
  if (typeof input.isActive === 'boolean') update.isActive = input.isActive
  if (typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)) update.sortOrder = input.sortOrder

  const updated = await HomeBannerModel.findByIdAndUpdate(id, update, { new: true }).lean()
  if (!updated) throw new ApiError(404, 'BANNER_NOT_FOUND', 'Banner not found')

  return mapBanner(updated)
}

export async function deleteHomeBanner(id: string) {
  await connectDb()
  const deleted = (await HomeBannerModel.findByIdAndDelete(id).lean()) as any
  if (!deleted) throw new ApiError(404, 'BANNER_NOT_FOUND', 'Banner not found')

  const imageUrl = String(deleted.imageUrl ?? '')
  if (imageUrl.startsWith('/uploads/banners/')) {
    const filePath = path.join(process.cwd(), 'public', imageUrl.replace(/^\/+/, ''))
    await unlink(filePath).catch(() => null)
  }

  return { success: true }
}

export async function saveBannerUpload(file: File) {
  if (!file || file.size === 0) throw new ApiError(400, 'IMAGE_REQUIRED', 'Banner image is required')
  if (!file.type.startsWith('image/')) throw new ApiError(400, 'INVALID_IMAGE', 'Banner file must be an image')

  const ext = path.extname(file.name) || mimeToExt(file.type)
  const fileName = `${Date.now()}-${randomUUID()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'banners')
  const uploadPath = path.join(uploadDir, fileName)

  await mkdir(uploadDir, { recursive: true })
  const bytes = Buffer.from(await file.arrayBuffer())
  await writeFile(uploadPath, bytes)

  return `/uploads/banners/${fileName}`
}

function mimeToExt(mimeType: string) {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  if (mimeType === 'image/gif') return '.gif'
  return '.jpg'
}
