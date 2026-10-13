import { NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * Démarre le flow OAuth Google Calendar.
 * Redirige vers l'écran de consentement Google.
 * À visiter manuellement une fois pour obtenir le refresh token
 * (ex. http://localhost:3000/api/google/auth-start).
 */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/google/callback`;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const url = oauth2.generateAuthUrl({
    access_type: "offline", // obligatoire pour obtenir un refresh_token
    prompt: "consent",       // force Google à redemander le consentement et émettre un nouveau refresh_token
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events"
    ]
  });

  return NextResponse.redirect(url);
}
