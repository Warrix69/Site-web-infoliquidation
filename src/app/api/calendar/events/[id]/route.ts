import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getCalendarClient, CALENDAR_ID, describeGoogleError } from "@/lib/google-calendar";

const dateString = z.string().max(64).refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date");

const patchSchema = z.object({
  summary: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(8000).optional(),
  location: z.string().max(500).optional(),
  start: dateString.optional(),
  end: dateString.optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional()
});

const eventId = z.string().min(1).max(1024);

/**
 * PATCH /api/calendar/events/:id
 * Modifie un événement Google Calendar.
 * Body JSON (tous optionnels) :
 *   { summary, description, location, start, end, status }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const id = eventId.safeParse((await params).id);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const body = parsed.data;
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
      eventId: id.data,
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
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const id = eventId.safeParse((await params).id);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const cal = getCalendarClient();
    await cal.events.delete({ calendarId: CALENDAR_ID, eventId: id.data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = describeGoogleError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
