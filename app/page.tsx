"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Book = {
  id: number;
  title: string;
  author: string | null;
  quantity: number;
  location: string;
  genre: string | null;
};

type ApiResponse = {
  books: Book[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
};

function BookCard({ book }: { book: Book }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex-1">
        <h2 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2">
          {book.title}
        </h2>
        {book.author && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-1">{book.author}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          {book.location}
        </span>
        {book.genre && (
          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-700/10">
            {book.genre}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">
          Qty: <span className="font-medium text-gray-600">{book.quantity}</span>
        </span>
      </div>
    </article>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  let lastPushed = 0;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      if (lastPushed && i - lastPushed > 1) pages.push("…");
      pages.push(i);
      lastPushed = i;
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
      >
        ← Prev
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ell-${i}`} className="px-2 text-gray-400 select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              p === page ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
      >
        Next →
      </button>
    </nav>
  );
}

function Catalog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const initialPage = parseInt(searchParams.get("page") ?? "1", 10);

  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  const fetchBooks = useCallback(async (q: string, page: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/books?${params}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks(initialQuery, initialPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushParams = useCallback(
    (q: string, page: number) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (page > 1) params.set("page", String(page));
      router.push(`?${params}`, { scroll: false });
    },
    [router]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams(value, 1);
      fetchBooks(value, 1);
      catalogRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 350);
  };

  const handlePageChange = (page: number) => {
    pushParams(query, page);
    fetchBooks(query, page);
    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const start = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const end = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-gray-900">
              Biblioteka Dhaskal Todri
            </span>
          </div>
          {data && (
            <span className="hidden text-xs font-medium text-gray-500 sm:block">
              {data.total.toLocaleString()} libra
            </span>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-indigo-600 px-4 py-20 sm:py-28">

        {/* Geometric decorations */}
        <div className="pointer-events-none absolute inset-0">
          {/* large ring top-right */}
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[32px] border-indigo-500" />
          {/* medium filled square bottom-left */}
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rotate-12 bg-indigo-500" />
          {/* small square top-left */}
          <div className="absolute left-10 top-10 h-10 w-10 bg-yellow-400" />
          {/* thin ring bottom-right */}
          <div className="absolute -bottom-10 right-40 h-48 w-48 rounded-full border-[16px] border-indigo-400/60" />
          {/* dot grid strip */}
          <div className="absolute right-12 top-1/2 -translate-y-1/2 grid grid-cols-4 gap-3 opacity-30">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-white" />
            ))}
          </div>
        </div>

        {/* Hero content */}
        <div className="relative mx-auto max-w-6xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
            Mirë se vini
          </p>
          <h1 className="max-w-2xl text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
            Biblioteka<br />
            <span className="text-yellow-400">Dixhitale</span><br />
            Dhaskal Todri
          </h1>
          <p className="mt-5 max-w-md text-base text-indigo-200">
            Shfleto dhe kërko koleksionin e plotë të librave. Gjej çdo titull sipas emrit ose autorit.
          </p>

          {/* Hero search */}
          <div className="mt-8 flex max-w-lg gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Kërko titull ose autor…"
                className="w-full rounded-xl bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
              />
            </div>
            <button
              onClick={() => {
                catalogRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-gray-900 shadow-lg hover:bg-yellow-300 transition-colors"
            >
              Kërko
            </button>
          </div>

          {/* Quick stats */}
          <div className="mt-10 flex flex-wrap gap-6">
            {[
              { label: "Libra", value: data?.total.toLocaleString() ?? "…" },
              { label: "Vendndodhje", value: "Dollapi & Rafte" },
              { label: "Qasje", value: "Falas" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xl font-black text-white">{value}</p>
                <p className="text-xs font-medium text-indigo-300">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Catalog ── */}
      <main ref={catalogRef} className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Stats bar */}
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {!loading && data && (
              data.total > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-gray-700">{start}–{end}</span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-700">{data.total.toLocaleString()}</span>{" "}
                  books{query && <> for <span className="font-medium text-gray-700">&ldquo;{query}&rdquo;</span></>}
                </>
              ) : (
                <>No results{query && <> for &ldquo;{query}&rdquo;</>}</>
              )
            )}
          </p>
          {query && (
            <button
              onClick={() => handleQueryChange("")}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Book grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
            ))}
          </div>
        ) : data && data.books.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-24 text-center">
            <p className="text-4xl">📭</p>
            <p className="mt-3 text-sm font-medium text-gray-500">No books found</p>
            {query && (
              <button onClick={() => handleQueryChange("")} className="mt-3 text-sm text-indigo-600 hover:underline">
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-10">
            <Pagination page={data.page} totalPages={data.totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <p className="text-xs text-gray-400">© Biblioteka Dhaskal Todri</p>
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Admin</a>
        </div>
      </footer>

    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
