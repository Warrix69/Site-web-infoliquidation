<?php
/**
 * ════════════════════════════════════════════════════════════════════════════
 *  ENVOI DES COURRIELS : LE SEUL ENDROIT À MODIFIER CHEZ L'HÉBERGEUR
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Tous les courriels du site passent par la fonction mail_transport_send() ci-dessous :
 *   - demandes de ramassage et messages de contact  → info@infoliquidationrecycle.com
 *   - certificats de destruction (PDF joint)        → le client, copie cachée à info@
 *
 * Pour utiliser le système de courriel de l'hébergeur (SMTP avec PHPMailer, API maison…),
 * il suffit de remplacer la partie marquée de mail_transport_send() en gardant sa signature :
 * recevoir $message (format décrit plus bas) et retourner true si le courriel est parti,
 * false sinon. Rien d'autre dans le site n'a besoin de changer.
 *
 * TANT QUE CE N'EST PAS FAIT, AUCUN COURRIEL NE PART EN PRODUCTION : les formulaires répondent une
 * erreur (502, la demande n'est jamais perdue en silence) et l'admin affiche « envoi impossible ».
 * L'événement « mail_not_configured » est inscrit dans storage/logs/security.log.
 * (Exception : si RESEND_API_KEY est défini dans le .env, Resend est utilisé.)
 * En développement (APP_ENV=development) : rien n'est envoyé, le courriel complet est écrit
 * dans le journal du serveur.
 *
 * Sécurité : ne pas utiliser la fonction mail de PHP avec des valeurs saisies par les visiteurs
 * (injection d'en-têtes) ; préférer une bibliothèque SMTP (ex. PHPMailer) ou l'API de l'hébergeur.
 * Le sujet et les adresses reçus ici sont déjà nettoyés (aucun retour de ligne), le HTML est échappé.
 *
 * Format de $message :
 *   [
 *     'from'        => 'Info Liquidation Recycle <info@infoliquidationrecycle.com>',  // MAIL_FROM du .env
 *     'to'          => ['client@exemple.com'],            // une ou plusieurs adresses (déjà validées)
 *     'bcc'         => ['info@infoliquidationrecycle.com'], // peut être vide
 *     'reply_to'    => 'info@infoliquidationrecycle.com',   // ou null
 *     'subject'     => 'Sujet (déjà nettoyé : sans retour de ligne)',
 *     'html'        => '<p>Corps du courriel en HTML</p>',
 *     'attachments' => [                                    // peut être vide
 *        ['filename' => 'certificat-destruction-ilr-2026-0001.pdf',
 *         'content'  => '<contenu encodé en base64>',
 *         'type'     => 'application/pdf'],
 *     ],
 *   ]
 */

/** @param array{from: string, to: string[], bcc: string[], reply_to: ?string, subject: string, html: string, attachments: array} $message */
function mail_transport_send(array $message): bool
{
    // ─── Début de la partie à remplacer par l'hébergeur ───────────────────────
    if (env('RESEND_API_KEY')) return mail_transport_resend($message);

    if (app_is_dev()) {
        $files = array_map(
            fn ($a) => $a['filename'] . ' (' . (int) (strlen($a['content']) * 3 / 4) . ' octets)',
            $message['attachments']
        );
        error_log(
            "[infoliquidation] (développement) courriel non envoyé, journalisé seulement.\n"
            . 'À : ' . implode(', ', $message['to']) . "\n"
            . 'Sujet : ' . $message['subject'] . "\n"
            . 'Réponse à : ' . ($message['reply_to'] ?? 'n/d') . "\n"
            . 'Pièces jointes : ' . ($files ? implode(', ', $files) : 'aucune') . "\n"
            . "Contenu :\n" . $message['html']
        );
        return true;
    }

    // Production sans système d'envoi : échec visible (jamais de perte silencieuse),
    // aucune donnée personnelle dans les journaux
    security_log('mail_not_configured', ['outcome' => 'error', 'missing' => 'mail_transport_send (app/lib/mail_transport.php)']);
    error_log('[infoliquidation] Courriel NON envoyé : brancher le système de courriel de l\'hébergeur dans app/lib/mail_transport.php.');
    return false;
    // ─── Fin de la partie à remplacer ─────────────────────────────────────────
}

/* ───────────── Implémentation fournie (facultative) ───────────── */

/** API de Resend (https://resend.com), utilisée seulement si RESEND_API_KEY est défini dans le .env. */
function mail_transport_resend(array $m): bool
{
    $payload = [
        'from' => $m['from'],
        'to' => $m['to'],
        'subject' => $m['subject'],
        'html' => $m['html'],
    ];
    if (!empty($m['bcc'])) $payload['bcc'] = $m['bcc'];
    if (!empty($m['reply_to'])) $payload['reply_to'] = $m['reply_to'];
    if (!empty($m['attachments'])) {
        $payload['attachments'] = array_map(fn ($a) => ['filename' => $a['filename'], 'content' => $a['content']], $m['attachments']);
    }
    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, curl_base_opts() + [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . env('RESEND_API_KEY'),
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
        security_log('mail_send_failed', ['outcome' => 'error', 'transport' => 'resend', 'status' => $status]);
        return false;
    }
    return true;
}
