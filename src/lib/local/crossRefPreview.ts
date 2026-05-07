// Cross-ref preview text loading has been disabled as part of Phase C build size reduction.
// Preview text will be restored when the API is available.
// This file is kept for interface compatibility but returns empty results.

export interface CrossRefPreview {
  ref: string;
  bookCode: string;
  chapter: number;
  verse: number;
  text: string;
}

/**
 * Load preview text for a list of cross-reference strings.
 * Currently disabled - returns empty array.
 * Will be restored via API in future.
 */
export async function loadCrossRefPreviews(
  refs: string[],
): Promise<CrossRefPreview[]> {
  // Disabled for build size reduction - preview text will come from API
  return [];
}
