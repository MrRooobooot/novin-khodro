# Novin Khodro (نوین خودرو)
## Car showroom web platform — zero-dependency vanilla stack + custom test framework

Static showroom site for an Iranian car dealership: interactive inventory catalog, vehicle
detail modal with gallery, financing/installment simulator (Iranian bank math), appraisal &
contact forms with WhatsApp lead generation, a daily-updated price-list page, encyclopedia
and deals pages.

**No framework, no build step, no npm runtime dependencies** — ~14.9k lines of vanilla
JavaScript + CSS (js/: 7,810 · css/: 7,078), plus a purpose-built zero-dependency test
framework (475 checks) that runs in ~0.5 s on plain Node.

> **Status (honest):** deployment is currently **blocked / not publicly verified** — the
> last content sync (2026-10-02) targeted a VPS docroot, but the site is not confirmed as
> publicly served. The project remains fully reproducible locally
> (`node tests/run_tests.js`).

## Features

- Persian-first UX — RTL layout, Persian numerals, `fa_IR` locale; Jalali/Gregorian
  year input in the sell-car flow (`index.html`).
- Catalog filtering & sorting (category pills, brand, search, sort) with active-state preservation.
- Vehicle detail modal: gallery + thumbnails, keyboard focus trap, focus restoration, ESC
  handling, mobile bottom-sheet UX (dvh units, safe-area insets).
- Financing simulator: 300M–5,000M Toman, 40–70 % down payment, 6–24 months; guarded math
  (no Infinity on 0 tenure, NaN fallback, negative-input rejection) and Persian digit handling.
- Iranian phone validation (`09…`, `۰۹…`, `+98…`, `00989…`).
- Sell-car appraisal form with inline accessible validation (`aria-invalid`, toast feedback).
- SEO/schema: JSON-LD (WebSite / BreadcrumbList / ItemList), sitemap, `llms.txt` for AI crawlers.
- Prices page generated from the ingestion data: 109 brands / 887 tips (last build).
- Accessibility: semantic landmarks, ARIA, skip-link, `:focus-visible` rings, reduced-motion support.
- Performance: GPU-only transitions (transform/opacity), CLS-stable images (explicit
  dimensions + `aspect-ratio`), `scrollbar-gutter: stable`, zero runtime CDN dependencies.

## Repository layout

```text
index.html deals.html encyclopedia.html prices.html admin.html   # pages (prices/admin generated)
cars/            generated per-vehicle pages
css/             token-driven stylesheets (tokens · style · installment · responsive)
js/              catalog, modal, calculator, validation, renderers (vanilla modules)
tests/           zero-dependency test framework + 8 tier suites (see below)
scripts/         content pipeline & deploy tooling (Python + shell)
assets/ images/ fonts/
```

## Test framework (the interesting part)

A complete testing stack built **without any npm dependency** — pure Node (v22+):

| Piece | What it does |
|---|---|
| `tests/helpers/test_runner.js` | describe/test DSL, lifecycle hooks, async engine with isolation, ANSI tree output, `--json` report, strict exit codes |
| `tests/helpers/dom_simulator.js` | pure-Node HTML parser with a query-selector engine, event dispatch/bubbling, and a `node:vm` sandbox (window/document/localStorage/timers) |
| `tests/helpers/reference_oracles.js` | ground-truth models: installment math, Persian↔ASCII digits, currency formatting, Iranian phone regex, filtering/sorting |
| `tests/helpers/css_analyzer.js` | CSS token inspection, GPU-transition checks (flags reflow-inducing animations), media-query & focus-style verification |

Suites (verified 2026-10-03 — **475/475 pass, ~0.5 s, exit 0**):

| Tier | Focus | Tests |
|---|---|---|
| 0 | Domain units | 11 |
| 1 | Feature coverage, F1–F19 | 268 |
| 2 | Boundaries & extreme values | 96 |
| 3 | Cross-feature combinations | 25 |
| 4 | Real-world user workflows | 15 |
| 5–7 | IKCO profile pages, zero-price handling, performance & responsive checks | 60 combined |
| **Total** | | **475** |

```bash
node tests/run_tests.js          # full suite
node tests/run_tests.js --json   # machine-readable summary
```

## Content pipeline (`scripts/`)

- `price-sync.py` + `price-sync-cron.sh` — daily price ingestion with lock handling
  (mkdir + PID stale-takeover), single-generation log rotation, staleness alerting, and
  mirroring of results into the web assets.
- `deal-scraper.py`, `market-price-extractor.py` — deal and market-price extraction.
- `build-*.py` — page generators (prices, encyclopedia, per-car pages, IKCO catalog).
- `deploy-*.sh`, `verify-server-parity.py` — deployment + byte-parity verification between
  local build output and the served docroot. Host config is read from an untracked
  `deploy.env` (see `deploy.env.example`).

## Current status & known limitations

- **475/475 tests pass** (verified fresh on 2026-10-03).
- **Not publicly served** (see status note above).
- Deploy tooling reads host config from an untracked `deploy.env` (`deploy.env.example`
  provided); the repository carries no server address.
- The IKCO catalog images are third-party promotional photos used for showroom display —
  they are intentionally not included in this public snapshot; replace with licensed
  photography before any commercial re-publication.
- Photographs in `images/` were sourced from Wikimedia Commons under free licenses; the
  bundled Vazirmatn font is under the SIL Open Font License.
- License: not yet specified — owner decision.

---

Maintainer: Aidin Nemati
