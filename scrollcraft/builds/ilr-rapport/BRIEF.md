# BRIEF · Info Liquidation Recycle · page d'accueil (prototype FR)

Interviewed. Original request (verbatim): "premium, trusted… more editorial rather
than a bunch of different AI-generated assets and not like a world that we'd be
flying through but still interactive… simplify the steps of our service… more premium."

Follow-up answers were given as multiple choice (options written by Claude, picked by the
user). The labels picked are quoted below.

## The eight topics

1. **Vibe**: premium, trusted, editorial, wise. Reference picked: **"Rapport annuel suisse"**
   (strict grid, large figures, lots of white, hairlines, a printed annual report).
2. **Journey**: **"La promesse d'abord"**. Open on the facts (free, 24 h, 72 h, certificate),
   then the steps, data destruction, territory, then the pickup.
3. **Energy**: **"Calme → choc → calme"**. A calm, reassuring open; light steps;
   a build-up to the hard drive destruction (the peak); then calm again for the counter and the pickup.
4. **Feeling + the one moment**: **"Le disque détruit"**. An interactive moment where a
   hard drive is physically destroyed. Concrete proof that the data is gone.
5. **What no other site does**: **"Compteur d'inventaire"**. The visitor counts their
   devices; at 10 items the site confirms the pickup is free and pre-fills the form.
6. **Range**: editorial (Swiss annual report). Not premium-minimal dark.
7. **One world or separate scenes**: separate scenes ("not like a world that we'd be
   flying through"). No worldflight, no continuous camera flight.
8. **Assets**: "Photo réelle du devant de l'entrepôt" + "Rien de plus". Real photo
   still to come → slot `assets/entrepot.jpg`. Real hard drive photo already in the
   project (`public/images/destruction-disque-dur.jpg`). **Zero generated images.**

Step 1:
- **Audience**: **"Entreprises d'abord"** (IT managers, offices, schools, clinics).
  Individuals mentioned clearly.
- **Belief at the end**: "My equipment and data are taken care of, for free,
  and I don't have to do anything." (proposed, not contradicted)
- **Single action**: **Planifier un ramassage**. Same label everywhere.
- **Scope**: **"Prototype d'abord"**. Standalone page here, integrated into Next.js after approval.

## Official facts used (CLAUDE.md, src/lib/site.ts)
Free pickup (pickup, transport, equipment) · minimum 10 items · response within 24 h ·
pickup within 72 h max · free destruction certificate on request · physical destruction
(shredding or crushing), also on site · 100% of components reclaimed · businesses and
individuals · Greater Montreal, North Shore, South Shore · since 2005 · 514 Chemin De La
Rivière Sud, Local 102, Saint-Eustache · (450) 473-4636.
No other figures. No testimonials. No logos.

> Inconsistency to flag: a comment in `site.ts` (CITIES) mentions "minimum usuel de 20,
> Rive-Sud à partir de 50". CLAUDE.md says 10. The page uses **10**. Confirm with the client.

## Feeling curve (written before the score)

| Chapter | Emotion | What causes it on screen |
|---|---|---|
| Title page | Calm assurance | White paper, two lines of display type, a huge pale "0 $" set behind the headline |
| I. Commitments | Clarity | Real figures landing in a ruled table, like the key-figures page of an annual report |
| II. Method | Relief ("that's it?") | The whole service drawn on a single time axis: three marks, 0 h, 24 h, 72 h |
| III. Interlude | Unease | Hard cut to black, a single question, empty space (**authored silence**) |
| IV. Destruction ★ | Awe, then relief | A real hard drive photo cut into strips, then chips, under the hand |
| V. Anchoring | Trust, proximity | The real warehouse, the address, the territory listed like an index |
| VI. Pickup slip | Resolve, control | You count your own equipment; the tenth item turns the line green |

**Peak**: chapter IV. Sentence a visitor would say:
> "You scroll and an actual hard drive gets shredded into strips, then into chips, right in front of you."

**Tell-someone sentence**: "C'est le site où tu regardes un vrai disque dur se faire
déchiqueter sous ta molette, puis tu comptes ton matériel et il te dit que c'est gratuit."

Link between peak and signature: the slip has a "Disques durs" row; as soon as it is > 0, the slip
adds the line "Destruction physique · certificat sans frais sur demande", the echo of chapter IV.

**Authored silence**: chapter III (black, a single line, ~1 vh). Not dead scroll.

## Grammar and score

**Grammar: Chaptered editorial** (uniqueness.md §2.2). Title page with no media above the
fold, margin folio instead of a nav bar, hard cuts between grounds (no drift), colophon at
the end with the CTA as running text. Bans respected: no full-bleed scrub, no spotlight,
no magnet, no centred hero copy, no pinned crossfade type act.

| Chapter | Device | Why |
|---|---|---|
| Title page | layered typographic planes (bespoke parallax) + pointer | Depth without media: numeral far plane, grid mid plane, type at 1x |
| I. Commitments | `flow` + `in` + `count` (real figures) | A table that gets read, not watched |
| II. Method | bespoke stroke drawing on progress (`--sc-p`) | Drawing the axis = showing that it's short |
| III. Interlude | `reveal` (wipe) on a black hard cut | A change of state, the silence before the peak |
| IV. Destruction ★ | `pin` span 3.4 (largest) + bespoke shredder | The photo becomes strips, then chips |
| V. Anchoring | `parallax` in the media column + `in` | The real place, grounded, captioned |
| VI. Slip | bespoke input (signature) + colophon | The page stops moving and starts answering |

Device families: typo-parallax, flow/in/count, draw, reveal, pin, parallax, input. 6+.
No family twice in a row. Zero scrub. Total ≈ 11 vh, 7 chapters.

**Signature move**: the **pickup slip** (bordereau de ramassage). A form typeset like a ledger, with ± per
category, a 10-cell tally that fills; at 10 the line turns green and "Planifier un ramassage"
carries the counts to the form.

**Fingerprint gate**: empty registry → nothing to clear (first build).

## Revision 2 (2026-10-16): images and service-focused hero

User request (paraphrased from FR): create the images with kie.ai, make them interactive, clean,
professional and premium; the hero must be about the service (what we do), not a decorative
hero; a scroll effect is left to Claude's judgment (explicit delegation).

- **Hero amended** (exception to the chaptered-editorial grammar requested by the client):
  pinned 2.3 vh. A pile of equipment (the closet everyone has) sorts itself, as you scroll, into
  a labelled inventory (knolling). 9 objects cut out with real transparency, each at its own pointer
  depth; clicking an object adds it to the pickup slip (link between the hero and the signature move).
- Feeling curve, title page line replaced by: **Recognition, then order**: "that's my
  closet", then everything falls into place under the hand.
- Images (kie.ai seedream, shared preamble): `out/hero-knoll.png` (cut out via
  recraft/remove-background → `assets/items/*.webp`), `out/drive.png` (new drive, neutral,
  replaces the orange stock photo in the peak), `out/pickup.png` (cart on pickup day,
  plate in chapter II). No image claims to show the client's premises or team.

## Revision 3 (2026-10-16): client feedback

- Green top bar (#15803D, white text, AA contrast) with every tab from the old site (Services drop-down) + phone + CTA. Replaces the margin folio.
- Hero h1: "La référence pour votre recyclage informatique depuis plus de 20 ans au Grand Montréal."
- Green ink: key words fill with green, word by word, as you scroll (wipe on real text).
- Big green "Planifier un ramassage" button: dark sweep, arrow loop, magnetic on desktop.
- Commitments: sticky black panel (large figure, count-up, 5-segment progress) driven by the list; rows clickable.
- Method: "Vous remplissez un formulaire. Nous faisons le reste." Pinned 3 vh, 3 clickable steps,
  3 live visuals (labelled example form filling itself, calendar computed from today with the
  24 h / 72 h window, pickup photo).
- Destruction: the frame disappears as soon as the drive is cut.
- Warehouse: zoom on scroll toward the door (`--door-x/--door-y` to adjust once the photo arrives).
- The old form (3 sections, 12 quantities, other equipment, certificate) replaces the slip.
  The hero objects feed its quantities. Prototype submission: validation only, nothing is sent.

## Revision 4 (2026-10-16): client feedback

- Hero rebuilt: no texture or decode (it flickered). Bold Geist 800, "recyclage informatique" in green.
  Buttons: "Planifier un ramassage" + "Comment ça marche" (→ #methode). On the right: "Ce que nous recyclons",
  the objects sort themselves, then "Chaque appareil a une seconde vie." types itself on scroll.
- Commitments: interactive bento (0 $ receipt, 24 h dial, 3 days 72 h, 10 slots, 100 %), plays on view and replays on hover, slight 3D tilt.
- Method step 3: kie.ai photo of a mover by the cart, clean plate (stack removed) + 7 cut laptop slices
  that drop one by one on scroll (counter "Chargés n / 7").
- Interlude centred: "Certificat de destruction de vos données".
- Destruction: the chips darken and disappear on their own (p 0.80 → 0.96) before the next section.
- Pickup form: rebuilt in the old site's style (white cards, icon + badge, green "+" buttons, gradient send button).
- Every tab is a real page generated by `build.mjs` from `src/messages/fr.json` (24 pages, blog articles included).
  Shared: `site.css`, `site.js`. Source of the home page: `index.src.html` (do not edit `index.html` directly).

## Revision 5 (2026-10-16): back to the old hero and chrome

- Chrome like the old site: thin green bar (phone, slogan, FR/EN switch) that slides away on scroll,
  white nav bar (logo, tabs, green "Ramassage gratuit" pill).
- Old-site hero: "La référence pour votre" (bold "référence", underlined on hover), "recyclage informatique" in big green
  IBM Plex Sans (the letters lift under the pointer), a "20 ans" pill that counts up and throws sparks,
  the old sub-line, a square green "Demander un ramassage" button + "Comment ça marche". The 3D objects stay on the right.
- Removed: recycling-mark watermark, double frames (outer trays/rings) around tiles and images, most section eyebrows.
- Copy reread with the humanizer skill (empty tags and redundant sentences removed).
- Real English version: /en/ + every page (en.json), FR/EN switch keeps the same page. EN blog articles: French body + notice.
- Strings: home → home.i18n.json; UI → build.mjs (UI.fr/UI.en); JS → window.ILR_T.
