# Novin Khodro — Automated E2E & Specification Test Infrastructure

> Updated 2026-10-03: supersedes the earlier 230-test snapshot — the suite has grown to
> **475 tests across 8 tiers (0–7)**, verified fresh (`475/475 pass, ~0.5 s, exit 0`).

## Overview

The Novin Khodro test suite is a completely autonomous, **zero-external-dependency** testing
framework built natively with pure Node.js (v22+). It provides opaque-box end-to-end (E2E),
specification verification, boundary analysis, pairwise integration, and user workflow
testing across all 19 system features (F1–F19) defined in `PROJECT.md`.

---

## Directory Layout

```
tests/
├── helpers/
│   ├── test_runner.js          # Core test framework (describe/test/assert/hooks/runner)
│   ├── dom_simulator.js        # Pure Node.js headless DOM parser & VM sandbox runtime
│   ├── reference_oracles.js    # Authoritative mathematical and business logic models
│   └── css_analyzer.js         # CSS AST/regex tokenizer and design token inspector
├── tier0_domain_units.test.js      # Tier 0: Domain unit tests (11 tests)
├── tier1_feature_coverage.test.js  # Tier 1: F1-F19 Feature Coverage (268 tests)
├── tier2_boundaries.test.js        # Tier 2: Boundary & Extreme Values (96 tests)
├── tier3_combinations.test.js      # Tier 3: Cross-Feature Pairwise Interactions (25 tests)
├── tier4_workflows.test.js         # Tier 4: Multi-Step Real-World User Workflows (15 tests)
├── tier5_ikco_profile.test.js      # Tier 5: IKCO profile pages
├── tier6_zero_prices.test.js       # Tier 6: Zero-price handling
├── tier7_perf_responsive.test.js   # Tier 7: Performance & responsive checks
└── run_tests.js                    # Master CLI executable entry point
```

---

## Architecture & Subsystems

### 1. Zero-Dependency Micro Test Framework (`tests/helpers/test_runner.js`)
- **Suite & Test DSL**: Provides standard `describe()`, `test()` / `it()`, and `skip()` functions.
- **Lifecycle Hooks**: Full support for `beforeAll`, `beforeEach`, `afterEach`, and `afterAll`.
- **Async Execution Engine**: Handles asynchronous promises, timeouts, and uncaught exceptions with complete error isolation.
- **Rich ANSI Color Terminal Output**: Clear hierarchical tree structure, test duration metrics, failure stack traces, and expected vs. actual diffs.
- **Structured JSON Reporting**: Can emit machine-readable JSON summaries for CI/CD pipelines via the `--json` flag.
- **Strict Exit Codes**: Returns code `0` on 100% pass, and `1` on any failure.

### 2. Headless DOM & Sandboxed Runtime Simulator (`tests/helpers/dom_simulator.js`)
- **Pure Node.js HTML Parser**: Tokenizes `index.html` without external npm dependencies (`jsdom`, `puppeteer`, etc.).
- **Query Selector Engine**: Supports tag, class, ID, attribute operators (`[attr]`, `[attr="val"]`, `[attr*="val"]`, etc.), descendant selectors, and compound comma-separated selectors.
- **Event Dispatch & Bubbling**: Simulates `DOMEvent`, event bubbling to ancestors, event delegation, and inline `onclick` execution inside sandboxed VM contexts.
- **Sandboxed VM Context**: Emulates `window`, `document`, `navigator`, `localStorage`, `setTimeout`, `setInterval`, and event loops via Node.js `node:vm`.

### 3. Authoritative Reference Oracles (`tests/helpers/reference_oracles.js`)
Provides deterministic mathematical and business models to compare against observable runtime outputs:
- `toPersianDigitsOracle(str)` & `toAsciiDigitsOracle(str)`: Persian vs. ASCII numeral conversions.
- `formatTomansOracle(num)` & `formatNumberFaOracle(num)`: Persian thousand-separated currency formatting.
- `calculateInstallmentsOracle(priceInM, downPercent, tenureMonths)`: Iranian banking formula for monthly installments and prepayment calculation.
- `validateIranianPhoneOracle(phoneStr)`: Strict regex validation for Iranian mobile numbers (`09...`, `+989...`, `00989...`, Persian numerals).
- `filterAndSortCarsOracle(cars, options)`: Ground-truth reference for catalog filtering by category, brand, search query, and sorting order.

### 4. CSS Design Token & Static Analyzer (`tests/helpers/css_analyzer.js`)
- Inspects `:root` CSS custom properties and design tokens across all stylesheets (`style.css`, `installment.css`, `responsive.css`).
- Analyzes transition rules to ensure 60fps GPU acceleration (using `transform`/`opacity`) and flags reflow-inducing properties (`width`, `height`, `margin`, `padding`).
- Verifies responsive media queries (`max-width: 768px`), mobile bottom-sheet styling, and accessibility styles (`:focus-visible`).

---

## Test Suite Breakdown (verified 2026-10-03)

| Tier | File | Description | Test Count |
|---|---|---|---|
| **Tier 0** | `tests/tier0_domain_units.test.js` | Domain unit tests (formatting, digit conversion) | **11** |
| **Tier 1** | `tests/tier1_feature_coverage.test.js` | Primary happy-path coverage across F1–F19 | **268** |
| **Tier 2** | `tests/tier2_boundaries.test.js` | Extreme bounds, zero/negative inputs, NaN, invalid phone regex, corrupt assets | **96** |
| **Tier 3** | `tests/tier3_combinations.test.js` | Pairwise cross-feature interactions (slider + WhatsApp, filter + sort, modal + thumbnails, FAQ toggle) | **25** |
| **Tier 4** | `tests/tier4_workflows.test.js` | Realistic end-to-end multi-step user scenarios (financing lead, vehicle appraisal, keyboard navigation) | **15** |
| **Tiers 5–7** | `tests/tier5_ikco_profile.test.js`, `tier6_zero_prices.test.js`, `tier7_perf_responsive.test.js` | IKCO profile pages, zero-price handling, performance & responsive checks | **60 combined** |
| **Total** | | **100% pass, ~0.5 s, exit 0** | **475** |

---

## Execution Instructions

Run all test suites:
```bash
node tests/run_tests.js
```

Generate machine-readable JSON output:
```bash
node tests/run_tests.js --json
```
