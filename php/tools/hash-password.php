<?php
/**
 * Génère ADMIN_PASSWORD_HASH pour le .env (ligne de commande seulement).
 *
 *   php php/tools/hash-password.php            → Argon2id si disponible, sinon bcrypt (coût 12)
 *   php php/tools/hash-password.php --bcrypt   → force bcrypt (si le serveur n'a pas Argon2id)
 *
 * Le mot de passe est lu au clavier (masqué sous Linux/macOS) ou depuis l'entrée standard :
 *   printf '%s' 'mot-de-passe' | php php/tools/hash-password.php   (évite l'historique du shell : préférer la saisie)
 * Idéalement, lancer l'outil sur le serveur (cPanel → Terminal) : le haché doit utiliser un
 * algorithme disponible sur le PHP de production.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    // Jamais exécutable depuis le web
    http_response_code(404);
    exit;
}

const MAX_BYTES = 1024;

$forceBcrypt = in_array('--bcrypt', $argv ?? [], true);
$interactive = function_exists('stream_isatty') && stream_isatty(STDIN);

/** Lit une ligne sans écho quand c'est possible (stty sous Unix). */
function read_secret(string $prompt, bool $interactive): string
{
    $hidden = false;
    if ($interactive) {
        fwrite(STDERR, $prompt);
        if (DIRECTORY_SEPARATOR === '/' && function_exists('shell_exec')) {
            @shell_exec('stty -echo 2>/dev/null');
            $hidden = true;
        } else {
            fwrite(STDERR, '(attention : la saisie sera visible) ');
        }
    }
    $line = fgets(STDIN);
    if ($hidden) {
        @shell_exec('stty echo 2>/dev/null');
        fwrite(STDERR, PHP_EOL);
    }
    return $line === false ? '' : rtrim($line, "\r\n");
}

$password = read_secret('Mot de passe admin : ', $interactive);
if ($interactive) {
    $again = read_secret('Confirmer : ', $interactive);
    if (!hash_equals($password, $again)) {
        fwrite(STDERR, "Les deux saisies diffèrent.\n");
        exit(1);
    }
}

if ($password === '') {
    fwrite(STDERR, "Mot de passe vide.\n");
    exit(1);
}
if (strlen($password) > MAX_BYTES) {
    fwrite(STDERR, "Mot de passe trop long (1024 octets maximum).\n");
    exit(1);
}
if (strlen($password) < 20) {
    fwrite(STDERR, "Avertissement : moins de 20 caractères. Un mot de passe long et aléatoire est recommandé.\n");
}

if (!$forceBcrypt && defined('PASSWORD_ARGON2ID')) {
    $hash = password_hash($password, PASSWORD_ARGON2ID);
} else {
    if (strlen($password) > 72) {
        fwrite(STDERR, "Avertissement : bcrypt n'utilise que les 72 premiers octets du mot de passe.\n");
    }
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
}

fwrite(STDOUT, "ADMIN_PASSWORD_HASH='$hash'\n");
fwrite(STDERR, "Copier cette ligne dans le .env du serveur, puis retirer ADMIN_PASSWORD.\n");
