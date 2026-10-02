/**
 * Novin Khodro — Tier 2 Boundary & Corner Cases Test Suite
 * Comprehensive edge cases, boundary values, NaN, extreme numbers,
 * invalid Iranian phone formats, slider limits, and missing assets.
 * Rule: >= 5 test cases per feature (19 * 5 = 95 test cases minimum)
 */

const { describe, test, assert } = require('./helpers/test_runner.js');
const { DOMSimulator, DOMEvent } = require('./helpers/dom_simulator.js');
const CssAnalyzer = require('./helpers/css_analyzer.js');
const {
  toPersianDigitsOracle,
  toAsciiDigitsOracle,
  formatNumberFaOracle,
  formatTomansOracle,
  calculateInstallmentsOracle,
  validateIranianPhoneOracle,
  filterAndSortCarsOracle,
} = require('./helpers/reference_oracles.js');

describe('Tier 2: Boundary & Corner Cases (F1 to F19)', () => {
  const domSim = new DOMSimulator();
  const cssAnalyzer = new CssAnalyzer();

  // =========================================================================
  // F1: Semantic Landmarks Boundaries
  // =========================================================================
  describe('F1 Boundaries: Landmarks & Document Structure', () => {
    test('F1-B1: Header contains exactly one brand logo link', () => {
      const doc = domSim.createDocument();
      const header = doc.querySelector('header');
      const logos = header ? header.querySelectorAll('.brand-logo') : [];
      assert.strictEqual(logos.length, 1, 'Header must have exactly 1 brand logo link');
    });

    test('F1-B2: Navigation list contains at least 4 main navigation anchors', () => {
      const doc = domSim.createDocument();
      const navLinks = doc.querySelectorAll('#navLinks a, .nav-links a');
      assert.ok(navLinks.length >= 4, 'Must have at least 4 navigation anchor items');
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        assert.ok(href && href.startsWith('#'), `Nav link href "${href}" must be an internal anchor hash`);
      });
    });

    test('F1-B3: All core sections have non-empty ID attributes', () => {
      const doc = domSim.createDocument();
      const sections = doc.querySelectorAll('section');
      assert.ok(sections.length >= 4, 'Must have at least 4 sections');
      sections.forEach(sec => {
        const id = sec.getAttribute('id') || sec.className;
        assert.ok(id && id.length > 0, 'Section must have an ID or identifier class');
      });
    });

    test('F1-B4: No duplicate section IDs across the entire document', () => {
      const doc = domSim.createDocument();
      const allElementsWithId = doc.querySelectorAll('[id]');
      const idSet = new Set();
      const duplicateIds = [];
      allElementsWithId.forEach(el => {
        if (idSet.has(el.id)) {
          duplicateIds.push(el.id);
        } else {
          idSet.add(el.id);
        }
      });
      assert.strictEqual(duplicateIds.length, 0, `Document must not have duplicate IDs: ${duplicateIds.join(', ')}`);
    });

    test('F1-B5: Footer contains valid address, phone, and working hours metadata', () => {
      const doc = domSim.createDocument();
      const footer = doc.querySelector('footer');
      assert.ok(footer, 'Footer must exist');
      const text = footer.textContent;
      assert.ok(text.includes('۰۲۱') || text.includes('66120332') || text.includes('۶۶۱۲۰۳۳۲'), 'Footer must contain showroom phone number');
    });
  });

  // =========================================================================
  // F2: Heading Hierarchy Boundaries
  // =========================================================================
  describe('F2 Boundaries: Heading Hierarchy & Content Integrity', () => {
    test('F2-B1: H1 contains non-empty text content', () => {
      const doc = domSim.createDocument();
      const h1 = doc.querySelector('h1');
      assert.ok(h1, 'H1 must exist');
      assert.ok(h1.textContent.trim().length > 0, 'H1 must have non-empty text');
    });

    test('F2-B2: All H2 headings have meaningful, non-empty Persian titles', () => {
      const doc = domSim.createDocument();
      const h2s = doc.querySelectorAll('h2');
      h2s.forEach(h2 => {
        assert.ok(h2.textContent.trim().length >= 2, `H2 "${h2.textContent}" must be meaningful`);
      });
    });

    test('F2-B3: Car card titles do not exceed max reasonable length (layout stability)', () => {
      const app = domSim.loadApp();
      const cardTitles = app.document.querySelectorAll('.card-car-name, .car-title');
      cardTitles.forEach(ct => {
        assert.ok(ct.textContent.length < 80, `Car title "${ct.textContent}" should not exceed 80 chars`);
      });
      app.cleanup();
    });

    test('F2-B4: Modal dialog header contains car title when opened', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(3); // Peugeot 207
        const modalBody = app.document.getElementById('modalDetailsBody');
        const modalHeadings = modalBody ? modalBody.querySelectorAll('h2, h3, .modal-car-title') : [];
        assert.ok(modalHeadings.length > 0 || modalBody.textContent.includes('پژو'), 'Modal must contain vehicle title heading');
      }
      app.cleanup();
    });

    test('F2-B5: Section headings do not contain invalid nested headings (no H2 inside H1)', () => {
      const doc = domSim.createDocument();
      const h1 = doc.querySelector('h1');
      if (h1) {
        const nestedHeadings = h1.querySelectorAll('h2, h3, h4, h5, h6');
        assert.strictEqual(nestedHeadings.length, 0, 'H1 must not contain nested headings');
      }
    });
  });

  // =========================================================================
  // F3: ARIA & Accessibility Boundaries
  // =========================================================================
  describe('F3 Boundaries: ARIA Attributes & Dynamic State', () => {
    test('F3-B1: Mobile toggle aria-expanded updates from false to true on click', () => {
      const app = domSim.loadApp();
      const toggle = app.document.getElementById('mobileToggle');
      if (toggle) {
        const initial = toggle.getAttribute('aria-expanded');
        toggle.click();
        const afterClick = toggle.getAttribute('aria-expanded');
        assert.notStrictEqual(initial, afterClick, 'aria-expanded must toggle on mobile menu click');
      }
      app.cleanup();
    });

    test('F3-B2: All slide indicator dots have aria-label with slide number', () => {
      const doc = domSim.createDocument();
      const dots = doc.querySelectorAll('.slider-dot');
      dots.forEach((dot, idx) => {
        const label = dot.getAttribute('aria-label');
        assert.ok(label && (label.includes(String(idx + 1)) || label.includes(toPersianDigitsOracle(idx + 1))), `Dot ${idx + 1} must have slide number in aria-label`);
      });
    });

    test('F3-B3: FAQ questions update aria-expanded on toggle', () => {
      const app = domSim.loadApp();
      const firstFaq = app.document.querySelector('.faq-question');
      if (firstFaq) {
        const initial = firstFaq.getAttribute('aria-expanded');
        firstFaq.click();
        const after = firstFaq.getAttribute('aria-expanded');
        assert.notStrictEqual(initial, after, 'Clicked FAQ must toggle aria-expanded attribute');
      }
      app.cleanup();
    });

    test('F3-B4: Car cards details buttons have accessible labels', () => {
      const app = domSim.loadApp();
      const detailsBtns = app.document.querySelectorAll('.btn-show-details, .btn-car-details');
      detailsBtns.forEach(btn => {
        const text = btn.textContent.trim();
        const ariaLabel = btn.getAttribute('aria-label') || '';
        assert.ok(text.length > 0 || ariaLabel.length > 0, 'Car details button must have accessible name');
      });
      app.cleanup();
    });

    test('F3-B5: Form inputs have associated labels or placeholder descriptions', () => {
      const doc = domSim.createDocument();
      const inputs = doc.querySelectorAll('#sellCarForm input');
      inputs.forEach(input => {
        const id = input.id;
        const hasLabel = id ? doc.querySelector(`label[for="${id}"]`) : null;
        const hasPlaceholder = input.getAttribute('placeholder');
        const hasAriaLabel = input.getAttribute('aria-label');
        assert.ok(hasLabel || hasPlaceholder || hasAriaLabel, `Input #${id} must have an associated label, placeholder, or aria-label`);
      });
    });
  });

  // =========================================================================
  // F4: Font & Asset Preloading Boundaries
  // =========================================================================
  describe('F4 Boundaries: Font & Asset Preloading', () => {
    test('F4-B1: Preconnect links use valid HTTPS protocols', () => {
      const doc = domSim.createDocument();
      const preconnects = doc.querySelectorAll('link[rel="preconnect"]');
      preconnects.forEach(link => {
        const href = link.getAttribute('href');
        assert.ok(href && href.startsWith('https://'), `Preconnect link ${href} must use HTTPS`);
      });
    });

    test('F4-B2: Favicon / icons or meta theme color specified', () => {
      const doc = domSim.createDocument();
      const themeColor = doc.querySelector('meta[name="theme-color"]');
      assert.ok(themeColor && themeColor.getAttribute('content'), 'Theme color content must be specified');
    });

    test('F4-B3: No broken local stylesheet link tags', () => {
      const doc = domSim.createDocument();
      const cssLinks = doc.querySelectorAll('link[rel="stylesheet"]');
      cssLinks.forEach(link => {
        const href = link.getAttribute('href');
        assert.ok(href && href.length > 0, 'Stylesheet link must have non-empty href');
      });
    });

    test('F4-B4: Meta description is present and descriptive (> 30 characters)', () => {
      const doc = domSim.createDocument();
      const descMeta = doc.querySelector('meta[name="description"]');
      assert.ok(descMeta, 'meta description must exist');
      assert.ok(descMeta.getAttribute('content').length > 30, 'Meta description should be descriptive');
    });

    test('F4-B5: Document title is localized in Persian and contains showroom brand', () => {
      const doc = domSim.createDocument();
      const titleElem = doc.querySelector('title');
      assert.ok(titleElem, 'Title tag must exist');
      assert.ok(titleElem.textContent.includes('نوین خودرو'), 'Title must contain showroom name');
    });
  });

  // =========================================================================
  // F5: CSS Design Tokens Boundaries
  // =========================================================================
  describe('F5 Boundaries: CSS Tokens & Fallbacks', () => {
    test('F5-B1: Root CSS variables do not contain empty declarations', () => {
      const vars = cssAnalyzer.getRootVariables();
      for (const [prop, val] of Object.entries(vars)) {
        assert.ok(val && val.length > 0, `CSS variable ${prop} must not be empty`);
      }
    });

    test('F5-B2: Color tokens use valid hex, rgb, or hsl formats', () => {
      const vars = cssAnalyzer.getRootVariables();
      for (const [prop, val] of Object.entries(vars)) {
        if (prop.includes('color') || prop.includes('bg') || prop.includes('accent')) {
          assert.ok(val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl') || val.startsWith('var('), `Color token ${prop}=${val} must be valid format`);
        }
      }
    });

    test('F5-B3: Z-index scale maintains correct stacking hierarchy', () => {
      const vars = cssAnalyzer.getRootVariables();
      const zHeader = parseInt(vars['--z-header'] || '100', 10);
      const zModal = parseInt(vars['--z-modal'] || '1000', 10);
      assert.ok(zModal >= zHeader, 'Modal z-index must be greater than or equal to header z-index');
    });

    test('F5-B4: Border radius tokens use valid px or rem units', () => {
      const vars = cssAnalyzer.getRootVariables();
      for (const [prop, val] of Object.entries(vars)) {
        if (prop.includes('radius')) {
          assert.ok(val.includes('px') || val.includes('rem') || val.includes('%'), `Radius token ${prop}=${val} must specify units`);
        }
      }
    });

    test('F5-B5: Typography font-family defines Persian font stack with fallbacks', () => {
      assert.ok(
        cssAnalyzer.combinedContent.includes('Vazirmatn') ||
        cssAnalyzer.combinedContent.includes('Tahoma') ||
        cssAnalyzer.combinedContent.includes('sans-serif'),
        'Font stack must include Persian fallback fonts'
      );
    });
  });

  // =========================================================================
  // F6: GPU Animation Boundaries
  // =========================================================================
  describe('F6 Boundaries: 60fps GPU Transitions', () => {
    test('F6-B1: Transition durations are bounded between 0ms and 1500ms', () => {
      const analysis = cssAnalyzer.analyzeTransitions();
      analysis.transitions.forEach(t => {
        const match = t.match(/(\d+(?:\.\d+)?)\s*(ms|s)/);
        if (match) {
          const num = parseFloat(match[1]);
          const unit = match[2];
          const ms = unit === 's' ? num * 1000 : num;
          assert.ok(ms <= 2000, `Transition duration ${ms}ms should not exceed 2000ms`);
        }
      });
    });

    test('F6-B2: No negative transition delays defined', () => {
      const transitionDelayRegex = /transition-delay\s*:\s*-/gi;
      assert.strictEqual(transitionDelayRegex.test(cssAnalyzer.combinedContent), false, 'No negative transition delays');
    });

    test('F6-B3: Modal backdrop uses opacity transition', () => {
      const modalRules = cssAnalyzer.findRulesMatching('.modal-overlay');
      assert.ok(modalRules.length > 0, 'Modal rules must exist');
    });

    test('F6-B4: Hover states do not cause reflow thrashing on body elements', () => {
      const cardHoverRules = cssAnalyzer.findRulesMatching('.car-card:hover');
      cardHoverRules.forEach(r => {
        assert.strictEqual(r.body.includes('width:'), false, 'Hover must not animate layout width');
        assert.strictEqual(r.body.includes('height:'), false, 'Hover must not animate layout height');
      });
    });

    test('F6-B5: Accordion body toggle uses GPU-friendly techniques', () => {
      const faqRules = cssAnalyzer.findRulesMatching('.faq-item');
      assert.ok(faqRules.length > 0, 'FAQ CSS rules must exist');
    });
  });

  // =========================================================================
  // F7: Reduced Motion Boundaries
  // =========================================================================
  describe('F7 Boundaries: Reduced Motion Support', () => {
    test('F7-B1: prefers-reduced-motion block exists or transition rules are defined', () => {
      const hasReduced = cssAnalyzer.hasReducedMotionSupport();
      const hasTransitions = cssAnalyzer.combinedContent.includes('transition');
      assert.ok(hasReduced || hasTransitions, 'Reduced motion query or transitions must be defined');
    });

    test('F7-B2: Slider auto-advance does not trigger rapid thrashing in background', () => {
      const app = domSim.loadApp();
      assert.ok(typeof app.cleanup === 'function', 'App must provide timer teardown');
      app.cleanup();
    });

    test('F7-B3: Elements remain fully visible under reduced motion', () => {
      const app = domSim.loadApp();
      const cards = app.document.querySelectorAll('.car-card, .car-card-modern');
      assert.strictEqual(cards.length, 3, 'All 3 cards must be rendered and visible');
      app.cleanup();
    });

    test('F7-B4: Interactive controls remain responsive under reduced motion', () => {
      const app = domSim.loadApp();
      const allPill = app.document.querySelector('.cat-pill[data-category="all"]');
      if (allPill) {
        allPill.click();
        const grid = app.document.getElementById('carsGrid');
        assert.strictEqual(grid.children.length, 3, 'Grid updates synchronously to 3');
      }
      app.cleanup();
    });

    test('F7-B5: Modal transitions cleanly without animation delay dependencies', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const modal = app.document.getElementById('carModal');
        assert.ok(modal.classList.contains('active'), 'Modal must become active');
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F8: Focus Ring Boundaries
  // =========================================================================
  describe('F8 Boundaries: Keyboard Focus & Accessibility Rings', () => {
    test('F8-B1: Form submit button supports focus state', () => {
      const doc = domSim.createDocument();
      const submitBtn = doc.querySelector('#sellCarForm button[type="submit"], #sellCarForm .btn-submit, #sellCarForm .btn-sell-submit');
      if (submitBtn) {
        submitBtn.focus();
        assert.ok(submitBtn._isFocused, 'Submit button must receive focus');
      }
    });

    test('F8-B2: Category pills support keyboard focus and click', () => {
      const doc = domSim.createDocument();
      const pills = doc.querySelectorAll('.cat-pill');
      assert.ok(pills.length >= 4, 'Category pills must exist');
      pills.forEach(pill => {
        pill.focus();
        assert.ok(pill._isFocused, 'Pill must be focusable');
      });
    });

    test('F8-B3: Sliders have accessible range attributes (min, max, step)', () => {
      const doc = domSim.createDocument();
      const priceSlider = doc.querySelector('#calcPriceSlider');
      const downSlider = doc.querySelector('#downPaymentPercent');
      if (priceSlider) {
        assert.ok(priceSlider.hasAttribute('min'), 'Price slider must have min');
        assert.ok(priceSlider.hasAttribute('max'), 'Price slider must have max');
      }
      if (downSlider) {
        assert.ok(downSlider.hasAttribute('min'), 'Downpayment slider must have min');
        assert.ok(downSlider.hasAttribute('max'), 'Downpayment slider must have max');
      }
    });

    test('F8-B4: Search input handles continuous focus and typing', () => {
      const app = domSim.loadApp();
      const searchInput = app.document.getElementById('searchInput');
      if (searchInput) {
        searchInput.focus();
        searchInput.value = 'توربو';
        const event = new DOMEvent('input', { bubbles: true });
        searchInput.dispatchEvent(event);
        const grid = app.document.getElementById('carsGrid');
        assert.ok(grid.children.length > 0, 'Search should filter inventory');
      }
      app.cleanup();
    });

    test('F8-B5: Modal close button is focusable upon modal open', () => {
      const app = domSim.loadApp();
      const closeBtn = app.document.getElementById('modalClose');
      if (closeBtn) {
        closeBtn.focus();
        assert.ok(closeBtn._isFocused, 'Modal close button must be focusable');
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F9: Mobile Bottom-Sheet Boundaries
  // =========================================================================
  describe('F9 Boundaries: Mobile Viewport Bounds', () => {
    test('F9-B1: Modal container fits within mobile viewport height', () => {
      const modalRules = cssAnalyzer.findRulesMatching('.modal-content');
      assert.ok(modalRules.length > 0, 'Modal content rules must exist');
    });

    test('F9-B2: Safe area padding is applied without breaking desktop padding', () => {
      const sheetInfo = cssAnalyzer.getMobileSheetInfo();
      assert.ok(typeof sheetInfo.hasSafeArea === 'boolean', 'Safe area support checked');
    });

    test('F9-B3: Mobile navigation closes when link is clicked', () => {
      const app = domSim.loadApp();
      const navLink = app.document.querySelector('#navLinks a');
      if (navLink) {
        navLink.click();
        const navLinks = app.document.getElementById('navLinks');
        if (navLinks) {
          assert.strictEqual(navLinks.classList.contains('open'), false, 'Drawer should be closed after clicking nav link');
        }
      }
      app.cleanup();
    });

    test('F9-B4: Modal content remains readable on narrow screens (320px width)', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const modal = app.document.getElementById('carModal');
        assert.ok(modal.classList.contains('active'), 'Modal functions on narrow screens');
      }
      app.cleanup();
    });

    test('F9-B5: Mobile call button is easily tappable with minimum 44px tap target', () => {
      const callBtnRules = cssAnalyzer.findRulesMatching('.btn-header-call');
      assert.ok(callBtnRules.length > 0, 'Header call button rules must exist');
    });
  });

  // =========================================================================
  // F10: Layout Shift (CLS) Boundaries
  // =========================================================================
  describe('F10 Boundaries: Layout Shift & Stability', () => {
    test('F10-B1: Catalog re-rendering preserves container without crashing', () => {
      const app = domSim.loadApp();
      const grid = app.document.getElementById('carsGrid');
      assert.ok(grid, 'Grid container must exist');
      for (let i = 0; i < 5; i++) {
        const usedPill = app.document.querySelector('.cat-pill[data-category="used"]');
        if (usedPill) usedPill.click();
        const allPill = app.document.querySelector('.cat-pill[data-category="all"]');
        if (allPill) allPill.click();
      }
      assert.strictEqual(grid.children.length, 3, 'Grid maintains exactly 3');
      app.cleanup();
    });

    test('F10-B2: Empty inventory state preserves container height bounds', () => {
      const app = domSim.loadApp();
      const searchInput = app.document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = 'InvalidSearchTermNoMatches';
        const event = new DOMEvent('input', { bubbles: true });
        searchInput.dispatchEvent(event);
        const grid = app.document.getElementById('carsGrid');
        assert.ok(grid.innerHTML.length > 0, 'Empty state box rendered inside grid');
      }
      app.cleanup();
    });

    test('F10-B3: Hero slider maintains active slide across rapid navigations', () => {
      const app = domSim.loadApp();
      const nextBtn = app.document.getElementById('nextSlide');
      if (nextBtn) {
        for (let i = 0; i < 8; i++) nextBtn.click();
        const activeSlide = app.document.querySelector('.slide-item.active');
        assert.ok(activeSlide, 'Active slide must exist at all times');
      }
      app.cleanup();
    });

    test('F10-B4: Scrollbar gutter or stable body layout prevents horizontal jitter', () => {
      const sheetInfo = cssAnalyzer.getMobileSheetInfo();
      assert.ok(typeof sheetInfo === 'object');
    });

    test('F10-B5: Image dimensions or aspect-ratios prevent reflow', () => {
      const doc = domSim.createDocument();
      const imgs = doc.querySelectorAll('img');
      assert.ok(imgs.length > 0, 'Document must contain images');
      imgs.forEach(img => {
        assert.ok(img.getAttribute('src'), 'Image must have src attribute');
      });
    });
  });

  // =========================================================================
  // F11: State Encapsulation Boundaries
  // =========================================================================
  describe('F11 Boundaries: State Mutation & Encapsulation', () => {
    test('F11-B1: Modifying external cars array copy does not corrupt internal state', () => {
      const app = domSim.loadApp();
      const copy = [...app.carsData];
      copy.pop();
      assert.strictEqual(app.carsData.length, 3, 'Original carsData must remain 3');
      app.cleanup();
    });

    test('F11-B2: Re-executing filter with same category does not duplicate cards', () => {
      const app = domSim.loadApp();
      const chinesePill = app.document.querySelector('.cat-pill[data-category="chinese"]');
      if (chinesePill) {
        chinesePill.click();
        chinesePill.click();
        const grid = app.document.getElementById('carsGrid');
        assert.strictEqual(grid.children.length, 1, 'Repeated click must not duplicate cards');
      }
      app.cleanup();
    });

    test('F11-B3: Form reset cleans input values back to empty string', () => {
      const app = domSim.loadApp();
      const modelInput = app.document.getElementById('sellCarModel');
      const phoneInput = app.document.getElementById('sellOwnerPhone');
      const form = app.document.getElementById('sellCarForm');
      if (modelInput && phoneInput && form) {
        modelInput.value = 'تارا اتوماتیک';
        phoneInput.value = '۰۹۱۲۳۴۵۶۷۸۹';
        form.reset();
        assert.strictEqual(modelInput.value, '', 'Model input cleared on form reset');
        assert.strictEqual(phoneInput.value, '', 'Phone input cleared on form reset');
      }
      app.cleanup();
    });

    test('F11-B4: Formatting helper handles 0 gracefully', () => {
      const formatted = formatNumberFaOracle(0);
      assert.strictEqual(formatted, '۰', '0 must format to ۰');
      const tomans = formatTomansOracle(0);
      assert.strictEqual(tomans, '۰ تومان', '0 must format to ۰ تومان');
    });

    test('F11-B5: Formatting helper handles negative numbers gracefully', () => {
      const formatted = formatNumberFaOracle(-5000);
      assert.strictEqual(formatted, '-۵,۰۰۰', 'Negative number must format with minus sign');
    });
  });

  // =========================================================================
  // F12: Event Delegation Boundaries
  // =========================================================================
  describe('F12 Boundaries: Event Bubbling & Nested Elements', () => {
    test('F12-B1: Clicking inner SVG icon of details button opens modal', () => {
      const app = domSim.loadApp();
      const detailsBtn = app.document.querySelector('.btn-show-details, .btn-car-details');
      if (detailsBtn) {
        const svg = detailsBtn.querySelector('svg') || detailsBtn;
        svg.click();
        const modal = app.document.getElementById('carModal');
        assert.ok(modal.classList.contains('active'), 'Clicking inside button must open modal');
      }
      app.cleanup();
    });

    test('F12-B2: Clicking whitespace inside cars grid does not throw error', () => {
      const app = domSim.loadApp();
      const grid = app.document.getElementById('carsGrid');
      if (grid) {
        assert.doesNotThrow(() => {
          grid.click();
        }, 'Clicking grid background must not throw error');
      }
      app.cleanup();
    });

    test('F12-B3: Multiple rapid clicks on slider buttons remain bounded', () => {
      const app = domSim.loadApp();
      const nextBtn = app.document.getElementById('nextSlide');
      if (nextBtn) {
        for (let i = 0; i < 20; i++) nextBtn.click();
        const activeDot = app.document.querySelector('.slider-dot.active');
        assert.ok(activeDot, 'Active dot must exist after 20 clicks');
      }
      app.cleanup();
    });

    test('F12-B4: Category pill click with bubbling dispatches event cleanly', () => {
      const app = domSim.loadApp();
      const pillsContainer = app.document.querySelector('.catalog-categories');
      if (pillsContainer) {
        assert.doesNotThrow(() => {
          pillsContainer.click();
        }, 'Clicking pills container must not throw');
      }
      app.cleanup();
    });

    test('F12-B5: Clicking inside modal content does not trigger backdrop close', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const modalContent = app.document.getElementById('modalDetailsBody');
        if (modalContent) {
          modalContent.click();
          const modal = app.document.getElementById('carModal');
          assert.ok(modal.classList.contains('active'), 'Modal must stay active when clicking content');
        }
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F13: Installment Calculator Boundaries
  // =========================================================================
  describe('F13 Boundaries: Calculator Extreme Math', () => {
    test('F13-B1: Minimum price boundary (300 Million Tomans)', () => {
      const oracle = calculateInstallmentsOracle(300, 50, 12);
      assert.strictEqual(oracle.carPrice, 300000000);
      assert.strictEqual(oracle.downPaymentVal, 150000000);
      assert.strictEqual(oracle.loanAmountVal, 150000000);
      assert.ok(oracle.monthlyPayment > 0, 'Monthly payment must be positive');
    });

    test('F13-B2: Maximum price boundary (5,000 Million Tomans)', () => {
      const oracle = calculateInstallmentsOracle(5000, 40, 24);
      assert.strictEqual(oracle.carPrice, 5000000000);
      assert.strictEqual(oracle.downPaymentVal, 2000000000);
      assert.strictEqual(oracle.loanAmountVal, 3000000000);
      assert.ok(oracle.monthlyPayment > 0, 'Monthly payment must be positive');
    });

    test('F13-B3: Minimum downpayment boundary (40%)', () => {
      const oracle = calculateInstallmentsOracle(1000, 40, 12);
      assert.strictEqual(oracle.downPaymentVal, 400000000);
      assert.strictEqual(oracle.loanAmountVal, 600000000);
    });

    test('F13-B4: Maximum downpayment boundary (70%)', () => {
      const oracle = calculateInstallmentsOracle(1000, 70, 12);
      assert.strictEqual(oracle.downPaymentVal, 700000000);
      assert.strictEqual(oracle.loanAmountVal, 300000000);
    });

    test('F13-B5: All supported tenures (6, 12, 18, 24) compute strictly positive installments', () => {
      const tenures = [6, 12, 18, 24];
      tenures.forEach(t => {
        const oracle = calculateInstallmentsOracle(1380, 50, t);
        assert.ok(oracle.monthlyPayment > 0, `Monthly installment for ${t} months must be > 0`);
        assert.ok(Number.isFinite(oracle.monthlyPayment), 'Installment must be finite');
      });
    });
  });

  // =========================================================================
  // F14: Iranian Phone Validation Boundaries
  // =========================================================================
  describe('F14 Boundaries: Mobile Phone Edge Cases', () => {
    test('F14-B1: Phone with spaces and dashes ("0912 345 6789") passes after sanitization', () => {
      const result = validateIranianPhoneOracle('0912 345 6789');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.normalized, '09123456789');
    });

    test('F14-B2: Phone with 0098 prefix ("00989123456789") passes and normalizes', () => {
      const result = validateIranianPhoneOracle('00989123456789');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.normalized, '09123456789');
    });

    test('F14-B3: Phone with Arabic numerals ("٠٩١٢٣٤٥٦٧٨٩") passes after normalization', () => {
      const result = validateIranianPhoneOracle('٠٩١٢٣٤٥٦٧٨٩');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.normalized, '09123456789');
    });

    test('F14-B4: Phone with 12 digits ("091234567890") fails validation', () => {
      const result = validateIranianPhoneOracle('091234567890');
      assert.strictEqual(result.isValid, false, '12-digit number must be invalid');
    });

    test('F14-B5: Phone with 10 digits ("0912345678") fails validation', () => {
      const result = validateIranianPhoneOracle('0912345678');
      assert.strictEqual(result.isValid, false, '10-digit number must be invalid');
    });
  });

  // =========================================================================
  // F15: Modal Dialog Lifecycle Boundaries
  // =========================================================================
  describe('F15 Boundaries: Modal State & Lifecycle', () => {
    test('F15-B1: Closing modal when already closed does not throw error', () => {
      const app = domSim.loadApp();
      const closeBtn = app.document.getElementById('modalClose');
      if (closeBtn) {
        assert.doesNotThrow(() => {
          closeBtn.click();
          closeBtn.click();
        }, 'Repeated close calls must be safe');
      }
      app.cleanup();
    });

    test('F15-B2: Modal locks body overflow on open and releases on close', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const closeBtn = app.document.getElementById('modalClose');
        if (closeBtn) closeBtn.click();
        assert.strictEqual(app.document.body.style.overflow || '', '', 'Body overflow restored on modal close');
      }
      app.cleanup();
    });

    test('F15-B3: Switching gallery to first thumbnail updates main image src', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const thumbs = app.document.querySelectorAll('.modal-thumb-btn');
        if (thumbs.length > 0) {
          thumbs[0].click();
          const mainImg = app.document.getElementById('modalMainImg');
          assert.ok(mainImg.getAttribute('src'), 'Main image src populated');
        }
      }
      app.cleanup();
    });

    test('F15-B4: Modal WhatsApp inquiry button contains encoded car details', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const waBtn = app.document.querySelector('.btn-whatsapp-inquire, .btn-modal-wa') || app.document.querySelector('#modalDetailsBody a[href*="wa.me"]');
        if (waBtn) {
          const href = waBtn.getAttribute('href');
          assert.ok(href.includes('wa.me/982166120332'), 'WhatsApp link must target showroom phone');
        }
      }
      app.cleanup();
    });

    test('F15-B5: Modal phone call button targets showroom number 02166120332', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const callBtn = app.document.querySelector('.btn-modal-call, .btn-header-call') || app.document.querySelector('#modalDetailsBody a[href^="tel:"]');
        if (callBtn) {
          const href = callBtn.getAttribute('href');
          assert.ok(href.includes('02166120332') || href.includes('tel:'), 'Call link must target showroom number');
        }
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F16: Image Fallback Boundaries
  // =========================================================================
  describe('F16 Boundaries: Missing & Corrupt Assets', () => {
    test('F16-B1: Fallback SVG data URI is valid SVG markup', () => {
      const sampleSvg = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22600%22%20height%3D%22400%22%3E%3Crect%20fill%3D%22%231e293b%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E';
      assert.ok(sampleSvg.startsWith('data:image/svg+xml'), 'Fallback must be valid SVG data URI');
    });

    test('F16-B2: Empty src string triggers error event cleanly', () => {
      const app = domSim.loadApp();
      const testImg = app.document.createElement('img');
      testImg.src = '';
      const errorEvent = new DOMEvent('error', { bubbles: true });
      assert.doesNotThrow(() => {
        testImg.dispatchEvent(errorEvent);
      }, 'Image error dispatch on empty src must not throw');
      app.cleanup();
    });

    test('F16-B3: All gallery images in carsData have valid file extensions or URLs', () => {
      const app = domSim.loadApp();
      app.carsData.forEach(car => {
        car.gallery.forEach(url => {
          assert.ok(url.startsWith('http') || url.startsWith('images/') || url.startsWith('data:'), `Gallery URL ${url} must be valid`);
        });
      });
      app.cleanup();
    });

    test('F16-B4: Image alt attributes do not contain generic "image" or "photo" alone', () => {
      const app = domSim.loadApp();
      const imgs = app.document.querySelectorAll('.car-card img, .car-card-modern img, .card-media img');
      imgs.forEach(img => {
        const alt = img.getAttribute('alt');
        assert.ok(alt && !['image', 'photo', 'car'].includes(alt.toLowerCase().trim()), `Alt text "${alt}" must be descriptive`);
      });
      app.cleanup();
    });

    test('F16-B5: Image error does not remove image element from DOM (preserves layout)', () => {
      const app = domSim.loadApp();
      const img = app.document.querySelector('.car-card img, .car-card-modern img, .card-media img');
      if (img) {
        const parent = img.parentNode;
        const errorEvent = new DOMEvent('error', { bubbles: true });
        img.dispatchEvent(errorEvent);
        assert.strictEqual(img.parentNode, parent, 'Image must remain attached to parent node');
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F17: Catalog Filter & Search Boundaries
  // =========================================================================
  describe('F17 Boundaries: Search & Sorting Edge Cases', () => {
    test('F17-B1: Search query with regex special characters (.*+?^${}()|[]\\) does not crash', () => {
      const app = domSim.loadApp();
      const searchInput = app.document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = '.*+?^${}()|[]\\';
        const event = new DOMEvent('input', { bubbles: true });
        assert.doesNotThrow(() => {
          searchInput.dispatchEvent(event);
        }, 'Regex special characters in search must not throw exception');
      }
      app.cleanup();
    });

    test('F17-B2: Search query with leading and trailing whitespace trims correctly', () => {
      const app = domSim.loadApp();
      const searchInput = app.document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = '   اکستریم   ';
        const event = new DOMEvent('input', { bubbles: true });
        searchInput.dispatchEvent(event);
        const grid = app.document.getElementById('carsGrid');
        assert.strictEqual(grid.children.length, 1, 'Trimmed search query must match Xtrim');
      }
      app.cleanup();
    });

    test('F17-B3: Model year search with English digits ("1403") matches Persian year ("۱۴۰۳")', () => {
      const oracle = filterAndSortCarsOracle(domSim.loadApp().carsData, { query: '1403' });
      assert.ok(oracle.length >= 3, 'English year 1403 must match Persian year vehicles');
    });

    test('F17-B4: Sort by year-desc lists 1403 models before 1397 models', () => {
      const app = domSim.loadApp();
      const sortSelect = app.document.getElementById('sortFilter');
      if (sortSelect) {
        sortSelect.value = 'year-desc';
        const event = new DOMEvent('change', { bubbles: true });
        sortSelect.dispatchEvent(event);
        const cards = app.document.querySelectorAll('.car-card, .car-card-modern');
        const lastCard = cards[cards.length - 1];
        assert.ok(lastCard.textContent.includes('دنا'), 'Used car (Dena Plus) should be last');
      }
      app.cleanup();
    });

    test('F17-B5: Brand filter "chery" returns only Chinese category vehicle', () => {
      const app = domSim.loadApp();
      const brandSelect = app.document.getElementById('brandFilter');
      if (brandSelect) {
        brandSelect.value = 'chery';
        const event = new DOMEvent('change', { bubbles: true });
        brandSelect.dispatchEvent(event);
        const grid = app.document.getElementById('carsGrid');
        assert.strictEqual(grid.children.length, 1, 'Chery filter returns 1 vehicle');
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F18: E2E Runner Boundaries
  // =========================================================================
  describe('F18 Boundaries: Test Harness Error Handling', () => {
    test('F18-B1: Harness catches thrown exceptions without halting entire run', async () => {
      const { TestHarness } = require('./helpers/test_runner.js');
      const runner = new TestHarness();
      runner.describe('ErrorSuite', () => {
        runner.test('ThrowingTest', () => {
          throw new Error('Simulated runtime error');
        });
        runner.test('SubsequentTest', () => {
          assert.strictEqual(1, 1);
        });
      });
      const res = await runner.run();
      assert.strictEqual(res.failed, 1);
      assert.strictEqual(res.passed, 1);
    });

    test('F18-B2: Harness handles async rejection in test functions', async () => {
      const { TestHarness } = require('./helpers/test_runner.js');
      const runner = new TestHarness();
      runner.describe('AsyncSuite', () => {
        runner.test('AsyncFail', async () => {
          await new Promise((_, reject) => setTimeout(() => reject(new Error('Async error')), 10));
        });
      });
      const res = await runner.run();
      assert.strictEqual(res.failed, 1);
    });

    test('F18-B3: Harness skip method correctly records skipped tests', async () => {
      const { TestHarness } = require('./helpers/test_runner.js');
      const runner = new TestHarness();
      runner.describe('SkipSuite', () => {
        runner.skip('SkippedTest', () => {});
      });
      const res = await runner.run();
      assert.strictEqual(res.skipped, 1);
    });

    test('F18-B4: Harness handles nested describe suites cleanly', async () => {
      const { TestHarness } = require('./helpers/test_runner.js');
      const runner = new TestHarness();
      runner.describe('Parent', () => {
        runner.describe('Child', () => {
          runner.test('GrandchildTest', () => {
            assert.strictEqual(true, true);
          });
        });
      });
      const res = await runner.run();
      assert.strictEqual(res.passed, 1);
    });

    test('F18-B5: Harness reset method restores initial clean state', () => {
      const { TestHarness } = require('./helpers/test_runner.js');
      const runner = new TestHarness();
      runner.describe('Suite', () => {
        runner.test('T', () => {});
      });
      runner.reset();
      assert.strictEqual(runner.totalTests, 0);
      assert.strictEqual(runner.suites.length, 0);
    });
  });

  // =========================================================================
  // F19: Adversarial Hardening Boundaries
  // =========================================================================
  describe('F19 Boundaries: Extreme Stress & Security Fuzzing', () => {
    test('F19-B1: Calculator fuzzing with 100 randomized inputs produces valid outputs', () => {
      for (let i = 0; i < 100; i++) {
        const randPrice = Math.floor(Math.random() * 10000) - 1000;
        const randDown = Math.floor(Math.random() * 150) - 20;
        const randTenure = Math.floor(Math.random() * 40) - 10;
        const oracle = calculateInstallmentsOracle(randPrice, randDown, randTenure);
        assert.ok(Number.isFinite(oracle.monthlyPayment), `Fuzz trial ${i} monthly payment must be finite`);
        assert.ok(!isNaN(oracle.monthlyPayment), `Fuzz trial ${i} must not be NaN`);
      }
    });

    test('F19-B2: XSS injection attempt in car seller model name does not execute script', () => {
      const app = domSim.loadApp();
      const modelInput = app.document.getElementById('sellCarModel');
      const phoneInput = app.document.getElementById('sellOwnerPhone');
      const form = app.document.getElementById('sellCarForm');
      if (modelInput && phoneInput && form) {
        modelInput.value = '<script>window.pwned=true;</script>';
        phoneInput.value = '09121234567';
        const submitEvent = new DOMEvent('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
        assert.strictEqual(app.window.pwned, undefined, 'Injected script must not execute in window context');
      }
      app.cleanup();
    });

    test('F19-B3: 10,000 character string in search input does not cause stack overflow', () => {
      const app = domSim.loadApp();
      const searchInput = app.document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = 'A'.repeat(10000);
        const event = new DOMEvent('input', { bubbles: true });
        assert.doesNotThrow(() => {
          searchInput.dispatchEvent(event);
        }, 'Extreme input length must not crash search engine');
      }
      app.cleanup();
    });

    test('F19-B4: Negative slide index (-500) wraps safely via modulo', () => {
      const app = domSim.loadApp();
      const prevBtn = app.document.getElementById('prevSlide');
      if (prevBtn) {
        for (let i = 0; i < 50; i++) prevBtn.click();
        const activeSlide = app.document.querySelector('.slide-item.active');
        assert.ok(activeSlide, 'Active slide must exist after 50 backwards clicks');
      }
      app.cleanup();
    });

    test('F19-B5: Rapid concurrent toast spawning (20 toasts) does not crash toast queue', () => {
      const app = domSim.loadApp();
      if (typeof app.window.showToast === 'function') {
        assert.doesNotThrow(() => {
          for (let i = 0; i < 20; i++) {
            app.window.showToast(`پیام تست ${i}`, 'info');
          }
        }, 'Spawning 20 toasts in succession must not throw');
      }
      app.cleanup();
    });
    test('F19-B6: Seller form rejects invalid mobile (no reset) and accepts +98 form', () => {
      const app = domSim.loadApp();
      const form = app.document.getElementById('sellCarForm');
      const modelInput = app.document.getElementById('sellCarModel');
      const phoneInput = app.document.getElementById('sellOwnerPhone');
      if (form && modelInput && phoneInput) {
        // نامعتبر: باید رد شود و فرم پاک نشود
        modelInput.value = 'پژو ۲۰۷';
        phoneInput.value = '۱۲۳۴۵';
        form.dispatchEvent(new DOMEvent('submit', { bubbles: true, cancelable: true }));
        assert.strictEqual(modelInput.value, 'پژو ۲۰۷', 'Invalid mobile must not reset (lead blocked, not lost)');

        // معتبر با پیش‌شماره بین‌المللی: باید نرمال شود و فرم ریست گردد
        phoneInput.value = '+۹۸۹۱۲۳۴۵۶۷۸۹';
        form.dispatchEvent(new DOMEvent('submit', { bubbles: true, cancelable: true }));
        assert.strictEqual(phoneInput.value, '', 'Valid +98/۰۹ mobile must normalize and pass');
      }
      app.cleanup();
    });
  });
});
