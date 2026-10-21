# BRIEF : Info Liquidation Recycle, refonte du hero dans le site Next.js existant

Self-authored under explicit creative delegation
("Je te donne l'autorisation de changer le héros et le mettre le plus interactif possible").
Not a new site: this is a source folder for the brief and raw generated assets only.
The deliverable is the existing Next.js app (localhost:3000).

## User constraints (verbatim)
- "garder le Next.js, garder le site intact avec toutes les mêmes informations"
- "plus interactif", "haut de gamme", "qualité supérieure qui inspire de confiance"
- "changer le héros ... en gardant le thème du recyclage informatique"
- "Rather than a bunch of different AI-generated assets" -> max 2 generated stills
- "linké avec /admin", "pas de mot de passe", "aucune erreur", no second site

## The eight topics (authored)
1. Vibe: clinical, calm, precise, trustworthy, quietly proud. References: a lab specimen photo, a Dieter Rams catalogue, a certificate of authenticity.
2. Journey: who we are + the promise -> what we take -> how it works -> services -> where -> questions -> book the pickup.
3. Energy: calm open, one sharp moment in the hero, steady middle, firm close.
4. Feeling + one moment: see "Feeling curve" and "Peak".
5. Unique: you hover an old laptop and see that it is already made of its own recovered materials.
6. Range: premium-minimal, white dominant, green accent (brand palette is fixed in CLAUDE.md).
7. Distinct scenes (existing sections stay), not one unbroken world.
8. Assets: logo, existing photos in public/images, the 3D devices section. Two new stills (before/after laptop).

## Grammar
Stacked editorial marketing page (existing Next.js sections). Kept because the user forbids restructuring the site; only the hero and interactions change.

## Feeling curve
1. Hero: curiosity -> surprise (the lens shows the laptop made of copper, aluminium, board fragments).
2. Stats band: reassurance (real numbers only, already on site).
3. 3D devices: recognition ("they take my kind of equipment").
4. Steps: clarity (a line draws itself through the 3 steps as you scroll).
5. Services: control (each service responds under the pointer).
6. Zones + FAQ: relief.
7. Close: decision (one action, one label: "Demander un ramassage").

## Peak
"Tu passes la souris sur le vieux portable et tu vois qu'il est déjà fait de ses matériaux recyclés." Lives in the hero.

## Tell-someone sentence
It's the site where an old laptop turns into copper and aluminium under your cursor.

## Signature move
Second-life lens: a circular lens follows the pointer (drag on touch, slow idle orbit when untouched, toggle button for keyboard/reduced motion) revealing the same laptop rebuilt from its recovered materials, with material labels that appear only inside the lens.

## Hero depth planes
- Back: oversized outlined "72 h" figure, slowest.
- Mid: specimen photo with lens.
- Front: certificate-of-destruction card (real HTML text), fastest, overlaps the specimen corner.
- Atmosphere: soft green light pool behind the specimen.
Scroll + pointer move each plane at a different rate. Reduced motion: static composition, toggle still works.

## Authored silence
None.

## Revision (2026-10-20, user direction)
Lens concept dropped by the user ("OUBLIE TA LOUPE"), then: "fais un scroll avec le bac bleu interactif".
Final hero: pinned scroll scene. Ten devices (generated cutouts, chroma-keyed) drop into a blue recycling bin between its back and front-wall layers; counter rises to the real 10-item minimum; at 10 the recycle symbol turns green and the pickup CTA appears. Bin tilts with the pointer and shakes on click. Reduced motion: no pin, bin shown full.
Generated: 10-bin-green.png, 11-devices-green.png (01/02 lens stills unused).

## Revision 2 (2026-10-20): whole home page ("fais ca pour tout le site", scope chosen: toute l'accueil)
Score (device per section, no device twice in a row):
| Section | Device | Feeling |
|---|---|---|
| Hero | pinned scroll fill of the bin (peak, longest span ~1350 px) | curiosity > satisfaction |
| 3D devices | existing WebGL carousel | recognition |
| Stats | existing counters (real numbers only) | reassurance |
| Steps | scroll-scrubbed line, steps light up as it passes | clarity |
| Services | pinned horizontal pan (desktop, ratio 0.62, shorter than the hero), swipe carousel on mobile/reduced, object parallax inside cards | choice |
| Zones | marquee driven by scroll velocity and direction | proximity |
| FAQ | accordion, deliberately quiet (authored calm before the close) | relief |
| Close | full bin echo, pointer tilt over the whole section, magnetic CTA | decision |
Also fixed: Reveal/StepsTimeline invisible under reduced motion (SSR mismatch), gradient text removed from the close, duplicate marquee links made inert.
