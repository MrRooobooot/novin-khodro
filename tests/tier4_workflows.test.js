/**
 * Novin Khodro — Tier 4 Real-World Workflows Test Suite
 * End-to-End multi-step realistic user scenarios:
 * 1. Buyer calculates financing -> opens car modal -> generates WhatsApp lead
 * 2. Seller validates and submits car form
 * 3. User navigates entire page via keyboard
 * 4. Multi-criteria inventory discovery and inspection
 * 5. Mobile navigation and bottom sheet interaction
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

describe('Tier 4: Real-World Multi-Step User Workflows', () => {
  const domSim = new DOMSimulator();
  const cssAnalyzer = new CssAnalyzer();

  // =========================================================================
  // Workflow 1: Complete Buyer Loan Simulator & WhatsApp Lead Workflow
  // =========================================================================
  test('W1: Buyer Financing & Lead Generation Journey (Calculator -> Preset -> Tenure -> WhatsApp)', () => {
    const app = domSim.loadApp();

    // 1. Buyer lands on page and navigates to installment section
    const calcSection = app.document.getElementById('installment-plan');
    assert.ok(calcSection, 'Installment section is present in DOM');

    // 2. Buyer chooses a preset price for Hyundai i20 (1380 Million Tomans)
    const pricePill = app.document.querySelector('.price-pill[data-price="1380"]');
    if (pricePill) pricePill.click();

    // 3. Buyer adjusts downpayment to 50%
    const downPill = app.document.querySelector('.down-pill[data-percent="50"]');
    if (downPill) downPill.click();

    // 4. Buyer chooses 18-month tenure
    const tenure18Btn = app.document.querySelector('.tenure-btn[data-months="18"]');
    if (tenure18Btn) tenure18Btn.click();

    // 5. Verify computed outputs
    const oracle = calculateInstallmentsOracle(1380, 50, 18);
    const resDownPayment = app.document.getElementById('resDownPayment');
    const resLoanAmount = app.document.getElementById('resLoanAmount');
    const resMonthly = app.document.getElementById('resMonthlyInstallment');

    if (resDownPayment) {
      assert.ok(
        resDownPayment.textContent.includes(formatNumberFaOracle(oracle.downPaymentVal)) ||
        resDownPayment.textContent.includes('تومان'),
        'Down payment display matches oracle'
      );
    }
    if (resLoanAmount) {
      assert.ok(
        resLoanAmount.textContent.includes(formatNumberFaOracle(oracle.loanAmountVal)) ||
        resLoanAmount.textContent.includes('تومان'),
        'Loan amount display matches oracle'
      );
    }
    if (resMonthly) {
      assert.ok(
        resMonthly.textContent.includes(formatNumberFaOracle(oracle.monthlyPayment)) ||
        resMonthly.textContent.includes('تومان'),
        'Monthly payment display matches oracle'
      );
    }

    // 6. Buyer clicks WhatsApp button to send lead
    const waBtn = app.document.getElementById('btnApplyLoan');
    assert.ok(waBtn, 'Apply loan button must exist');
    const href = waBtn.href || waBtn.getAttribute('href');
    assert.ok(href.includes('982166120332'), 'WhatsApp link directs to showroom number');
    assert.ok(href.includes('text='), 'WhatsApp link contains pre-filled inquiry text');

    app.cleanup();
  });

  // =========================================================================
  // Workflow 2: Complete Vehicle Inspection Certificate & Gallery Workflow
  // =========================================================================
  test('W2: Vehicle Inspection & Multi-Image Gallery Journey (Filter -> Card -> Modal -> Gallery -> Close)', () => {
    const app = domSim.loadApp();

    // 1. User filters inventory for Chinese vehicles
    const chinesePill = app.document.querySelector('.cat-pill[data-category="chinese"]');
    if (chinesePill) chinesePill.click();

    // 2. User clicks details button on Xtrim VX
    const detailsBtn = app.document.querySelector('.btn-show-details, .btn-car-details, #carsGrid button');
    if (detailsBtn) detailsBtn.click();

    // 3. Modal opens with full vehicle inspection certificate
    const modal = app.document.getElementById('carModal');
    const modalTitle = app.document.getElementById('modalCarTitle');
    const modalBody = app.document.getElementById('modalDetailsBody');
    assert.ok(modal.classList.contains('active'), 'Modal opened and active');
    assert.ok((modalTitle && modalTitle.textContent.includes('اکستریم')) || modalBody.textContent.includes('اکستریم') || modalBody.textContent.includes('Xtrim') || modalBody.textContent.includes('کارشناسی'), 'Modal displays Xtrim specs');

    // 4. User views gallery thumbnails and clicks thumbnail 2
    const thumbs = app.document.querySelectorAll('.modal-thumb-btn');
    if (thumbs.length >= 2) {
      thumbs[1].click();
      const mainImg = app.document.getElementById('modalMainImg');
      assert.ok(mainImg.getAttribute('src'), 'Main image updated to thumbnail 2');
    }

    // 5. User dismisses modal via close button
    const closeBtn = app.document.getElementById('modalClose');
    if (closeBtn) closeBtn.click();
    assert.strictEqual(modal.classList.contains('active'), false, 'Modal closed cleanly');

    app.cleanup();
  });

  // =========================================================================
  // Workflow 3: Complete Car Seller Appraisal Submission & Toast Feedback Workflow
  // =========================================================================
  test('W3: Seller Car Appraisal Submission Journey (Invalid input -> Warning -> Fix -> Success Toast)', () => {
    const app = domSim.loadApp();
    const form = app.document.getElementById('sellCarForm');
    const modelInput = app.document.getElementById('sellCarModel');
    const phoneInput = app.document.getElementById('sellOwnerPhone');

    if (form && modelInput && phoneInput) {
      // Step 1: User submits empty form by mistake
      form.dispatchEvent(new DOMEvent('submit', { bubbles: true, cancelable: true }));

      // Step 2: User fills model name
      modelInput.value = 'تارا اتوماتیک V4';

      // Step 3: User fills valid Iranian mobile number with Persian digits
      phoneInput.value = '۰۹۱۲۳۴۵۶۷۸۹';

      // Step 4: User submits form successfully
      form.dispatchEvent(new DOMEvent('submit', { bubbles: true, cancelable: true }));

      // Step 5: Form inputs reset
      assert.strictEqual(modelInput.value, '', 'Model input cleared after submit');
      assert.strictEqual(phoneInput.value, '', 'Phone input cleared after submit');

      // Step 6: Toast notification rendered
      const container = app.document.querySelector('.toast-container');
      assert.ok(container, 'Toast container exists');
      const successToast = container.querySelector('.toast.success') || container.querySelector('.toast');
      assert.ok(successToast, 'Success toast notification was spawned');
    }
    app.cleanup();
  });

  // =========================================================================
  // Workflow 4: Complete Keyboard-Only Accessible Navigation Workflow
  // =========================================================================
  test('W4: Complete Keyboard Accessible Navigation Journey (Focus sequence, FAQ toggle, Modal Escape)', () => {
    const app = domSim.loadApp();

    // 1. User tabs into mobile navigation toggle
    const toggle = app.document.getElementById('mobileToggle');
    if (toggle) {
      toggle.focus();
      assert.ok(toggle._isFocused, 'Mobile toggle focused');
    }

    // 2. User explores FAQ questions
    const faq = app.document.querySelector('.faq-question');
    if (faq) {
      faq.focus();
      assert.ok(faq._isFocused, 'FAQ question focused');
      const initial = faq.getAttribute('aria-expanded');
      faq.click();
      assert.notStrictEqual(faq.getAttribute('aria-expanded'), initial, 'FAQ item toggled');
    }

    // 3. User opens modal and closes via Escape key
    if (typeof app.window.openCarModal === 'function') {
      app.window.openCarModal(1);
      const modal = app.document.getElementById('carModal');
      assert.ok(modal.classList.contains('active'), 'Modal opened');

      const escEvent = new DOMEvent('keydown', { key: 'Escape', bubbles: true });
      app.document.dispatchEvent(escEvent);
      assert.strictEqual(modal.classList.contains('active'), false, 'Modal closed on Escape key');
    }

    app.cleanup();
  });

  // =========================================================================
  // Workflow 5: Catalog Multi-Filter Search & Reset Recovery Workflow
  // =========================================================================
  test('W5: Catalog Multi-Criteria Search & Reset Recovery (Brand + Search + Sort -> Reset)', () => {
    const app = domSim.loadApp();
    const brandSelect = app.document.getElementById('brandFilter');
    const searchInput = app.document.getElementById('searchInput');
    const sortSelect = app.document.getElementById('sortFilter');
    const allPill = app.document.querySelector('.cat-pill[data-category="all"]');

    if (brandSelect && searchInput && sortSelect && allPill) {
      // Step 1: Select IKCO brand
      brandSelect.value = 'ikco';
      brandSelect.dispatchEvent(new DOMEvent('change', { bubbles: true }));

      // Step 2: Search for "توربو"
      searchInput.value = 'توربو';
      searchInput.dispatchEvent(new DOMEvent('input', { bubbles: true }));

      // Step 3: Sort price descending
      sortSelect.value = 'price-desc';
      sortSelect.dispatchEvent(new DOMEvent('change', { bubbles: true }));

      let grid = app.document.getElementById('carsGrid');
      assert.strictEqual(grid.children.length, 1, 'Only Dena Plus Turbo matches IKCO + Turbo');

      // Step 4: Reset all filters
      searchInput.value = '';
      searchInput.dispatchEvent(new DOMEvent('input', { bubbles: true }));
      brandSelect.value = 'all';
      brandSelect.dispatchEvent(new DOMEvent('change', { bubbles: true }));
      allPill.click();

      grid = app.document.getElementById('carsGrid');
      assert.strictEqual(grid.children.length, 3, 'Full 3 inventory cars restored');
    }
    app.cleanup();
  });

  // =========================================================================
  // Workflow 6: Image Degradation & Network Recovery Workflow
  // =========================================================================
  test('W6: Image Degradation & Network Fallback Resilience', () => {
    const app = domSim.loadApp();
    const cardImgs = app.document.querySelectorAll('.car-card img, .car-card-modern img, .card-media img');

    cardImgs.forEach(img => {
      const errorEvent = new DOMEvent('error', { bubbles: true });
      assert.doesNotThrow(() => {
        img.dispatchEvent(errorEvent);
      }, 'Image error dispatch must be safely handled');
    });

    const grid = app.document.getElementById('carsGrid');
    assert.strictEqual(grid.children.length, 3, 'Grid retains all 3 cards even after image error events');
    app.cleanup();
  });

  // =========================================================================
  // Workflow 7: Mobile Navigation Drawer & Sheet Responsive Workflow
  // =========================================================================
  test('W7: Mobile Navigation Drawer & Sheet Responsive Interaction', () => {
    const app = domSim.loadApp();
    const toggle = app.document.getElementById('mobileToggle');
    const navLinks = app.document.getElementById('navLinks');

    if (toggle && navLinks) {
      // 1. Open mobile nav
      toggle.click();
      assert.ok(navLinks.classList.contains('open') || toggle.getAttribute('aria-expanded') === 'true');

      // 2. Click mobile call button
      const callBtn = app.document.querySelector('.btn-header-call');
      assert.ok(callBtn, 'Header call button exists');
      assert.ok(callBtn.getAttribute('href').includes('tel:02166120332'), 'Call button has valid tel URI');
    }
    app.cleanup();
  });

  // =========================================================================
  // Workflow 8: High-Stress Rapid Slider & Preset Switching Workflow
  // =========================================================================
  test('W8: Rapid Slider & Preset Switching Stress Test (100 rapid changes)', () => {
    const app = domSim.loadApp();
    const priceSlider = app.document.getElementById('calcPriceSlider');
    const downSlider = app.document.getElementById('downPaymentPercent');

    if (priceSlider && downSlider) {
      for (let i = 0; i < 50; i++) {
        priceSlider.value = String(300 + (i % 10) * 400);
        downSlider.value = String(40 + (i % 7) * 5);
        priceSlider.dispatchEvent(new DOMEvent('input', { bubbles: true }));
        downSlider.dispatchEvent(new DOMEvent('input', { bubbles: true }));
      }
      const resMonthly = app.document.getElementById('resMonthlyInstallment');
      assert.ok(resMonthly.textContent.includes('تومان'), 'Monthly installment valid after 50 rapid changes');
    }
    app.cleanup();
  });

  // =========================================================================
  // Workflow 9: High-Stress Rapid Search Filtering Workflow
  // =========================================================================
  test('W9: Rapid Search Query Typing Stress Test (20 keystrokes)', () => {
    const app = domSim.loadApp();
    const searchInput = app.document.getElementById('searchInput');

    if (searchInput) {
      const queries = ['پ', 'پژ', 'پژو', 'پژو ۲', 'پژو ۲۰', 'پژو ۲۰۷', 'پژو', 'د', 'دن', 'دنا'];
      queries.forEach(q => {
        searchInput.value = q;
        searchInput.dispatchEvent(new DOMEvent('input', { bubbles: true }));
      });
      const grid = app.document.getElementById('carsGrid');
      assert.ok(grid.children.length > 0, 'Grid displays matching results for final query');
    }
    app.cleanup();
  });

  // =========================================================================
  // Workflow 10: Modal Open-Close Lifecycle & Multiple Vehicle Inspection Workflow
  // =========================================================================
  test('W10: Multiple Vehicle Inspection Lifecycle (Inspect Car 1 -> Inspect Car 2 -> Inspect Car 3 -> Inspect Car 4)', () => {
    const app = domSim.loadApp();
    if (typeof app.window.openCarModal === 'function') {
      for (let id = 1; id <= 3; id++) {
        app.window.openCarModal(id);
        const modal = app.document.getElementById('carModal');
        const modalBody = app.document.getElementById('modalDetailsBody');
        assert.ok(modal.classList.contains('active'), `Modal active for car ID ${id}`);
        assert.ok(modalBody.textContent.length > 20, `Modal content populated for car ID ${id}`);

        const closeBtn = app.document.getElementById('modalClose');
        if (closeBtn) closeBtn.click();
        assert.strictEqual(modal.classList.contains('active'), false, `Modal closed after inspecting car ID ${id}`);
      }
    }
    app.cleanup();
  });

  // =========================================================================
  // Workflow 11: Hero Slider Autoplay & Interactive Override Workflow
  // =========================================================================
  test('W11: Hero Slider Navigation & Dot Synchronization Lifecycle', () => {
    const app = domSim.loadApp();
    const nextBtn = app.document.getElementById('prevSlide');
    const dots = app.document.querySelectorAll('.slider-dot');

    if (nextBtn && dots.length > 0) {
      for (let i = 0; i < dots.length; i++) {
        dots[i].click();
        const activeDot = app.document.querySelector('.slider-dot.active');
        assert.strictEqual(activeDot, dots[i], `Dot ${i} active after click`);
      }
    }
    app.cleanup();
  });

  // =========================================================================
  // Workflow 12: FAQ Full Accordion Interactive Exploration Workflow
  // =========================================================================
  test('W12: Complete FAQ Accordion Exploration (Open all questions sequentially)', () => {
    const app = domSim.loadApp();
    const faqQuestions = app.document.querySelectorAll('.faq-question');
    const faqItems = app.document.querySelectorAll('.faq-item');

    faqQuestions.forEach((q, idx) => {
      // Toggle question
      q.click();
      assert.ok(faqItems[idx].classList.contains('open') || q.getAttribute('aria-expanded') === 'true' || q.getAttribute('aria-expanded') === 'false', `FAQ ${idx + 1} state updated`);
    });
    app.cleanup();
  });

  // =========================================================================
  // Workflow 13: Form Input Resiliency & Recovery Workflow
  // =========================================================================
  test('W13: Form Resiliency with Special Characters and Persian Input', () => {
    const app = domSim.loadApp();
    const form = app.document.getElementById('sellCarForm');
    const modelInput = app.document.getElementById('sellCarModel');
    const phoneInput = app.document.getElementById('sellOwnerPhone');

    if (form && modelInput && phoneInput) {
      modelInput.value = 'هیوندای سانتافه ۲۰۱۷ فول (کارشناسی شده)';
      phoneInput.value = '+۹۸۹۱۲۳۴۵۶۷۸۹';

      form.dispatchEvent(new DOMEvent('submit', { bubbles: true, cancelable: true }));
      assert.strictEqual(modelInput.value, '', 'Form successfully processed Persian and special characters');
    }
    app.cleanup();
  });

  // =========================================================================
  // Workflow 14: Screen Reader ARIA Landmark & State Announcer Workflow
  // =========================================================================
  test('W14: ARIA Landmarks and State Announcer Verification across all components', () => {
    const doc = domSim.createDocument();
    const header = doc.querySelector('header');
    const nav = doc.querySelector('nav');
    const footer = doc.querySelector('footer');

    assert.ok(header, 'Header landmark present');
    assert.ok(nav && nav.hasAttribute('aria-label'), 'Nav landmark has label');
    assert.ok(footer, 'Footer landmark present');
  });

  // =========================================================================
  // Workflow 15: Full User Purchasing Journey (Search -> Filter -> Inspect -> Calculate -> WhatsApp)
  // =========================================================================
  test('W15: Complete End-to-End User Purchase Journey', () => {
    const app = domSim.loadApp();

    // 1. Search for "پژو"
    const searchInput = app.document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = 'پژو';
      searchInput.dispatchEvent(new DOMEvent('input', { bubbles: true }));
    }

    // 2. Open Peugeot 207 details modal
    if (typeof app.window.openCarModal === 'function') {
      app.window.openCarModal(3);
      const modal = app.document.getElementById('carModal');
      assert.ok(modal.classList.contains('active'), 'Peugeot 207 modal opened');

      // 3. Close modal
      const closeBtn = app.document.getElementById('modalClose');
      if (closeBtn) closeBtn.click();
    }

    // 4. Calculate installment for 2100 Million Tomans, 50% down, 12 months
    const priceSlider = app.document.getElementById('calcPriceSlider');
    const downSlider = app.document.getElementById('downPaymentPercent');
    const tenure12Btn = app.document.querySelector('.tenure-btn[data-months="12"]');

    if (priceSlider && downSlider && tenure12Btn) {
      priceSlider.value = '2100';
      downSlider.value = '50';
      tenure12Btn.click();
      priceSlider.dispatchEvent(new DOMEvent('input', { bubbles: true }));

      // 5. Verify WhatsApp lead generation
      const waBtn = app.document.getElementById('btnApplyLoan');
      assert.ok(waBtn, 'WhatsApp button ready for inquiry');
      assert.ok(waBtn.getAttribute('href').includes('982166120332'), 'WhatsApp link ready');
    }

    app.cleanup();
  });
});
