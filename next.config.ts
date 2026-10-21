import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()"
          },
          // CSP minimale sans restriction de scripts (Next, Three.js et le JSON-LD utilisent du inline)
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'"
          }
        ]
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
      }
    ];
  },
  async redirects() {
    return [
      // Anciens slugs de blog (stubs de dev) → vrais articles migrés
      {
        source: "/blog/5-conseils-pour-un-recyclage-electronique-reussi",
        destination: "/blog/nos-5-conseils-pour-un-recyclage-reussi",
        permanent: true
      },
      {
        source: "/blog/destruction-securisee-des-disques-durs-et-loi-25",
        destination: "/blog/destruction-securisee-des-disques-durs-protegez-vos-donnees-sensibles",
        permanent: true
      },
      // Articles sans préfixe /blog/ (WordPress les publiait à la racine)
      {
        source: "/cybersecurite-et-recyclage-informatique-comment-proteger-les-donnees-de-votre-pme",
        destination: "/blog/cybersecurite-et-recyclage-informatique-comment-proteger-les-donnees-de-votre-pme",
        permanent: true
      },
      {
        source: "/panneaux-solaires-en-fin-de-vie-le-prochain-grand-defi-du-recyclage-electronique-au-quebec",
        destination: "/blog/panneaux-solaires-en-fin-de-vie-le-prochain-grand-defi-du-recyclage-electronique-au-quebec",
        permanent: true
      },
      {
        source: "/le-passeport-numerique-des-produits-la-revolution-de-la-tracabilite-electronique-arrive-au-canada",
        destination: "/blog/le-passeport-numerique-des-produits-la-revolution-de-la-tracabilite-electronique-arrive-au-canada",
        permanent: true
      },
      {
        source: "/batteries-de-vehicules-electriques-en-fin-de-vie-seconde-vie-et-recyclage-au-quebec",
        destination: "/blog/batteries-de-vehicules-electriques-en-fin-de-vie-seconde-vie-et-recyclage-au-quebec",
        permanent: true
      },
      {
        source: "/le-droit-a-la-reparation-au-canada-ce-que-ca-change-pour-vos-appareils-electroniques",
        destination: "/blog/le-droit-a-la-reparation-au-canada-ce-que-ca-change-pour-vos-appareils-electroniques",
        permanent: true
      },
      {
        source: "/intelligence-artificielle-et-dechets-electroniques-le-nouveau-defi-du-recyclage-en-2026",
        destination: "/blog/intelligence-artificielle-et-dechets-electroniques-le-nouveau-defi-du-recyclage-en-2026",
        permanent: true
      },
      {
        source: "/nos-5-conseils-pour-un-recyclage-reussi",
        destination: "/blog/nos-5-conseils-pour-un-recyclage-reussi",
        permanent: true
      },
      {
        source: "/recyclage-informatique-guide-du-filage-electrique-responsable",
        destination: "/blog/recyclage-informatique-guide-du-filage-electrique-responsable",
        permanent: true
      },
      {
        source: "/destruction-securisee-des-disques-durs-protegez-vos-donnees-sensibles",
        destination: "/blog/destruction-securisee-des-disques-durs-protegez-vos-donnees-sensibles",
        permanent: true
      },
      {
        source: "/gestion-ecologique-des-dechets-electroniques-a-montreal",
        destination: "/blog/gestion-ecologique-des-dechets-electroniques-a-montreal",
        permanent: true
      },
      // Ancienne URL de politique de témoins (Loi 25)
      {
        source: "/politique-de-temoins-ca",
        destination: "/politique-de-temoins",
        permanent: true
      },
      // Sous-pages régionales de recyclage-ordinateur (conservées comme sections)
      {
        source: "/recyclage-ordinateur/montreal-west-island",
        destination: "/montreal",
        permanent: true
      },
      {
        source: "/recyclage-ordinateur/rive-nord",
        destination: "/saint-eustache",
        permanent: true
      },
      {
        source: "/recyclage-ordinateur/rive-sud",
        destination: "/longueuil",
        permanent: true
      }
    ];
  }
};

export default withNextIntl(nextConfig);
