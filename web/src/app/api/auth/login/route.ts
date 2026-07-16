import { NextRequest, NextResponse } from "next/server";

import {
  createSessionToken,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/auth";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isAllowed(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  // SameSite=Strict protects the resulting session cookie. Sec-Fetch-Site is
  // used instead of comparing Origin/Host, which is unreliable behind proxies.
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const loginUrl = new URL("/login", request.url);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096 || !isAllowed(clientKey(request))) {
    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl, 303);
  }

  let candidate = "";
  try {
    const form = await request.formData();
    const submitted = form.get("password");
    if (typeof submitted === "string" && submitted.length <= 1024) candidate = submitted;
  } catch {
    // Treat malformed input exactly like an incorrect password.
  }

  try {
    if (!passwordMatches(candidate)) {
      loginUrl.searchParams.set("error", "1");
      return NextResponse.redirect(loginUrl, 303);
    }

    attempts.delete(clientKey(request));
    const response = NextResponse.redirect(new URL("/", request.url), 303);
    response.cookies.set(SESSION_COOKIE, createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return new NextResponse("Dashboard authentication is not configured.", {
      status: 503,
    });
  }
}
