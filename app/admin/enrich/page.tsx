"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

type Book = {
  id: number;
  title: string;
  author: string | null;
  location: string;
  quantity: number;
  coverUrl: string | null;
  description: string | null;
};

type ApiResponse = {
  books: Book[];
  total: number;
  page: number;
  totalPages: number;
};

type Filter = "missing_any" | "missing_cover" | "missing_desc";

const FILTER_LABELS: Record<Filter, string> = {
  missing_any: "Missing cover or description",
  missing_cover: "Missing cover only",
  missing_desc: "Missing description only",
};

// ── per-row editor ────────────────────────────────────────────────────────────

function BookRow({ book, onSaved }: { book: Book; onSaved: (updated: Book) => void }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState(book.description ?? "");
  const [urlInput, setUrlInput] = useState(book.coverUrl ?? "");
  const [preview, setPreview] = useState<string | null>(book.coverUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUrlInput("");
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    setPreview(val || null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const file = fileRef.current?.files?.[0];
      let finalCoverUrl = book.coverUrl;

      // Upload file if one was selected
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/admin/books/${book.id}/cover`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? `Upload failed (${res.status})`);
        }
        const json = await res.json();
        finalCoverUrl = json.coverUrl;
      } else if (urlInput !== book.coverUrl) {
        finalCoverUrl = urlInput || null;
      }

      // Patch description + coverUrl together
      const body: Record<string, string | null> = {};
      if (desc !== (book.description ?? "")) body.description = desc || null;
      if (finalCoverUrl !== book.coverUrl) body.coverUrl = finalCoverUrl ?? null;

      if (Object.keys(body).length > 0) {
        const res = await fetch(`/api/admin/books/${book.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
      }

      setSuccess(true);
      onSaved({
        ...book,
        description: desc || null,
        coverUrl: finalCoverUrl ?? null,
      });
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const missingCover = !book.coverUrl;
  const missingDesc = !book.description;

  return (
    <>
      {/* Summary row */}
      <tr
        className={`border-b border-gray-100 transition-colors ${open ? "bg-indigo-50" : "hover:bg-gray-50"}`}
      >
        <td className="px-4 py-3 w-14 shrink-0">
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              width={36}
              height={48}
              className="rounded object-cover border border-gray-200"
              unoptimized
            />
          ) : (
            <div className="w-9 h-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900 leading-snug">{book.title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{book.author ?? "—"}</div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <div className="flex flex-wrap gap-1">
            {missingCover && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                No cover
              </span>
            )}
            {missingDesc && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                No description
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => setOpen((v) => !v)}
            className={`rounded-lg border-2 px-3 py-1 text-xs font-semibold transition-colors ${
              open
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-800 bg-white text-slate-800 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {open ? "Close" : "Edit"}
          </button>
        </td>
      </tr>

      {/* Expanded editor */}
      {open && (
        <tr className="bg-indigo-50 border-b-2 border-indigo-200">
          <td colSpan={4} className="px-4 pb-5 pt-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Cover section */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Cover Image
                </p>
                <div className="flex gap-3 items-start">
                  {/* Preview box */}
                  <div className="shrink-0 w-20 h-28 rounded border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-white">
                    {preview ? (
                      <Image
                        src={preview}
                        alt="preview"
                        width={80}
                        height={112}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    )}
                  </div>

                  {/* Inputs */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="Paste image URL…"
                      className="w-full rounded-lg border-2 border-slate-800 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">or</span>
                      <label className="cursor-pointer rounded-lg border-2 border-slate-800 bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-colors">
                        Upload file
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </label>
                      {preview && (
                        <button
                          onClick={() => {
                            setPreview(null);
                            setUrlInput("");
                            if (fileRef.current) fileRef.current.value = "";
                          }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description section */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Description
                </p>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Enter a synopsis or description…"
                  rows={5}
                  className="w-full rounded-lg border-2 border-slate-800 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg border-2 border-indigo-600 bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 hover:border-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border-2 border-slate-800 bg-white px-4 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              {success && (
                <span className="text-sm font-medium text-emerald-600">Saved!</span>
              )}
              {error && (
                <span className="text-sm text-red-600">{error}</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

function EnrichCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const initialPage = parseInt(searchParams.get("page") ?? "1", 10);
  const initialFilter = (searchParams.get("filter") as Filter) ?? "missing_any";

  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBooks = useCallback(async (q: string, f: Filter, page: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: f, page: String(page) });
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/books?${params}`);
    const json: ApiResponse = await res.json();
    setData(json);
    setBooks(json.books);
    setLoading(false);
  }, []);

  const pushParams = useCallback(
    (q: string, f: Filter, page: number) => {
      const params = new URLSearchParams({ filter: f });
      if (q) params.set("q", q);
      if (page > 1) params.set("page", String(page));
      router.push(`?${params}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    fetchBooks(initialQuery, initialFilter, initialPage);
  }, []); // eslint-disable-line

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams(val, filter, 1);
      fetchBooks(val, filter, 1);
    }, 350);
  };

  const handleFilterChange = (f: Filter) => {
    setFilter(f);
    pushParams(query, f, 1);
    fetchBooks(query, f, 1);
  };

  const handlePageChange = (page: number) => {
    pushParams(query, filter, page);
    fetchBooks(query, filter, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaved = (updated: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin — Enrich Books</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {data
                ? `${data.total.toLocaleString()} books matching filter`
                : "Loading…"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/admin" className="text-gray-500 hover:text-gray-900 transition-colors">
              ← Manage Books
            </a>
            <a href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
              Catalog
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-4">

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`rounded-full border-2 border-slate-800 px-4 py-1.5 text-sm font-semibold transition-colors ${
                filter === f
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-800 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by title or author…"
            className="w-full rounded-lg border-2 border-slate-800 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border-2 border-slate-800 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-slate-800 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-14">Cover</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Book</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden sm:table-cell">Missing</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <div className="w-9 h-12 animate-pulse rounded bg-gray-100" />
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        <div className="h-4 animate-pulse rounded bg-gray-100 w-48" />
                        <div className="h-3 animate-pulse rounded bg-gray-100 w-32" />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="h-4 animate-pulse rounded bg-gray-100 w-24" />
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                : books.map((book) => (
                    <BookRow key={book.id} book={book} onSaved={handleSaved} />
                  ))}
            </tbody>
          </table>

          {!loading && books.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400">
              No books match this filter.
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(data.page - 1)}
                disabled={data.page <= 1}
                className="rounded-lg border-2 border-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => handlePageChange(data.page + 1)}
                disabled={data.page >= data.totalPages}
                className="rounded-lg border-2 border-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EnrichPage() {
  return (
    <Suspense>
      <EnrichCatalog />
    </Suspense>
  );
}
