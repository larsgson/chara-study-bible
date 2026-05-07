// Stage-3 pending. English-word concordance over BSB.
// Distinct from local Strong's-number concordance (lib/local/strongs.ts).
import { apiFetch } from './client'
import type { ConcordanceResponse } from '../types'

export function getConcordance(word: string, lang = 'en'): Promise<ConcordanceResponse> {
  return apiFetch<ConcordanceResponse>(
    `/api/concordance/${encodeURIComponent(word)}?lang=${lang}`,
  )
}
