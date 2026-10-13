import { NextResponse } from "next/server";
import { createEvent, listEvents } from "@/lib/google-calendar";

/**
 * GET /api/calendar/events?from=2026-10-08&to=2026-10-15
 * Retourne la liste des événements du calendrier Info Liquidation Recycle
 * entre deux dates (ISO yyyy-mm-dd).
 *
 * Si from/to absents, par défaut : aujourd'hui → +30 jours.
 */
export async function GET(request: Request) {
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/calendar/events
 * Crée un événement Google Calendar.
 * Body JSON : { summary, description?, location?, start, end, attendees? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.summary || !body.start || !body.end) {
      return NextResponse.json({ error: "Missing summary / start / end" }, { status: 400 });
    }
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
