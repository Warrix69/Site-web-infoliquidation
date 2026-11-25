<?php
/**
 * /api/calendar/events — port de src/app/api/calendar/events/route.ts.
 *
 * GET  ?from=2026-10-08&to=2026-10-15 → { events, from, to, count } (défaut : aujourd'hui → +30 jours)
 * POST { summary, description?, location?, start, end, attendees? } → { event }
 * Erreurs : 400 { error } (paramètres), 500 { error } (Google), 401/503 (admin).
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';
require_once dirname(__DIR__, 2) . '/lib/validation.php';
require_once dirname(__DIR__, 2) . '/lib/google_calendar.php';

$method = request_method();
if ($method !== 'GET' && $method !== 'POST') {
    http_response_code(405);
    header('Allow: GET, POST');
    exit;
}

// Défense en profondeur (le contrôleur frontal vérifie déjà la session)
admin_require_api();

/** Instant + N millisecondes (arithmétique exacte comme en JS, sans effet d'heure d'été). */
function cal_add_ms(DateTimeImmutable $d, int $ms): DateTimeImmutable
{
    $totalUs = (int) $d->format('U') * 1000000 + (int) $d->format('u') + $ms * 1000;
    $sec = intdiv($totalUs, 1000000);
    $us = $totalUs % 1000000;
    if ($us < 0) { $us += 1000000; $sec -= 1; }
    $r = DateTimeImmutable::createFromFormat('U.u', sprintf('%d.%06d', $sec, $us));
    return $r->setTimezone($d->getTimezone());
}

function cal_ms(DateTimeImmutable $d): float
{
    return (float) $d->format('U') * 1000 + intdiv((int) $d->format('u'), 1000);
}

/** Format simple pour le dashboard (clés absentes omises, comme undefined en JSON). */
function cal_normalize_event($e): array
{
    $start = $e->start ?? null;
    $end = $e->end ?? null;
    $out = [];
    if (isset($e->id)) $out['id'] = $e->id;
    $out['title'] = $e->summary ?? '(Sans titre)';
    $out['description'] = $e->description ?? '';
    $out['location'] = $e->location ?? '';
    $out['start'] = $start->dateTime ?? $start->date ?? null;
    $out['end'] = $end->dateTime ?? $end->date ?? null;
    $out['allDay'] = empty($start->dateTime);
    if (isset($e->status)) $out['status'] = $e->status; // confirmed / tentative / cancelled
    if (isset($e->htmlLink)) $out['htmlLink'] = $e->htmlLink;
    $attendees = [];
    foreach ((isset($e->attendees) && is_array($e->attendees) ? $e->attendees : []) as $a) {
        $item = [];
        if (isset($a->email)) $item['email'] = $a->email;
        if (isset($a->displayName)) $item['name'] = $a->displayName;
        $attendees[] = (object) $item;
    }
    $out['attendees'] = $attendees;
    return $out;
}

if ($method === 'GET') {
    try {
        $fromParam = isset($_GET['from']) && is_string($_GET['from']) ? $_GET['from'] : '';
        $toParam = isset($_GET['to']) && is_string($_GET['to']) ? $_GET['to'] : '';

        $from = $fromParam !== '' ? js_date_parse($fromParam) : new DateTimeImmutable('today');
        $to = $toParam !== '' ? js_date_parse($toParam) : ($from ? cal_add_ms($from, 30 * 24 * 60 * 60 * 1000) : null);

        if ($from === null || $to === null) {
            json_response(['error' => 'Invalid from/to date'], 400);
        }
        if (cal_ms($to) - cal_ms($from) > 400 * 24 * 60 * 60 * 1000) {
            json_response(['error' => 'Date range too large'], 400);
        }

        $items = google_list_events($from, $to, 250);
        $events = array_map('cal_normalize_event', $items);

        json_response(
            ['events' => $events, 'from' => js_iso($from), 'to' => js_iso($to), 'count' => count($events)],
            200,
            // Pas de cache : on veut la donnée fraîche à chaque appel
            ['Cache-Control' => 'no-store, max-age=0, must-revalidate']
        );
    } catch (Throwable $err) {
        json_response(['error' => google_describe_error($err)], 500);
    }
}

// POST : création d'un événement
try {
    $input = read_json_input();
    if (!empty($input['tooLarge'])) json_response(['error' => 'Payload too large'], 413);
    $b = $input['ok'] ? $input['value'] : null;
    $valid = is_object($b);
    $data = [];

    if ($valid) {
        $summary = zv_get($b, 'summary');
        $valid = is_string($summary) && ($len = js_strlen(js_trim($summary))) >= 1 && $len <= 300;
        if ($valid) $data['summary'] = js_trim($summary);
    }
    foreach (['description' => 8000, 'location' => 500] as $key => $max) {
        if (!$valid || !zv_has($b, $key)) continue;
        $v = zv_get($b, $key);
        $valid = is_string($v) && js_strlen($v) <= $max;
        if ($valid) $data[$key] = $v;
    }
    foreach (['start', 'end'] as $key) {
        if (!$valid) break;
        $v = zv_get($b, $key);
        $d = is_string($v) && js_strlen($v) <= 64 ? js_date_parse($v) : null;
        $valid = $d !== null;
        if ($valid) $data[$key] = $d;
    }
    if ($valid && zv_has($b, 'attendees')) {
        $list = zv_get($b, 'attendees');
        $valid = is_array($list) && count($list) <= 20;
        $emails = [];
        foreach (($valid ? $list : []) as $email) {
            if (!is_string($email) || !is_zod_email(js_trim($email))) { $valid = false; break; }
            $emails[] = js_trim($email);
        }
        if ($valid) $data['attendees'] = $emails;
    }

    if (!$valid) {
        json_response(['error' => 'Invalid body: summary / start / end required'], 400);
    }

    $event = google_create_event($data);
    security_log('calendar_create', ['outcome' => 'success', 'who' => 'admin', 'event_id' => is_object($event) && isset($event->id) ? (string) $event->id : null]);
    json_response(['event' => $event]);
} catch (Throwable $err) {
    json_response(['error' => google_describe_error($err)], 500);
}
