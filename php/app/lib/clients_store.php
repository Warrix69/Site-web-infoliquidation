<?php
/**
 * Fiches clients modifiées dans l'admin (storage/clients.json, 0600).
 *
 * La liste des clients de l'admin est reconstruite à partir des événements Google Calendar.
 * Ce fichier garde par-dessus ce que l'équipe a changé :
 *   - clients : fiches modifiées ou créées à la main  { id: {name, type, phone, email, address, notes, created} }
 *   - deleted : clients supprimés de la liste          { id: date }
 * Les ramassages dans Google Calendar ne sont jamais touchés.
 */

const CLIENT_TYPES = ['résidentiel', 'commercial', 'institutionnel'];
const CLIENT_ID_RE = '/^[a-z0-9][a-z0-9\-]{0,99}$/';

function clients_store_file(): string
{
    $base = defined('STORAGE_DIR') ? STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
    return $base . '/clients.json';
}

/** @return array{clients: array<string, array>, deleted: array<string, string>} */
function clients_store_read(): array
{
    $empty = ['clients' => [], 'deleted' => []];
    $file = clients_store_file();
    if (!is_file($file)) return $empty;
    $data = json_decode((string) @file_get_contents($file), true);
    if (!is_array($data)) return $empty;
    return [
        'clients' => is_array($data['clients'] ?? null) ? $data['clients'] : [],
        'deleted' => is_array($data['deleted'] ?? null) ? $data['deleted'] : [],
    ];
}

/**
 * Lit, modifie et réécrit le fichier sous verrou (deux personnes qui enregistrent
 * en même temps ne s'écrasent pas). $fn reçoit le contenu et le retourne modifié.
 */
function clients_store_update(callable $fn): bool
{
    $file = clients_store_file();
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return false;
    $fh = @fopen($file, 'c+');
    if ($fh === false) return false;
    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $data = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
        $store = [
            'clients' => is_array($data['clients'] ?? null) ? $data['clients'] : [],
            'deleted' => is_array($data['deleted'] ?? null) ? $data['deleted'] : [],
        ];
        $store = $fn($store);
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

/** Texte nettoyé : sans caractères de contrôle, coupé à $max caractères. */
function clients_clean(mixed $v, int $max, bool $multiline = false): string
{
    if (!is_string($v)) return '';
    $v = mb_scrub($v, 'UTF-8');
    $v = $multiline
        ? preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $v)
        : preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v);
    return mb_substr(trim((string) $v), 0, $max, 'UTF-8');
}

/**
 * Valide une fiche envoyée par l'admin.
 * @return array{ok: true, client: array}|array{ok: false, error: string}
 */
function clients_validate(array $in): array
{
    $name = clients_clean($in['name'] ?? '', 120);
    if ($name === '') return ['ok' => false, 'error' => 'Le nom du client est obligatoire.'];
    $email = clients_clean($in['email'] ?? '', 160);
    if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        return ['ok' => false, 'error' => 'Le courriel n\'est pas valide.'];
    }
    $type = clients_clean($in['type'] ?? '', 20);
    if (!in_array($type, CLIENT_TYPES, true)) $type = 'résidentiel';
    return ['ok' => true, 'client' => [
        'name' => $name,
        'type' => $type,
        'phone' => clients_clean($in['phone'] ?? '', 40),
        'email' => $email,
        'address' => clients_clean($in['address'] ?? '', 250),
        'notes' => clients_clean($in['notes'] ?? '', 2000, true),
    ]];
}
