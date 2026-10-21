import { NextResponse } from "next/server";
import { google } from "googleapis";
import { OAUTH_STATE_COOKIE, requireAdmin } from "@/lib/admin-auth";

/**
 * Démarre le flow OAuth Google Calendar.
 * Redirige vers l'écran de consentement Google.
 * À visiter manuellement une fois pour obtenir le refresh token
 * (ex. http://localhost:3000/api/google/auth-start).
 */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/google/callback`;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  // Jeton anti-CSRF vérifié par /api/google/callback
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");

  const url = oauth2.generateAuthUrl({
    state,
    access_type: "offline", // obligatoire pour obtenir un refresh_token
    prompt: "consent",       // force Google à redemander le consentement et émettre un nouveau refresh_token
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events"
    ]
  });

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 10 * 60
  });
  return res;
}
