// Build-time chapter data loader — reads from filesystem during SSG.
// Only used from .astro pages (server-side); never imported by client components.

import fs from "node:fs";
import path from "node:path";
import books from "../../data/books";
import type { BSBVerse, BSBHeading, BSBIndexEntry } from "./bsb";

const DATA_DIR = path.resolve("src/data");

let headingsCache: BSBHeading[] | null = null;

function loadAllHeadings(): BSBHeading[] {
  if (headingsCache) return headingsCache;
  const filePath = path.join(DATA_DIR, "headings.jsonl");
  const text = fs.readFileSync(filePath, "utf-8");
  headingsCache = text
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  return headingsCache;
}

export interface ChapterData {
  bookId: number;
  bookName: string;
  bookCode: string;
  chapterNumber: number;
  totalChapters: number;
  verses: BSBVerse[];
  headings: BSBHeading[];
  indexEntries: Record<number, BSBIndexEntry>;
}

export function loadChapter(
  bookId: number,
  chapterNumber: number,
): ChapterData {
  const book = books.find((b) => b.id === bookId);
  if (!book) throw new Error(`Book ${bookId} not found`);

  const isOT = bookId <= 39;
  const originalLangKey = isOT ? "heb" : "grk";

  // Read chapter display data
  const chapterPath = path.join(
    DATA_DIR,
    "chapters",
    book.code,
    `${book.code}${chapterNumber}.json`,
  );
  const raw = JSON.parse(fs.readFileSync(chapterPath, "utf-8"));

  // Parse verses
  const verses: BSBVerse[] = [];
  for (const vNum of Object.keys(raw.eng).sort(
    (a, b) => parseInt(a) - parseInt(b),
  )) {
    const verse: BSBVerse = { v: parseInt(vNum), w: raw.eng[vNum] };
    if (raw[originalLangKey]?.[vNum]) {
      if (isOT) verse.heb = raw[originalLangKey][vNum];
      else verse.grk = raw[originalLangKey][vNum];
    }
    verses.push(verse);
  }

  // Read headings for this chapter
  const allHeadings = loadAllHeadings();
  const headings = allHeadings.filter(
    (h) => h.b === book.code && h.c === chapterNumber,
  );

  // Read index entries - filter to local-territory fields only
  // Keep: s (Strong's), m (morphology), g (glosses), map (maps)
  // Remove: x (cross-refs), tp (topics), par (parallels), dom (domains),
  //         ws (word senses), msense (marble senses), img (images)
  const allowedFields = ["s", "m", "g", "map"] as const;
  const indexEntries: Record<number, BSBIndexEntry> = {};
  const indexPath = path.join(
    DATA_DIR,
    "indexes",
    book.code,
    `${book.code}${chapterNumber}.jsonl`,
  );
  if (fs.existsSync(indexPath)) {
    const indexText = fs.readFileSync(indexPath, "utf-8");
    indexText
      .trim()
      .split("\n")
      .forEach((line, idx) => {
        const entry = JSON.parse(line);
        const filtered: any = {};
        for (const field of allowedFields) {
          if (entry[field]) filtered[field] = entry[field];
        }
        indexEntries[idx + 1] = filtered;
      });
  }

  return {
    bookId,
    bookName: book.name,
    bookCode: book.code,
    chapterNumber,
    totalChapters: book.chapters,
    verses,
    headings,
    indexEntries,
  };
}

export function getAllChapterPaths(): Array<{
  bookId: number;
  bookCode: string;
  chapter: number;
}> {
  return books.flatMap((book) =>
    Array.from({ length: book.chapters }, (_, i) => ({
      bookId: book.id,
      bookCode: book.code,
      chapter: i + 1,
    })),
  );
}
