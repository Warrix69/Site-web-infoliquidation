<?php
/**
 * /api/certificates — certificats de destruction des données (réservé à l'admin connecté).
 *
 * GET  → { certificates: [...], nextNumero: "ILR-2026-0007" }
 * POST { action: "save", id?: string, certificate: {...} } → { ok, certificate }   (sans id : nouveau, numéro attribué)
 * POST { action: "delete", id } → { ok }   (le numéro n'est jamais réutilisé)
 * POST { action: "send", id, to, pdf: base64 } → { ok, certificate }   (courriel au client avec le PDF joint)
 */

require_once dirname(__DIR__) . '/lib/admin_auth.php';
require_once dirname(__DIR__) . '/lib/validation.php';
require_once dirname(__DIR__) . '/lib/mailer.php';
require_once dirname(__DIR__) . '/lib/certificates_store.php';

// Défense en profondeur (le contrôleur frontal vérifie déjà la session ; POST : même origine + JSON)
admin_require_api();

const CERT_PDF_MAX_BYTES = 4 * 1024 * 1024; // PDF d'une page en image : ≈ 0,5 à 2 Mo

$method = request_method();
if ($method === 'GET') {
    $store = certificates_read();
    $list = $store['certificates'];
    usort($list, fn ($a, $b) => strcmp((string) ($b['numero'] ?? ''), (string) ($a['numero'] ?? '')));
    json_response(['certificates' => $list, 'nextNumero' => certificates_next_numero($store, date('Y'))]);
}
if ($method !== 'POST') {
    header('Allow: GET, POST');
    json_response(['error' => 'Méthode non permise'], 405);
}

// L'envoi transporte le PDF (base64) : limite plus haute que les autres API
$input = read_json_input((int) (CERT_PDF_MAX_BYTES * 1.4) + 4096);
if (!$input['ok']) json_response(['error' => !empty($input['tooLarge']) ? 'Fichier trop gros' : 'Requête invalide'], !empty($input['tooLarge']) ? 413 : 400);
$body = json_decode((string) json_encode($input['value']), true);
if (!is_array($body)) json_response(['error' => 'Requête invalide'], 400);

$action = is_string($body['action'] ?? null) ? $body['action'] : '';
$id = is_string($body['id'] ?? null) ? trim($body['id']) : '';
if ($id !== '' && !preg_match(CERT_ID_RE, $id)) json_response(['error' => 'Identifiant invalide'], 400);
$storageError = fn () => json_response(['error' => 'Enregistrement impossible : le dossier storage/ n\'est pas inscriptible.'], 500);

/* ---------- Enregistrer (nouveau ou modification) ---------- */
if ($action === 'save') {
    $check = certificates_validate(is_array($body['certificate'] ?? null) ? $body['certificate'] : []);
    if (!$check['ok']) json_response(['error' => $check['error']], 400);
    $fields = $check['fields'];
    $now = date('c');

    [$ok, $result] = certificates_update(function (array $s) use ($id, $fields, $now) {
        if ($id === '') {
            // Numéro attribué ici, sous verrou : deux enregistrements simultanés n'ont jamais le même
            $year = substr($fields['dateEmission'], 0, 4);
            $numero = certificates_next_numero($s, $year);
            $s['counters'][$year] = (int) substr($numero, -4);
            $cert = ['id' => 'crt-' . bin2hex(random_bytes(6)), 'numero' => $numero] + $fields
                + ['createdAt' => $now, 'updatedAt' => $now, 'envois' => []];
            $s['certificates'][] = $cert;
            return [$s, $cert];
        }
        foreach ($s['certificates'] as $i => $c) {
            if (($c['id'] ?? '') === $id) {
                $s['certificates'][$i] = array_merge($c, $fields, ['updatedAt' => $now]);
                return [$s, $s['certificates'][$i]];
            }
        }
        return [$s, null];
    });
    if (!$ok) $storageError();
    if ($result === null) json_response(['error' => 'Certificat introuvable'], 404);
    security_log('certificate_saved', ['outcome' => 'success', 'new' => $id === '', 'numero' => $result['numero']]);
    json_response(['ok' => true, 'certificate' => $result]);
}

/* ---------- Supprimer ---------- */
if ($action === 'delete') {
    if ($id === '') json_response(['error' => 'Identifiant manquant'], 400);
    [$ok, $numero] = certificates_update(function (array $s) use ($id) {
        foreach ($s['certificates'] as $i => $c) {
            if (($c['id'] ?? '') === $id) {
                array_splice($s['certificates'], $i, 1);
                return [$s, $c['numero'] ?? ''];
            }
        }
        return [$s, null];
    });
    if (!$ok) $storageError();
    if ($numero === null) json_response(['error' => 'Certificat introuvable'], 404);
    security_log('certificate_deleted', ['outcome' => 'success', 'numero' => $numero]);
    json_response(['ok' => true]);
}

/* ---------- Envoyer au client par courriel (PDF joint) ---------- */
if ($action === 'send') {
    $to = mail_safe_address(is_string($body['to'] ?? null) ? $body['to'] : null);
    if ($to === null) json_response(['error' => 'Le courriel du destinataire n\'est pas valide.'], 400);
    $pdf = is_string($body['pdf'] ?? null) ? $body['pdf'] : '';
    $bin = base64_decode($pdf, true);
    if ($bin === false || strlen($bin) < 1000 || strlen($bin) > CERT_PDF_MAX_BYTES || !str_starts_with($bin, '%PDF-')) {
        json_response(['error' => 'PDF invalide'], 400);
    }
    $cert = null;
    foreach (certificates_read()['certificates'] as $c) {
        if (($c['id'] ?? '') === $id) { $cert = $c; break; }
    }
    if ($cert === null) json_response(['error' => 'Certificat introuvable'], 404);

    $numero = (string) $cert['numero'];
    $nb = (int) $cert['nbDisques'];
    $date = certificates_long_date((string) $cert['dateDestruction']);
    $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#0A0A0A;max-width:560px">'
        . '<p>Bonjour,</p>'
        . '<p>Vous trouverez ci-joint le <strong>certificat de destruction des données n<sup>o</sup> ' . escape_html($numero) . '</strong> pour '
        . escape_html((string) $cert['compagnie']) . ' : destruction des données de ' . $nb . ' disque' . ($nb > 1 ? 's' : '') . ' dur' . ($nb > 1 ? 's' : '')
        . ', effectuée le ' . escape_html($date) . '.</p>'
        . '<p>Conservez ce document dans vos dossiers : il sert de preuve de la destruction sécuritaire des renseignements personnels (Loi 25).</p>'
        . '<p>Merci de votre confiance,<br><strong>Éric Després</strong><br>Président, Info Liquidation Recycle<br>'
        . escape_html(SITE['phoneDisplay']) . ' · ' . escape_html(SITE['email']) . '</p></div>';
    $filename = 'certificat-destruction-' . strtolower($numero) . '.pdf';
    $subject = "Certificat de destruction des données $numero – Info Liquidation Recycle";

    if (!send_email_with_attachment($to, $subject, $html, $filename, base64_encode($bin))) {
        json_response(['error' => 'Envoi impossible pour le moment (courriel non configuré ou refusé). Télécharge le PDF et envoie-le toi-même.'], 502);
    }
    [$ok, $updated] = certificates_update(function (array $s) use ($id, $to) {
        foreach ($s['certificates'] as $i => $c) {
            if (($c['id'] ?? '') === $id) {
                $s['certificates'][$i]['envois'][] = ['to' => $to, 'at' => date('c')];
                return [$s, $s['certificates'][$i]];
            }
        }
        return [$s, null];
    });
    security_log('certificate_sent', ['outcome' => 'success', 'numero' => $numero]);
    json_response(['ok' => true, 'certificate' => $updated]);
}

json_response(['error' => 'Action inconnue'], 400);

/** 2026-11-25 → « 25 novembre 2026 » */
function certificates_long_date(string $iso): string
{
    $mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $m)) return $iso;
    return (int) $m[3] . ' ' . $mois[(int) $m[2] - 1] . ' ' . $m[1];
}
