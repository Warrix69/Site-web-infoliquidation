import { NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * Callback de l'autorisation Google.
 * Reçoit le code d'autorisation, l'échange contre un refresh token,
 * puis affiche une page claire qui montre le token à copier dans .env.local.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return htmlPage(
      `<h1 style="color:#dc2626">Erreur d'autorisation</h1><p>${error}</p>
       <p><a href="/api/google/auth-start">Recommencer</a></p>`
    );
  }

  if (!code) {
    return htmlPage(`<h1>Code manquant</h1><p><a href="/api/google/auth-start">Démarrer l'autorisation</a></p>`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return htmlPage(`<h1 style="color:#dc2626">Config manquante</h1><p>GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET non définis dans .env.local</p>`);
  }

  const origin = url.origin;
  const redirectUri = `${origin}/api/google/callback`;
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return htmlPage(`
        <h1 style="color:#f59e0b">Pas de refresh token reçu</h1>
        <p>Google ne te donne un refresh token que la 1<sup>re</sup> fois que tu autorises l'app, OU quand tu passes <code>prompt=consent</code>.</p>
        <p>Va révoquer l'accès ici : <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a> → cherche <b>InfoLiquidationRecycle Dashboard</b> → <b>Supprimer l'accès</b></p>
        <p>Puis <a href="/api/google/auth-start">recommence</a>.</p>
      `);
    }

    // En local : on écrit directement le token dans .env.local (rien à copier-coller)
    if (process.env.NODE_ENV === "development") {
      const { readFile, writeFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const envPath = join(process.cwd(), ".env.local");
      const env = await readFile(envPath, "utf8");
      const line = `GOOGLE_REFRESH_TOKEN=${refreshToken}`;
      const next = /^GOOGLE_REFRESH_TOKEN=.*$/m.test(env)
        ? env.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line)
        : `${env.trimEnd()}\n${line}\n`;
      await writeFile(envPath, next, "utf8");
      return htmlPage(`
        <h1 style="color:#16a34a">✅ Nouveau token Google enregistré</h1>
        <p><code>GOOGLE_REFRESH_TOKEN</code> a été mis à jour dans <code>.env.local</code>.</p>
        <p>Tu peux fermer cette page et retourner sur <a href="/admin">/admin</a>.</p>
      `);
    }

    return htmlPage(`
      <h1 style="color:#16a34a">✅ Refresh token obtenu !</h1>
      <p>Copie cette valeur et colle-la dans <code>.env.local</code> à la place de la valeur actuelle de <code>GOOGLE_REFRESH_TOKEN</code> :</p>
      <pre style="background:#0a0a0a;color:#86efac;padding:16px;border-radius:8px;overflow-x:auto;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-all">GOOGLE_REFRESH_TOKEN=${refreshToken}</pre>
      <p>Puis redémarre le serveur Next.js et retourne sur <a href="/admin">/admin</a>.</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
      <details>
        <summary style="cursor:pointer">Détails techniques (debug)</summary>
        <pre style="background:#f4f4f5;padding:12px;border-radius:6px;overflow-x:auto;font-size:11px">${JSON.stringify(tokens, null, 2)}</pre>
      </details>
    `);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return htmlPage(`<h1 style="color:#dc2626">Échec de l'échange du code</h1><p>${message}</p><p><a href="/api/google/auth-start">Recommencer</a></p>`);
  }
}

function htmlPage(body: string) {
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Google OAuth</title>
<style>
  body { font: 15px -apple-system, system-ui, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #0a0a0a; line-height: 1.5; }
  code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 13px; }
  a { color: #16a34a; }
  h1 { font-size: 24px; margin-bottom: 12px; }
</style></head><body>${body}</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
