import { NextResponse } from "next/server";
import { getCalendarClient, CALENDAR_ID, describeGoogleError } from "@/lib/google-calendar";

/**
 * PATCH /api/calendar/events/:id
 * Modifie un événement Google Calendar.
 * Body JSON (tous optionnels) :
 *   { summary, description, location, start, end, status }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const cal = getCalendarClient();

    const requestBody: Record<string, unknown> = {};
    if (body.summary !== undefined) requestBody.summary = body.summary;
    if (body.description !== undefined) requestBody.description = body.description;
    if (body.location !== undefined) requestBody.location = body.location;
    if (body.start) requestBody.start = { dateTime: new Date(body.start).toISOString() };
    if (body.end) requestBody.end = { dateTime: new Date(body.end).toISOString() };
    if (body.status) requestBody.status = body.status; // confirmed, tentative, cancelled

    const res = await cal.events.patch({
      calendarId: CALENDAR_ID,
      eventId: id,
      requestBody
    });

    return NextResponse.json({ event: res.data });
  } catch (err) {
    const message = describeGoogleError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/calendar/events/:id
 * Supprime un événement Google Calendar.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cal = getCalendarClient();
    await cal.events.delete({ calendarId: CALENDAR_ID, eventId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = describeGoogleError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
