<?php
/**
 * /api/clients — fiches clients modifiées dans l'admin (réservé à l'admin connecté).
 *
 * GET  → { clients: {id: fiche}, deleted: {id: date} }
 * POST { action: "save", id?: string, client: {name, type, phone, email, address, notes} }
 *        → { ok: true, id, client }   (sans id : nouveau client)
 * POST { action: "delete", id } → { ok: true }
 * POST { action: "restore", id } → { ok: true }
 * Les ramassages dans Google Calendar ne sont jamais modifiés.
 */

require_once dirname(__DIR__) . '/lib/admin_auth.php';
require_once dirname(__DIR__) . '/lib/clients_store.php';
require_once dirname(__DIR__) . '/lib/validation.php';

// Défense en profondeur (le contrôleur frontal vérifie déjà la session ; POST : même origine + JSON)
admin_require_api();

$method = request_method();
if ($method === 'GET') {
    json_response(clients_store_read());
}
if ($method !== 'POST') {
    header('Allow: GET, POST');
    json_response(['error' => 'Méthode non permise'], 405);
}

// Corps JSON limité en taille (lecteur commun des API), converti en tableau associatif
$input = read_json_input();
if (!$input['ok']) json_response(['error' => 'Requête invalide'], !empty($input['tooLarge']) ? 413 : 400);
$body = json_decode((string) json_encode($input['value']), true);
if (!is_array($body)) json_response(['error' => 'Requête invalide'], 400);
$action = is_string($body['action'] ?? null) ? $body['action'] : '';
$id = is_string($body['id'] ?? null) ? strtolower(trim($body['id'])) : '';
if ($id !== '' && !preg_match(CLIENT_ID_RE, $id)) json_response(['error' => 'Identifiant invalide'], 400);

if ($action === 'save') {
    $check = clients_validate(is_array($body['client'] ?? null) ? $body['client'] : []);
    if (!$check['ok']) json_response(['error' => $check['error']], 400);
    $client = $check['client'];
    $isNew = $id === '';
    if ($isNew) $id = 'cl-' . bin2hex(random_bytes(6));
    $created = is_string($body['client']['created'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $body['client']['created'])
        ? $body['client']['created'] : date('Y-m-d');
    $ok = clients_store_update(function (array $s) use ($id, $client, $created) {
        $client['created'] = $s['clients'][$id]['created'] ?? $created;
        $s['clients'][$id] = $client;
        unset($s['deleted'][$id]);
        return $s;
    });
    if (!$ok) json_response(['error' => 'Enregistrement impossible : le dossier storage/ n\'est pas inscriptible.'], 500);
    security_log('client_saved', ['outcome' => 'success', 'new' => $isNew]);
    json_response(['ok' => true, 'id' => $id, 'client' => $client]);
}

if ($action === 'delete' || $action === 'restore') {
    if ($id === '') json_response(['error' => 'Identifiant manquant'], 400);
    $ok = clients_store_update(function (array $s) use ($id, $action) {
        if ($action === 'delete') {
            $s['deleted'][$id] = date('c');
            unset($s['clients'][$id]);
        } else {
            unset($s['deleted'][$id]);
        }
        return $s;
    });
    if (!$ok) json_response(['error' => 'Enregistrement impossible : le dossier storage/ n\'est pas inscriptible.'], 500);
    security_log('client_' . ($action === 'delete' ? 'deleted' : 'restored'), ['outcome' => 'success']);
    json_response(['ok' => true]);
}

json_response(['error' => 'Action inconnue'], 400);
