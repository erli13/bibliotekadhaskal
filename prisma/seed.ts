import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { parse } from "csv-parse";
import { createReadStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = resolve(__dirname, "../data/Copy of Table1.csv");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const adapter = new PrismaLibSql(client);
const prisma = new PrismaClient({ adapter });

function normalizeString(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function parseQuantity(value: string): number {
  const n = parseInt(value, 10);
  return isNaN(n) ? 0 : n;
}

async function main() {
  const records: Record<string, string>[] = await new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    createReadStream(CSV_PATH)
      .pipe(
        parse({
          columns: ["id", "title", "author", "quantity", "location", "genre"],
          from_line: 2,
          quote: '"',
          relax_quotes: true,
          trim: false,
        })
      )
      .on("data", (row) => rows.push(row))
      .on("error", reject)
      .on("end", () => resolve(rows));
  });

  console.log(`Parsed ${records.length} rows from CSV.`);

  let inserted = 0;
  let skipped = 0;

  for (const row of records) {
    const title = normalizeString(row.title);
    if (!title) {
      console.warn(`Skipping row id=${row.id}: missing title`);
      skipped++;
      continue;
    }

    try {
      await prisma.book.create({
        data: {
          title,
          author: normalizeString(row.author),
          quantity: parseQuantity(row.quantity),
          location: normalizeString(row.location) ?? "",
          genre: normalizeString(row.genre),
        },
      });
      inserted++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error inserting id=${row.id} ("${title}"): ${message}`);
      skipped++;
    }
  }

  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}`);
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
