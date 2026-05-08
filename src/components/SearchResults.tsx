// Search box → /api/search (Free) or /api/ask (Premium).

import { useEffect, useMemo, useState } from "react";
import {
  ask,
  search,
  isApiConfigured,
  ApiNotConfiguredError,
} from "../lib/api";
import type {
  AskResponse,
  Citation,
  SearchHit,
  SearchResponse,
} from "../lib/types";
import { localizeApiPath } from "../lib/links";

interface SearchResultsProps {
  query: string;
  mode: "free" | "premium";
}

const STORAGE_KEY = "premium_password";

type Result =
  | { kind: "search"; data: SearchResponse }
  | { kind: "ask"; data: AskResponse };

export default function SearchResults({
  query: initialQuery,
  mode: initialMode,
}: SearchResultsProps) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<"free" | "premium">(initialMode);
  const [password, setPassword] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get("q")?.trim() || "";
    const urlMode = urlParams.get("mode");
    // URL wins; otherwise fall back to the persisted toggle state.
    const resolvedMode: "free" | "premium" =
      urlMode === "premium"
        ? "premium"
        : urlMode === "free"
          ? "free"
          : localStorage.getItem("search_mode") === "premium"
            ? "premium"
            : "free";
    // Keep URL in sync with effective mode so reloads/shares match.
    if (resolvedMode === "premium" && urlMode !== "premium") {
      const u = new URL(window.location.href);
      u.searchParams.set("mode", "premium");
      window.history.replaceState({}, "", u.toString());
    }
    setQuery(urlQuery);
    setMode(resolvedMode);
    if (resolvedMode === "premium") {
      setPassword(sessionStorage.getItem(STORAGE_KEY) ?? "");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !query) {
      setResult(null);
      setError(null);
      return;
    }
    if (!isApiConfigured()) {
      setError(
        "API base URL is not configured. Set PUBLIC_API_BASE_URL in your environment.",
      );
      return;
    }
    if (mode === "premium" && !password) {
      setError(
        "Premium requires a password. Toggle Premium in the header to enter one.",
      );
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setResult(null);

    const promise =
      mode === "premium"
        ? ask({ question: query, lang: "en", password }).then(
            (data) => ({ kind: "ask", data }) as Result,
          )
        : search({ q: query, lang: "en", top_k: 10 }).then(
            (data) => ({ kind: "search", data }) as Result,
          );

    promise
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiNotConfiguredError) {
          setError(err.detail);
        } else if (err?.code === "network") {
          setError(
            "Network error reaching the API. The backend may not allow this origin (CORS).",
          );
        } else if (err?.status === 401 || err?.status === 403) {
          setError("Password rejected by the server. Please re-enter.");
          sessionStorage.removeItem(STORAGE_KEY);
        } else {
          setError(err?.detail || err?.message || "Request failed.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mounted, query, mode, password]);

  if (!mounted) return <Empty>Loading…</Empty>;
  if (!query)
    return (
      <Empty>
        Enter a {mode === "premium" ? "question" : "search"} to begin.
      </Empty>
    );
  if (loading)
    return (
      <Empty>
        {mode === "premium"
          ? "Asking… (this can take a few seconds)"
          : "Searching…"}
      </Empty>
    );
  if (error) return <ErrorPanel message={error} />;
  if (!result) return null;

  return result.kind === "ask" ? (
    <AnswerView response={result.data} />
  ) : (
    <SearchHitsView response={result.data} query={query} />
  );
}

function SearchHitsView({
  response,
  query,
}: {
  response: SearchResponse;
  query: string;
}) {
  const hits = response.hits;
  if (hits.length === 0) {
    return <Empty>No results for "{query}".</Empty>;
  }
  return (
    <div style={{ padding: "1rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h2
          style={{
            margin: "0 0 0.5rem",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-text)",
            lineHeight: 1.4,
          }}
        >
          <span
            style={{
              color: "var(--color-text-muted)",
              fontWeight: 500,
              marginRight: "0.4rem",
            }}
          >
            Q:
          </span>
          {response.query ?? query}
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-text-muted)",
            margin: 0,
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
            {response.total ?? hits.length} result
            {hits.length === 1 ? "" : "s"}
          </span>
        </p>
      </header>
      <div className="space-y-4">
        {hits.map((hit, idx) => (
          <HitCard key={hit.chunk_id} hit={hit} idx={idx} />
        ))}
      </div>
    </div>
  );
}

function HitCard({ hit, idx }: { hit: SearchHit; idx: number }) {
  return (
    <article className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-primary)] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-mono text-[var(--color-text-muted)]">
          #{idx + 1}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">
            score: {hit.score.toFixed(3)}
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
      <h3 className="mb-2">
        <a
          href={localizeApiPath(hit.primary_path)}
          className="text-[var(--color-primary)] hover:underline font-semibold text-base"
        >
          {hit.title}
        </a>
      </h3>
      {hit.passage && (
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          {hit.passage}
        </p>
      )}
      <p className="text-sm text-[var(--color-text)] leading-relaxed mb-3">
        {hit.excerpt}
      </p>
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
  );
}

function AnswerView({ response }: { response: AskResponse }) {
  const rendered = useMemo(
    () => renderAnswer(response.answer, response.citations),
    [response],
  );
  return (
    <div style={{ padding: "1rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h2
          style={{
            margin: "0 0 0.5rem",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-text)",
            lineHeight: 1.4,
          }}
        >
          <span
            style={{
              color: "var(--color-text-muted)",
              fontWeight: 500,
              marginRight: "0.4rem",
            }}
          >
            Q:
          </span>
          {response.question}
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-text-muted)",
            margin: 0,
          }}
        >
          <ConfidenceBadge confidence={response.confidence} />
          <span style={{ marginLeft: "0.5rem" }}>
            {response.citations.length} citation
            {response.citations.length === 1 ? "" : "s"}
          </span>
          <span className="ml-2 text-[var(--color-accent)]">premium</span>
        </p>
      </header>
      <article
        className="prose"
        style={{
          fontSize: "15px",
          lineHeight: 1.65,
          color: "var(--color-text)",
          marginBottom: "1.5rem",
          whiteSpace: "pre-wrap",
        }}
      >
        {rendered}
      </article>
      {response.citations.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--color-text-muted)",
              margin: "0 0 0.5rem",
            }}
          >
            Sources
          </h2>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {response.citations.map((c) => (
              <CitationItem key={c.chunk_id} citation={c} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function CitationItem({ citation }: { citation: Citation }) {
  return (
    <li
      id={`cite-${citation.n}`}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="flex items-start gap-2">
        <span
          className="text-xs font-mono text-[var(--color-text-muted)]"
          style={{ minWidth: "1.5rem" }}
        >
          [{citation.n}]
        </span>
        <div style={{ flex: 1 }}>
          <a
            href={localizeApiPath(citation.primary_path)}
            className="text-[var(--color-primary)] hover:underline font-semibold text-sm"
          >
            {citation.title}
          </a>
          {citation.passage && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                margin: "2px 0",
              }}
            >
              {citation.passage}
            </p>
          )}
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-text)",
              lineHeight: 1.5,
              margin: "4px 0 0",
            }}
          >
            {citation.excerpt}
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              marginTop: "0.5rem",
              fontSize: "11px",
            }}
          >
            <span
              className="px-2 py-0.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded"
              style={{ fontSize: "11px" }}
            >
              {citation.kind}
            </span>
            <a
              href={citation.permalink}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline"
            >
              view
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: AskResponse["confidence"];
}) {
  const color =
    confidence === "high"
      ? "var(--color-primary)"
      : confidence === "medium"
        ? "var(--color-secondary)"
        : "var(--color-accent)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "white",
        background: color,
        borderRadius: "4px",
      }}
    >
      {confidence} confidence
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "1rem" }}>
      <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
        {children}
      </p>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div style={{ padding: "1rem" }}>
      <div className="rounded-lg border border-[var(--color-accent)] bg-[var(--color-background-alt)] p-4">
        <p className="text-sm text-[var(--color-accent)] font-semibold mb-1">
          Request failed
        </p>
        <p className="text-sm text-[var(--color-text)]">{message}</p>
      </div>
    </div>
  );
}

function renderAnswer(
  answer: string,
  citations: Citation[],
): React.ReactNode[] {
  const idToN = new Map(citations.map((c) => [c.chunk_id, c.n]));
  const parts: React.ReactNode[] = [];
  const re = /\[([A-Za-z0-9:_-]+)\]/g;
  let lastIdx = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    const [full, id] = m;
    const n = idToN.get(id);
    if (m.index > lastIdx) parts.push(answer.slice(lastIdx, m.index));
    if (n) {
      parts.push(
        <sup key={key++}>
          <a
            href={`#cite-${n}`}
            style={{
              color: "var(--color-primary)",
              textDecoration: "none",
              padding: "0 2px",
            }}
          >
            [{n}]
          </a>
        </sup>,
      );
    } else {
      parts.push(full);
    }
    lastIdx = m.index + full.length;
  }
  if (lastIdx < answer.length) parts.push(answer.slice(lastIdx));
  return parts;
}
