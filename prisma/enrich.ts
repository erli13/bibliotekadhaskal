import { config } from "dotenv";
config();

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(title: string, author: string | null): string {
  const t = encodeURIComponent(title.slice(0, 60));
  const a = author ? encodeURIComponent(author.slice(0, 40)) : null;
  return a
    ? `https://www.googleapis.com/books/v1/volumes?q=intitle:${t}+inauthor:${a}&maxResults=1`
    : `https://www.googleapis.com/books/v1/volumes?q=intitle:${t}&maxResults=1`;
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: Array<{
    volumeInfo: {
      description?: string;
      imageLinks?: { thumbnail?: string };
    };
  }>;
}

async function fetchBookData(
  title: string,
  author: string | null
): Promise<{ description: string | null; coverUrl: string | null }> {
  const url = buildQuery(title, author);
  const res = await fetch(url);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = (await res.json()) as GoogleBooksResponse;
  if (!data.items?.length) return { description: null, coverUrl: null };

  const info = data.items[0].volumeInfo;
  const description = info.description ?? null;
  // upgrade http thumbnail to https and remove zoom curl parameter
  const coverUrl = info.imageLinks?.thumbnail
    ? info.imageLinks.thumbnail.replace(/^http:/, "https:").replace(/&edge=curl/, "")
    : null;

  return { description, coverUrl };
}

async function main() {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const prisma = new PrismaClient({ adapter });

  const books = await prisma.book.findMany({
    where: { coverUrl: null },
    select: { id: true, title: true, author: true },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${books.length} books without a cover URL.`);

  let enriched = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const progress = `[${i + 1}/${books.length}]`;

    try {
      const { description, coverUrl } = await fetchBookData(book.title, book.author);

      if (coverUrl || description) {
        await prisma.book.update({
          where: { id: book.id },
          data: { description, coverUrl },
        });
        console.log(`${progress} ✓ id=${book.id} "${book.title}"`);
        enriched++;
      } else {
        console.log(`${progress} – id=${book.id} "${book.title}" (no match)`);
        notFound++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${progress} ✗ id=${book.id} "${book.title}": ${message}`);
      errors++;
    }

    if (i < books.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. Enriched: ${enriched}, No match: ${notFound}, Errors: ${errors}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
