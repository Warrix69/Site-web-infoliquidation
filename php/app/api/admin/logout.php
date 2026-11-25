<?php
/**
 * POST /api/admin/logout — déconnexion (port de src/app/api/admin/logout/route.ts).
 * POST seulement (un lien ou une image d'un autre site ne peut plus déconnecter) ; GET → 405.
 * Corps quelconque accepté (le dashboard envoie `{}` en JSON, un <form> marche aussi).
 * Si la session est valide, toutes les sessions émises jusqu'ici sont révoquées côté serveur
 * (storage/admin_sessions_valid_after), puis le cookie est effacé et l'on renvoie vers la connexion.
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';

if (request_method() !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

require_same_origin();

// Seule une session valide peut révoquer (sinon n'importe qui pourrait déconnecter l'admin)
if (admin_is_authed()) {
    $revoked = admin_revoke_sessions();
    security_log('admin_logout', ['outcome' => $revoked ? 'success' : 'revocation_failed']);
}

admin_clear_session_cookie();
redirect('/admin/login', 303);
