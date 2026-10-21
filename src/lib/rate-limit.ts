/**
 * Limiteur de débit en mémoire (fenêtre fixe, par clé).
 *
 * Sur Vercel, chaque instance serverless a sa propre mémoire : c'est une
 * première barrière contre le spam et le bruteforce, pas une garantie globale.
 * Pour une limite stricte, ajouter une règle « Rate Limit » dans Vercel Firewall.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();

  // Ménage occasionnel pour ne pas grossir indéfiniment
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Nombre d'événements enregistrés pour cette clé dans la fenêtre en cours (sans incrémenter). */
export function peek(key: string): { count: number; retryAfter: number } {
  const bucket = buckets.get(key);
  const now = Date.now();
  if (!bucket || bucket.resetAt <= now) return { count: 0, retryAfter: 0 };
  return { count: bucket.count, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
}

/** Enregistre un événement (ex. échec de connexion) dans une fenêtre fixe. */
export function record(key: string, windowMs: number): void {
  rateLimit(key, Number.MAX_SAFE_INTEGER, windowMs);
}

export function clear(key: string): void {
  buckets.delete(key);
}

/** IP du client (en-tête posé par Vercel / le proxy). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
