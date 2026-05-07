import { useEffect, useState, useRef } from "react";
import type { BSBVerse, BSBHeading, BSBIndexEntry } from "../lib/local/bsb";
import {
  getLexiconEntry,
  getStrongsLanguage,
  type LexiconEntry,
} from "../lib/local/strongs";
import { searchConcordance, type ConcordanceResult } from "../lib/local/bsb";
import VerseDisplay, { type DisplayMode } from "./VerseDisplay";
import VerseFocus from "./VerseFocus";
import LexiconModal from "./LexiconModal";

// localStorage helpers
function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

function setStoredValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Normalize any historical display mode value to the current Set 2 names.
function migrateDisplayMode(stored: string | null | undefined): DisplayMode {
  if (
    stored === "txt" ||
    stored === "num" ||
    stored === "il" ||
    stored === "il+"
  )
    return stored;
  if (stored === "text" || stored === "read") return "txt";
  if (
    stored === "study" ||
    stored === "strongs" ||
    stored === "interlinear-compact" ||
    stored === "interlinear-full"
  ) {
    return "il+";
  }
  return "txt";
}

// E3: URL param wins, localStorage is the fallback, default is `txt`.
function readInitialMode(): DisplayMode {
  if (typeof window === "undefined") return "txt";
  const fromUrl = new URLSearchParams(window.location.search).get("m");
  if (fromUrl) return migrateDisplayMode(fromUrl);
  return migrateDisplayMode(getStoredValue<string>("bsb-displayMode", "txt"));
}

interface ChapterViewProps {
  verses: BSBVerse[];
  headings: BSBHeading[];
  indexEntries: Record<number, BSBIndexEntry>;
  bookId: number;
  bookName: string;
  bookCode: string;
  chapterNumber: number;
  totalChapters: number;
  prevLink: string | null;
  nextLink: string | null;
}

export default function ChapterView({
  verses,
  headings,
  indexEntries,
  bookId,
  bookName,
  bookCode,
  chapterNumber,
  totalChapters,
  prevLink,
  nextLink,
}: ChapterViewProps) {
  // Display state — pre-hydration default; URL/localStorage applied after mount.
  const [displayMode, setDisplayMode] = useState<DisplayMode>("txt");
  const [hydrated, setHydrated] = useState(false);
  const [hasSearchContext, setHasSearchContext] = useState(false);

  useEffect(() => {
    setDisplayMode(readInitialMode());
    setHydrated(true);
    // Check if there's a stored search context
    setHasSearchContext(!!sessionStorage.getItem("lastSearch"));
  }, []);

  // Lexicon state
  const [selectedStrongs, setSelectedStrongs] = useState<string | null>(null);
  const [selectedVerseNum, setSelectedVerseNum] = useState<number | null>(null);
  const [lexiconEntry, setLexiconEntry] = useState<LexiconEntry | null>(null);
  const [showLexicon, setShowLexicon] = useState(false);

  // Concordance sub-screen
  const [concordanceStrong, setConcordanceStrong] = useState<string | null>(
    null,
  );
  const [concordanceResults, setConcordanceResults] = useState<
    ConcordanceResult[]
  >([]);
  const [concordanceLoading, setConcordanceLoading] = useState(false);
  const [showConcordance, setShowConcordance] = useState(false);

  // Strong's detail sub-screen
  const [showStrongDetail, setShowStrongDetail] = useState(false);

  // Verse focus mode — driven by `?v=<n>` in the URL.
  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);
  const scrollPositionRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isSwiping = useRef(false);
  const SWIPE_THRESHOLD = 100;

  // Mount: read URL state — `?v=<n>` enters focus, `#v<n>` scrolls.
  useEffect(() => {
    const focusV = parseInt(
      new URLSearchParams(window.location.search).get("v") ?? "",
      10,
    );
    if (!isNaN(focusV) && focusV > 0) {
      setFocusedVerse(focusV);
      return;
    }
    const hash = window.location.hash;
    if (hash.startsWith("#v")) {
      const verseNum = parseInt(hash.slice(2));
      if (!isNaN(verseNum)) {
        requestAnimationFrame(() => {
          const el = document.getElementById(`v${verseNum}`);
          if (el) {
            el.scrollIntoView({ block: "center" });
          }
        });
      }
    }
  }, []);

  // Persist mode to localStorage AND mirror to URL (E3). Default `txt` doesn't
  // pollute the URL — only non-default modes appear as `?m=…`.
  useEffect(() => {
    if (!hydrated) return;
    setStoredValue("bsb-displayMode", displayMode);
    const url = new URL(window.location.href);
    if (displayMode === "txt") url.searchParams.delete("m");
    else url.searchParams.set("m", displayMode);
    window.history.replaceState(null, "", url.toString());
  }, [displayMode, hydrated]);

  useEffect(() => {
    setStoredValue("bsb-bookId", bookId);
    setStoredValue("bsb-bookCode", bookCode);
    setStoredValue("bsb-chapter", chapterNumber);
  }, [bookId, bookCode, chapterNumber]);

  // Load lexicon entry
  useEffect(() => {
    if (selectedStrongs) {
      getLexiconEntry(selectedStrongs)
        .then((entry) => {
          setLexiconEntry(entry);
          setShowLexicon(true);
        })
        .catch(console.error);
    }
  }, [selectedStrongs]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    if (Math.abs(touchEndX.current - touchStartX.current) > SWIPE_THRESHOLD) {
      isSwiping.current = true;
    }
  };
  const handleTouchEnd = () => {
    if (isSwiping.current) {
      const diff = touchStartX.current - touchEndX.current;
      if (diff > SWIPE_THRESHOLD && nextLink) {
        window.location.href = nextLink;
      } else if (diff < -SWIPE_THRESHOLD && prevLink) {
        window.location.href = prevLink;
      }
    }
    isSwiping.current = false;
  };

  // Handlers
  const handleStrongsPress = (strongs: string, verseNum?: number) => {
    setSelectedStrongs(strongs);
    setSelectedVerseNum(verseNum ?? null);
  };

  const closeLexicon = () => {
    setShowLexicon(false);
    setSelectedStrongs(null);
    setLexiconEntry(null);
  };

  const openConcordance = async (strongs: string) => {
    setConcordanceStrong(strongs);
    setShowConcordance(true);
    closeLexicon();
    setConcordanceLoading(true);
    try {
      setConcordanceResults(await searchConcordance(strongs));
    } catch (error) {
      console.error("Concordance search error:", error);
    }
    setConcordanceLoading(false);
  };

  const handleVerseFocus = (verseNum: number) => {
    if (contentRef.current) {
      scrollPositionRef.current = contentRef.current.scrollTop;
    }
    setFocusedVerse(verseNum);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(verseNum));
    window.history.replaceState(null, "", url.toString());
  };

  const handleCloseFocus = () => {
    const verseToScrollTo = focusedVerse;
    setFocusedVerse(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("v");
    window.history.replaceState(null, "", url.toString());
    if (verseToScrollTo) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`v${verseToScrollTo}`);
        if (el) {
          el.scrollIntoView({ block: "center" });
        }
      });
    }
  };

  // 2-state toggle for now (γ): txt ↔ il+. The two intermediate modes
  // (`num`, `il`) are reachable via URL `?m=…` but not via the toggle button
  // until their renderers ship.
  const toggleMode = () => {
    setDisplayMode(displayMode === "il+" ? "txt" : "il+");
  };

  // === Verse Focus mode ===
  if (focusedVerse !== null) {
    const focusedVerseData = verses.find((v) => v.v === focusedVerse);
    if (focusedVerseData) {
      return (
        <div className="flex flex-col h-full bg-[var(--color-background-alt)] text-[var(--color-text)]">
          {/* Lexicon Modal — also available in focus mode */}
          {showLexicon && lexiconEntry && selectedStrongs && (
            <LexiconModal
              entry={lexiconEntry}
              strongsNumber={selectedStrongs}
              verseIndex={
                selectedVerseNum ? indexEntries[selectedVerseNum] : null
              }
              onClose={closeLexicon}
              onViewDetails={() => {
                setShowLexicon(false);
                setShowStrongDetail(true);
              }}
              onViewConcordance={openConcordance}
            />
          )}
          <VerseFocus
            verse={focusedVerseData}
            indexEntry={indexEntries[focusedVerse] || null}
            bookId={bookId}
            bookName={bookName}
            bookCode={bookCode}
            chapterNumber={chapterNumber}
            totalVerses={verses.length}
            onClose={handleCloseFocus}
            onNavigateVerse={setFocusedVerse}
            onStrongsPress={handleStrongsPress}
          />
        </div>
      );
    }
  }

  // === Concordance sub-screen ===
  if (showConcordance) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-background-alt)] text-[var(--color-text)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background)] min-h-[54px]">
          <button
            className="text-[15px] text-[var(--color-primary)] font-medium bg-transparent border-none cursor-pointer"
            onClick={() => setShowConcordance(false)}
          >
            ← Back
          </button>
          <span className="text-[17px] font-semibold">
            Concordance {concordanceStrong}
          </span>
          <span className="w-[60px]" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {concordanceLoading && (
            <div className="p-8 text-center text-[var(--color-text-muted)]">
              Searching...
            </div>
          )}
          {!concordanceLoading && concordanceResults.length === 0 && (
            <div className="p-8 text-center text-[var(--color-text-muted)]">
              No verses found
            </div>
          )}
          {concordanceResults.map((result, idx) => (
            <a
              key={idx}
              href={`/bible/${result.bookCode.toLowerCase()}/${result.chapter}#v${result.verse}`}
              className="block w-full text-left px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] font-medium no-underline hover:bg-[var(--color-primary-light)]"
            >
              {result.bookCode} {result.chapter}:{result.verse}
            </a>
          ))}
        </div>
      </div>
    );
  }

  // === Strong's detail sub-screen ===
  if (showStrongDetail && lexiconEntry && selectedStrongs) {
    const langType = getStrongsLanguage(selectedStrongs);
    return (
      <div className="flex flex-col h-full bg-[var(--color-background-alt)] text-[var(--color-text)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background)] min-h-[54px]">
          <button
            className="text-[15px] text-[var(--color-primary)] font-medium bg-transparent border-none cursor-pointer"
            onClick={() => setShowStrongDetail(false)}
          >
            ← Back
          </button>
          <span className="text-[17px] font-semibold">{lexiconEntry.word}</span>
          <span
            className="px-2 py-0.5 text-xs font-semibold text-white rounded"
            style={{
              backgroundColor:
                langType === "Hebrew"
                  ? "var(--color-accent)"
                  : "var(--color-primary)",
            }}
          >
            {langType}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-sm font-mono text-[var(--color-secondary)] mb-3">
            {selectedStrongs}
          </div>
          {lexiconEntry.translit && (
            <div className="text-sm text-[var(--color-secondary)] mb-1">
              {lexiconEntry.translit}
            </div>
          )}
          {lexiconEntry.pron && (
            <div className="text-sm text-[var(--color-text-muted)] italic mb-3">
              /{lexiconEntry.pron}/
            </div>
          )}
          {lexiconEntry.gloss && (
            <Section label="Gloss">{lexiconEntry.gloss}</Section>
          )}
          {lexiconEntry.morph && (
            <Section label="Morphology">
              <span className="font-mono text-sm">{lexiconEntry.morph}</span>
            </Section>
          )}
          {lexiconEntry.def && (
            <Section label="Definition">
              <span className="text-sm leading-relaxed">
                {lexiconEntry.def}
              </span>
            </Section>
          )}
          {lexiconEntry.stepDef && (
            <Section label="Extended">
              <span className="text-sm leading-relaxed">
                {lexiconEntry.stepDef}
              </span>
            </Section>
          )}
          {lexiconEntry.kjv && (
            <Section label="KJV">
              <span className="text-sm">{lexiconEntry.kjv}</span>
            </Section>
          )}
          <button
            className="w-full py-3 mt-4 rounded-lg text-sm font-semibold text-white bg-[var(--color-primary)] border-none cursor-pointer hover:opacity-90"
            onClick={() => {
              setShowStrongDetail(false);
              openConcordance(selectedStrongs);
            }}
          >
            View Concordance
          </button>
        </div>
      </div>
    );
  }

  // === Main reader ===
  return (
    <div className="flex flex-col h-full bg-[var(--color-background-alt)] text-[var(--color-text)]">
      {/* Lexicon Modal */}
      {showLexicon && lexiconEntry && selectedStrongs && (
        <LexiconModal
          entry={lexiconEntry}
          strongsNumber={selectedStrongs}
          verseIndex={selectedVerseNum ? indexEntries[selectedVerseNum] : null}
          onClose={closeLexicon}
          onViewDetails={() => {
            setShowLexicon(false);
            setShowStrongDetail(true);
          }}
          onViewConcordance={openConcordance}
        />
      )}

      {/* Header — tappable to expand chapter summary */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex items-center justify-between px-4 py-2.5">
          <a
            href="/"
            className="text-[15px] text-[var(--color-text)] font-semibold no-underline hover:text-[var(--color-primary)]"
          >
            {bookName} {chapterNumber}
          </a>
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-auto p-4"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {verses.map((verse) => (
          <div key={verse.v} id={`v${verse.v}`}>
            {headings
              .filter((h) => h.before_v === verse.v)
              .map((heading) => (
                <div
                  key={heading.id}
                  className={`pl-[30px] ${
                    heading.level === "r"
                      ? "text-[13px] italic text-[var(--color-secondary)] font-normal pt-1"
                      : "text-lg font-bold text-[var(--color-text)] pt-5 pb-2.5"
                  }`}
                >
                  {heading.text}
                </div>
              ))}
            <VerseDisplay
              verse={verse}
              displayMode={displayMode}
              indexEntry={indexEntries[verse.v]}
              onStrongsPress={handleStrongsPress}
              onVerseFocus={handleVerseFocus}
            />
          </div>
        ))}
      </div>

      {/* Bottom Bar — all controls in thumb zone */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-background)]">
        {prevLink ? (
          <a
            href={prevLink}
            className="text-sm text-[var(--color-primary)] font-medium no-underline hover:opacity-80 min-w-[48px]"
          >
            ←
          </a>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)] opacity-30 min-w-[48px]">
            ←
          </span>
        )}

        {/* Back to Search or Display mode toggle */}
        {hasSearchContext ? (
          <a
            href={`/q${sessionStorage.getItem("lastSearch")}`}
            className="px-3 py-1.5 rounded-2xl text-[13px] font-medium border bg-[var(--color-background-alt)] text-[var(--color-secondary)] border-[var(--color-border)] no-underline hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
            title="Return to search results"
          >
            ← Search
          </a>
        ) : (
          <button
            className={`px-3 py-1.5 rounded-2xl text-[13px] font-medium border cursor-pointer transition-all tracking-wide ${
              displayMode === "il+"
                ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]"
                : "bg-[var(--color-background-alt)] text-[var(--color-secondary)] border-[var(--color-border)]"
            }`}
            onClick={toggleMode}
            title={`Mode: ${displayMode}. Tap to switch.`}
          >
            {displayMode === "il+" ? "Interlinear" : "Text"}
          </button>
        )}

        {/* Chapter position */}
        <span className="text-xs text-[var(--color-text-muted)]">
          {chapterNumber}/{totalChapters}
        </span>

        {nextLink ? (
          <a
            href={nextLink}
            className="text-sm text-[var(--color-primary)] font-medium no-underline hover:opacity-80 min-w-[48px] text-right"
          >
            →
          </a>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)] opacity-30 min-w-[48px] text-right">
            →
          </span>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
