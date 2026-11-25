<?php
/**
 * Envoi de courriel via l'API REST de Resend (port de src/lib/email.ts).
 *
 * Destinataire : info@infoliquidationrecycle.com (SITE.email côté Next.js).
 * Sans RESEND_API_KEY (ou sans RESEND_FROM) :
 *  - production : échec (false → l'API répond 502) ; seul le fait est journalisé, jamais le contenu ;
 *  - développement (APP_ENV=development) : la soumission est journalisée et le succès retourné.
 */

const ILR_BUSINESS_EMAIL = 'info@infoliquidationrecycle.com';
const ILR_DEV_FROM = 'Info Liquidation Recycle <onboarding@resend.dev>';

/** Texte sûr pour un en-tête (sujet, nom d'expéditeur) : sans CR/LF ni caractères de contrôle, tronqué. */
function mail_header_text(string $value, int $max = 200): string
{
    $v = preg_replace('/[\x00-\x1F\x7F\x{0085}\x{2028}\x{2029}]+/u', ' ', mb_scrub($value, 'UTF-8')) ?? '';
    $v = trim(preg_replace('/ {2,}/', ' ', $v) ?? '');
    return mb_substr($v, 0, $max, 'UTF-8');
}

/** Adresse de réponse : validée, sinon ignorée. */
function mail_safe_address(?string $email): ?string
{
    if ($email === null) return null;
    $email = trim($email);
    if ($email === '' || strlen($email) > 254 || preg_match('/[\x00-\x1F\x7F]/', $email)) return null;
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false ? $email : null;
}

function send_business_email(string $subject, string $html, ?string $replyTo = null): bool
{
    $apiKey = env('RESEND_API_KEY');
    $from = env('RESEND_FROM');
    $subject = mail_header_text($subject);
    $replyTo = mail_safe_address($replyTo);

    if (!$apiKey || (!$from && !app_is_dev())) {
        if (app_is_dev()) {
            error_log(
                "[infoliquidation] (développement) RESEND_API_KEY absente — courriel non envoyé.\n"
                . "Sujet : $subject\nRéponse à : " . ($replyTo ?? 'n/d') . "\nContenu :\n$html"
            );
            return true;
        }
        // Production : aucune donnée personnelle dans les journaux
        security_log('mail_not_configured', ['outcome' => 'error', 'missing' => !$apiKey ? 'RESEND_API_KEY' : 'RESEND_FROM']);
        error_log('[infoliquidation] Courriel NON envoyé : RESEND_API_KEY ou RESEND_FROM absente du .env.');
        return false;
    }

    $payload = [
        'from' => mail_header_text($from ?: ILR_DEV_FROM, 320),
        'to' => [ILR_BUSINESS_EMAIL],
        'subject' => $subject,
        'html' => $html,
    ];
    if ($replyTo !== null) $payload['reply_to'] = $replyTo;

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, curl_base_opts() + [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE),
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($body === false || $status < 200 || $status >= 300) {
        error_log('[infoliquidation] Erreur Resend : ' . security_log_scrub($body === false ? $err : "HTTP $status " . (string) $body, 1000));
        security_log('mail_send_failed', ['outcome' => 'error', 'status' => $status]);
        return false;
    }
    return true;
}

/** Échappe le HTML des valeurs saisies par l'utilisateur (identique à escapeHtml côté TS). */
function escape_html(string $value): string
{
    return strtr($value, [
        '&' => '&amp;',
        '<' => '&lt;',
        '>' => '&gt;',
        '"' => '&quot;',
        "'" => '&#39;',
    ]);
}
