<?php
/**
 * GET /api/ebay/summary — port de src/app/api/ebay/summary/route.ts.
 * KPI consolidés + commandes récentes + ventes journalières + feedback + trafic + retours.
 * Erreur : 500 { error }, 401/503 (admin).
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';
require_once dirname(__DIR__, 2) . '/lib/ebay.php';

if (request_method() !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}

// Défense en profondeur (le contrôleur frontal vérifie déjà la session)
admin_require_api();

try {
    $payload = ebay_dashboard_summary();
} catch (Throwable $err) {
    json_response(['error' => mb_scrub($err->getMessage() !== '' ? $err->getMessage() : 'Unknown', 'UTF-8')], 500);
}

json_response($payload, 200, ['Cache-Control' => 'no-store, max-age=0, must-revalidate']);
