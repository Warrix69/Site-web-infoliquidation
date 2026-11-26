<?php
/**
 * /api/prospects — prospects de l'onglet Prospection (réservé à l'admin connecté).
 * Enregistrés dans storage/prospects.json (0600), partagés par toute l'équipe.
 *
 * GET  → { prospects: [ {id, name, contact, phone, email, status, source, lastContact, nextFollowup, notes, createdAt, updatedAt} ] }
 * POST { action: "save", id?: string, prospect: {...} } → { ok, prospect }
 *        sans id : nouveau prospect ; avec id : seuls les champs envoyés sont modifiés
 * POST { action: "delete", id } → { ok }
 */

require_once dirname(__DIR__) . '/lib/admin_auth.php';
require_once dirname(__DIR__) . '/lib/validation.php';

admin_require_api();

const PR_ID_RE = '/^pr-?[a-z0-9]{6,24}$/';
const PR_STATUSES = ['new', 'contacted', 'followup', 'converted'];

function prospects_file(): string
{
    $base = defined('STORAGE_DIR') ? STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
    return $base . '/prospects.json';
}

function prospects_read(): array
{
    $file = prospects_file();
    $d = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
    return is_array($d['prospects'] ?? null) ? $d['prospects'] : [];
}

/** Lecture-modification-écriture sous verrou ; $fn reçoit et retourne [prospects, résultat]. */
function prospects_update(callable $fn): array
{
    $file = prospects_file();
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return [false, null];
    $fh = @fopen($file, 'c+');
    if ($fh === false) return [false, null];
    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $d = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
        [$list, $result] = $fn(is_array($d['prospects'] ?? null) ? $d['prospects'] : []);
        $json = json_encode(['prospects' => $list], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) return [false, null];
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, $json);
        fflush($fh);
        @chmod($file, 0600);
        return [true, $result];
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

function prospects_clean($v, int $max, bool $multiline = false): string
{
    if (!is_string($v)) return '';
    $v = mb_scrub($v, 'UTF-8');
    $v = $multiline ? preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', str_replace("\r\n", "\n", $v)) : preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v);
    return mb_substr(trim((string) $v), 0, $max, 'UTF-8');
}

/**
 * Valide seulement les champs présents dans $in (modification partielle possible).
 * @return array{ok: true, fields: array}|array{ok: false, error: string}
 */
function prospects_validate(array $in, bool $isNew): array
{
    $out = [];
    $date = function ($v): ?string {
        $v = is_string($v) ? trim($v) : '';
        if ($v === '') return '';
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) return null;
        return $v;
    };
    if ($isNew || array_key_exists('name', $in)) {
        $out['name'] = prospects_clean($in['name'] ?? '', 150);
        if ($out['name'] === '') return ['ok' => false, 'error' => 'Indique le nom de l\'entreprise.'];
    }
    foreach (['contact' => 120, 'phone' => 40, 'source' => 60] as $k => $max) {
        if ($isNew || array_key_exists($k, $in)) $out[$k] = prospects_clean($in[$k] ?? '', $max);
    }
    if ($isNew || array_key_exists('email', $in)) {
        $out['email'] = prospects_clean($in['email'] ?? '', 160);
        if ($out['email'] !== '' && filter_var($out['email'], FILTER_VALIDATE_EMAIL) === false) {
            return ['ok' => false, 'error' => 'Adresse courriel invalide.'];
        }
    }
    if ($isNew || array_key_exists('notes', $in)) $out['notes'] = prospects_clean($in['notes'] ?? '', 2000, true);
    if ($isNew || array_key_exists('status', $in)) {
        $st = is_string($in['status'] ?? null) ? $in['status'] : 'new';
        $out['status'] = in_array($st, PR_STATUSES, true) ? $st : 'new';
    }
    foreach (['lastContact', 'nextFollowup'] as $k) {
        if ($isNew || array_key_exists($k, $in)) {
            $d = $date($in[$k] ?? '');
            if ($d === null) return ['ok' => false, 'error' => 'Date invalide.'];
            $out[$k] = $d;
        }
    }
    return ['ok' => true, 'fields' => $out];
}

$method = request_method();
if ($method === 'GET') {
    $list = array_values(prospects_read());
    json_response(['prospects' => $list]);
}
if ($method !== 'POST') {
    header('Allow: GET, POST');
    json_response(['error' => 'Méthode non permise'], 405);
}

$input = read_json_input();
if (!$input['ok']) json_response(['error' => 'Requête invalide'], !empty($input['tooLarge']) ? 413 : 400);
$body = json_decode((string) json_encode($input['value']), true);
if (!is_array($body)) json_response(['error' => 'Requête invalide'], 400);
$action = is_string($body['action'] ?? null) ? $body['action'] : '';
$id = is_string($body['id'] ?? null) ? strtolower(trim($body['id'])) : '';
if ($id !== '' && !preg_match(PR_ID_RE, $id)) json_response(['error' => 'Identifiant invalide'], 400);
$storageError = fn () => json_response(['error' => 'Enregistrement impossible : le dossier storage/ n\'est pas inscriptible.'], 500);

if ($action === 'save') {
    $isNew = $id === '';
    $check = prospects_validate(is_array($body['prospect'] ?? null) ? $body['prospect'] : [], $isNew);
    if (!$check['ok']) json_response(['error' => $check['error']], 400);
    $now = date('c');
    if ($isNew) $id = 'pr-' . bin2hex(random_bytes(6));
    [$ok, $result] = prospects_update(function (array $list) use ($id, $isNew, $check, $now) {
        if ($isNew) {
            $p = ['id' => $id] + $check['fields'] + ['createdAt' => $now, 'updatedAt' => $now];
            $list[$id] = $p;
            return [$list, $p];
        }
        if (!isset($list[$id])) return [$list, null];
        $list[$id] = array_merge($list[$id], $check['fields'], ['id' => $id, 'updatedAt' => $now]);
        return [$list, $list[$id]];
    });
    if (!$ok) $storageError();
    if ($result === null) json_response(['error' => 'Prospect introuvable'], 404);
    security_log('prospect_saved', ['outcome' => 'success', 'new' => $isNew]);
    json_response(['ok' => true, 'prospect' => $result]);
}

if ($action === 'delete') {
    if ($id === '') json_response(['error' => 'Identifiant manquant'], 400);
    [$ok, $found] = prospects_update(function (array $list) use ($id) {
        $found = isset($list[$id]);
        unset($list[$id]);
        return [$list, $found];
    });
    if (!$ok) $storageError();
    if (!$found) json_response(['error' => 'Prospect introuvable'], 404);
    security_log('prospect_deleted', ['outcome' => 'success']);
    json_response(['ok' => true]);
}

json_response(['error' => 'Action inconnue'], 400);
