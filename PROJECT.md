# Project: Novin Khodro Car Showroom Optimization

## Architecture
Novin Khodro is a modern, responsive Single Page Application (SPA) designed as a luxury automobile showroom with installment calculation, interactive inventory catalog with dynamic filtering/sorting, a vehicle details modal, financing simulator, and customer inquiry forms.

```
┌──────────────────────────────────────────────────────────┐
│                   index.html (Semantic UI)               │
│ ┌──────────────┬────────────────────────┬──────────────┐ │
│ │ Header & Nav │ Hero & Features Slider │ Installments │ │
│ ├──────────────┼────────────────────────┼──────────────┤ │
│ │ Cars Catalog │ Sell Car / Contact Us  │ Car Modal    │ │
│ └──────────────┴────────────────────────┴──────────────┘ │
└──────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌───────────────────────┐            ┌──────────────────────┐
│     CSS Subsystem     │            │ JavaScript Subsystem │
│ - css/style.css       │            │ - js/cars-data.js    │
│ - css/installment.css │            │ - js/app.js          │
│ - css/responsive.css  │            └──────────────────────┘
└───────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Semantic Landmarks & Document Outline | Wrap content in `<main id="main-content">`, `<header>`, `<section>`, `<footer>`, add Skip Link | M1 | Survey HTML/A11y |
| F2 | Heading Hierarchy Regularization | Strict H1 -> H2 -> H3 progression, replace `<div>` with `<h2>` for catalog title | M1 | Survey HTML/A11y |
| F3 | Accessible ARIA Markup & Labels | ARIA landmarks, roles, `aria-controls`, `aria-expanded`, `aria-pressed`, `aria-label` | M1 | Survey HTML/A11y |
| F4 | Font & Asset Preloading | Move Vazirmatn font to `<link rel="preconnect">` & `<link rel="stylesheet">`, remove `@import` | M1 & M2 | Survey CSS/A11y |
| F5 | CSS Design Tokens & Variable Cleanup | Consolidate hardcoded hex colors, z-indexes, and spacing into unified CSS tokens | M2 | Survey CSS/Perf |
| F6 | 60fps GPU Animation Overhaul | Eliminate `transition: all`, replace reflow animations with `transform`/`opacity` & CSS Grid `0fr -> 1fr` | M2 | Survey CSS/Perf |
| F7 | Reduced Motion Accessibility | Full `@media (prefers-reduced-motion: reduce)` support across all animated elements | M2 | Survey CSS/Perf |
| F8 | High-Visibility Keyboard Focus Rings | Universal high-contrast `:focus-visible` styling for all interactive elements | M2 | Survey CSS/A11y |
| F9 | Mobile Bottom-Sheet UX & Safe Area | Upgrade mobile modal with drag indicator, `dvh` units, `safe-area-inset-bottom`, smooth slide-up | M2 | Survey CSS/Perf |
| F10 | Layout Shift (CLS) Stabilization | Define explicit `aspect-ratio` & dimensions on images, `scrollbar-gutter: stable`, skeleton placeholders | M1 & M2 | Survey CSS/A11y |
| F11 | State Encapsulation & Scope Isolation | Clean module/IIFE encapsulation, remove global `window.openCarModal`, clean memory state | M3 | Survey JS Spec |
| F12 | Event Delegation Architecture | Migrate inline `onclick` handlers on car cards, slider buttons, and modal thumbnails to delegated listeners | M3 | Survey JS Spec |
| F13 | Hardened Installment Math & Bounds | Guard against 0 tenure (no Infinity), negative price/prepayment, NaN fallback, Persian digit conversion | M3 | Survey JS Spec |
| F14 | Robust Iranian Phone & Form Validation | Strict regex validation (`09...` / `۰۹...`), accessible inline errors, `aria-invalid`, toast feedback | M3 | Survey JS Spec |
| F15 | Modal Dialog Lifecycle & Focus Trap | Modal open/close animation synchronization, keyboard focus trap, focus restoration, ESC key handling | M3 | Survey JS Spec |
| F16 | Image Fallback & Error Resilience | Local SVG fallback / placeholder for broken or offline Unsplash image URLs | M3 | Survey JS Spec |
| F17 | Catalog Filtering & Sorting Stability | Smooth filtering and sorting without layout jump, maintaining active state preservation | M3 | Survey JS Spec |
| F18 | E2E Test Suite (Tiers 1-4) | Comprehensive automated test suite covering all features, boundary values, pairwise combinations, user workflows | E2E Track | ORIGINAL_REQUEST |
| F19 | Adversarial Coverage Hardening (Tier 5) | White-box edge case testing, fuzzing calculator inputs, high-stress interaction tests | Final M | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Semantic HTML, Assets & A11y Markup | `index.html` structure, landmarks, skip-link, ARIA attributes, font link preconnect, image dimensions | none | DONE |
| M2 | CSS Architecture, 60fps GPU Animations & Mobile Polish | `css/style.css`, `css/installment.css`, `css/responsive.css` refactoring, tokens, GPU transitions, focus rings, mobile bottom-sheet | M1 | PLANNED |
| M3 | JavaScript Refactoring, Validation & Error Boundaries | `js/app.js`, `js/cars-data.js` encapsulation, event delegation, installment bounds, phone validation, focus trap, image fallbacks | M1, M2 | PLANNED |
| E2E | E2E Testing Track | Independent requirement-driven automated test suite (`tests/`) covering Tiers 1-4 | none (parallel) | IN_PROGRESS |
| FM | Final Milestone: 100% E2E Verification & Adversarial Hardening | Phase 1: 100% pass on Tiers 1-4; Phase 2: Tier 5 adversarial verification | M1, M2, M3, E2E | PLANNED |

## Code Layout & Write Boundaries
- `index.html`: Milestone 1 Worker (Completed)
- `css/style.css`, `css/installment.css`, `css/responsive.css`: Milestone 2 Worker
- `js/app.js`, `js/cars-data.js`: Milestone 3 Worker
- `tests/*`, `run_tests.js`: E2E Testing Track Worker
- `.agents/*`: Subagent metadata and handoffs ONLY

## Interface Contracts
### HTML ↔ CSS Contracts
- `.skip-link`: Visible on `:focus-visible`, hidden off-screen otherwise.
- `.modal-overlay`: Uses `.active` class with GPU opacity transition.
- `.modal-content`: Desktop scale/opacity transition, mobile bottom-sheet slide-up `translateY(0)` from `translateY(100%)`.
- `:focus-visible`: 2px outline/box-shadow with `var(--color-primary)` or `var(--color-accent-blue)` and 2px offset.
- `[data-theme="dark"]` / root tokens: CSS variables for colors, elevation, transitions, radii, and z-indexes.

### HTML ↔ JavaScript Contracts
- Catalog cards: Rendered inside `#carsGrid` with `data-car-id` attribute on container/buttons for delegated event listening.
- Modal: `#carModal` / `#modalOverlay`, `#modalBody`, `#closeModalBtn`. Uses `aria-modal="true"`, `role="dialog"`.
- Sliders: `#calcPriceSlider`, `#downPaymentPercent` with synchronized `#calcPriceDisplay`, `#downPaymentPercentDisplay`, `#downPaymentAmountDisplay`, `#loanAmountDisplay`, `#monthlyPaymentDisplay`.
- Form: `#sellCarForm` with inputs `#sellCarModel`, `#sellCarYear`, `#sellCarMileage`, `#sellOwnerPhone`, `#sellSubmitBtn`.
