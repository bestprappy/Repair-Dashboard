import { NextRequest, NextResponse } from "next/server";

import { isValidSessionToken, SESSION_COOKIE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (isValidSessionToken(token)) return NextResponse.next();
  } catch {
    return new NextResponse("Dashboard authentication is not configured.", {
      status: 503,
    });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
