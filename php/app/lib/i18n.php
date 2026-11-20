<?php
/**
 * Traductions (port de next-intl). Les messages sont les mêmes fichiers
 * JSON que le site Next.js : app/messages/{fr,en}.json.
 */

const LOCALES = ['fr', 'en'];
const DEFAULT_LOCALE = 'fr';

$GLOBALS['__locale'] = DEFAULT_LOCALE;
$GLOBALS['__messages'] = [];

function set_locale(string $locale): void
{
    $GLOBALS['__locale'] = in_array($locale, LOCALES, true) ? $locale : DEFAULT_LOCALE;
}

function locale(): string
{
    return $GLOBALS['__locale'];
}

function messages(?string $locale = null): array
{
    $locale ??= locale();
    if (!isset($GLOBALS['__messages'][$locale])) {
        $file = APP_DIR . "/messages/$locale.json";
        $GLOBALS['__messages'][$locale] = json_decode(file_get_contents($file), true) ?: [];
    }
    return $GLOBALS['__messages'][$locale];
}

/** Valeur brute (tableau ou chaîne) — équivalent de t.raw(). */
function tr(string $key, ?string $locale = null)
{
    $node = messages($locale);
    foreach (explode('.', $key) as $part) {
        if (!is_array($node) || !array_key_exists($part, $node)) return null;
        $node = $node[$part];
    }
    return $node;
}

/** Chaîne traduite avec interpolation {var} — équivalent de t(). Non échappée. */
function t(string $key, array $values = [], ?string $locale = null): string
{
    $v = tr($key, $locale);
    if (!is_string($v)) return $key;
    foreach ($values as $k => $val) $v = str_replace('{' . $k . '}', (string) $val, $v);
    return $v;
}

/** Chaîne traduite et échappée pour le HTML. */
function te(string $key, array $values = []): string
{
    return e(t($key, $values));
}
