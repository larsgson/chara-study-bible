import { useState, useEffect } from 'react'
import books from '../data/books'

type Testament = 'OT' | 'NT'

export default function PassageSelectorPage() {
  const [testament, setTestament] = useState<Testament>('OT')
  const [selectedBook, setSelectedBook] = useState<number | null>(null)

  // On mount, check if we have a last-read position and optionally redirect
  useEffect(() => {
    try {
      const lastBookCode = localStorage.getItem('bsb-bookCode')
      const lastChapter = localStorage.getItem('bsb-chapter')
      if (lastBookCode && lastChapter) {
        const code = JSON.parse(lastBookCode)
        const ch = JSON.parse(lastChapter)
        const bookId = JSON.parse(localStorage.getItem('bsb-bookId') || '0')
        if (bookId > 39) setTestament('NT')
        // Don't auto-redirect — let user choose, but pre-select the book
        if (bookId) setSelectedBook(bookId)
      }
    } catch {}
  }, [])

  const otBooks = books.filter(b => b.id <= 39)
  const ntBooks = books.filter(b => b.id > 39)
  const displayedBooks = testament === 'OT' ? otBooks : ntBooks
  const selectedBookData = selectedBook ? books.find(b => b.id === selectedBook) : null

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-alt)] text-[var(--color-text)]">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Testament tabs */}
        <div className="flex gap-0 mb-4 rounded-lg overflow-hidden border border-[var(--color-border)]">
          <button
            className={`flex-1 py-2.5 text-sm font-semibold border-none cursor-pointer ${
              testament === 'OT'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-background)] text-[var(--color-secondary)]'
            }`}
            onClick={() => {
              setTestament('OT')
              setSelectedBook(null)
            }}
          >
            Old Testament
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-semibold border-none cursor-pointer ${
              testament === 'NT'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-background)] text-[var(--color-secondary)]'
            }`}
            onClick={() => {
              setTestament('NT')
              setSelectedBook(null)
            }}
          >
            New Testament
          </button>
        </div>

        {/* Book chips */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {displayedBooks.map(book => (
            <button
              key={book.id}
              className={`py-2 px-1 text-xs font-medium rounded-lg border cursor-pointer transition-all ${
                book.id === selectedBook
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)]'
              }`}
              onClick={() => setSelectedBook(selectedBook === book.id ? null : book.id)}
            >
              {book.abbrev}
            </button>
          ))}
        </div>

        {/* Chapter grid */}
        {selectedBookData && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-semibold">{selectedBookData.name}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {selectedBookData.chapters} chapters
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: selectedBookData.chapters }, (_, i) => i + 1).map(ch => (
                <a
                  key={ch}
                  href={`/bible/${selectedBookData.code.toLowerCase()}/${ch}`}
                  className="py-2.5 text-sm font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-center no-underline cursor-pointer transition-all hover:bg-[var(--color-primary-light)]"
                >
                  {ch}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
