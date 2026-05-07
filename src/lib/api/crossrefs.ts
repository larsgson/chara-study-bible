// Stage-3 pending. Used by the lazy "see also" panel on verse pages.
// bbcccvvv format: book * 1_000_000 + chapter * 1_000 + verse (e.g. Romans 5:1 = 45_005_001).
import { apiFetch } from './client'
import type { CrossReferenceResponse } from '../types'

export function getCrossReferences(
  bbcccvvv: number,
  source?: 'tsk' | 'bsb-parallel',
): Promise<CrossReferenceResponse> {
  const qs = source ? `?source=${source}` : ''
  return apiFetch<CrossReferenceResponse>(`/api/cross-references/${bbcccvvv}${qs}`)
}
