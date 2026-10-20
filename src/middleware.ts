import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Zones protégées par Basic Auth (ADMIN_USERNAME / ADMIN_PASSWORD) :
 * le dashboard et les routes API qui utilisent les clés Google / eBay.
 */
const PROTECTED = /^\/(?:en\/)?admin(?:\/|$)|^\/api\/(?:ebay|calendar|google)(?:\/|$)/;

function isAuthorized(request: NextRequest): boolean {
  // Bypass en dev local et sur les déploiements preview Vercel (prototype).
  // L'auth n'est appliquée qu'en production.
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return true;

  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return false; // fail closed : pas de config = pas d'accès

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  try {
    const [u, ...rest] = atob(header.slice(6)).split(":");
    return u === user && rest.join(":") === pass;
  } catch {
    return false;
  }
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED.test(pathname)) {
    if (!isAuthorized(request)) {
      const configured = Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
      return new NextResponse(
        configured ? "Authentification requise." : "Admin non configuré : définir ADMIN_USERNAME / ADMIN_PASSWORD.",
        {
          status: configured ? 401 : 503,
          headers: {
            "WWW-Authenticate": 'Basic realm="Info Liquidation Admin", charset="UTF-8"',
            "Cache-Control": "no-store"
          }
        }
      );
    }
    // API et fichier statique du dashboard : pas de traitement i18n
    if (pathname.startsWith("/api/") || pathname.includes(".")) return NextResponse.next();
    // /admin (et /en/admin) sert le dashboard statique
    if (/^\/(?:en\/)?admin\/?$/.test(pathname)) {
      return NextResponse.rewrite(new URL("/admin/dashboard.html", request.url));
    }
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
