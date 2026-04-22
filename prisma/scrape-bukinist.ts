import { config } from "dotenv";
config();

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import * as cheerio from "cheerio";

const DELAY_MS = 1500;
const BASE = "https://bukinist.al";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "sq,en;q=0.9",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Search Bukinist.al and return the clean URL of the first product result.
 * Product result links use the class `product_img_link` and carry a
 * `results=` query param that distinguishes them from navigation links.
 */
async function findFirstResultUrl(title: string, author: string | null): Promise<string | null> {
  const query = author ? `${title} ${author}` : title;
  const searchUrl = `${BASE}/index.php?controller=search&search_query=${encodeURIComponent(query)}`;

  const html = await fetchHtml(searchUrl);
  if (!html) return null;

  const $ = cheerio.load(html);

  // Primary: PrestaShop product image links tagged with class product_img_link
  const href = $("a.product_img_link").first().attr("href");
  if (href) {
    // Strip query params (?search_query=...&results=...) — not needed for detail page
    return href.split("?")[0];
  }

  return null;
}

interface Scraped {
  description: string | null;
  coverUrl: string | null;
}

async function scrapeDetailPage(url: string): Promise<Scraped> {
  const html = await fetchHtml(url);
  if (!html) return { description: null, coverUrl: null };

  const $ = cheerio.load(html);

  // Cover — PrestaShop serves the large image as img#bigpic
  const coverSrc = $("img#bigpic").attr("src") ?? null;
  const coverUrl = coverSrc ? coverSrc.replace(/^http:/, "https:") : null;

  // Synopsis — inside #short_description_content, after the label span
  // Remove the "Përshkrim i shkurtër" label span before extracting text
  const descContainer = $("#short_description_content");
  descContainer.find(".special-ar").remove();
  const description = descContainer.text().replace(/\s+/g, " ").trim() || null;

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

  console.log(`Found ${books.length} books without a cover URL.\n`);

  let enriched = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const label = `[${i + 1}/${books.length}] id=${book.id} "${book.title}"`;

    try {
      const detailUrl = await findFirstResultUrl(book.title, book.author);

      if (!detailUrl) {
        console.log(`– ${label} (no search result)`);
        notFound++;
        if (i < books.length - 1) await sleep(DELAY_MS);
        continue;
      }

      const { description, coverUrl } = await scrapeDetailPage(detailUrl);

      if (coverUrl || description) {
        await prisma.book.update({
          where: { id: book.id },
          data: { description, coverUrl },
        });
        const flag = coverUrl ? "✓" : "~";
        console.log(`${flag} ${label}`);
        if (coverUrl) console.log(`  cover: ${coverUrl}`);
        if (description) console.log(`  desc:  ${description.slice(0, 80)}…`);
        enriched++;
      } else {
        console.log(`– ${label} (detail page found but no data extracted)`);
        notFound++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${label}: ${msg}`);
      errors++;
    }

    if (i < books.length - 1) await sleep(DELAY_MS);
  }

  console.log(
    `\nDone. Enriched: ${enriched}, Not found: ${notFound}, Errors: ${errors}`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
