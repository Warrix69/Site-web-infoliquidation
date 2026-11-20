<?php
/**
 * GET|POST /api/admin/logout — supprime le cookie de session et renvoie vers la connexion
 * (port de src/app/api/admin/logout/route.ts).
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';

$method = request_method();
if ($method !== 'GET' && $method !== 'POST') {
    http_response_code(405);
    header('Allow: GET, POST');
    exit;
}

admin_clear_session_cookie();
redirect('/admin/login', 303);
