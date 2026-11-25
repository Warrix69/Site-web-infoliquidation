<?php
/**
 * Suite de tests de sécurité de la version PHP (check 27). Sans Composer, sans dépendance.
 *
 *   php php/tests/security_test.php            (depuis la racine du dépôt ou n'importe où)
 *
 * - Lance elle-même des serveurs `php -S 127.0.0.1:<port libre>` avec tests/test-router.php,
 *   un .env et un dossier storage TEMPORAIRES (le vrai php/.env et php/storage/ ne sont ni lus
 *   par le serveur ni modifiés), puis les arrête et efface le dossier temporaire.
 * - Valeurs de test générées à chaque exécution : ADMIN_PASSWORD_HASH d'un mot de passe aléatoire,
 *   ADMIN_SESSION_SECRET aléatoire, RESEND_API_KEY vide (aucun courriel ne peut partir),
 *   Google / eBay vides (aucun appel externe possible).
 * - Affiche PASS/FAIL par test avec le numéro de vérification, code de sortie 1 en cas d'échec.
 * - Prérequis : `node php/build.mjs` (pages admin et textes générés), extensions curl + mbstring.
 *   Sous Windows sans php.ini, les extensions sont chargées depuis <dossier de php.exe>/ext.
 * Variables optionnelles : ILR_TEST_KEEP=1 (garder le dossier temporaire), ILR_BASH=<chemin de bash>.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/* ───────────── Extensions (php.exe sans php.ini sous Windows) ───────────── */

const NEEDED_EXT = ['curl', 'openssl', 'mbstring'];
$extDir = dirname(PHP_BINARY) . DIRECTORY_SEPARATOR . 'ext';
$fromEnv = getenv('ILR_TEST_EXT');
$extFlags = [];
if ($fromEnv !== false && $fromEnv !== '') {
    // Processus relancé : mêmes options pour les serveurs et les sous-processus
    $extFlags = ['-d', 'extension_dir=' . $extDir];
    foreach (explode(',', $fromEnv) as $e) array_push($extFlags, '-d', "extension=$e");
} else {
    $missing = array_values(array_filter(NEEDED_EXT, fn ($e) => !extension_loaded($e)));
    if ($missing) {
        if (!is_dir($extDir)) {
            fwrite(STDERR, 'Extensions PHP manquantes : ' . implode(', ', $missing) . "\n");
            exit(2);
        }
        $flags = ['-d', 'extension_dir=' . $extDir];
        foreach ($missing as $e) array_push($flags, '-d', "extension=$e");
        putenv('ILR_TEST_EXT=' . implode(',', $missing));
        $p = proc_open(array_merge([PHP_BINARY], $flags, [__FILE__], array_slice($argv, 1)), [STDIN, STDOUT, STDERR], $pipes);
        exit(proc_close($p));
    }
}
define('EXT_FLAGS', $extFlags);

/* ───────────── Chemins ───────────── */

define('PHP_ROOT', dirname(__DIR__));               // php/
define('REPO_ROOT', dirname(PHP_ROOT));             // racine du dépôt
define('PUBLIC_ROOT', PHP_ROOT . '/public');
define('ROUTER', __DIR__ . '/test-router.php');
define('UNIT', __DIR__ . '/unit_helper.php');
define('TMP', sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ilr-sectest-' . bin2hex(random_bytes(4)));
define('IS_WIN', PHP_OS_FAMILY === 'Windows');

/* ───────────── Résultats ───────────── */

$GLOBALS['results'] = [];

function check(string $id, string $name, bool $ok, string $detail = ''): bool
{
    $GLOBALS['results'][] = ['id' => $id, 'name' => $name, 'ok' => $ok, 'detail' => $detail];
    $line = sprintf('%s [%s] %s', $ok ? 'PASS' : 'FAIL', $id, $name);
    if (!$ok && $detail !== '') $line .= '  -- ' . $detail;
    echo $line, "\n";
    return $ok;
}

function skip(string $id, string $name, string $why): void
{
    $GLOBALS['results'][] = ['id' => $id, 'name' => $name, 'ok' => null, 'detail' => $why];
    echo "SKIP [$id] $name  -- $why\n";
}

function section(string $title): void
{
    echo "\n== $title ==\n";
}

/** Extrait court et sûr d'une réponse (pour les messages d'échec). */
function snip(string $s, int $n = 160): string
{
    return substr(preg_replace('/\s+/', ' ', $s) ?? '', 0, $n);
}

/* ───────────── Outils ───────────── */

function rrmdir(string $dir): void
{
    if (!is_dir($dir)) return;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($it as $f) {
        if ($f->isDir() && !$f->isLink()) @rmdir($f->getPathname());
        else { @chmod($f->getPathname(), 0666); @unlink($f->getPathname()); }
    }
    @rmdir($dir);
}

function free_port(): int
{
    $s = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);
    if ($s === false) throw new RuntimeException("port: $errstr");
    $name = stream_socket_get_name($s, false);
    fclose($s);
    return (int) substr((string) strrchr((string) $name, ':'), 1);
}

/** Environnement minimal pour les sous-processus (rien du poste ne doit écraser les valeurs de test). */
function child_env(array $extra = []): array
{
    $env = [];
    foreach (['PATH', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'COMSPEC', 'PATHEXT', 'LANG'] as $k) {
        $v = getenv($k);
        if ($v !== false) $env[$k] = $v;
    }
    return $extra + $env;
}

function base_env(): array
{
    return [
        'APP_ENV' => '', 'SITE_URL' => '', 'NEXT_PUBLIC_SITE_URL' => '',
        'RESEND_API_KEY' => '', 'RESEND_FROM' => '',
        'ADMIN_USERNAME' => '', 'ADMIN_PASSWORD_HASH' => '', 'ADMIN_PASSWORD' => '', 'ADMIN_SESSION_SECRET' => '',
        'GOOGLE_CLIENT_ID' => '', 'GOOGLE_CLIENT_SECRET' => '', 'GOOGLE_REFRESH_TOKEN' => '', 'GOOGLE_CALENDAR_ID' => '',
        'EBAY_APP_ID' => '', 'EBAY_CERT_ID' => '', 'EBAY_REFRESH_TOKEN' => '', 'EBAY_MARKETPLACE_ID' => '',
        'EBAY_DEV_ID' => '', 'EBAY_RUNAME' => '', 'TRUST_PROXY' => '',
    ];
}

/** Écrit .env + config.json de test dans $dir ; retourne le chemin du config.json. */
function write_config(string $dir, array $env, array $extra = []): string
{
    @mkdir($dir . '/storage', 0700, true);
    $lines = '';
    foreach ($env as $k => $v) $lines .= $k . "='" . $v . "'\n";
    file_put_contents($dir . '/test.env', $lines);
    $cfg = ['envFile' => $dir . '/test.env', 'storage' => $dir . '/storage', 'env' => $env, 'extra' => $extra];
    file_put_contents($dir . '/config.json', json_encode($cfg, JSON_UNESCAPED_SLASHES));
    return $dir . '/config.json';
}

$GLOBALS['servers'] = [];

/** Démarre un serveur php -S de test. $env est complété par base_env() ; SITE_URL = l'adresse du serveur. */
function start_server(string $name, array $env, array $ini = []): array
{
    $port = free_port();
    $dir = TMP . "/$name";
    $base = "http://127.0.0.1:$port";
    $env = array_merge(base_env(), ['SITE_URL' => $base], $env);
    $config = write_config($dir, $env);
    $cmd = array_merge([PHP_BINARY], EXT_FLAGS, ['-d', 'display_errors=1', '-d', 'log_errors=1'], $ini,
        ['-S', "127.0.0.1:$port", '-t', PUBLIC_ROOT, ROUTER]);
    $proc = proc_open($cmd, [0 => ['pipe', 'r'], 1 => ['file', "$dir/server.out", 'a'], 2 => ['file', "$dir/server.err", 'a']],
        $pipes, PHP_ROOT, child_env(['ILR_TEST_CONFIG' => $config]));
    if (!is_resource($proc)) throw new RuntimeException("impossible de lancer php -S ($name)");
    fclose($pipes[0]);
    $deadline = microtime(true) + 15;
    while (microtime(true) < $deadline) {
        $fp = @fsockopen('127.0.0.1', $port, $en, $es, 0.2);
        if ($fp) { fclose($fp); break; }
        usleep(100000);
    }
    $srv = ['name' => $name, 'port' => $port, 'base' => $base, 'proc' => $proc, 'dir' => $dir,
        'storage' => "$dir/storage", 'env' => $env, 'config' => $config];
    $GLOBALS['servers'][] = $srv;
    return $srv;
}

function stop_servers(): void
{
    foreach ($GLOBALS['servers'] as $s) {
        if (is_resource($s['proc'])) { @proc_terminate($s['proc']); @proc_close($s['proc']); }
    }
    $GLOBALS['servers'] = [];
}

/**
 * Requête HTTP (curl). Options : headers[], body, cookie, ua.
 * @return array{status:int, headers:array<string,string[]>, body:string, err:string}
 */
function http(string $method, string $url, array $o = []): array
{
    $headers = [];
    $ch = curl_init($url);
    $h = $o['headers'] ?? [];
    if (isset($o['cookie'])) $h[] = 'Cookie: ' . $o['cookie'];
    $h[] = 'Expect:';
    $opts = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_PATH_AS_IS => true,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_USERAGENT => $o['ua'] ?? 'ilr-security-test/1.0',
        CURLOPT_HEADERFUNCTION => function ($ch, string $line) use (&$headers): int {
            $t = trim($line);
            if ($t !== '' && !str_starts_with($t, 'HTTP/') && str_contains($t, ':')) {
                [$k, $v] = explode(':', $t, 2);
                $headers[strtolower(trim($k))][] = trim($v);
            }
            return strlen($line);
        },
    ];
    if (array_key_exists('body', $o)) $opts[CURLOPT_POSTFIELDS] = $o['body'];
    if ($method === 'HEAD') $opts[CURLOPT_NOBODY] = true;
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    return ['status' => $status, 'headers' => $headers, 'body' => is_string($body) ? $body : '', 'err' => $err];
}

function hdr(array $r, string $name): ?string
{
    return $r['headers'][strtolower($name)][0] ?? null;
}

/** Requête HTTP brute (socket) : corps « chunked », chemins non normalisés. Retourne [statut, en-têtes bruts, corps]. */
function raw_http(array $srv, string $request): array
{
    $fp = stream_socket_client('tcp://127.0.0.1:' . $srv['port'], $en, $es, 5);
    if ($fp === false) return [0, '', ''];
    stream_set_timeout($fp, 20);
    fwrite($fp, $request);
    $resp = stream_get_contents($fp);
    fclose($fp);
    [$head, $body] = array_pad(explode("\r\n\r\n", (string) $resp, 2), 2, '');
    $status = preg_match('#^HTTP/\d\.\d (\d{3})#', $head, $m) ? (int) $m[1] : 0;
    return [$status, $head, $body];
}

/** En-têtes par défaut, sauf ceux que l'appelant redéfinit (jamais deux Origin dans la même requête). */
function merge_headers(array $defaults, array $headers): array
{
    $names = array_map(fn ($h) => strtolower(trim(explode(':', $h, 2)[0])), $headers);
    $kept = array_filter($defaults, fn ($h) => !in_array(strtolower(trim(explode(':', $h, 2)[0])), $names, true));
    return array_merge(array_values($kept), $headers);
}

function json_post(array $srv, string $path, string $body, array $headers = [], array $o = []): array
{
    $h = merge_headers(['Content-Type: application/json', 'Origin: ' . $srv['base']], $headers);
    return http($o['method'] ?? 'POST', $srv['base'] . $path, ['headers' => $h, 'body' => $body] + $o);
}

/** Connexion admin (formulaire). Retourne la réponse + 'cookie' (nom=valeur) si posé. */
function login(array $srv, string $user, string $pass, array $headers = [], ?string $fields = null): array
{
    $body = $fields !== null ? $fields : http_build_query(['username' => $user, 'password' => $pass]);
    $r = http('POST', $srv['base'] . '/api/admin/login', [
        'headers' => merge_headers(['Content-Type: application/x-www-form-urlencoded', 'Origin: ' . $srv['base']], $headers),
        'body' => $body,
    ]);
    $r['cookie'] = null;
    $r['setcookie'] = null;
    foreach ($r['headers']['set-cookie'] ?? [] as $sc) {
        if (preg_match('/^((?:__Host-)?ilr_admin)=([^;]+)/', $sc, $m) && $m[2] !== 'deleted') {
            $r['cookie'] = $m[1] . '=' . $m[2];
            $r['setcookie'] = $sc;
        }
    }
    return $r;
}

function make_token(string $secret, int $iat, int $exp): string
{
    $p = "v2.$iat.$exp";
    return $p . '.' . hash_hmac('sha256', $p, "ilr-admin-session|$secret");
}

/** Lignes JSON du journal de sécurité d'un serveur. */
function sec_log(array $srv): array
{
    $file = $srv['storage'] . '/logs/security.log';
    if (!is_file($file)) return [];
    $out = [];
    foreach (file($file, FILE_IGNORE_NEW_LINES) ?: [] as $l) {
        $d = json_decode($l, true);
        $out[] = is_array($d) ? $d : ['__raw' => $l];
    }
    return $out;
}

function all_logs_text(array $srv): string
{
    $txt = '';
    foreach (glob($srv['storage'] . '/logs/*') ?: [] as $f) if (is_file($f)) $txt .= file_get_contents($f);
    foreach (['server.out', 'server.err'] as $f) if (is_file($srv['dir'] . "/$f")) $txt .= file_get_contents($srv['dir'] . "/$f");
    return $txt;
}

/** Lance unit_helper.php dans un processus séparé. */
function unit(string $name, string $case, array $env, array $extra = []): array
{
    $dir = TMP . "/unit-$name";
    $config = write_config($dir, array_merge(base_env(), $env), $extra);
    $cmd = array_merge([PHP_BINARY], EXT_FLAGS, [UNIT, $config, $case]);
    $p = proc_open($cmd, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, PHP_ROOT, child_env());
    fclose($pipes[0]);
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($p);
    $d = json_decode(trim((string) $out), true);
    return is_array($d) ? $d : ['__error' => snip((string) $out . ' ' . (string) $err, 300)];
}

/** Exécute une commande (tableau) ; retourne [code, stdout, stderr]. */
function run(array $cmd, ?string $cwd = null, ?array $env = null): array
{
    $p = proc_open($cmd, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, $cwd, $env);
    if (!is_resource($p)) return [127, '', 'proc_open failed'];
    fclose($pipes[0]);
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    return [proc_close($p), (string) $out, (string) $err];
}

function find_bash(): ?string
{
    $env = getenv('ILR_BASH');
    if ($env) return $env;
    if (!IS_WIN) return 'bash';
    foreach (['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe'] as $c) if (is_file($c)) return $c;
    [$code, $out] = run(['where', 'git']);
    foreach (preg_split('/\R/', trim($out)) ?: [] as $g) {
        $c = dirname($g, 2) . '/bin/bash.exe';
        if ($g !== '' && is_file($c)) return $c;
    }
    return null;
}

/** Réponse sans fuite technique (pile, chemin, avertissement PHP). */
function no_leak(string $body): bool
{
    return !preg_match('~Stack trace|Fatal error|Warning:|Notice:|Deprecated:|Parse error|Uncaught|#0 |on line \d+|[A-Za-z]:\\\\(Users|Windows|xampp|wamp)|/home/[a-z]|/var/www|/usr/share|APP_DIR|ROOT_DIR|bootstrap\.php~i', $body);
}

/** Aucun en-tête CORS. */
function no_cors(array $r): bool
{
    foreach (array_keys($r['headers']) as $k) if (str_starts_with($k, 'access-control-')) return false;
    return true;
}

/* ───────────── Données de test ───────────── */

const XSS = [
    'img' => '<img src=x onerror=alert(1)>',
    'svg' => '"><svg onload=alert(1)>',
    'js' => 'javascript:alert(1)',
];

function contact_body(array $over = []): array
{
    return array_merge(['name' => 'Test Securite', 'email' => 'test@example.com', 'phone' => '5145550000',
        'message' => 'Bonjour, ceci est un test automatisé.'], $over);
}

function pickup_body(array $over = []): array
{
    $q = array_fill_keys(['towers', 'servers', 'laptops', 'tablets', 'switches', 'lcd', 'deskPhones', 'cellphones',
        'printers', 'photocopiers', 'audioVideo', 'ups'], 0);
    $q['towers'] = 10;
    return array_merge(['title' => 'mr', 'firstName' => 'Test', 'lastName' => 'Securite', 'company' => '',
        'email' => 'test@example.com', 'phone' => '5145550000', 'address' => '1 rue Test', 'city' => 'Montreal',
        'postalCode' => 'H1A 1A1', 'quantities' => $q, 'extras' => [], 'certificate' => 'no'], $over);
}

function j($v): string
{
    return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/* ═════════════════════════════ Exécution ═════════════════════════════ */

register_shutdown_function(function (): void {
    stop_servers();
    if (getenv('ILR_TEST_KEEP') !== '1') rrmdir(TMP);
});

echo 'PHP ' . PHP_VERSION . ' (' . PHP_OS_FAMILY . ") — dossier temporaire : " . TMP . "\n";
@mkdir(TMP, 0700, true);

section('Prérequis');
$prereq = ['app/views/admin/dashboard.html', 'app/views/admin/login.html', 'app/messages/fr.json', 'app/messages/en.json'];
$missingFiles = array_values(array_filter($prereq, fn ($f) => !is_file(PHP_ROOT . "/$f")));
if (!check('27', 'fichiers générés présents (node php/build.mjs)', !$missingFiles, 'manquants : ' . implode(', ', $missingFiles))) {
    echo "\nLancer d'abord : npm ci && node php/build.mjs\n";
    exit(1);
}

$USER = 'test-admin';
$PASS = 'T3st-' . bin2hex(random_bytes(12)) . '-pw';   // mot de passe de test aléatoire (jamais affiché)
$HASH = password_hash($PASS, PASSWORD_BCRYPT, ['cost' => 10]);
$SECRET = bin2hex(random_bytes(32));
$OTHER_SECRET = bin2hex(random_bytes(32));

$A = start_server('prod', [
    'ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD_HASH' => $HASH, 'ADMIN_SESSION_SECRET' => $SECRET,
]);
$B = start_server('dev', [
    'APP_ENV' => 'development', 'ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD_HASH' => $HASH, 'ADMIN_SESSION_SECRET' => $SECRET,
], ['-d', 'error_log=' . TMP . '/dev/php_errors_dev.log']);
$C = start_server('proxy', [
    'ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD_HASH' => $HASH, 'ADMIN_SESSION_SECRET' => $SECRET, 'TRUST_PROXY' => '127.0.0.1',
]);
$up = http('GET', $A['base'] . '/');
if (!check('27', 'serveur de test (production) démarré', $up['status'] === 200, "statut {$up['status']} {$up['err']}")) exit(1);

/* ───────────── 14 En-têtes ───────────── */
section('14 En-têtes de sécurité');

$authed = login($A, $USER, $PASS); // login n° 1 (réussi)
$cookie1 = $authed['cookie'];

$targets = [
    'page /' => [http('GET', $A['base'] . '/'), 'page'],
    'page 404' => [http('GET', $A['base'] . '/page-inexistante'), 'page'],
    'API /api/ebay/summary (401)' => [http('GET', $A['base'] . '/api/ebay/summary'), 'api'],
    'API /api/contact (400)' => [json_post($A, '/api/contact', '{}'), 'api'],
    'admin /admin/login' => [http('GET', $A['base'] . '/admin/login'), 'admin'],
    'admin /admin (connecté)' => [http('GET', $A['base'] . '/admin', ['cookie' => (string) $cookie1]), 'admin'],
];
foreach ($targets as $label => [$r, $kind]) {
    $csp = (string) hdr($r, 'content-security-policy');
    $ro = (string) hdr($r, 'content-security-policy-report-only');
    $miss = [];
    if (!str_contains($csp, "frame-ancestors 'none'") || !str_contains($csp, "object-src 'none'") || !str_contains($csp, "base-uri 'self'")) $miss[] = 'CSP';
    if ($kind !== 'api' && !str_contains($ro, "default-src 'self'")) $miss[] = 'CSP-Report-Only';
    if (hdr($r, 'x-content-type-options') !== 'nosniff') $miss[] = 'nosniff';
    if (hdr($r, 'x-frame-options') !== 'DENY') $miss[] = 'X-Frame-Options';
    if (hdr($r, 'referrer-policy') !== 'strict-origin-when-cross-origin') $miss[] = 'Referrer-Policy';
    if (!str_contains((string) hdr($r, 'permissions-policy'), 'camera=()')) $miss[] = 'Permissions-Policy';
    if (hdr($r, 'cross-origin-opener-policy') !== 'same-origin') $miss[] = 'COOP';
    if (!preg_match('/max-age=\d{8,}/', (string) hdr($r, 'strict-transport-security'))) $miss[] = 'HSTS';
    if (hdr($r, 'x-powered-by') !== null) $miss[] = 'X-Powered-By présent';
    if (!preg_match('/^[0-9a-f]{16}$/', (string) hdr($r, 'x-request-id'))) $miss[] = 'X-Request-Id';
    if ($kind !== 'page' && !str_contains((string) hdr($r, 'cache-control'), 'no-store')) $miss[] = 'Cache-Control no-store';
    if ($kind !== 'page' && !str_contains((string) hdr($r, 'x-robots-tag'), 'noindex')) $miss[] = 'X-Robots-Tag';
    check('14', "en-têtes complets : $label (HTTP {$r['status']})", !$miss, 'manque : ' . implode(', ', $miss));
}
$pageCsp = (string) hdr(http('GET', $A['base'] . '/'), 'content-security-policy-report-only');
check('14', "CSP Report-Only du site : scripts limités à 'self' + empreinte sha256 (pas d'unsafe-inline)",
    (bool) preg_match("/script-src 'self' 'sha256-[A-Za-z0-9+\/=]+'(;|$)/", $pageCsp), snip($pageCsp));
check('04', 'HSTS 2 ans + includeSubDomains', str_contains((string) hdr($up, 'strict-transport-security'), 'max-age=63072000; includeSubDomains'));
$cr = http('GET', $C['base'] . '/', ['headers' => ['X-Forwarded-Proto: https']]);
check('04', 'derrière un proxy de confiance en HTTPS : CSP upgrade-insecure-requests', str_contains((string) hdr($cr, 'content-security-policy'), 'upgrade-insecure-requests'));
$htaccess = (string) file_get_contents(PUBLIC_ROOT . '/.htaccess');
check('04', '.htaccess : redirection HTTP → HTTPS (301)', (bool) preg_match('/RewriteCond %\{HTTPS\} !=on.*RewriteRule \^ https:\/\/[^\s]+ \[L,R=301\]/s', $htaccess));
check('14', '.htaccess : en-têtes de sécurité aussi sur les fichiers statiques (Header always set …)',
    str_contains($htaccess, 'Header always set X-Content-Type-Options "nosniff"') && str_contains($htaccess, 'Header always set Strict-Transport-Security'));

/* ───────────── 01 / 09 Authentification et admin ───────────── */
section('01/09 Authentification et routes admin');

$adminApis = [
    ['GET', '/api/ebay/summary', null],
    ['GET', '/api/calendar/events', null],
    ['GET', '/api/calendar/events?from=2026-01-01&to=2026-01-31', null],
    ['POST', '/api/calendar/events', '{"summary":"x","start":"2026-12-01T10:00","end":"2026-12-01T11:00"}'],
    ['PATCH', '/api/calendar/events/abc123def', '{"summary":"y"}'],
    ['DELETE', '/api/calendar/events/abc123def', null],
    ['GET', '/api/google/auth-start', null],
    ['GET', '/api/google/callback?code=x&state=y', null],
];
$now = time();
$validToken = make_token($SECRET, $now, $now + 3600);
$cookies = [
    'sans cookie' => null,
    'cookie forgé' => 'ilr_admin=v2.1.9999999999.' . str_repeat('ab', 32),
    'signature altérée' => 'ilr_admin=' . substr($validToken, 0, -1) . (substr($validToken, -1) === 'a' ? 'b' : 'a'),
    'date altérée (signature d\'origine)' => 'ilr_admin=' . preg_replace('/^v2\.(\d+)\.(\d+)\./', 'v2.$1.' . ($now + 7200) . '.', $validToken),
    'expiré' => 'ilr_admin=' . make_token($SECRET, $now - 9 * 3600, $now - 3600),
    'émis dans le futur' => 'ilr_admin=' . make_token($SECRET, $now + 3600, $now + 7200),
    'durée > 8 h' => 'ilr_admin=' . make_token($SECRET, $now, $now + 9 * 3600),
    'signé avec une autre clé' => 'ilr_admin=' . make_token($OTHER_SECRET, $now, $now + 3600),
    'ancien format exp.sig' => 'ilr_admin=' . ($now + 3600) . '.' . hash_hmac('sha256', (string) ($now + 3600), "ilr-admin-session|$SECRET"),
    'nom __Host- en http' => '__Host-ilr_admin=' . $validToken,
    'cookie tableau' => 'ilr_admin[]=' . $validToken,
];
foreach ($cookies as $label => $ck) {
    $bad = [];
    foreach ($adminApis as [$m, $p, $b]) {
        $o = ['headers' => ['Content-Type: application/json', 'Origin: ' . $A['base']]];
        if ($ck !== null) $o['cookie'] = $ck;
        if ($b !== null) $o['body'] = $b;
        $r = http($m, $A['base'] . $p, $o);
        if ($r['status'] !== 401 || !str_contains((string) hdr($r, 'content-type'), 'application/json')) $bad[] = "$m $p → {$r['status']}";
    }
    check('01', "8 routes API admin → 401 ($label)", !$bad, implode('; ', $bad));
}
// Contrôle : le jeton valide fabriqué avec la clé de test passe (le test des 401 ci-dessus est donc significatif)
$r = http('GET', $A['base'] . '/api/ebay/summary', ['cookie' => 'ilr_admin=' . $validToken]);
check('01', 'contrôle : jeton correctement signé accepté par l\'API (≠ 401)', $r['status'] !== 401, "statut {$r['status']}");

$adminPages = ['/admin', '/admin/', '/en/admin', '/en/admin/', '/admin/dashboard.html', '/admin/login/../dashboard.html', '/admin/byebyeboss-logo.png', '/admin/anything', '/en/admin/x'];
foreach (['sans cookie' => null, 'cookie forgé' => $cookies['cookie forgé'], 'expiré' => $cookies['expiré']] as $label => $ck) {
    $bad = [];
    foreach ($adminPages as $p) {
        $r = http('GET', $A['base'] . $p, $ck ? ['cookie' => $ck] : []);
        $ok = in_array($r['status'], [307, 401, 404], true) && ($r['status'] !== 307 || hdr($r, 'location') === '/admin/login')
            && !str_contains($r['body'], 'EBAY_STATS') && !str_contains($r['body'], '<html');
        if (!$ok) $bad[] = "$p → {$r['status']}";
    }
    check('09', "pages admin protégées sans session ($label) : " . count($adminPages) . ' chemins → 307 /admin/login', !$bad, implode('; ', $bad));
}

// Connexion valide
check('01', 'connexion valide → 303 /admin + cookie posé', $authed['status'] === 303 && hdr($authed, 'location') === '/admin' && $cookie1 !== null,
    "statut {$authed['status']} location " . hdr($authed, 'location'));
$sc = (string) $authed['setcookie'];
check('15', 'cookie de session : HttpOnly, SameSite=Lax, Path=/, sans Domain, ≈ 8 h',
    stripos($sc, 'httponly') !== false && stripos($sc, 'samesite=lax') !== false && stripos($sc, 'path=/') !== false
    && stripos($sc, 'domain=') === false && preg_match('/Max-Age=(\d+)/i', $sc, $mm) && abs((int) $mm[1] - 28800) < 120, snip($sc));
check('15', 'cookie sans Secure ni __Host- en http local (admin_is_https faux)', stripos($sc, 'secure') === false && str_starts_with($sc, 'ilr_admin='), snip($sc));
$r = http('GET', $A['base'] . '/admin', ['cookie' => (string) $cookie1]);
check('09', 'connecté : /admin → 200 tableau de bord', $r['status'] === 200 && str_contains($r['body'], '<html'), "statut {$r['status']}");
$r = http('GET', $A['base'] . '/en/admin', ['cookie' => (string) $cookie1]);
check('09', 'connecté : /en/admin → 200', $r['status'] === 200, "statut {$r['status']}");
$r = http('GET', $A['base'] . '/admin/byebyeboss-logo.png', ['cookie' => (string) $cookie1]);
check('09', 'connecté : logo admin → 200 image/png', $r['status'] === 200 && hdr($r, 'content-type') === 'image/png', "statut {$r['status']}");
$r = http('GET', $A['base'] . '/admin/dashboard.html', ['cookie' => (string) $cookie1]);
check('09', 'connecté : /admin/dashboard.html n\'est pas servi tel quel (404)', $r['status'] === 404, "statut {$r['status']}");
$r = http('GET', $A['base'] . '/api/ebay/summary', ['cookie' => (string) $cookie1]);
check('09', 'connecté : API eBay passe la garde (500 « non configuré », aucun appel externe)', $r['status'] === 500 && str_contains($r['body'], 'non configur'), "statut {$r['status']}");
$r = http('GET', $A['base'] . '/api/google/auth-start', ['cookie' => (string) $cookie1]);
check('09', 'connecté : OAuth Google sans configuration → 500, pas de redirection', $r['status'] === 500 && hdr($r, 'location') === null, "statut {$r['status']}");

// Cookie en HTTPS (proxy de confiance) : __Host- + Secure
$https = login($C, $USER, $PASS, ['X-Forwarded-Proto: https']);
$hsc = (string) $https['setcookie'];
check('15', 'HTTPS (proxy de confiance) : cookie __Host-ilr_admin; Secure; HttpOnly; SameSite=Lax; Path=/; sans Domain',
    str_starts_with($hsc, '__Host-ilr_admin=') && stripos($hsc, 'secure') !== false && stripos($hsc, 'httponly') !== false
    && stripos($hsc, 'samesite=lax') !== false && stripos($hsc, 'path=/') !== false && stripos($hsc, 'domain=') === false, snip($hsc));
$r = http('GET', $C['base'] . '/admin', ['cookie' => (string) $https['cookie'], 'headers' => ['X-Forwarded-Proto: https']]);
check('15', 'HTTPS : le cookie __Host- ouvre /admin', $r['status'] === 200, "statut {$r['status']}");
$spoof = login($A, $USER, $PASS, ['X-Forwarded-Proto: https']); // login n° 2 (réussi)
check('15', 'X-Forwarded-Proto: https d\'un client direct ignoré (cookie ilr_admin sans Secure)',
    str_starts_with((string) $spoof['setcookie'], 'ilr_admin=') && stripos((string) $spoof['setcookie'], 'secure') === false, snip((string) $spoof['setcookie']));
$u = unit('cookie', 'cookie_https', ['ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD_HASH' => $HASH, 'ADMIN_SESSION_SECRET' => $SECRET, 'SITE_URL' => 'https://example.test']);
check('15', 'unitaire : HTTPS=on → nom __Host-ilr_admin + Secure ; http ou X-Forwarded-Proto falsifié → ilr_admin sans Secure',
    ($u['https_name'] ?? '') === '__Host-ilr_admin' && ($u['https_secure'] ?? null) === true
    && ($u['http_name'] ?? '') === 'ilr_admin' && ($u['http_secure'] ?? null) === false
    && ($u['spoofed_xfp_name'] ?? '') === 'ilr_admin' && ($u['spoofed_xfp_secure'] ?? null) === false, j($u));

// Déconnexion
$r = http('GET', $A['base'] . '/api/admin/logout', ['cookie' => (string) $cookie1]);
check('16', 'déconnexion en GET → 405', $r['status'] === 405, "statut {$r['status']}");
$r = http('POST', $A['base'] . '/api/admin/logout', ['headers' => ['Origin: ' . $A['base']], 'body' => '']);
check('09', 'déconnexion anonyme → 303 sans révoquer les sessions', $r['status'] === 303 && !is_file($A['storage'] . '/admin_sessions_valid_after'), "statut {$r['status']}");

/* ───────────── 05 Mots de passe ───────────── */
section('05 Mots de passe');
$PLAIN_DECOY = 'Plain-' . bin2hex(random_bytes(8));
$u = unit('pw', 'password', ['ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD_HASH' => $HASH, 'ADMIN_PASSWORD' => $PLAIN_DECOY, 'ADMIN_SESSION_SECRET' => $SECRET],
    ['user' => $USER, 'password' => $PASS, 'plain' => $PLAIN_DECOY]);
check('05', 'password_verify : bon mot de passe accepté', ($u['hash_ok'] ?? null) === true, j($u));
check('05', 'mauvais mot de passe / mauvais identifiant / vide refusés',
    ($u['hash_wrong_password'] ?? null) === false && ($u['hash_wrong_user'] ?? null) === false && ($u['empty_password'] ?? null) === false, j($u));
check('05', 'ADMIN_PASSWORD (clair) ignoré quand ADMIN_PASSWORD_HASH existe', ($u['plain_value_refused_when_hash_set'] ?? null) === true, j($u));
$PLAIN1024 = str_repeat('p', 1023) . 'Z';
$u = unit('pwplain', 'password_plain_only', ['ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD' => $PLAIN1024, 'ADMIN_SESSION_SECRET' => $SECRET],
    ['user' => $USER, 'plain' => $PLAIN1024]);
check('05', 'repli ADMIN_PASSWORD (clair) seulement sans haché ; 1024 octets acceptés', ($u['plain_ok'] ?? null) === true && ($u['plain_wrong'] ?? null) === false, j($u));
$LONG = str_repeat('q', 1024) . 'Z';
$u = unit('pwlong', 'password_long', ['ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD' => $LONG, 'ADMIN_SESSION_SECRET' => $SECRET],
    ['user' => $USER, 'long' => $LONG]);
check('05', 'mot de passe de 1025 octets refusé même s\'il est exact', ($u['len_1025_refused'] ?? null) === true, j($u));

/* ───────────── 16 CSRF (avec session valide) ───────────── */
section('16 CSRF');
$evil = 'Origin: https://evil.example';
$r = login($A, $USER, $PASS, [$evil]);
check('16', 'connexion avec Origin étrangère (bons identifiants) → 403, aucun cookie', $r['status'] === 403 && $r['cookie'] === null, "statut {$r['status']}");
$r = login($A, $USER, $PASS, ['Origin: null']);
check('16', 'connexion avec Origin: null → 403', $r['status'] === 403, "statut {$r['status']}");
$r = http('POST', $A['base'] . '/api/admin/logout', ['headers' => [$evil], 'cookie' => (string) $cookie1, 'body' => '']);
$still = http('GET', $A['base'] . '/admin', ['cookie' => (string) $cookie1]);
check('16', 'déconnexion avec Origin étrangère → 403 et la session reste valide', $r['status'] === 403 && $still['status'] === 200, "statut {$r['status']} / {$still['status']}");
$r = http('POST', $A['base'] . '/api/calendar/events', ['headers' => ['Content-Type: application/json', $evil], 'cookie' => (string) $cookie1,
    'body' => '{"summary":"x","start":"2026-12-01T10:00","end":"2026-12-01T11:00"}']);
check('16', 'création calendrier (connecté) avec Origin étrangère → 403', $r['status'] === 403, "statut {$r['status']}");
foreach (['PATCH' => '/api/calendar/events/abc123', 'DELETE' => '/api/calendar/events/abc123'] as $m => $p) {
    $r = http($m, $A['base'] . $p, ['headers' => ['Content-Type: application/json', $evil], 'cookie' => (string) $cookie1, 'body' => '{}']);
    check('16', "$m calendrier (connecté) avec Origin étrangère → 403", $r['status'] === 403, "statut {$r['status']}");
}
$r = json_post($A, '/api/contact', j(contact_body()), [$evil]);
check('16', 'contact valide avec Origin étrangère → 403', $r['status'] === 403, "statut {$r['status']}");
$r = json_post($A, '/api/pickup', j(pickup_body()), [$evil]);
check('16', 'ramassage valide avec Origin étrangère → 403', $r['status'] === 403, "statut {$r['status']}");
$r = json_post($A, '/api/contact', '{}', ['Origin: http://localhost:9999']);
check('16', 'production : Origin localhost refusée (403)', $r['status'] === 403, "statut {$r['status']}");
$r = json_post($B, '/api/contact', '{}', ['Origin: http://localhost:9999']);
check('16', 'développement : Origin localhost acceptée (400 de validation, pas 403)', $r['status'] === 400, "statut {$r['status']}");
$r = json_post($B, '/api/contact', j(contact_body()), [$evil]);
check('16', 'développement : Origin étrangère toujours refusée (403)', $r['status'] === 403, "statut {$r['status']}");
foreach (['text/plain' => '{"summary":"x","start":"2026-12-01T10:00","end":"2026-12-01T11:00"}',
          'application/x-www-form-urlencoded' => 'summary=x&start=2026-12-01T10%3A00&end=2026-12-01T11%3A00',
          'multipart/form-data; boundary=zz' => "--zz\r\nContent-Disposition: form-data; name=\"summary\"\r\n\r\nx\r\n--zz--\r\n"] as $ct => $body) {
    $r = http('POST', $A['base'] . '/api/calendar/events', ['headers' => ["Content-Type: $ct", 'Origin: ' . $A['base']], 'cookie' => (string) $cookie1, 'body' => $body]);
    check('16', "API admin JSON avec Content-Type $ct → 415", $r['status'] === 415, "statut {$r['status']}");
}
$r = http('PATCH', $A['base'] . '/api/calendar/events/abc123', ['headers' => ['Content-Type: text/plain'], 'cookie' => (string) $cookie1, 'body' => '{"summary":"y"}']);
check('16', 'PATCH calendrier en text/plain (sans Origin) → 415', $r['status'] === 415, "statut {$r['status']}");

/* ───────────── 10 Injection / traversée ───────────── */
section('10 Injection et traversée de chemins');
$paths = [
    '/blog/..%2f..%2fapp%2flib%2fenv', '/blog/%2e%2e%2f%2e%2e%2f.env', '/../.env', '/../../php/.env', '/%2e%2e/%2e%2e/.env',
    '/api/..%2fapp%2flib%2fenv', '/api/../app/lib/env', '/api/contact%00', '/api/contact%00.php', '/api/contact.php',
    '/api/admin/login.php', '/ville%00.php', "/blog/'%20OR%20'1'='1", "/'%20OR%20'1'='1", '/blog/%00',
    '/storage/ratelimit/', '/storage/logs/security.log', '/app/bootstrap.php', '/app/lib/env.php', '/php/.env',
    '/blog/....//....//.env', '/%252e%252e/.env', '/api/calendar/../../app/lib/env',
];
foreach ($paths as $p) {
    $r = http('GET', $A['base'] . $p);
    check('10', "GET $p → 404/redirection, rien de sensible", in_array($r['status'], [301, 307, 308, 400, 403, 404], true) && no_leak($r['body'])
        && !str_contains($r['body'], 'ADMIN_') && !str_contains($r['body'], '<?php'), "statut {$r['status']} " . snip($r['body'], 80));
}
$r = http('GET', $A['base'] . "/contact?id=1'%20OR%20'1'='1&page=../../etc/passwd");
check('10', 'paramètres de requête hostiles sur une page → 200 normal, sans fuite', $r['status'] === 200 && no_leak($r['body']) && !str_contains($r['body'], 'root:'), "statut {$r['status']}");
foreach (['DELETE', 'PATCH'] as $m) {
    foreach (['..', '%2e%2e', '.', 'a%00b', '..%2f..', 'abc%2f..', "x'%20OR%20'1'='1"] as $id) {
        $r = http($m, $A['base'] . "/api/calendar/events/$id", ['headers' => ['Content-Type: application/json', 'Origin: ' . $A['base']], 'cookie' => (string) $cookie1, 'body' => '{}']);
        check('10', "$m /api/calendar/events/$id (connecté) → 404", $r['status'] === 404 && no_leak($r['body']), "statut {$r['status']}");
    }
}
$r = http('GET', $A['base'] . "/api/calendar/events?from=1'%20OR%201=1&to=x", ['cookie' => (string) $cookie1]);
check('10', 'calendrier from/to hostiles → 400 propre', $r['status'] === 400 && no_leak($r['body']), "statut {$r['status']}");

/* ───────────── 13 CORS ───────────── */
section('13 CORS');
$corsTargets = [
    ['OPTIONS', '/api/contact'], ['OPTIONS', '/api/pickup'], ['OPTIONS', '/api/admin/login'], ['OPTIONS', '/api/calendar/events'],
    ['GET', '/api/ebay/summary'], ['GET', '/api/calendar/events'], ['POST', '/api/contact'], ['GET', '/'], ['GET', '/admin/login'], ['GET', '/admin'],
];
$bad = [];
foreach ($corsTargets as [$m, $p]) {
    foreach ([null, (string) $cookie1] as $ck) {
        $o = ['headers' => ['Origin: https://evil.example', 'Access-Control-Request-Method: POST', 'Access-Control-Request-Headers: content-type']];
        if ($ck) $o['cookie'] = $ck;
        if ($m === 'POST') { $o['body'] = '{}'; $o['headers'][] = 'Content-Type: application/json'; }
        $r = http($m, $A['base'] . $p, $o);
        if (!no_cors($r)) $bad[] = "$m $p";
    }
}
check('13', 'aucun en-tête Access-Control-* pour Origin https://evil.example (' . (count($corsTargets) * 2) . ' requêtes, avec et sans session)', !$bad, implode('; ', $bad));

/* ───────────── 07 XSS (pages) ───────────── */
section('07 XSS');
$reflect = [
    '/?q=' . rawurlencode(XSS['img']),
    '/' . rawurlencode(XSS['img']),
    '/' . rawurlencode(XSS['svg']),
    '/blog/' . rawurlencode(XSS['img']),
    '/en/' . rawurlencode(XSS['svg']) . '?x=' . rawurlencode(XSS['js']),
    '/contact?x=' . rawurlencode(XSS['svg']),
    '/admin/login?e=' . rawurlencode(XSS['img']) . '&m=' . rawurlencode(XSS['svg']),
    '/merci?name=' . rawurlencode(XSS['img']),
];
foreach ($reflect as $p) {
    $r = http('GET', $A['base'] . $p);
    $raw = stripos($r['body'], '<img src=x onerror') !== false || stripos($r['body'], '<svg onload') !== false
        || preg_match('/(href|src|action)\s*=\s*["\']?\s*javascript:/i', $r['body']);
    check('07', "réflexion de $p : aucune balise injectée", !$raw && no_leak($r['body']), "statut {$r['status']}");
}
foreach ([PHP_ROOT . '/app/views/admin/dashboard.html', REPO_ROOT . '/public/admin/dashboard.html'] as $f) {
    $html = is_file($f) ? (string) file_get_contents($f) : '';
    preg_match_all('/\son[a-z]+\s*=\s*"[^"]*\$\{[^"]*"/i', $html, $mm);
    check('07', 'tableau de bord : aucun gestionnaire on…="${…}" (' . str_replace(REPO_ROOT . '/', '', $f) . ')', $html !== '' && !$mm[0], implode(' | ', array_map('snip', array_slice($mm[0], 0, 3))));
}

// Courriels : serveur de DÉVELOPPEMENT sans RESEND_API_KEY → le HTML du courriel est écrit dans le journal, jamais envoyé
$devLog = TMP . '/dev/php_errors_dev.log';
$subs = [];
$n = 0;
foreach (XSS as $k => $x) {
    $n++;
    $subs["contact-$k"] = ['contact', "MARK-C$n", contact_body(['name' => $x, 'phone' => $x, 'message' => "MARK-C$n $x\nligne 2 $x"])];
    $subs["pickup-$k"] = ['pickup', "MARK-P$n", pickup_body(['firstName' => $x, 'lastName' => $x, 'company' => $x, 'phone' => $x,
        'address' => "MARK-P$n $x", 'city' => $x, 'extras' => [['name' => $x, 'quantity' => 1]]])];
}
$subs['contact-crlf'] = ['contact', 'MARK-CRLF', contact_body(['name' => "Inj\r\nBcc: victim@example.com", 'message' => 'MARK-CRLF test'])];
$sendOk = true;
foreach ($subs as $label => [$form, $mark, $body]) {
    $r = json_post($B, "/api/$form", j($body));
    if ($r['status'] !== 200) { $sendOk = false; check('07', "envoi de test $label (développement) → 200", false, "statut {$r['status']} " . snip($r['body'])); }
}
check('07', 'formulaires hostiles acceptés en développement (journalisés, aucun courriel envoyé)', $sendOk);
$log = is_file($devLog) ? (string) file_get_contents($devLog) : '';
$chunks = preg_split('/^\[\d{2}-[A-Za-z]{3}-\d{4} [^\]]+\] /m', $log) ?: [];
$allowedTags = ['h2', 'h3', 'p', 'strong', 'br', 'table', 'tr', 'td'];
foreach ($subs as $label => [$form, $mark, $body]) {
    $chunk = '';
    foreach ($chunks as $c) if (str_contains($c, $mark)) { $chunk = $c; break; }
    $html = (string) (explode("Contenu :\n", $chunk, 2)[1] ?? '');
    preg_match_all('/<\s*\/?\s*([a-zA-Z0-9]+)/', $html, $tags);
    $foreign = array_diff(array_map('strtolower', $tags[1]), $allowedTags);
    $hasAttr = (bool) preg_match('/<[^>]*\s(on[a-z]+|href|src|style)\s*=/i', $html);
    $escaped = $label === 'contact-crlf' || str_contains($html, htmlspecialchars(XSS[explode('-', $label)[1]] ?? '', ENT_QUOTES | ENT_HTML401))
        || str_contains($html, strtr(XSS[explode('-', $label)[1]] ?? '', ['&' => '&amp;', '<' => '&lt;', '>' => '&gt;', '"' => '&quot;', "'" => '&#39;']));
    check('07', "courriel $label : HTML échappé (balises permises seulement, aucun attribut actif)", $html !== '' && !$foreign && !$hasAttr && $escaped,
        $html === '' ? 'courriel introuvable dans le journal' : 'balises : ' . implode(',', $foreign));
    if (preg_match('/^Sujet : (.*)$/m', $chunk, $sm)) {
        $next = substr($chunk, strpos($chunk, $sm[0]) + strlen($sm[0]) + 1, 12);
        check('07', "courriel $label : sujet sur une seule ligne (CR/LF retirés)", str_starts_with($next, 'R') && !preg_match('/[\r\x00-\x08]/', $sm[1]), snip($sm[1], 80));
    }
}

/* ───────────── 20 Débogage ───────────── */
section('20 Mode débogage / erreurs');
$u = unit('dbg-prod', 'display_errors', ['ADMIN_SESSION_SECRET' => $SECRET]);
check('20', 'production : display_errors=0, log_errors=1, journal dans storage/logs/',
    ($u['app_env'] ?? '') === 'production' && ($u['display_errors'] ?? '') === '0' && ($u['log_errors'] ?? '') === '1' && ($u['error_log_in_storage'] ?? false) === true, j($u));
$u = unit('dbg-dev', 'display_errors', ['APP_ENV' => 'development']);
check('20', 'APP_ENV=development reconnu (seule valeur qui active le mode développement)', ($u['app_env'] ?? '') === 'development', j($u));
$u = unit('dbg-other', 'display_errors', ['APP_ENV' => 'dev']);
check('20', 'APP_ENV=dev (valeur inconnue) → production', ($u['app_env'] ?? '') === 'production', j($u));
$debugReqs = [
    '404' => http('GET', $A['base'] . '/nope/nope'),
    'JSON malformé (contact)' => json_post($A, '/api/contact', '{"name":'),
    'JSON malformé (calendrier, connecté)' => http('POST', $A['base'] . '/api/calendar/events', ['headers' => ['Content-Type: application/json', 'Origin: ' . $A['base']], 'cookie' => (string) $cookie1, 'body' => '{"summary":']),
    'identifiant invalide (connecté)' => http('DELETE', $A['base'] . '/api/calendar/events/bad..id', ['headers' => ['Origin: ' . $A['base']], 'cookie' => (string) $cookie1]),
    'erreur Google forcée (non configuré, connecté)' => http('GET', $A['base'] . '/api/calendar/events', ['cookie' => (string) $cookie1]),
    'erreur eBay forcée (connecté)' => http('GET', $A['base'] . '/api/ebay/summary', ['cookie' => (string) $cookie1]),
    'erreur fatale forcée (/index.php exécuté deux fois)' => http('GET', $A['base'] . '/index.php'),
    'UTF-8 invalide dans le chemin' => http('GET', $A['base'] . '/%ff%fe%00'),
    'tableaux dans la requête' => http('GET', $A['base'] . '/?a[]=1&b[c][d]=2'),
    'cookie tableau sur /admin' => http('GET', $A['base'] . '/admin', ['cookie' => 'ilr_admin[x]=1']),
    'méthode inattendue' => http('PUT', $A['base'] . '/api/contact', ['body' => 'x']),
    'callback OAuth sans state (connecté)' => http('GET', $A['base'] . '/api/google/callback?code=abc', ['cookie' => (string) $cookie1]),
];
foreach ($debugReqs as $label => $r) {
    check('20', "$label (HTTP {$r['status']}) : ni pile, ni chemin, ni avertissement PHP", no_leak($r['body']) && $r['status'] !== 0, snip($r['body']));
}

/* ───────────── 23 Fichiers exposés ───────────── */
section('23 Fichiers exposés');
preg_match('/<FilesMatch "([^"]+)">\s*\R\s*Require all denied/', $htaccess, $fm);
preg_match('/RedirectMatch 404 (\S+)/', $htaccess, $rm);
$deny = $fm[1] ?? null;
$redir = $rm[1] ?? null;
check('23', '.htaccess public : règle FilesMatch « Require all denied » et RedirectMatch 404 des chemins cachés trouvées', $deny !== null && $redir !== null);
if ($deny !== null && $redir !== null) {
    $blocked = fn (string $path) => preg_match('#' . $deny . '#', basename($path)) === 1 || preg_match('#' . $redir . '#', '/' . $path) === 1;
    foreach (['.env', '.env.local', '.env.production', '.git/config', '.git/HEAD', '.htaccess', 'error_log', 'backup.zip', 'site.tar.gz', 'dump.sql',
              'database.sqlite', 'data.db', 'x.map', 'assets/app.js.map', 'README.md', 'composer.lock', 'composer.json', 'package-lock.lock',
              'index.php.bak', 'index.php~', 'index.php.orig', 'config.yml', 'php.ini', 'x.log', 'deploy.sh', '.DS_Store', 'id_rsa.phar'] as $p) {
        check('23', "refusé par .htaccess : $p", $blocked($p));
    }
    foreach (['assets/app.css', 'assets/site.js', 'logo.png', 'models/model.glb', 'assets/fonts/font.woff2', 'models/x.hdr', 'sitemap.xml',
              'robots.txt', 'index.php', 'images/photo.webp', '.well-known/acme-challenge/token'] as $p) {
        check('23', "servi normalement (non bloqué) : $p", !$blocked($p));
    }
}
check('23', '.htaccess public : Require all granted + Options -Indexes', str_contains($htaccess, 'Require all granted') && str_contains($htaccess, 'Options -Indexes'));
foreach (['php/.htaccess', 'php/app/.htaccess', 'php/storage/.htaccess'] as $f) {
    $t = is_file(REPO_ROOT . "/$f") ? (string) file_get_contents(REPO_ROOT . "/$f") : '';
    check('23', "$f contient « Require all denied » (+ repli Apache 2.2)", str_contains($t, 'Require all denied') && str_contains($t, 'Deny from all'));
}
foreach (['/.htaccess', '/.env', '/index.php.bak', '/error_log', '/storage/.htaccess', '/admin/dashboard.html'] as $p) {
    $r = http('GET', $A['base'] . $p);
    check('23', "php -S (poste) : GET $p ≠ 200", $r['status'] !== 200, "statut {$r['status']}");
}
$bash = find_bash();
if ($bash === null) {
    skip('23', 'check-exposed.sh contre le serveur de test', 'bash introuvable (ILR_BASH=<chemin>)');
} else {
    [$code, $out, $err] = run([$bash, PHP_ROOT . '/scripts/check-exposed.sh', $A['base']], REPO_ROOT, child_env());
    $exposed = [];
    foreach (preg_split('/\R/', $out) ?: [] as $line) if (str_contains($line, 'EXPOS')) $exposed[] = trim($line);
    check('23', 'bash php/scripts/check-exposed.sh <serveur de test> : aucun chemin à 200', $code === 0 && !$exposed, "code $code " . implode('; ', $exposed) . ' ' . snip($err));
    // Sortie complète (statut de chaque chemin), pour le rapport
    foreach (preg_split('/\R/', rtrim($out)) ?: [] as $line) echo '      | ' . $line . "\n";
}

/* ───────────── 01 Déconnexion / révocation ───────────── */
section('01 Déconnexion et révocation');
$u = unit('revoke', 'revocation', ['ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD_HASH' => $HASH, 'ADMIN_SESSION_SECRET' => $SECRET]);
check('01', 'unitaire : jeton émis dans la même seconde que la déconnexion refusé', ($u['token_valid_before_logout'] ?? null) === true && ($u['revoked'] ?? null) === true && ($u['same_second_token_rejected'] ?? null) === true, j($u));
check('01', 'unitaire : nouvelle connexion juste après la déconnexion valide', ($u['new_login_after_logout_valid'] ?? null) === true, j($u));
check('01', 'unitaire : fichier de révocation corrompu → toutes les sessions refusées', ($u['corrupt_file_fails_closed'] ?? null) === true, j($u));
$second = login($A, $USER, $PASS); // login n° 3 (réussi)
$cookie2 = (string) $second['cookie'];
$r = http('POST', $A['base'] . '/api/admin/logout', ['headers' => ['Origin: ' . $A['base'], 'Content-Type: application/json'], 'cookie' => $cookie2, 'body' => '{}']);
$cleared = false;
foreach ($r['headers']['set-cookie'] ?? [] as $sc) if (preg_match('/^ilr_admin=(deleted|);/', $sc)) $cleared = true;
check('01', 'déconnexion → 303 /admin/login + cookie effacé', $r['status'] === 303 && hdr($r, 'location') === '/admin/login' && $cleared, "statut {$r['status']}");
$bad = [];
foreach (['cookie de la session déconnectée' => $cookie2, 'autre session ouverte avant' => (string) $cookie1] as $label => $ck) {
    $p = http('GET', $A['base'] . '/admin', ['cookie' => $ck]);
    $a = http('GET', $A['base'] . '/api/ebay/summary', ['cookie' => $ck]);
    if ($p['status'] !== 307 || $a['status'] !== 401) $bad[] = "$label : /admin {$p['status']}, API {$a['status']}";
}
check('01', 'après déconnexion : ancien cookie refusé (/admin → 307, API → 401), toutes sessions', !$bad, implode('; ', $bad));
$third = login($A, $USER, $PASS); // login n° 4 (réussi, immédiatement après)
$r = http('GET', $A['base'] . '/admin', ['cookie' => (string) $third['cookie']]);
check('01', 'reconnexion immédiate après déconnexion → /admin 200', $r['status'] === 200, "statut {$r['status']}");
$cookie3 = (string) $third['cookie'];

/* ───────────── 06 Validation + 12 limites des formulaires ───────────── */
section('06 Validation serveur');
$big = str_repeat('A', 100000);
$v = [
    'contact vide {}' => ['contact', '{}'],
    'contact nom = tableau' => ['contact', j(contact_body(['name' => ['x']]))],
    'contact nom = objet' => ['contact', j(contact_body(['name' => ['a' => 1]]))],
    'contact nom = nombre' => ['contact', j(contact_body(['name' => 42]))],
    'contact nom = null' => ['contact', j(contact_body(['name' => null]))],
    'contact nom 60 000 caractères' => ['contact', j(contact_body(['name' => str_repeat('A', 60000)]))],
    'contact message 5001 caractères' => ['contact', j(contact_body(['message' => str_repeat('m', 5001)]))],
    'contact courriel invalide' => ['contact', j(contact_body(['email' => 'pas-un-courriel']))],
    'contact courriel avec CRLF' => ['contact', j(contact_body(['email' => "a@example.com\r\nBcc: b@example.com"]))],
    'contact champs manquants' => ['contact', j(['name' => 'x'])],
    'contact corps = tableau JSON' => ['contact', '[]'],
    'contact corps = null' => ['contact', 'null'],
    'contact corps = chaîne' => ['contact', '"x"'],
    'contact JSON malformé' => ['contact', '{"name":"x",'],
    'contact JSON imbriqué 600 niveaux' => ['contact', str_repeat('[', 600) . str_repeat(']', 600)],
    'contact corps vide' => ['contact', ''],
    'ramassage 9 items' => ['pickup', j(pickup_body(['quantities' => array_merge(pickup_body()['quantities'], ['towers' => 9])]))],
    'ramassage quantité négative' => ['pickup', j(pickup_body(['quantities' => array_merge(pickup_body()['quantities'], ['servers' => -5])]))],
    'ramassage quantité 1e9' => ['pickup', j(pickup_body(['quantities' => array_merge(pickup_body()['quantities'], ['servers' => 1000000000])]))],
    'ramassage quantité décimale' => ['pickup', j(pickup_body(['quantities' => array_merge(pickup_body()['quantities'], ['servers' => 1.5])]))],
    'ramassage quantité texte' => ['pickup', j(pickup_body(['quantities' => array_merge(pickup_body()['quantities'], ['towers' => '10'])]))],
    'ramassage quantités = tableau' => ['pickup', j(pickup_body(['quantities' => [10, 0]]))],
    'ramassage 21 extras' => ['pickup', j(pickup_body(['extras' => array_fill(0, 21, ['name' => 'x', 'quantity' => 1])]))],
    'ramassage extra quantité négative' => ['pickup', j(pickup_body(['extras' => [['name' => 'x', 'quantity' => -20]]]))],
    'ramassage titre « admin »' => ['pickup', j(pickup_body(['title' => 'admin']))],
    'ramassage code postal invalide' => ['pickup', j(pickup_body(['postalCode' => "H1A 1A1' OR 1=1"]))],
    'ramassage prénom = tableau' => ['pickup', j(pickup_body(['firstName' => ['a', 'b']]))],
    'ramassage certificat invalide' => ['pickup', j(pickup_body(['certificate' => 'maybe']))],
    'ramassage téléphone trop court' => ['pickup', j(pickup_body(['phone' => '123']))],
];
foreach ($v as $label => [$form, $body]) {
    $r = json_post($A, "/api/$form", $body);
    $ok = $r['status'] === 400 && str_contains((string) hdr($r, 'content-type'), 'application/json') && no_leak($r['body']);
    if ($label === 'ramassage 9 items') $ok = $ok && str_contains($r['body'], 'Minimum de 10 items');
    check('06', "$label → 400 propre", $ok, "statut {$r['status']} " . snip($r['body'], 100));
}
$r = json_post($A, '/api/contact', j(contact_body(['name' => $big])));
check('06', 'contact nom 100 000 caractères (corps > 64 Ko) → 413', $r['status'] === 413, "statut {$r['status']}");
$r = json_post($A, '/api/pickup', j(pickup_body(['address' => $big])));
check('06', 'ramassage corps > 64 Ko → 413', $r['status'] === 413, "statut {$r['status']}");
foreach (['contact', 'pickup'] as $form) {
    $payload = j(contact_body(['message' => str_repeat('x', 70000)]));
    $chunked = '';
    foreach (str_split($payload, 8192) as $part) $chunked .= dechex(strlen($part)) . "\r\n" . $part . "\r\n";
    $chunked .= "0\r\n\r\n";
    [$st] = raw_http($A, "POST /api/$form HTTP/1.1\r\nHost: 127.0.0.1:{$A['port']}\r\nOrigin: {$A['base']}\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n" . $chunked);
    check('06', "$form : corps « chunked » de 70 Ko sans Content-Length → 413", $st === 413, "statut $st");
}
$r = http('POST', $A['base'] . '/api/calendar/events', ['headers' => ['Content-Type: application/json', 'Origin: ' . $A['base']], 'cookie' => $cookie3,
    'body' => j(['summary' => 'x', 'description' => str_repeat('d', 70000)])]);
check('06', 'API admin : corps > 64 Ko → 413', $r['status'] === 413, "statut {$r['status']}");
$r = http('POST', $A['base'] . '/api/calendar/events', ['headers' => ['Content-Type: application/json', 'Origin: ' . $A['base']], 'cookie' => $cookie3,
    'body' => j(['summary' => str_repeat('s', 301), 'start' => '2026-12-01T10:00', 'end' => '2026-12-01T11:00'])]);
check('06', 'API admin : titre de 301 caractères → 400', $r['status'] === 400, "statut {$r['status']}");
$r = http('POST', $A['base'] . '/api/calendar/events', ['headers' => ['Content-Type: application/json', 'Origin: ' . $A['base']], 'cookie' => $cookie3,
    'body' => j(['summary' => 'x', 'start' => '2026-12-01T10:00', 'end' => '2026-12-01T11:00', 'attendees' => array_fill(0, 21, 'a@example.com')])]);
check('06', 'API admin : 21 invités → 400', $r['status'] === 400, "statut {$r['status']}");

section('12 Limites de débit (formulaires)');
foreach (['contact' => contact_body(['role' => 'admin', 'isAdmin' => true]), 'pickup' => pickup_body(['role' => 'admin', 'price' => 0])] as $form => $first) {
    $statuses = [];
    for ($i = 1; $i <= 5; $i++) {
        $body = $i === 1 ? $first : ($form === 'contact' ? contact_body() : pickup_body());
        $statuses[] = json_post($A, "/api/$form", j($body))['status'];
    }
    check('06', "$form : champs en trop (role=admin…) ignorés : demande valide traitée (502 = courriel non configuré)", $statuses[0] === 502, 'statuts ' . implode(',', $statuses));
    check('11', "$form production sans RESEND_API_KEY → 502 (jamais un faux succès)", $statuses === [502, 502, 502, 502, 502], 'statuts ' . implode(',', $statuses));
    $r6 = json_post($A, "/api/$form", j($form === 'contact' ? contact_body() : pickup_body()));
    check('12', "$form : 6e envoi valide en 15 min → 429 + Retry-After", $r6['status'] === 429 && (int) hdr($r6, 'retry-after') > 0, "statut {$r6['status']}");
    $r7 = json_post($A, "/api/$form", j($form === 'contact' ? contact_body() : pickup_body()),
        ['X-Forwarded-For: 198.51.100.' . random_int(1, 254), 'X-Real-IP: 198.51.100.7', 'CF-Connecting-IP: 198.51.100.8']);
    check('12', "$form : X-Forwarded-For / X-Real-IP / CF-Connecting-IP falsifiés ne remettent pas le compteur à zéro", $r7['status'] === 429, "statut {$r7['status']}");
    $r8 = json_post($A, "/api/$form", '{}');
    check('12', "$form : une erreur de saisie reste signalée (400) pendant le blocage", in_array($r8['status'], [400, 429], true), "statut {$r8['status']}");
}

/* ───────────── 05 / 08 / 12 Échecs de connexion ───────────── */
section('05/08/12 Échecs de connexion, journal, verrouillage');
$wrongUser = login($A, 'not-the-admin', $PASS, [], null);          // échec 1
$wrongPass = login($A, $USER, 'wrong-' . bin2hex(random_bytes(6)));  // échec 2
check('01', 'mauvais identifiant et mauvais mot de passe : réponse identique (303 /admin/login?e=1)',
    $wrongUser['status'] === 303 && $wrongPass['status'] === 303 && hdr($wrongUser, 'location') === '/admin/login?e=1'
    && hdr($wrongUser, 'location') === hdr($wrongPass, 'location') && $wrongUser['body'] === $wrongPass['body'] && $wrongUser['cookie'] === null && $wrongPass['cookie'] === null,
    "{$wrongUser['status']} " . hdr($wrongUser, 'location') . " / {$wrongPass['status']} " . hdr($wrongPass, 'location'));
$long = login($A, $USER, str_repeat('a', 1025));                       // échec 3
check('05', 'connexion avec un mot de passe de 1025 octets → refus générique', $long['status'] === 303 && hdr($long, 'location') === '/admin/login?e=1', "statut {$long['status']}");
$rid = (string) hdr($wrongPass, 'x-request-id');
$entry = null;
foreach (sec_log($A) as $e) if (($e['rid'] ?? '') === $rid && ($e['event'] ?? '') === 'admin_login') $entry = $e;
check('08', 'échec de connexion : ligne JSON admin_login/failure avec ts, ip, rid (= X-Request-Id), méthode, chemin',
    is_array($entry) && ($entry['outcome'] ?? '') === 'failure' && preg_match('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/', (string) ($entry['ts'] ?? ''))
    && ($entry['ip'] ?? '') === '127.0.0.1' && ($entry['method'] ?? '') === 'POST' && ($entry['path'] ?? '') === '/api/admin/login', j($entry));
$tabUa = login($A, $USER, 'x', [], http_build_query(['username' => $USER, 'password' => 'y']));  // échec 4 (UA avec tabulation ci-dessous)
$r = http('POST', $A['base'] . '/api/admin/login', ['headers' => ['Content-Type: application/x-www-form-urlencoded', 'Origin: ' . $A['base']],
    'body' => 'username[]=a&password[]=b', 'ua' => "evil\tagent\x0bvt"]);              // échec 5 → verrouillage
$lastUa = null;
foreach (sec_log($A) as $e) if (($e['rid'] ?? '') === (string) hdr($r, 'x-request-id')) $lastUa = $e['ua'] ?? null;
check('08', 'caractères de contrôle de l\'User-Agent retirés du journal', is_string($lastUa) && !preg_match('/[\x00-\x1F]/', $lastUa), j($lastUa));
$u = unit('log', 'log_scrub', ['ADMIN_SESSION_SECRET' => $SECRET]);
check('08', 'unitaire : CR/LF/U+2028 retirés (User-Agent, détails), une ligne JSON par événement',
    ($u['json'] ?? false) && ($u['single_line'] ?? false) && ($u['ua_clean'] ?? false), j($u));
check('08', 'unitaire : clés sensibles (password, *token*) et jetons Bearer masqués ; chaîne de requête jamais notée',
    ($u['no_secret_values'] ?? false) && ($u['no_query_string'] ?? false), j($u));
check('08', 'unitaire : champs ts, event, outcome, ip, ua, rid, method, path présents',
    !array_diff(['ts', 'event', 'outcome', 'ip', 'ua', 'rid', 'method', 'path'], (array) ($u['fields'] ?? [])), j($u));

check('12', '5e échec de connexion en 15 min → 429 + Retry-After', $r['status'] === 429 && (int) hdr($r, 'retry-after') > 0, "statut {$r['status']}");
$r6 = login($A, $USER, 'still-wrong');
check('12', '6e tentative → 429 + Retry-After (page renvoie vers ?e=rate)', $r6['status'] === 429 && (int) hdr($r6, 'retry-after') > 0 && str_contains($r6['body'], 'e=rate'), "statut {$r6['status']}");
$rGood = login($A, $USER, $PASS);
check('12', 'bon mot de passe pendant le blocage → 429, aucun cookie', $rGood['status'] === 429 && $rGood['cookie'] === null, "statut {$rGood['status']}");
$rSpoof = login($A, $USER, $PASS, ['X-Forwarded-For: 203.0.113.' . random_int(1, 254), 'X-Real-IP: 203.0.113.9', 'CF-Connecting-IP: 203.0.113.10', 'Forwarded: for=203.0.113.11']);
check('12', 'X-Forwarded-For / X-Real-IP / CF-Connecting-IP falsifiés ne contournent pas le blocage', $rSpoof['status'] === 429 && $rSpoof['cookie'] === null, "statut {$rSpoof['status']}");
$lock = array_filter(sec_log($A), fn ($e) => ($e['event'] ?? '') === 'admin_login_lockout');
check('08', 'verrouillage journalisé (admin_login_lockout)', count($lock) > 0);

$logs = all_logs_text($A) . all_logs_text($B) . all_logs_text($C);
$leaks = [];
foreach (['mot de passe de test' => $PASS, 'haché' => $HASH, 'clé de session' => $SECRET, 'cookie de session' => substr((string) $cookie1, 10),
          'mot de passe 1024' => $PLAIN1024] as $label => $val) {
    if ($val !== '' && str_contains($logs, $val)) $leaks[] = $label;
}
check('05', 'aucun mot de passe, haché, clé ni cookie dans security.log / php_errors.log / sortie serveur', !$leaks, implode(', ', $leaks));
check('08', 'événements journalisés (connexion, CSRF, formulaires, 401)', (function () use ($A): bool {
    $ev = array_column(sec_log($A), 'event');
    return !array_diff(['admin_login', 'admin_login_lockout', 'admin_logout', 'admin_api_denied', 'csrf_origin_rejected', 'form_submission', 'form_blocked', 'mail_not_configured'], $ev);
})());

/* ───────────── 02 / 11 Secrets dans les fichiers livrés ───────────── */
section('02/11 Secrets dans les fichiers livrés');
$patterns = [
    'Resend re_' => '/(?<![A-Za-z0-9_])re_[A-Za-z0-9_]{20,}/',
    'Google GOCSPX-' => '/GOCSPX-[A-Za-z0-9_\-]{10,}/',
    'Google refresh 1//0' => '#1//0[A-Za-z0-9_\-]{20,}#',
    'Google ya29.' => '/ya29\.[A-Za-z0-9_\-]{20,}/',
    'eBay v^1.1#' => '/v\^1\.1#[A-Za-z0-9#^_.=\-]{20,}/',
    'Stripe sk_' => '/sk_(live|test)_[A-Za-z0-9]{10,}/',
    'AWS AKIA' => '/AKIA[0-9A-Z]{16}/',
    'clé privée' => '/-----BEGIN [A-Z ]*PRIVATE KEY-----/',
    'refresh_token JSON' => '/"refresh_token"\s*:\s*"[^"]{10,}"/',
    'client_secret JSON' => '/"client_secret"\s*:\s*"[^"]{6,}"/',
];
$textExt = '/\.(js|mjs|css|html?|json|txt|xml|svg|webmanifest|map|php|md)$|(^|\/)\.htaccess$/i';
$scanRoots = [PUBLIC_ROOT, PHP_ROOT . '/app/views/admin', PHP_ROOT . '/app/messages'];
$files = [];
foreach ($scanRoots as $root) {
    if (!is_dir($root)) continue;
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $f) {
        if ($f->isFile()) $files[] = str_replace('\\', '/', $f->getPathname());
    }
}
$hits = [];
$scannedText = 0;
foreach ($files as $f) {
    if (!preg_match($textExt, $f)) continue;
    $scannedText++;
    $t = (string) file_get_contents($f);
    foreach ($patterns as $label => $re) if (preg_match($re, $t)) $hits[] = "$label dans " . str_replace(REPO_ROOT . '/', '', $f);
}
check('02', "aucun motif de clé dans php/public/ et app/views/admin/ ($scannedText fichiers texte)", !$hits, implode('; ', $hits));
// Valeurs réelles de php/.env : comparées en mémoire seulement, jamais affichées
$realEnv = PHP_ROOT . '/.env';
if (!is_file($realEnv)) {
    skip('11', 'valeurs réelles de php/.env absentes des fichiers livrés', 'pas de php/.env sur ce poste (CI)');
} else {
    $secrets = [];
    foreach (file($realEnv, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        if (!preg_match('/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/', $line, $m)) continue;
        $val = trim($m[2]);
        if (strlen($val) >= 2 && ($val[0] === '"' || $val[0] === "'") && $val[-1] === $val[0]) $val = substr($val, 1, -1);
        if (preg_match('/PASSWORD|SECRET|TOKEN|KEY|CERT|CLIENT_ID|APP_ID|DEV_ID|RUNAME|USERNAME/', $m[1]) && strlen($val) >= 8) $secrets[$m[1]] = $val;
    }
    $found = [];
    foreach ($files as $f) {
        $t = (string) file_get_contents($f);
        foreach ($secrets as $k => $val) if (str_contains($t, $val)) $found[] = "$k dans " . str_replace(REPO_ROOT . '/', '', $f);
    }
    unset($secrets);
    check('11', 'valeurs réelles de php/.env (' . count($files) . ' fichiers livrés, binaires compris) : aucune trouvée', !$found, implode('; ', $found));
}
$envExample = (string) file_get_contents(PHP_ROOT . '/.env.example');
$filled = [];
foreach (preg_split('/\R/', $envExample) ?: [] as $line) {
    if (preg_match('/^(RESEND_API_KEY|ADMIN_PASSWORD_HASH|ADMIN_PASSWORD|ADMIN_SESSION_SECRET|GOOGLE_CLIENT_SECRET|GOOGLE_REFRESH_TOKEN|EBAY_CERT_ID|EBAY_REFRESH_TOKEN)=(.+)$/', trim($line), $m)) $filled[] = $m[1];
}
check('11', '.env.example : aucune valeur secrète remplie', !$filled, implode(', ', $filled));
[$code, $ignored] = run(['git', 'check-ignore', '-q', 'php/.env'], REPO_ROOT);
check('11', 'php/.env ignoré par git', $code === 0, "code $code");
[$code, $tracked] = run(['git', 'ls-files', 'php/.env', 'php/storage'], REPO_ROOT);
check('11', 'aucun .env ni donnée de storage/ suivi par git', !preg_match('#php/\.env$|php/storage/.*\.(json|log)$#m', $tracked), snip($tracked));

/* ───────────── Vérifications statiques du code (10, 18, 19, 22, B2) ───────────── */
section('10/18/19/22/B2 Vérifications statiques du code');
$phpFiles = [];
foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator(PHP_ROOT . '/app', FilesystemIterator::SKIP_DOTS)) as $f) {
    if ($f->isFile() && str_ends_with($f->getFilename(), '.php')) $phpFiles[str_replace('\\', '/', $f->getPathname())] = (string) file_get_contents($f->getPathname());
}
$phpFiles[PUBLIC_ROOT . '/index.php'] = (string) file_get_contents(PUBLIC_ROOT . '/index.php');
$adminHtml = '';
foreach (glob(REPO_ROOT . '/public/admin/*.html') ?: [] as $f) $adminHtml .= (string) file_get_contents($f);
$grepCode = function (string $re) use ($phpFiles): array {
    $hits = [];
    foreach ($phpFiles as $f => $t) if (preg_match($re, $t)) $hits[] = str_replace(REPO_ROOT . '/', '', $f);
    return $hits;
};
$h = $grepCode('/\b(exec|shell_exec|system|passthru|popen|proc_open|pcntl_exec|eval|assert|unserialize|create_function|mail)\s*\(|`[^`\n]*\$[a-z]/i');
check('10', 'aucune exécution de commande, eval, unserialize ni mail() dans php/app et index.php', !$h, implode(', ', $h));
$h = $grepCode('/\b(include|require)(_once)?\s*\(?\s*\$_(GET|POST|REQUEST|COOKIE|SERVER)/');
check('10', 'aucun include/require construit depuis la requête', !$h, implode(', ', $h));
$h = $grepCode('/\$_FILES|move_uploaded_file/');
check('18', 'aucun envoi de fichier côté serveur ($_FILES, move_uploaded_file)', !$h && !preg_match('/type\s*=\s*["\']?file/i', $adminHtml), implode(', ', $h));
$h = $grepCode('/stripe|paypal|braintree|squareup|moneris|checkout\.session/i');
check('19', 'aucun code de paiement (Stripe, PayPal, Square, Moneris…)', !$h && !preg_match('/stripe|paypal|braintree|squareup|moneris/i', $adminHtml), implode(', ', $h));
check('22', 'aucune dépendance PHP tierce (pas de composer.json ni vendor/)', !is_file(PHP_ROOT . '/composer.json') && !is_dir(PHP_ROOT . '/vendor'));
$hosts = [];
foreach (['app/lib/google_calendar.php', 'app/lib/ebay.php', 'app/lib/mailer.php'] as $f) {
    preg_match_all('#https?://([a-z0-9.\-]+)#i', (string) file_get_contents(PHP_ROOT . "/$f"), $mm);
    $hosts = array_merge($hosts, $mm[1]);
}
$allowedHosts = ['oauth2.googleapis.com', 'accounts.google.com', 'www.googleapis.com', 'api.ebay.com', 'apiz.ebay.com', 'api.resend.com', 'www.ebay.ca', 'www.ebay.com'];
$unexpected = array_values(array_diff(array_unique(array_map('strtolower', $hosts)), $allowedHosts));
check('B2', 'appels sortants seulement vers des hôtes fixes (Google, eBay, Resend)', !$unexpected, implode(', ', $unexpected));
$h = $grepCode('/curl_init\s*\(\s*\$_(GET|POST|REQUEST)|CURLOPT_URL\s*=>\s*\$_(GET|POST|REQUEST)/');
check('B2', 'aucune URL fournie par la requête passée à cURL', !$h, implode(', ', $h));
$cb = (string) file_get_contents(PHP_ROOT . '/app/api/google/callback.php');
check('01', 'OAuth Google : le refresh token n\'est jamais inséré dans la page (enregistré dans storage/)',
    !preg_match('/\.\s*\$refreshToken|\$refreshToken\s*\./', $cb) && str_contains($cb, 'google_store_refresh_token($refreshToken)'));
$r = http('GET', $A['base'] . '/api/google/callback?code=abc&state=forged', ['cookie' => $cookie3 . '; ilr_google_oauth_state=other']);
check('01', 'OAuth Google : state différent du cookie → refus, aucun échange de code', $r['status'] === 200 && str_contains($r['body'], 'state ne correspond pas'), "statut {$r['status']}");
$third = '';
foreach ([PHP_ROOT . '/app/views/layout.php', PHP_ROOT . '/app/views/admin/login.html', PHP_ROOT . '/app/views/admin/dashboard.html'] as $f) $third .= (string) file_get_contents($f);
foreach (glob(PUBLIC_ROOT . '/assets/{,*/}*.{js,css}', GLOB_BRACE) ?: [] as $f) $third .= (string) file_get_contents($f);
check('B6', 'aucune ressource tierce chargée sans consentement (Google Fonts, raw.githack.com) : polices et HDR auto-hébergés',
    // Chargements seulement (href/src, url(), @import, chaînes JS) ; un commentaire citant la source n'est pas un chargement
    !preg_match('#((href|src)\s*=\s*["\']?|url\(\s*["\']?|@import\s+["\']?|["\'`])(https?:)?//(fonts\.(googleapis|gstatic)\.com|raw\.githack\.com)#i', $third));
foreach (['secret de 31 caractères' => ['ADMIN_SESSION_SECRET' => str_repeat('s', 31)],
          'sans ADMIN_SESSION_SECRET' => ['ADMIN_SESSION_SECRET' => ''],
          'production sans SITE_URL' => ['SITE_URL' => ''],
          'sans mot de passe' => ['ADMIN_PASSWORD_HASH' => '']] as $label => $over) {
    $u = unit('cfg-' . md5($label), 'config', array_merge(['ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD_HASH' => $HASH,
        'ADMIN_SESSION_SECRET' => $SECRET, 'SITE_URL' => 'https://example.test'], $over));
    check('11', "admin refusé (fail closed) : $label", ($u['admin_configured'] ?? null) === false, j($u));
}
$u = unit('cfg-ok', 'config', ['ADMIN_USERNAME' => $USER, 'ADMIN_PASSWORD_HASH' => $HASH, 'ADMIN_SESSION_SECRET' => $SECRET, 'SITE_URL' => 'https://example.test']);
check('11', 'contrôle : configuration complète → admin utilisable', ($u['admin_configured'] ?? null) === true, j($u));

/* ───────────── 24 Crochet pre-commit ───────────── */
section('24 Crochet pre-commit');
$repo = TMP . '/git-hook-test';
@mkdir($repo . '/.githooks', 0700, true);
copy(REPO_ROOT . '/.githooks/pre-commit', $repo . '/.githooks/pre-commit');
@chmod($repo . '/.githooks/pre-commit', 0755);
$git = fn (array $args) => run(array_merge(['git', '-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false'], $args), $repo, child_env());
[$c0] = $git(['init', '-q']);
$git(['config', 'core.hooksPath', '.githooks']);
if ($c0 !== 0) {
    skip('24', 'crochet pre-commit', 'git introuvable');
} else {
    file_put_contents($repo . '/ok.txt', "rien de secret\n");
    $git(['add', 'ok.txt']);
    [$c] = $git(['commit', '-q', '-m', 'ok']);
    check('24', 'commit sans secret → accepté', $c === 0, "code $c");
    // Faux secrets construits à l'exécution (ce fichier ne contient aucun motif complet)
    $fakes = [
        'Google client secret' => 'GOCSPX' . '-' . str_repeat('Ab1x', 7),
        'Resend' => 're' . '_' . str_repeat('Zq9', 9),
        'Google refresh' => '1/' . '/0' . str_repeat('gH7k', 8),
        'eBay' => 'v^1' . '.1#i^1#' . str_repeat('Rk3', 10),
        // Clé privée sur une ligne (format JSON d'un compte de service) : le corps de la clé ne doit pas s'afficher
        'clé privée' => '"private_key": "-----BEGIN ' . 'PRIVATE KEY-----\\n' . 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSj' . str_repeat('Qx7', 10) . '"',
    ];
    foreach ($fakes as $label => $fake) {
        file_put_contents($repo . '/config.txt', "valeur = $fake\n");
        $git(['add', 'config.txt']);
        [$c, $o, $e] = $git(['commit', '-q', '-m', 'secret']);
        // Partie secrète : la valeur entière, ou pour une clé privée son contenu (l'en-tête BEGIN n'est pas secret)
        $secretPart = $label === 'clé privée' ? 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSj' : $fake;
        check('24', "commit avec un faux secret ($label) → bloqué, valeur masquée", $c !== 0 && str_contains($e, 'secret probable') && !str_contains($e, $secretPart), "code $c " . snip($e, 120));
        $git(['reset', '-q', 'HEAD', 'config.txt']);
        @unlink($repo . '/config.txt');
    }
    file_put_contents($repo . '/.env', "X=1\n");
    $git(['add', '-f', '.env']);
    [$c, $o, $e] = $git(['commit', '-q', '-m', 'env']);
    check('24', 'commit d\'un fichier .env → bloqué', $c !== 0 && str_contains($e, 'fichier interdit'), "code $c " . snip($e, 120));
    $git(['reset', '-q', 'HEAD', '.env']);
    @mkdir($repo . '/php/storage', 0700, true);
    file_put_contents($repo . '/php/storage/google_access_token.json', '{}');
    $git(['add', '-f', 'php/storage/google_access_token.json']);
    [$c, $o, $e] = $git(['commit', '-q', '-m', 'storage']);
    check('24', 'commit d\'un jeton de php/storage/ → bloqué', $c !== 0 && str_contains($e, 'storage'), "code $c " . snip($e, 120));
}

/* ───────────── 27 CI ───────────── */
section('27 Intégration continue');
$wf = REPO_ROOT . '/.github/workflows/security.yml';
$wft = is_file($wf) ? (string) file_get_contents($wf) : '';
check('27', '.github/workflows/security.yml lance cette suite après le build', str_contains($wft, 'php php/tests/security_test.php') && str_contains($wft, 'node php/build.mjs'));

/* ───────────── Bilan ───────────── */
stop_servers();
$byId = [];
$fail = 0;
$pass = 0;
$skipped = 0;
foreach ($GLOBALS['results'] as $res) {
    $byId[$res['id']] ??= [0, 0, 0];
    if ($res['ok'] === true) { $byId[$res['id']][0]++; $pass++; }
    elseif ($res['ok'] === false) { $byId[$res['id']][1]++; $fail++; }
    else { $byId[$res['id']][2]++; $skipped++; }
}
ksort($byId);
section('Bilan par vérification');
foreach ($byId as $id => [$p, $f, $s]) printf("  [%s] %3d réussis  %d échoués%s\n", $id, $p, $f, $s ? "  $s ignorés" : '');
printf("\nTOTAL : %d réussis, %d échoués, %d ignorés\n", $pass, $fail, $skipped);
exit($fail > 0 ? 1 : 0);
