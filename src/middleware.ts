import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin (et /en/admin) sert le dashboard statique, sans traitement i18n
  if (/^\/(?:en\/)?admin\/?$/.test(pathname)) {
    return NextResponse.rewrite(new URL("/admin/dashboard.html", request.url));
  }
  if (/^\/(?:en\/)?admin\//.test(pathname)) return NextResponse.next();

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Pages : ignore les routes API, les internals Next.js et les fichiers statiques
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Dashboard statique
    "/admin/:path*"
  ]
};
