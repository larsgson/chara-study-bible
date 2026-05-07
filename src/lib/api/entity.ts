// Stage-3 pending. Replaces the previous local profileLoader for people/places.
import { apiFetch } from './client'
import type { EntityDetail, EntityType } from '../types'

export function getEntity(id: string, lang = 'en'): Promise<EntityDetail> {
  return apiFetch<EntityDetail>(`/api/entity/${encodeURIComponent(id)}?lang=${lang}`)
}

export function listEntitiesByType(
  type: EntityType,
  lang = 'en',
  offset = 0,
  limit = 50,
): Promise<{ items: { id: string; name: string }[]; total: number }> {
  return apiFetch(
    `/api/entity?type=${encodeURIComponent(type)}&lang=${lang}&offset=${offset}&limit=${limit}`,
  )
}
