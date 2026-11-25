<?php
/**
 * /api/calendar/events/{id} — port de src/app/api/calendar/events/[id]/route.ts.
 * Le contrôleur frontal fournit l'identifiant dans $ROUTE_PARAMS['id'].
 *
 * PATCH  { summary?, description?, location?, start?, end?, status? } → { event }
 * DELETE → { ok: true }
 * Erreurs : 400 { error: "Invalid request" | "Invalid id" }, 500 { error } (Google), 401/503 (admin).
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';
require_once dirname(__DIR__, 2) . '/lib/validation.php';
require_once dirname(__DIR__, 2) . '/lib/google_calendar.php';

$method = request_method();
if ($method !== 'PATCH' && $method !== 'DELETE') {
    http_response_code(405);
    header('Allow: PATCH, DELETE');
    exit;
}

// Défense en profondeur (le contrôleur frontal vérifie déjà la session)
admin_require_api();

$eventId = $ROUTE_PARAMS['id'] ?? null;
// Alphabet des identifiants Google (base32hex, plus _ des occurrences récurrentes « abc_20261125T150000Z ») ;
// aucun point : « . » / « .. » ne doivent jamais remonter jusqu'au calendrier lui-même
$idValid = is_string($eventId) && preg_match('/^[A-Za-z0-9_@\-]{1,1024}$/D', $eventId) === 1;

if ($method === 'PATCH') {
    try {
        $input = read_json_input();
        if (!empty($input['tooLarge'])) json_response(['error' => 'Payload too large'], 413);
        $b = $input['ok'] ? $input['value'] : null;
        $valid = is_object($b);
        $requestBody = [];

        if ($valid && zv_has($b, 'summary')) {
            $v = zv_get($b, 'summary');
            $valid = is_string($v) && ($len = js_strlen(js_trim($v))) >= 1 && $len <= 300;
            if ($valid) $requestBody['summary'] = js_trim($v);
        }
        foreach (['description' => 8000, 'location' => 500] as $key => $max) {
            if (!$valid || !zv_has($b, $key)) continue;
            $v = zv_get($b, $key);
            $valid = is_string($v) && js_strlen($v) <= $max;
            if ($valid) $requestBody[$key] = $v;
        }
        foreach (['start', 'end'] as $key) {
            if (!$valid || !zv_has($b, $key)) continue;
            $v = zv_get($b, $key);
            $d = is_string($v) && js_strlen($v) <= 64 ? js_date_parse($v) : null;
            $valid = $d !== null;
            if ($valid) $requestBody[$key] = ['dateTime' => js_iso($d)];
        }
        if ($valid && zv_has($b, 'status')) {
            $v = zv_get($b, 'status');
            $valid = is_string($v) && in_array($v, ['confirmed', 'tentative', 'cancelled'], true);
            if ($valid) $requestBody['status'] = $v; // confirmed, tentative, cancelled
        }

        if (!$idValid || !$valid) {
            json_response(['error' => 'Invalid request'], 400);
        }

        $event = google_calendar_request('PATCH', google_calendar_path($eventId), null, (object) $requestBody);
        security_log('calendar_update', ['outcome' => 'success', 'who' => 'admin', 'event_id' => $eventId]);
        json_response(['event' => $event]);
    } catch (Throwable $err) {
        json_response(['error' => google_describe_error($err)], 500);
    }
}

// DELETE
try {
    if (!$idValid) json_response(['error' => 'Invalid id'], 400);
    google_calendar_request('DELETE', google_calendar_path($eventId));
    security_log('calendar_delete', ['outcome' => 'success', 'who' => 'admin', 'event_id' => $eventId]);
    json_response(['ok' => true]);
} catch (Throwable $err) {
    json_response(['error' => google_describe_error($err)], 500);
}
