<?php
/** Coordonnées officielles — source unique de vérité (port de src/lib/site.ts). */

const SITE = [
    'name' => 'Info Liquidation Recycle',
    'legalName' => 'Info Liquidation Recycle Inc.',
    'phoneDisplay' => '(450) 473-4636',
    'phoneHref' => 'tel:4504734636',
    'ownerPhoneDisplay' => '(514) 594-4949',
    'ownerPhoneHref' => 'tel:5145944949',
    'email' => 'info@infoliquidationrecycle.com',
    'address' => [
        'street' => '514 Chemin De La Rivière Sud, Local 102',
        'city' => 'Saint-Eustache',
        'region' => 'QC',
        'postalCode' => 'J7R 0E2',
        'country' => 'CA',
        'mapsUrl' => 'https://g.page/InfoLiquidationRecycle?share',
        'geo' => ['lat' => 45.5379, 'lng' => -73.8752],
    ],
    'facebook' => 'https://www.facebook.com/InfoLiquidationRecycle/',
    'foundedYear' => 2005,
    'founder' => 'Éric Després',
];

const SERVICES = [
    ['key' => 'computer', 'route' => '/recyclage-ordinateur'],
    ['key' => 'pickupForm', 'route' => '/formulaire-de-ramassage'],
    ['key' => 'data', 'route' => '/destruction-des-donnees'],
    ['key' => 'materials', 'route' => '/matieres-recyclables'],
    ['key' => 'procedure', 'route' => '/procedure-de-recuperation'],
    ['key' => 'hardDrives', 'route' => '/destruction-des-disques-durs'],
    ['key' => 'phones', 'route' => '/recyclage-telephones'],
];

const CITIES = [
    ['slug' => 'montreal', 'fr' => 'Montréal', 'en' => 'Montreal', 'region' => 'montreal'],
    ['slug' => 'laval', 'fr' => 'Laval', 'en' => 'Laval', 'region' => 'laval'],
    ['slug' => 'saint-eustache', 'fr' => 'Saint-Eustache', 'en' => 'Saint-Eustache', 'region' => 'rive-nord'],
    ['slug' => 'longueuil', 'fr' => 'Longueuil', 'en' => 'Longueuil', 'region' => 'rive-sud'],
    ['slug' => 'boisbriand', 'fr' => 'Boisbriand', 'en' => 'Boisbriand', 'region' => 'rive-nord'],
    ['slug' => 'st-jerome', 'fr' => 'Saint-Jérôme', 'en' => 'Saint-Jérôme', 'region' => 'rive-nord'],
    ['slug' => 'mascouche', 'fr' => 'Mascouche', 'en' => 'Mascouche', 'region' => 'rive-nord'],
    ['slug' => 'lachine', 'fr' => 'Lachine', 'en' => 'Lachine', 'region' => 'montreal'],
    ['slug' => 'terrebonne', 'fr' => 'Terrebonne', 'en' => 'Terrebonne', 'region' => 'rive-nord'],
    ['slug' => 'brossard', 'fr' => 'Brossard', 'en' => 'Brossard', 'region' => 'rive-sud'],
    ['slug' => 'sainte-therese', 'fr' => 'Sainte-Thérèse', 'en' => 'Sainte-Thérèse', 'region' => 'rive-nord'],
    ['slug' => 'mirabel', 'fr' => 'Mirabel', 'en' => 'Mirabel', 'region' => 'rive-nord'],
    ['slug' => 'dorval', 'fr' => 'Dorval', 'en' => 'Dorval', 'region' => 'montreal'],
    ['slug' => 'cote-saint-luc', 'fr' => 'Côte-Saint-Luc', 'en' => 'Côte-Saint-Luc', 'region' => 'montreal'],
    ['slug' => 'saint-laurent', 'fr' => 'Ville Saint-Laurent', 'en' => 'Saint-Laurent', 'region' => 'montreal'],
    ['slug' => 'kirkland', 'fr' => 'Kirkland', 'en' => 'Kirkland', 'region' => 'montreal'],
    ['slug' => 'repentigny', 'fr' => 'Repentigny', 'en' => 'Repentigny', 'region' => 'rive-nord'],
    ['slug' => 'lasalle', 'fr' => 'LaSalle', 'en' => 'LaSalle', 'region' => 'montreal'],
    ['slug' => 'blainville', 'fr' => 'Blainville', 'en' => 'Blainville', 'region' => 'rive-nord'],
];

function get_city(string $slug): ?array
{
    foreach (CITIES as $c) if ($c['slug'] === $slug) return $c;
    return null;
}

const BLOG_SLUGS = [
    'cybersecurite-et-recyclage-informatique-comment-proteger-les-donnees-de-votre-pme',
    'panneaux-solaires-en-fin-de-vie-le-prochain-grand-defi-du-recyclage-electronique-au-quebec',
    'le-passeport-numerique-des-produits-la-revolution-de-la-tracabilite-electronique-arrive-au-canada',
    'batteries-de-vehicules-electriques-en-fin-de-vie-seconde-vie-et-recyclage-au-quebec',
    'le-droit-a-la-reparation-au-canada-ce-que-ca-change-pour-vos-appareils-electroniques',
    'intelligence-artificielle-et-dechets-electroniques-le-nouveau-defi-du-recyclage-en-2026',
    'nos-5-conseils-pour-un-recyclage-reussi',
    'recyclage-informatique-guide-du-filage-electrique-responsable',
    'destruction-securisee-des-disques-durs-protegez-vos-donnees-sensibles',
    'gestion-ecologique-des-dechets-electroniques-a-montreal',
];
