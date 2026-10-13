import { NextResponse } from "next/server";
import { escapeHtml, sendBusinessEmail } from "@/lib/email";
import { makeContactSchema, SERVER_CONTACT_MESSAGES } from "@/lib/schemas";

export async function POST(request: Request) {
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
