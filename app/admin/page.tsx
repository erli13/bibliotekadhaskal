"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Book = {
  id: number;
  title: string;
  author: string | null;
  location: string;
  quantity: number;
};

type ApiResponse = {
  books: Book[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
};

function AdminCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialPage = parseInt(searchParams.get("page") ?? "1", 10);

  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBooks = useCallback(async (q: string, page: number) => {
    setLoading(true);
    setSelected(new Set());
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/books?${params}`);
    const json: ApiResponse = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBooks(initialQuery, initialPage); }, []); // eslint-disable-line

  const pushParams = useCallback((q: string, page: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    router.push(`?${params}`, { scroll: false });
  }, [router]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { pushParams(value, 1); fetchBooks(value, 1); }, 350);
  };

  const handlePageChange = (page: number) => {
    pushParams(query, page);
    fetchBooks(query, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!data) return;
    const allIds = data.books.map(b => b.id);
    const allSelected = allIds.every(id => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(allIds));
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const confirmed = window.confirm(`Delete ${selected.size} book(s)? This cannot be undone.`);
    if (!confirmed) return;
    setDeleting(true);
    await fetch("/api/admin/books", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    setDeleting(false);
    fetchBooks(query, data?.page ?? 1);
  };

  const allSelected = !!data && data.books.length > 0 && data.books.every(b => selected.has(b.id));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin — Manage Books</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {data ? `${data.total.toLocaleString()} books total` : "Loading…"}
            </p>
          </div>
          <a href="/" className="text-sm text-blue-600 hover:underline">← Back to catalog</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search by title or author…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            onClick={handleDelete}
            disabled={selected.size === 0 || deleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            {deleting ? "Deleting…" : `Delete${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Author</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Location</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Qty</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-gray-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.books.map(book => (
                    <tr key={book.id} className={`transition-colors ${selected.has(book.id) ? "bg-red-50" : "hover:bg-gray-50"}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(book.id)} onChange={() => toggleOne(book.id)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono">{book.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{book.title}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{book.author ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{book.location}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{book.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete "${book.title}"?`)) return;
                            await fetch("/api/admin/books", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ ids: [book.id] }),
                            });
                            fetchBooks(query, data.page);
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && data?.books.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400">No books found.</div>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button onClick={() => handlePageChange(data.page - 1)} disabled={data.page <= 1}
                className="rounded-lg px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ← Prev
              </button>
              <button onClick={() => handlePageChange(data.page + 1)} disabled={data.page >= data.totalPages}
                className="rounded-lg px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminCatalog />
    </Suspense>
  );
}
