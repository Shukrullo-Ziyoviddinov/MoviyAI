import { apiBaseUrl } from "@/api/client";
import { NextResponse } from "next/server";

const ALLOWED = new Set(["", "ids", "toggle"]);

async function forward(request: Request, method: "GET" | "POST", path: string[]) {
  const suffix = path.join("/");
  if (!ALLOWED.has(suffix) || (method === "POST" && suffix !== "toggle")) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);

  let body: string | undefined;
  if (method === "POST") {
    headers.set("Content-Type", "application/json");
    body = await request.text();
  }

  const upstream = suffix ? `/api/wishlist/${suffix}` : "/api/wishlist";
  const response = await fetch(`${apiBaseUrl}${upstream}`, {
    method,
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return forward(request, "GET", path);
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return forward(request, "POST", path);
}
