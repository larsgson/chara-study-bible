// Standardized cache keys — works with TanStack Query / SWR / etc.
import type { SearchParams } from './search'

export const queryKeys = {
  health: () => ['health'] as const,
  tree: (tree: string, path: string[], lang: string) =>
    ['tree', tree, ...path, lang] as const,
  chunk: (chunkId: string) => ['chunk', chunkId] as const,
  topic: (id: string) => ['topic', id] as const,
  entity: (id: string) => ['entity', id] as const,
  crossRefs: (bbcccvvv: number, source?: string) =>
    ['xrefs', bbcccvvv, source ?? 'all'] as const,
  concordance: (word: string) => ['concordance', word.toLowerCase()] as const,
  search: (params: SearchParams) =>
    [
      'search',
      params.q,
      params.kind ?? '',
      params.book ?? '',
      params.source ?? 'all',
      params.semantic ?? false,
      params.top_k ?? 10,
    ] as const,
} as const
