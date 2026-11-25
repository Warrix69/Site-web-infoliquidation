# Security audit findings — PHP version

Date: 2026-11-25 · branch `securite-prelancement` · HEAD `6d5495d` · read-only audit (no application code changed).
Companion document: `SECURITY_MAP.md` (stack, data stores, every entry point, env vars).
Paths below are relative to `php/` unless they start with `public/admin/…` at repo root (the admin front-end sources; identical copies live in `php/public/admin/`).

## Summary

No Critical or High finding. The core controls are sound: every admin endpoint checks the session server-side (front controller **and** inside each handler), the session cookie is HMAC-signed with a 64-char secret and compared in constant time, all routes/includes are whitelisted, public views escape everything, JSON-LD is `</script>`-safe, emails escape user input, and the admin dashboard escapes Google Calendar / eBay data before `innerHTML`.

| ID | Severity | Title | Location |
|---|---|---|---|
| F-01 | Medium | Missing `RESEND_API_KEY` → forms report success, leads silently lost, customer PII written to the PHP log | `app/lib/mailer.php:16-22` |
| F-02 | Medium | PHP `error_log` file likely written inside the web root and not covered by the `.htaccess` deny rule | `public/.htaccess:7` |
| F-03 | Medium | No deny-all guard outside `public/`; a cPanel misdeploy exposes `.env`; documented alternative layout breaks `PUBLIC_DIR` | `app/bootstrap.php:7-8`, `README.md` step 2 |
| F-04 | Low | Session tokens cannot be revoked (logout only deletes the cookie), 8 h absolute, no `__Host-` prefix | `app/lib/admin_auth.php:50-68,110-132` |
| F-05 | Low | Login throttling keyed on exact IP only (IPv6 / botnet rotation), no global cap, small race | `app/api/admin/login.php:31-71` |
| F-06 | Low | Rate-limit storage can be flooded (one file per IP), fails open when `storage/` is not writable | `app/lib/rate_limit.php:22-56`, `login.php:35` |
| F-07 | Low | CSRF protection relies only on `SameSite=Lax`; no Origin / Content-Type check; logout via GET | `app/lib/validation.php:47-57`, `app/api/admin/logout.php:10` |
| F-08 | Low | CSP has no `script-src`/`default-src`; headers only on PHP responses; no COOP | `public/index.php:10-16` |
| F-09 | Low | Admin HTML lives in the web root; served without auth if rewrite is inactive (and by `php -S`) | `public/.htaccess:11,21`, `public/index.php:22-24` |
| F-10 | Low | Raw upstream (eBay / Google) error text returned to the admin client | `app/api/ebay/summary.php:23`, `app/lib/google_calendar.php:142,199` |
| F-11 | Low | `Host` and `X-Forwarded-Proto` trusted for OAuth `redirect_uri`, cookie `Secure` flag and the HTTPS redirect | `app/lib/admin_auth.php:98-104,135-143`, `public/.htaccess:16-18` |
| F-12 | Low | Event id `..` / `.` collapses (curl dot-segment normalisation) onto the calendar resource itself | `public/index.php:35`, `app/api/calendar/event.php:26`, `app/lib/google_calendar.php:156` |
| F-13 | Low | No security event logging (login success/failure, lockouts, calendar writes, OAuth) | `app/api/admin/login.php:60-74`, `app/api/calendar/*.php` |
| F-14 | Low | `ADMIN_SESSION_SECRET` falls back to `ADMIN_PASSWORD`, no minimum length; password stored in plain text | `app/lib/admin_auth.php:18` |
| F-15 | Low | 64 KB body limit only checks `Content-Length` (chunked bypass, verified) | `app/api/contact.php:18`, `app/api/pickup.php:33` |
| F-16 | Low | Dashboard defence-in-depth gaps (raw interpolations, `esc()` inside JS-in-attribute); not exploitable today | `public/admin/dashboard.html:1360,1511,1535,1949,1961,2039-2042` |
| F-17 | Low | Third-party runtime resources (Google Fonts, raw.githack.com HDR) with no CSP/SRI; Loi 25 IP transfer | `app/views/layout.php:12-14`, `public/admin/*.html:10-12` |
| F-18 | Low | `TRUST_PROXY=1` would trust the left-most `X-Forwarded-For` and unverified CF header | `app/lib/http.php:39-42` |
| F-19 | Info | Email subject built from raw names (CR/LF not stripped) — no header injection via Resend JSON API | `app/api/contact.php:47`, `app/api/pickup.php:83` |
| F-20 | Info | Google refresh token displayed in an HTML page during OAuth setup | `app/api/google/callback.php:100` |
| F-21 | Info | Unused secrets in `.env` (`EBAY_DEV_ID`, `EBAY_RUNAME`), dead `json_body()`, `perf-audit/` uploaded by README step 1 | `app/lib/http.php:15`, `README.md` step 1 |
| F-22 | Info | Pickup "minimum 10 items" not enforced server-side (documented) | `app/lib/validation.php:9-10` |

---

## Findings

### F-01 — Missing `RESEND_API_KEY`: success returned, lead lost, PII logged
- **Severity**: Medium (business-critical fail-open + privacy). **Confidence**: High for the code path; the local `php/.env` has **no** `RESEND_API_KEY` and no `RESEND_FROM` (names checked, values not read). Production `.env` not seen.
- **Code** (`app/lib/mailer.php:14-22`):
  ```php
  $apiKey = env('RESEND_API_KEY');
  if (!$apiKey) {
      error_log(
          "[infoliquidation] RESEND_API_KEY absente — courriel non envoyé.\n"
          . "Sujet : $subject\nRéponse à : " . ($replyTo ?? 'n/d') . "\nContenu :\n$html"
      );
      return true;
  }
  ```
  and `app/lib/mailer.php:25`: `'from' => env('RESEND_FROM', 'Info Liquidation Recycle <onboarding@resend.dev>')`.
- **What happens**: if the production `.env` is copied from the current local one, every pickup/contact submission returns `{ok:true}` and the visitor sees the thank-you page, but no email is sent; the full message (name, email, phone, address, items) is written to the PHP error log. Combined with F-02, that log may be downloadable. With `RESEND_FROM` unset, Resend's `onboarding@resend.dev` sender only delivers to the Resend account owner, so mail may also fail (logged, 502).
- **Fix (smallest)**: set `RESEND_API_KEY` and a verified `RESEND_FROM` in production; in code, when the key is missing outside the dev server, log only `"RESEND_API_KEY absente"` (no `$html`) and `return PHP_SAPI === 'cli-server';` so production returns 502 instead of a fake success.

### F-02 — PHP `error_log` likely inside the web root, not denied
- **Severity**: Medium (conditional on host config). **Confidence**: Medium.
- **Code** (`public/.htaccess:7`):
  ```apache
  <FilesMatch "(^\.|\.(env|ini|log|sh|sql|bak|old|swp|md|json\.example)$|^composer\.(json|lock)$)">
  ```
  The cPanel default PHP setting `error_log = error_log` writes a file literally named `error_log` (no extension) in the directory of the executing script, i.e. `php/public/error_log`. `\.log$` does not match `error_log`. Archives (`.zip`, `.tar.gz`), `~`, `.orig`, `.save` are also not denied.
- **Exploit**: `GET https://infoliquidationrecycle.com/error_log` → if the host's global Apache config does not already block it, the attacker downloads the log: visitor IPs of blocked senders (`rate_limit.php:152`), eBay/Google error text, PHP warnings with absolute paths, and, with F-01, full customer submissions.
- **Fix**: add `|^error_log$|\.(zip|tar|gz|tgz|7z|rar|orig|save|dist)$|~$` to the FilesMatch; and set `error_log = /home/<user>/logs/php_errors.log` (outside `public_html`) in cPanel → MultiPHP INI Editor.

### F-03 — No guard outside `public/`; misdeploy exposes `.env`; alternative layout broken
- **Severity**: Medium (conditional on deployment). **Confidence**: Medium.
- **Code**: only `public/.htaccess` and `storage/.htaccess` exist; there is no `.htaccess` in `php/` or `php/app/`. `app/bootstrap.php:6-9`:
  ```php
  define('APP_DIR', __DIR__);
  define('ROOT_DIR', dirname(__DIR__));
  define('PUBLIC_DIR', ROOT_DIR . '/public');
  define('STORAGE_DIR', ROOT_DIR . '/storage');
  ```
  README step 2: « Faire pointer la racine web du domaine sur `php/public/` (ou copier le contenu de `public/` dans `public_html/` et `app/`, `storage/`, `.env` un niveau au-dessus) ».
- **Exploit**: on cPanel the primary domain's docroot is normally fixed to `public_html/`. If the owner uploads the whole `php/` folder into `public_html/` (and, say, adds a rewrite to `php/public`), then `GET /php/.env` is served as plain text (no deny rule applies outside `php/public/`) → all secrets (admin password, session secret, Google/eBay refresh tokens). `GET /php/app/messages/fr.json`, `/php/README.md`, `/php/perf-audit/…` are also readable. With the documented alternative layout, security is fine but `PUBLIC_DIR` resolves to `/home/<user>/public` (non-existent): `readfile(PUBLIC_DIR . '/admin/login.html')` (`public/index.php:59,69`) fails, so login/dashboard are blank and, if `display_errors` is on, warnings disclose absolute paths.
- **Fix**: (1) add `php/.htaccess` and `php/app/.htaccess` containing `Require all denied`, and add `Require all granted` as the first directive of `public/.htaccess` (cPanel's `AllowOverride All` makes Apache read parent `.htaccess` files; the deeper `Require` wins; the FilesMatch deny still applies). (2) In `public/index.php`, `define('PUBLIC_DIR', __DIR__);` before the `require`, and in `bootstrap.php` use `defined('PUBLIC_DIR') || define('PUBLIC_DIR', ROOT_DIR . '/public');`. (3) README: state explicitly that `php/` must never sit inside `public_html` without step (1).

### F-04 — Sessions not revocable; logout only clears the cookie
- **Severity**: Low. **Confidence**: High.
- **Code**: token = `exp . '.' . hmac(exp)` (`app/lib/admin_auth.php:54-55`), verification only checks HMAC and expiry (`:58-68`); logout `admin_clear_session_cookie()` (`app/api/admin/logout.php:16`) only sends an expired cookie. TTL `60 * 60 * 8` (`:12`), no idle timeout. Cookie name `ilr_admin` (no `__Host-` prefix), `'secure' => admin_is_https()` (`:117`).
- **Exploit**: a cookie copied from the admin's browser (shared PC, malware, synced profile, future XSS) stays valid for up to 8 h even after the admin clicks "logout". The only kill switch is rotating `ADMIN_SESSION_SECRET` on the server.
- **Fix**: store a `sessions_valid_after` timestamp in `storage/` (logout writes `time()`); include the issue time in the token (`iat.exp.sig`) and reject tokens with `iat` older than that value. Rename the cookie `__Host-ilr_admin` and always set `Secure` in production. Optionally 2 h idle timeout (re-issue cookie on activity).

### F-05 — Login throttling per exact IP only
- **Severity**: Low (Medium if the admin password is not long and random). **Confidence**: High.
- **Code** (`app/api/admin/login.php:31-37,60-62`):
  ```php
  $ip = client_ip();
  $burstKey = "login-fail-15m:$ip";
  $dailyKey = "login-fail-24h:$ip";
  $requests = rate_limit("login-req:$ip", …);
  $burst = rate_peek($burstKey);
  $daily = rate_peek($dailyKey);
  …
  if (!admin_verify_credentials($username, $password)) {
      rate_record($burstKey, …);
      rate_record($dailyKey, …);
  ```
- **Exploit**: (a) an attacker with an IPv6 /64 (or a botnet) rotates the source address; each address gets 5 guesses / 15 min and 20 / day, so total guessing is unbounded. (b) Check-then-record race: N parallel requests all pass `rate_peek` before any failure is recorded, so one IP gets up to 30 guesses (bounded by the atomic `login-req` limiter) instead of 5 before the daily block. There is no global counter and no alert. Local password length is 16 characters (README recommends 20+).
- **Fix**: normalise IPv6 to its /64 in `client_ip()` for rate-limit keys; add a global failure bucket (e.g. 50 failures / hour across all IPs → refuse logins 15 min and `error_log` it); use a random 20+ char password; consider TOTP 2FA later.

### F-06 — Rate-limit storage can be flooded; fails open
- **Severity**: Low. **Confidence**: Medium.
- **Code**: one file per key (`app/lib/rate_limit.php:22-25` `hash('sha256', $key) . '.json'`), created on every login POST before any check (`login.php:35`); GC only 1 request in 200, only files older than 25 h, by globbing the whole directory (`rate_limit.php:28-38`); on any write error the limiter lets everything through (`:48-56` `return $fn(null)[1];`).
- **Exploit**: many source IPs (trivial with IPv6) × `POST /api/admin/login` → hundreds of thousands of files in `storage/ratelimit/` within 25 h → cPanel inode/disk quota exhausted (site can no longer write tokens; account may be suspended), and each GC run globs the huge directory. If `storage/` is not writable after upload, all limits are silently disabled (only `error_log`).
- **Fix**: IPv6 /64 bucketing (same as F-05); skip creating new files when the directory already holds more than ~20 000 entries (fail closed for login, open for forms); run GC more often (e.g. 1/50) with a time budget. Verify `storage/` is writable after deploy (host check H-9).

### F-07 — CSRF relies only on `SameSite=Lax`
- **Severity**: Low. **Confidence**: High (mechanism).
- **Code**: admin JSON endpoints parse any body regardless of `Content-Type` (`app/lib/validation.php:47-57` `read_json_input()` reads `php://input`); no `Origin` / `Sec-Fetch-Site` check anywhere. Logout accepts GET (`app/api/admin/logout.php:10` `if ($method !== 'GET' && $method !== 'POST')`).
- **Exploit**: cross-site attacks are blocked today because the cookie is `SameSite=Lax` (not sent on cross-site POST/fetch) and PATCH/DELETE need a CORS preflight that is never granted. But any **same-site** origin (another `*.infoliquidationrecycle.com` subdomain, e.g. a leftover WordPress or cPanel webmail XSS) can run `fetch('https://infoliquidationrecycle.com/api/calendar/events',{method:'POST',credentials:'include',headers:{'Content-Type':'text/plain'},body:'{"summary":"x","start":"2026-12-01T10:00","end":"2026-12-01T11:00","attendees":["victim@example.com"]}'})` → event created with invitations. Any site can log the admin out with a top-level link to `/api/admin/logout`.
- **Fix**: in `admin_require_api()`, for non-GET methods require `Content-Type: application/json` and `Origin` equal to `SITE_URL`'s origin (or `Sec-Fetch-Site: same-origin`); make logout POST-only (the dashboard already uses a form/JS).

### F-08 — Weak CSP, headers only on PHP responses, no COOP
- **Severity**: Low (defence in depth). **Confidence**: High.
- **Code** (`public/index.php:15`):
  ```php
  header("Content-Security-Policy: base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'");
  ```
  No `default-src`/`script-src`/`connect-src`; no `Cross-Origin-Opener-Policy`. Static files (assets, images) are served by Apache without `nosniff` etc. (`public/.htaccess` only sets `Cache-Control`).
- **Impact**: no second layer if an escaping mistake is introduced in the dashboard (~60 `innerHTML` sinks) → full admin session takeover (calendar write, eBay finance data).
- **Fix**: for `/admin*` responses add `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'` (inline handlers force `'unsafe-inline'` until refactored) and `Cross-Origin-Opener-Policy: same-origin`. Move the static headers to `.htaccess` with `Header always set` so static files get them too.

### F-09 — Admin HTML inside the web root
- **Severity**: Low. **Confidence**: High.
- **Code**: protection depends on rewrite: `public/.htaccess:11` `<IfModule mod_rewrite.c>` and `:21` `RewriteRule ^admin/(dashboard|login)\.html$ index.php [L]`. Dev server: `public/index.php:22-24` returns `false` for any existing file → verified `GET /admin/dashboard.html` → 200, 249 643 bytes on `php -S`.
- **Exploit**: on a host where `mod_rewrite` is missing or `.htaccess` overrides are restricted, the `IfModule` block is skipped silently and `GET /admin/dashboard.html` returns the full admin UI without login. No data leaks (APIs still return 401) but it discloses internal tooling, demo/seed data, depot address and API map. (With `AcceptPathInfo On`, `/admin/dashboard.html/x` could also bypass — see H-3.)
- **Fix**: move `dashboard.html` and `login.html` to `app/views/admin/` (adjust `build.mjs` copy and the two `readfile()` calls); keep only images in `public/admin/`.

### F-10 — Upstream errors returned verbatim to the admin
- **Severity**: Low (admin-only). **Confidence**: High.
- **Code**: `app/api/ebay/summary.php:23` `json_response(['error' => mb_scrub($err->getMessage() …)], 500);` where messages contain full eBay JSON error bodies (`app/lib/ebay.php:151,208`); `app/lib/google_calendar.php:142` `'request to ' . $url . ' failed, reason: '` (URL contains the calendar id) and `:199` `return mb_scrub($message, 'UTF-8');`; `app/api/google/callback.php:81` echoes the token-exchange error (escaped).
- **Impact**: only an authenticated admin sees them; useful to an attacker only after an admin compromise. Keeps internal identifiers and API details in client-visible responses.
- **Fix**: `error_log()` the full message server-side and return a short generic message (keep the two friendly `invalid_grant` / `invalid_client` mappings).

### F-11 — `Host` / `X-Forwarded-Proto` trusted
- **Severity**: Low. **Confidence**: High.
- **Code**: `app/lib/admin_auth.php:102` `$proto = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));` (not gated by `TRUST_PROXY`); `:138` `$host = (string) ($_SERVER['HTTP_HOST'] ?? '');` → `app/api/google/auth-start.php:26` / `callback.php:69` `$redirectUri = request_origin() . '/api/google/callback';`; `public/.htaccess:16-18` skips the redirect on `X-Forwarded-Proto: https` and redirects to `https://%{HTTP_HOST}%{REQUEST_URI}`.
- **Exploit**: limited. Google only accepts registered redirect URIs, so a forged Host cannot steal the code. A plain-HTTP client sending `X-Forwarded-Proto: https` is not redirected and its cookie is marked `Secure` (affects only that client). The 301 reflects the `Host` header, which matters only if a shared cache sits in front.
- **Fix**: build `redirect_uri` from `SITE_URL`; only honour `X-Forwarded-Proto` when `TRUST_PROXY=1`; in `.htaccess` redirect to the fixed canonical host (`https://infoliquidationrecycle.com%{REQUEST_URI}`), which also canonicalises `www`.

### F-12 — Event id `..` reaches the calendar resource
- **Severity**: Low (admin-only). **Confidence**: High that curl collapses the path (verified: PHP curl 8.23 requested `/` for `http://127.0.0.1:8091/contact/..`); Low that Google accepts the resulting trailing-slash path.
- **Code**: `public/index.php:35` allows dots-only ids: `preg_match('#^calendar/events/[A-Za-z0-9_@.\-]+$#', $apiPath)`; `app/api/calendar/event.php:26` only checks length; `app/lib/google_calendar.php:156` `$p . '/' . rawurlencode($eventId)` (`rawurlencode('..') === '..'`).
- **Exploit**: with an admin session (or via an XSS / same-site CSRF, F-07): `DELETE /api/calendar/events/..` → server sends `DELETE https://www.googleapis.com/calendar/v3/calendars/<GOOGLE_CALENDAR_ID>/` (calendars.delete, deletes a secondary calendar) and `PATCH …/..` → calendars.patch (rename/describe the calendar). `.` targets the events collection.
- **Fix**: in `event.php`, `$idValid = … && preg_match('/^[A-Za-z0-9_@\-][A-Za-z0-9_@.\-]*$/D', $eventId) === 1;` (or `^[a-v0-9_]{5,1024}$`, Google's id alphabet).

### F-13 — No security event logging
- **Severity**: Low. **Confidence**: High.
- **Code**: `app/api/admin/login.php:60-74` records failures only in rate-limit files; nothing is logged on failure, lockout (`:47-50`), success or logout; calendar POST/PATCH/DELETE and OAuth completion are not logged. Existing logs: form block (`rate_limit.php:152`), honeypot (`:176`), Resend/eBay errors. No secrets are logged (passwords are never logged; Resend error body ≤ 1000 chars does not contain the key).
- **Impact**: a brute-force campaign or a stolen session using the calendar would leave no trace.
- **Fix**: `error_log('[security] login_fail ip=' . $ip)`, `login_blocked`, `login_ok`, `logout`, `calendar_create|update|delete id=…`, `google_oauth_ok` — never log the password, cookie or tokens.

### F-14 — Session secret fallback, plain-text password
- **Severity**: Low (mitigated: local `ADMIN_SESSION_SECRET` is set, 64 chars). **Confidence**: High.
- **Code** (`app/lib/admin_auth.php:18`): `$secret = env('ADMIN_SESSION_SECRET') ?? env('ADMIN_PASSWORD');`
- **Exploit**: if a future `.env` omits the secret, any single captured cookie (`<exp>.<hmac>`) lets an attacker brute-force the admin password offline at HMAC-SHA256 speed, then forge sessions. A short secret (no length check) is equally weak. `ADMIN_PASSWORD` is stored and compared in plain text (constant-time, so fine for timing; but any `.env` leak reveals a password that may be reused elsewhere).
- **Fix**: fail closed (treat admin as not configured) when `ADMIN_SESSION_SECRET` is missing or shorter than 32 chars; optionally replace `ADMIN_PASSWORD` by `ADMIN_PASSWORD_HASH` (`password_hash(…, PASSWORD_ARGON2ID)` + `password_verify`).

### F-15 — Body size limit bypassable
- **Severity**: Low. **Confidence**: High on `php -S` (verified: 70 KB body with `Transfer-Encoding: chunked` → 400 after parsing instead of 413); Apache/FPM behaviour depends on host.
- **Code**: `app/api/contact.php:18` / `app/api/pickup.php:33` `if (request_content_length() > 64 * 1024)`; `app/lib/validation.php:62-63` returns 0 when the header is absent; `read_json_input()` reads the whole body. Admin JSON endpoints have no limit.
- **Fix**: `$raw = file_get_contents('php://input', false, null, 0, 65537); if (strlen($raw) > 65536) → 413` inside `read_json_input()`; keep `post_max_size` modest on the host.

### F-16 — Dashboard defence-in-depth gaps (no exploitable XSS found)
- **Severity**: Low. **Confidence**: High that none is exploitable with current data sources.
- **Code** (`public/admin/dashboard.html`):
  - `:1360` `const tag=n.url?\`<a href="${n.url}" …` (unescaped href; `n.url` = server-built `https://www.ebay.ca/itm/<legacyItemId>`, also persisted in `localStorage`).
  - `:1504` / `:1534` `ini=(p.clientName||'?').split(' ').map(w=>w[0]).join('').slice(0,2)`, rendered raw at `:1511` / `:1535` as `…>${ini}</div>` (2 raw chars of a calendar-controlled name; cannot form a tag with attributes).
  - `:1949` `` `<a href="tel:${c.phone}" …` `` (admin-entered value only).
  - `:1961` `` onclick="closeClientModal();openPickupDetail('${p.id}')" `` and `:2039-2042` `pid=esc(p.id)` → `` onclick="setPickupStatus('${pid}','confirmed')" `` — `esc()` turns `'` into `&#39;`, which the HTML parser decodes back to `'` before the JS runs, so `esc()` is the wrong encoder in this context. Not exploitable because Google event ids are restricted to base32hex characters.
- **Fix**: wrap `ini`, `n.url` (via `safeUrl()`), `c.phone` in `esc()`; replace inline `onclick="…('${id}')"` with `data-id="${esc(id)}"` + `addEventListener`.

### F-17 — Third-party runtime resources
- **Severity**: Low. **Confidence**: High.
- **Code**: `app/views/layout.php:12-14`, `public/admin/login.html:10-12`, `public/admin/dashboard.html:10-12` load `https://fonts.googleapis.com/css2?…`; the 3D hero bundle fetches HDR files from `https://raw.githack.com/pmndrs/drei-assets/…` (`public/assets/chunks/HeroDevices-*.js`, from `<Environment preset=…>` in `src/components/home/HeroScene.tsx:49`, `HeroLaptop.tsx:33`).
- **Impact**: availability/integrity depends on third parties (data files, not scripts); every visitor's IP goes to Google and githack before any consent (Loi 25 transparency; the cookie banner only covers cookies). Prevents a tight CSP (F-08).
- **Fix**: self-host the fonts (`@font-face` in `css/app.css`) and the two HDR files (drei `files="/models/…hdr"`).

### F-18 — `TRUST_PROXY=1` would make the IP spoofable
- **Severity**: Low (conditional; currently not set — verified a spoofed `X-Forwarded-For` did not bypass the lockout). **Confidence**: High.
- **Code** (`app/lib/http.php:39-42`):
  ```php
  if (env('TRUST_PROXY') === '1') {
      foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP'] as $h) {
          if (!empty($_SERVER[$h])) return trim(explode(',', $_SERVER[$h])[0]);
  ```
- **Exploit**: if enabled, a client that reaches the origin directly (or through a proxy that appends rather than overwrites) sends `CF-Connecting-IP: <random>` / `X-Forwarded-For: <random>` on each request → unlimited login attempts and form sends.
- **Fix**: only trust these headers when `REMOTE_ADDR` is in a configured proxy CIDR list (e.g. Cloudflare ranges), and take the right-most untrusted `X-Forwarded-For` entry.

### F-19 — Email subject from raw names (Info)
- `app/api/contact.php:47` `"Message de contact — {$data['name']}"`, `app/api/pickup.php:83` (first/last name). Names may contain CR/LF/tab. Sent as a JSON field to Resend's API, so no SMTP header injection is possible from this code; worst case Resend rejects the request (502, lead lost) or the subject is misleading. Fix: `preg_replace('/[\r\n\t]+/', ' ', …)` and truncate to ~150 chars. Body HTML is fully escaped (`escape_html`, `app/lib/mailer.php:58-67`).

### F-20 — Refresh token displayed in the browser (Info)
- `app/api/google/callback.php:100` prints `GOOGLE_REFRESH_TOKEN=<token>` (escaped, `Cache-Control: no-store`, admin-only). Acceptable for one-time setup; it stays in the tab/session-restore. Alternative: write it to `storage/google_refresh_token.json` (0600) and read it from there.

### F-21 — Unused secrets and dead code (Info)
- `EBAY_DEV_ID`, `EBAY_RUNAME` are set in `.env` but never read (remove from the server copy). `json_body()` (`app/lib/http.php:15-21`) is unused. README step 1 uploads everything in `php/` except `js/ css/ tools/ build.mjs`, so the untracked `perf-audit/` folder (Lighthouse JSON, scripts), `README.md`, `CONVENTIONS.md` and both `SECURITY_*.md` go to the server; harmless outside the web root, but exclude them.

### F-22 — Minimum 10 items not enforced server-side (Info)
- Documented in `app/lib/validation.php:9-10`; a direct API call can submit 0 items. Business-rule gap only (`total_items()` is shown in the email subject so staff can spot it).

---

## Checked and found OK (evidence)

**01 Auth / identity / OAuth / redirects**
- Front-controller guard for `ebay|calendar|google` (`public/index.php:38-41`) **and** in-handler `admin_require_api()` (`calendar/events.php:22`, `calendar/event.php:23`, `ebay/summary.php:18`, `google/auth-start.php:18`, `google/callback.php:20`). Verified: all 9 admin API calls (GET/POST/PATCH-route/DELETE, `..` id, OAuth start/callback, forged cookie `9999999999.deadbeef`) → 401 JSON.
- Admin pages: `!admin_is_configured() || !admin_is_authed()` → 307 (`index.php:66`); verified `/admin`, `/en/admin/`, `/admin/foo` → 307 `/admin/login`.
- Fail closed when not configured (503 / redirect) (`admin_auth.php:87-95`). Identity never taken from the client (single admin, no user id in requests).
- Generic login errors: every failure → `?e=1` (`login.php:55,67`), page shows fixed text via `textContent` (`public/admin/login.html:187-196`). No username enumeration (both comparisons always executed, `admin_auth.php:44-47`).
- OAuth `state`: 24 random bytes (`auth-start.php:29`), `HttpOnly; SameSite=Lax; Path=/api/google`, 10 min (`:44-50`), constant-time compare, cleared on every callback page (`callback.php:24,57`). Exact redirect URI enforced by Google (see F-11 for its origin).
- Open redirects: none. No `?next`/`?redirect` parameter anywhere; login/logout redirect to fixed relative paths; trailing-slash redirect keeps a relative path (verified `//evil.com/x/` → `Location: /x`, `/%2F%2Fevil.com/` → `/%2F%2Fevil.com`, raw `/\evil.com/` → `/evil.com`); `header()` rejects CR/LF.

**04 HTTPS**: forced redirect (`public/.htaccess:15-18`); HSTS 2 years + includeSubDomains (`index.php:10`); no `http://` URLs in PHP/JS other than XML/SVG namespace URIs; session cookie `Secure` whenever the request is HTTPS (`admin_auth.php:117`).

**05 Password handling**: constant-time comparison with per-call random HMAC key (`admin_auth.php:33-37`); password never logged; input truncated to 200 chars (`login.php:57-58`).

**06 Validation**: public forms validated server-side for type, length, enum, regex, integer range, array size (`app/lib/validation.php:239-346`); unknown fields are ignored and never used; invalid/non-object/too-deep JSON → clean 400 (verified); 64 KB `Content-Length` cap → 413 (verified, see F-15); calendar inputs validated with lengths, enum `status`, ≤20 attendee emails, date range ≤ 400 days (`calendar/events.php:74-133`, `calendar/event.php:29-60`).

**07 XSS**
- Views: every dynamic echo uses `e()` / `te()` or helpers that escape; the only raw `<?=` values are code constants (`$c['badge']` = `e($initials)` or an icon, `$chip`, `$v[0..3]`, `$logoW`, `$dot`, `$l`) — reviewed in `contact.php:39-62`, `home.php:107-108`, `ville.php:25-28`, `header.php:24-50`, `footer.php:71-75`, `lang-switcher.php:6-8`. Request input never reaches views except whitelisted `ville`/`slug`; `data-params` is `e(json_encode(…))` (`layout.php:5`); `$head` is never set by any view.
- JSON-LD and island props: `JSON_HEX_TAG` (`app/lib/view.php:169`, `:91` + `JSON_HEX_AMP`) → `</script>` breakout impossible.
- `php/js/`: no `innerHTML`/`insertAdjacentHTML`/`document.write`/`eval`; only `window.location.href = getPathname(…)` with internal routes (`js/shims/i18n-navigation.tsx:51,63`).
- Dashboard (stored XSS via Google Calendar invitations / eBay data): `esc()` (`dashboard.html:1739`) escapes `& < > " '` and is applied to every calendar/eBay string in HTML/attribute context (e.g. `:1586`, `:1600`, `:1681`, `:1785`, `:1808`, `:1815`, `:1834`, `:1857`, `:1915`, `:2025`, `:2049`); `safeUrl()` allows only `http(s)` (`:1668`); toasts, calendar month cells and login errors use `textContent` (`:1323`, `:1757`, `login.html:196`); notification title/subtitle escape `<` (`:1358`). Numbers come from the server as numbers (`ebay_num`). Residual hygiene issues in F-16.
- Email HTML: every user field passes `escape_html()` (`pickup.php:64-80`, `contact.php:37-44`); quantities are validated integers. No SMTP: Resend JSON API, `reply_to` = validated email (F-19 for subject).

**08 Logging**: no secrets in logs (passwords, cookies, tokens never logged; OAuth error messages exclude request parameters, `google_calendar.php:46-55`). Gaps in F-13, PII in F-01.

**09 Admin surface**: all admin pages/APIs checked server-side (above); `Cache-Control: no-store` + `noindex` on admin pages (`index.php:56-57,64-65`); no debug/test routes (`phpinfo`, `var_dump`, `print_r`, test endpoints: none found).

**10 Injection**: no `exec/shell_exec/system/passthru/popen/proc_open/eval/assert/unserialize/create_function/mail()` (grep). Includes: API file path restricted to `[a-z0-9\-/]+` (no dots → no traversal) (`index.php:36,48`); page views from constant `ROUTE_VIEWS` (`index.php:101`); `render()` only receives literal view names (`view.php:10-16`); messages file from locale whitelist (`i18n.php:15,27`). Verified `/api/contact.php`, `/api/../app/lib/env` → 404. eBay XML parsed with a regex, no XML parser → no XXE (`ebay.php:220-224`). `extract($vars, EXTR_SKIP)` only on code-built arrays.

**11 Env**: `.env` loader does not override real environment variables (`env.php:19`); admin missing → fail closed; Google/eBay missing → clear 500 error; `SITE_URL` default is the production URL. Issues: F-01, F-14.

**12 Rate limiting**: counter update under `flock(LOCK_EX)` with read-modify-write in the same handle (`rate_limit.php:58-78`); SHA-256 file names (no collision / traversal); IP = `REMOTE_ADDR` unless `TRUST_PROXY=1` (verified spoofed XFF still blocked); lockout verified (5 failures → `?e=rate&m=15`; correct password refused while blocked by design, `login.php:38-50`); forms count only valid sends, block 1 h (`rate_limit.php:142-155`). Calendar writes not limited: admin-only, acceptable. Issues: F-05, F-06, F-18.

**13 CORS**: no `Access-Control-*` header anywhere (grep); `OPTIONS /api/contact` with a foreign `Origin` → 405 without CORS headers (verified).

**14 Headers (verified on `/` and `/api/ebay/summary`)**: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, CSP (`base-uri`, `object-src`, `frame-ancestors`, `form-action`), `X-Powered-By` removed, `Cache-Control: no-store` on JSON (`http.php:8`) and admin pages, `X-Robots-Tag: noindex` on API/admin. Gaps in F-08.

**15 Cookie**: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` on HTTPS, 8 h expiry checked server-side from the signed value (not only the browser expiry) (`admin_auth.php:58-68,110-122`). Gaps in F-04.

**16 CSRF**: login CSRF is harmless (attacker needs the credentials); OAuth protected by `state`; PATCH/DELETE require a preflight that is never granted; `SameSite=Lax` blocks cross-site POST. Gaps in F-07.

**17 Emailed links / tokens — N/A**: no password reset, magic link, confirmation or visitor-facing email; emails go only to the business address and contain no tokens.

**18 Uploads — N/A**: no `$_FILES`, `move_uploaded_file` or `type="file"` in `php/` or the admin pages.

**19 Payments — N/A**: no payment processing; eBay data is read-only in code (GET calls + read-only Trading calls), even though the `sell.finances` scope is requested (`ebay.php:134`; eBay offers no read-only variant).

**20 Debug**: no `ini_set('display_errors')`, `phpinfo`, stack-trace output or `var_dump` in code; public endpoints return generic `{ok:false}` errors. `display_errors` is host-controlled — verified that with it On, warnings print absolute paths (`php -S`: `GET /index.php` re-runs bootstrap and prints `Constant APP_DIR already defined in C:\…\app\bootstrap.php`; this specific double-include is a `php -S` artefact, Apache executes `index.php` once) → H-2. Admin errors: F-10.

**21/22 Dependencies**: no Composer, no PHP third-party code; Node build tools are not shipped; no source maps in `public/assets/` (esbuild config has no `sourcemap`, `build.mjs:22-43`). The shipped JS bundle includes third-party front-end libraries from the root `node_modules` → run `npm audit --omit=dev` at the repo root (out of scope here). Dead code/files: F-21.

**23 Exposed files**: web root contains only `index.php`, `.htaccess`, `assets/`, `images/`, `models/`, `admin/` (2 HTML + 1 PNG), 3 PNG logos — no `.php` besides `index.php`, no `.map`, no backup files today. `.htaccess` denies dotfiles and `env|ini|log|sh|sql|bak|old|swp|md` (`:7-10`) plus `RedirectMatch 404 /\.(?!well-known)` (`:10`); `Options -Indexes` (`:2`). `storage/.htaccess` denies all (2.2 and 2.4 syntax). Verified on `php -S`: `/.env`, `/../.env`, `/storage/ebay_access_token.json` → 404. Alternative deploy and misdeploy: F-03; `error_log`/archives: F-02.

**B2 SSRF**: all outbound URLs use constant hosts (`oauth2.googleapis.com`, `www.googleapis.com`, `api.ebay.com`, `apiz.ebay.com`, `api.resend.com`); the calendar id and event id are `rawurlencode`d path segments; no user-supplied URL is fetched. Only quirk: F-12.

**B7 Email authentication**: manual, see H-11.

---

## Host-only verifications (do these on the cPanel account before launch)

Replace `<d>` with `infoliquidationrecycle.com`.

- **H-1 PHP version / extensions**: cPanel → *MultiPHP Manager* → domain on PHP 8.2 or 8.3. *Select PHP Version → Extensions*: curl, openssl, mbstring, json enabled.
- **H-2 Errors**: cPanel → *MultiPHP INI Editor* → *Editor Mode* for the domain: `display_errors = Off`, `log_errors = On`, `error_log = /home/<user>/logs/php_errors.log`, `expose_php = Off`. Then `curl -sI https://<d>/error_log` → 403/404 (F-02).
- **H-3 Rewrite active and admin HTML protected**: `curl -sI https://<d>/admin/dashboard.html` → 307 to `/admin/login` (never 200); `curl -sI https://<d>/admin/dashboard.html/x` → 404/307 (checks `AcceptPathInfo`); `curl -sI https://<d>/contact` → 200; `curl -sI https://<d>/admin` → 307.
- **H-4 Nothing secret is reachable**: each of `curl -s -o /dev/null -w "%{http_code}\n" https://<d>/PATH` for `/.env`, `/php/.env`, `/.git/config`, `/app/lib/env.php`, `/storage/google_access_token.json`, `/storage/ratelimit/`, `/README.md`, `/error_log`, `/index.php.bak` → 403 or 404.
- **H-5 HTTPS**: `curl -sI http://<d>/` and `http://www.<d>/` → 301 to `https://`; `curl -sI https://<d>/ | grep -i strict-transport` present; run https://www.ssllabs.com/ssltest/ (grade A expected). Because HSTS has `includeSubDomains`, check that every subdomain in use (`www`, `mail`, `webmail`, `cpanel`) has a valid certificate (cPanel → *SSL/TLS Status* → AutoSSL).
- **H-6 Cookie flags**: log in, browser DevTools → Application → Cookies → `ilr_admin`: `Secure` ✓, `HttpOnly` ✓, `SameSite=Lax`, expires ≈ 8 h.
- **H-7 Directory listing**: `curl -s https://<d>/images/ | head` → 403/404, not an index page.
- **H-8 Security headers on PHP pages**: `curl -sI https://<d>/` shows HSTS, CSP, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy and no `X-Powered-By`.
- **H-9 Permissions / writable storage**: File Manager → `.env` = 600, `storage/` = 700 and writable by PHP. Test: 6 wrong logins from one IP → "Trop de tentatives… 15 min" (proves `storage/ratelimit/` is writable; F-06). Then empty `storage/ratelimit/`.
- **H-10 Google OAuth client**: Google Cloud Console → Credentials → the Web client used in production: *Authorized redirect URIs* = exactly `https://<d>/api/google/callback` (use a separate client for localhost). OAuth consent screen in *Production* status (refresh tokens of *Testing* apps expire after 7 days).
- **H-11 Email (Resend + DNS)**: Resend dashboard → domain `<d>` *Verified* (DKIM `resend._domainkey`, SPF/MX records on the `send` subdomain as Resend lists them); DMARC TXT at `_dmarc.<d>` (start with `v=DMARC1; p=none; rua=mailto:…`, move to `p=quarantine`); set `RESEND_FROM="Info Liquidation Recycle <noreply@<d>>"` and `RESEND_API_KEY` in the server `.env` (F-01). Submit one real contact form and check the received message headers show `spf=pass dkim=pass dmarc=pass`.
- **H-12 Proxy / IPv6**: if Cloudflare is used, restrict the origin to Cloudflare IPs before setting `TRUST_PROXY=1` (F-18). `dig AAAA <d>`: if the site has IPv6, prioritise the /64 bucketing in F-05/F-06.

---

## Verification performed

- Static review of every file under `app/`, `public/index.php`, `public/.htaccess`, `storage/.htaccess`, `.env.example`, `build.mjs`, `README.md`, `CONVENTIONS.md`; `public/admin/login.html` script; targeted review (Grep + Read) of all ~60 `innerHTML`/`insertAdjacentHTML` sinks in `public/admin/dashboard.html` with a script listing every `${…}` interpolation not wrapped in `esc()`/`safeUrl()`.
- `.env`: variable names and set/empty status only (values never printed).
- Local test server `php -S 127.0.0.1:8091 -t php/public php/public/index.php` (PHP 8.3.36, `display_errors=1`), non-destructive requests only (no valid form submitted, no admin login, no outbound Google/eBay call). Results quoted in the sections above. The 3 rate-limit files created by the login tests were deleted afterwards; the server was stopped.
- PHP curl dot-segment test against that local server (F-12).
