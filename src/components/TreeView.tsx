// Renders a tree branch (children list or chunks list) for /en/<tree>/<...path>.
// URL forms supported (priority):
//   /en/<tree>/<...path>     (Netlify rewrite serves this page)
//   /en/?tree=<t>&path=<p>   (dev fallback; path is /-joined and URL-encoded)

import { useEffect, useState } from "react";
import { getTreeRoot, getTreeNode, isApiConfigured } from "../lib/api";
import type { TreeName } from "../lib/api";
import type { ChunkPreview, TreeBranch } from "../lib/types";
import { localizeApiPath } from "../lib/links";

const KNOWN_TREES: TreeName[] = [
  "scripture",
  "bible",
  "source",
  "kind",
  "term",
  "topic",
  "entity",
  "methodology",
  "pericope",
  "lexicon",
  "morphology",
  "transcript",
  "aquifer",
];

// Tier of "the API has a builder for this tree" per docs/client-integration.md.
// Used to set a softer "not yet" message on the unsupported ones.
const PENDING_TREES = new Set<TreeName>([
  "topic",
  "entity",
  "lexicon",
  "morphology",
  "transcript",
]);

function readLocation(): { tree: TreeName | null; path: string[] } {
  const params = new URLSearchParams(window.location.search);
  const fromQueryTree = params.get("tree");
  const fromQueryPath = params.get("path");
  if (fromQueryTree) {
    return {
      tree: KNOWN_TREES.includes(fromQueryTree as TreeName)
        ? (fromQueryTree as TreeName)
        : null,
      path: fromQueryPath
        ? fromQueryPath.split("/").filter(Boolean)
        : [],
    };
  }
  // Pathname form: /en/<tree>/<...rest>
  const segs = window.location.pathname
    .split("/")
    .filter(Boolean);
  if (segs.length >= 2 && segs[0] === "en") {
    const tree = segs[1] as TreeName;
    return {
      tree: KNOWN_TREES.includes(tree) ? tree : null,
      path: segs.slice(2).map(decodeURIComponent),
    };
  }
  return { tree: null, path: [] };
}

export default function TreeView() {
  const [tree, setTree] = useState<TreeName | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [branch, setBranch] = useState<TreeBranch | null>(null);

  useEffect(() => {
    // Bible text at verse/chapter granularity has a local route; redirect
    // before any API call.
    const local = localizeApiPath(window.location.pathname);
    if (local !== window.location.pathname) {
      window.location.replace(local);
      return;
    }
    const loc = readLocation();
    setTree(loc.tree);
    setPath(loc.path);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!tree) {
      setError("Unrecognized tree in URL.");
      return;
    }
    if (!isApiConfigured()) {
      setError("API base URL is not configured (PUBLIC_API_BASE_URL).");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPending(false);
    setBranch(null);

    const promise =
      path.length === 0 ? getTreeRoot(tree) : getTreeNode(tree, path);

    promise
      .then((b) => {
        if (!cancelled) setBranch(b);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.code === "network") {
          setError(
            "Network error reaching the API. The backend may not allow this origin (CORS).",
          );
        } else if (err?.status === 404) {
          if (PENDING_TREES.has(tree)) {
            setPending(true);
          } else {
            setError(`Not found in /api/tree/${tree}/${path.join("/")}`);
          }
        } else {
          setError(err?.detail || err?.message || "Failed to load tree.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, tree, path.join("/")]);

  if (!mounted || loading) {
    return <Empty>Loading…</Empty>;
  }
  if (pending && tree) {
    return <PendingTreePanel tree={tree} path={path} />;
  }
  if (error) {
    return (
      <div style={{ padding: "1rem" }}>
        <div className="rounded-lg border border-[var(--color-accent)] bg-[var(--color-background-alt)] p-4">
          <p className="text-sm text-[var(--color-accent)] font-semibold mb-1">
            Couldn't load tree
          </p>
          <p className="text-sm text-[var(--color-text)]">{error}</p>
          <p
            className="text-xs text-[var(--color-text-muted)]"
            style={{ marginTop: "0.5rem", fontFamily: "ui-monospace, monospace" }}
          >
            tree: {tree ?? "(none)"} — path: /{path.join("/")}
          </p>
        </div>
      </div>
    );
  }
  if (!branch) return null;

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
          tree:{branch.tree} {path.length ? `· /${path.join("/")}` : ""}
        </p>
        <h1
          style={{
            margin: "0.25rem 0",
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-text)",
          }}
        >
          {branch.node.passage ??
            branch.node.label ??
            branch.node.id ??
            branch.tree}
        </h1>
        {branch.node.section_heading && (
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "14px",
              color: "var(--color-text-muted)",
              fontStyle: "italic",
            }}
          >
            {branch.node.section_heading}
          </p>
        )}
      </header>

      {branch.children && branch.children.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {branch.children.map((child) => (
            <li key={child.id}>
              <a
                href={localizeApiPath(child.url)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)] transition-colors"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0.75rem",
                  textDecoration: "none",
                  color: "var(--color-text)",
                  fontSize: "14px",
                }}
              >
                <span>{child.label}</span>
                {typeof child.child_count === "number" && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {child.child_count}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}

      {branch.chunks && branch.chunks.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {branch.chunks.map((c) => (
            <ChunkRow key={c.chunk_id} chunk={c} />
          ))}
        </ul>
      )}

      {!branch.children?.length && !branch.chunks?.length && (
        <Empty>This branch is empty.</Empty>
      )}
    </div>
  );
}

function ChunkRow({ chunk }: { chunk: ChunkPreview }) {
  const titleHref = localizeApiPath(chunk.primary_path);
  return (
    <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 hover:border-[var(--color-primary)] transition-colors">
      <a
        href={titleHref}
        className="text-[var(--color-primary)] hover:underline font-semibold text-sm"
      >
        {chunk.title}
      </a>
      {chunk.passage && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--color-text-muted)",
            margin: "2px 0",
          }}
        >
          {chunk.passage}
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
        {chunk.excerpt}
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
          {chunk.kind}
        </span>
        <a
          href={chunk.permalink}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline"
        >
          view
        </a>
      </div>
    </li>
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

function PendingTreePanel({
  tree,
  path,
}: {
  tree: TreeName;
  path: string[];
}) {
  return (
    <div style={{ padding: "1rem" }}>
      <div className="rounded-lg border border-[var(--color-secondary)] bg-[var(--color-background-alt)] p-4">
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-secondary)" }}>
          Coming soon
        </p>
        <p className="text-sm text-[var(--color-text)]">
          The <code>{tree}</code> tree builder isn't deployed on the backend
          yet. Once it ships, this page will load{" "}
          <code style={{ fontFamily: "ui-monospace, monospace" }}>
            /api/tree/{tree}/{path.join("/")}
          </code>{" "}
          automatically — no client changes needed.
        </p>
      </div>
    </div>
  );
}
