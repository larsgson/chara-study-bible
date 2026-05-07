# Phase C + D Build Size Reduction Summary

## Overview
Successfully reduced build size from **495 MB to 303 MB** (39% reduction) by removing API-backed features and trimming index data to local-only fields.

## Final Results

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Total dist size | 495 MB | 303 MB | 192 MB (39%) |
| Bible pages | ~384 MB | 281 MB | 103 MB (27%) |
| John 3:1 HTML | 402 KB | 303 KB | 99 KB (25%) |
| Build time | ~16s | ~13s | 3s faster |

## Phase C: Remove People/Places Routes & Data

### Deleted Files
- ✅ `src/pages/people/[id].astro` - Person profile route
- ✅ `src/pages/places/[slug].astro` - Place profile route  
- ✅ `src/components/PersonProfile.tsx` - Person profile component
- ✅ `src/components/PlaceProfile.tsx` - Place profile component
- ✅ `src/lib/local/profileLoader.ts` - Profile data loader
- ✅ `public/bsb-data/proper-names/` - 6.2 MB people data
- ✅ `public/bsb-data/geography/` - 1.7 MB places data
- ✅ `public/bsb-data/display/` - 27 MB chapter display data

### Code Changes

**`src/lib/local/chapter.ts`**
- Removed `loadPeopleIndex()` function
- Removed `loadPlacesIndex()` function  
- Removed `ChapterPersonRef`, `ChapterPlaceRef`, `ChapterContext` types
- Removed `context` field from `ChapterData` interface
- Removed all people/places computation from `loadChapter()`

**`src/lib/local/crossRefPreview.ts`**
- Disabled cross-ref preview text loading (saves 27 MB display data)
- Returns empty array - preview text will come from API in future

**`src/pages/bible/[book]/[chapter].astro`**
- Removed `context` prop from ChapterView

**`src/components/ChapterView.tsx`**
- Removed `ChapterContext` import and prop
- Removed `headerExpanded` state
- Removed people/places header display section

**`src/components/VerseDisplay.tsx`**
- Removed `ChapterContext` import and prop
- Removed people/places from connection indicators

**`src/components/VerseFocus.tsx`**
- Removed `ChapterContext` import and prop
- Removed people and places sections

### Features Temporarily Removed (will return via API)
- `/people/<id>` profile pages
- `/places/<slug>` profile pages
- Chapter header people/places pull-down
- Cross-reference preview text in verse focus
- People/places connection indicators in verse display

## Phase D: Trim Index Entries to Local Fields

### Implementation
Modified `src/lib/local/chapter.ts` to filter index entries when loading from JSONL files.

**Fields Kept (local-territory)**:
- `s` - Strong's numbers (needed for concordance/lexicon)
- `m` - Morphology (needed for interlinear rendering)
- `g` - Glosses (needed for word-level tooltips)
- `map` - Map coordinates (needed for Google Maps links)

**Fields Removed (API-territory)**:
- `x` - Cross-references (will come from API)
- `tp` - Topics (will come from API)
- `par` - Parallels (will come from API)
- `dom` - Semantic domains (will come from API)
- `ws` - Word senses (will come from API)
- `msense` - Marble senses (will come from API)
- `img` - Images (will come from API)

### Code Change
```typescript
// Filter to local-territory fields only
const allowedFields = ['s', 'm', 'g', 'map'] as const;
const indexEntries: Record<number, BSBIndexEntry> = {};
// ... load JSONL ...
indexText.trim().split('\n').forEach((line, idx) => {
  const entry = JSON.parse(line);
  const filtered: any = {};
  for (const field of allowedFields) {
    if (entry[field]) filtered[field] = entry[field];
  }
  indexEntries[idx + 1] = filtered;
});
```

### Features Temporarily Removed (will return via API panels)
- Inline connection indicators in `il+` mode (👤2 📍1 🔗5 chips)
- Cross-refs, topics, parallels, domains, word senses in verse focus
  - These will become interactive panels when API is wired

## What Still Works

### Fully Functional
- ✅ BSB chapter reader with all display modes (txt, il+)
- ✅ Strong's number lookup and concordance
- ✅ Interlinear display with morphology
- ✅ Lexicon entries (Hebrew/Greek definitions)
- ✅ Chapter navigation
- ✅ Headings and verse display
- ✅ Map links (Google Maps for places)
- ✅ Search form (wired for API backend)

### Temporarily Disabled (API-backed)
- ❌ People profile pages → will use `/entity/person/:id` API
- ❌ Places profile pages → will use `/entity/place/:id` API
- ❌ Cross-reference preview text → will use `/api/chunk/:id` API
- ❌ Connection indicators → will use API data in verse focus panels
- ❌ Topics, parallels, domains → will use API endpoints

## Next Steps for Full Restoration

1. **Wire API client** - Configure `PUBLIC_API_BASE_URL` in environment
2. **Entity routes** - Add `/entity/:type/:id` routes using API
3. **Verse focus panels** - Add API-backed panels for cross-refs, topics, etc.
4. **Search results** - Connect search page to `/api/search` endpoint
5. **Redirects** - Add Netlify `_redirects` for old URLs:
   ```
   /people/:id → /entity/person/:id
   /places/:slug → /entity/place/:slug
   ```

## Build Verification

No TypeScript errors. All builds complete successfully.

```bash
npm run build
# 1191 pages built in ~13s
# dist: 303 MB (down from 495 MB)
```

## Compatibility

All changes maintain backward compatibility with existing API contracts defined in `src/lib/types.ts`. When the API is available, features can be progressively restored without breaking changes.
