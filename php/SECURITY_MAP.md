# Security map — PHP version (Prompt 00)

Scope: `php/` plus the admin front-end `public/admin/dashboard.html` and `public/admin/login.html` (copied by `php/build.mjs` into `php/public/admin/`; both copies are byte-identical today). The Next.js app in `src/` is out of scope.
Audit date: 2026-11-25, branch `securite-prelancement`, HEAD `6d5495d`. Read-only audit. Findings are in `SECURITY_AUDIT_FINDINGS.md`.

## 1. Stack, versions, hosting

| Item | Value |
|---|---|
| Language | PHP 8.1+ required (`never` return type in `app/lib/http.php:4`, `str_contains`). Tested locally with PHP 8.3.36 (built-in server). |
| Dependencies | None at runtime (no Composer). Extensions: curl, openssl, mbstring, json. |
| Front controller | `public/index.php` (every non-static request). Router: `app/lib/router.php` (whitelisted routes `ROUTES` / `ROUTE_VIEWS`). |
| Front-end build | `node php/build.mjs` (esbuild + Tailwind) → `public/assets/`. Bundles React islands from `src/` (three.js / drei, hls.js, etc.). No source maps emitted. Node deps are not shipped (README step 1 excludes `js/`, `css/`, `tools/`, `build.mjs`). |
| Hosting target | cPanel shared hosting, Apache + `mod_rewrite` (`public/.htaccess`), web root = `php/public/`. Alternative in README: copy `public/` into `public_html/` and put `app/`, `storage/`, `.env` one level up. |
| TLS | Provided by host (AutoSSL / Let's Encrypt expected). HTTP→HTTPS redirect in `public/.htaccess:15-18`; HSTS sent by PHP (`public/index.php:10`). |

## 2. Data stores and sensitivity

| Store | Content | Sensitivity | Location / protection |
|---|---|---|---|
| `php/.env` | All secrets (admin credentials, session secret, Google + eBay OAuth secrets and refresh tokens, Resend key) | **Critical** | Outside web root when docroot = `php/public`. `.htaccess` also denies dotfiles (`public/.htaccess:7-10`) but that only protects files *inside* `public/`. gitignored (`/.gitignore: .env*`). |
| `php/storage/google_access_token.json` | Cached Google access token (1 h) + fingerprint | High (1 h validity, calendar read/write) | Outside web root; `storage/.htaccess` = `Require all denied`; files chmod 0600 when written (`app/lib/google_calendar.php` `google_access_token`). gitignored (`storage/.gitignore`). |
| `php/storage/ebay_access_token.json` | Cached eBay user access token (2 h) | High (sell.* scopes incl. `sell.finances`) | Same as above (`app/lib/ebay.php:110-166`). |
| `php/storage/ratelimit/*.json` | `{count, resetAt}` per SHA-256(key); key contains client IP | Low (pseudonymous IP hash) | Same as above. One file per IP × bucket; GC 1/200 requests, deletes > 25 h (`app/lib/rate_limit.php:28-38`). |
| PHP `error_log` (host-defined path) | Spam blocks with IP, honeypot hits, Resend errors, eBay errors, **full email content incl. customer PII when `RESEND_API_KEY` is missing** (`app/lib/mailer.php:16-22`) | Medium–High (PII, Loi 25) | Path depends on host `php.ini`. On cPanel the default is often a file named `error_log` in the script directory, i.e. `php/public/error_log`, which is **not** matched by the `.htaccess` deny rule. See F-02. |
| Browser `localStorage` (admin) | `ilr_notifs` (eBay sale notifications incl. buyer username, item title), `ilr_status_ov` (pickup status overrides), `il-theme` | Low | Admin browser only. |
| Google Calendar (remote) | Pickup appointments: client names, addresses, items, notes | Medium (PII) | Accessed server-side with refresh token. |
| eBay (remote) | Orders, buyer usernames, revenue | Medium | Accessed server-side, read-only calls. |

No database, no user accounts besides the single admin, no file uploads, no payments.

## 3. Authentication

- **Method**: single admin. `ADMIN_USERNAME` / `ADMIN_PASSWORD` stored in plain text in `.env`, compared with `admin_safe_equal()` (HMAC with random key + `hash_equals`, both comparisons always run) — `app/lib/admin_auth.php:33-48`.
- **Session**: stateless signed cookie `ilr_admin` = `<expiry unix>.<hex HMAC-SHA256(expiry)>`, key = `"ilr-admin-session|" . (ADMIN_SESSION_SECRET ?? ADMIN_PASSWORD)` (`admin_auth.php:16-20, 50-68`). TTL 8 h absolute, no idle timeout, no server-side store, no revocation except rotating the secret. Cookie flags: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` only if `admin_is_https()` (`admin_auth.php:110-122`).
- **Where checks happen**:
  - Front controller: every `/api/(ebay|calendar|google)/…` calls `admin_require_api()` before dispatch (`public/index.php:38-41`); `/admin`, `/en/admin`, `/admin/*` require `admin_is_authed()` else 307 to `/admin/login` (`public/index.php:62-75`).
  - Defence in depth inside every admin handler: `app/api/calendar/events.php:22`, `app/api/calendar/event.php:23`, `app/api/ebay/summary.php:18`, `app/api/google/auth-start.php:18`, `app/api/google/callback.php:20`.
  - Fail closed when admin env vars are missing: 503 on API, redirect on pages (`admin_auth.php:87-95`, `public/index.php:66`).
- **Roles**: none (one admin = full access).
- **Login throttling**: per client IP, file-based: 30 requests / 15 min, 5 failures / 15 min, 20 failures / 24 h; successful login clears failure counters (`app/api/admin/login.php:23-71`).
- **OAuth (Google)**: `auth-start` (admin only) generates 24-byte random `state`, stores it in an `HttpOnly; SameSite=Lax; Path=/api/google` cookie (10 min); `callback` (admin only) compares it in constant time, exchanges the code and **displays the refresh token in an HTML page** for the admin to paste into `.env` (`app/api/google/callback.php:55-102`). `redirect_uri` is built from the request `Host` header (`request_origin()`), not from `SITE_URL`.

## 4. Entry points (every one)

Legend: Auth = admin session checked server-side.

### 4.1 Pages (GET, `public/index.php` → `resolve_route()` → `app/views/pages/*.php`)

| Path (FR / EN) | Purpose | Auth | Inputs |
|---|---|---|---|
| `/` , `/en` | Home | No | none |
| `/a-propos` , `/en/about` | About | No | none |
| `/informations` , `/en/information` | Info | No | none |
| `/recyclage-ordinateur` , `/en/computer-recycling` | Service page | No | none |
| `/formulaire-de-ramassage` , `/en/pick-up-form` | Pickup form page (React island `PickupForm`) | No | none |
| `/destruction-des-donnees` , `/en/data-destruction` | Service page | No | none |
| `/matieres-recyclables` , `/en/recyclable-materials` | Service page | No | none |
| `/procedure-de-recuperation` , `/en/recovery-procedure` | Service page | No | none |
| `/destruction-des-disques-durs` , `/en/hard-drive-destruction` | Service page | No | none |
| `/recyclage-telephones` , `/en/phone-recycling` | Service page | No | none |
| `/faq` , `/en/faq` | FAQ | No | none |
| `/blog` , `/en/blog` | Blog index | No | none |
| `/blog/{slug}` , `/en/blog/{slug}` | Article | No | `slug` — whitelisted against `BLOG_SLUGS` (`router.php:83`) |
| `/contact` , `/en/contact` | Contact page (island `ContactForm`) | No | none |
| `/merci` , `/en/thank-you` | Thank-you page | No | none |
| `/politique-de-temoins` , `/en/cookie-policy` | Cookie policy | No | none |
| `/{ville}` , `/en/{ville}` | City landing page | No | `ville` — whitelisted against `CITIES` (`router.php:82`) |
| `/sitemap.xml` | Generated sitemap | No | none |
| `/robots.txt` | Generated robots | No | none |
| legacy WordPress URLs | 301 to new URL (fixed map `router.php:104-117`) | No | path |
| any `…/` | 308 to path without trailing slash (`index.php:82-86`) | No | path + query string (relative Location) |
| anything else | 404 page | No | path |

### 4.2 Admin HTML

| Path | Method | Purpose | Auth | Inputs |
|---|---|---|---|---|
| `/admin/login`, `/admin/login.html` | GET | `readfile(public/admin/login.html)`; `Cache-Control: no-store`, `noindex` (`index.php:55-61`) | No | `?e=1|rate|config`, `?m=<int>` read client-side with `textContent` |
| `/admin`, `/admin/`, `/en/admin` | GET | `readfile(public/admin/dashboard.html)` (`index.php:62-71`) | **Yes** (307 → `/admin/login`) | cookie |
| `/admin/dashboard.html` | GET | Rewritten to `index.php` by `.htaccess:21` → auth → 404 | Yes | — |
| `/admin/*` (other) | GET | 404 after auth; real files (e.g. `byebyeboss-logo.png`) served directly by Apache | Yes / static | — |

### 4.3 API (`public/index.php:31-52` → `app/api/<path>.php`; path restricted to `[a-z0-9\-/]+`)

| Path | Method | Purpose | Auth | Inputs |
|---|---|---|---|---|
| `/api/pickup` | POST | Pickup request → email to business via Resend | No (honeypot + 5 valid sends / 15 min / IP, then 1 h block) | JSON: `title`(mr/mrs), `firstName`≤100, `lastName`≤100, `company`?≤200, `email`≤254, `phone` 7–30, `address`≤300, `city`≤100, `postalCode` (CA regex), `quantities` {12 int 0–9999}, `extras` ≤20 × {`name`≤100, `quantity`}, `certificate` (yes/no), `website` (honeypot). Body ≤ 64 KB by `Content-Length`. |
| `/api/contact` | POST | Contact message → email via Resend | No (same anti-spam) | JSON: `name`≤200, `email`≤254, `phone`?≤30, `message`≤5000, `website` (honeypot). Body ≤ 64 KB. |
| `/api/admin/login` | POST | Verify credentials, set session cookie, 303 | No (per-IP throttling) | form-urlencoded / multipart: `username`, `password` (truncated to 200 chars) |
| `/api/admin/logout` | GET, POST | Clear cookie, 303 to `/admin/login` | No | none |
| `/api/calendar/events` | GET | List Google Calendar events | **Yes** | query `from`, `to` (date strings, range ≤ 400 days) |
| `/api/calendar/events` | POST | Create event | **Yes** | JSON `summary` 1–300, `description`?≤8000, `location`?≤500, `start`, `end` (≤64 chars, parsed), `attendees`? ≤20 emails |
| `/api/calendar/events/{id}` | PATCH | Update event | **Yes** | `id` (path, `[A-Za-z0-9_@.\-]+`, ≤1024), JSON `summary`?, `description`?, `location`?, `start`?, `end`?, `status`? (confirmed/tentative/cancelled) |
| `/api/calendar/events/{id}` | DELETE | Delete event | **Yes** | `id` |
| `/api/ebay/summary` | GET | eBay KPIs, recent orders, daily sales, feedback, traffic, returns | **Yes** | none |
| `/api/google/auth-start` | GET | Start Google OAuth (sets state cookie, 307 to Google) | **Yes** | none |
| `/api/google/callback` | GET | OAuth callback; shows refresh token | **Yes** | `code`, `state`, `error`, state cookie |

### 4.4 Direct-access PHP files

Only `public/index.php` is inside the web root. `app/**` (libs, views, API handlers) is reachable only through the front controller **as long as the docroot is `php/public/`** (see F-03 for the misdeploy case). `php -S` (local only) serves any existing file in `public/` directly, including `admin/dashboard.html` (`index.php:22-24`).

### 4.5 Static files served by Apache without PHP

`/assets/*` (JS/CSS bundles, no `.map`), `/images/*`, `/models/*`, `/logo.png`, `/favicon-logo.png`, `/icon.png`, `/admin/byebyeboss-logo.png`. They receive no security headers (headers are set in PHP only).

## 5. Third-party services

| Service | Used for | Credential (env name) | Side |
|---|---|---|---|
| Resend (`api.resend.com`) | Sending pickup/contact emails to `info@infoliquidationrecycle.com` | `RESEND_API_KEY`, `RESEND_FROM` | Server (`app/lib/mailer.php`) |
| Google OAuth + Calendar v3 | Admin calendar read/write; scopes `calendar.readonly` + `calendar.events` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID` | Server (`app/lib/google_calendar.php`); browser only redirected to `accounts.google.com` with the public client id |
| eBay REST + Trading + Post-Order APIs | Admin sales dashboard; scopes `sell.inventory.readonly`, `sell.fulfillment.readonly`, `sell.analytics.readonly`, `sell.finances`, `commerce.identity.readonly` | `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_REFRESH_TOKEN`, `EBAY_MARKETPLACE_ID` | Server (`app/lib/ebay.php`) |
| Google Fonts | Fonts on public pages, login, dashboard | none | Client (visitor IP sent to Google) |
| raw.githack.com | HDR environment maps loaded at runtime by drei `<Environment preset>` in the 3D hero (`public/assets/chunks/HeroDevices-*.js`) | none | Client |
| Google Maps (links only) | Directions links in dashboard | none | Client |

## 6. Environment variables (names only)

Status column = state of the local `php/.env` on 2026-11-25 (values not read).

| Name | Used at | Secret? | Local status |
|---|---|---|---|
| `SITE_URL` / `NEXT_PUBLIC_SITE_URL` | `app/bootstrap.php:14` (canonical URLs, sitemap, JSON-LD) | No | SITE_URL set |
| `RESEND_API_KEY` | `app/lib/mailer.php:14` | **Yes** | **NOT SET** → emails are only logged (F-01) |
| `RESEND_FROM` | `app/lib/mailer.php:25` | No | not set → default `onboarding@resend.dev` |
| `ADMIN_USERNAME` | `app/lib/admin_auth.php:24,41` | Semi (part of credential) | set (4 chars) |
| `ADMIN_PASSWORD` | `app/lib/admin_auth.php:18,24,42` | **Yes** | set (16 chars; README recommends 20+) |
| `ADMIN_SESSION_SECRET` | `app/lib/admin_auth.php:18` (falls back to `ADMIN_PASSWORD`) | **Yes** | set (64 chars) |
| `GOOGLE_CLIENT_ID` | `app/api/google/auth-start.php:20`, `callback.php:63`, `app/lib/google_calendar.php:75` | No (public identifier) | set |
| `GOOGLE_CLIENT_SECRET` | same files, lines 21 / 64 / 76 | **Yes** | set |
| `GOOGLE_REFRESH_TOKEN` | `app/lib/google_calendar.php:77` | **Yes** | set |
| `GOOGLE_CALENDAR_ID` | `app/lib/google_calendar.php:16` (default `primary`) | No (private) | set |
| `EBAY_APP_ID` | `app/lib/ebay.php:112` | No (identifier) | set |
| `EBAY_CERT_ID` | `app/lib/ebay.php:113` | **Yes** | set |
| `EBAY_REFRESH_TOKEN` | `app/lib/ebay.php:114` | **Yes** | set |
| `EBAY_MARKETPLACE_ID` | `app/lib/ebay.php:16` (default `EBAY_CA`) | No | set |
| `EBAY_DEV_ID`, `EBAY_RUNAME` | **unused** by code | Semi | set (remove from server `.env`) |
| `TRUST_PROXY` | `app/lib/http.php:39` (`1` = trust CF-Connecting-IP / X-Forwarded-For / X-Real-IP) | No | not set (correct for direct hosting) |

## 7. Risky features

- **Outbound email** built from public form input (Resend JSON API; HTML body escaped; `reply_to` = visitor email; subject contains visitor name).
- **OAuth** to Google (admin-initiated) with refresh token displayed once in the browser; long-lived Google and eBay refresh tokens in `.env`.
- **Outbound HTTP** to Google (`oauth2.googleapis.com`, `www.googleapis.com`) and eBay (`api.ebay.com`, `apiz.ebay.com`) with fixed base URLs; only user-influenced part is the calendar event id (rawurlencoded path segment, see F-12).
- **Admin tools**: calendar create/update/delete, eBay financial data view, Google OAuth re-authorization.
- **Third-party-controlled data rendered in the admin**: Google Calendar event title/description/location (anyone can send an invitation to the calendar), eBay item titles / buyer usernames. Rendered with `esc()` in the dashboard (see findings, "checked OK").
- **File-based rate limiting** writing into `storage/` on public requests.

## 8. Open questions (need the owner / host)

1. Final hosting layout: can the cPanel docroot really be set to `php/public/`? (For a primary domain cPanel usually forces `public_html/`.) Which of the README options will be used? See F-03.
2. Where does the host write the PHP `error_log`, and is `display_errors` Off? See F-02 / host checks.
3. Will `RESEND_API_KEY` and a verified `RESEND_FROM` domain be set in the production `.env`? See F-01.
4. Is the site behind Cloudflare or another proxy (decides `TRUST_PROXY`, and whether `X-Forwarded-Proto` can be trusted)?
5. Does the host have IPv6 enabled for the site (affects per-IP throttling, F-05 / F-06)?
6. Is `GOOGLE_CALENDAR_ID` a secondary calendar (affects impact of F-12)?
7. Are other subdomains of `infoliquidationrecycle.com` in use (HSTS `includeSubDomains`, SameSite scope)?
