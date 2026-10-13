import { apiBaseUrl } from "@/api/client";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const movieId = Number(id);
  if (!Number.isFinite(movieId)) {
    return NextResponse.json({ ok: false, error: "Invalid movie id" }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/api/movies/${movieId}/similar-trailers?limit=12`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
