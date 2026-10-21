import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isAdminConfigured,
  verifyCredentials
} from "@/lib/admin-auth";
import { clear, clientIp, peek, rateLimit, record } from "@/lib/rate-limit";

/**
 * Limites de connexion, par adresse IP.
 * Prévu pour 5 employés derrière la même IP de bureau (8 h/jour, lun-ven) :
 * une connexion par personne et par session de 8 h, plus quelques fautes de frappe.
 * Seuls les ÉCHECS comptent, et une connexion réussie remet le compteur à zéro :
 * l'équipe ne peut pas atteindre la limite en usage normal.
 */
const MIN = 60 * 1000;
const LIMITS = {
  /** Requêtes totales (réussies ou non) : coupe le martèlement */
  requests: { max: 30, windowMs: 15 * MIN },
  /** Échecs rapprochés : ~10 fautes de frappe en 15 min pour toute l'équipe */
  burst: { max: 10, windowMs: 15 * MIN },
  /** Échecs sur la journée : bloque l'attaque lente (sinon 10 essais × 96 fenêtres/jour) */
  daily: { max: 30, windowMs: 24 * 60 * MIN }
} as const;

/** Redirection relative (303 : le navigateur refait un GET), compatible avec le proxy du nouveau site. */
function redirect(location: string, headers: Record<string, string> = {}) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store", ...headers }
  });
}

/**
 * POST /api/admin/login (formulaire de /admin/login)
 * Vérifie ADMIN_USERNAME / ADMIN_PASSWORD et pose un cookie de session signé.
 * Voir LIMITS pour la limitation des tentatives.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) return redirect("/admin/login?e=config");

  const ip = clientIp(request);
  const burstKey = `login-fail-15m:${ip}`;
  const dailyKey = `login-fail-24h:${ip}`;

  const requests = rateLimit(`login-req:${ip}`, LIMITS.requests.max, LIMITS.requests.windowMs);
  const burst = peek(burstKey);
  const daily = peek(dailyKey);
  const blocked =
    !requests.ok
      ? requests.retryAfter
      : daily.count >= LIMITS.daily.max
        ? daily.retryAfter
        : burst.count >= LIMITS.burst.max
          ? burst.retryAfter
          : 0;
  if (blocked) return redirect("/admin/login?e=rate", { "Retry-After": String(blocked) });

  let username = "";
  let password = "";
  try {
    const form = await request.formData();
    username = String(form.get("username") ?? "").slice(0, 200);
    password = String(form.get("password") ?? "").slice(0, 200);
  } catch {
    return redirect("/admin/login?e=1");
  }

  if (!(await verifyCredentials(username, password))) {
    record(burstKey, LIMITS.burst.windowMs);
    record(dailyKey, LIMITS.daily.windowMs);
    return redirect("/admin/login?e=1");
  }

  clear(burstKey);
  clear(dailyKey);

  const token = await createSessionToken();
  if (!token) return redirect("/admin/login?e=config");

  const res = redirect("/admin");
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
  return res;
}
