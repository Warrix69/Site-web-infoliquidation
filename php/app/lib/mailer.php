<?php
/**
 * Envoi de courriel via l'API REST de Resend (port de src/lib/email.ts).
 *
 * Destinataire : info@infoliquidationrecycle.com (SITE.email côté Next.js).
 * Sans RESEND_API_KEY, la soumission est journalisée (error_log) et le succès
 * est retourné au client, comme la version Next.js en développement.
 */

const ILR_BUSINESS_EMAIL = 'info@infoliquidationrecycle.com';

function send_business_email(string $subject, string $html, ?string $replyTo = null): bool
{
    $apiKey = env('RESEND_API_KEY');

    if (!$apiKey) {
        error_log(
            "[infoliquidation] RESEND_API_KEY absente — courriel non envoyé.\n"
            . "Sujet : $subject\nRéponse à : " . ($replyTo ?? 'n/d') . "\nContenu :\n$html"
        );
        return true;
    }

    $payload = [
        'from' => env('RESEND_FROM', 'Info Liquidation Recycle <onboarding@resend.dev>'),
        'to' => [ILR_BUSINESS_EMAIL],
        'subject' => $subject,
        'html' => $html,
    ];
    if ($replyTo !== null && $replyTo !== '') $payload['reply_to'] = $replyTo;

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
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
        error_log('[infoliquidation] Erreur Resend : ' . ($body === false ? $err : "HTTP $status " . substr((string) $body, 0, 1000)));
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
