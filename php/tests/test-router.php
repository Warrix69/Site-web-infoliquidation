<?php
/**
 * Contrôleur frontal de TEST (serveur intégré de PHP seulement), lancé par tests/security_test.php :
 *
 *   ILR_TEST_CONFIG=<fichier.json> php -S 127.0.0.1:<port> -t php/public php/tests/test-router.php
 *
 * Le fichier JSON (créé par la suite de tests dans un dossier temporaire) contient :
 *   { "envFile": "<.env de test>", "storage": "<dossier storage temporaire>", "env": { CLÉ: valeur, … } }
 *
 * - Le vrai php/.env n'est JAMAIS lu : ENV_FILE pointe sur le .env de test.
 * - Le vrai php/storage/ n'est jamais touché : STORAGE_DIR pointe sur le dossier temporaire
 *   (compteurs anti-abus, révocation des sessions, journaux, jetons Google/eBay absents).
 * - Les valeurs de test sont aussi forcées dans $_ENV / putenv, pour qu'aucune variable
 *   d'environnement du poste ne puisse les remplacer.
 * Ce fichier n'est jamais déployé (php/.htaccess refuse tout ; README : ne pas téléverser tests/).
 */

if (PHP_SAPI !== 'cli-server') {
    http_response_code(404);
    exit;
}

$remote = $_SERVER['REMOTE_ADDR'] ?? '';
if ($remote !== '127.0.0.1' && $remote !== '::1') {
    http_response_code(403);
    exit;
}

$configFile = getenv('ILR_TEST_CONFIG');
$config = is_string($configFile) && is_file($configFile) ? json_decode((string) file_get_contents($configFile), true) : null;
if (!is_array($config) || empty($config['envFile']) || empty($config['storage']) || !is_array($config['env'] ?? null)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "test-router: configuration de test absente (ILR_TEST_CONFIG).\n";
    exit;
}

// Garde-fou : le dossier storage de test doit être un dossier temporaire, jamais php/storage
$realStorage = realpath(dirname(__DIR__) . '/storage');
$testStorage = realpath($config['storage']);
if ($testStorage === false || ($realStorage !== false && strcasecmp($testStorage, $realStorage) === 0)) {
    http_response_code(500);
    echo "test-router: dossier storage de test invalide.\n";
    exit;
}

foreach ($config['env'] as $k => $v) {
    $v = (string) $v;
    $_ENV[$k] = $v;
    putenv("$k=$v");
}

define('ENV_FILE', $config['envFile']);
define('STORAGE_DIR', $testStorage);

// « return » : le contrôleur frontal retourne false pour les fichiers statiques (php -S les sert alors)
return require dirname(__DIR__) . '/public/index.php';
