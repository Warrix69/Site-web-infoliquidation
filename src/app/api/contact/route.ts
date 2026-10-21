import { NextResponse } from "next/server";
import { escapeHtml, sendBusinessEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { makeContactSchema, SERVER_CONTACT_MESSAGES } from "@/lib/schemas";

export async function POST(request: Request) {
  // Anti-spam : 5 envois / 10 min par IP
  const limit = rateLimit(`contact:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  // Refuse les corps démesurés avant de parser
  if (Number(request.headers.get("content-length") ?? 0) > 64 * 1024) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = makeContactSchema(SERVER_CONTACT_MESSAGES).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const html = `
    <h2>Nouveau message du formulaire de contact</h2>
    <p>
      <strong>${escapeHtml(data.name)}</strong><br/>
      Courriel : ${escapeHtml(data.email)}<br/>
      ${data.phone ? `Téléphone : ${escapeHtml(data.phone)}<br/>` : ""}
    </p>
    <p>${escapeHtml(data.message).replaceAll("\n", "<br/>")}</p>
  `;

  const sent = await sendBusinessEmail({
    subject: `Message de contact — ${data.name}`,
    html,
    replyTo: data.email
  });

  if (!sent) {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
