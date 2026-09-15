# Moujtahid Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a statically generated French marketing site for Moujtahid at `moujtahide.ma`, replacing the Angular `hero` route, whose animations demonstrate the product working rather than decorate the page.

**Architecture:** A new Astro project in `site/`, entirely separate from the existing Angular application (which moves to `app.moujtahide.ma`). Astro ships zero JavaScript by default; each animated section is a lazy-loaded island that imports GSAP only when it is about to run and never when the visitor has reduced motion set. One timetable engine — pure TypeScript with no DOM dependency — drives the hero, the product tour and the onboarding clock.

**Tech Stack:** Astro 5, TypeScript, Vitest (unit), Playwright + axe-core (integration and accessibility), GSAP 3.13+ (core, ScrollTrigger, Flip, DrawSVG, SplitText), IBM Plex Sans / IBM Plex Sans Arabic via `@fontsource`.

**Spec:** `docs/superpowers/specs/2026-09-15-moujtahid-site-design.md` — read it alongside this plan. Every task argues from the spec; where this plan and the spec disagree, the spec wins and the discrepancy is a bug in this plan.

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

**Colour — exact values, no substitutions**
- `--teal #246B5D` · `--teal-deep #133E36` · `--gold #BA934E` · `--gold-ink #8A6B33` · `--gold-light #C9A362`
- `--chalk #F3F6F5` · `--ink #17302B` · `--ink-mute #4A5F59` · `--rule-hair #D3DEDA` · `--rule-strong #748F87`
- `--conflict #A3321F` · `--absence #B2541C` · `--risk #8C2F4A` · `--ok #1F6B4A`
- **`--gold` is a fill colour only.** It must never set text on a light ground (2.62:1). Use `--gold-ink` on chalk, `--gold-light` on deep teal.
- **`--rule-hair` must never carry information** (1.27:1 on chalk). Interactive boundaries, focus rings and conflict outlines use `--rule-strong` (3.21:1).
- No colour may be the sole carrier of meaning. Every status needs an icon or shape cue plus a text label.

**Motion**
- Exactly four durations: `150ms` feedback, `300ms` state, `600ms` object, `900ms` story.
- Exactly three easings: `--ease-exit cubic-bezier(0.4,0,1,1)`, `--ease-enter cubic-bezier(0,0,0.2,1)`, `--ease-move cubic-bezier(0.32,0.72,0,1)`.
- Animate only `transform`, `opacity`, `clip-path`. The FAQ's `grid-template-rows` is the single permitted exception.
- `will-change` is set in a ScrollTrigger `onEnter` and removed in `onLeave`. Never in a stylesheet.
- At most **two** pinned sections site-wide (Tour, Risk). Desktop pins never exceed 2 viewport heights. **No pinning on mobile.**
- Nothing loops. No per-character text animation. No scroll interception, no momentum, no snapping.
- Under `data-motion="reduced"`, GSAP is **never imported at all**.

**Copy**
- Exactly two CTA labels site-wide: « Demander une démo » and « Essayer Pro gratuitement ».
- Banned: « révolutionnez », « boostez », « propulsez », « solution tout-en-un », « sans effort », « une nouvelle ère », « et bien plus encore », « découvrez comment », « grâce à l'IA ».
- No emoji anywhere. No exclamation marks in headings. Sentence case throughout.
- All user-visible French strings pass through `applyFrenchTypography()` (Task 2). Never hand-type a non-breaking space.

**Layout**
- Grid module: 6 columns (Lun–Sam) × 12 rows (14h00–20h00 in 30-minute slots).
- Slot height `56px` desktop, `44px` mobile. The mobile value is also the minimum touch target.
- All spatial CSS uses logical properties (`inline-start`, `padding-block`, `margin-inline`). A physical `left`/`right`/`margin-left` in a commit is a review rejection — it breaks the phase-2 RTL flip.
- Radius by hierarchy: `--r-grid 0`, `--r-ui 6px`, `--r-control 4px`, `--r-pill 999px`. Never one radius everywhere.
- Exactly one shadow token exists, used only for a timetable block lifted mid-drag.

**Budget** — Lighthouse mobile, mid-range Android, 4G: LCP < 2.0s · INP < 200ms · CLS < 0.05 · initial JS < 150KB gzipped.

**Content** — every factual claim lives in `src/content/*.json`. Unverified claims carry the `__PLACEHOLDER__` sentinel and the production build fails while any remain.

---

## File Structure

```
site/
  package.json                       npm scripts, deps
  astro.config.mjs                   static output, per-section islands
  vitest.config.ts                   unit tests
  playwright.config.ts               e2e + a11y
  lighthouserc.json                  perf budget assertions
  scripts/
    check-placeholders.mjs           CI gate on __PLACEHOLDER__ sentinels
    verify-font-features.mjs         asserts tnum exists in the font binaries
  src/
    styles/
      tokens.css                     ALL design tokens, single source of truth
      base.css                       reset, type scale, grid module
    lib/
      contrast.ts                    WCAG ratio maths (used by tests + CI)
      typography.ts                  French spacing/number rules
      phone.ts                       +212 validation and normalisation
      pricing.ts                     student count -> recommended plan
      motion.ts                      reduced-motion flag, lazy GSAP loader
    content/
      claims.json                    factual claims + sentinels
      proof.json                     client names, testimonials
      pricing.json                   the three plans
      cities.json                    full Moroccan city list
    components/
      brand/
        Logo.astro                   vectorised mark, separately targetable paths
        book-signature.ts            the open/close animation (used exactly twice)
      timetable/
        engine.ts                    PURE logic: placement, conflicts, moves
        Timetable.astro              server-rendered markup
        timetable.client.ts          drag + keyboard island
      sections/
        Nav.astro          Hero.astro        Proof.astro      Before.astro
        Tour.astro         Risk.astro        Parents.astro    Onboarding.astro
        Testimonials.astro Pricing.astro     Faq.astro        DemoForm.astro
        Footer.astro
    pages/
      index.astro                    the single page
  tests/
    unit/                            contrast, typography, engine, phone, pricing
    e2e/                             keyboard walkthrough, a11y, reduced motion
```

**Decomposition rationale.** `engine.ts` holds zero DOM references so the hardest logic on the site is unit-testable without a browser. `tokens.css` is the only place a colour is written, so the contrast test in Task 1 genuinely guards the whole site. Each section is one file because sections are the unit a reviewer accepts or rejects.

---

## Task 1: Scaffold, tokens, and the contrast guard

Establishes the project and locks the palette behind a test. The contrast test is written first because every later task depends on these values being correct.

**Files:**
- Create: `site/package.json`, `site/astro.config.mjs`, `site/vitest.config.ts`
- Create: `site/src/lib/contrast.ts`
- Create: `site/src/styles/tokens.css`
- Test: `site/tests/unit/contrast.test.ts`, `site/tests/unit/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseTokens(css: string): Record<string, string>`, `relativeLuminance(hex: string): number`, `contrastRatio(a: string, b: string): number` from `src/lib/contrast.ts`. `site/src/styles/tokens.css` exporting every token named in Global Constraints.

- [ ] **Step 1: Create the Astro project**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
mkdir -p site && cd site
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict --skip-houston
npm install
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Configure Astro for static output**

Create `site/astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://moujtahide.ma',
  output: 'static',
  build: { inlineStylesheets: 'auto' },
  vite: {
    build: {
      rollupOptions: {
        output: { manualChunks: { gsap: ['gsap'] } },
      },
    },
  },
});
```

Create `site/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
```

Add to `site/package.json` scripts:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "node scripts/check-placeholders.mjs && astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Write the failing test for the contrast maths**

Create `site/tests/unit/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { contrastRatio, relativeLuminance, parseTokens } from '../../src/lib/contrast';

describe('relativeLuminance', () => {
  it('returns 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#246B5D', '#F3F6F5')).toBeCloseTo(
      contrastRatio('#F3F6F5', '#246B5D'), 5,
    );
  });

  it('returns 1 for identical colours', () => {
    expect(contrastRatio('#246B5D', '#246B5D')).toBeCloseTo(1, 5);
  });
});

describe('parseTokens', () => {
  it('extracts custom properties with six-digit hex values', () => {
    const css = ':root {\n  --teal: #246B5D;\n  --r-grid: 0px;\n  --gold:#BA934E;\n}';
    expect(parseTokens(css)).toEqual({ '--teal': '#246B5D', '--gold': '#BA934E' });
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `cd site && npx vitest run tests/unit/contrast.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/lib/contrast"`.

- [ ] **Step 5: Implement the contrast module**

Create `site/src/lib/contrast.ts`:

```ts
/** Extracts `--name: #RRGGBB` pairs from a CSS string. Non-colour tokens are ignored. */
export function parseTokens(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) {
    out[m[1]] = m[2].toUpperCase();
  }
  return out;
}

function channelToLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.2 relative luminance. Expects `#RRGGBB`. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) =>
    channelToLinear(parseInt(hex.slice(i, i + 2), 16) / 255),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.2 contrast ratio, 1–21. Order-independent. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `cd site && npx vitest run tests/unit/contrast.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Write the failing test that guards the real palette**

This is the test that matters. It reads the actual stylesheet, so a later edit that breaks a contrast rule fails CI.

Create `site/tests/unit/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contrastRatio, parseTokens } from '../../src/lib/contrast';

const css = readFileSync(
  fileURLToPath(new URL('../../src/styles/tokens.css', import.meta.url)),
  'utf8',
);
const t = parseTokens(css);

describe('every colour token exists', () => {
  const required = [
    '--teal', '--teal-deep', '--gold', '--gold-ink', '--gold-light',
    '--chalk', '--ink', '--ink-mute', '--rule-hair', '--rule-strong',
    '--conflict', '--absence', '--risk', '--ok',
  ];
  it.each(required)('%s is defined', (name) => {
    expect(t[name], `${name} missing from tokens.css`).toBeDefined();
  });
});

describe('text contrast meets WCAG 2.2 AA (4.5:1)', () => {
  const pairs: Array<[string, string, number]> = [
    ['--ink', '--chalk', 12.93],
    ['--ink-mute', '--chalk', 6.29],
    ['--teal', '--chalk', 5.79],
    ['--gold-ink', '--chalk', 4.56],
    ['--conflict', '--chalk', 6.37],
    ['--absence', '--chalk', 4.62],
    ['--risk', '--chalk', 7.37],
    ['--ok', '--chalk', 5.92],
    ['--gold-light', '--teal-deep', 5.03],
  ];
  it.each(pairs)('%s on %s is at least 4.5:1', (fg, bg, expected) => {
    const ratio = contrastRatio(t[fg], t[bg]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeCloseTo(expected, 1);
  });
});

describe('ink on gold fills is legible', () => {
  it('is at least 4.5:1', () => {
    expect(contrastRatio(t['--ink'], t['--gold'])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('interactive boundaries meet WCAG 2.2 1.4.11 (3:1)', () => {
  it('--rule-strong on chalk is at least 3:1', () => {
    expect(contrastRatio(t['--rule-strong'], t['--chalk'])).toBeGreaterThanOrEqual(3);
  });
});

// These two encode DESIGN RULES, not failures. If someone "fixes" the value
// so these pass, they have broken the rule the spec relies on.
describe('design rules held as invariants', () => {
  it('--gold is fill-only: it must NOT reach 4.5:1 on chalk', () => {
    expect(contrastRatio(t['--gold'], t['--chalk'])).toBeLessThan(4.5);
  });

  it('--rule-hair is decorative: it must NOT reach 3:1 on chalk', () => {
    expect(contrastRatio(t['--rule-hair'], t['--chalk'])).toBeLessThan(3);
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `cd site && npx vitest run tests/unit/tokens.test.ts`
Expected: FAIL — `ENOENT: no such file or directory ... tokens.css`.

- [ ] **Step 9: Write tokens.css**

Create `site/src/styles/tokens.css`:

```css
/* Single source of truth for every design token.
   Colours are sampled from public/Logo.jpeg — see the spec, §3.1.
   tests/unit/tokens.test.ts guards every contrast rule stated here. */

:root {
  /* ---- Colour ------------------------------------------------------ */
  --teal:        #246B5D;  /* primary buttons, links, grid accents      */
  --teal-deep:   #133E36;  /* dark plates, footer                       */
  --gold:        #BA934E;  /* FILL ONLY — 2.62:1 on chalk, never text   */
  --gold-ink:    #8A6B33;  /* gold-toned text on chalk       4.56:1     */
  --gold-light:  #C9A362;  /* gold text on deep teal         5.03:1     */
  --chalk:       #F3F6F5;  /* page ground — cool, never warmed          */
  --ink:         #17302B;  /* body text                     12.93:1     */
  --ink-mute:    #4A5F59;  /* secondary text                 6.29:1     */
  --rule-hair:   #D3DEDA;  /* DECORATIVE ONLY — 1.27:1, never meaning   */
  --rule-strong: #748F87;  /* interactive edges, focus       3.21:1     */

  /* Status — each MUST be paired with a non-colour cue and a text label */
  --conflict:    #A3321F;  /* + diagonal hatch  + « Salle occupée »     */
  --absence:     #B2541C;  /* + hollow slot     + « Absent »            */
  --risk:        #8C2F4A;  /* + gauge position  + numeric %             */
  --ok:          #1F6B4A;  /* + filled check    + « Payé »              */

  /* ---- Grid module ------------------------------------------------- */
  --grid-cols: 6;          /* Lun–Sam            */
  --grid-rows: 12;         /* 14h00–20h00, 30min */
  --slot-h: 56px;

  /* ---- Radius, by hierarchy — never one value everywhere ----------- */
  --r-grid: 0px;
  --r-ui: 6px;
  --r-control: 4px;
  --r-pill: 999px;

  /* ---- Depth — exactly one shadow exists on this site -------------- */
  --shadow-lift: 0 8px 24px rgb(19 62 54 / 0.18);

  /* ---- Motion ------------------------------------------------------ */
  --dur-feedback: 150ms;
  --dur-state: 300ms;
  --dur-object: 600ms;
  --dur-story: 900ms;
  --ease-exit:  cubic-bezier(0.4, 0, 1, 1);
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-move:  cubic-bezier(0.32, 0.72, 0, 1);
}

@media (max-width: 767px) {
  :root { --slot-h: 44px; } /* also the minimum touch target */
}
```

- [ ] **Step 10: Run it to verify it passes**

Run: `cd site && npx vitest run`
Expected: PASS, all tests in both files.

- [ ] **Step 11: Commit**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
git add site/package.json site/package-lock.json site/astro.config.mjs \
        site/vitest.config.ts site/tsconfig.json site/src/lib/contrast.ts \
        site/src/styles/tokens.css site/tests/unit/
git commit -m "feat(site): scaffold Astro project with contrast-guarded tokens"
```

---

## Task 2: French typography transform

Every user-visible string passes through this. Writing it before any copy exists means no section can hand-type a non-breaking space and drift.

**Files:**
- Create: `site/src/lib/typography.ts`
- Test: `site/tests/unit/typography.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `applyFrenchTypography(s: string): string`, `formatDirhams(n: number): string`, `formatGrade(n: number): string` from `src/lib/typography.ts`.

Character reference — these are invisible in a diff, so they are named explicitly:
- `\u00A0` NO-BREAK SPACE — before `:` and inside `« »`
- `\u202F` NARROW NO-BREAK SPACE — before `;` `?` `!`, and as thousands separator

- [ ] **Step 1: Write the failing test**

Create `site/tests/unit/typography.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyFrenchTypography, formatDirhams, formatGrade } from '../../src/lib/typography';

const NBSP = '\u00A0';
const NNBSP = '\u202F';

describe('applyFrenchTypography', () => {
  it('puts a narrow no-break space before a question mark', () => {
    expect(applyFrenchTypography("Combien d'élèves ?"))
      .toBe(`Combien d'élèves${NNBSP}?`);
  });

  it('puts a narrow no-break space before ; and !', () => {
    expect(applyFrenchTypography('Oui ; non !')).toBe(`Oui${NNBSP}; non${NNBSP}!`);
  });

  it('puts a full no-break space before a colon', () => {
    expect(applyFrenchTypography('Tarif : 189 DH')).toBe(`Tarif${NBSP}: 189${NNBSP}DH`);
  });

  it('adds spaces inside guillemets', () => {
    expect(applyFrenchTypography('«Payé»')).toBe(`«${NBSP}Payé${NBSP}»`);
  });

  it('does not double a space that is already non-breaking', () => {
    expect(applyFrenchTypography(`Tarif${NBSP}:`)).toBe(`Tarif${NBSP}:`);
    expect(applyFrenchTypography(`«${NBSP}Payé${NBSP}»`)).toBe(`«${NBSP}Payé${NBSP}»`);
  });

  it('leaves a colon inside a URL or time alone', () => {
    expect(applyFrenchTypography('https://moujtahide.ma')).toBe('https://moujtahide.ma');
    expect(applyFrenchTypography('14:00')).toBe('14:00');
  });

  it('groups thousands with a narrow no-break space', () => {
    expect(applyFrenchTypography('103240 DH')).toBe(`103${NNBSP}240${NNBSP}DH`);
  });

  it('is idempotent', () => {
    const once = applyFrenchTypography("Combien d'élèves ? Tarif : 103240 DH");
    expect(applyFrenchTypography(once)).toBe(once);
  });
});

describe('formatDirhams', () => {
  it('groups thousands and binds the unit', () => {
    expect(formatDirhams(103240)).toBe(`103${NNBSP}240${NNBSP}DH`);
    expect(formatDirhams(189)).toBe(`189${NNBSP}DH`);
  });
});

describe('formatGrade', () => {
  it('uses a decimal comma and binds the denominator', () => {
    expect(formatGrade(16.5)).toBe('16,5/20');
    expect(formatGrade(18)).toBe('18/20');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd site && npx vitest run tests/unit/typography.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/typography`.

- [ ] **Step 3: Implement the transform**

Create `site/src/lib/typography.ts`:

```ts
const NBSP = '\u00A0';
const NNBSP = '\u202F';

/**
 * Applies French typographic spacing. Idempotent — safe to run on a string
 * that has already been processed.
 *
 * Rules (Imprimerie nationale):
 *   NBSP  before `:`   and inside `« »`
 *   NNBSP before `;` `?` `!` and as the thousands separator
 */
export function applyFrenchTypography(input: string): string {
  return input
    // Thousands: 103240 -> 103 240. Runs before colon handling so that
    // digit groups are settled first.
    .replace(/\b(\d{1,3})(?=(\d{3})+\b)/g, (m) => m + NNBSP)
    .replace(/(\d)\u202F(\d{3})(?=\d)/g, `$1${NNBSP}$2${NNBSP}`)
    // Bind a currency or unit token to the number it belongs to.
    .replace(/(\d)[ \u00A0](DH|MAD|%)/g, `$1${NNBSP}$2`)
    // Colon: only when flanked by a space or word boundary, so that
    // `https://` and `14:00` are untouched.
    .replace(/(\S)[ \u00A0\u202F]*:(?=\s|$)/g, `$1${NBSP}:`)
    // Semicolon, question mark, exclamation mark.
    .replace(/(\S)[ \u00A0\u202F]*([;?!])/g, `$1${NNBSP}$2`)
    // Guillemets.
    .replace(/«[ \u00A0\u202F]*/g, `«${NBSP}`)
    .replace(/[ \u00A0\u202F]*»/g, `${NBSP}»`);
}

/** `103240` -> `103 240 DH` with narrow no-break spaces. */
export function formatDirhams(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return `${grouped}${NNBSP}DH`;
}

/** `16.5` -> `16,5/20`. Trailing `.0` is dropped. */
export function formatGrade(value: number, outOf = 20): string {
  const text = Number.isInteger(value) ? `${value}` : `${value}`.replace('.', ',');
  return `${text}/${outOf}`;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd site && npx vitest run tests/unit/typography.test.ts`
Expected: PASS, 11 tests. If the thousands-separator or idempotence tests fail, fix the regex — do not relax the test.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
git add site/src/lib/typography.ts site/tests/unit/typography.test.ts
git commit -m "feat(site): French typography transform with idempotence guarantee"
```

---

## Task 3: Font verification and base stylesheet

Resolves spec assumption A3 before any CSS depends on it. If IBM Plex lacks `tnum`, this task stops and the font decision reopens — that is the point of doing it here rather than discovering it at QA.

**Files:**
- Create: `site/scripts/verify-font-features.mjs`
- Create: `site/src/styles/base.css`
- Modify: `site/package.json` (add `fontsource` deps and the `verify:fonts` script)

**Interfaces:**
- Consumes: `src/styles/tokens.css` from Task 1.
- Produces: `src/styles/base.css` defining the type scale classes `.display-1`, `.display-2`, `.heading`, `.body-lg`, `.body`, `.caption`, and the utility `.data` (tabular numerals). Defines `.grid-module` implementing the 6×12 slot grid.

- [ ] **Step 1: Install the fonts and a font parser**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre/site"
npm install @fontsource-variable/ibm-plex-sans @fontsource/ibm-plex-sans-arabic
npm install -D fontkit
```

- [ ] **Step 2: Write the verification script**

Create `site/scripts/verify-font-features.mjs`:

```js
/**
 * Spec assumption A3: IBM Plex ships real tabular figures in BOTH scripts.
 * The spec makes tnum a hard requirement (MAD amounts, 16,5/20, percentages).
 * If this script fails, STOP and reopen decision D4 — do not fall back to a
 * monospace font, which the spec forbids.
 */
import fontkit from 'fontkit';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const targets = [
  ['IBM Plex Sans (Latin)', '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2'],
  ['IBM Plex Sans Arabic',  '@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2'],
];

let failed = false;

for (const [label, specifier] of targets) {
  let font;
  try {
    font = fontkit.openSync(require.resolve(specifier));
  } catch (err) {
    console.error(`✗ ${label}: could not open — ${err.message}`);
    failed = true;
    continue;
  }
  const features = new Set(font.availableFeatures ?? []);
  const hasTnum = features.has('tnum');
  console.log(`${hasTnum ? '✓' : '✗'} ${label}: tnum ${hasTnum ? 'present' : 'MISSING'}`);
  if (!hasTnum) failed = true;
}

if (failed) {
  console.error(
    '\nFAIL: tabular figures are a hard requirement (spec §3.2).\n' +
    'Stop and reopen decision D4 before writing any CSS.',
  );
  process.exit(1);
}
console.log('\nA3 confirmed: tabular figures available in both scripts.');
```

Add to `site/package.json` scripts: `"verify:fonts": "node scripts/verify-font-features.mjs"`.

- [ ] **Step 3: Run the verification**

Run: `cd site && npm run verify:fonts`
Expected: `A3 confirmed: tabular figures available in both scripts.`

**If it fails:** stop this task. Report to the user that assumption A3 is false, and propose Readex Pro or licensed Graphik. Do not proceed to Step 4.

- [ ] **Step 4: Write the base stylesheet**

Create `site/src/styles/base.css`:

```css
@import '@fontsource-variable/ibm-plex-sans';
@import '@fontsource/ibm-plex-sans-arabic';
@import './tokens.css';

/* ---- Reset ---------------------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }

html {
  /* Never `scroll-behavior: smooth` — the spec bans scroll interception. */
  -webkit-text-size-adjust: 100%;
}

body {
  background: var(--chalk);
  color: var(--ink);
  font-family: 'IBM Plex Sans Variable', 'IBM Plex Sans Arabic',
               system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 1.0625rem;   /* 17px */
  line-height: 1.6;
  font-synthesis-weight: none;
  text-rendering: optimizeLegibility;
}

img, svg { max-width: 100%; display: block; }

/* ---- Focus — always visible, never removed -------------------------- */
:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: 2px;
}

/* ---- Type scale ----------------------------------------------------- */
.display-1 {
  font-size: clamp(2.75rem, 7vw, 5.25rem);
  font-weight: 600; line-height: 0.98; letter-spacing: -0.035em;
  text-wrap: balance;
}
.display-2 {
  font-size: clamp(2rem, 4.5vw, 3.25rem);
  font-weight: 600; line-height: 1.05; letter-spacing: -0.025em;
  text-wrap: balance;
}
.heading {
  font-size: clamp(1.375rem, 2vw, 1.75rem);
  font-weight: 600; line-height: 1.2; letter-spacing: -0.015em;
}
.body-lg { font-size: 1.125rem; line-height: 1.55; }
.body    { font-size: 1.0625rem; line-height: 1.6; }
.caption { font-size: 0.875rem; font-weight: 500; line-height: 1.4; }

/* Every number on the site. Verified by scripts/verify-font-features.mjs. */
.data { font-variant-numeric: tabular-nums slashed-zero; }

/* Measure cap — the spec requires under 75 characters. */
.prose { max-inline-size: 68ch; }

/* ---- The grid module ------------------------------------------------ */
/* 6 columns (Lun–Sam) x 12 rows (14h00–20h00). Logical properties only:
   a physical left/right here breaks the phase-2 RTL flip. */
.grid-module {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr));
  grid-auto-rows: var(--slot-h);
}

/* Page gutters are multiples of the slot. */
.shell {
  inline-size: min(100% - 2rem, 78rem);
  margin-inline: auto;
  padding-block: calc(var(--slot-h) * 2);
}

/* ---- Reduced motion -------------------------------------------------- */
/* Set by src/lib/motion.ts from prefers-reduced-motion OR the footer
   toggle. Under this flag GSAP is never imported (see Task 6). */
:root[data-motion='reduced'] *,
:root[data-motion='reduced'] *::before,
:root[data-motion='reduced'] *::after {
  animation-duration: 1ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 1ms !important;
}
```

- [ ] **Step 5: Verify the stylesheet compiles and the tokens still pass**

Run: `cd site && npx astro build && npx vitest run`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
git add site/scripts/verify-font-features.mjs site/src/styles/base.css \
        site/package.json site/package-lock.json
git commit -m "feat(site): verify tabular figures, add base stylesheet and grid module"
```

---

## Task 4: The timetable engine

The hardest logic on the site, and the only thing three sections depend on. Pure TypeScript, zero DOM references, so it is fully testable without a browser.

**Files:**
- Create: `site/src/components/timetable/engine.ts`
- Test: `site/tests/unit/engine.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, from `src/components/timetable/engine.ts`:
  - `DAYS: readonly string[]` — `['Lun','Mar','Mer','Jeu','Ven','Sam']`
  - `SLOTS_PER_DAY: 12`
  - `interface Session { id: string; subject: string; room: string; teacher: string; day: number; start: number; duration: number }`
  - `interface Conflict { kind: 'room' | 'teacher'; sessionIds: [string, string]; label: string }`
  - `slotLabel(index: number): string` — `0` → `'14h00'`
  - `overlaps(a: Session, b: Session): boolean`
  - `detectConflicts(sessions: readonly Session[]): Conflict[]`
  - `moveSession(sessions: readonly Session[], id: string, to: { day: number; start: number }): Session[]`
  - `findFreeSlot(sessions: readonly Session[], id: string): { day: number; start: number } | null`

- [ ] **Step 1: Write the failing test**

Create `site/tests/unit/engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  DAYS, SLOTS_PER_DAY, slotLabel, overlaps, detectConflicts,
  moveSession, findFreeSlot, type Session,
} from '../../src/components/timetable/engine';

const s = (over: Partial<Session> & { id: string }): Session => ({
  subject: 'Maths 2BAC SM', room: 'Salle A', teacher: 'M. Alami',
  day: 0, start: 0, duration: 2, ...over,
});

describe('grid shape', () => {
  it('has six days, Lun to Sam', () => {
    expect(DAYS).toEqual(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']);
  });

  it('has twelve 30-minute slots', () => {
    expect(SLOTS_PER_DAY).toBe(12);
  });
});

describe('slotLabel', () => {
  it('starts at 14h00 and steps 30 minutes', () => {
    expect(slotLabel(0)).toBe('14h00');
    expect(slotLabel(1)).toBe('14h30');
    expect(slotLabel(2)).toBe('15h00');
    expect(slotLabel(11)).toBe('19h30');
  });
});

describe('overlaps', () => {
  it('is false on different days', () => {
    expect(overlaps(s({ id: 'a', day: 0 }), s({ id: 'b', day: 1 }))).toBe(false);
  });

  it('is true when ranges intersect on the same day', () => {
    expect(overlaps(s({ id: 'a', start: 0, duration: 2 }),
                    s({ id: 'b', start: 1, duration: 2 }))).toBe(true);
  });

  it('is false when one ends exactly as the other begins', () => {
    expect(overlaps(s({ id: 'a', start: 0, duration: 2 }),
                    s({ id: 'b', start: 2, duration: 2 }))).toBe(false);
  });
});

describe('detectConflicts', () => {
  it('finds none when rooms and teachers differ', () => {
    expect(detectConflicts([
      s({ id: 'a', room: 'Salle A', teacher: 'M. Alami' }),
      s({ id: 'b', room: 'Salle B', teacher: 'Mme Benali' }),
    ])).toEqual([]);
  });

  it('finds a room conflict and labels it in French', () => {
    const found = detectConflicts([
      s({ id: 'a', room: 'Salle B', teacher: 'M. Alami' }),
      s({ id: 'b', room: 'Salle B', teacher: 'Mme Benali' }),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe('room');
    expect(found[0].label).toBe('Salle B occupée');
    expect(found[0].sessionIds).toEqual(['a', 'b']);
  });

  it('finds a teacher conflict', () => {
    const found = detectConflicts([
      s({ id: 'a', room: 'Salle A', teacher: 'M. Alami' }),
      s({ id: 'b', room: 'Salle B', teacher: 'M. Alami' }),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe('teacher');
    expect(found[0].label).toBe('M. Alami déjà en cours');
  });

  it('reports a room conflict once, not once per direction', () => {
    expect(detectConflicts([
      s({ id: 'a', room: 'Salle B' }), s({ id: 'b', room: 'Salle B' }),
    ])).toHaveLength(1);
  });

  it('reports room and teacher separately when both clash', () => {
    const found = detectConflicts([
      s({ id: 'a', room: 'Salle B', teacher: 'M. Alami' }),
      s({ id: 'b', room: 'Salle B', teacher: 'M. Alami' }),
    ]);
    expect(found.map((c) => c.kind).sort()).toEqual(['room', 'teacher']);
  });
});

describe('moveSession', () => {
  const base = [s({ id: 'a', day: 0, start: 0 }), s({ id: 'b', day: 1, start: 4 })];

  it('returns a new array and does not mutate the input', () => {
    const next = moveSession(base, 'a', { day: 3, start: 6 });
    expect(next).not.toBe(base);
    expect(base[0].day).toBe(0);
    expect(next[0]).toMatchObject({ day: 3, start: 6 });
  });

  it('leaves other sessions untouched', () => {
    expect(moveSession(base, 'a', { day: 3, start: 6 })[1]).toEqual(base[1]);
  });

  it('clamps a move that would run past the end of the day', () => {
    const next = moveSession(base, 'a', { day: 0, start: 11 });
    expect(next[0].start).toBe(SLOTS_PER_DAY - next[0].duration);
  });

  it('throws on an unknown id rather than silently doing nothing', () => {
    expect(() => moveSession(base, 'nope', { day: 0, start: 0 })).toThrow(/nope/);
  });
});

describe('findFreeSlot', () => {
  it('finds a slot where the session conflicts with nothing', () => {
    const sessions = [
      s({ id: 'a', day: 0, start: 0, room: 'Salle B' }),
      s({ id: 'b', day: 0, start: 0, room: 'Salle B' }),
    ];
    const slot = findFreeSlot(sessions, 'b');
    expect(slot).not.toBeNull();
    expect(detectConflicts(moveSession(sessions, 'b', slot!))).toEqual([]);
  });

  it('returns null when the week is genuinely full', () => {
    const full: Session[] = [];
    for (let d = 0; d < 6; d++) {
      for (let t = 0; t < SLOTS_PER_DAY; t += 2) {
        full.push(s({ id: `f${d}-${t}`, day: d, start: t, duration: 2, room: 'Salle B' }));
      }
    }
    full.push(s({ id: 'x', day: 0, start: 0, duration: 2, room: 'Salle B' }));
    expect(findFreeSlot(full, 'x')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd site && npx vitest run tests/unit/engine.test.ts`
Expected: FAIL — cannot resolve the engine module.

- [ ] **Step 3: Implement the engine**

Create `site/src/components/timetable/engine.ts`:

```ts
/**
 * Pure timetable logic. NO DOM references — this module is imported by the
 * hero, the product tour and the onboarding clock, and is unit-tested
 * without a browser.
 *
 * Coordinates: `day` 0–5 (Lun–Sam), `start` 0–11 (30-minute slots from 14h00).
 */

export const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const;
export const SLOTS_PER_DAY = 12;

const DAY_START_HOUR = 14;

export interface Session {
  id: string;
  subject: string;
  room: string;
  teacher: string;
  day: number;
  start: number;
  duration: number;
}

export interface Conflict {
  kind: 'room' | 'teacher';
  sessionIds: [string, string];
  /** French, shown next to the non-colour cue. Never colour alone. */
  label: string;
}

/** `0` -> `'14h00'`, `1` -> `'14h30'`. */
export function slotLabel(index: number): string {
  const minutes = DAY_START_HOUR * 60 + index * 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

/** Same day and intersecting time ranges. Touching ranges do not overlap. */
export function overlaps(a: Session, b: Session): boolean {
  if (a.day !== b.day) return false;
  return a.start < b.start + b.duration && b.start < a.start + a.duration;
}

/**
 * Every room and teacher clash, each reported once. A pair that clashes on
 * both room and teacher yields two conflicts, because they are two different
 * problems with two different fixes.
 */
export function detectConflicts(sessions: readonly Session[]): Conflict[] {
  const found: Conflict[] = [];
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (!overlaps(a, b)) continue;
      if (a.room === b.room) {
        found.push({ kind: 'room', sessionIds: [a.id, b.id], label: `${a.room} occupée` });
      }
      if (a.teacher === b.teacher) {
        found.push({ kind: 'teacher', sessionIds: [a.id, b.id], label: `${a.teacher} déjà en cours` });
      }
    }
  }
  return found;
}

/**
 * Moves one session. Returns a new array; never mutates. A destination that
 * would run past 20h00 is clamped to the last slot that fits.
 */
export function moveSession(
  sessions: readonly Session[],
  id: string,
  to: { day: number; start: number },
): Session[] {
  const target = sessions.find((s) => s.id === id);
  if (!target) throw new Error(`moveSession: no session with id "${id}"`);

  const day = Math.min(Math.max(to.day, 0), DAYS.length - 1);
  const start = Math.min(Math.max(to.start, 0), SLOTS_PER_DAY - target.duration);

  return sessions.map((s) => (s.id === id ? { ...s, day, start } : s));
}

/**
 * The first slot, scanning by day then by time, where this session conflicts
 * with nothing. Returns null if the week has no room for it.
 */
export function findFreeSlot(
  sessions: readonly Session[],
  id: string,
): { day: number; start: number } | null {
  const target = sessions.find((s) => s.id === id);
  if (!target) throw new Error(`findFreeSlot: no session with id "${id}"`);

  const others = sessions.filter((s) => s.id !== id);

  for (let day = 0; day < DAYS.length; day++) {
    for (let start = 0; start <= SLOTS_PER_DAY - target.duration; start++) {
      const candidate: Session = { ...target, day, start };
      const clashes = others.some(
        (o) => overlaps(candidate, o) && (o.room === candidate.room || o.teacher === candidate.teacher),
      );
      if (!clashes) return { day, start };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd site && npx vitest run tests/unit/engine.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
git add site/src/components/timetable/engine.ts site/tests/unit/engine.test.ts
git commit -m "feat(site): pure timetable engine with conflict detection"
```

---

## Task 5: Motion module and the reduced-motion contract

Every animated section imports GSAP through this module and nowhere else. That single choke point is what makes "GSAP is never imported under reduced motion" enforceable rather than aspirational.

**Files:**
- Create: `site/src/lib/motion.ts`
- Test: `site/tests/unit/motion.test.ts`
- Modify: `site/vitest.config.ts` (add a `jsdom` project for DOM-touching units)

**Interfaces:**
- Consumes: nothing.
- Produces, from `src/lib/motion.ts`:
  - `prefersReducedMotion(): boolean`
  - `applyMotionPreference(): void` — sets `data-motion` on `<html>`
  - `setMotionPreference(reduced: boolean): void` — footer toggle, persists
  - `loadGsap(): Promise<GsapBundle | null>` — resolves `null` under reduced motion
  - `interface GsapBundle { gsap: typeof import('gsap').gsap; ScrollTrigger: ... }`

- [ ] **Step 1: Install GSAP and jsdom**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre/site"
npm install gsap
npm install -D jsdom
```

Confirm the licence assumption (spec A4): GSAP 3.13+ includes ScrollTrigger, Flip, DrawSVG and SplitText under the standard no-charge licence. Run `npm ls gsap` and check the installed version is `>= 3.13.0`. If it is lower, or if the plugins are not present under `gsap/`, stop and report — do not substitute a paid build.

- [ ] **Step 2: Add a jsdom test project**

Replace `site/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['tests/unit/**/*.test.ts'],
          exclude: ['tests/unit/**/*.dom.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'dom',
          include: ['tests/unit/**/*.dom.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
```

- [ ] **Step 3: Write the failing test**

Create `site/tests/unit/motion.dom.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  prefersReducedMotion, applyMotionPreference, setMotionPreference, loadGsap,
  MOTION_STORAGE_KEY,
} from '../../src/lib/motion';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(),
  }));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-motion');
  mockMatchMedia(false);
});

describe('prefersReducedMotion', () => {
  it('is false when the OS does not ask for reduced motion', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('is true when the OS asks for reduced motion', () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('is true when the visitor used the footer toggle, even if the OS did not', () => {
    localStorage.setItem(MOTION_STORAGE_KEY, 'reduced');
    expect(prefersReducedMotion()).toBe(true);
  });

  it('lets an explicit "full" choice override the OS setting', () => {
    mockMatchMedia(true);
    localStorage.setItem(MOTION_STORAGE_KEY, 'full');
    expect(prefersReducedMotion()).toBe(false);
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); },
      clear() {}, removeItem() {}, key: () => null, length: 0,
    });
    expect(() => prefersReducedMotion()).not.toThrow();
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('applyMotionPreference', () => {
  it('sets data-motion="reduced" on the root when reduced', () => {
    mockMatchMedia(true);
    applyMotionPreference();
    expect(document.documentElement.dataset.motion).toBe('reduced');
  });

  it('removes the attribute when full motion is wanted', () => {
    document.documentElement.dataset.motion = 'reduced';
    applyMotionPreference();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });
});

describe('setMotionPreference', () => {
  it('persists the choice and applies it immediately', () => {
    setMotionPreference(true);
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('reduced');
    expect(document.documentElement.dataset.motion).toBe('reduced');
  });
});

describe('loadGsap', () => {
  it('resolves null under reduced motion, so GSAP is never downloaded', async () => {
    mockMatchMedia(true);
    expect(await loadGsap()).toBeNull();
  });

  it('resolves a bundle with gsap and ScrollTrigger under full motion', async () => {
    const bundle = await loadGsap();
    expect(bundle).not.toBeNull();
    expect(bundle!.gsap).toBeTypeOf('object');
    expect(bundle!.ScrollTrigger).toBeTypeOf('function');
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `cd site && npx vitest run --project dom`
Expected: FAIL — cannot resolve `../../src/lib/motion`.

- [ ] **Step 5: Implement the motion module**

Create `site/src/lib/motion.ts`:

```ts
/**
 * The ONLY place GSAP is imported. Every animated section goes through
 * `loadGsap()`, which resolves null under reduced motion — so a reduced-motion
 * visitor downloads ~47 KB LESS, not more (spec §6.5).
 */

export const MOTION_STORAGE_KEY = 'moujtahid:motion';

/** localStorage throws in private mode and when site data is blocked. */
function readStoredPreference(): 'reduced' | 'full' | null {
  try {
    const value = localStorage.getItem(MOTION_STORAGE_KEY);
    return value === 'reduced' || value === 'full' ? value : null;
  } catch {
    return null;
  }
}

/** An explicit visitor choice wins over the OS setting, in both directions. */
export function prefersReducedMotion(): boolean {
  const stored = readStoredPreference();
  if (stored) return stored === 'reduced';
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function applyMotionPreference(): void {
  const root = document.documentElement;
  if (prefersReducedMotion()) root.dataset.motion = 'reduced';
  else delete root.dataset.motion;
}

export function setMotionPreference(reduced: boolean): void {
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, reduced ? 'reduced' : 'full');
  } catch {
    /* Preference is not persisted, but the page still responds. */
  }
  applyMotionPreference();
}

export interface GsapBundle {
  gsap: typeof import('gsap')['gsap'];
  ScrollTrigger: typeof import('gsap/ScrollTrigger')['ScrollTrigger'];
  Flip: typeof import('gsap/Flip')['Flip'];
}

let bundlePromise: Promise<GsapBundle> | null = null;

/**
 * Lazily loads GSAP once per page. Returns null under reduced motion, which
 * is the contract every caller must honour:
 *
 *     const m = await loadGsap();
 *     if (!m) return;            // final state is already in the CSS
 */
export async function loadGsap(): Promise<GsapBundle | null> {
  if (prefersReducedMotion()) return null;
  bundlePromise ??= (async () => {
    const [{ gsap }, { ScrollTrigger }, { Flip }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('gsap/Flip'),
    ]);
    gsap.registerPlugin(ScrollTrigger, Flip);
    return { gsap, ScrollTrigger, Flip };
  })();
  return bundlePromise;
}

/**
 * Sets `will-change` only while a timeline runs (spec §6.4). Never put
 * will-change in a stylesheet.
 */
export function withWillChange(el: HTMLElement, properties: string) {
  return {
    onEnter: () => { el.style.willChange = properties; },
    onLeave: () => { el.style.willChange = ''; },
    onEnterBack: () => { el.style.willChange = properties; },
    onLeaveBack: () => { el.style.willChange = ''; },
  };
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `cd site && npx vitest run`
Expected: PASS, both projects. 12 tests in the dom project.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
git add site/src/lib/motion.ts site/tests/unit/motion.dom.test.ts \
        site/vitest.config.ts site/package.json site/package-lock.json
git commit -m "feat(site): motion module with reduced-motion GSAP opt-out"
```

---

## Task 6: Vectorise the logo and build the book signature

The mark is traced per colour so the M, the page lines and the gold pages end up as separately targetable groups. An auto-trace of the whole image yields one merged path, which cannot be animated.

**Files:**
- Create: `site/scripts/trace-logo.mjs`
- Create: `site/public/logo.svg`
- Create: `site/src/components/brand/Logo.astro`
- Create: `site/src/components/brand/book-signature.ts`

**Interfaces:**
- Consumes: `loadGsap` from `src/lib/motion.ts` (Task 5). Source image `public/Logo.jpeg` at the repo root.
- Produces:
  - `Logo.astro` accepting props `{ class?: string; title?: string }`, rendering an inline SVG whose groups carry ids `logo-m`, `logo-lines`, `logo-page-left`, `logo-page-right`, `logo-spine`, `logo-drop`.
  - `playBookSignature(root: SVGElement, direction: 'open' | 'close-open'): Promise<void>` from `book-signature.ts`.

- [ ] **Step 1: Write the tracing script**

Create `site/scripts/trace-logo.mjs`:

```js
/**
 * Traces public/Logo.jpeg into separated SVG paths, one per brand colour.
 * Tracing per colour is what gives the animation independently movable
 * groups; a single trace of the whole image produces one merged path.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import potrace from 'potrace';
import { promisify } from 'node:util';

const SOURCE = '../public/Logo.jpeg';
const TEAL = { r: 0x24, g: 0x6b, b: 0x5d };
const GOLD = { r: 0xba, g: 0x93, b: 0x4e };
const TOLERANCE = 60; // JPEG artefacts push sampled pixels a few steps off

/** Black where the pixel is near `target`, white elsewhere — potrace input. */
async function mask(target) {
  const { data, info } = await sharp(new URL(SOURCE, import.meta.url).pathname)
    .raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height);
  for (let i = 0, p = 0; i < data.length; i += info.channels, p++) {
    const near =
      Math.abs(data[i] - target.r) < TOLERANCE &&
      Math.abs(data[i + 1] - target.g) < TOLERANCE &&
      Math.abs(data[i + 2] - target.b) < TOLERANCE;
    out[p] = near ? 0 : 255;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png().toBuffer();
}

const trace = promisify((buf, opts, cb) => potrace.trace(buf, opts, cb));

const opts = { threshold: 128, turdSize: 12, optCurve: true, optTolerance: 0.2 };
const tealSvg = await trace(await mask(TEAL), opts);
const goldSvg = await trace(await mask(GOLD), opts);

writeFileSync(new URL('./_trace-teal.svg', import.meta.url), tealSvg);
writeFileSync(new URL('./_trace-gold.svg', import.meta.url), goldSvg);

console.log('Traced. Now assemble public/logo.svg by hand:');
console.log('  1. Open _trace-teal.svg and _trace-gold.svg.');
console.log('  2. The teal file contains the M outline, the four page lines');
console.log('     and the drop as separate subpaths — split them on "M" commands');
console.log('     and sort by bounding box (M is outermost, drop is lowest).');
console.log('  3. The gold file contains the two pages — split on the spine.');
console.log('  4. Assemble into the group structure in Task 6 Step 3.');
```

Install its dependencies:

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre/site"
npm install -D sharp potrace
```

- [ ] **Step 2: Run the trace**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre/site"
cp ../public/Logo.jpeg public/Logo.jpeg
node scripts/trace-logo.mjs
```

Expected: `_trace-teal.svg` and `_trace-gold.svg` are written, each a few KB.

- [ ] **Step 3: Assemble the structured SVG**

Create `site/public/logo.svg` using the traced path data. The structure below is required; substitute the real `d` attributes from the traced files, keeping the group ids exactly as written — `book-signature.ts` targets them by id.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Moujtahid">
  <!-- Order matters: pages sit behind the page lines, which sit behind the M. -->
  <g id="logo-page-left"  fill="#BA934E"><path d="…from _trace-gold.svg, left subpath…"/></g>
  <g id="logo-page-right" fill="#BA934E"><path d="…from _trace-gold.svg, right subpath…"/></g>
  <g id="logo-lines" fill="#246B5D">
    <path d="…page line 1…"/><path d="…page line 2…"/>
    <path d="…page line 3…"/><path d="…page line 4…"/>
  </g>
  <g id="logo-spine" fill="#246B5D"><path d="…narrow centre subpath…"/></g>
  <g id="logo-m" fill="#246B5D"><path d="…outermost subpath…"/></g>
  <g id="logo-drop" fill="#246B5D"><path d="…lowest, smallest subpath…"/></g>
</svg>
```

- [ ] **Step 4: Verify the trace against the original**

Create a scratch HTML file that overlays the SVG on the JPEG at 50% opacity and open it:

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre/site"
cat > /tmp/logo-check.html <<'HTML'
<div style="position:relative;width:500px">
  <img src="/Logo.jpeg" style="width:100%">
  <img src="/logo.svg" style="position:absolute;inset:0;width:100%;opacity:.5">
</div>
HTML
npm run dev
```

Open `http://localhost:4321/` with that markup in a page and confirm the outlines register within a pixel or two. If the M's diagonals are rounded or the drop has vanished, lower `turdSize` and re-run Step 2.

Delete `scripts/_trace-*.svg` once satisfied.

- [ ] **Step 5: Create the Logo component**

Create `site/src/components/brand/Logo.astro`:

```astro
---
interface Props { class?: string; title?: string }
const { class: className = '', title = 'Moujtahid' } = Astro.props;
const svg = await import('../../../public/logo.svg?raw').then((m) => m.default);
---
<span class={className} set:html={svg} data-logo aria-label={title}></span>
```

- [ ] **Step 6: Write the book signature animation**

Create `site/src/components/brand/book-signature.ts`:

```ts
import { loadGsap } from '../../lib/motion';

/**
 * The brand's motion signature. Used EXACTLY TWICE on the whole site
 * (spec §3 / §5.12): once on page load, once on demo-form confirmation.
 * Do not call it anywhere else.
 *
 * Resolves immediately under reduced motion, leaving the mark in its
 * final open state.
 */
export async function playBookSignature(
  root: SVGElement,
  direction: 'open' | 'close-open' = 'open',
): Promise<void> {
  const m = await loadGsap();
  const left = root.querySelector('#logo-page-left');
  const right = root.querySelector('#logo-page-right');
  const lines = root.querySelectorAll('#logo-lines path');

  if (!m || !left || !right) return; // reduced motion: already open in the CSS

  const { gsap } = m;
  // Pages hinge on the spine, so the transform origin is the centre bottom.
  gsap.set([left, right], { transformOrigin: '50% 100%' });

  const tl = gsap.timeline();

  if (direction === 'close-open') {
    tl.to(left,  { rotationY: 85, duration: 0.3, ease: 'power2.in' }, 0)
      .to(right, { rotationY: -85, duration: 0.3, ease: 'power2.in' }, 0)
      .to(lines, { opacity: 0, duration: 0.15 }, 0);
  } else {
    gsap.set(left,  { rotationY: 85 });
    gsap.set(right, { rotationY: -85 });
    gsap.set(lines, { opacity: 0 });
  }

  tl.to([left, right], {
      rotationY: 0,
      duration: 0.6,                                   // --dur-object
      ease: 'cubic-bezier(0.32, 0.72, 0, 1)',          // --ease-move
    })
    .to(lines, { opacity: 1, duration: 0.3, stagger: 0.05 }, '-=0.3');

  await tl.then();
}
```

- [ ] **Step 7: Verify it builds**

Run: `cd site && npx astro build && npx vitest run`
Expected: build succeeds, all tests pass.

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
git add site/scripts/trace-logo.mjs site/public/logo.svg site/public/Logo.jpeg \
        site/src/components/brand/ site/package.json site/package-lock.json
git commit -m "feat(site): vectorise logo into animatable groups, add book signature"
```

---

## Task 7: Timetable component and interaction island

Renders the engine's state as server-side HTML, then attaches drag and keyboard control. The markup is complete and meaningful before any JavaScript runs — that is what lets the hero H1 be the LCP element.

**Files:**
- Create: `site/src/components/timetable/Timetable.astro`
- Create: `site/src/components/timetable/timetable.client.ts`
- Create: `site/src/content/sessions.ts`
- Test: `site/tests/e2e/timetable.spec.ts`
- Create: `site/playwright.config.ts`

**Interfaces:**
- Consumes: `engine.ts` (Task 4), `motion.ts` (Task 5), `tokens.css` + `base.css` (Tasks 1, 3).
- Produces:
  - `DEMO_SESSIONS: Session[]` from `src/content/sessions.ts`
  - `Timetable.astro` with props `{ sessions: Session[]; days?: number; interactive?: boolean; id: string }`
  - Each block rendered as `<button class="tt-block" data-session-id … role="gridcell">`, so it is focusable and announced without extra ARIA plumbing.

- [ ] **Step 1: Define the demo sessions**

Create `site/src/content/sessions.ts`:

```ts
import type { Session } from '../components/timetable/engine';

/**
 * Fictional but plausible Moroccan centre data (spec §7). Subjects follow
 * the real Moroccan curriculum naming. The last two sessions deliberately
 * clash on Salle B — that clash is the hero's load sequence.
 */
export const DEMO_SESSIONS: Session[] = [
  { id: 's1', subject: 'Maths 2BAC SM', room: 'Salle A', teacher: 'M. Alami',   day: 0, start: 0, duration: 2 },
  { id: 's2', subject: 'Physique 1BAC', room: 'Salle C', teacher: 'Mme Idrissi', day: 1, start: 2, duration: 2 },
  { id: 's3', subject: 'Anglais B1',    room: 'Salle A', teacher: 'Mme Benali',  day: 3, start: 0, duration: 2 },
  { id: 's4', subject: 'Maths TCS',     room: 'Salle C', teacher: 'M. Alami',    day: 5, start: 2, duration: 2 },
  { id: 's5', subject: 'Français 1BAC', room: 'Salle B', teacher: 'Mme Haddad',  day: 0, start: 6, duration: 2 },
  { id: 's6', subject: 'SVT 2BAC',      room: 'Salle B', teacher: 'M. Tazi',     day: 0, start: 6, duration: 2 },
];

/** The session the hero's load sequence moves to resolve the clash. */
export const HERO_CONFLICT_SESSION_ID = 's6';
```

- [ ] **Step 2: Write the component**

Create `site/src/components/timetable/Timetable.astro`:

```astro
---
import { DAYS, SLOTS_PER_DAY, slotLabel, detectConflicts, type Session } from './engine';

interface Props {
  sessions: Session[];
  /** Mobile shows three days; desktop six. */
  days?: number;
  interactive?: boolean;
  id: string;
}
const { sessions, days = DAYS.length, interactive = false, id } = Astro.props;
const conflicts = detectConflicts(sessions);
const conflicted = new Set(conflicts.flatMap((c) => c.sessionIds));
const labelFor = (sid: string) =>
  conflicts.find((c) => c.sessionIds.includes(sid))?.label ?? '';
---
<div class="tt" id={id} data-interactive={interactive ? '' : undefined}>
  <div class="tt__grid" role="grid" aria-label="Emploi du temps de la semaine">
    <div class="tt__corner" role="presentation"></div>
    {DAYS.slice(0, days).map((d) => (
      <div class="tt__day caption" role="columnheader">{d}</div>
    ))}

    {Array.from({ length: SLOTS_PER_DAY }, (_, row) => (
      <>
        <div class="tt__time caption data" role="rowheader">
          {row % 2 === 0 ? slotLabel(row) : ''}
        </div>
        {DAYS.slice(0, days).map((_, col) => (
          <div class="tt__cell" role="gridcell" data-day={col} data-slot={row}></div>
        ))}
      </>
    ))}

    {sessions.filter((s) => s.day < days).map((s) => (
      <button
        type="button"
        class="tt-block"
        class:list={[{ 'is-conflicted': conflicted.has(s.id) }]}
        data-session-id={s.id}
        data-day={s.day}
        data-slot={s.start}
        data-duration={s.duration}
        style={`--b-col:${s.day + 2}; --b-row:${s.start + 2}; --b-span:${s.duration};`}
        aria-describedby={conflicted.has(s.id) ? `${id}-c-${s.id}` : undefined}
      >
        <span class="tt-block__subject">{s.subject}</span>
        <span class="tt-block__room caption">{s.room}</span>
        {conflicted.has(s.id) && (
          <span class="tt-block__flag caption" id={`${id}-c-${s.id}`}>
            {labelFor(s.id)}
          </span>
        )}
      </button>
    ))}
  </div>

  <!-- Text equivalent. Required by the spec: every interactive demo needs one. -->
  <p class="visually-hidden" data-tt-status aria-live="polite">
    {conflicts.length === 0
      ? 'Aucun conflit dans le planning.'
      : `${conflicts.length} conflit${conflicts.length > 1 ? 's' : ''} : ${conflicts.map((c) => c.label).join(', ')}`}
  </p>
</div>

<style>
  .tt { container-type: inline-size; }

  .tt__grid {
    display: grid;
    grid-template-columns: auto repeat(var(--tt-days, 6), minmax(0, 1fr));
    grid-auto-rows: var(--slot-h);
    background: var(--chalk);
  }

  .tt__day, .tt__time { color: var(--ink-mute); padding-block: 0.25rem; }
  .tt__time { padding-inline-end: 0.5rem; text-align: end; }

  /* Decorative ruling only — --rule-hair may never carry meaning. */
  .tt__cell { border-block-start: 1px solid var(--rule-hair);
              border-inline-start: 1px solid var(--rule-hair); }

  .tt-block {
    grid-column: var(--b-col);
    grid-row: var(--b-row) / span var(--b-span);
    margin: 2px;
    padding: 0.375rem 0.5rem;
    display: flex; flex-direction: column; gap: 0.125rem;
    text-align: start;
    background: var(--gold);          /* fill only — text on it is --ink */
    color: var(--ink);
    border: 1px solid var(--rule-strong);
    border-radius: var(--r-ui);
    font: inherit;
    cursor: default;
  }

  [data-interactive] .tt-block { cursor: grab; }
  [data-interactive] .tt-block:active { cursor: grabbing; }

  .tt-block.is-lifted { box-shadow: var(--shadow-lift); z-index: 2; }

  /* Conflict: hatch + text label + colour. Never colour alone. */
  .tt-block.is-conflicted {
    border-color: var(--conflict);
    background-image: repeating-linear-gradient(
      45deg, transparent 0 6px, rgb(163 50 31 / 0.22) 6px 12px);
  }
  .tt-block__flag { color: var(--conflict); font-weight: 600; }

  .visually-hidden {
    position: absolute; inline-size: 1px; block-size: 1px;
    overflow: hidden; clip-path: inset(50%); white-space: nowrap;
  }

  @media (max-width: 767px) {
    .tt__grid { --tt-days: 3; }
    .tt { overflow-x: auto; scroll-snap-type: x mandatory; }
  }
</style>
```

- [ ] **Step 3: Write the interaction island**

Create `site/src/components/timetable/timetable.client.ts`:

```ts
import {
  detectConflicts, moveSession, DAYS, SLOTS_PER_DAY, type Session,
} from './engine';

/**
 * Attaches drag and keyboard control to a rendered Timetable.
 * Keyboard is not a fallback — it is the primary path for anyone not using
 * a mouse, and the spec requires it to work identically.
 */
export function attachTimetable(root: HTMLElement, initial: Session[]) {
  let sessions = initial;

  const status = root.querySelector<HTMLElement>('[data-tt-status]')!;
  const blockFor = (id: string) =>
    root.querySelector<HTMLButtonElement>(`[data-session-id="${id}"]`)!;

  function render() {
    const conflicts = detectConflicts(sessions);
    const conflicted = new Set(conflicts.flatMap((c) => c.sessionIds));

    for (const s of sessions) {
      const el = blockFor(s.id);
      el.style.setProperty('--b-col', String(s.day + 2));
      el.style.setProperty('--b-row', String(s.start + 2));
      el.dataset.day = String(s.day);
      el.dataset.slot = String(s.start);
      el.classList.toggle('is-conflicted', conflicted.has(s.id));

      const flag = el.querySelector<HTMLElement>('.tt-block__flag');
      const label = conflicts.find((c) => c.sessionIds.includes(s.id))?.label ?? '';
      if (flag) flag.textContent = label;
    }

    status.textContent = conflicts.length === 0
      ? 'Aucun conflit dans le planning.'
      : `${conflicts.length} conflit${conflicts.length > 1 ? 's' : ''} : ${conflicts.map((c) => c.label).join(', ')}`;
  }

  function move(id: string, day: number, start: number) {
    sessions = moveSession(sessions, id, { day, start });
    render();
    root.dispatchEvent(new CustomEvent('tt:move', { detail: { id, day, start }, bubbles: true }));
  }

  // ---- Keyboard: arrows move the focused block one slot ----------------
  root.addEventListener('keydown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.tt-block');
    if (!el) return;

    const id = el.dataset.sessionId!;
    const s = sessions.find((x) => x.id === id)!;
    const delta: Record<string, [number, number]> = {
      ArrowLeft:  [-1, 0], ArrowRight: [1, 0],
      ArrowUp:    [0, -1], ArrowDown:  [0, 1],
    };
    const d = delta[e.key];
    if (!d) return;

    e.preventDefault();
    move(id, Math.min(Math.max(s.day + d[0], 0), DAYS.length - 1),
             Math.min(Math.max(s.start + d[1], 0), SLOTS_PER_DAY - s.duration));
    el.focus();
  });

  // ---- Pointer drag ----------------------------------------------------
  let dragging: { id: string; el: HTMLElement } | null = null;

  root.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.tt-block');
    if (!el || !root.hasAttribute('data-interactive')) return;
    dragging = { id: el.dataset.sessionId!, el };
    el.classList.add('is-lifted');
    el.setPointerCapture(e.pointerId);
  });

  root.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    const cell = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((n) => (n as HTMLElement).classList?.contains('tt__cell')) as HTMLElement | undefined;

    dragging.el.classList.remove('is-lifted');
    if (cell) move(dragging.id, Number(cell.dataset.day), Number(cell.dataset.slot));
    dragging = null;
  });

  render();
  return { move, get sessions() { return sessions; } };
}
```

- [ ] **Step 4: Configure Playwright**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre/site"
npm install -D @playwright/test @axe-core/playwright
npx playwright install chromium
```

Create `site/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile',  use: { ...devices['Pixel 5'] } },
  ],
});
```

Add to `site/package.json` scripts: `"test:e2e": "playwright test"`.

- [ ] **Step 5: Write the failing e2e test**

Create `site/tests/e2e/timetable.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('hero timetable', () => {
  test('renders every session as server HTML before any JS runs', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('#hero-timetable .tt-block')).toHaveCount(6);
    await expect(page.getByText('Maths 2BAC SM')).toBeVisible();
    await ctx.close();
  });

  test('a conflicted block shows a text label, not just a colour', async ({ page }) => {
    await page.goto('/');
    const flag = page.locator('#hero-timetable .tt-block__flag').first();
    await expect(flag).toHaveText(/occupée|déjà en cours/);
  });

  test('arrow keys move a focused block and update the live status', async ({ page }) => {
    await page.goto('/');
    const block = page.locator('#hero-timetable [data-session-id="s1"]');
    await block.focus();
    const dayBefore = await block.getAttribute('data-day');
    await page.keyboard.press('ArrowRight');
    await expect(block).not.toHaveAttribute('data-day', dayBefore!);
  });

  test('resolving the clash by keyboard clears the conflict announcement', async ({ page }) => {
    await page.goto('/');
    const status = page.locator('#hero-timetable [data-tt-status]');
    await expect(status).toContainText('conflit');
    const block = page.locator('#hero-timetable [data-session-id="s6"]');
    await block.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('Aucun conflit');
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `cd site && npm run build && npx playwright test tests/e2e/timetable.spec.ts`
Expected: FAIL — there is no `/` page yet. Task 8 supplies it.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
git add site/src/components/timetable/ site/src/content/sessions.ts \
        site/playwright.config.ts site/tests/e2e/ site/package.json site/package-lock.json
git commit -m "feat(site): timetable component with keyboard and drag interaction"
```

---

## Task 8: Hero, navigation, footer — the first shippable page

At the end of this task the site is deployable: a real page with a working interactive demo, correct chrome, and a passing accessibility check. Every later task adds a section to working software.

**Files:**
- Create: `site/src/layouts/Base.astro`
- Create: `site/src/components/sections/Nav.astro`
- Create: `site/src/components/sections/Hero.astro`
- Create: `site/src/components/sections/Footer.astro`
- Create: `site/src/pages/index.astro`
- Test: `site/tests/e2e/a11y.spec.ts`, `site/tests/e2e/hero.spec.ts`

**Interfaces:**
- Consumes: `Timetable.astro`, `timetable.client.ts`, `DEMO_SESSIONS`, `HERO_CONFLICT_SESSION_ID`, `Logo.astro`, `playBookSignature`, `motion.ts`, `base.css`.
- Produces: `Base.astro` with props `{ title: string; description: string }`. `index.astro` renders `Nav`, `Hero`, `Footer`.

- [ ] **Step 1: Write the base layout**

Create `site/src/layouts/Base.astro`:

```astro
---
import '../styles/base.css';
interface Props { title: string; description: string }
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="theme-color" content="#246B5D" />
    <link rel="icon" href="/logo.svg" type="image/svg+xml" />
    <link rel="alternate" hreflang="fr-MA" href="https://moujtahide.ma/" />
    <link rel="alternate" hreflang="ar-MA" href="https://moujtahide.ma/ar/" />

    <!-- Applied before first paint so a reduced-motion visitor never sees
         a frame of animation. Inline and tiny by design. -->
    <script is:inline>
      try {
        var stored = localStorage.getItem('moujtahid:motion');
        var reduced = stored ? stored === 'reduced'
          : matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) document.documentElement.dataset.motion = 'reduced';
      } catch (e) {}
    </script>
  </head>
  <body>
    <a class="skip" href="#contenu">Aller au contenu</a>
    <slot />
    <style>
      .skip {
        position: absolute; inset-block-start: -3rem; inset-inline-start: 1rem;
        background: var(--teal); color: #fff; padding: 0.5rem 1rem;
        border-radius: var(--r-control); z-index: 10;
      }
      .skip:focus { inset-block-start: 1rem; }
    </style>
  </body>
</html>
```

- [ ] **Step 2: Write the navigation**

Create `site/src/components/sections/Nav.astro`:

```astro
---
import Logo from '../brand/Logo.astro';
import { applyFrenchTypography as fr } from '../../lib/typography';

const links = [
  { href: '#produit', label: 'Produit' },
  { href: '#parents', label: 'Parents' },
  { href: '#tarifs',  label: 'Tarifs' },
  { href: '#faq',     label: 'FAQ' },
];
---
<header class="nav" data-nav>
  <div class="nav__inner shell">
    <a class="nav__brand" href="/"><Logo class="nav__logo" /><span>Moujtahid</span></a>

    <nav aria-label="Navigation principale">
      <ul class="nav__links">
        {links.map((l) => <li><a href={l.href}>{fr(l.label)}</a></li>)}
        {/* FR / العربية switch slot — phase 2. Reserved, not rendered. */}
      </ul>
    </nav>

    <a class="btn btn--primary" href="#demo">{fr('Demander une démo')}</a>

    <button class="nav__burger" type="button" aria-expanded="false" aria-controls="nav-menu">
      <span class="visually-hidden">Ouvrir le menu</span>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    </button>
  </div>
</header>

<style>
  .nav {
    position: sticky; inset-block-start: 0; z-index: 5;
    background: var(--chalk);
  }
  .nav__inner {
    display: flex; align-items: center; gap: 2rem;
    padding-block: 1rem;
    /* Condense animates transform, never height. */
    transition: transform var(--dur-state) var(--ease-enter);
  }
  .nav[data-condensed] .nav__inner { transform: translateY(-8px); }
  .nav[data-condensed] { border-block-end: 1px solid var(--rule-hair); }

  .nav__brand { display: flex; align-items: center; gap: 0.5rem;
                color: var(--ink); text-decoration: none; font-weight: 600; }
  .nav__logo { inline-size: 32px; }

  .nav__links { display: flex; gap: 1.5rem; list-style: none; padding: 0; }
  .nav__links a { color: var(--ink); text-decoration: none; }
  .nav__links a:hover { color: var(--teal); }

  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    min-block-size: 44px; padding-inline: 1.25rem;
    border-radius: var(--r-control); text-decoration: none; font-weight: 500;
  }
  .btn--primary { background: var(--teal); color: #fff; }
  .btn--secondary { color: var(--teal); border: 1px solid var(--rule-strong); }

  .nav__burger { display: none; background: none; border: 0; color: var(--ink);
                 min-inline-size: 44px; min-block-size: 44px; }

  @media (max-width: 767px) {
    .nav__links { display: none; }
    .nav__burger { display: grid; place-items: center; }
    .nav__inner { gap: 1rem; }
    /* The demo CTA stays in the bar — never hidden behind the menu. */
  }
</style>

<script>
  const nav = document.querySelector('[data-nav]')!;
  const onScroll = () => nav.toggleAttribute('data-condensed', scrollY > 80);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
</script>
```

- [ ] **Step 3: Write the hero**

Create `site/src/components/sections/Hero.astro`:

```astro
---
import Timetable from '../timetable/Timetable.astro';
import { DEMO_SESSIONS } from '../../content/sessions';
import { applyFrenchTypography as fr } from '../../lib/typography';
---
<section class="hero shell" id="contenu">
  <div class="hero__copy prose">
    <!-- LCP element. Deliberately NOT animated: any entrance tween on this
         heading directly delays LCP past the 2.0s budget (spec §6.2). -->
    <h1 class="display-1">{fr('Votre centre organisé en un après-midi.')}</h1>
    <p class="body-lg hero__sub">
      {fr('Planning, présences, paiements et suivi des élèves. Conçu au Maroc, facturé en dirhams.')}
    </p>
    <div class="hero__actions">
      <a class="btn btn--primary" href="#demo">{fr('Demander une démo')}</a>
      <a class="btn btn--secondary" href="#produit">{fr('Voir le produit')}</a>
    </div>
  </div>

  <div class="hero__grid">
    <Timetable id="hero-timetable" sessions={DEMO_SESSIONS} interactive />
  </div>
</section>

<style>
  .hero {
    display: grid; gap: 3rem;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    align-items: start;
  }
  .hero__sub { margin-block-start: 1.5rem; color: var(--ink-mute); }
  .hero__actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-block-start: 2rem; }

  @media (max-width: 899px) {
    .hero { grid-template-columns: minmax(0, 1fr); }
  }
</style>

<script>
  import { attachTimetable } from '../timetable/timetable.client';
  import { DEMO_SESSIONS, HERO_CONFLICT_SESSION_ID } from '../../content/sessions';
  import { loadGsap } from '../../lib/motion';
  import { playBookSignature } from '../brand/book-signature';
  import { findFreeSlot } from '../timetable/engine';

  const root = document.getElementById('hero-timetable')!;
  const api = attachTimetable(root, DEMO_SESSIONS);

  const SEEN = 'moujtahid:hero-played';

  async function playLoadSequence() {
    // Once per session. Repeat visits land on the resolved timetable.
    if (sessionStorage.getItem(SEEN)) return resolveImmediately();

    const m = await loadGsap();
    if (!m) return resolveImmediately();   // reduced motion: final state only

    const { gsap } = m;
    const logo = document.querySelector<SVGElement>('[data-logo] svg');
    const cells = root.querySelectorAll('.tt__cell');
    const blocks = root.querySelectorAll('.tt-block');

    const tl = gsap.timeline({
      onComplete: () => sessionStorage.setItem(SEEN, '1'),
    });

    //   0–600  book opens
    if (logo) tl.add(() => { void playBookSignature(logo, 'open'); }, 0);

    // 250–850  grid draws
    tl.from(cells, {
      opacity: 0, duration: 0.6, stagger: { amount: 0.3, from: 'start' },
      ease: 'cubic-bezier(0,0,0.2,1)',
    }, 0.25);

    // 650–1200 blocks drop into their slots
    tl.from(blocks, {
      opacity: 0, y: -12, duration: 0.3, stagger: 0.05,
      ease: 'cubic-bezier(0,0,0.2,1)',
    }, 0.65);

    // 1200–1600 the clash HOLDS, visible and unmoving
    // 1600–2200 one session moves to a free slot and the conflict clears
    tl.add(() => {
      const slot = findFreeSlot(api.sessions, HERO_CONFLICT_SESSION_ID);
      if (slot) api.move(HERO_CONFLICT_SESSION_ID, slot.day, slot.start);
    }, 1.6);
  }

  function resolveImmediately() {
    const slot = findFreeSlot(api.sessions, HERO_CONFLICT_SESSION_ID);
    if (slot) api.move(HERO_CONFLICT_SESSION_ID, slot.day, slot.start);
  }

  void playLoadSequence();
</script>
```

- [ ] **Step 4: Write the footer**

Create `site/src/components/sections/Footer.astro`:

```astro
---
import { applyFrenchTypography as fr } from '../../lib/typography';
const year = new Date().getFullYear();   // dynamic, never hard-coded
---
<footer class="footer">
  <div class="shell footer__inner">
    <nav class="footer__cols" aria-label="Pied de page">
      <div>
        <h2 class="caption">Produit</h2>
        <ul>
          <li><a href="#produit">Fonctionnalités</a></li>
          <li><a href="#tarifs">Tarifs</a></li>
          <li><a href="#parents">Espace parents</a></li>
        </ul>
      </div>
      <div>
        <h2 class="caption">Légal</h2>
        <ul>
          <li><a href="/confidentialite">Confidentialité</a></li>
          <li><a href="/conditions">Conditions d'utilisation</a></li>
        </ul>
      </div>
    </nav>

    <div class="footer__motion">
      <label>
        <input type="checkbox" data-motion-toggle />
        {fr('Réduire les animations')}
      </label>
    </div>

    <p class="caption footer__legal">© {year} Moujtahid</p>
  </div>
</footer>

<style>
  .footer { background: var(--teal-deep); color: var(--chalk); }
  .footer__inner { display: grid; gap: 2rem; }
  .footer__cols { display: flex; gap: 4rem; flex-wrap: wrap; }
  .footer h2 { color: var(--gold-light); margin-block-end: 0.5rem; }
  .footer ul { list-style: none; padding: 0; display: grid; gap: 0.375rem; }
  .footer a { color: var(--chalk); text-decoration: none; }
  .footer a:hover { text-decoration: underline; }
  .footer label { display: flex; align-items: center; gap: 0.5rem;
                  min-block-size: 44px; cursor: pointer; }
  .footer__legal { color: var(--rule-hair); }
</style>

<script>
  import { prefersReducedMotion, setMotionPreference } from '../../lib/motion';
  const box = document.querySelector<HTMLInputElement>('[data-motion-toggle]')!;
  box.checked = prefersReducedMotion();
  box.addEventListener('change', () => setMotionPreference(box.checked));
</script>
```

**Note on footer links.** `Centre d'aide`, `Contact` and `Statut` are deliberately absent — the spec forbids `#` placeholders. Add them back only when real destinations exist.

- [ ] **Step 5: Write the page**

Create `site/src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/sections/Nav.astro';
import Hero from '../components/sections/Hero.astro';
import Footer from '../components/sections/Footer.astro';
---
<Base
  title="Moujtahid — Gestion de centre de soutien scolaire"
  description="Logiciel marocain de gestion pour centres de soutien scolaire et centres de langues : planning, présences, paiements et suivi des élèves. Facturé en dirhams."
>
  <Nav />
  <main>
    <Hero />
  </main>
  <Footer />
</Base>
```

- [ ] **Step 6: Write the accessibility test**

Create `site/tests/e2e/a11y.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the page has no detectable WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('there is exactly one h1', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
});

test('every interactive control is reachable by keyboard', async ({ page }) => {
  await page.goto('/');
  const reachable: string[] = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    reachable.push(await page.evaluate(() => document.activeElement?.tagName ?? ''));
  }
  expect(reachable).toContain('A');
  expect(reachable).toContain('BUTTON');
});

test('reduced motion prevents GSAP from being requested at all', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const gsapRequests: string[] = [];
  page.on('request', (r) => { if (/gsap/i.test(r.url())) gsapRequests.push(r.url()); });
  await page.goto('/');
  await page.waitForTimeout(2500);
  expect(gsapRequests).toEqual([]);
  await ctx.close();
});

test('touch targets are at least 44px on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  const boxes = await page.locator('a.btn, button').all();
  for (const b of boxes) {
    const box = await b.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }
});
```

- [ ] **Step 7: Run the full suite**

Run: `cd site && npm run build && npx playwright test`
Expected: every test in `timetable.spec.ts` and `a11y.spec.ts` passes. Fix real failures; do not relax assertions.

- [ ] **Step 8: Screenshot and critique at three widths**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre/site"
npx playwright screenshot --viewport-size=390,844   http://localhost:4321 ../screens/hero-390.png
npx playwright screenshot --viewport-size=768,1024  http://localhost:4321 ../screens/hero-768.png
npx playwright screenshot --viewport-size=1440,900  http://localhost:4321 ../screens/hero-1440.png
```

Look at all three before continuing. Check specifically: does the H1 wrap to a ragged shape at 768? Do the timetable's three mobile days read as a timetable or as a list? Is the gold heavy enough against chalk at small sizes? Record what you change.

- [ ] **Step 9: Commit**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
git add site/src/layouts/ site/src/components/sections/ site/src/pages/ site/tests/e2e/
git commit -m "feat(site): hero, nav and footer — first deployable page"
```

---

## Task 9: Content files and the placeholder gate

Turns the spec's seven unresolved `[CONFIRM]` items into one build failure. This must land before any section renders a claim.

**Files:**
- Create: `site/scripts/check-placeholders.mjs`
- Create: `site/src/content/claims.json`, `proof.json`, `pricing.json`, `cities.json`
- Test: `site/tests/unit/placeholders.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PLACEHOLDER` sentinel constant `'__PLACEHOLDER__'`; `findPlaceholders(value: unknown, path?: string): string[]` exported from `scripts/check-placeholders.mjs`.

- [ ] **Step 1: Write the failing test**

Create `site/tests/unit/placeholders.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findPlaceholders, PLACEHOLDER } from '../../scripts/check-placeholders.mjs';

describe('findPlaceholders', () => {
  it('finds a sentinel in a top-level string', () => {
    expect(findPlaceholders({ a: PLACEHOLDER })).toEqual(['a']);
  });

  it('finds sentinels nested in arrays and objects', () => {
    const found = findPlaceholders({
      list: [{ name: 'réel' }, { name: PLACEHOLDER }],
      deep: { x: { y: PLACEHOLDER } },
    });
    expect(found.sort()).toEqual(['deep.x.y', 'list[1].name']);
  });

  it('finds a sentinel embedded in a longer string', () => {
    expect(findPlaceholders({ q: `env. ${PLACEHOLDER} centres` })).toEqual(['q']);
  });

  it('returns nothing for fully resolved content', () => {
    expect(findPlaceholders({ a: 'Casablanca', b: [1, 2], c: null })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd site && npx vitest run tests/unit/placeholders.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the gate**

Create `site/scripts/check-placeholders.mjs`:

```js
/**
 * Spec §7. Every unverified factual claim carries a sentinel. This script runs
 * in `npm run build`, so a placeholder physically cannot reach production.
 *
 * Resolving a claim means replacing the sentinel with the verified value —
 * or deleting the claim. It never means deleting this check.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLACEHOLDER = '__PLACEHOLDER__';

export function findPlaceholders(value, path = '') {
  if (typeof value === 'string') {
    return value.includes(PLACEHOLDER) ? [path] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => findPlaceholders(v, `${path}[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      findPlaceholders(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}

// Only run the scan when invoked directly, so tests can import the function.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/content');
  const problems = [];

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const path of findPlaceholders(data)) problems.push(`${file}: ${path}`);
  }

  if (problems.length) {
    console.error(`\nBuild blocked — ${problems.length} unverified claim(s):\n`);
    for (const p of problems) console.error(`  • ${p}`);
    console.error(
      '\nEach needs a verified value or deletion. See spec §7 for what is ' +
      'outstanding. Do not remove this check to unblock a deploy.\n',
    );
    process.exit(1);
  }
  console.log('Content gate: all claims verified.');
}
```

- [ ] **Step 4: Run it to verify the unit test passes**

Run: `cd site && npx vitest run tests/unit/placeholders.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the content files**

Create `site/src/content/claims.json` — each entry is a spec §7 open question:

```json
{
  "brandSpelling": "__PLACEHOLDER__",
  "debutantPricing": {
    "note": "FAQ says 'gratuite à vie'; pricing table says 189 DH/mois. Pick one.",
    "value": "__PLACEHOLDER__"
  },
  "compliance": {
    "note": "Site cites GDPR. Moroccan directors know law 09-08 and the CNDP. State only what is true.",
    "value": "__PLACEHOLDER__"
  },
  "centreCount": "__PLACEHOLDER__",
  "parentAppArabic": "__PLACEHOLDER__",
  "security": {
    "atRest": "Chiffrement AES-256 au repos",
    "inTransit": "TLS 1.3 en transit",
    "backups": "Sauvegardes nocturnes dans des emplacements séparés",
    "resale": "Aucune revente de données"
  },
  "demoResponseHours": 24
}
```

Create `site/src/content/proof.json`:

```json
{
  "featured": {
    "quote": "__PLACEHOLDER__",
    "name": "__PLACEHOLDER__",
    "role": "__PLACEHOLDER__",
    "centre": "__PLACEHOLDER__",
    "city": "__PLACEHOLDER__",
    "photo": "__PLACEHOLDER__"
  },
  "testimonials": []
}
```

Create `site/src/content/pricing.json` — these figures are confirmed, so no sentinels:

```json
{
  "guarantee": "Remboursement intégral sous 30 jours.",
  "plans": [
    {
      "id": "debutant", "name": "Débutant", "price": 189, "currency": "MAD",
      "period": "mois", "maxStudents": 50,
      "features": ["Jusqu'à 50 élèves", "5 comptes enseignants",
                   "Planning de base", "Présences", "Support par e-mail"],
      "cta": "demo"
    },
    {
      "id": "pro", "name": "Pro", "price": 289, "currency": "MAD",
      "period": "mois", "maxStudents": 300, "popular": true,
      "trialDays": 30,
      "features": ["Jusqu'à 300 élèves", "Enseignants illimités",
                   "Planning intelligent avec détection de conflits",
                   "Paiements et facturation", "Analytique avancée",
                   "Support prioritaire"],
      "cta": "trial"
    },
    {
      "id": "entreprise", "name": "Entreprise", "price": null, "currency": "MAD",
      "period": null, "maxStudents": null,
      "features": ["Élèves et enseignants illimités", "Multi-sites",
                   "Intégrations et API sur mesure",
                   "Gestionnaire de compte dédié", "SLA"],
      "cta": "demo"
    }
  ]
}
```

Create `site/src/content/cities.json` with the full Moroccan city list — the spec explicitly rejects a four-option dropdown. Source it from the official prefecture and province list; at minimum include every city over 50 000 inhabitants:

```json
["Agadir","Al Hoceïma","Azrou","Béni Mellal","Berkane","Berrechid","Casablanca",
 "Dakhla","El Jadida","Errachidia","Essaouira","Fès","Fquih Ben Salah","Guelmim",
 "Ifrane","Kénitra","Khémisset","Khénifra","Khouribga","Laâyoune","Larache",
 "Marrakech","Meknès","Mohammedia","Nador","Ouarzazate","Oued Zem","Oujda",
 "Rabat","Safi","Salé","Sefrou","Settat","Sidi Kacem","Sidi Slimane","Tanger",
 "Tan-Tan","Taourirt","Taroudant","Taza","Témara","Tétouan","Tiflet","Tiznit"]
```

- [ ] **Step 6: Verify the gate blocks the build**

Run: `cd site && npm run build`
Expected: **FAIL** — `Build blocked — 7 unverified claim(s)` listing each path. This is the correct behaviour and proves the gate works.

- [ ] **Step 7: Confirm the gate passes on resolved content**

Temporarily replace one sentinel with a real value and re-run to confirm the count drops, then revert it. The gate must stay red until the client answers the spec §7 questions.

To build locally while claims are open, use `npx astro build` directly — but never wire that into CI or a deploy script.

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/Mehdi/Desktop/Moujtahid/SaaS Centre"
git add site/scripts/check-placeholders.mjs site/src/content/ site/tests/unit/placeholders.test.ts
git commit -m "feat(site): content files behind a build-blocking placeholder gate"
```

---

## Task 10: Proof and testimonials (spec §5.3, §5.9)

Both read `proof.json` and both must disappear cleanly rather than render a sentinel. They are one task because they share a data source and a reviewer would accept or reject them together.

**Files:**
- Create: `site/src/components/sections/Proof.astro`, `Testimonials.astro`
- Create: `site/src/lib/proof.ts`
- Test: `site/tests/unit/proof.test.ts`
- Modify: `site/src/pages/index.astro`

**Interfaces:**
- Consumes: `src/content/proof.json`, `PLACEHOLDER` from `scripts/check-placeholders.mjs`.
- Produces: `isResolved(value: unknown): boolean` and `resolvedTestimonials(data): Testimonial[]` from `src/lib/proof.ts`.

- [ ] **Step 1: Write the failing test**

Create `site/tests/unit/proof.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isResolved, resolvedTestimonials } from '../../src/lib/proof';

const P = '__PLACEHOLDER__';

describe('isResolved', () => {
  it('rejects a bare sentinel', () => expect(isResolved(P)).toBe(false));
  it('rejects a sentinel inside a longer string', () =>
    expect(isResolved(`Centre ${P}`)).toBe(false));
  it('rejects an object with any sentinel field', () =>
    expect(isResolved({ name: 'Réel', city: P })).toBe(false));
  it('accepts fully resolved content', () =>
    expect(isResolved({ name: 'Réel', city: 'Fès' })).toBe(true));
  it('rejects null and empty string', () => {
    expect(isResolved(null)).toBe(false);
    expect(isResolved('')).toBe(false);
  });
});

describe('resolvedTestimonials', () => {
  it('drops unresolved entries and keeps real ones', () => {
    const out = resolvedTestimonials({
      testimonials: [
        { quote: 'Vrai', name: 'A', role: 'R', centre: 'C', city: 'Rabat', photo: '/a.jpg' },
        { quote: P, name: P, role: P, centre: P, city: P, photo: P },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('A');
  });

  it('returns an empty array when nothing is cleared', () => {
    expect(resolvedTestimonials({ testimonials: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd site && npx vitest run tests/unit/proof.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement**

Create `site/src/lib/proof.ts`:

```ts
import { PLACEHOLDER } from '../../scripts/check-placeholders.mjs';

export interface Testimonial {
  quote: string; name: string; role: string;
  centre: string; city: string; photo: string;
}

/** True only when every string in the value is real. Empty is not resolved. */
export function isResolved(value: unknown): boolean {
  if (typeof value === 'string') return value.length > 0 && !value.includes(PLACEHOLDER);
  if (Array.isArray(value)) return value.every(isResolved);
  if (value && typeof value === 'object') return Object.values(value).every(isResolved);
  return false;
}

export function resolvedTestimonials(data: { testimonials?: unknown[] }): Testimonial[] {
  return (data.testimonials ?? []).filter(isResolved) as Testimonial[];
}
```

- [ ] **Step 4: Run it to verify it passes** — `npx vitest run tests/unit/proof.test.ts`, 7 tests PASS.

- [ ] **Step 5: Write the sections**

Create `site/src/components/sections/Proof.astro`:

```astro
---
import proof from '../../content/proof.json';
import { isResolved } from '../../lib/proof';
import { applyFrenchTypography as fr } from '../../lib/typography';
const featured = proof.featured;
const show = isResolved(featured);
---
{show && (
  <section class="proof shell">
    <figure class="proof__fig">
      <img class="proof__photo" src={featured.photo} alt="" width="96" height="96" />
      <blockquote class="proof__quote heading">{fr(`« ${featured.quote} »`)}</blockquote>
      <figcaption class="caption proof__who">
        {featured.name} · {featured.role} · {featured.centre}, {featured.city}
      </figcaption>
    </figure>
  </section>
)}

<style>
  .proof__fig { display: grid; grid-template-columns: auto minmax(0, 1fr);
                gap: 1.5rem 2rem; align-items: start; margin: 0; }
  .proof__photo { grid-row: span 2; inline-size: 96px; block-size: 96px;
                  border-radius: var(--r-ui); object-fit: cover; }
  .proof__quote { margin: 0; max-inline-size: 60ch; }
  .proof__who { color: var(--ink-mute); }
</style>
```

Create `site/src/components/sections/Testimonials.astro`:

```astro
---
import proof from '../../content/proof.json';
import { resolvedTestimonials } from '../../lib/proof';
import { applyFrenchTypography as fr } from '../../lib/typography';
const items = resolvedTestimonials(proof);
---
{items.length > 0 && (
  <section class="tst shell" aria-labelledby="tst-title">
    <h2 class="display-2" id="tst-title">{fr('Les centres qui ont fait le pas')}</h2>

    <div class="tst__stage" data-tst>
      {items.map((t, i) => (
        <figure class="tst__item" data-index={i} hidden={i !== 0}>
          <blockquote class="heading">{fr(`« ${t.quote} »`)}</blockquote>
          <figcaption class="tst__who">
            <img src={t.photo} alt="" width="56" height="56" />
            <span class="caption">{t.name} · {t.role}<br />{t.centre}, {t.city}</span>
          </figcaption>
        </figure>
      ))}

      {items.length > 1 && (
        <div class="tst__nav">
          <button type="button" data-tst-prev aria-label="Témoignage précédent">←</button>
          <span class="caption data" data-tst-count>1 / {items.length}</span>
          <button type="button" data-tst-next aria-label="Témoignage suivant">→</button>
        </div>
      )}
    </div>
  </section>
)}

<style>
  .tst__stage { margin-block-start: 2rem; }
  .tst__item { margin: 0; display: grid; gap: 1.5rem; max-inline-size: 62ch; }
  .tst__who { display: flex; align-items: center; gap: 0.75rem; color: var(--ink-mute); }
  .tst__who img { border-radius: var(--r-ui); }
  .tst__nav { display: flex; align-items: center; gap: 1rem; margin-block-start: 2rem; }
  .tst__nav button { min-inline-size: 44px; min-block-size: 44px;
                     border: 1px solid var(--rule-strong); border-radius: var(--r-control);
                     background: none; color: var(--ink); font-size: 1.125rem; }
</style>

<script>
  const stage = document.querySelector<HTMLElement>('[data-tst]');
  if (stage) {
    const items = [...stage.querySelectorAll<HTMLElement>('.tst__item')];
    const count = stage.querySelector<HTMLElement>('[data-tst-count]');
    let i = 0;
    const show = (next: number) => {
      i = (next + items.length) % items.length;
      items.forEach((el, n) => { el.hidden = n !== i; });
      if (count) count.textContent = `${i + 1} / ${items.length}`;
    };
    stage.querySelector('[data-tst-prev]')?.addEventListener('click', () => show(i - 1));
    stage.querySelector('[data-tst-next]')?.addEventListener('click', () => show(i + 1));
  }
</script>
```

- [ ] **Step 6: Add both to the page**

In `site/src/pages/index.astro`, import and place `<Proof />` after `<Hero />` and `<Testimonials />` before the pricing slot.

- [ ] **Step 7: Verify both vanish while unresolved**

Run: `cd site && npx astro build && npx playwright test tests/e2e/a11y.spec.ts`
Expected: the page builds, contains no `__PLACEHOLDER__` text, and still has exactly one h1. Confirm with:
`grep -r "__PLACEHOLDER__" dist/ && echo "LEAK" || echo "clean"` → `clean`.

- [ ] **Step 8: Commit**

```bash
git add site/src/lib/proof.ts site/src/components/sections/Proof.astro \
        site/src/components/sections/Testimonials.astro site/tests/unit/proof.test.ts \
        site/src/pages/index.astro
git commit -m "feat(site): proof and testimonials, hidden until claims are cleared"
```

---

## Task 11: Before — the centre as it runs today (spec §5.4)

Four hand-drawn SVG objects that start off-grid and file into slots on scroll. The grid forming is the argument; do not reduce this to four cards.

**Files:**
- Create: `site/src/components/sections/Before.astro`
- Create: `site/src/components/illustrations/` — `Cahier.astro`, `Recus.astro`, `Chat.astro`, `Tableur.astro`
- Modify: `site/src/pages/index.astro`

**Interfaces:**
- Consumes: `loadGsap`, `withWillChange` from `motion.ts`.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Draw the four objects**

Each illustration is a flat vector in brand colours, no photo, no AI imagery, roughly 160×200 in a `0 0 160 200` viewBox. Draw them as literal objects a Moroccan centre owns:

- `Cahier.astro` — a ruled attendance page: `--chalk` ground, `--rule-hair` horizontal rules, a column of `--teal` tick marks, two `--absence` hollow circles.
- `Recus.astro` — a receipt book: two stacked leaves offset by 4px, the lower one `--rule-hair` to read as carbon, a `--gold` stub down the binding edge.
- `Chat.astro` — a generic message thread: three alternating bubbles, `--rule-hair` and `--teal` at 12% tint. **No WhatsApp green, no branding, no logo.**
- `Tableur.astro` — a spreadsheet fragment: a 4×6 cell grid in `--rule-hair`, one cell filled `--conflict` at 20% with a diagonal hatch, matching the conflict treatment used in the timetable.

Each file is a bare `<svg>` with `role="img"` and an `aria-label` naming the object in French, e.g. `aria-label="Cahier de présence papier"`.

- [ ] **Step 2: Write the section**

Create `site/src/components/sections/Before.astro`:

```astro
---
import Cahier from '../illustrations/Cahier.astro';
import Recus from '../illustrations/Recus.astro';
import Chat from '../illustrations/Chat.astro';
import Tableur from '../illustrations/Tableur.astro';
import { applyFrenchTypography as fr } from '../../lib/typography';

const modules = ['Présences', 'Paiements', 'Messages', 'Analytique'];
---
<section class="before shell" aria-labelledby="before-title" data-before>
  <h2 class="display-2" id="before-title">{fr('Ce que votre centre utilise aujourd\'hui')}</h2>

  <div class="before__objects">
    <div class="before__obj" data-obj="0"><Cahier /></div>
    <div class="before__obj" data-obj="1"><Recus /></div>
    <div class="before__obj" data-obj="2"><Chat /></div>
    <div class="before__obj" data-obj="3"><Tableur /></div>
  </div>

  <div class="before__slots grid-module" data-slots>
    {modules.map((m, i) => (
      <div class="before__slot" data-slot={i}>
        <span class="caption">{fr(m)}</span>
      </div>
    ))}
  </div>
</section>

<style>
  .before__objects { display: flex; gap: 2rem; flex-wrap: wrap;
                     margin-block: 3rem; justify-content: center; }
  /* Deliberately loose: each object sits a degree or two off true, outside
     the grid. The scroll animation is what files them in. */
  .before__obj:nth-child(1) { transform: rotate(-2deg); }
  .before__obj:nth-child(2) { transform: rotate(1.5deg) translateY(12px); }
  .before__obj:nth-child(3) { transform: rotate(-1deg) translateY(-8px); }
  .before__obj:nth-child(4) { transform: rotate(2deg); }

  .before__slots { grid-template-columns: repeat(4, minmax(0, 1fr));
                   grid-auto-rows: calc(var(--slot-h) * 3); }
  .before__slot { border: 1px solid var(--rule-hair); border-radius: var(--r-grid);
                  display: grid; place-items: center; color: var(--ink-mute); }

  /* Reduced motion: objects and slots simply sit side by side, already filed. */
  :root[data-motion='reduced'] .before__obj { transform: none; }
</style>

<script>
  import { loadGsap, withWillChange } from '../../lib/motion';

  const section = document.querySelector<HTMLElement>('[data-before]');
  if (section) {
    void (async () => {
      const m = await loadGsap();
      if (!m) return;                       // final state is already in the CSS
      const { gsap, ScrollTrigger, Flip } = m;
      const objects = [...section.querySelectorAll<HTMLElement>('.before__obj')];
      const slots = [...section.querySelectorAll<HTMLElement>('.before__slot')];

      ScrollTrigger.create({
        trigger: section,
        start: 'top 65%',
        once: true,
        ...withWillChange(section, 'transform'),
        onEnter: () => {
          objects.forEach((obj, i) => {
            const state = Flip.getState(obj);
            slots[i].appendChild(obj);
            Flip.from(state, {
              duration: 0.6,                                  // --dur-object
              delay: i * 0.12,
              ease: 'cubic-bezier(0.32,0.72,0,1)',            // --ease-move
              rotate: true,
              onComplete: () => gsap.to(obj, { opacity: 0.15, duration: 0.3 }),
            });
          });
        },
      });
    })();
  }
</script>
```

- [ ] **Step 3: Verify and screenshot**

Run: `cd site && npm run dev`, scroll the section, then capture 390/768/1440. Confirm the objects genuinely start off-grid and the grid only reads as a grid after they land. If it looks like four cards animating, the illustration rotations are too subtle — increase them.

Also confirm with reduced motion forced on that all four objects and all four slots are visible and legible in their final state.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/illustrations/ site/src/components/sections/Before.astro \
        site/src/pages/index.astro
git commit -m "feat(site): before section — paper objects file into the grid"
```

---

## Task 12: Product tour (spec §5.5) — pinned section 1 of 2

**Files:**
- Create: `site/src/components/sections/Tour.astro`
- Create: `site/src/components/tour/ProductFrame.astro`
- Modify: `site/src/pages/index.astro`

**Interfaces:**
- Consumes: `Timetable.astro`, `DEMO_SESSIONS`, `formatDirhams`, `loadGsap`.
- Produces: nothing other tasks depend on.

**Hard constraints for this task:** the pin is exactly 2 viewport heights, scrubbed 1:1, and is created only above 900px. Mobile gets no pin at all.

- [ ] **Step 1: Build the product frame**

`ProductFrame.astro` renders one coded application frame with five mutually exclusive chapter panels, all present in the HTML, `hidden` except the first:

```astro
---
import Timetable from '../timetable/Timetable.astro';
import { DEMO_SESSIONS } from '../../content/sessions';
import { formatDirhams, applyFrenchTypography as fr } from '../../lib/typography';
---
<div class="frame" data-frame>
  <div class="frame__chrome caption">Moujtahid — Centre Al Massira, Casablanca</div>

  <section class="frame__panel" data-chapter="0">
    <Timetable id="tour-timetable" sessions={DEMO_SESSIONS} />
  </section>

  <section class="frame__panel" data-chapter="1" hidden>
    <ul class="roll">
      <li><span>Yasmine B.</span><button type="button" class="pill pill--ok">Présent</button></li>
      <li><span>Omar T.</span><button type="button" class="pill pill--absent" data-absent>Absent</button></li>
      <li><span>Salma R.</span><button type="button" class="pill pill--ok">Présent</button></li>
    </ul>
    <div class="sms" data-sms hidden>
      <p class="caption">{fr('SMS envoyé à la mère d\'Omar : « Omar était absent au cours de Maths 2BAC SM aujourd\'hui. »')}</p>
    </div>
  </section>

  <section class="frame__panel" data-chapter="2" hidden>
    <div class="invoice" data-invoice>
      <span class="caption">Reçu n° 2418 — Omar T.</span>
      <span class="data invoice__amount">{formatDirhams(450)}</span>
      <span class="pill pill--ok" data-paid hidden>Payé</span>
    </div>
    <p class="body">Encaissé ce mois-ci :
      <strong class="data" data-mad-total>{formatDirhams(102790)}</strong></p>
    <p class="caption">Impayés : <span class="data" data-unpaid>7</span></p>
  </section>

  <section class="frame__panel" data-chapter="3" hidden>
    <ol class="grades">
      <li><span>Yasmine B.</span><span class="data">16,5/20</span></li>
      <li data-needs-help><span>Omar T.</span><span class="data">9,5/20</span>
          <span class="caption">Suivi recommandé</span></li>
      <li><span>Salma R.</span><span class="data">14/20</span></li>
    </ol>
  </section>

  <section class="frame__panel" data-chapter="4" hidden>
    <div class="branches">
      {['Casablanca', 'Rabat', 'Marrakech'].map((c, i) => (
        <button type="button" class="branch" data-branch={i} aria-pressed={i === 0}>{c}</button>
      ))}
    </div>
    <p class="body" data-branch-detail>Centre Al Massira, Casablanca — 248 élèves inscrits.</p>
  </section>
</div>
```

Style the frame with `--r-ui` (it is product UI), a `--rule-strong` border, and `--chalk` ground. Status pills use `--ok` / `--absence` with their text labels, never colour alone.

- [ ] **Step 2: Write the tour section with the pin**

`Tour.astro` renders a chapter list (plain numerals + filled/hollow markers — never `01/02/03`) beside `<ProductFrame />`, then:

```astro
<script>
  import { loadGsap, withWillChange } from '../../lib/motion';

  const section = document.querySelector<HTMLElement>('[data-tour]');
  const DESKTOP = matchMedia('(min-width: 900px)');

  function setChapter(n: number) {
    document.querySelectorAll<HTMLElement>('[data-chapter]')
      .forEach((p) => { p.hidden = Number(p.dataset.chapter) !== n; });
    document.querySelectorAll<HTMLElement>('[data-chapter-link]')
      .forEach((l) => l.setAttribute('aria-current',
        String(Number(l.dataset.chapterLink) === n)));
    section?.dispatchEvent(new CustomEvent('tour:chapter', { detail: { n }, bubbles: true }));
  }

  if (section) {
    void (async () => {
      // No pinning on mobile — ever. Each chapter is a tap-through instead.
      if (!DESKTOP.matches) return setupTapThrough();

      const m = await loadGsap();
      if (!m) return setupTapThrough();     // reduced motion: all five, stacked
      const { ScrollTrigger } = m;

      ScrollTrigger.create({
        trigger: section,
        pin: true,
        start: 'top top',
        end: '+=200%',                      // exactly two viewport heights
        scrub: true,                        // 1:1 — never a number, which adds lag
        ...withWillChange(section, 'transform'),
        onUpdate: (self) => setChapter(Math.min(4, Math.floor(self.progress * 5))),
      });
    })();
  }

  function setupTapThrough() {
    document.querySelectorAll<HTMLElement>('[data-chapter-link]')
      .forEach((l) => l.addEventListener('click', () =>
        setChapter(Number(l.dataset.chapterLink))));
  }
</script>
```

- [ ] **Step 3: Add the chapter-specific state changes**

Each chapter's transition fires when it becomes active:

- **Chapter 2** — reveal `[data-sms]` and tween it from the frame toward the phone edge over `0.9s` with `--ease-move`.
- **Chapter 3** — reveal `[data-paid]`, then tween `[data-mad-total]` from `102 790 DH` to `103 240 DH` and `[data-unpaid]` from `7` to `6`. **This is the only number transition on the site.** Use `gsap.to({v}, { v: 103240, onUpdate })` re-formatting through `formatDirhams` each frame so the thousands separator stays correct.
- **Chapter 4** — add a `--rule-strong` marker to `[data-needs-help]`.
- **Chapter 5** — wire the branch buttons to swap `[data-branch-detail]` text. No country map.

- [ ] **Step 4: Verify the pin behaves**

Run `npm run dev` and check, at 1440: scrolling up leaves the section immediately; there is no momentum; the pin releases after exactly two viewport heights. At 390: confirm `ScrollTrigger.getAll()` is empty for this section and the chapter links work as taps.

Add to `tests/e2e/tour.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('mobile never pins the tour', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  const pinned = await page.evaluate(() =>
    document.querySelectorAll('.pin-spacer').length);
  expect(pinned).toBe(0);
});

test('every chapter is reachable without a mouse', async ({ page }) => {
  await page.goto('/');
  for (let n = 0; n < 5; n++) {
    await page.locator(`[data-chapter-link="${n}"]`).click();
    await expect(page.locator(`[data-chapter="${n}"]`)).toBeVisible();
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add site/src/components/tour/ site/src/components/sections/Tour.astro \
        site/tests/e2e/tour.spec.ts site/src/pages/index.astro
git commit -m "feat(site): pinned product tour, five chapters, no mobile pin"
```

---

## Task 13: Risk score (spec §5.6) — pinned section 2 of 2

**This is the last pin permitted on the site.** Any later section that wants pinning is a spec violation.

**Files:**
- Create: `site/src/components/sections/Risk.astro`
- Create: `site/src/lib/risk.ts`
- Test: `site/tests/unit/risk.test.ts`

**Interfaces:**
- Produces: `WEIGHTS: Record<RiskInput, number>`, `computeRisk(values: Record<RiskInput, number>): number`, `RISK_TIMELINE: RiskEvent[]` from `src/lib/risk.ts`.

- [ ] **Step 1: Write the failing test**

Create `site/tests/unit/risk.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { WEIGHTS, computeRisk, RISK_TIMELINE } from '../../src/lib/risk';

describe('WEIGHTS', () => {
  it('matches the spec exactly and sums to 100', () => {
    expect(WEIGHTS).toEqual({
      assiduite: 25, paiements: 25, resultats: 25, engagement: 15, comportement: 10,
    });
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('computeRisk', () => {
  const all = (v: number) => ({
    assiduite: v, paiements: v, resultats: v, engagement: v, comportement: v,
  });

  it('is 0 when every input is healthy', () => expect(computeRisk(all(0))).toBe(0));
  it('is 100 when every input is at maximum concern', () => expect(computeRisk(all(1))).toBe(100));

  it('weights attendance more heavily than behaviour', () => {
    const a = computeRisk({ ...all(0), assiduite: 1 });
    const b = computeRisk({ ...all(0), comportement: 1 });
    expect(a).toBeGreaterThan(b);
    expect(a).toBe(25);
    expect(b).toBe(10);
  });

  it('rounds to a whole percent', () => {
    expect(Number.isInteger(computeRisk({ ...all(0), engagement: 0.333 }))).toBe(true);
  });
});

describe('RISK_TIMELINE', () => {
  it('climbs to 87 then recovers below 50', () => {
    const scores = RISK_TIMELINE.map((e) => computeRisk(e.values));
    expect(Math.max(...scores)).toBe(87);
    expect(scores.at(-1)).toBeLessThan(50);
  });

  it('ends with an intervention, not an alert', () => {
    expect(RISK_TIMELINE.at(-1)!.label).toMatch(/assiduité|remonte|suivi/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails.** Then implement `src/lib/risk.ts`:

```ts
export type RiskInput = 'assiduite' | 'paiements' | 'resultats' | 'engagement' | 'comportement';

/** Spec §1. These weights are the product's, not a design choice. */
export const WEIGHTS: Record<RiskInput, number> = {
  assiduite: 25, paiements: 25, resultats: 25, engagement: 15, comportement: 10,
};

/** Each value is 0 (healthy) to 1 (maximum concern). Returns a whole percent. */
export function computeRisk(values: Record<RiskInput, number>): number {
  const total = (Object.keys(WEIGHTS) as RiskInput[])
    .reduce((sum, k) => sum + WEIGHTS[k] * values[k], 0);
  return Math.round(total);
}

export interface RiskEvent { label: string; values: Record<RiskInput, number> }

/**
 * The narrative: concern accumulates to 87%, the centre intervenes, and the
 * score comes back down. The recovery is the point — the feature is early
 * care, not surveillance (spec §5.6).
 */
export const RISK_TIMELINE: RiskEvent[] = [
  { label: 'Situation de départ',
    values: { assiduite: 0.1, paiements: 0, resultats: 0.2, engagement: 0.2, comportement: 0.1 } },
  { label: 'Deux absences non justifiées',
    values: { assiduite: 0.7, paiements: 0, resultats: 0.2, engagement: 0.3, comportement: 0.1 } },
  { label: 'Retard de paiement',
    values: { assiduite: 0.7, paiements: 0.9, resultats: 0.3, engagement: 0.4, comportement: 0.2 } },
  { label: 'Moyenne en baisse',
    values: { assiduite: 1, paiements: 1, resultats: 0.9, engagement: 0.6, comportement: 0.55 } },
  { label: 'Appel au parent, assiduité remonte',
    values: { assiduite: 0.2, paiements: 0.35, resultats: 0.7, engagement: 0.4, comportement: 0.35 } },
];
```

The two figures the spec fixes are arrived at exactly, not approximately:

- **Peak, 87 %** — `25(1) + 25(1) + 25(0.9) + 15(0.6) + 10(0.55)` = `25 + 25 + 22.5 + 9 + 5.5` = **87.0**
- **Recovery, 41 %** — `25(0.2) + 25(0.35) + 25(0.7) + 15(0.4) + 10(0.35)` = `5 + 8.75 + 17.5 + 6 + 3.5` = `40.75` → **41**

Neither relies on a rounding tie, so the test is stable. If you change any value, recompute both — the spec's 87 % is fixed and the test enforces it.

- [ ] **Step 3: Build the section**

`Risk.astro` renders five labelled input bars (each showing its weight as text — `25 %`, not just a bar length), one gauge, and the alert text. The student is labelled « élève fictif » in visible body text, not a tooltip.

The gauge is an SVG arc animated with `strokeDashoffset` via DrawSVG. The numeric percentage is always rendered as text beside it, so the gauge is never the only carrier of the value.

Desktop: `ScrollTrigger` with `scrub: true`, `end: '+=200%'`, `pin: true`. Mobile: plays once on entry via `IntersectionObserver`, with a « Rejouer » button.

Reduced motion: render all five timeline steps as a static three-panel diagram — start, 87 % alert, 41 % after the call.

- [ ] **Step 4: Verify** the arithmetic test passes, the gauge value is readable as text, and reduced motion shows the full story statically.

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/risk.ts site/src/components/sections/Risk.astro \
        site/tests/unit/risk.test.ts site/src/pages/index.astro
git commit -m "feat(site): risk score with recovery narrative"
```

---

## Task 14: Parents (spec §5.7)

**Files:** Create `site/src/components/sections/Parents.astro`, `site/src/components/parents/PhoneFrame.astro`.

A coded phone frame — never a photo mockup, never a laptop-on-desk. Four screens swapped with the View Transitions API where supported, falling back to an instant swap:

```ts
function showScreen(n: number) {
  const swap = () => {
    screens.forEach((s, i) => { s.hidden = i !== n; });
    tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === n)));
  };
  if (document.startViewTransition && !prefersReducedMotion()) {
    document.startViewTransition(swap);
  } else {
    swap();
  }
}
```

Screens: the `16,5/20` average (via `formatGrade`), the next class, payment history, an alert. Screen switching uses real `role="tab"` / `role="tabpanel"` markup so it is keyboard-operable and announced.

Copy for directors: « Moins d'appels au secrétariat. » Copy for parents: one line of reassurance. **Do not claim Arabic availability** — `claims.json.parentAppArabic` is unresolved.

- [ ] **Step 1:** Build the component with real tab semantics.
- [ ] **Step 2:** Verify with `npx playwright test tests/e2e/a11y.spec.ts` — axe must report no violations for the tablist.
- [ ] **Step 3:** Commit — `git commit -m "feat(site): parents section with coded phone frame"`.

---

## Task 15: Onboarding (spec §5.8)

**Files:** Create `site/src/components/sections/Onboarding.astro`.

A horizontal timeline from 14:00 to 17:00 with three steps at illustrative times. A real sequence, so ordinal numbering is earned — but plain numerals, never `01/02/03`.

The section background interpolates between two chalk variants as it scrolls, representing the afternoon passing. This is the one non-data-driven effect on the site and it is deliberate.

```ts
ScrollTrigger.create({
  trigger: section, start: 'top bottom', end: 'bottom top', scrub: true,
  onUpdate: (self) => {
    // Animating a custom property, not a layout property — permitted.
    section.style.setProperty('--afternoon', String(self.progress));
  },
});
```

```css
[data-onboarding] {
  --afternoon: 0;
  background: color-mix(in oklab,
    var(--chalk) calc((1 - var(--afternoon)) * 100%),
    #EDE7DA calc(var(--afternoon) * 100%));
}
/* Reduced motion: fix the value mid-afternoon. */
:root[data-motion='reduced'] [data-onboarding] { --afternoon: 0.5; }
```

Copy must include « Migration gratuite sur les formules payantes. »

- [ ] **Step 1:** Build it. - [ ] **Step 2:** Verify the reduced-motion value is fixed, not animating. - [ ] **Step 3:** Commit.

---

## Task 16: Pricing (spec §5.10)

**Files:**
- Create: `site/src/lib/pricing.ts`, `site/src/components/sections/Pricing.astro`
- Test: `site/tests/unit/pricing.test.ts`, `site/tests/e2e/pricing.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { recommendPlan } from '../../src/lib/pricing';

describe('recommendPlan', () => {
  it.each([
    [1, 'debutant'], [50, 'debutant'],
    [51, 'pro'], [180, 'pro'], [300, 'pro'],
    [301, 'entreprise'], [5000, 'entreprise'],
  ])('%i students -> %s', (n, plan) => expect(recommendPlan(n)).toBe(plan));

  it('treats zero and negatives as the smallest plan rather than throwing', () => {
    expect(recommendPlan(0)).toBe('debutant');
    expect(recommendPlan(-5)).toBe('debutant');
  });
});
```

- [ ] **Step 2: Run to verify it fails.** Then implement:

```ts
export type PlanId = 'debutant' | 'pro' | 'entreprise';

/** Spec §5.10: <=50 Débutant, 51–300 Pro, >300 Entreprise. */
export function recommendPlan(students: number): PlanId {
  if (students <= 50) return 'debutant';
  if (students <= 300) return 'pro';
  return 'entreprise';
}
```

- [ ] **Step 3: Build the section.** A `<input type="range">` and a linked `<input type="number">`, both labelled « Combien d'élèves dans votre centre ? », driving the focused card.

Focus is expressed through edge treatment, not a shadow swap:

```css
.plan { border: 1px solid var(--rule-hair); border-radius: var(--r-ui);
        opacity: 0.6; transform: scale(0.98);
        transition: opacity var(--dur-state) var(--ease-enter),
                    transform var(--dur-state) var(--ease-enter); }
.plan[data-focused] { opacity: 1; transform: none;
                      border: 1px solid var(--rule-strong);
                      border-radius: var(--r-grid); }   /* square plate edge */
```

The recommendation is announced, not just shown: an `aria-live="polite"` region reads « Formule recommandée : Pro ». Prices come from `pricing.json` and run through `formatDirhams`. The guarantee appears exactly once. **Do not invent annual pricing.**

- [ ] **Step 4: Write the e2e test**

```ts
import { test, expect } from '@playwright/test';

test('the slider changes the recommended plan', async ({ page }) => {
  await page.goto('/#tarifs');
  const number = page.locator('[data-student-count]');
  await number.fill('40');
  await expect(page.locator('[data-plan="debutant"]')).toHaveAttribute('data-focused', '');
  await number.fill('180');
  await expect(page.locator('[data-plan="pro"]')).toHaveAttribute('data-focused', '');
  await number.fill('900');
  await expect(page.locator('[data-plan="entreprise"]')).toHaveAttribute('data-focused', '');
});

test('the recommendation is announced to screen readers', async ({ page }) => {
  await page.goto('/#tarifs');
  await page.locator('[data-student-count]').fill('180');
  await expect(page.locator('[aria-live="polite"]')).toContainText('Pro');
});
```

- [ ] **Step 5: Commit** — `git commit -m "feat(site): pricing with student-count recommendation"`.

---

## Task 17: FAQ (spec §5.11)

**Files:** Create `site/src/components/sections/Faq.astro`.

Native `<details>` elements so keyboard and screen-reader behaviour is correct by default, with the height animation via the one permitted exception:

```css
.faq__panel { display: grid; grid-template-rows: 0fr;
              transition: grid-template-rows var(--dur-state) var(--ease-enter); }
details[open] .faq__panel { grid-template-rows: 1fr; }
.faq__panel > div { overflow: hidden; }
```

Each `<details>` gets a stable id (`#faq-securite`, `#faq-migration`, `#faq-demarrage`, `#faq-mobile`, `#faq-essai`, `#faq-limites`) and a script opens the one matching `location.hash` on load.

Questions are the current site's, rewritten plainly. **The security answer must not state a compliance framework** until `claims.json.compliance` is resolved — write the AES-256 / TLS 1.3 / backups facts, which are confirmed, and omit the GDPR sentence.

Add `FAQPage` JSON-LD generated from the same array that renders the markup, so the two can never drift.

- [ ] **Step 1:** Build it. - [ ] **Step 2:** Verify deep-linking and validate the JSON-LD at `validator.schema.org`. - [ ] **Step 3:** Commit.

---

## Task 18: Demo request form (spec §5.12)

**Files:**
- Create: `site/src/lib/phone.ts`, `site/src/components/sections/DemoForm.astro`
- Test: `site/tests/unit/phone.test.ts`, `site/tests/e2e/demo-form.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { normaliseMoroccanPhone } from '../../src/lib/phone';

describe('normaliseMoroccanPhone', () => {
  it.each([
    ['+212612345678', '+212612345678'],
    ['0612345678',    '+212612345678'],
    ['06 12 34 56 78','+212612345678'],
    ['+212 7 12 34 56 78', '+212712345678'],
    ['00212612345678', '+212612345678'],
  ])('normalises %s', (input, expected) => {
    const r = normaliseMoroccanPhone(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.e164).toBe(expected);
  });

  it('rejects a landline-length number that is too short', () => {
    const r = normaliseMoroccanPhone('06123');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/chiffres/);
  });

  it('rejects a non-Moroccan prefix with a specific message', () => {
    const r = normaliseMoroccanPhone('+33612345678');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('+212');
  });

  it('rejects an empty value', () => {
    expect(normaliseMoroccanPhone('').ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails.** Then implement:

```ts
export type PhoneResult =
  | { ok: true; e164: string }
  | { ok: false; error: string };

/**
 * Moroccan mobile numbers: +212 followed by 6 or 7 and eight more digits.
 * Errors are specific — the spec forbids « Champ invalide ».
 */
export function normaliseMoroccanPhone(input: string): PhoneResult {
  const digits = input.replace(/[\s.\-()]/g, '');
  if (!digits) return { ok: false, error: 'Entrez un numéro de téléphone.' };

  let national: string;
  if (digits.startsWith('+212')) national = digits.slice(4);
  else if (digits.startsWith('00212')) national = digits.slice(5);
  else if (digits.startsWith('0')) national = digits.slice(1);
  else if (digits.startsWith('+')) {
    return { ok: false, error: 'Le numéro doit commencer par +212.' };
  } else national = digits;

  if (!/^\d+$/.test(national)) {
    return { ok: false, error: 'Le numéro ne doit contenir que des chiffres.' };
  }
  if (national.length !== 9) {
    return { ok: false, error: 'Le numéro doit contenir 9 chiffres après +212.' };
  }
  if (!/^[67]/.test(national)) {
    return { ok: false, error: 'Le numéro de mobile doit commencer par 6 ou 7.' };
  }
  return { ok: true, e164: `+212${national}` };
}
```

- [ ] **Step 3: Build the three-step form.**

Step 1 centre name + city (a `<datalist>` over the full `cities.json`, searchable). Step 2 centre size. Step 3 name, phone, and a « joignable sur WhatsApp » checkbox.

Every step is a real `<fieldset>` with a `<legend>`; progress is announced via `aria-live`. Errors render in a `role="alert"` beside the field and the field gets `aria-invalid` and `aria-describedby`. Validation runs on blur and on submit, never on every keystroke.

On success, call `playBookSignature(logo, 'close-open')` — **the second and final use of the signature** — and show « Demande envoyée. Nous vous appelons sous 24 h. »

- [ ] **Step 4: Write the e2e test**

```ts
import { test, expect } from '@playwright/test';

test('a bad phone number produces a specific error, not a generic one', async ({ page }) => {
  await page.goto('/#demo');
  await page.locator('[name="centre"]').fill('Centre Al Massira');
  await page.locator('[name="city"]').fill('Casablanca');
  await page.locator('[data-next]').click();
  await page.locator('[name="size"]').fill('180');
  await page.locator('[data-next]').click();
  await page.locator('[name="phone"]').fill('+33612345678');
  await page.locator('[data-submit]').click();
  await expect(page.locator('[role="alert"]')).toContainText('+212');
  await expect(page.locator('[role="alert"]')).not.toContainText('invalide');
});

test('the whole form is completable by keyboard alone', async ({ page }) => {
  await page.goto('/#demo');
  await page.keyboard.press('Tab');
  // Walk the form using only Tab and typing; assert the confirmation appears.
  // ...fill each field via page.keyboard.type after tabbing to it...
  await expect(page.locator('[data-confirmation]')).toContainText('24');
});

test('the city list is not limited to a handful of options', async ({ page }) => {
  await page.goto('/#demo');
  const options = await page.locator('#cities option').count();
  expect(options).toBeGreaterThan(30);
});
```

- [ ] **Step 5: Commit** — `git commit -m "feat(site): three-step demo form with +212 validation"`.

---

## Task 19: SEO, structured data, and the OG image

**Files:** Modify `site/src/layouts/Base.astro`; create `site/src/components/Schema.astro`, `site/scripts/make-og.mjs`.

- [ ] **Step 1: Add SoftwareApplication schema** generated from `pricing.json`, one `Offer` per plan in MAD. Entreprise has no price, so it carries `"price": null` omitted and only `priceCurrency` plus `availability` — do not invent a figure.

- [ ] **Step 2: Add FAQPage schema** (Task 17 supplies the array).

- [ ] **Step 3: Generate the OG image** at 1200×630 from the hero timetable by screenshotting a dedicated `/og` route with Playwright, then delete the route from the final build output.

```js
// scripts/make-og.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto('http://localhost:4321/og');
await page.screenshot({ path: 'public/og.png' });
await browser.close();
```

- [ ] **Step 4: Add the meta tags** — `og:title`, `og:description`, `og:image`, `og:locale` `fr_MA`, `twitter:card` `summary_large_image`.

- [ ] **Step 5: Verify** with `validator.schema.org` and a link preview debugger. Commit.

---

## Task 20: QA pass (spec §11)

**Files:** Create `site/lighthouserc.json`, `site/tests/e2e/reduced-motion.spec.ts`.

- [ ] **Step 1: Screenshot at all six widths** — 360, 390, 768, 1024, 1440, 1920. Review every one before ticking this box.

- [ ] **Step 2: Cross-browser** — Chrome, Safari on iOS, Samsung Internet. Add `webkit` to `playwright.config.ts` projects and run the suite.

- [ ] **Step 3: Reduced motion, on and off.** Assert that with `reducedMotion: 'reduce'` no GSAP request is made on any section, and every narrative shows its final state: the timetable resolved, the risk story as three static panels, the tour as five stacked frames.

- [ ] **Step 4: Keyboard-only walkthrough** of the hero demo, the pricing input and the demo form. No mouse. Every step must be reachable and every focus ring visible.

- [ ] **Step 5: Colour-blind simulation.** Render the conflict, absence, risk and ok states under deuteranopia and protanopia:

```bash
npx playwright test tests/e2e/colourblind.spec.ts
```

The test applies an SVG colour-matrix filter and asserts each status still carries its text label and shape cue. If two states become indistinguishable, the non-colour cue is not doing enough work — fix the cue, not the hue.

- [ ] **Step 6: Lighthouse against the budget.**

Create `site/lighthouserc.json`:

```json
{
  "ci": {
    "collect": { "url": ["http://localhost:4321/"], "settings": { "preset": "mobile" } },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "cumulative-layout-shift":  ["error", { "maxNumericValue": 0.05 }],
        "total-blocking-time":      ["error", { "maxNumericValue": 200 }],
        "categories:accessibility": ["error", { "minScore": 1 }]
      }
    }
  }
}
```

Run `npx @lhci/cli autorun`. If LCP exceeds 2.0s, the first thing to check is whether anything animates the H1 — it must not.

- [ ] **Step 7: Verify the initial JS budget.**

```bash
cd site && npm run build
find dist -name "*.js" -exec gzip -c {} \; | wc -c
```

Confirm the bundle loaded on first paint is under 150 KB gzipped. GSAP must appear only in lazily-imported chunks, never in the entry.

- [ ] **Step 8: Content gate must be red or resolved.** Run `npm run build`. Either it passes because every claim is verified, or it fails and the site is not deployed. There is no third option.

- [ ] **Step 9: The subtraction pass.** Go section by section and remove one decorative element from each. Keep it removed if the section is better without it. Record what you removed and what you restored.

- [ ] **Step 10: Commit** — `git commit -m "test(site): QA pass — a11y, perf budget, reduced motion, colour-blind"`.

---

## Self-review

**Spec coverage.** Every numbered spec section maps to a task: §3.1→T1, §3.2→T3, §3.3–3.5→T1/T3, §4→T1, §5.1→T8, §5.2→T7/T8, §5.3→T10, §5.4→T11, §5.5→T12, §5.6→T13, §5.7→T14, §5.8→T15, §5.9→T10, §5.10→T16, §5.11→T17, §5.12→T18, §5.13→T8, §6→T5 plus each section's island, §7→T9, §8→T19/T20, §11→T20.

**Gaps deliberately left.** Spec §9 A1 (the `app.moujtahide.ma` move) has no task — it is a deploy and Laravel CORS change outside this repo's marketing scope, and it must be scheduled separately before launch. Spec §10's deletion of the root `landing.html` and the removal of the Angular `hero` route are likewise not tasks here: doing them before the new site is live would take the current marketing page down. **Both must happen at cutover; neither is forgotten, both are out of this plan's scope.**

**Type consistency.** `Session`, `Conflict`, `moveSession`, `findFreeSlot`, `detectConflicts` are defined once in T4 and used with identical signatures in T7, T8 and T12. `loadGsap` returns `GsapBundle | null` in T5 and every consumer checks for null. `PLACEHOLDER` is defined in T9 and imported by T10. `recommendPlan` returns `PlanId`, matching the `id` values in `pricing.json`.

**Arithmetic verified.** T13's risk values were recomputed to land on the spec's fixed figures exactly — 87.0 at the peak and 40.75 (→ 41) after the intervention — with neither depending on a rounding tie.

**Test strategy.** Pure logic (contrast, typography, the timetable engine, risk, pricing, phone, the placeholder gate) is unit-tested with Vitest and drives implementation TDD-style. Anything requiring a browser (keyboard operation, reduced motion, axe, touch targets, the perf budget) is covered by Playwright, because asserting those in jsdom would prove nothing. Three tests deliberately encode *design rules* rather than behaviour — gold must **fail** contrast as text on chalk, `--rule-hair` must **fail** the 3:1 UI threshold, and reduced motion must produce **zero** GSAP network requests. Someone "fixing" any of those three has broken the spec.

