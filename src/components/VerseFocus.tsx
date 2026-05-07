import { useEffect, useState, useRef } from "react";
import type { BSBVerse, BSBIndexEntry } from "../lib/local/bsb";
import { isOldTestament } from "../data/books";
import { fetchCrossRefs, type CrossRefDisplay } from "../lib/crossrefs";
import { decodeMorphology } from "../lib/local/morphology";

const PUNCTUATION_REGEX = /^[\s.,;:!?'"()\[\]\-—–׃׀]+$/;
const SKIP_MARKERS_REGEX = /^[-–—]+$|^\.+\s*\.+\s*\.+$|^vvv$/;
const isPunctuation = (text: string) => PUNCTUATION_REGEX.test(text);
const shouldSkipWord = (text: string, strongs: string | null) =>
  strongs && SKIP_MARKERS_REGEX.test(text.trim());
const cleanText = (text: string) => text.replace(/[\[\]{}]/g, "");

interface VerseFocusProps {
  verse: BSBVerse;
  indexEntry: BSBIndexEntry | null;
  bookId: number;
  bookName: string;
  bookCode: string;
  chapterNumber: number;
  totalVerses: number;
  onClose: () => void;
  onNavigateVerse: (verseNum: number) => void;
  onStrongsPress: (strongs: string, verseNum: number) => void;
}

export default function VerseFocus({
  verse,
  indexEntry,
  bookId,
  bookName,
  bookCode,
  chapterNumber,
  totalVerses,
  onClose,
  onNavigateVerse,
  onStrongsPress,
}: VerseFocusProps) {
  const isHebrew = isOldTestament(bookId);
  const originalWords = verse.heb || verse.grk || [];

  // Swipe between verses
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isSwiping = useRef(false);
  const SWIPE_THRESHOLD = 100;

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
      if (diff > SWIPE_THRESHOLD && verse.v < totalVerses) {
        onNavigateVerse(verse.v + 1);
      } else if (diff < -SWIPE_THRESHOLD && verse.v > 1) {
        onNavigateVerse(verse.v - 1);
      }
    }
    isSwiping.current = false;
  };

  // Cross-refs — API primary, local TSK fallback. Loaded lazily after mount.
  const localRefs = indexEntry?.x || [];
  const [crossRefItems, setCrossRefItems] = useState<CrossRefDisplay[]>([]);
  const [crossRefSource, setCrossRefSource] = useState<"api" | "local" | null>(
    null,
  );

  useEffect(() => {
    if (localRefs.length === 0) {
      setCrossRefItems([]);
      setCrossRefSource(null);
      return;
    }
    let cancelled = false;
    setCrossRefItems([]);
    setCrossRefSource(null);
    fetchCrossRefs({
      bookId,
      chapterNumber,
      verseNumber: verse.v,
      localRefs,
    }).then((result) => {
      if (cancelled) return;
      setCrossRefItems(result.items);
      setCrossRefSource(result.source);
    });
    return () => {
      cancelled = true;
    };
  }, [verse.v, bookId, chapterNumber, localRefs.length]);

  // Build morphology lookup: strongs -> morph entry
  const morphMap = new Map<string, { m: string; p: string; l: string }>();
  if (indexEntry?.m) {
    for (const entry of indexEntry.m) {
      if (!morphMap.has(entry.s)) {
        morphMap.set(entry.s, { m: entry.m, p: entry.p, l: entry.l });
      }
    }
  }

  // Build gloss lookup: strongs -> gloss data
  const glossMap = indexEntry?.g || {};

  // Build word sense lookup: strongs -> sense gloss
  const senseMap = new Map<string, string>();
  if (indexEntry?.ws) {
    for (const ws of Object.values(indexEntry.ws)) {
      if (ws.gl && ws.gl !== "-") {
        senseMap.set(ws.s, ws.gl);
      }
    }
  }

  // Interlinear data: merge original words with morphology and glosses
  const interlinearRows = originalWords
    .filter(
      ([text, strongs]) =>
        strongs && !isPunctuation(text) && !shouldSkipWord(text, strongs),
    )
    .map(([text, strongs]) => {
      const morph = morphMap.get(strongs!);
      const gloss = glossMap[strongs!];
      const sense = senseMap.get(strongs!);

      // Find matching English word
      let english = "";
      for (const [engText, engStrongs] of verse.w) {
        if (
          engStrongs === strongs &&
          !isPunctuation(engText) &&
          !shouldSkipWord(engText, engStrongs)
        ) {
          english = cleanText(engText);
          break;
        }
      }

      return {
        original: text,
        strongs: strongs!,
        english,
        transliteration: gloss?.xlit || "",
        pos: morph?.p || "",
        morphDecoded: morph?.m ? decodeMorphology(morph.m) : "",
        sense: sense || "",
        glossDef: gloss?.glosses?.[0] || "",
      };
    });

  const topics = indexEntry?.tp || [];
  const domains = indexEntry?.dom || [];
  const parallels = indexEntry?.par || [];
  const hasMap = indexEntry?.map && indexEntry.map.length > 0;

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-alt)] text-[var(--color-text)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <span className="text-[15px] font-semibold text-[var(--color-text)]">
          {bookName} {chapterNumber}:{verse.v}
        </span>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Verse text */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[18px] leading-[1.7] text-[var(--color-text)] m-0">
            {verse.w.map(([text, strongs], idx) => {
              if (shouldSkipWord(text, strongs)) return null;
              if (!strongs || isPunctuation(text))
                return <span key={idx}>{text}</span>;
              return (
                <span
                  key={idx}
                  className="cursor-pointer rounded-sm hover:bg-[var(--color-primary-light)]"
                  onClick={() => onStrongsPress(strongs, verse.v)}
                >
                  {cleanText(text)}
                </span>
              );
            })}
          </p>
        </div>

        {/* Topics */}
        {topics.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {topics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-[11px] font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interlinear word breakdown */}
        {interlinearRows.length > 0 && (
          <div className="px-4 pb-3">
            <SectionLabel>{isHebrew ? "Hebrew" : "Greek"} words</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {interlinearRows.map((row, idx) => (
                <button
                  key={idx}
                  className="flex flex-col gap-0.5 px-3 py-2 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)] text-left cursor-pointer hover:border-[var(--color-primary)] w-full"
                  onClick={() => onStrongsPress(row.strongs, verse.v)}
                >
                  {/* Row 1: original word + transliteration + Strong's */}
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-[16px] font-medium text-[var(--color-primary)]"
                      style={isHebrew ? { direction: "rtl" } : undefined}
                    >
                      {row.original}
                    </span>
                    {row.transliteration && (
                      <span className="text-[12px] text-[var(--color-secondary)] italic">
                        {row.transliteration}
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono ml-auto">
                      {row.strongs}
                    </span>
                  </div>
                  {/* Row 2: gloss/sense + morphology */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] text-[var(--color-text)]">
                      {row.sense || row.glossDef || row.english}
                    </span>
                    {row.morphDecoded && (
                      <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                        {row.morphDecoded}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Map coordinates */}
        {hasMap && (
          <div className="px-4 pb-3">
            <a
              href={`https://www.google.com/maps?q=${indexEntry!.map![0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] rounded-lg no-underline hover:opacity-80"
            >
              📍 View location
            </a>
          </div>
        )}

        {/* Cross-references — API primary, local fallback. Loaded async. */}
        {localRefs.length > 0 && (
          <div className="px-4 pb-3">
            <SectionLabel>
              Cross-references ({localRefs.length})
              {crossRefSource === "api" && (
                <span className="ml-1.5 normal-case font-normal text-[10px] text-[var(--color-text-muted)]">
                  · live
                </span>
              )}
            </SectionLabel>
            <div className="flex flex-col gap-1">
              {crossRefItems.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-[var(--color-text-muted)]">
                  Loading…
                </div>
              ) : (
                crossRefItems.map((item, idx) => (
                  <a
                    key={`${item.ref}-${idx}`}
                    href={item.url}
                    className="block px-3 py-2 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)] no-underline hover:border-[var(--color-primary)]"
                  >
                    <span className="text-[13px] font-medium text-[var(--color-primary)]">
                      {item.human}
                    </span>
                    {item.preview && (
                      <span className="block mt-0.5 text-[12px] leading-[1.5] text-[var(--color-secondary)] line-clamp-2">
                        {item.preview}
                      </span>
                    )}
                  </a>
                ))
              )}
            </div>
          </div>
        )}

        {/* Parallel passages */}
        {parallels.length > 0 && (
          <div className="px-4 pb-3">
            <SectionLabel>Parallel passages</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {parallels.map((ref, idx) => (
                <a
                  key={idx}
                  href={refToUrl(ref)}
                  className="px-2.5 py-1 text-[12px] font-medium text-[var(--color-secondary)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg no-underline hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {formatRef(ref)}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Semantic domains */}
        {domains.length > 0 && (
          <div className="px-4 pb-4">
            <SectionLabel>Semantic domains</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {domains.map((domain, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-[11px] text-[var(--color-secondary)] bg-[var(--color-background)] rounded-full border border-[var(--color-border)]"
                >
                  {domain}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar — verse navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-background)]">
        {verse.v > 1 ? (
          <button
            className="text-sm text-[var(--color-primary)] font-medium bg-transparent border-none cursor-pointer min-w-[48px] text-left"
            onClick={() => onNavigateVerse(verse.v - 1)}
          >
            ← v.{verse.v - 1}
          </button>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)] opacity-30 min-w-[48px]">
            ←
          </span>
        )}

        <button
          className="px-3 py-1.5 rounded-2xl text-[13px] font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] border border-[var(--color-primary)] cursor-pointer"
          onClick={onClose}
        >
          ↩ Chapter
        </button>

        {verse.v < totalVerses ? (
          <button
            className="text-sm text-[var(--color-primary)] font-medium bg-transparent border-none cursor-pointer min-w-[48px] text-right"
            onClick={() => onNavigateVerse(verse.v + 1)}
          >
            v.{verse.v + 1} →
          </button>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)] opacity-30 min-w-[48px] text-right">
            →
          </span>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
      {children}
    </div>
  );
}

function formatRef(ref: string): string {
  // "HEB.11.17" → "HEB 11:17"
  const parts = ref.split(".");
  if (parts.length === 3) return `${parts[0]} ${parts[1]}:${parts[2]}`;
  return ref;
}

function refToUrl(ref: string): string {
  const parts = ref.split(".");
  if (parts.length === 3) {
    // Verse permalink: chapter URL with `?v=<n>` so the chapter page enters
    // focus mode for that verse on mount.
    return `/bible/${parts[0].toLowerCase()}/${parts[1]}?v=${parts[2]}`;
  }
  if (parts.length === 2) {
    return `/bible/${parts[0].toLowerCase()}/${parts[1]}`;
  }
  return "#";
}
