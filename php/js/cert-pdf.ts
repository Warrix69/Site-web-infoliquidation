/**
 * Certificat de destruction → PDF Lettre (8,5 × 11 po), dans le navigateur.
 * Chargé à la demande par l'admin (import('/assets/cert-pdf.js')) : aucun service externe,
 * le certificat affiché à l'écran est dessiné tel quel (mêmes polices, même mise en page).
 */
import { getFontEmbedCSS, toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";

const LARGEUR = 816; // 8,5 po × 96 px
const HAUTEUR = 1056; // 11 po × 96 px
const PIXELS_PAR_PX = 200 / 96; // 200 ppp : net à l'impression, PDF léger (≈ 0,5 Mo)

async function dessiner(noeud: HTMLElement): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const fontEmbedCSS = await getFontEmbedCSS(noeud);
  const options = { width: LARGEUR, height: HAUTEUR, backgroundColor: "#ffffff", fontEmbedCSS, style: { transform: "none" } };
  // Premier passage minuscule : Safari n'applique parfois les polices intégrées qu'au 2e rendu.
  await toCanvas(noeud, { ...options, pixelRatio: 0.1 });
  return toCanvas(noeud, { ...options, pixelRatio: PIXELS_PAR_PX });
}

/** @returns le PDF (Blob) et son contenu en base64 (pour l'envoi par courriel). */
export async function certificatPdf(noeud: HTMLElement, titre: string): Promise<{ blob: Blob; base64: string }> {
  const canvas = await dessiner(noeud);
  const image = canvas.toDataURL("image/jpeg", 0.9);
  const pdf = new jsPDF({ unit: "in", format: "letter", orientation: "portrait", compress: true });
  pdf.setProperties({ title: titre, author: "Info Liquidation Recycle", creator: "Info Liquidation Recycle" });
  pdf.addImage(image, "JPEG", 0, 0, 8.5, 11, undefined, "FAST");
  const blob = pdf.output("blob");
  const base64 = pdf.output("datauristring").split(",")[1] ?? "";
  return { blob, base64 };
}
