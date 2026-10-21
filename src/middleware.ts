import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { ADMIN_COOKIE, isAdminConfigured, verifySessionToken } from "./lib/admin-auth";

const intlMiddleware = createMiddleware(routing);

/** Pages et API réservées à l'admin (dashboard + routes qui utilisent les clés Google / eBay). */
const ADMIN_PAGE = /^\/(?:en\/)?admin(?:\/|$)/;
const ADMIN_API = /^\/api\/(?:ebay|calendar|google)(?:\/|$)/;
const LOGIN_PAGE = /^\/admin\/login(?:\.html)?\/?$/;

function redirectToLogin(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", request.url), 307);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (LOGIN_PAGE.test(pathname)) {
    return NextResponse.rewrite(new URL("/admin/login.html", request.url));
  }

  const isAdminPage = ADMIN_PAGE.test(pathname);
  const isAdminApi = ADMIN_API.test(pathname);

  if (isAdminPage || isAdminApi) {
    const authed =
      isAdminConfigured() && (await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value));

    if (!authed) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: isAdminConfigured() ? "Authentification requise" : "Admin non configuré" },
          { status: isAdminConfigured() ? 401 : 503, headers: { "Cache-Control": "no-store" } }
        );
      }
      return redirectToLogin(request);
    }

    if (isAdminApi) return NextResponse.next();

    // /admin (et /en/admin) sert le dashboard statique, sans traitement i18n
    const res = /^\/(?:en\/)?admin\/?$/.test(pathname)
      ? NextResponse.rewrite(new URL("/admin/dashboard.html", request.url))
      : NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Pages : ignore les routes API, les internals Next.js et les fichiers statiques
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Dashboard statique + routes API qui utilisent les clés Google / eBay
    "/admin/:path*",
    "/api/ebay/:path*",
    "/api/calendar/:path*",
    "/api/google/:path*"
  ]
};
