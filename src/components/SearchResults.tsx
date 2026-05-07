// Mock search results component for UI development
// Returns randomized mock data matching the API response structure

import { useState, useEffect } from "react";

interface SearchHit {
  chunk_id: string;
  score: number;
  retrievers: string[];
  title: string;
  passage: string | null;
  kind: string;
  excerpt: string;
  primary_path: string;
  permalink: string;
}

interface SearchResultsProps {
  query: string;
  mode: "free" | "premium";
}

// Mock data templates
const MOCK_HITS: Omit<SearchHit, "chunk_id" | "score">[] = [
  {
    retrievers: ["fts", "title"],
    title: "BSB — John 3:16",
    passage: "John 3:16",
    kind: "scripture",
    excerpt:
      "For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.",
    primary_path: "/bible/jhn/3",
    permalink: "/c/mock123:0000",
  },
  {
    retrievers: ["fts", "vec"],
    title: "ULT — Romans 5:8",
    passage: "Romans 5:8",
    kind: "scripture",
    excerpt:
      "But God demonstrates his own love toward us, in that while we were still sinners, Christ died for us.",
    primary_path: "/bible/rom/5",
    permalink: "/c/mock456:0001",
  },
  {
    retrievers: ["fts", "title", "vec"],
    title: "Translation Note — Titus 1:7",
    passage: "Titus 1:7",
    kind: "translator-note",
    excerpt:
      "An overseer must be blameless as God's household manager, not arrogant, not quick-tempered, not a drunkard...",
    primary_path: "/en/scripture/nt/TIT/1/7",
    permalink: "/c/mock789:0002",
  },
  {
    retrievers: ["fts"],
    title: "BSB — 1 Timothy 3:1-7",
    passage: "1 Timothy 3:1-7",
    kind: "scripture",
    excerpt:
      "This is a trustworthy saying: If anyone aspires to be an overseer, he desires a noble task. An overseer, then, must be above reproach...",
    primary_path: "/bible/1ti/3",
    permalink: "/c/mock101:0003",
  },
  {
    retrievers: ["vec", "fts"],
    title: "Term Article — Faith",
    passage: null,
    kind: "term",
    excerpt:
      "Faith is trust in God and in the person and work of Jesus Christ. True saving faith includes knowledge, conviction, and commitment.",
    primary_path: "/en/term/keyterm/faith",
    permalink: "/c/mock202:0004",
  },
  {
    retrievers: ["fts", "title"],
    title: "BSB — Ephesians 2:8-9",
    passage: "Ephesians 2:8-9",
    kind: "scripture",
    excerpt:
      "For it is by grace you have been saved through faith, and this not from yourselves; it is the gift of God, not by works...",
    primary_path: "/bible/eph/2",
    permalink: "/c/mock303:0005",
  },
  {
    retrievers: ["fts"],
    title: "Study Note — The Qualifications of Elders",
    passage: "Titus 1:5-9",
    kind: "study-note",
    excerpt:
      "Paul outlines specific character qualifications for church leaders, emphasizing godly character over skills or achievements.",
    primary_path: "/en/pericope/56001005-56001009",
    permalink: "/c/mock404:0006",
  },
  {
    retrievers: ["vec"],
    title: "BSB — Hebrews 11:1",
    passage: "Hebrews 11:1",
    kind: "scripture",
    excerpt:
      "Now faith is the assurance of what we hope for and the certainty of what we do not see.",
    primary_path: "/bible/heb/11",
    permalink: "/c/mock505:0007",
  },
];

function generateMockResults(
  query: string,
  mode: "free" | "premium",
): SearchHit[] {
  // Use query length as seed for consistency
  const seed = query.length;
  const count = mode === "premium" ? 8 : 4;

  // Shuffle and pick results based on seed
  const shuffled = [...MOCK_HITS].sort((a, b) => {
    const aHash = (a.title.length + seed) % 100;
    const bHash = (b.title.length + seed) % 100;
    return aHash - bHash;
  });

  return shuffled.slice(0, count).map((hit, idx) => ({
    ...hit,
    chunk_id: `mock${seed}${idx}:000${idx}`,
    score: 0.95 - idx * 0.1,
  }));
}

export default function SearchResults({
  query: _query,
  mode: _mode,
}: SearchResultsProps) {
  // Use state to prevent hydration mismatch
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"free" | "premium">("free");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from URL on client side only
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get("q")?.trim() || "";
    const urlMode = urlParams.get("mode");

    setQuery(urlQuery);
    setMode(urlMode === "premium" ? "premium" : "free");
    setMounted(true);
  }, []);

  // Show loading state during hydration
  if (!mounted) {
    return (
      <div style={{ padding: "1rem" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Loading...
        </p>
      </div>
    );
  }

  if (!query) {
    return (
      <div style={{ padding: "1rem" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Enter a search query to see results
        </p>
      </div>
    );
  }

  const hits = generateMockResults(query, mode);
  const isPremium = mode === "premium";

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-muted)",
            marginBottom: "0.5rem",
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
            {hits.length} results
          </span>{" "}
          — Mock data for UI development
          {isPremium && (
            <span className="ml-2 text-[var(--color-accent)]">
              (Premium: more results + semantic search)
            </span>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {hits.map((hit, idx) => (
          <article
            key={hit.chunk_id}
            className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-primary)] transition-colors"
          >
            {/* Result number and score */}
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                #{idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">
                  score: {hit.score.toFixed(2)}
                </span>
                <div className="flex gap-1">
                  {hit.retrievers.map((r) => (
                    <span
                      key={r}
                      className="text-xs px-1.5 py-0.5 bg-[var(--color-background-alt)] text-[var(--color-text-muted)] rounded"
                      title={`Retrieved via ${r}`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Title with link */}
            <h3 className="mb-2">
              <a
                href={hit.primary_path}
                className="text-[var(--color-primary)] hover:underline font-semibold text-base"
              >
                {hit.title}
              </a>
            </h3>

            {/* Passage reference */}
            {hit.passage && (
              <p className="text-sm text-[var(--color-text-muted)] mb-2">
                {hit.passage}
              </p>
            )}

            {/* Excerpt */}
            <p className="text-sm text-[var(--color-text)] leading-relaxed mb-3">
              {hit.excerpt}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <span className="px-2 py-0.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded">
                {hit.kind}
              </span>
              <a
                href={hit.permalink}
                className="hover:text-[var(--color-primary)] hover:underline"
              >
                view
              </a>
            </div>
          </article>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-6 p-4 bg-[var(--color-background-alt)] border border-[var(--color-border)] rounded-lg">
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          <strong>Note:</strong> This is mock data for UI development. When
          connected to the API backend, results will include live data from
          Door43, BibleAquifer, BSB, and other resources.{" "}
          {!isPremium && (
            <span>
              Premium mode enables semantic search and returns more results.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
