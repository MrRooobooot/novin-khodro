# TEST READY — Novin Khodro E2E Test Suite

## Status: COMPLETE & READY FOR CONTINUOUS VERIFICATION (475/475 PASSING — verified 2026-10-03)

> This document supersedes the earlier 230-test snapshot: the suite now spans tiers 0–7.
> Fresh verification run on 2026-10-03: **475/475 pass, 0 failed, 0 skipped, ~0.5 s, exit 0.**

---

## Test Execution Summary

```
=====================================================================
   Novin Khodro Automated E2E & Specification Test Suite Runner
=====================================================================

Test Execution Summary:
  Total Tests:    475
  Passed:         475 ✓
  Failed:         0 ✗
  Skipped:        0 ○
  Total Duration: ~0.5s
  Exit Code:      0
=====================================================================
```

---

## Test Inventory & Tier Breakdown

| Tier | File | Tests |
|---|---|---|
| Tier 0 | `tests/tier0_domain_units.test.js` — domain units | 11 |
| Tier 1 | `tests/tier1_feature_coverage.test.js` — features F1–F19 | 268 |
| Tier 2 | `tests/tier2_boundaries.test.js` — boundary & corner cases | 96 |
| Tier 3 | `tests/tier3_combinations.test.js` — cross-feature pairwise | 25 |
| Tier 4 | `tests/tier4_workflows.test.js` — real-world workflows | 15 |
| Tiers 5–7 | IKCO profile pages · zero-price handling · performance & responsive | 60 combined |
| **Total** | | **475** |

**Tier 1–4 coverage highlights (original track):**

1. **Feature Coverage** — semantic landmarks, heading regularizations, ARIA attributes,
   asset preloads, design tokens, GPU transitions, reduced motion, keyboard focus rings,
   mobile responsive bottom-sheet UX, layout shift stabilization, state isolation, event
   delegation, financing math, phone validation, modal dialog lifecycle, image fallbacks,
   and catalog sorting/filtering.
2. **Boundary & Corner Cases** — boundary values (300M to 5,000M Tomans, 40 % to 70 %
   prepayment, 6 to 24 month tenures), NaN handling, negative numbers, extreme slider
   ranges, invalid phone formats (10-digit, 12-digit, letters, symbols), empty string
   inputs, regex injection characters, missing image fallbacks, and error boundaries.
3. **Cross-Feature Combinations** — pairwise interactions across sliders, category pills,
   brand selectors, sorting filters, modal gallery thumbnails, FAQ accordion toggles,
   mobile drawer triggers, and toast notifications.
4. **Real-World Workflows** — multi-step user journeys including W1 buyer loan financing &
   WhatsApp lead generation, W2 inspection certificate & gallery navigation, W3 seller
   appraisal form validation, W4 keyboard-only navigation, W5 multi-criteria search &
   reset recovery, W6 image degradation resilience, W7 mobile drawer & bottom-sheet,
   W8/W9 rapid input stress tests, W10 modal lifecycle, W11 hero slider, W12 FAQ,
   W13 Persian/special character inputs, W14 ARIA landmark verification, W15 complete
   purchase journey.

---

## Verification Command

Run the full suite (canonical):

```bash
node tests/run_tests.js
```

Machine-readable report:

```bash
node tests/run_tests.js --json
```
