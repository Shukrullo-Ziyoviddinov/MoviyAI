import { apiBaseUrl } from "@/api/client";
import { NextResponse } from "next/server";

function readCookie(header: string, name: string) {
  const prefix = `${name}=`;
  const found = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : "";
}

function page(message: string, session?: { token: string; profile: unknown }) {
  const payload = session ? JSON.stringify(session).replace(/</g, "\\u003c") : "";
  const script = session
    ? `<script>
        const session = ${payload};
        localStorage.setItem("moviy.authToken", session.token);
        localStorage.setItem("moviy.authProfile", JSON.stringify(session.profile));
        location.replace("/");
      </script>`
    : `<p>${message}</p><p><a href="/">Orqaga</a></p>`;
  return new NextResponse(`<!doctype html><html><body>${script}</body></html>`, {
    status: session ? 200 : 401,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const credential = String(form.get("credential") ?? "").trim();
  const bodyToken = String(form.get("g_csrf_token") ?? "");
  const cookieToken = readCookie(request.headers.get("cookie") ?? "", "g_csrf_token");
  if (!credential || (bodyToken && cookieToken && bodyToken !== cookieToken)) {
    return page("Kirish muvaffaqiyatsiz");
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/google`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: credential }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = (await response.json()) as {
    ok?: boolean;
    data?: { token?: string; profile?: unknown };
  };
  const token = data.data?.token;
  const profile = data.data?.profile;
  if (!response.ok || !data.ok || !token || !profile) {
    return page("Kirish muvaffaqiyatsiz");
  }
  return page("", { token, profile });
}
