import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const where = q
    ? {
        OR: [
          { title: { contains: q } },
          { author: { contains: q } },
        ],
      }
    : undefined;

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        author: true,
        quantity: true,
        location: true,
        genre: true,
        coverUrl: true,
        description: true,
      },
    }),
    prisma.book.count({ where }),
  ]);

  return NextResponse.json({
    books,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
    pageSize: PAGE_SIZE,
  });
}
