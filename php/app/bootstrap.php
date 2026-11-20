<?php
/** Initialisation commune : chemins, configuration, bibliothèques. */

declare(strict_types=1);

define('APP_DIR', __DIR__);
define('ROOT_DIR', dirname(__DIR__));
define('PUBLIC_DIR', ROOT_DIR . '/public');
define('STORAGE_DIR', ROOT_DIR . '/storage');

require_once APP_DIR . '/lib/env.php';
load_env(ROOT_DIR . '/.env');

define('SITE_URL', rtrim(env('SITE_URL', env('NEXT_PUBLIC_SITE_URL', 'https://infoliquidationrecycle.com')), '/'));

mb_internal_encoding('UTF-8');
date_default_timezone_set('America/Toronto');

require_once APP_DIR . '/lib/http.php';
require_once APP_DIR . '/lib/site.php';
require_once APP_DIR . '/lib/i18n.php';
require_once APP_DIR . '/lib/router.php';
require_once APP_DIR . '/lib/seo.php';
require_once APP_DIR . '/lib/view.php';
require_once APP_DIR . '/lib/components.php';
