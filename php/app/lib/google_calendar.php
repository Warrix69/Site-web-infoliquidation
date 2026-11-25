<?php
/**
 * Client Google Calendar en REST (curl), port de src/lib/google-calendar.ts (SDK googleapis).
 *
 * Le refresh token vient de GOOGLE_REFRESH_TOKEN (php/.env), comme la version Next.js.
 * L'access token (valide 1 h) est mis en cache dans storage/google_access_token.json
 * (l'équivalent du cache mémoire du SDK), lié au refresh token utilisé.
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

function google_calendar_id(): string
{
    return env('GOOGLE_CALENDAR_ID') ?? 'primary';
}

function google_storage_file(): string
{
    $base = defined('STORAGE_DIR') ? STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
    return $base . '/google_access_token.json';
}

/** @return array{status: int, body: string, error: ?string} */
function google_http(string $method, string $url, array $headers = [], ?string $body = null): array
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($body !== null) $opts[CURLOPT_POSTFIELDS] = $body;
    curl_setopt_array($ch, $opts + curl_base_opts());
    $res = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = $res === false ? curl_error($ch) : null;
    curl_close($ch);
    return ['status' => $status, 'body' => $res === false ? '' : (string) $res, 'error' => $err];
}

/** Message d'erreur OAuth (« invalid_grant », « invalid_client »…) comme le SDK. */
function google_oauth_error(array $res): RuntimeException
{
    if ($res['error'] !== null) return new RuntimeException('request to ' . GOOGLE_TOKEN_URL . ' failed, reason: ' . $res['error']);
    $data = json_decode($res['body'], true);
    if (is_array($data) && isset($data['error']) && is_string($data['error'])) {
        $desc = isset($data['error_description']) && is_string($data['error_description']) ? $data['error_description'] : '';
        return new RuntimeException($desc !== '' ? "{$data['error']}: $desc" : $data['error']);
    }
    return new RuntimeException('Request failed with status code ' . $res['status']);
}

/** Échange un formulaire contre des jetons sur l'endpoint OAuth2 de Google. */
function google_token_request(array $params): array
{
    $res = google_http('POST', GOOGLE_TOKEN_URL, [
        'Content-Type: application/x-www-form-urlencoded',
        'Accept: application/json',
    ], http_build_query($params, '', '&', PHP_QUERY_RFC3986));
    if ($res['error'] !== null || $res['status'] < 200 || $res['status'] >= 300) {
        throw google_oauth_error($res);
    }
    $data = json_decode($res['body'], true);
    if (!is_array($data)) throw new RuntimeException('Invalid token response from Google');
    return $data;
}

/** @return array{clientId: string, clientSecret: string, refreshToken: string} */
function google_credentials(): array
{
    $clientId = env('GOOGLE_CLIENT_ID');
    $clientSecret = env('GOOGLE_CLIENT_SECRET');
    $refreshToken = env('GOOGLE_REFRESH_TOKEN');
    if ($clientId === null || $clientSecret === null || $refreshToken === null) {
        throw new RuntimeException(
            'Google Calendar not configured. Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN in php/.env.'
        );
    }
    return ['clientId' => $clientId, 'clientSecret' => $clientSecret, 'refreshToken' => $refreshToken];
}

/** Access token valide (cache fichier, renouvelé 5 min avant expiration). */
function google_access_token(bool $forceRefresh = false): string
{
    $c = google_credentials();
    $fingerprint = hash('sha256', $c['clientId'] . '|' . $c['refreshToken']);
    $file = google_storage_file();

    if (!$forceRefresh && is_file($file)) {
        $cached = json_decode((string) @file_get_contents($file), true);
        if (is_array($cached) && ($cached['fp'] ?? '') === $fingerprint
            && is_string($cached['token'] ?? null) && (int) ($cached['expiresAt'] ?? 0) > time() + 300) {
            return $cached['token'];
        }
    }

    $data = google_token_request([
        'client_id' => $c['clientId'],
        'client_secret' => $c['clientSecret'],
        'refresh_token' => $c['refreshToken'],
        'grant_type' => 'refresh_token',
    ]);
    if (!is_string($data['access_token'] ?? null)) throw new RuntimeException('No access token returned by Google');

    $entry = ['fp' => $fingerprint, 'token' => $data['access_token'], 'expiresAt' => time() + (int) ($data['expires_in'] ?? 3600)];
    $dir = dirname($file);
    if (is_dir($dir) || @mkdir($dir, 0700, true)) {
        $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
        if (@file_put_contents($tmp, json_encode($entry), LOCK_EX) !== false) {
            @chmod($tmp, 0600);
            if (!@rename($tmp, $file)) @unlink($tmp);
        }
    }
    return $data['access_token'];
}

/**
 * Appel de l'API Calendar v3. Retourne le corps décodé (objets stdClass, pour
 * renvoyer tel quel au dashboard) ou null pour une réponse vide (204).
 * Un 401 avec un jeton en cache déclenche un renouvellement et un nouvel essai.
 */
function google_calendar_request(string $method, string $path, ?array $query = null, $body = null)
{
    $url = GOOGLE_CALENDAR_BASE . $path;
    if ($query) $url .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    $payload = $body === null ? null : json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);

    $res = null;
    for ($attempt = 0; $attempt < 2; $attempt++) {
        $token = google_access_token($attempt > 0);
        $headers = ['Authorization: Bearer ' . $token, 'Accept: application/json'];
        if ($payload !== null) $headers[] = 'Content-Type: application/json';
        $res = google_http($method, $url, $headers, $payload);
        if ($res['error'] === null && $res['status'] === 401 && $attempt === 0) continue;
        break;
    }

    if ($res['error'] !== null) throw new RuntimeException('request to ' . $url . ' failed, reason: ' . $res['error']);
    $data = $res['body'] === '' ? null : json_decode($res['body']);
    if ($res['status'] < 200 || $res['status'] >= 300) {
        $msg = is_object($data) && isset($data->error->message) && is_string($data->error->message)
            ? $data->error->message
            : 'Request failed with status code ' . $res['status'];
        throw new RuntimeException($msg);
    }
    return $data;
}

function google_calendar_path(?string $eventId = null): string
{
    $p = '/calendars/' . rawurlencode(google_calendar_id()) . '/events';
    return $eventId === null ? $p : $p . '/' . rawurlencode($eventId);
}

/** Liste les événements entre deux dates. @return array<int, object> */
function google_list_events(DateTimeInterface $from, DateTimeInterface $to, int $maxResults = 100): array
{
    $data = google_calendar_request('GET', google_calendar_path(), [
        'timeMin' => js_iso($from),
        'timeMax' => js_iso($to),
        'singleEvents' => 'true',
        'orderBy' => 'startTime',
        'maxResults' => (string) $maxResults,
    ]);
    return is_object($data) && isset($data->items) && is_array($data->items) ? $data->items : [];
}

/**
 * Crée un événement. $input : summary, description?, location?, start, end (DateTimeInterface), attendees? (emails).
 * Les clés absentes (null) ne sont pas envoyées, comme JSON.stringify avec undefined.
 */
function google_create_event(array $input)
{
    $body = ['summary' => $input['summary']];
    if (isset($input['description'])) $body['description'] = $input['description'];
    if (isset($input['location'])) $body['location'] = $input['location'];
    $body['start'] = ['dateTime' => js_iso($input['start'])];
    $body['end'] = ['dateTime' => js_iso($input['end'])];
    if (isset($input['attendees'])) {
        $body['attendees'] = array_map(fn ($email) => ['email' => $email], array_values($input['attendees']));
    }
    return google_calendar_request('POST', google_calendar_path(), null, $body);
}

/** Message d'erreur lisible pour le dashboard (clé manquante, token expiré, etc.). */
function google_describe_error(Throwable $err): string
{
    $message = $err->getMessage();
    if (preg_match('/invalid_grant/i', $message)) {
        return "Google Calendar : GOOGLE_REFRESH_TOKEN expiré ou révoqué. Refaire l'autorisation via /api/google/auth-start puis mettre à jour la variable dans php/.env.";
    }
    if (preg_match('/invalid_client/i', $message)) {
        return 'Google Calendar : GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET invalides.';
    }
    return mb_scrub($message, 'UTF-8');
}

/* ───────────── Dates façon JavaScript ───────────── */

/**
 * Équivalent de new Date(value) pour les formats ISO 8601 :
 * date seule (AAAA, AAAA-MM, AAAA-MM-JJ) → minuit UTC ; date-heure sans fuseau → heure locale du serveur ;
 * avec Z ou ±hh:mm → ce fuseau. Retourne null pour une date invalide.
 */
function js_date_parse(string $value): ?DateTimeImmutable
{
    $v = trim($value);
    $utc = new DateTimeZone('UTC');
    if (preg_match('/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/D', $v, $m)) {
        $y = (int) $m[1];
        $mo = isset($m[2]) ? (int) $m[2] : 1;
        $d = isset($m[3]) ? (int) $m[3] : 1;
        if ($mo < 1 || $mo > 12 || $d < 1 || $d > 31) return null;
        return (new DateTimeImmutable('now', $utc))->setDate($y, $mo, $d)->setTime(0, 0, 0);
    }
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?$/iD', $v, $m)) {
        [$y, $mo, $d, $h, $mi] = [(int) $m[1], (int) $m[2], (int) $m[3], (int) $m[4], (int) $m[5]];
        $s = isset($m[6]) && $m[6] !== '' ? (int) $m[6] : 0;
        $ms = isset($m[7]) && $m[7] !== '' ? (int) substr(str_pad($m[7], 3, '0'), 0, 3) : 0;
        if ($mo < 1 || $mo > 12 || $d < 1 || $d > 31 || $h > 24 || $mi > 59 || $s > 59) return null;
        $zone = $m[8] ?? '';
        try {
            $tz = $zone === '' ? new DateTimeZone(date_default_timezone_get())
                : (strtoupper($zone) === 'Z' ? $utc : new DateTimeZone($zone));
        } catch (Exception $e) {
            return null;
        }
        return (new DateTimeImmutable('now', $tz))->setDate($y, $mo, $d)->setTime($h, $mi, $s, $ms * 1000);
    }
    // Autres formats (ex. « Oct 8 2026 ») : analyse permissive, mais pas les mots relatifs (« now », « tomorrow »)
    if (!preg_match('/\d{4}/', $v) || preg_match('/\b(now|today|tomorrow|yesterday|next|last|ago|midnight|noon)\b/i', $v)) {
        return null;
    }
    try {
        return new DateTimeImmutable($v);
    } catch (Exception $e) {
        return null;
    }
}

/** Équivalent de Date.prototype.toISOString() : AAAA-MM-JJTHH:MM:SS.mmmZ (UTC). */
function js_iso(DateTimeInterface $d): string
{
    $utc = DateTimeImmutable::createFromInterface($d)->setTimezone(new DateTimeZone('UTC'));
    return $utc->format('Y-m-d\TH:i:s.v\Z');
}
