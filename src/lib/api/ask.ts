// RAG endpoint. Always password-gated.
import { apiFetch } from './client'
import type { AskResponse } from '../types'

export interface AskParams {
  question: string
  lang?: string
  scope?: { source?: string; book?: string | null }
}

export function ask(params: AskParams): Promise<AskResponse> {
  return apiFetch<AskResponse>(`/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
    authed: true,
  })
}

export interface AskStreamEvent {
  event: 'status' | 'hits' | 'token' | 'complete' | (string & {})
  data: unknown
}

const API_BASE = (import.meta.env.PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '')
const API_PASSWORD = import.meta.env.PUBLIC_API_PASSWORD ?? ''

export async function* askStream(params: AskParams): AsyncGenerator<AskStreamEvent> {
  if (!API_BASE) throw new Error('API base URL is not configured (PUBLIC_API_BASE_URL).')
  const headers: Record<string, string> = {
    accept: 'text/event-stream',
    'content-type': 'application/json',
  }
  if (API_PASSWORD) headers.authorization = `Bearer ${API_PASSWORD}`

  const r = await fetch(`${API_BASE}/api/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })
  if (!r.ok || !r.body) throw new Error(`ask SSE: ${r.status}`)
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += value
    let idx
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      const event = /^event: (.+)$/m.exec(block)?.[1]
      const data = /^data: (.+)$/m.exec(block)?.[1]
      if (event && data) yield { event, data: JSON.parse(data) }
    }
  }
}
