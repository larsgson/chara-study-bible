import type { BSBVerse, BSBIndexEntry } from "../lib/local/bsb";

// Set 2 abbreviations: txt (plain), num (Strong's badges), il (word tiles), il+ (full).
// Currently only `txt` and `il+` have distinct rendering paths; `num` and `il` fall
// back to `txt` rendering until their renderers ship.
export type DisplayMode = "txt" | "num" | "il" | "il+";

const PUNCTUATION_REGEX = /^[\s.,;:!?'"()\[\]\-—–׃׀]+$/;
const SKIP_MARKERS_REGEX = /^[-–—]+$|^\.+\s*\.+\s*\.+$|^vvv$/;
const isPunctuation = (text: string) => PUNCTUATION_REGEX.test(text);
const shouldSkipWord = (text: string, strongs: string | null) =>
  strongs && SKIP_MARKERS_REGEX.test(text.trim());
const cleanText = (text: string) => text.replace(/[\[\]{}]/g, "");

interface VerseDisplayProps {
  verse: BSBVerse;
  displayMode: DisplayMode;
  indexEntry?: BSBIndexEntry;
  onStrongsPress: (strongs: string, verseNum?: number) => void;
  onVerseFocus: (verseNum: number) => void;
}

function countConnections(verseNum: number, indexEntry?: BSBIndexEntry) {
  if (!indexEntry) return null;
  const topics = indexEntry?.tp?.length || 0;
  const crossRefs = indexEntry?.x?.length || 0;
  const total = topics + crossRefs;
  if (total === 0) return null;
  return { topics, crossRefs };
}

export default function VerseDisplay({
  verse,
  displayMode,
  indexEntry,
  onStrongsPress,
  onVerseFocus,
}: VerseDisplayProps) {
  const connections =
    displayMode === "il+" ? countConnections(verse.v, indexEntry) : null;

  // Get original language words (Hebrew for OT, Greek for NT)
  const originalWords = verse.heb || verse.grk || [];
  const hasOriginal = originalWords.length > 0;

  // Build gloss lookup from index entry
  const glossMap = new Map<string, string>();
  if (indexEntry?.g) {
    for (const [strongs, data] of Object.entries(indexEntry.g)) {
      const gloss = data.glosses?.[0] || data.lemma || "";
      if (gloss) glossMap.set(strongs, gloss);
    }
  }

  return (
    <div className="flex mb-3">
      {/* Verse number — tappable to enter focus mode */}
      <button
        className="w-[30px] text-xs text-[var(--color-text-muted)] font-semibold pt-[3px] shrink-0 bg-transparent border-none cursor-pointer text-left hover:text-[var(--color-primary)]"
        onClick={() => onVerseFocus(verse.v)}
        title="Focus on this verse"
      >
        {verse.v}
      </button>
      <div className="flex-1">
        {displayMode === "il+" && hasOriginal ? (
          // Interlinear mode: show original text with glosses
          <div className="flex flex-wrap gap-3">
            {originalWords.map(([text, strongs], idx) => {
              if (shouldSkipWord(text, strongs)) return null;
              if (!strongs || isPunctuation(text)) {
                return (
                  <span
                    key={idx}
                    className="text-[17px] text-[var(--color-text)]"
                  >
                    {text}
                  </span>
                );
              }
              const gloss = glossMap.get(strongs) || "";
              return (
                <button
                  key={idx}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 bg-[var(--color-background)] rounded border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)] transition-colors"
                  onClick={() => onStrongsPress(strongs, verse.v)}
                >
                  <span className="text-[15px] font-medium text-[var(--color-primary)]">
                    {cleanText(text)}
                  </span>
                  {gloss && (
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {gloss}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          // Text mode: show English translation
          <span className="text-[17px] leading-[1.65] text-[var(--color-text)]">
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
          </span>
        )}
        {/* Connection indicators — il+ mode only */}
        {connections && (
          <div className="mt-1">
            <button
              className="inline-flex items-center gap-2 text-[11px] text-[var(--color-secondary)] bg-transparent border-none cursor-pointer p-0 hover:text-[var(--color-primary)]"
              onClick={() => onVerseFocus(verse.v)}
            >
              {connections.crossRefs > 0 && (
                <span title={`${connections.crossRefs} cross-references`}>
                  🔗{connections.crossRefs}
                </span>
              )}
              {connections.topics > 0 && (
                <span title={`${connections.topics} topics`}>
                  🏷️{connections.topics}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
