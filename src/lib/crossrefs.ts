// Cross-references: API primary, local TSK fallback.
//
// Composition helper that decides which source to use. Components call one
// function (`fetchCrossRefs`) and get a unified result. When the API is
// configured and reachable, the result comes from `/api/cross-references`;
// otherwise (and on any API error) the local TSK index already shipped with
// each chapter is used, with preview text pulled from chapter JSONs.

import { isApiConfigured } from './api/client'
import { getCrossReferences } from './api/crossrefs'
import { getBookById } from '../data/books'
import { loadCrossRefPreviews } from './local/crossRefPreview'

export interface CrossRefDisplay {
  ref: string // "HEB.11.17"
  human: string // "HEB 11:17" (local) or "Hebrews 11:17" (API)
  url: string // "/bible/heb/11/17"
  preview: string | null // first ~80 chars of the verse, when available
}

export interface CrossRefsResult {
  source: 'api' | 'local'
  items: CrossRefDisplay[]
}

export interface FetchCrossRefsArgs {
  bookId: number
  chapterNumber: number
  verseNumber: number
  // TSK refs from `indexEntry.x` for the local fallback.
  localRefs: string[]
}

export async function fetchCrossRefs(args: FetchCrossRefsArgs): Promise<CrossRefsResult> {
  const bbcccvvv = args.bookId * 1_000_000 + args.chapterNumber * 1_000 + args.verseNumber

  if (isApiConfigured()) {
    try {
      const response = await getCrossReferences(bbcccvvv)
      return {
        source: 'api',
        items: response.cross_references.map(r => ({
          ref: bbcccvvvToRef(r.target_start_bbcccvvv),
          human: r.human,
          url: bbcccvvvToUrl(r.target_start_bbcccvvv) ?? r.url,
          // API doesn't include preview text in this endpoint — left null.
          preview: null,
        })),
      }
    } catch {
      // Fall through to the local path on any API error.
    }
  }

  const previews = await loadCrossRefPreviews(args.localRefs)
  const previewMap = new Map(previews.map(p => [p.ref, p.text]))
  return {
    source: 'local',
    items: args.localRefs.map(ref => ({
      ref,
      human: formatLocalRef(ref),
      url: localRefToUrl(ref),
      preview: previewMap.get(ref) ?? null,
    })),
  }
}

function bbcccvvvToRef(bbcccvvv: number): string {
  const bookId = Math.floor(bbcccvvv / 1_000_000)
  const ch = Math.floor((bbcccvvv % 1_000_000) / 1_000)
  const v = bbcccvvv % 1_000
  const book = getBookById(bookId)
  return book ? `${book.code}.${ch}.${v}` : `${bookId}.${ch}.${v}`
}

function bbcccvvvToUrl(bbcccvvv: number): string | null {
  const bookId = Math.floor(bbcccvvv / 1_000_000)
  const ch = Math.floor((bbcccvvv % 1_000_000) / 1_000)
  const v = bbcccvvv % 1_000
  const book = getBookById(bookId)
  if (!book) return null
  return `/bible/${book.code.toLowerCase()}/${ch}/${v}`
}

function formatLocalRef(ref: string): string {
  const parts = ref.split('.')
  return parts.length === 3 ? `${parts[0]} ${parts[1]}:${parts[2]}` : ref
}

function localRefToUrl(ref: string): string {
  const parts = ref.split('.')
  if (parts.length === 3) return `/bible/${parts[0].toLowerCase()}/${parts[1]}/${parts[2]}`
  if (parts.length === 2) return `/bible/${parts[0].toLowerCase()}/${parts[1]}`
  return '#'
}
