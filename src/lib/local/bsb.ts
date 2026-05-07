// Client-side types and Strong's-to-verse concordance loader.
// Local territory only — no API calls.
//
// Chapter / heading / index data is read at build time by lib/local/chapter.ts
// and embedded into chapter-page props. Nothing here re-fetches it at runtime.

import books from '../../data/books'

// Types

export type BSBWord = [string, string | null] // [text, strongs_number]

export type BSBVerse = {
  v: number
  w: BSBWord[]
  heb?: BSBWord[] // Hebrew words (OT only)
  grk?: BSBWord[] // Greek words (NT only)
}

export type BSBChapter = {
  book: string
  chapter: number
  verses: BSBVerse[]
}

export type BSBHeading = {
  id: string
  b: string
  c: number
  before_v: number
  level: 's1' | 's2' | 'r'
  text: string
  refs: string[]
}

export type BSBMorphEntry = {
  s: string
  m: string
  p: string
  l: string
}

export type BSBWordSense = {
  si: number
  s: string
  gl: string
}

export type BSBMarbleSense = {
  lem: string
  dom: string
  sid: string
}

export type BSBIndexEntry = {
  s: string[]
  x: string[]
  m?: BSBMorphEntry[]
  tp?: string[]
  par?: string[]
  img?: string[]
  map?: string[]
  dom?: string[]
  ws?: Record<string, BSBWordSense>
  msense?: Record<string, BSBMarbleSense>
  g?: Record<string, { lemma?: string; glosses?: string[]; def?: string; xlit?: string }>
}

export type ConcordanceResult = {
  id: string
  bookCode: string
  bookNumber: number
  chapter: number
  verse: number
}

// Book code lookup helpers (re-exported below).
function getBookCode(bookNumber: number): string | null {
  const book = books.find(b => b.id === bookNumber)
  return book?.code || null
}

function getBookNumber(bookCode: string): number {
  const book = books.find(b => b.code === bookCode.toUpperCase())
  return book?.id || 0
}

function isOT(book: number | string): boolean {
  const num = typeof book === 'number' ? book : getBookNumber(book)
  return num >= 1 && num <= 39
}

// Strong's number → verse list. Backed by /data/concordance/strongs-to-verses.json.
let concordanceCache: Map<string, string[]> | null = null

async function loadConcordance(): Promise<Map<string, string[]> | null> {
  if (concordanceCache) return concordanceCache
  try {
    const response = await fetch(`/data/concordance/strongs-to-verses.json`)
    if (!response.ok) return null
    const data = await response.json()
    concordanceCache = new Map(Object.entries(data))
    return concordanceCache
  } catch (error) {
    console.error('Error loading concordance:', error)
    return null
  }
}

export async function searchConcordance(strongsNumber: string): Promise<ConcordanceResult[]> {
  const concordance = await loadConcordance()
  if (!concordance) return []

  const normalized = strongsNumber.toUpperCase()
  const verseRefs = concordance.get(normalized)
  if (!verseRefs?.length) return []

  return verseRefs
    .map(ref => {
      const [bookCode, chapter, verse] = ref.split('.')
      return {
        id: ref,
        bookCode,
        bookNumber: getBookNumber(bookCode),
        chapter: parseInt(chapter),
        verse: parseInt(verse),
      }
    })
    .sort((a, b) => a.bookNumber - b.bookNumber || a.chapter - b.chapter || a.verse - b.verse)
}

export { getBookCode, getBookNumber, isOT as isOldTestament }
