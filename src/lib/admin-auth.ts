/**
 * Session admin : cookie signé HMAC-SHA256 (`<expiration>.<signature>`).
 * Web Crypto uniquement, donc utilisable dans le middleware (Edge) et les routes (Node).
 *
 * La clé de signature est dérivée de ADMIN_SESSION_SECRET (ou, à défaut, de
 * ADMIN_PASSWORD) : changer le mot de passe déconnecte toutes les sessions.
 */
export const ADMIN_COOKIE = "ilr_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 h
/** Cookie anti-CSRF du flow OAuth Google (auth-start → callback). */
export const OAUTH_STATE_COOKIE = "ilr_google_oauth_state";

const encoder = new TextEncoder();

function signingSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  return secret ? `ilr-admin-session|${secret}` : null;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  let hex = "";
  for (const b of sig) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** Comparaison à temps constant de deux chaînes (via HMAC pour égaliser les longueurs). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const k = Array.from(key, (x) => x.toString(16).padStart(2, "0")).join("");
  const [ha, hb] = await Promise.all([hmac(k, a), hmac(k, b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return false;
  const [okUser, okPass] = await Promise.all([safeEqual(username, user), safeEqual(password, pass)]);
  return okUser && okPass;
}

export async function createSessionToken(): Promise<string | null> {
  const secret = signingSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${exp}.${await hmac(secret, String(exp))}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const secret = signingSecret();
  if (!secret || !token) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig || !/^\d+$/.test(expStr)) return false;
  if (Number(expStr) < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, await hmac(secret, expStr));
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k !== name) continue;
    try {
      return decodeURIComponent(v.join("="));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Garde des routes API admin (en plus du middleware, par défense en profondeur).
 * Retourne une réponse 401/503 si la requête n'est pas authentifiée, sinon null.
 */
export async function requireAdmin(request: Request): Promise<Response | null> {
  if (!isAdminConfigured()) {
    return Response.json({ error: "Admin non configuré" }, { status: 503 });
  }
  if (await verifySessionToken(readCookie(request, ADMIN_COOKIE))) return null;
  return Response.json({ error: "Authentification requise" }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
