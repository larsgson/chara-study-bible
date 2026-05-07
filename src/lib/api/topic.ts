// Stage-3 pending. Route shape is frozen — handlers ship later.
import { apiFetch } from './client'
import type { TopicDetail } from '../types'

export function getTopic(id: string, lang = 'en'): Promise<TopicDetail> {
  return apiFetch<TopicDetail>(`/api/topic/${encodeURIComponent(id)}?lang=${lang}`)
}
