# Chara Study Bible

Mobile-first Bible study app — a fully-local BSB reader with Strong's
concordance and original-language data, plus an API-backed study layer for
cross-references, topics, entities, search, and RAG.

## Architecture: strict separation of concerns

Two territories with a hard boundary:

- **Local territory** (`src/lib/local/`) — everything needed to render the
  BSB reader: per-chapter BSB JSON, section headings, Strong's Hebrew + Greek
  lexicon, Strong's-number concordance, OSHB Hebrew + Greek morphology.
  Imported directly by Astro pages and React islands.
- **API territory** (`src/lib/api/`) — cross-references, topics, entities
  (people / places), English-word concordance, lexicon variants
  (LSJ / Abbott-Smith / BDB), search, RAG. Goes through a single typed
  fetcher and talks to a FastAPI backend (see
  [`docs/client-integration.md`](./docs/client-integration.md)).

Components never call `fetch()` directly. The boundary is visible at the
import path: `~local/*` for local, `~api/*` for remote.

## Tech stack

- **Astro 6** — static site generator with islands
- **React 19** — interactive islands (`client:load`, `client:visible`)
- **Tailwind CSS 4** — utility styling via `@tailwindcss/vite`
- **TypeScript 5** — strict mode

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # static output to dist/
pnpm preview      # preview the production build
pnpm typecheck    # astro check && tsc --noEmit
pnpm lint         # ESLint
pnpm format       # Prettier
```

The dev server needs the local data files under `src/data/chapters/`,
`src/data/indexes/`, `src/data/headings.jsonl`, and `public/bsb-data/` /
`public/data/` to be populated. These are not committed — they are produced
by a data fetch step.

## URL scheme

```
/                                          home — passage selector
/bible/<book>/<chapter>                    chapter reader              e.g. /bible/jhn/3
/bible/<book>/<chapter>?v=<verse>          chapter, focus on a verse   e.g. /bible/jhn/3?v=16
/bible/<book>/<chapter>#v<verse>           chapter, scrolled to verse  e.g. /bible/jhn/3#v16
/c/<chunk_id>                              chunk permalink             (API; planned)
/q?q=…                                     search results              (API; planned)
/ask                                       RAG answer                  (API; password-gated)
```

`<book>` is the lower-case USFM code (`gen`, `jhn`, `1co`, …). Testament is
inferred from the book code at the API boundary; URLs do not carry it.

Verse focus is a client-side state of the chapter page — there is no
per-verse static page. Sharing `/bible/jhn/3?v=16` opens the chapter and
enters focus mode for v.16 on mount.

## Environment

| Variable | Purpose | Required |
|---|---|---|
| `PUBLIC_API_BASE_URL` | Backend origin for `lib/api/*` calls | For API features |
| `PUBLIC_API_PASSWORD` | Bearer token for `/api/ask` and `?semantic=true` | For RAG / semantic search |

Without `PUBLIC_API_BASE_URL`, the local-territory reader (BSB + Strong's)
keeps working; API features throw `ApiNotConfiguredError`.

## Documentation

- [`docs/client-integration.md`](./docs/client-integration.md) — frozen
  spec for the API client (source of truth for the API territory).
- [`docs/FEATURE_PLAN.md`](./docs/FEATURE_PLAN.md) — features and product
  thinking distilled to what to build.
- [`docs/MOBILE_CONSTRAINTS.md`](./docs/MOBILE_CONSTRAINTS.md) — small-screen
  measurements and design implications.
- [`docs/NAVIGATION_PATTERNS.md`](./docs/NAVIGATION_PATTERNS.md) — survey of
  navigation patterns from data-dense mobile apps.
- [`docs/NAVIGATION_OPPORTUNITIES.md`](./docs/NAVIGATION_OPPORTUNITIES.md) —
  what the underlying data graph enables.
- [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) — repo-level guidance for
  Claude Code.

## Data sources & attribution

### Public Domain (CC0)

- **Berean Standard Bible (BSB)** — verse text with Strong's numbers
  (https://github.com/BSB-publishing/bsb2usfm, CC0 1.0 Universal)
- **Strong's Concordance** — Hebrew and Greek lexicon
  (https://github.com/scrollmapper/bible_databases, Public Domain)
- **Treasury of Scripture Knowledge (TSK)** — cross-references
  (https://github.com/scrollmapper/bible_databases, Public Domain)

### CC BY 4.0 (Attribution Required)

- **Open Scriptures Hebrew Bible (OSHB)** — Hebrew morphology
  (https://github.com/openscriptures/morphhb, CC BY 4.0)
  - Attribution: *Hebrew morphology data from Open Scriptures Hebrew Bible
    (OSHB), licensed under CC BY 4.0. https://hb.openscriptures.org/*

## License

The application code is licensed under the **MIT License** — see
[LICENSE](./LICENSE) for the full text.

The Bible data and lexicon content shipped under `public/` retain their
original licenses (see above).
