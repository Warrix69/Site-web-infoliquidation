<?php
/**
 * /api/templates — modèles de courriels de l'onglet Relance (réservé à l'admin connecté).
 * Enregistrés dans storage/email_templates.json (0600), partagés par toute l'équipe.
 *
 * GET  → { templates: {id: {name, subject, body, updatedAt}}, hidden: {id: date} }
 *        (templates : modèles créés ou modifiés ; hidden : modèles d'origine retirés)
 * POST { action: "save", id?: string, template: {name, subject, body} } → { ok, id, template }
 * POST { action: "delete", id } → { ok }
 * POST { action: "restore", id } → { ok }   (remet un modèle d'origine tel quel)
 */

require_once dirname(__DIR__) . '/lib/admin_auth.php';
require_once dirname(__DIR__) . '/lib/validation.php';

admin_require_api();

const TPL_ID_RE = '/^[a-z0-9][a-z0-9\-]{0,59}$/';

function templates_file(): string
{
    $base = defined('STORAGE_DIR') ? STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
    return $base . '/email_templates.json';
}

function templates_normalize($d): array
{
    return [
        'templates' => is_array($d['templates'] ?? null) ? $d['templates'] : [],
        'hidden' => is_array($d['hidden'] ?? null) ? $d['hidden'] : [],
    ];
}

/** Lecture-modification-écriture sous verrou exclusif. */
function templates_update(callable $fn): bool
{
    $file = templates_file();
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return false;
    $fh = @fopen($file, 'c+');
    if ($fh === false) return false;
    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $store = $fn(templates_normalize(is_string($raw) && $raw !== '' ? json_decode($raw, true) : null));
        $json = json_encode($store, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) return false;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, $json);
        fflush($fh);
        @chmod($file, 0600);
        return true;
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

/** Texte nettoyé : sans caractères de contrôle (sauf retours de ligne si $multiline), coupé à $max. */
function templates_clean($v, int $max, bool $multiline = false): string
{
    if (!is_string($v)) return '';
    $v = mb_scrub($v, 'UTF-8');
    $v = $multiline ? preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', str_replace("\r\n", "\n", $v)) : preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v);
    return mb_substr(trim((string) $v), 0, $max, 'UTF-8');
}

$method = request_method();
if ($method === 'GET') {
    $file = templates_file();
    json_response(templates_normalize(is_file($file) ? json_decode((string) @file_get_contents($file), true) : null));
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
if ($id !== '' && !preg_match(TPL_ID_RE, $id)) json_response(['error' => 'Identifiant invalide'], 400);
$storageError = fn () => json_response(['error' => 'Enregistrement impossible : le dossier storage/ n\'est pas inscriptible.'], 500);

if ($action === 'save') {
    $t = is_array($body['template'] ?? null) ? $body['template'] : [];
    $tpl = [
        'name' => templates_clean($t['name'] ?? '', 60),
        'subject' => templates_clean($t['subject'] ?? '', 200),
        'body' => templates_clean($t['body'] ?? '', 10000, true),
    ];
    if ($tpl['name'] === '') json_response(['error' => 'Donne un nom au modèle.'], 400);
    if ($tpl['subject'] === '') json_response(['error' => 'L\'objet du courriel est obligatoire.'], 400);
    if ($tpl['body'] === '') json_response(['error' => 'Le message est obligatoire.'], 400);
    $isNew = $id === '';
    if ($isNew) $id = 'tpl-' . bin2hex(random_bytes(5));
    $tpl['updatedAt'] = date('c');
    if (!templates_update(function (array $s) use ($id, $tpl) {
        $s['templates'][$id] = $tpl;
        unset($s['hidden'][$id]);
        return $s;
    })) $storageError();
    security_log('email_template_saved', ['outcome' => 'success', 'new' => $isNew]);
    json_response(['ok' => true, 'id' => $id, 'template' => $tpl]);
}

if ($action === 'delete' || $action === 'restore') {
    if ($id === '') json_response(['error' => 'Identifiant manquant'], 400);
    if (!templates_update(function (array $s) use ($id, $action) {
        unset($s['templates'][$id]);
        if ($action === 'delete') $s['hidden'][$id] = date('c');
        else unset($s['hidden'][$id]);
        return $s;
    })) $storageError();
    security_log('email_template_' . ($action === 'delete' ? 'deleted' : 'restored'), ['outcome' => 'success']);
    json_response(['ok' => true]);
}

json_response(['error' => 'Action inconnue'], 400);
