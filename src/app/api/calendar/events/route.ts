import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createEvent, describeGoogleError, listEvents } from "@/lib/google-calendar";

const dateString = z.string().max(64).refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date");

const createSchema = z.object({
  summary: z.string().trim().min(1).max(300),
  description: z.string().max(8000).optional(),
  location: z.string().max(500).optional(),
  start: dateString,
  end: dateString,
  attendees: z.array(z.string().trim().email()).max(20).optional()
});

/**
 * GET /api/calendar/events?from=2026-10-08&to=2026-10-15
 * Retourne la liste des événements du calendrier Info Liquidation Recycle
 * entre deux dates (ISO yyyy-mm-dd).
 *
 * Si from/to absents, par défaut : aujourd'hui → +30 jours.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const now = new Date();
    const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = toParam ? new Date(toParam) : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid from/to date" }, { status: 400 });
    }
    if (to.getTime() - from.getTime() > 400 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Date range too large" }, { status: 400 });
    }

    const items = await listEvents({ from, to, maxResults: 250 });

    // Normalisation : on retourne un format simple pour le dashboard
    const events = items.map((e) => ({
      id: e.id,
      title: e.summary ?? "(Sans titre)",
      description: e.description ?? "",
      location: e.location ?? "",
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
      allDay: !e.start?.dateTime,
      status: e.status, // confirmed / tentative / cancelled
      htmlLink: e.htmlLink,
      attendees: (e.attendees ?? []).map((a) => ({ email: a.email, name: a.displayName }))
    }));

    return NextResponse.json(
      { events, from: from.toISOString(), to: to.toISOString(), count: events.length },
      {
        headers: {
          // Pas de cache : on veut la donnée fraîche à chaque appel
          "Cache-Control": "no-store, max-age=0, must-revalidate"
        }
      }
    );
  } catch (err) {
    const message = describeGoogleError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/calendar/events
 * Crée un événement Google Calendar.
 * Body JSON : { summary, description?, location?, start, end, attendees? }
 */
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body: summary / start / end required" }, { status: 400 });
    }
    const body = parsed.data;
    const event = await createEvent({
      summary: body.summary,
      description: body.description,
      location: body.location,
      start: new Date(body.start),
      end: new Date(body.end),
      attendees: body.attendees
    });
    return NextResponse.json({ event });
  } catch (err) {
    const message = describeGoogleError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
