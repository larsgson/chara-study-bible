import type { LexiconEntry } from '../lib/local/strongs'
import { getStrongsLanguage } from '../lib/local/strongs'
import type { BSBIndexEntry } from '../lib/local/bsb'

interface LexiconModalProps {
  entry: LexiconEntry
  strongsNumber: string
  verseIndex?: BSBIndexEntry | null
  onClose: () => void
  onViewDetails: () => void
  onViewConcordance: (strongs: string) => void
}

export default function LexiconModal({
  entry,
  strongsNumber,
  verseIndex,
  onClose,
  onViewDetails,
  onViewConcordance,
}: LexiconModalProps) {
  const langType = getStrongsLanguage(strongsNumber)

  // Find word sense for this Strong's number
  let wordSenseGloss: string | null = null
  if (verseIndex?.ws) {
    const wsEntries = Object.values(verseIndex.ws)
    const matchingWs = wsEntries.find(ws => ws.s === strongsNumber)
    if (matchingWs && matchingWs.gl && matchingWs.gl !== '-') {
      wordSenseGloss = matchingWs.gl
    }
  }

  const domains = verseIndex?.dom || []

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[200] transition-opacity"
        onClick={onClose}
      />
      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-background)] rounded-t-2xl z-[201] max-h-[80vh] overflow-y-auto shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-transform">
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
        </div>
        <div className="px-5 pb-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2 py-0.5 text-xs font-semibold text-white rounded"
              style={{
                backgroundColor:
                  langType === 'Hebrew' ? 'var(--color-accent)' : 'var(--color-primary)',
              }}
            >
              {langType}
            </span>
            <span className="text-sm font-mono text-[var(--color-secondary)]">{strongsNumber}</span>
            <button
              className="ml-auto text-lg text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer hover:text-[var(--color-text)]"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* Word */}
          <div className="text-3xl font-semibold mb-1">{entry.word}</div>
          <div className="h-[2px] bg-[var(--color-primary)] w-12 mb-3" />

          {entry.translit && (
            <div className="text-sm text-[var(--color-secondary)] mb-1">{entry.translit}</div>
          )}
          {entry.pron && (
            <div className="text-sm text-[var(--color-text-muted)] italic mb-3">
              /{entry.pron}/
            </div>
          )}

          {/* Word sense */}
          {wordSenseGloss && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                In This Verse
              </div>
              <div className="text-base text-[var(--color-primary)] font-medium italic">
                {wordSenseGloss}
              </div>
            </div>
          )}

          {entry.gloss && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Gloss
              </div>
              <div className="text-base">{entry.gloss}</div>
            </div>
          )}

          {entry.def && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Definition
              </div>
              <div className="text-sm leading-relaxed">{entry.def}</div>
            </div>
          )}

          {/* Semantic domains */}
          {domains.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Semantic Domains
              </div>
              <div className="flex flex-wrap gap-1.5">
                {domains.slice(0, 6).map((domain, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs bg-[var(--color-background-alt)] text-[var(--color-secondary)] rounded-full border border-[var(--color-border)]"
                  >
                    {domain}
                  </span>
                ))}
                {domains.length > 6 && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    +{domains.length - 6}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-primary-light)] border-none cursor-pointer hover:opacity-80"
              onClick={onViewDetails}
            >
              View Details
            </button>
            <button
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-primary-light)] border-none cursor-pointer hover:opacity-80"
              onClick={() => onViewConcordance(strongsNumber)}
            >
              Concordance
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
