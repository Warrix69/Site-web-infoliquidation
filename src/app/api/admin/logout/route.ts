import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

/** GET|POST /api/admin/logout : supprime le cookie de session et renvoie vers la connexion. */
function logout() {
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin/login", "Cache-Control": "no-store" }
  });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

export const GET = logout;
export const POST = logout;
