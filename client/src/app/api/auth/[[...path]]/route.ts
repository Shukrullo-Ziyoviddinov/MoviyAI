import { apiBaseUrl } from "@/api/client";
import { NextResponse } from "next/server";

async function forward(request: Request, method: "GET" | "POST", path: string[]) {
  const suffix = path.join("/");
  const allowed = method === "POST" ? suffix === "google" : suffix === "me";
  if (!allowed) {
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

  const response = await fetch(`${apiBaseUrl}/api/auth/${suffix}`, {
    method,
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let data: unknown = { ok: false, error: "Server error" };
  try {
    data = JSON.parse(text);
  } catch {
    data = { ok: false, error: "Server error" };
  }
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
