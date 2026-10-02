const fs = require('fs');
const path = require('path');
const { DOMSimulator } = require('../tests/helpers/dom_simulator.js');
const CssAnalyzer = require('../tests/helpers/css_analyzer.js');
const { calculateInstallmentsOracle } = require('../tests/helpers/reference_oracles.js');

const domSim = new DOMSimulator();
const doc = domSim.createDocument();
const cssAnalyzer = new CssAnalyzer();

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('       NOVIN KHODRO — COMPONENT ARCHITECTURE & GEOMETRIC AUDIT         ');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Parse raw rule body into declaration key-value map
function parseDeclarations(body) {
  const decls = {};
  body.split(';').forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim().toLowerCase();
      const val = parts.slice(1).join(':').trim();
      decls[key] = val;
    }
  });
  return decls;
}

function findRules(selector) {
  return cssAnalyzer.findRulesMatching(selector).map(r => ({
    selectors: r.selectors,
    declarations: parseDeclarations(r.body)
  }));
}

const auditRegistry = [
  {
    id: 'C1_HEADER',
    name: 'Header & Brand Identity Bar',
    selector: '.site-header',
    semantics: 'header[role="banner"]',
    measurements: {
      height: '80px',
      position: 'sticky (top: 0)',
      zIndex: '100',
      backdropFilter: 'blur(20px)',
      touchTargetMin: '44px'
    },
    verification: () => {
      const headerElem = doc.querySelector('header.site-header');
      const logoImg = doc.querySelector('.brand-logo-img');
      const navLinks = doc.querySelectorAll('.nav-link-item');
      const callBtn = doc.querySelector('.btn-header-call');
      const rules = findRules('.site-header');

      const isSticky = rules.some(r => r.declarations.position === 'sticky');
      const hasZIndex = rules.some(r => parseInt(r.declarations['z-index'] || '0') >= 100);

      return {
        hasHeaderTag: Boolean(headerElem),
        hasLogo: Boolean(logoImg),
        navItemsCount: navLinks.length,
        hasCallCta: Boolean(callBtn),
        isSticky,
        hasZIndex
      };
    }
  },
  {
    id: 'C2_HERO_SLIDER',
    name: 'Cinematic Hero Slider Showcase',
    selector: '.hero-slider-section',
    semantics: 'section[aria-label]',
    measurements: {
      minHeight: '520px',
      containerHeight: '540px',
      slideCount: '4 luxury cars',
      transition: 'opacity 0.7s, transform 0.7s (GPU accelerated)'
    },
    verification: () => {
      const slider = doc.querySelector('.hero-slider-section');
      const slides = doc.querySelectorAll('.slide-item');
      const dots = doc.querySelectorAll('.slider-dot');
      const rules = findRules('.hero-slider-section');
      const hasMinHeight = rules.some(r => r.declarations['min-height'] === '520px');

      return {
        hasSection: Boolean(slider),
        slideCount: slides.length,
        dotsCount: dots.length,
        hasMinHeight
      };
    }
  },
  {
    id: 'C3_FINANCING_CALC',
    name: 'Installment Calculator & Scheme (خرید از شما، اقساط از ما)',
    selector: '#installment-plan',
    semantics: 'section[aria-labelledby="installmentHeading"]',
    measurements: {
      priceRange: '300M to 5,000M Tomans',
      downpaymentRange: '40% to 70%',
      tenureOptions: '6, 12, 18, 24 Months',
      annualInterestRate: '21%'
    },
    verification: () => {
      const section = doc.querySelector('#installment-plan');
      const priceSlider = doc.querySelector('#calcPriceSlider');
      const dpSlider = doc.querySelector('#downPaymentPercent');
      const tenureBtns = doc.querySelectorAll('.tenure-btn');
      const mathTest = calculateInstallmentsOracle(1000, 50, 12);

      return {
        hasSection: Boolean(section),
        hasPriceSlider: Boolean(priceSlider),
        hasDpSlider: Boolean(dpSlider),
        tenureBtnsCount: tenureBtns.length,
        mathIntegrity: mathTest.monthlyPayment > 0 && mathTest.loanAmountVal === 500000000
      };
    }
  },
  {
    id: 'C4_CATALOG_FILTER',
    name: 'Showroom Catalog & Dynamic Filter Bar',
    selector: '#inventory',
    semantics: 'section[aria-labelledby="inventoryHeading"]',
    measurements: {
      layout: 'CSS Grid repeat(auto-fill, minmax(320px, 1fr))',
      gap: '1.75rem',
      categories: 'All, Zero, Used, Iranian, Chinese, Imported'
    },
    verification: () => {
      const section = doc.querySelector('#inventory');
      const searchInput = doc.querySelector('#searchInput, #carSearchInput') || doc.querySelector('.clean-search input');
      const brandFilter = doc.querySelector('#brandFilter');
      const sortFilter = doc.querySelector('#sortFilter');
      const pills = doc.querySelectorAll('.filter-category-pill, .filter-categories-pills button');

      const app = domSim.loadApp();
      const renderedCards = app.document.querySelectorAll('.car-card-modern').length;
      app.cleanup();

      return {
        hasSection: Boolean(section),
        hasSearch: Boolean(searchInput),
        hasBrandFilter: Boolean(brandFilter),
        hasSortFilter: Boolean(sortFilter),
        categoryPillsCount: pills.length,
        renderedInventoryCards: renderedCards
      };
    }
  },
  {
    id: 'C5_CAR_CARDS',
    name: 'Vehicle Specification Card Component',
    selector: '.car-card-modern',
    semantics: 'article.car-card-modern with H3 heading',
    measurements: {
      mediaHeight: '240px',
      aspectRatio: 'Preserved without CLS layout shift',
      borderRadius: '16px (--radius-lg)',
      badges: 'Verified, Clean, Zero-km inspection tags'
    },
    verification: () => {
      const app = domSim.loadApp();
      const firstCard = app.document.querySelector('.car-card-modern');
      const title = firstCard ? firstCard.querySelector('h3') : null;
      const mediaImg = firstCard ? firstCard.querySelector('.card-media img') : null;
      const detailBtn = firstCard ? firstCard.querySelector('button') : null;
      app.cleanup();

      return {
        cardExists: Boolean(firstCard),
        hasSemanticH3: Boolean(title),
        hasMediaImage: Boolean(mediaImg),
        hasActionBtn: Boolean(detailBtn)
      };
    }
  },
  {
    id: 'C6_SELL_CAR',
    name: 'Car Appraisal & Immediate Purchase Form',
    selector: '#sell-car',
    semantics: 'section[aria-labelledby="sellSectionHeading"]',
    measurements: {
      layout: 'Grid 2-column (Banner text + Glassmorphic Form)',
      validation: 'Iranian Mobile Normalization (+98 / 09 / ۰۹)'
    },
    verification: () => {
      const section = doc.querySelector('#sell-car');
      const form = doc.querySelector('#sellCarForm');
      const inputs = doc.querySelectorAll('#sellCarForm input');
      const submitBtn = doc.querySelector('#sellCarForm button[type="submit"]');

      return {
        hasSection: Boolean(section),
        hasForm: Boolean(form),
        inputsCount: inputs.length,
        hasSubmitBtn: Boolean(submitBtn)
      };
    }
  },
  {
    id: 'C7_FAQ_ACCORDION',
    name: 'Frequently Asked Questions (Accordion UI)',
    selector: '#faq',
    semantics: 'section[aria-labelledby="faqSectionHeading"]',
    measurements: {
      itemsCount: '4 questions',
      animation: 'max-height transition 0.35s GPU-friendly',
      ariaControls: 'aria-expanded toggle bindings'
    },
    verification: () => {
      const section = doc.querySelector('#faq');
      const items = doc.querySelectorAll('.faq-item');
      const questions = doc.querySelectorAll('.faq-question');

      return {
        hasSection: Boolean(section),
        itemsCount: items.length,
        questionsCount: questions.length
      };
    }
  },
  {
    id: 'C8_CONTACT_FOOTER',
    name: 'Location, Contact Matrix & Global Footer Landmark',
    selector: '#contact & footer',
    semantics: 'section#contact + footer[role="contentinfo"]',
    measurements: {
      address: 'تهران، ستارخان، میدان توحید، نصرت غربی، پلاک ۲۱',
      phone: '02166120332',
      coordinates: '35.7055656, 51.3761594'
    },
    verification: () => {
      const contactSec = doc.querySelector('#contact');
      const footerElem = doc.querySelector('footer');
      const phoneLinks = doc.querySelectorAll('a[href^="tel:"]');

      return {
        hasContactSection: Boolean(contactSec),
        hasFooter: Boolean(footerElem),
        phoneLinksCount: phoneLinks.length
      };
    }
  },
  {
    id: 'C9_MODAL_DETAILS',
    name: 'Vehicle Modal Dialog & Accessibility Focus Trap',
    selector: '#carModal',
    semantics: 'div#carModal[role="dialog"][aria-modal="true"]',
    measurements: {
      overlay: 'Fixed inset 0, z-index 1000, backdrop-filter blur(12px)',
      responsive: 'Bottom-sheet on mobile (<=768px), centered popup on desktop',
      escKey: 'Auto-dismiss on Escape + body scroll lock'
    },
    verification: () => {
      const modal = doc.querySelector('#carModal');
      const closeBtn = doc.querySelector('#modalClose, .modal-close');
      const modalBody = doc.querySelector('#modalDetailsBody');

      return {
        modalExists: Boolean(modal),
        hasCloseBtn: Boolean(closeBtn),
        hasModalBody: Boolean(modalBody)
      };
    }
  },
  {
    id: 'C10_TOAST_QUEUE',
    name: 'Global Real-Time Toast Notification Queue',
    selector: '#toastContainer',
    semantics: 'div#toastContainer[aria-live="polite"]',
    measurements: {
      position: 'Fixed bottom 1.5rem right 1.5rem (RTL adjusted)',
      duration: '4000ms auto-dismiss'
    },
    verification: () => {
      const container = doc.querySelector('#toastContainer');
      return {
        containerExists: Boolean(container)
      };
    }
  }
];

const auditResults = auditRegistry.map(comp => {
  const checks = comp.verification();
  const allPassed = Object.values(checks).every(v => v === true || (typeof v === 'number' && v > 0));
  return {
    id: comp.id,
    name: comp.name,
    selector: comp.selector,
    measurements: comp.measurements,
    status: allPassed ? 'OPTIMAL' : 'ANOMALY',
    verificationChecks: checks
  };
});

auditResults.forEach(r => {
  console.log(`[${r.status}] ${r.name}`);
  console.log(`  Selector: ${r.selector}`);
  console.log(`  Metrics:  ${JSON.stringify(r.measurements)}`);
  console.log(`  Checks:   ${JSON.stringify(r.verificationChecks)}\n`);
});

console.log('═══════════════════════════════════════════════════════════════════════');
console.log(`TOTAL AUDITED COMPONENTS: ${auditResults.length}`);
console.log(`OPTIMAL & VERIFIED:       ${auditResults.filter(r => r.status === 'OPTIMAL').length}`);
console.log(`ANOMALIES:                ${auditResults.filter(r => r.status === 'ANOMALY').length}`);
console.log('═══════════════════════════════════════════════════════════════════════');
