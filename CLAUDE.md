# White Soul Ibiza — Project Directives

## Overview

Static multi-page luxury website for **White Soul Ibiza**, a premium concierge and event planning service based in Ibiza. The site targets high-end clientele (EN/IT/ES/FR) and presents services, events, experiences, testimonials and contact.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Pages | Static HTML5 (no framework, no build step) |
| Styling | CSS3 with custom properties — single `styles.css` |
| Interactivity | Vanilla JS — single `script.js` |
| Fonts | Cormorant Garamond (display) + Inter (body) via Google Fonts |
| Icons | Inline SVG only |
| Images | Unsplash placeholders (replace with real photography) |
| Translation DB | Turso (libsql) — cloud SQLite |

---

## File Structure

```
whitesoulibiza/
├── index.html          Homepage
├── services.html       Full services detail page
├── events.html         Events (addio celibato/nubilato + pacchetti serate)
├── experiences.html    Custom experience builder
├── about.html          Brand story & values
├── testimonials.html   Guest testimonials grid
├── contact.html        Contact form + WhatsApp CTA
├── styles.css          All global styles (single file)
├── script.js           All JS: header, carousel, lang switcher, Turso fetch
├── assets/
│   └── logo.png        Brand logo
├── seed-db.js          One-time DB seeding script (Node.js)
└── CLAUDE.md           This file
```

---

## Navigation Order (strict — do not change)

```
Home → Services → Events → Experiences → Testimonials → About → Contact
```

This order must be maintained in all 7 HTML files in the `.nav-links` `<ul>`.

---

## Design System

### Colour Palette (CSS variables)

| Variable | Hex | Usage |
|---|---|---|
| `--color-bone` | `#f5f1ea` | Alternate section backgrounds |
| `--color-cream` | `#faf7f1` | Primary background |
| `--color-sand` | `#e8dfd0` | Borders, dividers |
| `--color-sand-dark` | `#c9b896` | Strong borders |
| `--color-ink` | `#1a1a1a` | Primary text |
| `--color-ink-soft` | `#2c2c2c` | Secondary text |
| `--color-charcoal` | `#3a3a3a` | Body paragraphs |
| `--color-stone` | `#6b6b6b` | Muted text |
| `--color-gold` | `#b8945f` | Accent, dots, bullets |
| `--color-gold-light` | `#d4b896` | Light accent (on dark BG) |
| `--color-gold-dark` | `#8b6f3f` | Hover states, eyebrows |
| `--color-ocean` | `#1e3a4f` | Dark section bg |
| `--color-ocean-deep` | `#122633` | Testimonials section bg |
| `--color-white` | `#ffffff` | Pure white |

### Typography

- **Display/headings**: `Cormorant Garamond` (300, 400, italic)
- **Body/UI**: `Inter` (300, 400, 500, 600)
- Font sizes use `clamp()` for fluid scaling
- Tracking utilities: `--tracking-wide` (0.18em), `--tracking-wider` (0.32em), `--tracking-widest` (0.5em)

### Header Behaviour

- **Transparent** (default, over hero images): text is white/cream
- **Scrolled** (`.scrolled` class, after 40px): cream background, dark text
- **Solid** (`.solid` class, contact.html): always cream background, always dark text
- CSS selectors use `:not(.scrolled):not(.solid)` for transparent white state

---

## Services (services.html)

Six services in order, numbered 01–06:

| # | Name | Eyebrow key |
|---|---|---|
| 01 | Villa Concierge | `services.villa.*` |
| 02 | Private Chef in Villa | `services.chef.*` |
| 03 | Yacht & Boat Experiences | `services.yacht.*` |
| 04 | VIP Services & Reservations | `services.vip.*` |
| 05 | Wellness & Experiences | `services.wellness.*` |
| 06 | Fotografia per Eventi | `services.photo.*` |

**Removed services** (do not re-add):
- Childcare / pet care (was in Villa Concierge)
- Private yoga / pilates / breath-work
- Sound baths / ceremony / ritual experiences
- Personal trainers / padel coaches
- Nutritionists / IV therapy / doctors on call

VIP Services uses **Deltaplano** (not helicopter) for vehicle rentals.

---

## Events (events.html)

Only two event types — keep it focused:

1. **Addio al Celibato & Nubilato** (bachelor/bachelorette)
2. **Pacchetti & Tavoli per le Serate** (VIP packages & table reservations)

Do not re-add weddings, corporate events, or private milestone birthdays.

---

## Translation System

### Database

- **Provider**: [Turso](https://turso.tech) (libsql / cloud SQLite)
- **Endpoint**: `https://whitesoulibiza-therealmfkk.aws-eu-west-1.turso.io/v2/pipeline`
- **Auth token**: stored in `script.js` → `TURSO_TOKEN` constant
- **Schema**:
  ```sql
  CREATE TABLE translations (
    lang  TEXT NOT NULL,
    key   TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (lang, key)
  );
  ```

### Supported Languages

`EN` · `IT` · `ES` · `FR`

### How it works (script.js)

1. On page load, the fallback dict (nav + CTA keys) is applied immediately — no flash.
2. `fetchTranslations(lang)` calls Turso HTTP API and caches the result in `translationCache`.
3. `applyTranslationDict(dict)` sets `textContent` (or `innerHTML` for values containing `<`) on all `[data-t]` elements.
4. Language choice persisted in `localStorage` under key `ws_lang`.

### Adding a new translation key

1. Add `data-t="your.key"` to the HTML element.
2. Insert the row in Turso for all 4 languages:
   ```sql
   INSERT INTO translations (lang, key, value) VALUES ('EN', 'your.key', 'English text');
   INSERT INTO translations (lang, key, value) VALUES ('IT', 'your.key', 'Testo italiano');
   INSERT INTO translations (lang, key, value) VALUES ('ES', 'your.key', 'Texto español');
   INSERT INTO translations (lang, key, value) VALUES ('FR', 'your.key', 'Texte français');
   ```
3. If you also want a fallback, add it to `fallbackTranslations` in `script.js`.

### Re-seeding the DB

Run `seed-db.js` (requires Node.js) **or** re-run the Python3 seed snippet from CLAUDE history. Use `INSERT OR REPLACE` to avoid duplicates.

### Security note

The token in `script.js` is **read-write** and visible client-side (unavoidable in a static site). For production, create a **read-only** token in the Turso dashboard and replace `TURSO_TOKEN`. The read-write token should only be used in server-side or CLI contexts.

---

## Key Translation Keys (data-t attributes in use)

### Navigation & CTAs (all pages)
`nav.home` · `nav.services` · `nav.custom` · `nav.events` · `nav.testimonials` · `nav.about` · `nav.contact`  
`cta.plan` · `cta.discover` · `cta.start` · `cta.create` · `cta.inquire` · `cta.services` · `cta.story` · `cta.plan.event`

### Homepage (index.html)
`home.hero.eyebrow` · `home.hero.sub` · `home.intro.eyebrow` · `home.intro.p1` · `home.intro.p2`  
`home.services.eyebrow` · `home.services.p`  
`home.services.villa.name` · `home.services.villa.desc`  
`home.services.yacht.name` · `home.services.yacht.desc`  
`home.services.chef.name` · `home.services.chef.desc`  
`home.services.vip.name` · `home.services.vip.desc`  
`home.services.wellness.name` · `home.services.wellness.desc`  
`home.services.events.name` · `home.services.events.desc`  
`home.villas.eyebrow` · `home.villas.p` · `home.testimonials.eyebrow` · `home.insta.eyebrow`  
`home.cta.eyebrow` · `home.cta.p`

### Services page (services.html)
`services.hero.eyebrow` · `services.hero.sub`  
`services.villa.*` · `services.chef.*` · `services.yacht.*` · `services.vip.*` · `services.wellness.*` · `services.photo.*`  
`services.cta.p`

### Events page (events.html)
`events.hero.eyebrow` · `events.hero.sub` · `events.intro.eyebrow`  
`events.bachelorette.title` · `events.bachelorette.desc` · `events.bachelorette.arrow`  
`events.packages.title` · `events.packages.desc` · `events.packages.arrow`  
`events.process.eyebrow` · `events.gallery.eyebrow` · `events.cta.p`

---

## CSS Patterns to Follow

- **Eyebrow labels**: `<span class="eyebrow">` — gold-dark, small caps, letter-spaced
- **Section headings**: `<h2 class="display-md">` with `<span class="italic">` for the gold italic word
- **Service feature lists**: `<ul class="service-features"><li>…</li></ul>`
- **Service rows**: alternating `.service-row` and `.service-row.reverse` (image ↔ text)
- **Reveal animation**: add `class="reveal"` (+ `reveal-delay-1/2/3/4`) to any element that should fade in on scroll
- **Sections**: use `class="section"` (padding 4–8rem) or `class="section-tight"` (3–5rem)
- **Alternate bg**: `style="background:var(--color-bone);"` on odd sections

---

## Component Rules

### Floating WhatsApp button
Present on every page. Number: `+34 971 000 000`. Update when real number is confirmed.

### Footer
Four columns: Brand · Explore · Discover · Contact. Present on every page. Keep consistent across all files.

### Language switcher
Buttons with `data-lang="EN|IT|ES|FR"`. Active state toggled via JS. Saved to `localStorage('ws_lang')`.

---

## Images

All current images are **Unsplash placeholders**. Replace with real White Soul Ibiza photography before launch. Image format: `width=1200&q=85` for detail images, `width=2000&q=85` for hero backgrounds.

---

## Do Not

- Do not add a build step or bundler without discussion
- Do not add frameworks (React, Vue, etc.)
- Do not add new navigation items without reordering all 7 HTML files
- Do not re-add removed services (childcare, yoga, sound bath, etc.)
- Do not re-add removed event types (weddings, corporate, private milestones)
- Do not use the read-write Turso token in any public-facing context beyond the current static setup
- Do not commit `seed-db.js` with active tokens to a public repository

xxx