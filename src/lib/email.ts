import { Resend } from "resend";
import { SITE } from "./site";

type SendArgs = {
  subject: string;
  html: string;
  replyTo?: string;
};

/**
 * Envoie un courriel à info@infoliquidationrecycle.com via Resend.
 *
 * TODO: configurer la clé RESEND_API_KEY dans `.env` (voir `.env.example`) et
 * vérifier le domaine expéditeur dans le tableau de bord Resend
 * (https://resend.com/domains). Tant que la clé est absente, la soumission est
 * journalisée côté serveur et le succès est retourné au client.
 */
export async function sendBusinessEmail({ subject, html, replyTo }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[infoliquidation] RESEND_API_KEY absente — courriel non envoyé.\n` +
        `Sujet : ${subject}\nRéponse à : ${replyTo ?? "n/d"}\nContenu :\n${html}`
    );
    return true;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Info Liquidation Recycle <onboarding@resend.dev>",
    to: [SITE.email],
    subject,
    html,
    replyTo
  });

  if (error) {
    console.error("[infoliquidation] Erreur Resend :", error);
    return false;
  }
  return true;
}

/** Échappe le HTML des valeurs saisies par l'utilisateur. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
