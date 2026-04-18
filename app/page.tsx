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

function SearchIcon() {
  return (
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

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
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          {book.location}
        </span>

        {book.genre && (
          <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
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
  const delta = 1;
  const left = page - delta;
  const right = page + delta;

  let lastPushed = 0;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i <= right)) {
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
          <span key={`ell-${i}`} className="px-2 text-gray-400 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              p === page
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
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
    }, 350);
  };

  const handlePageChange = (page: number) => {
    pushParams(query, page);
    fetchBooks(query, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const start = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const end = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            📚 Library Catalog
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and search the full book collection
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search by title or author…"
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 h-5">
          {!loading && data && (
            <p className="text-sm text-gray-500">
              {data.total > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-gray-700">
                    {start}–{end}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-700">
                    {data.total.toLocaleString()}
                  </span>{" "}
                  books
                  {query && (
                    <>
                      {" "}
                      for{" "}
                      <span className="font-medium text-gray-700">
                        &ldquo;{query}&rdquo;
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>No results{query && <> for &ldquo;{query}&rdquo;</>}</>
              )}
            </p>
          )}
        </div>

        {/* Book grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
              />
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
            <p className="mt-3 text-sm font-medium text-gray-500">
              No books found
            </p>
            {query && (
              <button
                onClick={() => handleQueryChange("")}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-10">
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </main>
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
