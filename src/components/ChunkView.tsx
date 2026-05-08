// Renders a chunk by id. URL forms supported (in priority order):
//   /c/<chunk_id>            (Netlify rewrite serves this page)
//   /c/?id=<chunk_id>        (dev fallback)

import { useEffect, useState } from "react";
import { getChunk, isApiConfigured } from "../lib/api";
import type { Chunk, ChunkPreview } from "../lib/types";
import { localizeApiPath } from "../lib/links";

function readChunkId(): string {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("id")?.trim();
  if (fromQuery) return fromQuery;
  const path = window.location.pathname;
  const m = path.match(/^\/c\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : "";
}

export default function ChunkView() {
  const [chunkId, setChunkId] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunk, setChunk] = useState<Chunk | null>(null);

  useEffect(() => {
    setChunkId(readChunkId());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!chunkId) {
      setError("No chunk id in URL.");
      return;
    }
    if (!isApiConfigured()) {
      setError("API base URL is not configured (PUBLIC_API_BASE_URL).");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getChunk(chunkId)
      .then((c) => {
        if (!cancelled) setChunk(c);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.code === "network") {
          setError(
            "Network error reaching the API. The backend may not allow this origin (CORS).",
          );
        } else if (err?.status === 404) {
          setError(`Chunk not found: ${chunkId}`);
        } else {
          setError(err?.detail || err?.message || "Failed to load chunk.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, chunkId]);

  if (!mounted || loading) {
    return (
      <div style={{ padding: "1rem" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Loading chunk…
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: "1rem" }}>
        <div className="rounded-lg border border-[var(--color-accent)] bg-[var(--color-background-alt)] p-4">
          <p className="text-sm text-[var(--color-accent)] font-semibold mb-1">
            Couldn't load chunk
          </p>
          <p className="text-sm text-[var(--color-text)]">{error}</p>
          <p
            className="text-xs text-[var(--color-text-muted)]"
            style={{ marginTop: "0.5rem", fontFamily: "ui-monospace, monospace" }}
          >
            id: {chunkId || "(none)"}
          </p>
        </div>
      </div>
    );
  }
  if (!chunk) return null;

  return (
    <div style={{ padding: "1rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <p
          style={{
            fontSize: "11px",
            fontFamily: "ui-monospace, monospace",
            color: "var(--color-text-muted)",
            margin: 0,
          }}
        >
          {chunk.chunk_id}
        </p>
        <h1
          style={{
            margin: "0.25rem 0",
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-text)",
          }}
        >
          {chunk.title}
        </h1>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: "0.5rem",
            fontSize: "12px",
          }}
        >
          <span className="px-2 py-0.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded">
            {chunk.kind}
          </span>
          {chunk.passage && (
            <span style={{ color: "var(--color-text-muted)" }}>
              {chunk.passage}
            </span>
          )}
        </div>
      </header>

      <article
        style={{
          fontSize: "15px",
          lineHeight: 1.65,
          color: "var(--color-text)",
          marginBottom: "1.5rem",
          whiteSpace: "pre-wrap",
        }}
      >
        {chunk.body}
      </article>

      {chunk.tags?.length > 0 && (
        <Section title="Tags">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
            {chunk.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: "11px",
                  fontFamily: "ui-monospace, monospace",
                  padding: "2px 6px",
                  background: "var(--color-background-alt)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  color: "var(--color-text-muted)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}

      {chunk.all_paths?.length > 0 && (
        <Section title="Tree paths">
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {chunk.all_paths.map((p) => (
              <li key={p} style={{ marginBottom: "0.25rem" }}>
                <a
                  href={localizeApiPath(p)}
                  style={{
                    color: "var(--color-primary)",
                    fontSize: "13px",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {p}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {chunk.cross_refs && (
        <CrossRefs refs={chunk.cross_refs} />
      )}
    </div>
  );
}

function CrossRefs({ refs }: { refs: Chunk["cross_refs"] }) {
  const groups: [string, ChunkPreview[]][] = [
    ["Same passage", refs.passage ?? []],
    ["Methodology references", refs.support_ref ?? []],
    ["Related terms", refs.term ?? []],
  ];
  const nonEmpty = groups.filter(([, list]) => list.length > 0);
  if (nonEmpty.length === 0) return null;
  return (
    <>
      {nonEmpty.map(([label, list]) => (
        <Section key={label} title={label}>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {list.map((c) => (
              <li
                key={c.chunk_id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3"
              >
                <a
                  href={localizeApiPath(c.primary_path)}
                  className="text-[var(--color-primary)] hover:underline font-semibold text-sm"
                >
                  {c.title}
                </a>
                {c.passage && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                      margin: "2px 0",
                    }}
                  >
                    {c.passage}
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
                  {c.excerpt}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "1.25rem" }}>
      <h2
        style={{
          fontSize: "12px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--color-text-muted)",
          margin: "0 0 0.5rem",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
