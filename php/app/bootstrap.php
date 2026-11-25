<?php
/** Initialisation commune : chemins, configuration, bibliothèques. */

declare(strict_types=1);

define('APP_DIR', __DIR__);
define('ROOT_DIR', dirname(__DIR__));
// PUBLIC_DIR est défini par public/index.php (son propre dossier) : fonctionne aussi quand
// le contenu de public/ est copié dans public_html/ avec app/, storage/ et .env un niveau au-dessus.
defined('PUBLIC_DIR') || define('PUBLIC_DIR', ROOT_DIR . '/public');
// STORAGE_DIR / ENV_FILE : redéfinissables uniquement par un point d'entrée PHP (jamais par la requête) ;
// utilisé par la suite de tests (php/tests/test-router.php) pour un dossier et un .env temporaires.
defined('STORAGE_DIR') || define('STORAGE_DIR', ROOT_DIR . '/storage');
defined('ENV_FILE') || define('ENV_FILE', ROOT_DIR . '/.env');

require_once APP_DIR . '/lib/env.php';
load_env(ENV_FILE);

// Mode : « production » par défaut ; « development » seulement si APP_ENV=development dans .env
define('APP_ENV', env('APP_ENV') === 'development' ? 'development' : 'production');

function app_is_dev(): bool
{
    return APP_ENV === 'development';
}

define('SITE_URL', rtrim(env('SITE_URL', env('NEXT_PUBLIC_SITE_URL', 'https://infoliquidationrecycle.com')), '/'));

// Erreurs PHP : jamais affichées au visiteur en production, journalisées dans storage/logs/
if (!app_is_dev()) {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('log_errors', '1');
    $logDir = STORAGE_DIR . '/logs';
    if (is_dir($logDir) || @mkdir($logDir, 0700, true) || is_dir($logDir)) {
        ini_set('error_log', $logDir . '/php_errors.log');
    }
    unset($logDir);
}

mb_internal_encoding('UTF-8');
date_default_timezone_set('America/Toronto');

require_once APP_DIR . '/lib/http.php';
require_once APP_DIR . '/lib/security_log.php';
require_once APP_DIR . '/lib/site.php';
require_once APP_DIR . '/lib/i18n.php';
require_once APP_DIR . '/lib/router.php';
require_once APP_DIR . '/lib/seo.php';
require_once APP_DIR . '/lib/view.php';
require_once APP_DIR . '/lib/components.php';

/**
 * Variables obligatoires en production (noms seulement, jamais les valeurs).
 * Le site public continue de fonctionner ; l'admin répond 503 et les formulaires 502.
 */
function config_missing(): array
{
    $missing = [];
    if (env('SITE_URL') === null && env('NEXT_PUBLIC_SITE_URL') === null) $missing[] = 'SITE_URL';
    if (strlen((string) env('ADMIN_SESSION_SECRET', '')) < 32) $missing[] = 'ADMIN_SESSION_SECRET (32+ caractères)';
    // Courriel : plus de clé obligatoire (envoi par le serveur de l'hébergeur, voir app/lib/mail_transport.php)
    return $missing;
}

// Avertissement de configuration : au plus une fois par heure dans le journal de sécurité
if (!app_is_dev() && ($missingConfig = config_missing())) {
    $stamp = STORAGE_DIR . '/logs/.config-warning';
    $last = @filemtime($stamp);
    if ($last === false || $last < time() - 3600) {
        @touch($stamp);
        security_log('config_missing', ['outcome' => 'error', 'missing' => implode(', ', $missingConfig)]);
        error_log('[infoliquidation] Configuration incomplète (.env) : ' . implode(', ', $missingConfig));
    }
}
unset($missingConfig, $stamp, $last);

// Toute réponse 5xx (ou erreur fatale) est notée dans le journal de sécurité
register_shutdown_function(static function (): void {
    $err = error_get_last();
    $fatal = $err !== null && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true);
    $code = (int) http_response_code();
    if ($fatal || $code >= 500) {
        security_log('server_error', ['outcome' => 'error', 'status' => $fatal ? 500 : $code, 'fatal' => $fatal]);
    }
});
