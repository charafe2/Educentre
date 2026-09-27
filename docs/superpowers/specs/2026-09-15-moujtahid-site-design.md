# Moujtahid marketing site — design specification

Date: 2026-09-15
Status: approved through pass 1 (design plan). Not yet implemented.
Concept: « L'emploi du temps »

---

## 1. Context and scope

### What exists today

The Moujtahid marketing page is currently a route inside the product's Angular
21 SPA: `src/app/pages/hero/` (721 lines HTML, 1135 CSS, 247 TS), served at `/`
by the same application that serves `/dashboard`, `/parent` and `/superadmin`.
There is no SSR or prerendering. `src/index.html` loads Tailwind and Font
Awesome from third-party CDNs at runtime.

A second, older artifact exists at the repo root: `landing.html`, an English
Apple-styled page built on `#0071E3`. It is not the live site. It is the source
of the `theme-color` value flagged in the brief.

### What this spec covers

A ground-up rebuild of the marketing site only. The product application, the
Laravel backend, and the parent/superadmin areas are out of scope.

### Deliverable

A statically generated French marketing site at `moujtahide.ma`, whose job is
to make a tutoring-centre director think "this is exactly my centre", to show
the product working rather than describe it, and to produce a demo request.

Primary conversion: the demo form. Secondary: the Pro trial.

---

## 2. Decisions taken

| # | Decision | Rationale |
|---|---|---|
| D1 | **Astro**, as a new `site/` project | Ships ~0 KB JS by default, so the 150 KB budget and LCP < 2.0 s on mid-range Android over 4G are achievable. Angular's runtime alone is ~90–110 KB gzipped before any page code. |
| D2 | Angular app moves to **`app.moujtahide.ma`** | A subdomain keeps marketing cache headers and app auth cookies from conflicting. *Assumption — see §9.* |
| D3 | Concept executed as **"literal where it's product, structural everywhere else"** | Resolves the brief's internal tension between "the grid is the layout system for the whole site" and "spend boldness in one place". |
| D4 | **IBM Plex Sans + IBM Plex Sans Arabic** | Free, genuinely bilingual with matched proportions, and ships real `tnum` in both scripts — which this number-dense page requires. *Assumption — see §9.* |
| D5 | **MorphSVG and Lenis dropped** from the brief's stack | See §6.1. |
| D6 | Social proof built as real components fed by placeholder data behind a **CI gate** | Nothing is cleared for publication yet. Turns four open content questions into one build error. |
| D7 | **One timetable engine** serves the hero, the tour frame and the onboarding clock | The most complex artifact on the site; built and tested once. |

### D3 in detail

The timetable is fully literal and interactive in exactly three places, each of
which has a grid of days and hours as its actual subject:

- §5.2 the hero
- §5.5 the pinned product-tour frame
- §5.8 the onboarding clock

Everywhere else the concept survives as invisible discipline: a fixed
6-column × 12-row module, a hard baseline grid, and hairline rules used only
where a section genuinely divides. The layout is governed by the concept
without narrating it. This is also the only reading that survives the phase-2
RTL flip, because the grid is expressed in logical properties rather than
painted days.

### Two readings of the brief, made explicit

**Pinning vs. "no scroll hijacking."** Compatible only under a strict
definition: pinned sections advance in exact proportion to scroll distance,
never faster, never with momentum, never trapping the user. Scrolling up leaves
immediately. No `scrollTo` interception, no snapping. If a pinned section does
not feel like ordinary scrolling, it becomes a tap-through on desktop too.

**"Number transition" vs. "no count-up animations."** Exactly one number
animates on the site — the monthly MAD total in tour chapter 3 — and only
because an invoice was just marked paid. Every other number is typeset.

---

## 3. Design tokens

### 3.1 Colour

Sampled from `public/Logo.jpeg` (1254×1254) by pixel-frequency analysis. Two
values in the brief were estimates and are corrected here.

| Token | Value | Brief said | Use |
|---|---|---|---|
| `--teal` | `#246B5D` | ~#236B5D | Primary buttons, links, grid accents |
| `--teal-deep` | `#133E36` | — | Dark plates, footer |
| `--gold` | `#BA934E` | ~#BD9550 | **Fill only.** Session blocks. |
| `--gold-ink` | `#8A6B33` | — | Gold-toned *text* on chalk |
| `--gold-light` | `#C9A362` | — | Gold text on deep-teal grounds |
| `--chalk` | `#F3F6F5` | ~#F3F6F5 | Page ground. Cool, green-tinted. Never warmed toward cream. |
| `--ink` | `#17302B` | ~#17302B | Body text |
| `--ink-mute` | `#4A5F59` | — | Secondary text |
| `--rule-hair` | `#D3DEDA` | ~#D3DEDA | Decorative dividers, timetable background ruling |
| `--rule-strong` | `#748F87` | — | Interactive block edges, focus rings |

#### Measured contrast

| Pair | Ratio | Verdict |
|---|---|---|
| ink on chalk | 12.93 | AA ✓ |
| ink-mute on chalk | 6.29 | AA ✓ |
| teal on chalk | 5.79 | AA ✓ |
| white on teal | 6.29 | AA ✓ |
| ink on gold | 4.93 | AA ✓ |
| gold-ink on chalk | 4.56 | AA ✓ |
| gold-light on teal-deep | 5.03 | AA ✓ |
| white on teal-deep | 11.86 | AA ✓ |
| rule-strong on chalk | 3.21 | AA UI (1.4.11) ✓ |
| **gold on chalk** | **2.62** | **FAIL — forbidden** |
| **rule-hair on chalk** | **1.27** | **Decorative only — never informational** |

Two failures drive design rules, not just token choices:

1. **Gold never sets text on a light ground.** Session blocks are gold fills
   carrying ink text. Where gold-toned text is needed on chalk, use
   `--gold-ink`.
2. **`--rule-hair` cannot carry meaning.** The hero timetable is an interactive
   component, so WCAG 2.2 (1.4.11) requires a 3:1 boundary. Interactive block
   edges, focus states and conflict outlines use `--rule-strong`.

#### Status colours

Each is ≥ 4.5:1 on chalk and each is paired with a non-colour cue, so nothing
depends on hue alone.

| Token | Value | Ratio | Non-colour cue |
|---|---|---|---|
| `--conflict` | `#A3321F` | 6.37 | Diagonal hatch fill + « Salle occupée » |
| `--absence` | `#B2541C` | 4.62 | Hollow slot + « Absent » |
| `--risk` | `#8C2F4A` | 7.37 | Gauge position + numeric % |
| `--ok` | `#1F6B4A` | 5.92 | Filled check + « Payé » |

Conflict and absence are separated by lightness (6.37 vs 4.62) as well as fill
pattern. To be confirmed by deuteranopia/protanopia simulation during QA.

`theme-color` becomes `#246B5D`.

### 3.2 Type

Stack: `'IBM Plex Sans', 'IBM Plex Sans Arabic', <size-adjusted system fallback>`

Graphik + Graphik Arabic is the better-drawn option but requires a paid
Commercial Type web licence; it is not committed to in a design plan. Among
free bilingual options, IBM Plex was chosen over Readex Pro because this page
is unusually number-dense (MAD amounts, 16,5/20, five weighted percentages, a
live gauge) and the brief makes tabular figures a hard requirement.

**Build-time gate:** verify `tnum` is present in both font binaries before
writing CSS. If Readex Pro also ships it, reopen the choice — Readex Pro is the
more characterful face.

**Known risk:** IBM Plex is widely used and carries a faint "tech company"
association. Countered through setting rather than family: display sizes very
large and tight at weight 600, tracking ~-0.03em, against generously set 17px
body. If the hero screenshots still read generic, switching family is a
contained change because everything routes through two tokens.

#### Scale — 1.25 major third, 17px body, measure capped at 68ch

| Token | Size | Weight | Line-height | Tracking | Use |
|---|---|---|---|---|---|
| `display-1` | `clamp(2.75rem, 7vw, 5.25rem)` | 600 | 0.98 | -0.035em | H1 only |
| `display-2` | `clamp(2rem, 4.5vw, 3.25rem)` | 600 | 1.05 | -0.025em | Section H2 |
| `heading` | `clamp(1.375rem, 2vw, 1.75rem)` | 600 | 1.2 | -0.015em | H3 |
| `body-lg` | `1.125rem` | 400 | 1.55 | — | Sublines |
| `body` | `1.0625rem` | 400 | 1.6 | — | Default |
| `caption` | `0.875rem` | 500 | 1.4 | — | Slot labels |
| `data` | inherits | — | — | — | `font-variant-numeric: tabular-nums slashed-zero` |

Sentence case everywhere. Hierarchy comes from size, weight and width contrast.
Headlines are treated as design elements and may occupy timetable slots.

#### Numerals

Western digits in both French and Arabic, as is standard in Morocco. Tabular
figures from the family's own numerals for every number — never a monospace
font.

#### French typography

Applied as a build-time text transform over every content string, not typed by
hand, so a later copy edit cannot silently break it:

- Non-breaking space before `:` `;` `?` `!` and inside `« »`
- Narrow non-breaking space as thousands separator — `103 240 DH`
- Decimal comma — `16,5/20`

### 3.3 Grid

The timetable module is the spatial system for the page.

- **6 columns** (Lun–Sam) × **12 rows** (14h–20h in 30-minute slots)
- Slot height 56px desktop / 44px mobile — the mobile value also satisfies the
  44px minimum touch target
- Page gutters and section padding are multiples of the slot
- All spatial CSS uses logical properties (`inline-start`, `padding-block`,
  `margin-inline`) from day one, so the phase-2 Arabic mirror is a `dir`
  attribute rather than a refactor

### 3.4 Shape and depth

Radius follows hierarchy. One radius on everything is forbidden.

| Token | Value | Applies to |
|---|---|---|
| `--r-grid` | `0px` | Timetable cells, large surfaces, section plates |
| `--r-ui` | `6px` | Product-UI elements, matching the real application |
| `--r-control` | `4px` | Buttons, inputs, chips |
| `--r-pill` | `999px` | The student-count slider thumb only |

Depth comes from layering and from `--teal-deep` plates, not from a shared soft
shadow. Exactly one shadow token exists, used for a timetable block while it is
lifted mid-drag.

### 3.5 Motion tokens

| Token | Value | Use |
|---|---|---|
| `--dur-feedback` | 150ms | Direct input response |
| `--dur-state` | 300ms | UI state change |
| `--dur-object` | 600ms | Object transform |
| `--dur-story` | 900ms | Section-level narrative |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving |
| `--ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Arriving |
| `--ease-move` | `cubic-bezier(0.32, 0.72, 0, 1)` | The "product" curve — anything repositioning |

---

## 4. Project structure

```
site/                          # new Astro project -> moujtahide.ma
  src/content/
    claims.json                # every factual claim, incl. [CONFIRM] sentinels
    proof.json                 # client names, testimonials
    pricing.json
  src/components/sections/     # 13 sections, one file each
  src/components/timetable/    # the grid engine (D7)
  src/scripts/                 # GSAP islands, lazy per section
  scripts/check-placeholders.mjs
src/                           # existing Angular app -> app.moujtahide.ma
backend/                       # Laravel, unchanged
```

---

## 5. Sections

Copy below is the specified direction. Banned vocabulary (« révolutionnez »,
« boostez », « propulsez », « solution tout-en-un », « sans effort »,
« une nouvelle ère », « et bien plus encore », « découvrez comment »,
« grâce à l'IA »), emoji and exclamation marks in headings are prohibited
throughout.

**CTA vocabulary — exactly two labels site-wide:**
« Demander une démo » and « Essayer Pro gratuitement ».

### 5.1 Navigation

Logo, four links (Produit, Parents, Tarifs, FAQ), one button. Sticky; condenses
after 80px of scroll. 72px → 56px.

The condense animates `transform: translateY` on an inner bar plus opacity on
the tagline — never `height`.

A FR / العربية switch slot is reserved after "FAQ" and rendered hidden in v1.

Mobile: logo + burger. The demo CTA remains visible as a bar item and is never
hidden behind the menu.

### 5.2 Hero — the week that organizes itself

```
+- cols 1-2 --------------+- cols 3-6 ---------------------------------+
|                         |      Lun   Mar   Mer   Jeu   Ven   Sam     |
| Votre centre            | 14h  +----+            +----+              |
| organise en un          |      |Math|            |Ang |              |
| apres-midi.             | 15h  |2BAC|  +----+    | B1 |  +----+      |
|                         |      +----+  |Phys|    +----+  |Math|      |
| Planning, presences,    | 16h          |1BAC|            |TCS |      |
| paiements et suivi des  |      +----+  +----+  +----+    +----+      |
| eleves. Concu au Maroc, | 17h  |Fr  |          |SVT |                |
| facture en dirhams.     |      |1BAC|          |2BAC|                |
|                         | 18h  +----+          +----+                |
| [Demander une demo]     | 19h        +-------------+                 |
| [Voir le produit]       |            | Salle B . 2 |  <- conflict     |
|                         | 20h        +-------------+     holds 400ms  |
+-------------------------+--------------------------------------------+
```

- **H1:** « Votre centre organisé en un après-midi. » — real text in the
  server-rendered HTML, painted before any script runs.
- **Subline:** « Planning, présences, paiements et suivi des élèves. Conçu au
  Maroc, facturé en dirhams. »
- **Buttons:** « Demander une démo » (primary), « Voir le produit »
  (scrolls to §5.5).
- Live coded timetable, Lun–Sam, 14h–20h. Not a screenshot, not a video.
- Blocks are `--gold` fills with ink labels. Conflict adds a diagonal hatch and
  the words « Salle B occupée », never colour alone.
- After the load sequence, blocks are draggable and conflict detection
  responds. Keyboard alternative: focus a block, move with arrow keys.
- **Removed:** the current stock video (`src/assets/videos/7084636-*.mp4`).

**Mobile:** copy stacks above the grid; timetable shows Lun–Mer with horizontal
swipe; slot height 44px; tap-to-move replaces drag.

### 5.3 Proof

Fallback layout, per the brief's own rule that fewer than six cleared names
means no logo strip.

```
+--------------------------------------------------------------------+
|  +--------+   <<  ------------------------------------------       |
|  | photo  |      -------------------------------  >>               |
|  | reelle |                                                        |
|  +--------+      Nom . Role . Centre, Ville                        |
+--------------------------------------------------------------------+
```

One quote slot fed from `proof.json`. The build fails if a `__PLACEHOLDER__`
sentinel is still present (§7). If launch precedes permissions, the section
removes itself cleanly.

No logo strip. No marquee. No star rows.

### 5.4 Before — the centre as it runs today

```
scroll ------------------------------------------------------------->

  /cahier\      /recus\      /chat\      /tableur\
  presence      carbone      parent     erreur ##      (loose, off-grid)
      |             |            |            |
      v             v            v            v        <- each files into
 +---------+-------------+------------+-------------+     its slot
 |Presences|  Paiements  | Messages   |  Analytique |
 +---------+-------------+------------+-------------+
```

Four flat vector objects, drawn as SVG in brand colours — a cahier de présence
page, a carnet de reçus with carbon copy, a generic parent chat thread with no
WhatsApp branding, and a spreadsheet with a highlighted error.

They begin scattered and rotated a degree or two, **outside** the grid. On
scroll each files into a slot and becomes its module. The grid forming *is* the
argument.

No photos. No AI imagery. **Replaces** the current Excel comparison image.

### 5.5 Product tour — pinned (1 of 2 permitted)

```
+- cols 1-2 --------+- cols 3-6 ----------------------------+
|                   | +-----------------------------------+ |
| 1 Planning     *  | |                                   | |
| 2 Presences    o  | |      ONE product frame,           | |
| 3 Paiements    o  | |      pinned, state changes        | |
| 4 Suivi        o  | |      per chapter                  | |
| 5 Multi-sites  o  | |                                   | |
|                   | +-----------------------------------+ |
+-------------------+---------------------------------------+
```

Five chapters, one pinned coded frame whose state changes:

1. **Planning** — the week fills, a teacher overlap is flagged, the overlap
   resolves. Anchor: a full day of planning becomes ten minutes.
2. **Présences** — a teacher taps « Absent » for one student; an SMS bubble
   leaves the frame and reaches a parent's phone with a short French message.
3. **Paiements** — a carnet de reçus page becomes a digital invoice, status
   changes to « Payé », the monthly MAD total updates (the site's single
   number transition), the unpaid count drops.
4. **Suivi pédagogique** — a student's grade line updates; the student needing
   help is highlighted.
5. **Multi-sites** — the frame switches between branches by city name. No
   country map.

Chapter list uses plain numerals with a filled/hollow state marker — never
`01 / 02 / 03`.

Pin length exactly 2 viewport heights, scrubbed 1:1. **Mobile:** unpinned; each
chapter is a tap-through that plays its transition on entry.

### 5.6 Risk score — bold moment 2 of 2, pinned (2 of 2 permitted)

```
   Assiduite    25% ########..  -+
   Paiements    25% ######....  -+
   Resultats    25% #####.....  -+-->  +----------+
   Engagement   15% ###.......  -+     |   87 %   |  Risque eleve
   Comportement 10% ##........  -+     |  _.-'#   |  Intervention
                                       +----------+  recommandee

   -- puis --  appel au parent -> assiduite remonte -> 41 %
```

Five weighted inputs (25/25/25/15/10) feed one gauge. Events arrive one at a
time — two absences, a late payment, a falling grade — and the score climbs to
87%, alert reading « Risque élevé, intervention recommandée ».

**Then it recovers.** The centre calls the parent, attendance returns, the score
falls to 41%. The recovery is what reframes the feature as early care rather
than surveillance, and it is the part competitors do not show.

The student is labelled « élève fictif » in visible text, not in a tooltip.
Behaviour data is presented neutrally.

Desktop scrubbed; mobile plays once with a replay button.

### 5.7 Parents

```
+- cols 1-3 ------------------+- cols 4-6 ----------+
|                             |   +-------------+   |
| Moins d'appels au           |   |  16,5 /20   |   |
| secretariat.                |   |  ---------  |   |  screens swap via
|                             |   |  Prochain   |   |  shared-element
| Les parents voient les      |   |  cours      |   |  transitions
| notes, le planning et les   |   |  ---------  |   |
| paiements sans telephoner.  |   |  Paiements  |   |
|                             |   +-------------+   |
+-----------------------------+---------------------+
```

Coded phone frame — not a photo mockup, not a laptop-on-desk. Four screens:
16,5/20 average, next class, payment history, an alert.

Arabic availability of the parent app is unresolved (§9); the section ships
without claiming it either way.

### 5.8 Onboarding — one afternoon

```
 14:00 ------------ 15:00 ------------ 16:00 ------------ 17:00
   *                  *                   *
   Configurer         Lancer le           Le centre
   le centre          planning            tourne
   matieres, salles,  import groupe       presences, recus,
   profs, eleves                          messages parents
```

A real sequence, so a timeline and step ordering are earned rather than
decorative.

The section background interpolates from early to late afternoon light as the
user scrolls — a slow tween between two `--chalk` variants. This is the one
effect on the site not driven by a data change; it is retained because the
section's literal subject is an afternoon passing, so the motion is the content.

Also states: « Migration gratuite sur les formules payantes. »

### 5.9 Testimonials

```
+--------------------------------------------------------------+
|  <<  ------------------------------------------------        |
|      -----------------------------  >>                       |
|                                                              |
|  +--+  Nom . Role                            <-   1/N   ->   |
|  |ph|  Centre, Ville                                          |
+--------------------------------------------------------------+
```

One large quote at a time, advanced by the visitor. Same `proof.json` source and
same CI gate as §5.3. Real name, role, centre, city and a real photo or short
video.

**Removed:** initials avatars, star rows.

### 5.10 Pricing

```
        Combien d'eleves dans votre centre ?
        [--------O------------------]  [ 180 ]
        0                        500+

+------------+  +==================+  +------------+
| Debutant   |  || Pro             ||  | Entreprise |
| 189 DH/mois|  || 289 DH/mois     ||  | Sur devis  |
|            |  || Le plus choisi  ||  |            |
| 50 eleves  |  || 300 eleves      ||  | illimite   |
| 5 profs    |  || profs illimites ||  | multi-sites|
|[Demander   |  ||[Essayer Pro     ||  |[Demander   |
| une demo]  |  || gratuitement]   ||  | une demo]  |
+------------+  +==================+  +------------+
     (recedes)        (in focus)          (recedes)

        Remboursement integral sous 30 jours.
```

Exact figures from the brief. A student-count slider plus number field sits
above the plans: ≤ 50 highlights Débutant, 51–300 highlights Pro, > 300
highlights Entreprise.

Focus is expressed through **edge treatment and position in the grid** — the
focused card gains a square-cornered plate edge and full opacity; the others
drop to 0.6 opacity, `scale(0.98)`, and keep a hairline rule only. Deliberately
not three identical rounded boxes differentiated by shadow.

Money-back guarantee stated once. No invented annual pricing.

### 5.11 FAQ

Current questions retained, rewritten in plain language. Answers animate open
via `grid-template-rows: 0fr → 1fr`. Deep-linkable (`#faq-securite`). FAQPage
schema.

### 5.12 Demo request

Three steps:

1. Centre name and city — the **full** list of Moroccan cities, searchable, not
   four options.
2. Centre size.
3. Name and phone, validated in `+212` format, with a « joignable sur
   WhatsApp » checkbox.

Errors are inline and specific — « Le numéro doit commencer par +212 », never
« Champ invalide ».

On success the logo's book closes and reopens (brand signature, use 2 of 2) and
the message reads « Demande envoyée. Nous vous appelons sous 24 h. »

### 5.13 Footer

`--teal-deep` plate. Real links only — « Centre d'aide », « Contact » and
« Statut » receive real destinations or are removed. Dynamic copyright year.
Legal pages retained. Hosts the « Réduire les animations » toggle.

---

## 6. Motion system

### 6.1 Stack

| Library | Verdict | Approx. gzipped |
|---|---|---|
| GSAP core + ScrollTrigger | Yes | ~34 KB |
| Flip | Yes | ~7 KB |
| DrawSVG | Yes | ~2 KB |
| SplitText | Yes — **lines only**, never per-character | ~4 KB |
| MorphSVG | **Dropped** | — |
| Lenis | **Dropped** | — |
| Three.js / WebGL | Not used | — |

**MorphSVG dropped.** Its only use was §5.4's object-to-module transform. A Flip
with a crossfade at the midpoint reads identically and is far more robust across
four dissimilar shapes; path-morphing a receipt book into a payments table
produces an illegible halfway frame.

**Lenis dropped.** It works by interpolating scroll position, which is by
definition a changed scroll feel, and the brief bans scroll hijacking. The
pinned sections require 1:1 scroll fidelity. Native scroll only.

Total ≈ **47 KB gzipped**, lazy-loaded per section, against a 150 KB budget that
Astro starts near zero.

GSAP plugins are free under the standard licence as of 3.13 — **verify at
install** rather than assume.

### 6.2 Load sequence — 2 200 ms exactly, once per session

```
ms  0    250   600   850   1200        1600            2200
    |     |     |     |     |           |               |
 1  ###########|     |     |           |               |  book opens (600, move)
 2        #############    |           |               |  grid draws (600, enter)
 3              ###########|           |               |  6 blocks drop (300 ea, 50ms stagger)
 4                         ############|               |  conflict HOLDS (400, no motion)
 5                                     ################|  Flip resolve (600, move)
```

**The H1 does not animate.** It paints at full opacity in the server-rendered
HTML before any script loads. The H1 is the LCP element and any fade or line
reveal on it directly delays LCP past the 2.0 s budget. The brief's one
permitted headline reveal is spent on section H2s during scroll, where it costs
nothing.

Gated on `sessionStorage`; repeat visits land on the resolved timetable.

### 6.3 Storyboard

| § | Trigger | What moves | Meaning | Duration / ease | Reduced motion |
|---|---|---|---|---|---|
| 5.1 | scroll > 80px | inner bar translateY, tagline opacity | you have left the top | 300 / enter | snaps, no tween |
| 5.2 | load, once | see §6.2 | a week resolving itself | 2200 total | renders resolved; conflict shown as static annotated state |
| 5.2 | drag / arrow keys | block transform, conflict state | the product responds to you | 150 / 300 | drag works, no drop tween |
| 5.4 | scroll into view | 4 objects Flip into slots, crossfade at midpoint | paper becomes software | 600 / move, 120ms stagger | four static before/after pairs |
| 5.5 | pinned scrub, 2vh | frame contents swap per chapter | five jobs, one system | 600 / move | unpinned, five stacked static frames |
| 5.5.2 | chapter 2 | SMS bubble leaves frame to phone | an absence reaches the parent | 900 / move | static frame, arrow, phone |
| 5.5.3 | chapter 3 | receipt-to-invoice Flip; the one number transition | money becomes trackable | 600 / move | final state, number typeset |
| 5.6 | pinned scrub | 5 bars fill, gauge climbs to 87%, recovers to 41% | early care, and that it works | 900 / move | static 3-step diagram |
| 5.7 | screen advance | shared-element transition | one app, four answers | 300 / state | tabs, instant swap |
| 5.8 | scroll | background early-to-late afternoon | an afternoon passing | scrubbed | fixed mid-afternoon value |
| 5.9 | visitor click | quote cross-dissolve | — | 300 / state | instant |
| 5.10 | slider input | focused card opacity + scale 0.98→1 | your size, your plan | 300 / state | focus via edge + label only |
| 5.11 | click | grid-template-rows 0fr→1fr | — | 300 / enter | instant open |
| 5.12 | submit success | book closes and reopens | brand signature, 2 of 2 | 600 / move | static open book + message |
| all | H2 enters view | line-by-line reveal, once | — | 300 / enter, 80ms stagger | no reveal |

### 6.4 Rules

- Animated properties restricted to `transform`, `opacity`, `clip-path`. The
  FAQ's `grid-template-rows` is the single documented exception, chosen because
  animating `height` or guessing `max-height` is worse, and it is a small
  isolated non-pinned element.
- `will-change` set in ScrollTrigger `onEnter`, removed in `onLeave`. Never in a
  stylesheet.
- At most two pinned sections (§5.5, §5.6). Desktop pins never exceed two
  viewport heights. No pinning on mobile.
- Nothing loops. The hero timetable's idle state has no idle animation — it sits
  resolved. `IntersectionObserver` pauses every scrubbed timeline off-screen.
- No per-character text animation.

### 6.5 Reduced motion

`prefers-reduced-motion: reduce` and a visible « Réduire les animations »
toggle in the footer both set `data-motion="reduced"` on `<html>`, persisted to
`localStorage`.

Under that flag **GSAP is never imported at all** — each section island checks
before importing, so reduced-motion visitors download ~47 KB less rather than
more. Every narrative renders its final meaningful state in CSS.

---

## 7. Content governance

Every factual claim lives in `src/content/*.json`. Claims that are not yet
verified carry a `__PLACEHOLDER__` sentinel.

`scripts/check-placeholders.mjs` runs in CI and in the production build, and
exits non-zero if any sentinel remains. This makes the QA requirement "no
[CONFIRM] placeholder visible in production" mechanically enforced rather than
remembered.

Unresolved claims currently held behind the gate:

| Claim | Issue |
|---|---|
| Brand spelling | Brand is "Moujtahid", domain is "moujtahide.ma". One spelling must be chosen for all copy. |
| Débutant pricing | The current FAQ says "gratuite à vie"; the pricing table says 189 DH/month. These contradict. |
| Compliance wording | The current site cites GDPR. Moroccan directors recognise **law 09-08** and **CNDP**. State only what is true. |
| Client names | Académie Lumière, Atlas Prep, Étoile Formation, Centre Ibn Khaldoun, Dar Taalim, Centre Avenir — none confirmed. |
| Testimonials | Four quotes, unconfirmed. No words will be written and attributed to a real person. |
| « des centaines de centres » | Unsubstantiated volume claim. |
| Parent app in Arabic | Unknown. |

Security claims that are stated as true on the current site and carried forward:
AES-256 at rest, TLS 1.3 in transit, nightly backups in separate locations, no
resale of data. Demo requests answered within 24 hours.

### Demo data

Coded components use fictional but plausible Moroccan data — centre names,
subjects such as Maths 2BAC SM, Français 1BAC, Anglais B1, amounts in DH. Dates
are computed at runtime; the current dashboard's hard-coded « Juin 2025 » is
not reproduced.

---

## 8. Technical requirements

### Performance budget

Measured with Lighthouse mobile, mid-range Android, 4G.

| Metric | Budget |
|---|---|
| LCP | < 2.0 s |
| INP | < 200 ms |
| CLS | < 0.05 |
| Initial JS | < 150 KB gzipped |

### Fonts

Latin and Arabic subset separately. Preload the display weight only.
`font-display: swap` with a size-adjusted fallback to hold CLS at zero.

### Accessibility — WCAG 2.2 AA

- Keyboard focus always visible, using `--rule-strong` / `--teal`
- Every interactive demo operable by keyboard and screen reader, each with a
  text equivalent
- Touch targets ≥ 44px (satisfied by the 44px mobile slot height)
- No information conveyed by colour alone (§3.1)

### Internationalisation

French ships first. CSS logical properties and direction-aware layout from day
one, so Arabic (RTL) ships in phase 2 without a refactor. In Arabic the
timetable mirrors and days read right to left.

### SEO

- Intent of the current meta description and keywords retained
- A single H1
- `SoftwareApplication` schema with an `Offer` in MAD per plan
- `FAQPage` schema
- `hreflang` `fr-MA` and `ar-MA`
- New 1200×630 OG image built from the hero timetable
- `theme-color` `#246B5D`

### Analytics events

`hero_interact`, `tour_chapter_view`, `pricing_student_count`, `demo_step_n`,
`demo_submit`, `trial_click`.

---

## 9. Assumptions and open questions

Assumptions taken so work could proceed. All are reversible; each is cheap to
change now and expensive later.

| # | Assumption | Reverse by |
|---|---|---|
| A1 | Angular app moves to `app.moujtahide.ma` | Affects auth cookie domain and Laravel CORS. Settle before deploy. |
| A2 | IBM Plex over licensed Graphik | Settle before writing CSS. Price the Graphik Arabic web licence if wanted. |
| A3 | `tnum` present in both IBM Plex binaries | **Verify before writing CSS.** If absent, reopen D4. |
| A4 | GSAP plugins free under standard licence at 3.13+ | Verify at install. |
| A5 | §5.8's light shift is retained | The one non-data-driven effect. Vetoable. |

Open questions are carried in §7's content gate and do not block the build.

---

## 10. Out of scope

- The product application, Laravel backend, parent and superadmin areas
- Arabic (RTL) localisation — phase 2, but not foreclosed by any decision here
- Logo redesign — the existing mark is vectorised, not redrawn
- `landing.html` at the repo root — a dead artifact, to be deleted separately

---

## 11. QA checklist (pass 3)

- [ ] Screenshots at 360, 390, 768, 1024, 1440, 1920
- [ ] Chrome, Safari iOS, Samsung Internet
- [ ] Reduced motion on and off
- [ ] Keyboard-only walkthrough: hero demo, pricing input, demo form
- [ ] `check-placeholders.mjs` passes
- [ ] Every number traces to §1 of the brief or is visibly fictional demo data
- [ ] Colour-blind simulation of conflict / absence / risk / ok
- [ ] Lighthouse mobile against the §8 budget
- [ ] Final pass: remove one decorative element per section; keep it removed if
      the section is better without it
