<?php
/**
 * Vérifications unitaires (ligne de commande) lancées par tests/security_test.php dans un
 * processus séparé, avec le même .env et le même storage TEMPORAIRES que le serveur de test.
 *
 *   php php/tests/unit_helper.php <config.json> <cas>
 *
 * Affiche un objet JSON de booléens / valeurs non secrètes (jamais un mot de passe ni une clé).
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

[$self, $configFile, $case] = $argv + [null, null, null];
$config = is_string($configFile) && is_file($configFile) ? json_decode((string) file_get_contents($configFile), true) : null;
if (!is_array($config) || !is_string($case)) {
    fwrite(STDERR, "usage: php unit_helper.php <config.json> <cas>\n");
    exit(2);
}

foreach ($config['env'] as $k => $v) {
    $_ENV[$k] = (string) $v;
    putenv("$k=$v");
}
define('ENV_FILE', $config['envFile']);
define('STORAGE_DIR', $config['storage']);
require dirname(__DIR__) . '/app/bootstrap.php';
require_once APP_DIR . '/lib/admin_auth.php';

$out = [];
switch ($case) {
    case 'password':
        // $config['extra'] : mots de passe de test fournis par la suite (jamais affichés)
        $x = $config['extra'];
        $out['hash_ok'] = admin_verify_credentials($x['user'], $x['password']);
        $out['hash_wrong_password'] = admin_verify_credentials($x['user'], $x['password'] . 'x');
        $out['hash_wrong_user'] = admin_verify_credentials($x['user'] . 'x', $x['password']);
        $out['plain_value_refused_when_hash_set'] = !admin_verify_credentials($x['user'], (string) ($x['plain'] ?? ''));
        $out['empty_password'] = admin_verify_credentials($x['user'], '');
        break;

    case 'password_plain_only':
        $x = $config['extra'];
        $out['plain_ok'] = admin_verify_credentials($x['user'], $x['plain']);
        $out['plain_wrong'] = admin_verify_credentials($x['user'], $x['plain'] . 'x');
        break;

    case 'password_long':
        // Haché bcrypt d'un mot de passe de 1025 octets : bcrypt ne regarde que 72 octets,
        // donc seul le contrôle de longueur peut le refuser.
        $x = $config['extra'];
        $out['len_1025_refused'] = !admin_verify_credentials($x['user'], $x['long']);
        $out['len_1024_accepted'] = admin_verify_credentials($x['user'], substr($x['long'], 0, 1024));
        break;

    case 'cookie_https':
        $_SERVER['REMOTE_ADDR'] = '203.0.113.9';
        unset($_SERVER['HTTPS'], $_SERVER['SERVER_PORT'], $_SERVER['HTTP_X_FORWARDED_PROTO']);
        $out['http_name'] = admin_cookie_name();
        $out['http_secure'] = request_is_https();
        $_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https'; // client direct (pas un proxy de confiance) : ignoré
        $out['spoofed_xfp_name'] = admin_cookie_name();
        $out['spoofed_xfp_secure'] = request_is_https();
        $_SERVER['HTTPS'] = 'on';
        $out['https_name'] = admin_cookie_name();
        $out['https_secure'] = request_is_https();
        break;

    case 'revocation':
        $t1 = admin_create_session_token();
        $out['token_valid_before_logout'] = admin_verify_session_token($t1);
        $out['revoked'] = admin_revoke_sessions();
        $out['same_second_token_rejected'] = !admin_verify_session_token($t1);
        $t2 = admin_create_session_token();
        $out['new_login_after_logout_valid'] = admin_verify_session_token($t2);
        // Fichier de révocation illisible / corrompu → tout refuser (fail closed)
        file_put_contents(admin_revocation_file(), 'garbage');
        $out['corrupt_file_fails_closed'] = !admin_verify_session_token($t2);
        @unlink(admin_revocation_file());
        break;

    case 'config':
        $out['admin_configured'] = admin_is_configured();
        break;

    case 'display_errors':
        $out['app_env'] = APP_ENV;
        $out['display_errors'] = (string) ini_get('display_errors');
        $out['log_errors'] = (string) ini_get('log_errors');
        $out['error_log_in_storage'] = str_starts_with(
            str_replace('\\', '/', (string) ini_get('error_log')),
            str_replace('\\', '/', STORAGE_DIR . '/logs/')
        );
        break;

    case 'log_scrub':
        $_SERVER['HTTP_USER_AGENT'] = "agent\r\nX-Injected: 1\n\u{2028}fin";
        $_SERVER['REQUEST_URI'] = "/api/test?code=secret-code";
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
        security_log('unit_test_event', [
            'outcome' => "fail\r\nure",
            'password' => 'pw-should-not-appear',
            'refresh_token' => 'tok-should-not-appear',
            'note' => "a\r\nb",
            'message' => 'Bearer abc.def.ghi',
        ]);
        $lines = file(STORAGE_DIR . '/logs/security.log', FILE_IGNORE_NEW_LINES) ?: [];
        $last = (string) end($lines);
        $entry = json_decode($last, true);
        $out['json'] = is_array($entry);
        $out['single_line'] = !str_contains($last, "\r") && !preg_match('/\\\\[rn]/', $last);
        $out['ua_clean'] = is_array($entry) && !preg_match('/[\r\n\x{2028}]/u', (string) $entry['ua']);
        $out['no_secret_values'] = !str_contains($last, 'pw-should-not-appear') && !str_contains($last, 'tok-should-not-appear')
            && !str_contains($last, 'abc.def.ghi');
        $out['no_query_string'] = !str_contains($last, 'secret-code');
        $out['fields'] = is_array($entry) ? array_keys($entry) : [];
        break;

    default:
        fwrite(STDERR, "cas inconnu : $case\n");
        exit(2);
}

echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
