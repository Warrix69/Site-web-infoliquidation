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
    // Détail brut d'eBay : journal de sécurité seulement (masqué) ; message générique + référence au client
    $message = $err->getMessage();
    security_log('upstream_error', ['outcome' => 'error', 'service' => 'ebay', 'message' => $message]);
    if (str_starts_with($message, 'eBay token expired')) {
        json_response([
            'error' => 'Connexion eBay expirée : clique sur « Renouveler eBay ».',
            'ebayToken' => ['expired' => true, 'renewUrl' => '/api/ebay/auth-start'],
        ], 500);
    }
    $public = str_starts_with($message, 'eBay not configured')
        ? 'eBay non configuré (EBAY_APP_ID / EBAY_CERT_ID / EBAY_REFRESH_TOKEN manquants).'
        : 'eBay indisponible pour le moment (réf. ' . request_id() . ').';
    json_response(['error' => $public], 500);
}

// État du jeton longue durée (date d'expiration seulement, jamais le jeton) pour le rappel de l'admin
$payload['ebayToken'] = ebay_token_status();
json_response($payload, 200, ['Cache-Control' => 'no-store, max-age=0, must-revalidate']);
