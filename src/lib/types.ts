// API contract types — mirrors backend response shapes from docs/client-integration.md.
// These are the wire shapes; local data uses its own types in src/lib/local/.

export type ChunkId = string
export type DocId = string
export type Lang = 'en'

export type Kind =
  | 'scripture'
  | 'bible'
  | 'translator-note'
  | 'question'
  | 'term'
  | 'methodology'
  | 'study-note'
  | 'book-intro'
  | 'lexicon'
  | 'morphology'
  | 'section-heading'
  | 'video-transcript'
  | 'dictionary'
  | 'ane-context'
  | 'passage-cluster'
  | 'map'
  | 'image'
  | (string & {})

export interface ChunkPreview {
  chunk_id: ChunkId
  title: string
  kind: Kind
  passage: string | null
  tags: string[]
  excerpt: string
  primary_path: string
  permalink: string
}

export interface Chunk extends ChunkPreview {
  doc_id: DocId
  body: string
  passage_refs: [number, number][]
  all_paths: string[]
  cross_refs: {
    passage: ChunkPreview[]
    support_ref: ChunkPreview[]
    term: ChunkPreview[]
  }
}

export interface TreeNode {
  id: string
  label: string
  child_count?: number
  url: string
}

export interface TreeBranch {
  tree: string
  lang: Lang
  node: {
    id?: string
    label?: string
    passage?: string
    bbcccvvv?: number
    testament?: 'ot' | 'nt'
    section_heading?: string
  }
  children?: TreeNode[]
  chunks?: ChunkPreview[]
}

export interface TopicDetail {
  id: string
  name: string
  source: 'naves' | (string & {})
  passage_count: number
  passages: { bbcccvvv: number; human: string; url: string }[]
}

export type EntityType = 'person' | 'place' | 'event' | 'deity'

export interface EntityRelation {
  relation: string
  target: string
  name: string
}

export interface EntityDetail {
  id: string
  type: EntityType
  name: string
  metadata: Record<string, unknown>
  relations: EntityRelation[]
  passages: { bbcccvvv: number; human: string; url: string }[]
}

export interface CrossReference {
  target_start_bbcccvvv: number
  target_end_bbcccvvv: number
  human: string
  url: string
  source: 'tsk' | 'bsb-parallel' | (string & {})
  rank?: number | null
}

export interface CrossReferenceResponse {
  source_passage: { bbcccvvv: number; human: string }
  cross_references: CrossReference[]
}

export interface ConcordanceVerse {
  bbcccvvv: number
  human: string
  url: string
}

export interface ConcordanceResponse {
  word: string
  verse_count: number
  verses: ConcordanceVerse[]
}

export type SearchIntent =
  | 'thematic'
  | 'entity_lookup'
  | 'passage_specific'
  | 'passage_book'
  | 'methodology'
  | 'word-study'
  | 'morphology'
  | 'genealogy'
  | 'ane-context'
  | 'lexicon'

export interface QueryAnalysis {
  fts_query: string
  passages: [number, number][]
  tags: string[]
  intent: SearchIntent
}

export interface SearchHit extends ChunkPreview {
  score: number
  retrievers: string[]
}

export interface SearchResponse {
  query: string
  lang: Lang
  filters: Record<string, string | null>
  semantic: boolean
  analysis: QueryAnalysis
  hits: SearchHit[]
  total: number
}

export interface Citation extends ChunkPreview {
  n: number
}

export interface AskResponse {
  question: string
  answer: string
  citations: Citation[]
  confidence: 'low' | 'medium' | 'high'
  analysis: QueryAnalysis
}

export interface HealthResponse {
  status: 'ok' | 'uninitialized' | (string & {})
  ready: boolean
  schema_version: string
  indexed_at?: number
  embedding_model?: string
  vec_loaded?: boolean
  counts?: { documents: number; chunks: number; vectors: number }
}
