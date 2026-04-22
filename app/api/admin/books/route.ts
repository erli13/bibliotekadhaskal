import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const filter = searchParams.get("filter"); // "missing_cover" | "missing_desc" | "missing_any"

  const missingFilter: Prisma.BookWhereInput | undefined =
    filter === "missing_cover"
      ? { coverUrl: null }
      : filter === "missing_desc"
      ? { description: null }
      : filter === "missing_any"
      ? { OR: [{ coverUrl: null }, { description: null }] }
      : undefined;

  const searchFilter: Prisma.BookWhereInput | undefined = q
    ? { OR: [{ title: { contains: q } }, { author: { contains: q } }] }
    : undefined;

  const where: Prisma.BookWhereInput | undefined =
    missingFilter && searchFilter
      ? { AND: [missingFilter, searchFilter] }
      : missingFilter ?? searchFilter ?? undefined;

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        author: true,
        location: true,
        quantity: true,
        coverUrl: true,
        description: true,
      },
    }),
    prisma.book.count({ where }),
  ]);

  return NextResponse.json({ books, total, page, totalPages: Math.ceil(total / PAGE_SIZE), pageSize: PAGE_SIZE });
}

export async function DELETE(request: NextRequest) {
  const { ids } = await request.json() as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }
  await prisma.book.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: ids.length });
}
