import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { ApiError } from '@/core/http'
import { HomeBannerModel } from '@/domain/models'
import { connectDb } from '@/modules/db/connection'
import { createDatabaseUnavailableError, isMongoEnabled, isSupabaseProvider } from '@/modules/db/provider'
import { deleteDocument, getDocumentById, isSupabaseNotReadyError, queryDocuments, writeDocument } from '@/modules/supabase/documents'
import type { HomeBanner } from './banner.types'

function isLegacyDefaultBanner(input: { imageUrl?: string | null }) {
  const imageUrl = String(input.imageUrl ?? '').trim()
  return imageUrl === '/test.jpg' || imageUrl === '/test1.jpg'
}

function normalizeBannerImageUrl(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const prefixedMatch = raw.match(/^image:\s*["']?(.+?)["']?$/i)
  const normalized = prefixedMatch?.[1]?.trim() ?? raw
  return normalized.replace(/^["']|["']$/g, '').trim()
}

function mapBanner(doc: any): HomeBanner {
  return {
    id: String(doc._id),
    title: doc.title,
    subtitle: doc.subtitle ?? '',
    imageUrl: normalizeBannerImageUrl(doc.imageUrl),
    linkUrl: doc.linkUrl || undefined,
    badge: doc.badge || undefined,
    isActive: Boolean(doc.isActive),
    sortOrder: Number(doc.sortOrder ?? 1),
  }
}

function mapSupabaseBanner(doc: any): HomeBanner {
  return {
    id: String(doc.id),
    title: doc.payload?.title ?? '',
    subtitle: doc.payload?.subtitle ?? '',
    imageUrl: normalizeBannerImageUrl(doc.payload?.imageUrl),
    linkUrl: doc.payload?.linkUrl || undefined,
    badge: doc.payload?.badge || undefined,
    isActive: Boolean(doc.is_active ?? doc.payload?.isActive ?? true),
    sortOrder: Number(doc.sort_order ?? doc.payload?.sortOrder ?? 1),
  }
}

async function getNextHomeBannerSortOrder() {
  if (isSupabaseProvider()) {
    const rows = await queryDocuments('home_banners')
    const maxSortOrder = rows.reduce(
      (max: number, row: any) => Math.max(max, Number(row.sort_order ?? row.payload?.sortOrder ?? 0)),
      0
    )
    return maxSortOrder + 1
  }

  if (!isMongoEnabled()) {
    return 1
  }

  await connectDb()
  const latest = (await HomeBannerModel.findOne({}).sort({ sortOrder: -1 }).lean()) as any
  return Number(latest?.sortOrder ?? 0) + 1
}

export async function listHomeBanners() {
  if (isSupabaseProvider()) {
    try {
      const rows = await queryDocuments('home_banners')
      return rows
        .map(mapSupabaseBanner)
        .filter((banner: HomeBanner) => !isLegacyDefaultBanner(banner))
    } catch (error) {
      if (isSupabaseNotReadyError(error)) {
        return []
      }
      throw error
    }
  }

  if (!isMongoEnabled()) {
    return []
  }

  await connectDb()

  const rows = await HomeBannerModel.find({})
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()

  return rows
    .map(mapBanner)
    .filter((banner: HomeBanner) => !isLegacyDefaultBanner(banner))
}

export async function getHomeActiveBanners() {
  const banners = await listHomeBanners()
  return banners
    .filter((banner: HomeBanner) => banner.isActive && typeof banner.imageUrl === 'string' && banner.imageUrl.trim().length > 0)
    .sort((a: HomeBanner, b: HomeBanner) => a.sortOrder - b.sortOrder)
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
  const sortOrder =
    typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder) && input.sortOrder > 0
      ? input.sortOrder
      : await getNextHomeBannerSortOrder()

  if (isSupabaseProvider()) {
    const created = await writeDocument({
      id: randomUUID(),
      collection: 'home_banners',
      sortOrder,
      isActive: input.isActive ?? true,
      payload: {
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() ?? '',
        imageUrl: normalizeBannerImageUrl(input.imageUrl),
        linkUrl: input.linkUrl?.trim() ?? '',
        badge: input.badge?.trim() ?? '',
        isActive: input.isActive ?? true,
        sortOrder,
      },
    })

    return mapSupabaseBanner(created)
  }

  if (!isMongoEnabled()) throw createDatabaseUnavailableError('Banner management')
  await connectDb()

  const created = await HomeBannerModel.create({
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() ?? '',
    imageUrl: normalizeBannerImageUrl(input.imageUrl),
    linkUrl: input.linkUrl?.trim() ?? '',
    badge: input.badge?.trim() ?? '',
    isActive: input.isActive ?? true,
    sortOrder,
  })

  return mapBanner(created.toObject())
}

export async function updateHomeBanner(
  id: string,
  input: Partial<{
    title: string
    subtitle: string
    imageUrl: string
    removeImage: boolean
    linkUrl: string
    badge: string
    isActive: boolean
    sortOrder: number
  }>
) {
  if (isSupabaseProvider()) {
    const existing = await getDocumentById('home_banners', id)
    if (!existing) throw new ApiError(404, 'BANNER_NOT_FOUND', 'Banner not found')

    const shouldRemoveImage = input.removeImage === true || input.imageUrl === ''
    const existingImageUrl = String(existing.payload?.imageUrl ?? '')

    const nextPayload = {
      ...existing.payload,
      ...(typeof input.title === 'string' ? { title: input.title.trim() } : {}),
      ...(typeof input.subtitle === 'string' ? { subtitle: input.subtitle.trim() } : {}),
      ...(shouldRemoveImage
        ? { imageUrl: '' }
        : typeof input.imageUrl === 'string'
          ? { imageUrl: normalizeBannerImageUrl(input.imageUrl) }
          : {}),
      ...(typeof input.linkUrl === 'string' ? { linkUrl: input.linkUrl.trim() } : {}),
      ...(typeof input.badge === 'string' ? { badge: input.badge.trim() } : {}),
      ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
      ...(typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder) ? { sortOrder: input.sortOrder } : {}),
    }

    const updated = await writeDocument({
      id: existing.id,
      collection: 'home_banners',
      sortOrder: Number(nextPayload.sortOrder ?? existing.sort_order ?? 1),
      isActive: Boolean(nextPayload.isActive ?? existing.is_active ?? true),
      payload: nextPayload,
    })

    if (shouldRemoveImage && existingImageUrl.startsWith('/uploads/banners/')) {
      const filePath = path.join(process.cwd(), 'public', existingImageUrl.replace(/^\/+/, ''))
      await unlink(filePath).catch(() => null)
    }

    return mapSupabaseBanner(updated)
  }

  if (!isMongoEnabled()) throw createDatabaseUnavailableError('Banner management')
  await connectDb()

  const existing = await HomeBannerModel.findById(id).lean()
  if (!existing) throw new ApiError(404, 'BANNER_NOT_FOUND', 'Banner not found')

  const shouldRemoveImage = input.removeImage === true || input.imageUrl === ''
  const update: Record<string, unknown> = {}
  if (typeof input.title === 'string') update.title = input.title.trim()
  if (typeof input.subtitle === 'string') update.subtitle = input.subtitle.trim()
  if (shouldRemoveImage) update.imageUrl = ''
  else if (typeof input.imageUrl === 'string') update.imageUrl = normalizeBannerImageUrl(input.imageUrl)
  if (typeof input.linkUrl === 'string') update.linkUrl = input.linkUrl.trim()
  if (typeof input.badge === 'string') update.badge = input.badge.trim()
  if (typeof input.isActive === 'boolean') update.isActive = input.isActive
  if (typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)) update.sortOrder = input.sortOrder

  const updated = await HomeBannerModel.findByIdAndUpdate(id, update, { new: true }).lean()
  if (!updated) throw new ApiError(404, 'BANNER_NOT_FOUND', 'Banner not found')

  if (shouldRemoveImage) {
    const existingImageUrl = String((existing as any).imageUrl ?? '')
    if (existingImageUrl.startsWith('/uploads/banners/')) {
      const filePath = path.join(process.cwd(), 'public', existingImageUrl.replace(/^\/+/, ''))
      await unlink(filePath).catch(() => null)
    }
  }

  return mapBanner(updated)
}

export async function deleteHomeBanner(id: string) {
  if (isSupabaseProvider()) {
    const existing = await getDocumentById('home_banners', id)
    if (!existing) throw new ApiError(404, 'BANNER_NOT_FOUND', 'Banner not found')
    await deleteDocument('home_banners', id)

    const imageUrl = String(existing.payload?.imageUrl ?? '')
    if (imageUrl.startsWith('/uploads/banners/')) {
      const filePath = path.join(process.cwd(), 'public', imageUrl.replace(/^\/+/, ''))
      await unlink(filePath).catch(() => null)
    }

    return { success: true }
  }

  if (!isMongoEnabled()) throw createDatabaseUnavailableError('Banner management')
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
