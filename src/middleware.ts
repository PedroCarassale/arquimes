import { NextRequest, NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/redirect-path";

const PUBLIC_PAGES = new Set(["/login", "/register"]);

function isStaticRequest(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  );
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return false;

  try {
    const sessionUrl = new URL("/api/auth/get-session", request.url);
    const response = await fetch(sessionUrl, {
      method: "GET",
      headers: {
        cookie,
      },
      cache: "no-store",
    });

    if (!response.ok) return false;
    const payload = (await response.json()) as {
      user?: { id?: string };
      session?: { id?: string };
    };
    return Boolean(payload?.user?.id && payload?.session?.id);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticRequest(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const ok = await hasValidSession(request);
    if (!ok) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PAGES.has(pathname)) {
    const ok = await hasValidSession(request);
    if (ok) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const ok = await hasValidSession(request);
  if (!ok) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = safeRedirectPath(`${pathname}${search}`);
    if (nextPath !== "/") loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    {
      source: "/((?!api/|_next/static|_next/image|favicon.ico).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
