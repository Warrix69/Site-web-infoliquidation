<?php
/**
 * Certificats de destruction des données (storage/certificates.json, 0600).
 *
 * Contenu : { certificates: [ {id, numero, clientId, compagnie, adresse, courriel, nbDisques,
 *             dateDestruction, dateEmission, createdAt, updatedAt, envois: [{to, at}]} ],
 *             counters: { "2026": 12 } }
 * Numéro : ILR-AAAA-NNNN, attribué par le serveur à l'enregistrement. Le compteur ne recule
 * jamais (un numéro supprimé n'est jamais réutilisé).
 */

const CERT_PREFIX = 'ILR';
const CERT_ID_RE = '/^crt-[a-f0-9]{12}$/';

function certificates_file(): string
{
    $base = defined('STORAGE_DIR') ? STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
    return $base . '/certificates.json';
}

/** @return array{certificates: array<int, array>, counters: array<string, int>} */
function certificates_normalize($data): array
{
    return [
        'certificates' => is_array($data['certificates'] ?? null) ? array_values($data['certificates']) : [],
        'counters' => is_array($data['counters'] ?? null) ? $data['counters'] : [],
    ];
}

function certificates_read(): array
{
    $file = certificates_file();
    if (!is_file($file)) return certificates_normalize(null);
    return certificates_normalize(json_decode((string) @file_get_contents($file), true));
}

/**
 * Lit, modifie et réécrit le fichier sous verrou exclusif.
 * $fn reçoit le contenu et retourne [contenu modifié, résultat].
 * @return array{0: bool, 1: mixed} [succès, résultat de $fn]
 */
function certificates_update(callable $fn): array
{
    $file = certificates_file();
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return [false, null];
    $fh = @fopen($file, 'c+');
    if ($fh === false) return [false, null];
    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $store = certificates_normalize(is_string($raw) && $raw !== '' ? json_decode($raw, true) : null);
        [$store, $result] = $fn($store);
        $json = json_encode($store, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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

/** Prochain numéro pour l'année, sans le réserver (aperçu dans l'admin). */
function certificates_next_numero(array $store, string $year): string
{
    $last = (int) ($store['counters'][$year] ?? 0);
    // Sécurité : jamais en dessous d'un numéro déjà présent dans la liste
    foreach ($store['certificates'] as $c) {
        if (preg_match('/^' . CERT_PREFIX . '-' . $year . '-(\d+)$/', (string) ($c['numero'] ?? ''), $m)) {
            $last = max($last, (int) $m[1]);
        }
    }
    return sprintf('%s-%s-%04d', CERT_PREFIX, $year, $last + 1);
}

function certificates_valid_date(string $d): bool
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m)) return false;
    return checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
}

/**
 * Valide les champs envoyés par l'admin.
 * @return array{ok: true, fields: array}|array{ok: false, error: string}
 */
function certificates_validate(array $in): array
{
    $clean = function ($v, int $max): string {
        if (!is_string($v)) return '';
        $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', mb_scrub($v, 'UTF-8'));
        return mb_substr(trim((string) $v), 0, $max, 'UTF-8');
    };
    $compagnie = $clean($in['compagnie'] ?? '', 150);
    if ($compagnie === '') return ['ok' => false, 'error' => 'Le nom de la compagnie est obligatoire.'];
    $nb = $in['nbDisques'] ?? null;
    $nb = is_numeric($nb) ? (int) $nb : 0;
    if ($nb < 1 || $nb > 100000) return ['ok' => false, 'error' => 'Le nombre de disques durs doit être entre 1 et 100 000.'];
    $dDest = $clean($in['dateDestruction'] ?? '', 10);
    $dEmis = $clean($in['dateEmission'] ?? '', 10);
    if (!certificates_valid_date($dDest)) return ['ok' => false, 'error' => 'La date de destruction n\'est pas valide.'];
    if (!certificates_valid_date($dEmis)) return ['ok' => false, 'error' => 'La date d\'émission n\'est pas valide.'];
    if ($dEmis < $dDest) return ['ok' => false, 'error' => 'La date d\'émission ne peut pas être avant la date de destruction.'];
    $courriel = $clean($in['courriel'] ?? '', 160);
    if ($courriel !== '' && filter_var($courriel, FILTER_VALIDATE_EMAIL) === false) {
        return ['ok' => false, 'error' => 'Le courriel du client n\'est pas valide.'];
    }
    $clientId = $clean($in['clientId'] ?? '', 100);
    if ($clientId !== '' && !preg_match('/^[a-z0-9][a-z0-9\-]{0,99}$/', $clientId)) $clientId = '';
    return ['ok' => true, 'fields' => [
        'clientId' => $clientId !== '' ? $clientId : null,
        'compagnie' => $compagnie,
        'adresse' => $clean($in['adresse'] ?? '', 250),
        'courriel' => $courriel,
        'nbDisques' => $nb,
        'dateDestruction' => $dDest,
        'dateEmission' => $dEmis,
    ]];
}
