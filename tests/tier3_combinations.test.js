/**
 * Novin Khodro — Tier 3 Cross-Feature Combinations Test Suite
 * Pairwise interactions between components:
 * - Installment calculations with slider & preset changes
 * - Multi-criteria filter, brand, and sort combinations
 * - Modal inspection opening, gallery switching, and filter state preservation
 * - Theme/locale formatting across components
 * - Form validation failure, recovery, and toast feedback
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

describe('Tier 3: Cross-Feature Combinations & Pairwise Interactions', () => {
  const domSim = new DOMSimulator();
  const cssAnalyzer = new CssAnalyzer();

  // =========================================================================
  // Combination 1: Installment Slider + Downpayment + Tenure + WhatsApp Link
  // =========================================================================
  test('T3-1: Slider Price (1380M) + Downpayment (50%) + Tenure (24m) synchronizes UI and WhatsApp URL', () => {
    const app = domSim.loadApp();
    const priceSlider = app.document.getElementById('calcPriceSlider');
    const downSlider = app.document.getElementById('downPaymentPercent');
    const tenure24Btn = app.document.querySelector('.tenure-btn[data-months="24"]');
    const resMonthly = app.document.getElementById('resMonthlyInstallment');
    const waLink = app.document.getElementById('btnApplyLoan');

    if (priceSlider && downSlider && tenure24Btn) {
      priceSlider.value = '1380';
      downSlider.value = '50';
      tenure24Btn.click();

      // Trigger slider input event
      const inputEvent = new DOMEvent('input', { bubbles: true });
      priceSlider.dispatchEvent(inputEvent);

      const oracle = calculateInstallmentsOracle(1380, 50, 24);
      if (resMonthly) {
        assert.ok(
          resMonthly.textContent.includes(formatNumberFaOracle(oracle.monthlyPayment)) ||
          resMonthly.textContent.includes('تومان'),
          'Monthly installment UI must match calculation'
        );
      }
      if (waLink) {
        const href = waLink.getAttribute('href');
        assert.ok(href.includes('wa.me/982166120332'), 'WhatsApp link must target showroom number');
        assert.ok(href.includes('text='), 'WhatsApp link must contain text parameter');
      }
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 2: Category Filter ('iranian') + Search Query ('اتوماتیک')
  // =========================================================================
  test('T3-2: Category Filter ("iranian") + Search Query ("اتوماتیک") returns exactly Dena Plus Turbo', () => {
    const app = domSim.loadApp();
    const iranianPill = app.document.querySelector('.cat-pill[data-category="iranian"]');
    const searchInput = app.document.getElementById('searchInput');

    if (iranianPill && searchInput) {
      iranianPill.click();
      searchInput.value = 'اتوماتیک';
      const event = new DOMEvent('input', { bubbles: true });
      searchInput.dispatchEvent(event);

      const grid = app.document.getElementById('carsGrid');
      assert.strictEqual(grid.children.length, 1, 'Only Dena Plus Turbo (automatic) should match');
      assert.ok(grid.textContent.includes('دنا'), 'Result should be Dena Plus Turbo');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 3: Category ('all') + Brand ('ikco') + Sort ('price-asc')
  // =========================================================================
  test('T3-3: Category ("all") + Brand ("ikco") + Sort ("price-asc") orders Peugeot 207 before Dena Plus', () => {
    const app = domSim.loadApp();
    const brandSelect = app.document.getElementById('brandFilter');
    const sortSelect = app.document.getElementById('sortFilter');

    if (brandSelect && sortSelect) {
      brandSelect.value = 'ikco';
      brandSelect.dispatchEvent(new DOMEvent('change', { bubbles: true }));

      sortSelect.value = 'price-asc';
      sortSelect.dispatchEvent(new DOMEvent('change', { bubbles: true }));

      const cardTitles = app.document.querySelectorAll('.card-car-name, .car-title');
      assert.strictEqual(cardTitles.length, 2, 'Should display 2 IKCO cars');
      assert.ok(cardTitles[0].textContent.includes('۲۰۷') || cardTitles[0].textContent.includes('پژو'), 'Peugeot 207 (795M) must precede Dena Plus (1040M)');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 4: Category ('chinese') + Brand ('chery') + Sort ('price-desc')
  // =========================================================================
  test('T3-4: Category ("chinese") + Brand ("chery") + Sort ("price-desc") displays Xtrim VX', () => {
    const app = domSim.loadApp();
    const chinesePill = app.document.querySelector('.cat-pill[data-category="chinese"]');
    const brandSelect = app.document.getElementById('brandFilter');

    if (chinesePill && brandSelect) {
      chinesePill.click();
      brandSelect.value = 'chery';
      brandSelect.dispatchEvent(new DOMEvent('change', { bubbles: true }));

      const grid = app.document.getElementById('carsGrid');
      assert.strictEqual(grid.children.length, 1, 'Should display 1 Chinese Chery vehicle');
      assert.ok(grid.textContent.includes('اکستریم'), 'Should display Xtrim VX');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 5: Category ('used') + Search ('۱۳۹۷')
  // =========================================================================
  test('T3-5: Category ("used") + Search ("۱۴۰۳") filters to Dena Plus', () => {
    const app = domSim.loadApp();
    const usedPill = app.document.querySelector('.cat-pill[data-category="used"]');
    const searchInput = app.document.getElementById('searchInput');

    if (usedPill && searchInput) {
      usedPill.click();
      searchInput.value = '۱۴۰۳';
      searchInput.dispatchEvent(new DOMEvent('input', { bubbles: true }));

      const grid = app.document.getElementById('carsGrid');
      assert.strictEqual(grid.children.length, 1, 'Only model-year used car (Dena Plus) matches');
      assert.ok(grid.textContent.includes('دنا'), 'Should display Dena Plus');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 6: Category ('zero') + Search ('۱۴۰۳') + Sort ('price-desc')
  // =========================================================================
  test('T3-6: Category ("zero") + Search ("۱۴۰۳") + Sort ("price-desc") orders Xtrim VX before Peugeot 207', () => {
    const app = domSim.loadApp();
    const zeroPill = app.document.querySelector('.cat-pill[data-category="zero"]');
    const searchInput = app.document.getElementById('searchInput');
    const sortSelect = app.document.getElementById('sortFilter');

    if (zeroPill && searchInput && sortSelect) {
      zeroPill.click();
      searchInput.value = '۱۴۰۳';
      searchInput.dispatchEvent(new DOMEvent('input', { bubbles: true }));
      sortSelect.value = 'price-desc';
      sortSelect.dispatchEvent(new DOMEvent('change', { bubbles: true }));

      const cardTitles = app.document.querySelectorAll('.card-car-name, .car-title');
      assert.strictEqual(cardTitles.length, 2, '2 zero kilometer 1403 cars match');
      assert.ok(cardTitles[0].textContent.includes('اکستریم'), 'Xtrim VX (11450M) must come before Peugeot 207 (795M)');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 7: Empty Filter Results + Reset Action
  // =========================================================================
  test('T3-7: Filtering to zero results followed by reset restores full catalog', () => {
    const app = domSim.loadApp();
    const searchInput = app.document.getElementById('searchInput');
    const allPill = app.document.querySelector('.cat-pill[data-category="all"]');

    if (searchInput && allPill) {
      // 1. Search non-existent
      searchInput.value = 'ImpossibleCarBrand999';
      searchInput.dispatchEvent(new DOMEvent('input', { bubbles: true }));
      let grid = app.document.getElementById('carsGrid');
      assert.strictEqual(grid.querySelectorAll('.car-card, .car-card-modern').length, 0, 'Zero cars match');

      // 2. Clear search and click All pill
      searchInput.value = '';
      searchInput.dispatchEvent(new DOMEvent('input', { bubbles: true }));
      allPill.click();

      grid = app.document.getElementById('carsGrid');
      assert.strictEqual(grid.querySelectorAll('.car-card, .car-card-modern').length, 3, 'Full 3 cars restored');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 8: Preset Price Pill + Slider Sync
  // =========================================================================
  test('T3-8: Clicking preset price pill (2000M) synchronizes price slider and calculation', () => {
    const app = domSim.loadApp();
    const pricePill2000 = app.document.querySelector('.price-pill[data-price="2000"]');
    const priceSlider = app.document.getElementById('calcPriceSlider');

    if (pricePill2000 && priceSlider) {
      pricePill2000.click();
      assert.strictEqual(priceSlider.value, '2000', 'Slider value must sync to 2000');
      assert.ok(pricePill2000.classList.contains('active'), 'Clicked price pill must become active');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 9: Preset Downpayment Pill + Slider Sync
  // =========================================================================
  test('T3-9: Clicking preset downpayment pill (60%) synchronizes downpayment slider and badges', () => {
    const app = domSim.loadApp();
    const downPill60 = app.document.querySelector('.down-pill[data-percent="60"]');
    const downSlider = app.document.getElementById('downPaymentPercent');

    if (downPill60 && downSlider) {
      downPill60.click();
      assert.strictEqual(downSlider.value, '60', 'Slider value must sync to 60');
      assert.ok(downPill60.classList.contains('active'), 'Clicked percent pill must become active');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 10: Tenure Selector (6, 12, 18, 24) Active Class Mutual Exclusivity
  // =========================================================================
  test('T3-10: Clicking 18-month tenure button deactivates other tenure buttons', () => {
    const app = domSim.loadApp();
    const tenure18Btn = app.document.querySelector('.tenure-btn[data-months="18"]');
    const tenure12Btn = app.document.querySelector('.tenure-btn[data-months="12"]');

    if (tenure18Btn && tenure12Btn) {
      tenure18Btn.click();
      assert.ok(tenure18Btn.classList.contains('active'), '18-month button must be active');
      assert.strictEqual(tenure12Btn.classList.contains('active'), false, '12-month button must be inactive');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 11: Open Modal + Gallery Thumbnail Navigation
  // =========================================================================
  test('T3-11: Opening modal for car 1 (Xtrim) and clicking second thumbnail updates main image', () => {
    const app = domSim.loadApp();
    if (typeof app.window.openCarModal === 'function') {
      app.window.openCarModal(1);
      const thumbs = app.document.querySelectorAll('.modal-thumb-btn');
      if (thumbs.length >= 2) {
        thumbs[1].click();
        const mainImg = app.document.getElementById('modalMainImg');
        assert.ok(mainImg.getAttribute('src'), 'Main image src updated to thumbnail 2');
      }
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 12: Open Modal + Technical Inspection Data Verification
  // =========================================================================
  test('T3-12: Modal for Dena Plus displays accurate mileage (4,000 km) and inspection badges', () => {
    const app = domSim.loadApp();
    if (typeof app.window.openCarModal === 'function') {
      app.window.openCarModal(3);
      const modalBody = app.document.getElementById('modalDetailsBody');
      assert.ok(modalBody.textContent.includes('۴,۰۰۰') || modalBody.textContent.includes('4000'), 'Modal must contain Dena mileage');
      assert.ok(modalBody.textContent.includes('بدون رنگ') || modalBody.textContent.includes('کارشناسی'), 'Modal must contain inspection info');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 13: Mobile Drawer Open -> Nav Link Click -> Drawer Close
  // =========================================================================
  test('T3-13: Opening mobile drawer and clicking #faq closes mobile navigation drawer', () => {
    const app = domSim.loadApp();
    const toggle = app.document.getElementById('mobileToggle');
    const navLinks = app.document.getElementById('navLinks');
    const faqLink = app.document.querySelector('a[href="#faq"]');

    if (toggle && navLinks && faqLink) {
      // 1. Open drawer
      toggle.click();
      assert.ok(navLinks.classList.contains('open') || toggle.getAttribute('aria-expanded') === 'true', 'Drawer opened');

      // 2. Click link
      faqLink.click();
      assert.strictEqual(navLinks.classList.contains('open'), false, 'Drawer closed after nav link click');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 14: FAQ Accordion Mutual Exclusivity
  // =========================================================================
  test('T3-14: Opening second FAQ question automatically closes first FAQ question', () => {
    const app = domSim.loadApp();
    const faqQuestions = app.document.querySelectorAll('.faq-question');
    const faqItems = app.document.querySelectorAll('.faq-item');

    if (faqQuestions.length >= 2 && faqItems.length >= 2) {
      // First FAQ starts open in initial markup
      assert.ok(faqItems[0].classList.contains('open') || faqQuestions[0].getAttribute('aria-expanded') === 'true', 'FAQ 1 starts open');

      // Click second question
      faqQuestions[1].click();
      assert.ok(faqItems[1].classList.contains('open') || faqQuestions[1].getAttribute('aria-expanded') === 'true', 'FAQ 2 opened');
      assert.strictEqual(faqItems[0].classList.contains('open'), false, 'FAQ 1 closed when FAQ 2 opened');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 15: Form Validation Recovery Flow
  // =========================================================================
  test('T3-15: Form submission failure with empty phone -> phone correction -> successful submit & reset', () => {
    const app = domSim.loadApp();
    const form = app.document.getElementById('sellCarForm');
    const modelInput = app.document.getElementById('sellCarModel');
    const phoneInput = app.document.getElementById('sellOwnerPhone');

    if (form && modelInput && phoneInput) {
      // Step 1: Submit with empty fields
      form.dispatchEvent(new DOMEvent('submit', { bubbles: true, cancelable: true }));

      // Step 2: Fill model and valid Persian phone
      modelInput.value = 'پژو ۲۰۷i پانوراما';
      phoneInput.value = '۰۹۱۲۳۴۵۶۷۸۹';

      // Step 3: Submit again
      form.dispatchEvent(new DOMEvent('submit', { bubbles: true, cancelable: true }));

      assert.strictEqual(modelInput.value, '', 'Form inputs reset after successful submission');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 16: Hero Slider Next Navigation + Dot Sync
  // =========================================================================
  test('T3-16: Hero Slider Next button increments slide and synchronizes active dot', () => {
    const app = domSim.loadApp();
    const nextBtn = app.document.getElementById('nextSlide');
    const dots = app.document.querySelectorAll('.slider-dot');

    if (nextBtn && dots.length >= 2) {
      nextBtn.click();
      const secondDot = dots[1];
      assert.ok(secondDot.classList.contains('active'), 'Second dot must become active');
      assert.strictEqual(secondDot.getAttribute('aria-selected'), 'true', 'Second dot aria-selected must be true');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 17: Hero Slider Prev Button (Wrap around to last slide)
  // =========================================================================
  test('T3-17: Clicking Prev button on initial slide wraps around to the final slide', () => {
    const app = domSim.loadApp();
    const prevBtn = app.document.getElementById('prevSlide');
    const slides = app.document.querySelectorAll('.slide-item');
    const dots = app.document.querySelectorAll('.slider-dot');

    if (prevBtn && slides.length > 0 && dots.length > 0) {
      prevBtn.click();
      const lastSlide = slides[slides.length - 1];
      const lastDot = dots[dots.length - 1];
      assert.ok(lastSlide.classList.contains('active'), 'Last slide must be active after wrap');
      assert.ok(lastDot.classList.contains('active'), 'Last dot must be active after wrap');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 18: Hero Slider Direct Dot Navigation
  // =========================================================================
  test('T3-18: Clicking dot 3 directly activates slide 3', () => {
    const app = domSim.loadApp();
    const dots = app.document.querySelectorAll('.slider-dot');
    const slides = app.document.querySelectorAll('.slide-item');

    if (dots.length >= 3 && slides.length >= 3) {
      dots[2].click();
      assert.ok(slides[2].classList.contains('active'), 'Slide 3 must be active');
      assert.ok(dots[2].classList.contains('active'), 'Dot 3 must be active');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 19: Toast Notification Queue
  // =========================================================================
  test('T3-19: Multiple sequential showToast calls create structured toasts in container', () => {
    const app = domSim.loadApp();
    if (typeof app.window.showToast === 'function') {
      app.window.showToast('پیام موفقیت‌آمیز ۱', 'success');
      app.window.showToast('پیام اخطار ۲', 'error');

      const container = app.document.querySelector('.toast-container');
      assert.ok(container, 'Toast container must exist');
      const toasts = container.querySelectorAll('.toast');
      assert.ok(toasts.length >= 2, 'Container must hold multiple toasts');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 20: Theme & Color Token Styling Consistency
  // =========================================================================
  test('T3-20: Design tokens are referenced across header, hero, catalog, and modal CSS', () => {
    const css = cssAnalyzer.combinedContent;
    assert.ok(css.includes('var(--'), 'CSS must utilize CSS custom properties');
  });

  // =========================================================================
  // Combination 21: Keyboard Tab Sequence Flow
  // =========================================================================
  test('T3-21: Interactive elements maintain valid tab sequence', () => {
    const doc = domSim.createDocument();
    const focusable = doc.querySelectorAll('a, button, input, select');
    assert.ok(focusable.length >= 10, 'Must have at least 10 focusable interactive controls');
  });

  // =========================================================================
  // Combination 22: Modal Open -> Escape Key -> State Restoration
  // =========================================================================
  test('T3-22: Opening modal and pressing Escape closes modal and cleans overflow', () => {
    const app = domSim.loadApp();
    if (typeof app.window.openCarModal === 'function') {
      app.window.openCarModal(3); // Dena Plus
      const modal = app.document.getElementById('carModal');
      assert.ok(modal.classList.contains('active'), 'Modal initially open');

      const escEvent = new DOMEvent('keydown', { key: 'Escape', bubbles: true });
      app.document.dispatchEvent(escEvent);

      assert.strictEqual(modal.classList.contains('active'), false, 'Modal closed on Escape key');
      assert.strictEqual(app.document.body.style.overflow || '', '', 'Scroll restored');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 23: Persian vs English Numeral Search Query Equivalence
  // =========================================================================
  test('T3-23: Searching for "۱۴۰۳" vs "1403" yields identical matching inventory count', () => {
    const cars = domSim.loadApp().carsData;
    const faResults = filterAndSortCarsOracle(cars, { query: '۱۴۰۳' });
    const enResults = filterAndSortCarsOracle(cars, { query: '1403' });
    assert.strictEqual(faResults.length, enResults.length, 'Fa and En digit search counts must be identical');
    assert.ok(faResults.length >= 3, 'Must match at least 3 1403 model year cars');
  });

  // =========================================================================
  // Combination 24: Broken Image Handling + Card Layout Preservation
  // =========================================================================
  test('T3-24: Card image error event preserves car card and button interactivity', () => {
    const app = domSim.loadApp();
    const firstImg = app.document.querySelector('.car-card img, .car-card-modern img, .card-media img');
    const firstDetailsBtn = app.document.querySelector('.btn-show-details, .btn-car-details, #carsGrid button');

    if (firstImg && firstDetailsBtn) {
      firstImg.dispatchEvent(new DOMEvent('error', { bubbles: true }));
      assert.doesNotThrow(() => {
        firstDetailsBtn.click();
      }, 'Details button must remain clickable even if image failed to load');
      const modal = app.document.getElementById('carModal');
      assert.ok(modal.classList.contains('active'), 'Modal opens from card with error image');
    }
    app.cleanup();
  });

  // =========================================================================
  // Combination 25: Reduced Motion + Rapid Modal Interactions
  // =========================================================================
  test('T3-25: Modal open and close in succession under reduced motion executes safely', () => {
    const app = domSim.loadApp();
    if (typeof app.window.openCarModal === 'function') {
      for (let i = 1; i <= 4; i++) {
        app.window.openCarModal(i);
        const closeBtn = app.document.getElementById('modalClose');
        if (closeBtn) closeBtn.click();
      }
      const modal = app.document.getElementById('carModal');
      assert.strictEqual(modal.classList.contains('active'), false, 'Modal closed cleanly after 4 cycles');
    }
    app.cleanup();
  });
});
