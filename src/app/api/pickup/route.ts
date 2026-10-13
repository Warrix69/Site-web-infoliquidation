import { NextResponse } from "next/server";
import { escapeHtml, sendBusinessEmail } from "@/lib/email";
import {
  makePickupSchema,
  QUANTITY_KEYS,
  SERVER_PICKUP_MESSAGES,
  totalItems
} from "@/lib/schemas";

const LABELS: Record<(typeof QUANTITY_KEYS)[number], string> = {
  towers: "Tours d'ordinateur",
  servers: "Serveurs",
  laptops: "Ordinateurs portables",
  tablets: "Tablettes",
  switches: "Switch",
  lcd: "Écrans LCD",
  deskPhones: "Téléphones de bureau",
  cellphones: "Cellulaires",
  printers: "Imprimantes",
  photocopiers: "Photocopieurs",
  audioVideo: "Systèmes Audio/Vidéo",
  ups: "UPS"
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = makePickupSchema(SERVER_PICKUP_MESSAGES).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const total = totalItems(data.quantities, data.extras);

  const rows = QUANTITY_KEYS.filter((key) => data.quantities[key] > 0)
    .map((key) => `<tr><td>${LABELS[key]}</td><td align="right">${data.quantities[key]}</td></tr>`)
    .join("");

  const extraRows = (data.extras ?? [])
    .filter((e) => e.name.trim() && e.quantity > 0)
    .map(
      (e) => `<tr><td>${escapeHtml(e.name)}</td><td align="right">${e.quantity}</td></tr>`
    )
    .join("");

  const html = `
    <h2>Nouvelle demande de ramassage</h2>
    <p>
      <strong>${data.title === "mr" ? "M." : "Mme"} ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</strong><br/>
      ${data.company ? `Compagnie : ${escapeHtml(data.company)}<br/>` : ""}
      Courriel : ${escapeHtml(data.email)}<br/>
      Téléphone : ${escapeHtml(data.phone)}<br/>
      Adresse : ${escapeHtml(data.address)}, ${escapeHtml(data.city)}, ${escapeHtml(data.postalCode)}
    </p>
    <h3>Quantités approximatives (total : ${total})</h3>
    <table border="1" cellpadding="6" cellspacing="0">${rows || "<tr><td>Aucune quantité indiquée</td></tr>"}</table>
    ${extraRows ? `<h3>Autres équipements</h3><table border="1" cellpadding="6" cellspacing="0">${extraRows}</table>` : ""}
    <p><strong>Certificat de destruction demandé :</strong> ${data.certificate === "yes" ? "Oui" : "Non"}</p>
  `;

  const sent = await sendBusinessEmail({
    subject: `Demande de ramassage — ${data.firstName} ${data.lastName} (${total} items)`,
    html,
    replyTo: data.email
  });

  if (!sent) {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
