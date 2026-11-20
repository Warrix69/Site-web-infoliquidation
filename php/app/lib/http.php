<?php
/** Petites fonctions HTTP partagées par les pages et les API. */

function json_response($data, int $status = 200, array $headers = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    foreach ($headers as $k => $v) header("$k: $v");
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Corps JSON de la requête (tableau associatif) ou null si invalide. */
function json_body(): ?array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function redirect(string $to, int $status = 302): never
{
    header("Location: $to", true, $status);
    header('Cache-Control: no-store');
    exit;
}

function request_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function client_ip(): string
{
    // Les en-têtes X-Forwarded-For / CF-Connecting-IP ne sont fiables que derrière un proxy connu
    // (TRUST_PROXY=1 dans .env) ; sinon n'importe qui pourrait contourner le blocage des connexions.
    if (env('TRUST_PROXY') === '1') {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP'] as $h) {
            if (!empty($_SERVER[$h])) return trim(explode(',', $_SERVER[$h])[0]);
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/** Échappement HTML — à utiliser pour toute valeur affichée. */
function e($v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
