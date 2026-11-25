<?php
/**
 * Validation des formulaires publics, port de src/lib/schemas.ts (Zod 3).
 *
 * Les règles et les messages reproduisent ceux de Zod, y compris la forme de
 * `error.flatten()` renvoyée par l'API : { formErrors: [...], fieldErrors: { champ: [...] } }.
 *
 * Le corps JSON est décodé en objets (stdClass) pour distinguer {} de [] comme en JS.
 * Seuls les champs connus sont copiés (les autres sont ignorés), chaque chaîne a une
 * longueur maximale, les choix sont des listes fermées et les courriels sont mis en minuscules.
 * Le minimum de 10 items est aussi vérifié côté serveur (message SERVER_PICKUP_MESSAGES['minItems']).
 */

/** Taille maximale d'un corps JSON (formulaires et API admin). */
const JSON_BODY_MAX_BYTES = 64 * 1024;

// define() gardé : les pages du formulaire peuvent déjà avoir défini ces constantes (mêmes valeurs).
if (!defined('QUANTITY_KEYS')) {
    define('QUANTITY_KEYS', [
        'towers', 'servers', 'laptops', 'tablets', 'switches', 'lcd',
        'deskPhones', 'cellphones', 'printers', 'photocopiers', 'audioVideo', 'ups',
    ]);
}
if (!defined('MIN_ITEMS')) define('MIN_ITEMS', 10);

const SERVER_PICKUP_MESSAGES = [
    'titleRequired' => 'Titre requis',
    'firstNameRequired' => 'Prénom requis',
    'lastNameRequired' => 'Nom requis',
    'emailInvalid' => 'Courriel invalide',
    'phoneRequired' => 'Téléphone requis',
    'addressRequired' => 'Adresse requise',
    'cityRequired' => 'Ville requise',
    'postalCodeInvalid' => 'Code postal invalide',
    'certificateRequired' => 'Choix du certificat requis',
    'minItems' => 'Minimum de 10 items requis',
];

const SERVER_CONTACT_MESSAGES = [
    'nameRequired' => 'Nom requis',
    'emailInvalid' => 'Courriel invalide',
    'messageRequired' => 'Message requis',
];

/* ───────────── Lecture du corps ───────────── */

/**
 * Corps JSON brut de la requête, objets décodés en stdClass.
 * Lecture plafonnée à $max octets, quel que soit Content-Length (corps « chunked » compris).
 * @return array{ok: bool, value: mixed, tooLarge?: bool} ok=false si le JSON est absent, invalide ou trop gros.
 */
function read_json_input(int $max = JSON_BODY_MAX_BYTES): array
{
    $h = fopen('php://input', 'rb');
    $raw = $h === false ? false : stream_get_contents($h, $max + 1);
    if ($h !== false) fclose($h);
    if (is_string($raw) && strlen($raw) > $max) return ['ok' => false, 'value' => null, 'tooLarge' => true];
    if ($raw === false || trim($raw) === '') return ['ok' => false, 'value' => null];
    try {
        $value = json_decode($raw, false, 512, JSON_THROW_ON_ERROR);
    } catch (\JsonException $e) {
        return ['ok' => false, 'value' => null];
    }
    return ['ok' => true, 'value' => $value];
}

/** Taille du corps annoncée (Content-Length), 0 si absente. */
function request_content_length(): int
{
    $len = $_SERVER['CONTENT_LENGTH'] ?? $_SERVER['HTTP_CONTENT_LENGTH'] ?? '0';
    return is_numeric($len) ? (int) $len : 0;
}

/* ───────────── Équivalents JS ───────────── */

/** String.prototype.trim() : espaces Unicode + BOM. */
function js_trim(string $s): string
{
    $r = preg_replace('/^[\s\p{Z}\x{FEFF}]+|[\s\p{Z}\x{FEFF}]+$/uD', '', $s);
    return $r === null ? trim($s) : $r;
}

/** String.prototype.length : nombre d'unités UTF-16. */
function js_strlen(string $s): int
{
    return intdiv(strlen(mb_convert_encoding($s, 'UTF-16LE', 'UTF-8')), 2);
}

/** Expression régulière de z.string().email() (Zod 3.25). */
function is_zod_email(string $s): bool
{
    return preg_match('/^(?!\.)(?!.*\.\.)([A-Z0-9_\'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/iD', $s) === 1;
}

/** Type « reçu » au sens de Zod (getParsedType). */
function zod_type($v): string
{
    if ($v === null) return 'null';
    if (is_bool($v)) return 'boolean';
    if (is_int($v) || is_float($v)) return is_float($v) && is_nan($v) ? 'nan' : 'number';
    if (is_string($v)) return 'string';
    if (is_array($v)) return 'array';
    return 'object';
}

/** Un objet JSON (stdClass) possède-t-il la clé ? (absent = undefined en JS) */
function zv_has($obj, string $key): bool
{
    return is_object($obj) && property_exists($obj, $key);
}

function zv_get($obj, string $key)
{
    return zv_has($obj, $key) ? $obj->{$key} : null;
}

/* ───────────── Mini-Zod ───────────── */

function zv_issue(array &$issues, array $path, string $message): void
{
    $issues[] = ['path' => $path, 'message' => $message];
}

/**
 * z.string() avec ses vérifications, dans l'ordre déclaré.
 * Options : trim (bool), min [n, msg], max [n, msg|null], email msg, regex [pattern, msg],
 * requiredMsg / invalidTypeMsg (messages personnalisés pour undefined / mauvais type).
 * Retourne la valeur (après trim) si valide, sinon null (issues ajoutées).
 */
function zv_string(array &$issues, array $path, bool $present, $value, array $o): ?string
{
    if (!$present) {
        zv_issue($issues, $path, $o['requiredMsg'] ?? 'Required');
        return null;
    }
    if (!is_string($value)) {
        zv_issue($issues, $path, $o['invalidTypeMsg'] ?? ('Expected string, received ' . zod_type($value)));
        return null;
    }
    $v = !empty($o['trim']) ? js_trim($value) : $value;
    $ok = true;
    $len = js_strlen($v);
    foreach ($o['checks'] ?? [] as $check) {
        [$kind, $arg, $msg] = $check + [null, null, null];
        if ($kind === 'min' && $len < $arg) {
            zv_issue($issues, $path, $msg ?? "String must contain at least $arg character(s)");
            $ok = false;
        } elseif ($kind === 'max' && $len > $arg) {
            zv_issue($issues, $path, $msg ?? "String must contain at most $arg character(s)");
            $ok = false;
        } elseif ($kind === 'email' && !is_zod_email($v)) {
            zv_issue($issues, $path, $msg ?? 'Invalid email');
            $ok = false;
        } elseif ($kind === 'regex' && preg_match($arg, $v) !== 1) {
            zv_issue($issues, $path, $msg ?? 'Invalid');
            $ok = false;
        }
    }
    return $ok ? $v : null;
}

/**
 * z.string()...optional().or(z.literal("")) : absent → null (undefined), sinon la chaîne.
 * Retourne [valide, valeur].
 */
function zv_optional_string(array &$issues, array $path, bool $present, $value, array $checks): array
{
    if (!$present) return [true, null];
    if (!is_string($value)) {
        zv_issue($issues, $path, 'Invalid input');
        return [false, null];
    }
    $before = count($issues);
    $v = zv_string($issues, $path, true, $value, ['trim' => true, 'checks' => $checks]);
    return [count($issues) === $before, $v];
}

/** z.number().int().min(0).max(9999) */
function zv_quantity(array &$issues, array $path, bool $present, $value): ?int
{
    if (!$present) {
        zv_issue($issues, $path, 'Required');
        return null;
    }
    if (!is_int($value) && !is_float($value)) {
        zv_issue($issues, $path, 'Expected number, received ' . zod_type($value));
        return null;
    }
    if (is_float($value) && is_nan($value)) {
        zv_issue($issues, $path, 'Expected number, received nan');
        return null;
    }
    $ok = true;
    if (is_float($value) && (!is_finite($value) || floor($value) != $value)) {
        zv_issue($issues, $path, 'Expected integer, received float');
        $ok = false;
    }
    if ($value < 0) {
        zv_issue($issues, $path, 'Number must be greater than or equal to 0');
        $ok = false;
    }
    if ($value > 9999) {
        zv_issue($issues, $path, 'Number must be less than or equal to 9999');
        $ok = false;
    }
    return $ok ? (int) $value : null;
}

/** z.enum([...], { required_error, invalid_type_error }) */
function zv_enum(array &$issues, array $path, bool $present, $value, array $options, string $msg): ?string
{
    if (!$present || !is_string($value)) {
        zv_issue($issues, $path, $msg);
        return null;
    }
    if (!in_array($value, $options, true)) {
        $expected = implode(' | ', array_map(fn ($o) => "'$o'", $options));
        zv_issue($issues, $path, "Invalid enum value. Expected $expected, received '$value'");
        return null;
    }
    return $value;
}

/** Équivalent de ZodError.flatten(). */
function zv_flatten(array $issues): array
{
    $formErrors = [];
    $fieldErrors = [];
    foreach ($issues as $issue) {
        if (count($issue['path']) > 0) {
            $fieldErrors[(string) $issue['path'][0]][] = $issue['message'];
        } else {
            $formErrors[] = $issue['message'];
        }
    }
    return ['formErrors' => $formErrors, 'fieldErrors' => (object) $fieldErrors];
}

/* ───────────── Schémas ───────────── */

const CA_POSTAL_CODE = '/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/D';

/**
 * Port de makePickupSchema(SERVER_PICKUP_MESSAGES).safeParse(body).
 * @return array{ok: bool, data?: array, issues?: array}
 */
function validate_pickup($input): array
{
    $m = SERVER_PICKUP_MESSAGES;
    $issues = [];
    if (!is_object($input)) {
        zv_issue($issues, [], 'Expected object, received ' . zod_type($input));
        return ['ok' => false, 'issues' => zv_flatten($issues)];
    }
    $f = fn (string $k) => [zv_has($input, $k), zv_get($input, $k)];
    $d = [];

    [$p, $v] = $f('title');
    $d['title'] = zv_enum($issues, ['title'], $p, $v, ['mr', 'mrs'], $m['titleRequired']);

    [$p, $v] = $f('firstName');
    $d['firstName'] = zv_string($issues, ['firstName'], $p, $v, ['trim' => true, 'checks' => [['min', 1, $m['firstNameRequired']], ['max', 100]]]);

    [$p, $v] = $f('lastName');
    $d['lastName'] = zv_string($issues, ['lastName'], $p, $v, ['trim' => true, 'checks' => [['min', 1, $m['lastNameRequired']], ['max', 100]]]);

    [$p, $v] = $f('company');
    [, $d['company']] = zv_optional_string($issues, ['company'], $p, $v, [['max', 200]]);

    [$p, $v] = $f('email');
    $d['email'] = zv_string($issues, ['email'], $p, $v, ['trim' => true, 'checks' => [['max', 254], ['email', null, $m['emailInvalid']]]]);

    [$p, $v] = $f('phone');
    $d['phone'] = zv_string($issues, ['phone'], $p, $v, ['trim' => true, 'checks' => [['min', 7, $m['phoneRequired']], ['max', 30]]]);

    [$p, $v] = $f('address');
    $d['address'] = zv_string($issues, ['address'], $p, $v, ['trim' => true, 'checks' => [['min', 1, $m['addressRequired']], ['max', 300]]]);

    [$p, $v] = $f('city');
    $d['city'] = zv_string($issues, ['city'], $p, $v, ['trim' => true, 'checks' => [['min', 1, $m['cityRequired']], ['max', 100]]]);

    [$p, $v] = $f('postalCode');
    $d['postalCode'] = zv_string($issues, ['postalCode'], $p, $v, ['trim' => true, 'checks' => [['regex', CA_POSTAL_CODE, $m['postalCodeInvalid']]]]);

    // quantities : objet avec les 12 clés numériques
    [$p, $v] = $f('quantities');
    $d['quantities'] = [];
    if (!$p) {
        zv_issue($issues, ['quantities'], 'Required');
    } elseif (!is_object($v)) {
        zv_issue($issues, ['quantities'], 'Expected object, received ' . zod_type($v));
    } else {
        foreach (QUANTITY_KEYS as $key) {
            $d['quantities'][$key] = zv_quantity($issues, ['quantities', $key], zv_has($v, $key), zv_get($v, $key));
        }
    }

    // extras : tableau (max 20) de { name, quantity }
    [$p, $v] = $f('extras');
    $d['extras'] = [];
    if (!$p) {
        zv_issue($issues, ['extras'], 'Required');
    } elseif (!is_array($v)) {
        zv_issue($issues, ['extras'], 'Expected array, received ' . zod_type($v));
    } else {
        if (count($v) > 20) zv_issue($issues, ['extras'], 'Array must contain at most 20 element(s)');
        foreach (array_values($v) as $i => $item) {
            if (!is_object($item)) {
                zv_issue($issues, ['extras', $i], 'Expected object, received ' . zod_type($item));
                continue;
            }
            $name = zv_string($issues, ['extras', $i, 'name'], zv_has($item, 'name'), zv_get($item, 'name'), ['trim' => true, 'checks' => [['max', 100]]]);
            $qty = zv_quantity($issues, ['extras', $i, 'quantity'], zv_has($item, 'quantity'), zv_get($item, 'quantity'));
            $d['extras'][] = ['name' => (string) $name, 'quantity' => (int) $qty];
        }
    }

    [$p, $v] = $f('certificate');
    $d['certificate'] = zv_enum($issues, ['certificate'], $p, $v, ['yes', 'no'], $m['certificateRequired']);

    // Minimum de 10 items par ramassage (règle d'affaires, aussi affichée par le formulaire)
    $quantitiesValid = count($d['quantities']) === count(QUANTITY_KEYS) && !in_array(null, $d['quantities'], true);
    if ($quantitiesValid && total_items($d['quantities'], $d['extras']) < MIN_ITEMS) {
        zv_issue($issues, [], $m['minItems']);
    }

    if ($d['email'] !== null) $d['email'] = mb_strtolower($d['email'], 'UTF-8');

    if ($issues) return ['ok' => false, 'issues' => zv_flatten($issues)];
    return ['ok' => true, 'data' => $d];
}

/** Port de totalItems(quantities, extras). */
function total_items(array $quantities, array $extras = []): int
{
    $sum = 0;
    foreach (QUANTITY_KEYS as $key) $sum += (int) ($quantities[$key] ?? 0);
    foreach ($extras as $e) $sum += (int) ($e['quantity'] ?? 0);
    return $sum;
}

/**
 * Port de makeContactSchema(SERVER_CONTACT_MESSAGES).safeParse(body).
 * @return array{ok: bool, data?: array, issues?: array}
 */
function validate_contact($input): array
{
    $m = SERVER_CONTACT_MESSAGES;
    $issues = [];
    if (!is_object($input)) {
        zv_issue($issues, [], 'Expected object, received ' . zod_type($input));
        return ['ok' => false, 'issues' => zv_flatten($issues)];
    }
    $d = [];
    $d['name'] = zv_string($issues, ['name'], zv_has($input, 'name'), zv_get($input, 'name'), ['trim' => true, 'checks' => [['min', 1, $m['nameRequired']], ['max', 200]]]);
    $d['email'] = zv_string($issues, ['email'], zv_has($input, 'email'), zv_get($input, 'email'), ['trim' => true, 'checks' => [['max', 254], ['email', null, $m['emailInvalid']]]]);
    [, $d['phone']] = zv_optional_string($issues, ['phone'], zv_has($input, 'phone'), zv_get($input, 'phone'), [['max', 30]]);
    $d['message'] = zv_string($issues, ['message'], zv_has($input, 'message'), zv_get($input, 'message'), ['trim' => true, 'checks' => [['min', 1, $m['messageRequired']], ['max', 5000]]]);
    if ($d['email'] !== null) $d['email'] = mb_strtolower($d['email'], 'UTF-8');

    if ($issues) return ['ok' => false, 'issues' => zv_flatten($issues)];
    return ['ok' => true, 'data' => $d];
}
