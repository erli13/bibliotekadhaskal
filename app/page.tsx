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
  coverUrl: string | null;
  description: string | null;
};

type ApiResponse = {
  books: Book[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
};

// ── Category pills ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Tregime",  keyword: "tregime",  bg: "bg-amber-400",   text: "text-amber-900"  },
  { label: "Poezi",    keyword: "poezi",    bg: "bg-violet-500",  text: "text-white"      },
  { label: "Roman",    keyword: "roman",    bg: "bg-emerald-400", text: "text-emerald-900"},
  { label: "Novela",   keyword: "novela",   bg: "bg-orange-400",  text: "text-orange-900" },
  { label: "Ese",      keyword: "ese",      bg: "bg-teal-400",    text: "text-teal-900"   },
  { label: "Kadare",   keyword: "kadare",   bg: "bg-rose-500",    text: "text-white"      },
  { label: "Hugo",     keyword: "hugo",     bg: "bg-sky-400",     text: "text-sky-900"    },
  { label: "Drama",    keyword: "drama",    bg: "bg-red-500",     text: "text-white"      },
  { label: "Histori",  keyword: "histori",  bg: "bg-lime-400",    text: "text-lime-900"   },
  { label: "Balzak",   keyword: "balzak",   bg: "bg-fuchsia-500", text: "text-white"      },
  { label: "Fëmijë",   keyword: "femij",    bg: "bg-yellow-300",  text: "text-yellow-900" },
  { label: "Arapi",    keyword: "arapi",    bg: "bg-indigo-400",  text: "text-white"      },
];

function CategoryPills({
  activeQuery,
  onSelect,
}: {
  activeQuery: string;
  onSelect: (keyword: string) => void;
}) {
  return (
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none [-webkit-overflow-scrolling:touch]">
      {CATEGORIES.map(({ label, keyword, bg, text }) => {
        const isActive = activeQuery.toLowerCase() === keyword.toLowerCase();
        return (
          <button
            key={keyword}
            onClick={() => onSelect(isActive ? "" : keyword)}
            className={`shrink-0 rounded-full border-2 border-slate-800 px-4 py-1.5 text-xs font-bold tracking-wide transition-all duration-150
              ${isActive
                ? "bg-slate-800 text-white"
                : `${bg} ${text} hover:bg-slate-800 hover:text-white`
              }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Book card ─────────────────────────────────────────────────────────────────

// Deterministic fallback color from title's first character
const FALLBACK_PALETTES = [
  { bg: "bg-indigo-600",  letter: "text-indigo-100"  },
  { bg: "bg-rose-600",    letter: "text-rose-100"    },
  { bg: "bg-emerald-600", letter: "text-emerald-100" },
  { bg: "bg-amber-500",   letter: "text-amber-100"   },
  { bg: "bg-violet-600",  letter: "text-violet-100"  },
  { bg: "bg-teal-600",    letter: "text-teal-100"    },
  { bg: "bg-orange-600",  letter: "text-orange-100"  },
  { bg: "bg-sky-600",     letter: "text-sky-100"     },
];

function CoverImage({ book }: { book: Book }) {
  const palette =
    FALLBACK_PALETTES[(book.title.toUpperCase().charCodeAt(0) - 65) % FALLBACK_PALETTES.length] ??
    FALLBACK_PALETTES[0];

  return (
    // 2:3 book aspect ratio
    <div className="relative w-full overflow-hidden rounded-lg border-b-2 border-slate-800" style={{ aspectRatio: "2/3" }}>
      {book.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverUrl}
          alt={book.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 ${palette.bg}`}>
          {/* Geometric accent squares */}
          <div className="absolute -right-3 -top-3 h-12 w-12 rotate-12 rounded-md bg-white/10" />
          <div className="absolute -bottom-2 -left-2 h-8 w-8 rounded-md bg-black/10" />
          {/* First letter */}
          <span className={`relative z-10 select-none text-6xl font-black leading-none ${palette.letter}`}>
            {book.title[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
      )}
    </div>
  );
}

function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="
        group flex flex-col rounded-xl
        border-2 border-slate-800 bg-white overflow-hidden
        transition-all duration-200 ease-out
        hover:-translate-y-1 hover:scale-[1.02] hover:border-indigo-500
        cursor-pointer
      "
    >
      <CoverImage book={book} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="text-sm font-extrabold leading-snug tracking-tight text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {book.title}
          </h2>
          {book.author && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400 line-clamp-1">
              {book.author}
            </p>
          )}
          {book.description && (
            <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2">
              {book.description}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {book.location}
          </span>

          {book.genre && (
            <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
              {book.genre}
            </span>
          )}

          <span className="ml-auto shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-500">
            ×{book.quantity}
          </span>
        </div>
      </div>
    </article>
  );
}

// ── Book detail modal ─────────────────────────────────────────────────────────

function BookDetailModal({ book, onClose }: { book: Book; onClose: () => void }) {
  const palette =
    FALLBACK_PALETTES[(book.title.toUpperCase().charCodeAt(0) - 65) % FALLBACK_PALETTES.length] ??
    FALLBACK_PALETTES[0];

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, centered card on sm+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={book.title}
        className="
          relative z-10 w-full bg-white
          rounded-t-2xl border-t-2 border-x-2 border-slate-800
          max-h-[88vh] overflow-y-auto
          sm:rounded-2xl sm:border-2 sm:max-w-2xl sm:max-h-[85vh]
          flex flex-col
        "
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Drag handle (mobile hint) */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />

        {/* Content */}
        <div className="flex flex-col gap-6 p-6 pt-5 sm:flex-row">

          {/* Cover */}
          <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-[180px]">
            <div
              className="relative w-full overflow-hidden rounded-xl border-2 border-slate-800"
              style={{ aspectRatio: "2/3" }}
            >
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className={`absolute inset-0 flex items-center justify-center ${palette.bg}`}>
                  <div className="absolute -right-3 -top-3 h-14 w-14 rotate-12 rounded-md bg-white/10" />
                  <div className="absolute -bottom-3 -left-2 h-10 w-10 rounded-md bg-black/10" />
                  <span className={`relative z-10 select-none text-7xl font-black leading-none ${palette.letter}`}>
                    {book.title[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-1 flex-col gap-4 min-w-0">
            <div>
              <h2 className="text-xl font-black leading-tight tracking-tight text-slate-900 pr-8">
                {book.title}
              </h2>
              {book.author && (
                <p className="mt-1.5 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  {book.author}
                </p>
              )}
            </div>

            {book.description && (
              <>
                <hr className="border-slate-200" />
                <p className="text-sm leading-relaxed text-slate-600">
                  {book.description}
                </p>
              </>
            )}

            <hr className="border-slate-200 mt-auto" />

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-800 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                {book.location}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-800 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                {book.quantity} {book.quantity === 1 ? "kopje" : "kopje"}
              </span>

              {book.genre && (
                <span className="inline-flex items-center rounded-lg border-2 border-violet-400 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                  {book.genre}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">

      {/* Geometric illustration */}
      <div className="relative mb-8 flex items-center justify-center">

        {/* Background square accent */}
        <div className="absolute -left-3 -top-3 h-16 w-16 rotate-6 rounded-lg bg-yellow-300" />
        <div className="absolute -bottom-3 -right-3 h-10 w-10 rounded-full border-4 border-indigo-500" />

        {/* Magnifying glass built from divs */}
        <div className="relative z-10 flex items-center justify-center">
          {/* lens circle */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-slate-800 bg-white">
            {/* inner detail */}
            <div className="h-10 w-10 rounded-full border-[4px] border-slate-300" />
          </div>
          {/* handle */}
          <div className="absolute bottom-0 right-0 h-10 w-4 origin-top-left translate-x-8 translate-y-6 rotate-45 rounded-full bg-slate-800" />
        </div>

        {/* Floating dots */}
        <div className="absolute -right-8 top-0 flex flex-col gap-2">
          <div className="h-2 w-2 rounded-full bg-rose-400" />
          <div className="h-2 w-2 rounded-full bg-indigo-400" />
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-xl font-black tracking-tight text-slate-800">
        Asnjë libër nuk u gjet!
      </h3>
      <p className="mt-2 max-w-xs text-sm text-slate-500">
        {query ? (
          <>
            S&apos;u gjet asgjë për{" "}
            <span className="font-bold text-slate-700">&ldquo;{query}&rdquo;</span>.
            Provo me një drejtshkrim tjetër ose zgjidh një kategori.
          </>
        ) : (
          "Provo të kërkosh sipas titullit ose autorit."
        )}
      </p>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {query && (
          <button
            onClick={onClear}
            className="rounded-full border-2 border-slate-800 bg-slate-800 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white hover:text-slate-800"
          >
            Pastro kërkimin
          </button>
        )}
        <a
          href="/"
          className="rounded-full border-2 border-slate-800 px-5 py-2 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-800 hover:text-white"
        >
          Të gjithë librat
        </a>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

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
        className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:border-slate-800 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
      >
        ← Prev
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ell-${i}`} className="px-2 text-slate-400 select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-[38px] rounded-lg border-2 px-3 py-2 text-sm font-bold transition-all ${
              p === page
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 text-slate-600 hover:border-slate-800 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:border-slate-800 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
      >
        Next →
      </button>
    </nav>
  );
}

// ── Main catalog ──────────────────────────────────────────────────────────────

function Catalog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const initialPage = parseInt(searchParams.get("page") ?? "1", 10);

  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
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

  const applyQuery = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushParams(value, 1);
    fetchBooks(value, 1);
    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputChange = (value: string) => {
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
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[32px] border-indigo-500" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rotate-12 bg-indigo-500" />
          <div className="absolute left-10 top-10 h-10 w-10 bg-yellow-400" />
          <div className="absolute -bottom-10 right-40 h-48 w-48 rounded-full border-[16px] border-indigo-400/60" />
          <div className="absolute right-12 top-1/2 -translate-y-1/2 grid grid-cols-4 gap-3 opacity-30">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-white" />
            ))}
          </div>
        </div>

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

          {/* Search */}
          <div className="mt-8 flex max-w-lg gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Kërko titull ose autor…"
                className="w-full rounded-xl bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
              />
            </div>
            <button
              onClick={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-gray-900 shadow-lg hover:bg-yellow-300 transition-colors"
            >
              Kërko
            </button>
          </div>

          {/* Category pills */}
          <CategoryPills activeQuery={query} onSelect={applyQuery} />

          {/* Stats */}
          <div className="mt-8 flex flex-wrap gap-6">
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
          <p className="text-sm text-slate-500">
            {!loading && data && data.total > 0 && (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-700">{start}–{end}</span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">{data.total.toLocaleString()}</span>{" "}
                books
                {query && (
                  <> for <span className="font-semibold text-slate-700">&ldquo;{query}&rdquo;</span></>
                )}
              </>
            )}
          </p>
          {query && (
            <button
              onClick={() => applyQuery("")}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Book grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
                {/* cover placeholder */}
                <div className="w-full animate-pulse bg-slate-100" style={{ aspectRatio: "2/3" }} />
                {/* text placeholder */}
                <div className="p-4 space-y-2">
                  <div className="h-4 animate-pulse rounded bg-slate-100 w-3/4" />
                  <div className="h-3 animate-pulse rounded bg-slate-100 w-1/2" />
                  <div className="h-3 animate-pulse rounded bg-slate-100 w-full" />
                  <div className="h-3 animate-pulse rounded bg-slate-100 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.books.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.books.map((book) => (
              <BookCard key={book.id} book={book} onClick={() => setSelectedBook(book)} />
            ))}
          </div>
        ) : (
          <EmptyState query={query} onClear={() => applyQuery("")} />
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-10">
            <Pagination page={data.page} totalPages={data.totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </main>

      {/* ── Book detail modal ── */}
      {selectedBook && (
        <BookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}

      {/* ── Footer ── */}
      <footer className="border-t-2 border-slate-800 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400">© Biblioteka Dhaskal Todri</p>
          <a href="/admin" className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors">Admin</a>
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
