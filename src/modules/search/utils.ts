import type { CatalogListItem } from '@/domain/types/catalog'

type SearchableSuggestion = {
  id: string
  label: string
  kind: string
  href: string
  thumbnail?: string | null
}

const ARABIC_DIACRITICS_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g
const LATIN_DIACRITICS_REGEX = /[\u0300-\u036f]/g
const SEPARATORS_REGEX = /[\-_./|,+()[\]{}!?:;"'`~@#$%^&*=\\]+/g
const MULTISPACE_REGEX = /\s+/g

export function normalizeSearchText(input: string) {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(LATIN_DIACRITICS_REGEX, '')
    .replace(ARABIC_DIACRITICS_REGEX, '')
    .replace(/[\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/[\u0624\u0626]/g, '\u0621')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(SEPARATORS_REGEX, ' ')
    .replace(MULTISPACE_REGEX, ' ')
    .trim()
}

function toTokens(input: string) {
  return normalizeSearchText(input)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
}

function startsWithWord(haystack: string, query: string) {
  return haystack.split(' ').some((word) => word.startsWith(query))
}

function countTokenHits(haystack: string, tokens: string[]) {
  return tokens.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0)
}

function scoreMatch(query: string, primary: string, secondary: string[] = []) {
  if (!query || !primary) return 0

  const queryTokens = toTokens(query)
  const normalizedPrimary = normalizeSearchText(primary)
  const normalizedSecondary = secondary.map((value) => normalizeSearchText(value)).filter(Boolean)
  const allFields = [normalizedPrimary, ...normalizedSecondary]

  const hasCoverage = queryTokens.every((token) => allFields.some((field) => field.includes(token)))
  if (!hasCoverage) return 0

  let score = 0

  if (normalizedPrimary === query) score += 1000
  else if (normalizedPrimary.startsWith(query)) score += 850
  else if (startsWithWord(normalizedPrimary, query)) score += 760
  else if (normalizedPrimary.includes(query)) score += 660

  const exactSecondary = normalizedSecondary.findIndex((field) => field === query)
  if (exactSecondary >= 0) score += 380 - exactSecondary * 20

  const prefixSecondary = normalizedSecondary.findIndex((field) => field.startsWith(query))
  if (prefixSecondary >= 0) score += 260 - prefixSecondary * 15

  const containsSecondary = normalizedSecondary.findIndex((field) => field.includes(query))
  if (containsSecondary >= 0) score += 170 - containsSecondary * 10

  score += countTokenHits(normalizedPrimary, queryTokens) * 55
  score += normalizedSecondary.reduce((sum, field, index) => {
    const weight = index === 0 ? 20 : 12
    return sum + countTokenHits(field, queryTokens) * weight
  }, 0)

  return score
}

export function searchCatalogItems(items: CatalogListItem[], query: string) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return []

  return [...items]
    .map((item, index) => ({
      item,
      index,
      score: scoreMatch(normalizedQuery, item.name, [item.slug, item.category, item.description ?? '']),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (Number(b.item.available) !== Number(a.item.available)) return Number(b.item.available) - Number(a.item.available)
      return a.index - b.index
    })
    .map((entry) => entry.item)
}

export function searchSuggestionItems(items: SearchableSuggestion[], query: string, limit: number = 8) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return []

  return [...items]
    .map((item, index) => ({
      item,
      index,
      score: scoreMatch(normalizedQuery, item.label, [item.kind]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.index - b.index
    })
    .slice(0, limit)
    .map((entry) => entry.item)
}
