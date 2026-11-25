<?php
/**
 * Client eBay en REST (curl), port de src/lib/ebay.ts.
 *
 * L'access token est généré à partir de EBAY_REFRESH_TOKEN et mis en cache dans
 * storage/ebay_access_token.json (équivalent du cache mémoire de la version Next.js).
 * Les appels du résumé partent en parallèle (curl_multi), comme le Promise.all d'origine.
 */

const EBAY_BASE = 'https://api.ebay.com';
const EBAY_BASE_Z = 'https://apiz.ebay.com'; // commerce APIs
const EBAY_TZ = 'America/Toronto';

function ebay_marketplace_id(): string
{
    return env('EBAY_MARKETPLACE_ID') ?? 'EBAY_CA';
}

function ebay_storage_file(): string
{
    $base = defined('STORAGE_DIR') ? STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
    return $base . '/ebay_access_token.json';
}

function ebay_now_ms(): float
{
    return floor(microtime(true) * 1000);
}

/* ───────────── HTTP ───────────── */

/**
 * Exécute plusieurs requêtes en parallèle.
 * @param array<string, array{method?: string, url: string, headers?: array, body?: ?string}> $requests
 * @return array<string, array{status: int, body: string, error: ?string}>
 */
function ebay_http_multi(array $requests): array
{
    $mh = curl_multi_init();
    $handles = [];
    foreach ($requests as $key => $req) {
        $ch = curl_init($req['url']);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CUSTOMREQUEST => $req['method'] ?? 'GET',
            CURLOPT_HTTPHEADER => $req['headers'] ?? [],
        ];
        if (isset($req['body'])) $opts[CURLOPT_POSTFIELDS] = $req['body'];
        curl_setopt_array($ch, $opts + curl_base_opts());
        curl_multi_add_handle($mh, $ch);
        $handles[$key] = $ch;
    }

    $codes = [];
    $running = 0;
    do {
        $status = curl_multi_exec($mh, $running);
        while (($info = curl_multi_info_read($mh)) !== false) {
            $codes[spl_object_id($info['handle'])] = $info['result'];
        }
        if ($running > 0 && $status === CURLM_OK) {
            if (curl_multi_select($mh, 1.0) === -1) usleep(10000);
        }
    } while ($running > 0 && $status === CURLM_OK);
    while (($info = curl_multi_info_read($mh)) !== false) {
        $codes[spl_object_id($info['handle'])] = $info['result'];
    }

    $results = [];
    foreach ($handles as $key => $ch) {
        $code = $codes[spl_object_id($ch)] ?? CURLE_OK;
        $body = curl_multi_getcontent($ch);
        $error = null;
        if ($code !== CURLE_OK) {
            $error = curl_error($ch) ?: curl_strerror($code);
        }
        $results[$key] = [
            'status' => (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE),
            'body' => is_string($body) ? $body : '',
            'error' => $error,
        ];
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);
    return $results;
}

/** @return array{status: int, body: string, error: ?string} */
function ebay_http(string $method, string $url, array $headers, ?string $body = null): array
{
    $req = ['method' => $method, 'url' => $url, 'headers' => $headers];
    if ($body !== null) $req['body'] = $body;
    return ebay_http_multi(['r' => $req])['r'];
}

/** JSON.stringify(JSON.parse(text)) : JSON compact, pour les messages d'erreur. */
function ebay_stringify(string $text): string
{
    if ($text === '') return '{}';
    $decoded = json_decode($text);
    if (json_last_error() !== JSON_ERROR_NONE) return mb_scrub(substr($text, 0, 500), 'UTF-8');
    return (string) json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
}

/* ───────────── Jeton d'accès ───────────── */

function ebay_access_token(): string
{
    $appId = env('EBAY_APP_ID');
    $certId = env('EBAY_CERT_ID');
    $refreshToken = env('EBAY_REFRESH_TOKEN');
    if ($appId === null || $certId === null || $refreshToken === null) {
        throw new RuntimeException('eBay not configured. Set EBAY_APP_ID / EBAY_CERT_ID / EBAY_REFRESH_TOKEN in php/.env.');
    }

    // Réutilise le token si valide pour > 5 min
    $fingerprint = hash('sha256', $appId . '|' . $refreshToken);
    $file = ebay_storage_file();
    if (is_file($file)) {
        $cached = json_decode((string) @file_get_contents($file), true);
        if (is_array($cached) && ($cached['fp'] ?? '') === $fingerprint
            && is_string($cached['token'] ?? null) && (float) ($cached['expiresAt'] ?? 0) > ebay_now_ms() + 5 * 60 * 1000) {
            return $cached['token'];
        }
    }

    $scopes = implode(' ', [
        'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
        'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
        'https://api.ebay.com/oauth/api_scope/sell.finances',
        'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
    ]);

    $res = ebay_http('POST', 'https://api.ebay.com/identity/v1/oauth2/token', [
        'Authorization: Basic ' . base64_encode("$appId:$certId"),
        'Content-Type: application/x-www-form-urlencoded',
    ], http_build_query([
        'grant_type' => 'refresh_token',
        'refresh_token' => $refreshToken,
        'scope' => $scopes,
    ]));

    if ($res['error'] !== null) throw new RuntimeException('fetch failed: ' . $res['error']);
    $data = json_decode($res['body'], true);
    $ok = $res['status'] >= 200 && $res['status'] < 300;
    if (!$ok || !is_array($data) || empty($data['access_token'])) {
        throw new RuntimeException('eBay token refresh failed: ' . ebay_stringify($res['body']));
    }

    $entry = [
        'fp' => $fingerprint,
        'token' => (string) $data['access_token'],
        'expiresAt' => ebay_now_ms() + (float) ($data['expires_in'] ?? 7200) * 1000,
    ];
    $dir = dirname($file);
    if (is_dir($dir) || @mkdir($dir, 0700, true)) {
        $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
        if (@file_put_contents($tmp, json_encode($entry), LOCK_EX) !== false) {
            @chmod($tmp, 0600);
            if (!@rename($tmp, $file)) @unlink($tmp);
        }
    }
    return $entry['token'];
}

/* ───────────── Constructeurs de requêtes ───────────── */

/** Requête REST (équivalent d'ebayFetch). */
function ebay_rest_request(string $token, string $path, string $base = 'api', bool $marketplace = true): array
{
    $headers = ['Authorization: Bearer ' . $token, 'Accept: application/json'];
    if ($marketplace) $headers[] = 'X-EBAY-C-MARKETPLACE-ID: ' . ebay_marketplace_id();
    return ['method' => 'GET', 'url' => ($base === 'apiz' ? EBAY_BASE_Z : EBAY_BASE) . $path, 'headers' => $headers];
}

/** Requête Trading API (XML legacy). */
function ebay_trading_request(string $token, string $callName, string $bodyXml): array
{
    $envelope = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<{$callName}Request xmlns=\"urn:ebay:apis:eBLBaseComponents\">\n$bodyXml\n</{$callName}Request>";
    return [
        'method' => 'POST',
        'url' => 'https://api.ebay.com/ws/api.dll',
        'headers' => [
            'X-EBAY-API-IAF-TOKEN: ' . $token,
            'X-EBAY-API-SITEID: 2', // 2 = eBay Canada
            'X-EBAY-API-COMPATIBILITY-LEVEL: 1193',
            'X-EBAY-API-CALL-NAME: ' . $callName,
            'Content-Type: text/xml',
        ],
        'body' => $envelope,
    ];
}

/** Résultat REST → tableau décodé, ou exception comme ebayFetch. */
function ebay_json_or_throw(array $res): array
{
    if ($res['error'] !== null) throw new RuntimeException('fetch failed: ' . $res['error']);
    $text = $res['body'];
    $data = $text === '' ? [] : json_decode($text, true);
    if ($text !== '' && json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException('Unexpected non-JSON response from eBay (HTTP ' . $res['status'] . ')');
    }
    if ($res['status'] < 200 || $res['status'] >= 300) {
        throw new RuntimeException('eBay API ' . $res['status'] . ': ' . ebay_stringify($text));
    }
    return is_array($data) ? $data : [];
}

/** Résultat Trading API → texte XML (pas de vérification du statut, comme tradingCall). */
function ebay_trading_text(array $res): string
{
    if ($res['error'] !== null) throw new RuntimeException('fetch failed: ' . $res['error']);
    return $res['body'];
}

function ebay_xml_field(string $xml, string $tag): ?string
{
    $t = preg_quote($tag, '/');
    return preg_match('/<' . $t . '[^>]*>([^<]*)<\/' . $t . '>/', $xml, $m) ? $m[1] : null;
}

/* ───────────── Helpers façon JavaScript ───────────── */

/** new Date(ms).toISOString() */
function ebay_iso(float $ms): string
{
    $ms = floor($ms);
    $sec = (int) floor($ms / 1000);
    return gmdate('Y-m-d\TH:i:s', $sec) . sprintf('.%03dZ', (int) ($ms - $sec * 1000));
}

/** Date "YYYY-MM-DD" dans le fuseau demandé (null si la date est invalide). */
function ebay_local_date_from_iso(string $iso, string $tz = EBAY_TZ): ?string
{
    try {
        return (new DateTimeImmutable($iso))->setTimezone(new DateTimeZone($tz))->format('Y-m-d');
    } catch (Exception $e) {
        return null;
    }
}

function ebay_local_date_from_ms(float $ms, string $tz = EBAY_TZ): string
{
    return (new DateTimeImmutable('@' . (int) floor($ms / 1000)))->setTimezone(new DateTimeZone($tz))->format('Y-m-d');
}

/** Math.round() (demi vers +∞), rendu en entier JSON quand c'est possible. */
function ebay_round(float $x)
{
    return ebay_num(floor($x + 0.5));
}

/** Nombre JS : 12.0 → 12 (JSON sans « .0 »). */
function ebay_num($x)
{
    $f = (float) $x;
    if (is_finite($f) && floor($f) == $f && abs($f) < 9.0e15) return (int) $f;
    return $f;
}

function ebay_order_total(array $o): float
{
    return (float) ($o['pricingSummary']['total']['value'] ?? 0);
}

function ebay_sum_orders(array $orders): float
{
    $sum = 0.0;
    foreach ($orders as $o) $sum += ebay_order_total($o);
    return $sum;
}

function ebay_within_days(?string $iso, int $days, float $nowMs): bool
{
    if ($iso === null || $iso === '') return false;
    try {
        $d = new DateTimeImmutable($iso);
    } catch (Exception $e) {
        return false;
    }
    $ms = (float) $d->format('U') * 1000 + intdiv((int) $d->format('u'), 1000);
    return $ms >= $nowMs - $days * 24 * 3600 * 1000;
}

/** Liste de commandes d'une réponse fulfillment (tolérante aux réponses inattendues). */
function ebay_orders_of(array $data): array
{
    $orders = $data['orders'] ?? [];
    return is_array($orders) ? array_values(array_filter($orders, 'is_array')) : [];
}

/* ───────────── Résumé du dashboard ───────────── */

/**
 * Port de GET /api/ebay/summary :
 * { ...getSummary(), listings, orders, daily, feedback, traffic, returns }.
 * Lève une exception dans les mêmes cas que le Promise.all d'origine
 * (jeton, commandes récentes ou ventes journalières en échec).
 */
function ebay_dashboard_summary(): array
{
    $token = ebay_access_token();
    $now = ebay_now_ms();
    $mp = ebay_marketplace_id();
    $since30 = ebay_iso($now - 30 * 24 * 3600 * 1000);
    $since90 = ebay_iso($now - 90 * 24 * 3600 * 1000);
    $recentLimit = 12;
    $dailyDays = 30;
    $trafficDays = 90;

    $nowSec = (int) floor($now / 1000);
    $trafficQuery = http_build_query([
        'dimension' => 'DAY',
        'metric' => 'LISTING_VIEWS_SRP,LISTING_IMPRESSION_TOTAL',
        'marketplace_ids' => $mp,
        'date_from' => gmdate('Ymd', $nowSec - $trafficDays * 86400),
        'date_to' => gmdate('Ymd', $nowSec - 86400), // hier
    ]);

    $results = ebay_http_multi([
        'o30' => ebay_rest_request($token, "/sell/fulfillment/v1/order?limit=200&filter=creationdate:%5B{$since30}..%5D"),
        'o90' => ebay_rest_request($token, "/sell/fulfillment/v1/order?limit=200&filter=creationdate:%5B{$since90}..%5D"),
        'ship' => ebay_rest_request($token, '/sell/fulfillment/v1/order?limit=100&filter=orderfulfillmentstatus:%7BNOT_STARTED%7CIN_PROGRESS%7D'),
        'user' => ebay_rest_request($token, '/commerce/identity/v1/user/', 'apiz'),
        'recent' => ebay_rest_request($token, "/sell/fulfillment/v1/order?limit={$recentLimit}&filter=creationdate:%5B{$since30}..%5D"),
        // getDailyRevenue(30) : même requête que o30 dans la version Next.js, appel séparé conservé
        'daily' => ebay_rest_request($token, "/sell/fulfillment/v1/order?limit=200&filter=creationdate:%5B{$since30}..%5D"),
        'listings' => ebay_trading_request(
            $token,
            'GetMyeBaySelling',
            '<ActiveList><Include>true</Include><Pagination><EntriesPerPage>1</EntriesPerPage><PageNumber>1</PageNumber></Pagination></ActiveList>'
        ),
        'feedback' => ebay_trading_request($token, 'GetUser', '<DetailLevel>ReturnAll</DetailLevel>'),
        'traffic' => ebay_rest_request($token, '/sell/analytics/v1/traffic_report?' . $trafficQuery),
        'returns' => [
            'method' => 'GET',
            'url' => 'https://api.ebay.com/post-order/v2/return/search?role=SELLER&return_state=ACTIVE&limit=1',
            'headers' => ['Authorization: Bearer ' . $token, 'Accept: application/json', 'X-EBAY-C-MARKETPLACE-ID: ' . $mp],
        ],
    ]);

    // ---- getSummary (Promise.allSettled : les échecs donnent des listes vides) ----
    $settled = function (string $key) use ($results): ?array {
        try {
            return ebay_json_or_throw($results[$key]);
        } catch (Throwable $e) {
            return null;
        }
    };
    $r30 = $settled('o30');
    $r90 = $settled('o90');
    $rShip = $settled('ship');
    $u = $settled('user');
    $o30 = $r30 !== null ? ebay_orders_of($r30) : [];
    $o90 = $r90 !== null ? ebay_orders_of($r90) : [];
    $ship = $rShip !== null ? ebay_orders_of($rShip) : [];

    // "Aujourd'hui" en heure du Québec (America/Toronto), pas en UTC
    $today = ebay_local_date_from_ms($now);
    $todayOrders = array_values(array_filter($o30, fn ($o) => !empty($o['creationDate'])
        && ebay_local_date_from_iso((string) $o['creationDate']) === $today));
    $rev7Orders = array_filter($o30, fn ($o) => ebay_within_days(isset($o['creationDate']) ? (string) $o['creationDate'] : null, 7, $now));

    $user = null;
    if ($u !== null) {
        $user = [];
        if (isset($u['username'])) $user['username'] = $u['username'];
        if (isset($u['registrationMarketplaceId'])) $user['name'] = $u['registrationMarketplaceId'];
        $user = (object) $user;
    }

    $summary = [
        'user' => $user,
        'salesToday' => ebay_round(ebay_sum_orders($todayOrders)),
        'sales7d' => ebay_round(ebay_sum_orders($rev7Orders)),
        'sales30d' => ebay_round(ebay_sum_orders($o30)),
        'sales90d' => ebay_round(ebay_sum_orders($o90)),
        'ordersCount30d' => count($o30),
        'ordersCount90d' => count($o90),
        'awaitingShipCount' => count($ship),
        'ordersToday' => count($todayOrders),
        'lastSync' => ebay_iso(ebay_now_ms()),
    ];

    // ---- getRecentOrders(12) : lève une exception en cas d'échec ----
    $recentData = ebay_json_or_throw($results['recent']);
    $orders = [];
    foreach (array_slice(ebay_orders_of($recentData), 0, $recentLimit) as $o) {
        $row = [];
        if (isset($o['orderId'])) $row['id'] = $o['orderId'];
        if (isset($o['creationDate'])) $row['date'] = $o['creationDate'];
        if (isset($o['orderFulfillmentStatus'])) $row['status'] = $o['orderFulfillmentStatus'];
        if (isset($o['buyer']['username'])) $row['buyer'] = $o['buyer']['username'];
        $row['total'] = ebay_num(ebay_order_total($o));
        if (isset($o['pricingSummary']['total']['currency'])) $row['currency'] = $o['pricingSummary']['total']['currency'];
        $items = [];
        foreach ((isset($o['lineItems']) && is_array($o['lineItems']) ? $o['lineItems'] : []) as $l) {
            if (!is_array($l)) continue;
            $item = [];
            if (isset($l['title'])) $item['title'] = $l['title'];
            if (isset($l['quantity'])) $item['quantity'] = $l['quantity'];
            $item['price'] = ebay_num((float) ($l['total']['value'] ?? 0));
            $legacy = $l['legacyItemId'] ?? null;
            if ($legacy !== null) $item['itemId'] = $legacy;
            $item['url'] = ($legacy !== null && $legacy !== '') ? 'https://www.ebay.ca/itm/' . $legacy : null;
            $items[] = $item;
        }
        $row['items'] = $items;
        $orders[] = $row;
    }

    // ---- getDailyRevenue(30) : lève une exception en cas d'échec ----
    $dailyData = ebay_json_or_throw($results['daily']);
    $byDay = [];
    foreach (ebay_orders_of($dailyData) as $o) {
        if (empty($o['creationDate'])) continue;
        $d = ebay_local_date_from_iso((string) $o['creationDate']);
        if ($d === null) continue;
        $byDay[$d] = ($byDay[$d] ?? 0) + ebay_order_total($o);
    }
    $daily = [];
    for ($i = $dailyDays - 1; $i >= 0; $i--) {
        $d = ebay_local_date_from_ms($now - $i * 24 * 3600 * 1000);
        $daily[] = [$d, ebay_num(floor(($byDay[$d] ?? 0) * 100 + 0.5) / 100)];
    }

    // ---- getActiveListingsCount : Trading API, puis repli REST (offres) ----
    $listings = null;
    try {
        $xml = ebay_trading_text($results['listings']);
        $total = (int) (ebay_xml_field($xml, 'TotalNumberOfEntries') ?? '0');
        if ($total > 0) $listings = $total;
    } catch (Throwable $e) {
        /* repli */
    }
    if ($listings === null) {
        try {
            $data = ebay_json_or_throw(ebay_http_multi([
                'offer' => ebay_rest_request($token, '/sell/inventory/v1/offer?limit=1'),
            ])['offer']);
            $listings = isset($data['total']) ? ebay_num($data['total']) : 0;
        } catch (Throwable $e) {
            $listings = 0;
        }
    }

    // ---- getFeedbackSummary ----
    try {
        $xml = ebay_trading_text($results['feedback']);
        $feedback = [
            'score' => (int) (ebay_xml_field($xml, 'FeedbackScore') ?? '0'),
            'positivePercent' => ebay_num((float) (ebay_xml_field($xml, 'PositiveFeedbackPercent') ?? '0')),
            'uniqueNegative' => (int) (ebay_xml_field($xml, 'UniqueNegativeFeedbackCount') ?? '0'),
            'uniqueNeutral' => (int) (ebay_xml_field($xml, 'UniqueNeutralFeedbackCount') ?? '0'),
            'uniquePositive' => (int) (ebay_xml_field($xml, 'UniquePositiveFeedbackCount') ?? '0'),
        ];
    } catch (Throwable $e) {
        error_log('[eBay] getFeedbackSummary failed: ' . $e->getMessage());
        $feedback = ['score' => 0, 'positivePercent' => 0, 'uniqueNegative' => 0, 'uniqueNeutral' => 0, 'uniquePositive' => 0];
    }

    // ---- getTrafficReport(90) ----
    try {
        $data = ebay_json_or_throw($results['traffic']);
        $views = 0.0;
        $impressions = 0.0;
        foreach ((isset($data['records']) && is_array($data['records']) ? $data['records'] : []) as $rec) {
            foreach ((is_array($rec) && isset($rec['metrics']) && is_array($rec['metrics']) ? $rec['metrics'] : []) as $m) {
                if (!is_array($m)) continue;
                $key = $m['metricKey'] ?? null;
                if ($key === 'LISTING_VIEWS_SRP') $views += (float) ($m['value'] ?? 0);
                if ($key === 'LISTING_IMPRESSION_TOTAL') $impressions += (float) ($m['value'] ?? 0);
            }
        }
        $traffic = ['views' => ebay_num($views), 'impressions' => ebay_num($impressions)];
    } catch (Throwable $e) {
        error_log('[eBay] getTrafficReport failed: ' . $e->getMessage());
        $traffic = ['views' => 0, 'impressions' => 0];
    }

    // ---- getActiveReturnsCount (Post-Order API) ----
    $returns = 0;
    $rr = $results['returns'];
    if ($rr['error'] === null && $rr['status'] >= 200 && $rr['status'] < 300) {
        $d = json_decode($rr['body'], true);
        if (is_array($d)) {
            if (isset($d['total'])) {
                $returns = ebay_num($d['total']);
            } elseif (isset($d['members']) && is_array($d['members'])) {
                $returns = count($d['members']);
            }
        }
    }

    return $summary + [
        'listings' => $listings,
        'orders' => $orders,
        'daily' => $daily,
        'feedback' => $feedback,
        'traffic' => $traffic,
        'returns' => $returns,
    ];
}
