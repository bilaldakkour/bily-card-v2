import { randomUUID } from 'node:crypto'
import { ApiError } from '@/core/http'
import { getSupabaseServerClient } from './server'

export type AppDocumentRow = {
  id: string
  collection: string
  slug: string | null
  email: string | null
  user_id: string | null
  status: string | null
  sort_order: number
  is_active: boolean | null
  is_visible: boolean | null
  payload: Record<string, any>
  created_at: string
  updated_at: string
}

type QueryFilters = {
  id?: string
  ids?: string[]
  slug?: string
  email?: string
  userId?: string
  status?: string
  isActive?: boolean
  isVisible?: boolean
}

type WriteDocumentInput = {
  id?: string
  collection: string
  slug?: string | null
  email?: string | null
  userId?: string | null
  status?: string | null
  sortOrder?: number
  isActive?: boolean | null
  isVisible?: boolean | null
  payload: Record<string, any>
}

const APP_DOCUMENTS_TABLE = 'app_documents'

function normalizeSupabaseError(error: any, feature = 'Supabase data storage'): never {
  const code = String(error?.code ?? '')
  const message = String(error?.message ?? 'Unexpected Supabase error')
  const normalizedMessage = message.toLowerCase()

  if (code === '42P01' || normalizedMessage.includes(APP_DOCUMENTS_TABLE)) {
    throw new ApiError(
      503,
      'SUPABASE_NOT_READY',
      `${feature} is not ready yet. Run supabase/app_documents.sql in your Supabase SQL editor first.`
    )
  }

  if (
    normalizedMessage.includes('fetch failed') ||
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('getaddrinfo') ||
    normalizedMessage.includes('econnrefused') ||
    normalizedMessage.includes('etimedout')
  ) {
    throw new ApiError(
      503,
      'SUPABASE_UNAVAILABLE',
      'Supabase is temporarily unavailable. Public data will fall back until the connection is restored.'
    )
  }

  throw new ApiError(500, 'SUPABASE_ERROR', message)
}

function mapRow(row: any): AppDocumentRow {
  return {
    id: String(row.id),
    collection: String(row.collection),
    slug: row.slug ?? null,
    email: row.email ?? null,
    user_id: row.user_id ?? null,
    status: row.status ?? null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: row.is_active ?? null,
    is_visible: row.is_visible ?? null,
    payload: typeof row.payload === 'object' && row.payload ? row.payload : {},
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  }
}

export async function queryDocuments(collection: string, filters: QueryFilters = {}, limit = 1000) {
  const supabase = getSupabaseServerClient()
  let query = (supabase
    .from(APP_DOCUMENTS_TABLE)
    .select('*')
    .eq('collection', collection)
    .limit(limit)) as any

  if (filters.id) query = query.eq('id', filters.id)
  if (filters.ids?.length) query = query.in('id', filters.ids)
  if (filters.slug) query = query.eq('slug', filters.slug)
  if (filters.email) query = query.eq('email', filters.email)
  if (filters.userId) query = query.eq('user_id', filters.userId)
  if (filters.status) query = query.eq('status', filters.status)
  if (typeof filters.isActive === 'boolean') query = query.eq('is_active', filters.isActive)
  if (typeof filters.isVisible === 'boolean') query = query.eq('is_visible', filters.isVisible)

  query = query.order('sort_order', { ascending: true }).order('updated_at', { ascending: false })

  const { data, error } = await query
  if (error) normalizeSupabaseError(error)

  return (data ?? []).map(mapRow)
}

export async function getDocumentById(collection: string, id: string) {
  const rows = await queryDocuments(collection, { id }, 1)
  return rows[0] ?? null
}

export async function getDocumentBySlug(collection: string, slug: string) {
  const rows = await queryDocuments(collection, { slug }, 1)
  return rows[0] ?? null
}

export async function getDocumentByEmail(collection: string, email: string) {
  const rows = await queryDocuments(collection, { email }, 1)
  return rows[0] ?? null
}

export async function getDocumentByUserId(collection: string, userId: string) {
  const rows = await queryDocuments(collection, { userId }, 1)
  return rows[0] ?? null
}

export async function writeDocument(input: WriteDocumentInput) {
  const supabase = getSupabaseServerClient()
  const table: any = supabase.from(APP_DOCUMENTS_TABLE)
  const row = {
    id: input.id ?? randomUUID(),
    collection: input.collection,
    slug: input.slug ?? null,
    email: input.email ?? null,
    user_id: input.userId ?? null,
    status: input.status ?? null,
    sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    is_active: input.isActive ?? null,
    is_visible: input.isVisible ?? null,
    payload: input.payload,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await (table
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single() as any)

  if (error) normalizeSupabaseError(error)

  return mapRow(data)
}

export async function deleteDocument(collection: string, id: string) {
  const supabase = getSupabaseServerClient()
  const { error } = await ((supabase.from(APP_DOCUMENTS_TABLE) as any).delete().eq('collection', collection).eq('id', id))
  if (error) normalizeSupabaseError(error)
}

export async function deleteDocuments(collection: string, filters: QueryFilters = {}) {
  const supabase = getSupabaseServerClient()
  let query = ((supabase.from(APP_DOCUMENTS_TABLE) as any).delete().eq('collection', collection)) as any

  if (filters.id) query = query.eq('id', filters.id)
  if (filters.ids?.length) query = query.in('id', filters.ids)
  if (filters.slug) query = query.eq('slug', filters.slug)
  if (filters.email) query = query.eq('email', filters.email)
  if (filters.userId) query = query.eq('user_id', filters.userId)
  if (filters.status) query = query.eq('status', filters.status)
  if (typeof filters.isActive === 'boolean') query = query.eq('is_active', filters.isActive)
  if (typeof filters.isVisible === 'boolean') query = query.eq('is_visible', filters.isVisible)

  const { error } = await query
  if (error) normalizeSupabaseError(error)
}

export function isSupabaseNotReadyError(error: unknown) {
  return error instanceof ApiError && error.code === 'SUPABASE_NOT_READY'
}

export function isSupabaseUnavailableError(error: unknown) {
  return error instanceof ApiError && error.code === 'SUPABASE_UNAVAILABLE'
}
