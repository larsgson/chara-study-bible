// URL bridge between the API's "/en/<tree>/<...>" paths and the local
// BSB reader. Bible text at verse/chapter granularity already lives in
// the static reader at /bible/<book>/<chapter>?v=<verse>, so we route
// those clicks locally instead of round-tripping through the API.

const VERSE_RE =
  /^\/en\/(?:scripture|bible)\/(?:ot|nt)\/([A-Za-z0-9]+)\/(\d+)(?:\/(\d+))?\/?$/

/**
 * Convert an API-supplied path to the local equivalent when one exists.
 * Returns the original path if no local route applies.
 */
export function localizeApiPath(path: string): string {
  if (!path) return path
  const m = VERSE_RE.exec(path)
  if (!m) return path
  const [, book, chapter, verse] = m
  const local = `/bible/${book.toLowerCase()}/${chapter}`
  return verse ? `${local}?v=${verse}` : local
}

/**
 * True if the given path resolves to a local route (no API call needed).
 */
export function isLocalApiPath(path: string): boolean {
  return localizeApiPath(path) !== path
}
