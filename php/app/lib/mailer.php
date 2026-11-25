<?php
/**
 * Préparation des courriels du site (port de src/lib/email.ts).
 * L'ENVOI lui-même se fait dans app/lib/mail_transport.php : c'est le seul fichier
 * que l'hébergeur doit adapter à son système de courriel.
 *
 *  - send_business_email()       : formulaires (ramassage, contact) → info@infoliquidationrecycle.com
 *  - send_email_with_attachment() : certificat de destruction → le client (PDF joint), copie cachée à info@
 */

require_once __DIR__ . '/mail_transport.php';

const ILR_BUSINESS_EMAIL = 'info@infoliquidationrecycle.com';
const ILR_DEFAULT_FROM = 'Info Liquidation Recycle <info@infoliquidationrecycle.com>';

/** Texte sûr pour un en-tête (sujet, nom d'expéditeur) : sans CR/LF ni caractères de contrôle, tronqué. */
function mail_header_text(string $value, int $max = 200): string
{
    $v = preg_replace('/[\x00-\x1F\x7F\x{0085}\x{2028}\x{2029}]+/u', ' ', mb_scrub($value, 'UTF-8')) ?? '';
    $v = trim(preg_replace('/ {2,}/', ' ', $v) ?? '');
    return mb_substr($v, 0, $max, 'UTF-8');
}

/** Adresse : validée, sinon ignorée. */
function mail_safe_address(?string $email): ?string
{
    if ($email === null) return null;
    $email = trim($email);
    if ($email === '' || strlen($email) > 254 || preg_match('/[\x00-\x1F\x7F]/', $email)) return null;
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false ? $email : null;
}

/** Expéditeur : MAIL_FROM (ou l'ancien RESEND_FROM) du .env, sinon info@infoliquidationrecycle.com. */
function mail_from(): string
{
    return mail_header_text(env('MAIL_FROM') ?? env('RESEND_FROM') ?? ILR_DEFAULT_FROM, 320);
}

function send_business_email(string $subject, string $html, ?string $replyTo = null): bool
{
    return mail_transport_send([
        'from' => mail_from(),
        'to' => [ILR_BUSINESS_EMAIL],
        'bcc' => [],
        'reply_to' => mail_safe_address($replyTo),
        'subject' => mail_header_text($subject),
        'html' => $html,
        'attachments' => [],
    ]);
}

/**
 * Courriel à un client avec une pièce jointe (ex. certificat de destruction en PDF).
 * Copie cachée à info@ pour garder une trace ; réponses dirigées vers info@.
 */
function send_email_with_attachment(string $to, string $subject, string $html, string $filename, string $base64Content, string $type = 'application/pdf'): bool
{
    $to = mail_safe_address($to);
    if ($to === null) return false;
    return mail_transport_send([
        'from' => mail_from(),
        'to' => [$to],
        'bcc' => [ILR_BUSINESS_EMAIL],
        'reply_to' => ILR_BUSINESS_EMAIL,
        'subject' => mail_header_text($subject),
        'html' => $html,
        'attachments' => [[
            'filename' => preg_replace('/[^A-Za-z0-9._-]+/', '-', $filename) ?: 'document.pdf',
            'content' => $base64Content,
            'type' => $type,
        ]],
    ]);
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
