import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await request.json()) as {
    description?: string | null;
    coverUrl?: string | null;
  };

  const data: { description?: string | null; coverUrl?: string | null } = {};
  if ("description" in body) data.description = body.description || null;
  if ("coverUrl" in body) data.coverUrl = body.coverUrl || null;

  await prisma.book.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
