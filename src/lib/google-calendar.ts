import { google, type calendar_v3 } from "googleapis";

/**
 * Client Google Calendar authentifié avec le refresh token stocké dans .env.local.
 * Le refresh token génère automatiquement de nouveaux access tokens (valides 1 h).
 */
let cached: calendar_v3.Calendar | null = null;

export function resetCalendarClient() {
  cached = null;
}

export function getCalendarClient(): calendar_v3.Calendar {
  if (cached) return cached;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Calendar not configured. Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN in .env.local."
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });

  cached = google.calendar({ version: "v3", auth: oauth2 });
  return cached;
}

export const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

/** Liste les événements entre deux dates. */
export async function listEvents(opts: {
  from: Date;
  to: Date;
  maxResults?: number;
}) {
  const calendar = getCalendarClient();
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: opts.from.toISOString(),
    timeMax: opts.to.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: opts.maxResults ?? 100
  });
  return res.data.items ?? [];
}

/** Crée un événement (ex. à la soumission d'un formulaire de ramassage). */
export async function createEvent(input: {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  attendees?: string[];
}) {
  const calendar = getCalendarClient();
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
      attendees: input.attendees?.map((email) => ({ email }))
    }
  });
  return res.data;
}

/** Message d'erreur lisible pour le dashboard (clé manquante, token expiré, etc.). */
export function describeGoogleError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Unknown error";
  if (/invalid_grant/i.test(message)) {
    return "Google Calendar : GOOGLE_REFRESH_TOKEN expiré ou révoqué. Refaire l'autorisation via /api/google/auth-start puis mettre à jour la variable (.env.local + Vercel).";
  }
  if (/invalid_client/i.test(message)) {
    return "Google Calendar : GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET invalides.";
  }
  return message;
}
