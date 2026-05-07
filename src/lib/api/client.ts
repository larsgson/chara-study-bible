// Single fetcher for all API calls. Components never call fetch() directly;
// they call typed functions in lib/api/<resource>.ts which all go through this.

const API_BASE = (import.meta.env.PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '')
const API_PASSWORD = import.meta.env.PUBLIC_API_PASSWORD ?? ''

export interface ApiError extends Error {
  status: number
  detail: string
  code: 'http' | 'network' | 'unconfigured'
}

export class ApiNotConfiguredError extends Error implements ApiError {
  status = 0
  detail = 'API base URL is not configured (PUBLIC_API_BASE_URL).'
  code = 'unconfigured' as const
  constructor() {
    super('API base URL is not configured')
    this.name = 'ApiNotConfiguredError'
  }
}

export function isApiConfigured(): boolean {
  return API_BASE.length > 0
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { authed?: boolean },
): Promise<T> {
  if (!API_BASE) throw new ApiNotConfiguredError()

  const headers = new Headers(init?.headers)
  headers.set('accept', 'application/json')
  if (init?.authed && API_PASSWORD) {
    headers.set('authorization', `Bearer ${API_PASSWORD}`)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, mode: 'cors' })
  } catch (cause) {
    const err = new Error('Network error') as ApiError
    err.status = 0
    err.detail = cause instanceof Error ? cause.message : 'fetch failed'
    err.code = 'network'
    throw err
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .catch(() => ({ detail: response.statusText }))
    const err = new Error(detail.detail ?? response.statusText) as ApiError
    err.status = response.status
    err.detail = detail.detail ?? response.statusText
    err.code = 'http'
    throw err
  }

  return response.json() as Promise<T>
}
