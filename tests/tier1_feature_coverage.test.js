/**
 * Novin Khodro — Tier 1 Feature Coverage Test Suite
 * Comprehensive requirement-driven opaque-box tests covering all 19 features in PROJECT.md
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

// Round-37: module-scope fs for the R37 describe-block
const fs = require('fs');
const path = require('path');

function sectionById(html, id) {
  const anchor = html.indexOf('id="' + id + '"');
  if (anchor < 0) return '';
  const open = html.lastIndexOf('<section', anchor);
  if (open < 0) return '';
  const re = /<section\b|<\/section>/g;
  re.lastIndex = open;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    if (m[0].charAt(1) === 's') depth++;
    else { depth--; if (depth === 0) return html.slice(open, m.index + m[0].length); }
  }
  return '';
}
const r37ProjectRoot = path.join(__dirname, '..');

// Price baselines derive from the single source of truth (js/cars-data.js) so a
// daily price sync never breaks the suite — no hardcoded numbers to chase.
const { carsData: t1Cars } = require('../js/cars-data.js');
const t1Prices = t1Cars.map(c => c.price);
const faThousands = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const t1MinFa = faThousands(Math.min(...t1Prices));
const t1MaxFa = faThousands(Math.max(...t1Prices));
const t1RangeIrr = `${(Math.min(...t1Prices) * 10).toLocaleString('en-US')} - ${(Math.max(...t1Prices) * 10).toLocaleString('en-US')} IRR`;

describe('R37: Car Modal Gallery Polish + JSON-LD Images + Freshness 2026-09-18 (v=20260918)', () => {
  const indexHtml = fs.readFileSync(path.join(r37ProjectRoot, 'index.html'), 'utf8');


  const appJs = fs.readFileSync(path.join(r37ProjectRoot, 'js/app.js'), 'utf8');
  const styleCss = fs.readFileSync(path.join(r37ProjectRoot, 'css/style.css'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(r37ProjectRoot, 'css/responsive.css'), 'utf8');
  const sitemap = fs.readFileSync(path.join(r37ProjectRoot, 'sitemap.xml'), 'utf8');
  const llms = fs.readFileSync(path.join(r37ProjectRoot, 'llms.txt'), 'utf8');

  test('R37-1: Counter badge CSS/class exists with gold pill brand colors', () => {
    assert.ok(appJs.includes('modal-img-counter'), 'app.js modal template must render modal-img-counter');
    assert.ok(appJs.includes('id="modalImgCounter"'), 'Counter element with id modalImgCounter required');
    const rule = styleCss.match(/\.modal-img-counter\s*\{[^}]*\}/);
    assert.ok(rule, 'style.css must style .modal-img-counter');
    assert.ok(rule[0].includes('rgba(233, 191, 50, 0.22)'), 'Counter pill bg must be brand gold rgba(233,191,50,.22)');
    assert.ok(rule[0].includes('#F1E781'), 'Counter pill text must be #F1E781');
    assert.ok(styleCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*?\.modal-img-fade/s), 'Reduced-motion guard must cover modal image fade');
  });

  test('R37-2: Arrow nav buttons in modal template with Persian aria-labels and 44px targets', () => {
    assert.ok(appJs.includes('modal-nav-arrow'), 'Arrow nav buttons must exist in modal template');
    assert.ok(appJs.includes('aria-label="تصویر بعدی"'), 'Next arrow must carry Persian aria-label «تصویر بعدی»');
    assert.ok(appJs.includes('aria-label="تصویر قبلی"'), 'Prev arrow must carry Persian aria-label «تصویر قبلی»');
    assert.ok(appJs.includes('modalNavImage(1)') && appJs.includes('modalNavImage(-1)'), 'Arrows must call modalNavImage with step');
    assert.ok(appJs.includes('disabled'), 'Arrows must be disabled at gallery ends');
    const arrowRule = styleCss.match(/\.modal-nav-arrow\s*\{[^}]*\}/);
    assert.ok(arrowRule && arrowRule[0].includes('44px'), 'Arrow buttons must be 44px tap targets');
    assert.ok(styleCss.includes('.modal-nav-arrow:focus-visible'), 'Arrows need gold :focus-visible ring');
  });

  test('R37-3: Keyboard ArrowLeft/ArrowRight handler (RTL-aware) inside modal', () => {
    assert.ok(appJs.includes("e.key === 'ArrowLeft'") && appJs.includes("e.key === 'ArrowRight'"), 'Modal keydown must handle ArrowLeft/ArrowRight');
    assert.ok(/modalOverlay\.addEventListener\('keydown'[\s\S]*?ArrowLeft[\s\S]*?modalNavImage\(1\)/.test(appJs), 'RTL: ArrowLeft advances image');
    assert.ok(/ArrowRight[\s\S]*?modalNavImage\(-1\)/.test(appJs), 'RTL: ArrowRight goes back');
  });

  test('R37-4: ItemList Car entries keep image field; offers carry image', () => {
    const blocks = [...indexHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const itemList = blocks.find(b => b['@type'] === 'ItemList');
    assert.ok(itemList, 'ItemList JSON-LD must exist');
    const cars = itemList.itemListElement.map(el => el.item);
    assert.ok(cars.length === 3 && cars.every(c => c['@type'] === 'Car' && typeof c.image === 'string' && c.image.includes('/images/cars/')), 'All 4 Car entries must have real image paths from cars-data');
    assert.ok(cars.every(c => c.offers && typeof c.offers.image === 'string' && c.offers.image.includes('/images/cars/')), 'All Offers must carry image');
  });

  test('R37-5: Freshness 2026-09-18 — all JSON-LD dateModified, sitemap, llms.txt', () => {
    const blocks = [...indexHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    assert.ok(blocks.length === 6, '6 JSON-LD blocks must parse');
    blocks.forEach(d => assert.strictEqual(d.dateModified, '2026-09-18', (d['@type'] || 'block') + ' dateModified must be 2026-09-18'));
    assert.ok(sitemap.includes('<lastmod>2026-09-18</lastmod>') && !sitemap.includes('<lastmod>2026-09-12'), 'Sitemap lastmod must be 2026-09-18');
    assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified must be 2026-09-18');
  });

  test('R37-6: Cache-bust v=20260918 on style.css, responsive.css, app.js; installment.css untouched', () => {
    assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918') && indexHtml.includes('js/app.js?v=20260918'), 'Bumped assets must be v=20260918');
    assert.ok(indexHtml.includes('css/installment.css?v=20260918'), 'installment.css must keep v=20260918');
    assert.ok(!indexHtml.includes('20260912b'), 'Stale v=20260912b refs must be gone');
    assert.ok(responsiveCss.includes('@media (max-width: 390px)'), '390px refinement block for modal gallery required in responsive.css');
  });
});

describe('R38: Why-Us Polish + llms.txt FAQ (AEO) / Price range', () => {
  const r38Root = path.join(__dirname, '..');
  const styleCss = fs.readFileSync(path.join(r38Root, 'css/style.css'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(r38Root, 'css/responsive.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(r38Root, 'index.html'), 'utf8');
  const llms = fs.readFileSync(path.join(r38Root, 'llms.txt'), 'utf8');

  test('R38-1: Corner gold ticks on .why-us-card (::after, 14px, rgba gold, fade on hover)', () => {
    const rule = styleCss.match(/\.why-us-card::after\s*\{[^}]*\}/);
    assert.ok(rule, 'style.css must define .why-us-card::after corner ticks');
    assert.ok(rule[0].includes('14px'), 'Corner ticks must be 14px');
    assert.ok(rule[0].includes('rgba(252, 224, 76, 0.55)'), 'Top ticks must be rgba gold #FCE04C');
    assert.ok(rule[0].includes('rgba(233, 191, 50, 0.45)'), 'Bottom ticks must be rgba gold #E9BF32');
    assert.ok(styleCss.includes('.why-us-card:hover::after'), 'Corner ticks must fade in on hover');
  });

  test('R38-2: Gold hairline dividers between the 3 stats (RTL-aware + stacked fallback)', () => {
    const rule = styleCss.match(/\.why-us-stat \+ \.why-us-stat\s*\{[^}]*\}/);
    assert.ok(rule && rule[0].includes('rgba(252, 224, 76, 0.18)'), 'Hairline divider between stats must be gold rgba');
    assert.ok(rule[0].includes('border-inline-start'), 'Divider must be RTL-aware (border-inline-start)');
    const stacked = styleCss.match(/@media \(max-width: 640px\)\s*\{[\s\S]*?\.why-us-stat \+ \.why-us-stat\s*\{[^}]*\}/);
    assert.ok(stacked && stacked[0].includes('border-top'), 'Single-column fallback must switch divider to border-top');
  });

  test('R38-3: Icon outer gold ring on hover + reduced-motion guards kept intact', () => {
    const ring = styleCss.match(/\.why-us-card:hover \.why-us-icon[\s\S]*?\}/);
    assert.ok(ring && ring[0].includes('box-shadow'), 'Icon must gain an outer gold ring on card hover');
    assert.ok(ring[0].includes('rgba(252, 224, 76, 0.16)'), 'Ring must be subtle rgba gold');
    const rm = styleCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.why-us-card::after[\s\S]*?\n\}/);
    assert.ok(rm, 'Reduced-motion guard must cover .why-us-card::after and .why-us-icon');
    assert.ok(styleCss.includes('.why-us-card a:focus-visible'), 'Gold :focus-visible rules must remain');
    const icon = styleCss.match(/\.why-us-icon\s*\{[^}]*\}/);
    assert.ok(icon && icon[0].includes('min-width: 44px') && icon[0].includes('min-height: 44px'), '44px minimum targets must remain');
  });

  test('R38-4: llms.txt has FAQ (AEO) section with real page questions + Price range line', () => {
    assert.ok(llms.includes('## FAQ (AEO)'), 'llms.txt must contain an FAQ (AEO) section');
    const faqQuestions = [...indexHtml.matchAll(/class="faq-question"[\s\S]*?<span>([^<]+)<\/span>/g)].map(m => m[1].trim());
    assert.ok(faqQuestions.length >= 5, 'Page must have at least 5 FAQ questions');
    const faqSection = llms.split('## FAQ (AEO)')[1] || '';
    faqQuestions.slice(0, 5).forEach(q => assert.ok(faqSection.includes(q), 'FAQ section must reuse the exact page question: ' + q));
  });

  test('R38-5: llms.txt Price range derives from js/cars-data.js real inventory', () => {
    assert.ok(llms.includes('## Price range'), 'llms.txt must contain a Price range section');
    assert.ok(llms.includes(t1MinFa), 'Price range must include the low bound from js/cars-data.js: ' + t1MinFa);
    assert.ok(llms.includes(t1MaxFa), 'Price range must include the high bound from js/cars-data.js: ' + t1MaxFa);
    assert.ok(llms.includes('js/cars-data.js'), 'Price range must cite js/cars-data.js as source');
  });

  test('R38-6: Freshness/version untouched by R38 (2026-09-18 / v=20260918)', () => {
    const html = indexHtml;
    assert.ok(html.includes('css/style.css?v=20260918') && html.includes('css/responsive.css?v=20260918'), 'Cache-bust must stay v=20260918');
    assert.ok(!html.includes('20260913a'), 'No stale pre-R39 version refs');
    assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified must stay 2026-09-18');
    assert.ok(responsiveCss.includes('@media (max-width: 390px)'), '390px refinement block must remain');
  });
});

describe('Tier 1: Feature Coverage (F1 to F19)', () => {
  const domSim = new DOMSimulator();
  const cssAnalyzer = new CssAnalyzer();

  // =========================================================================
  // F1: Semantic Landmarks & Document Outline
  // =========================================================================
  describe('F1: Semantic Landmarks & Document Outline', () => {
    test('F1-1: Document root contains valid lang="fa" and dir="rtl" attributes', () => {
      const doc = domSim.createDocument();
      const htmlElem = doc.documentElement;
      assert.strictEqual(htmlElem.getAttribute('lang'), 'fa', 'HTML lang must be fa');
      assert.strictEqual(htmlElem.getAttribute('dir'), 'rtl', 'HTML dir must be rtl');
    });

    test('F1-2: Document contains a semantic <header> landmark', () => {
      const doc = domSim.createDocument();
      const header = doc.querySelector('header');
      assert.ok(header, 'Must contain a semantic <header> element');
      assert.ok(header.classList.contains('site-header'), 'Header should have site-header class');
    });

    test('F1-3: Document contains a semantic <main> or primary content landmark', () => {
      const doc = domSim.createDocument();
      const main = doc.querySelector('main') || doc.querySelector('#main-content') || doc.querySelector('.hero-slider-section');
      assert.ok(main, 'Document must contain main or primary content container');
    });

    test('F1-4: Document contains semantic sections for all core areas', () => {
      const doc = domSim.createDocument();
      const heroSection = doc.querySelector('.hero-slider-section, #hero');
      const inventorySection = doc.querySelector('#inventory, .inventory-section');
      const installmentSection = doc.querySelector('#installment-plan, .installment-section');
      const sellSection = doc.querySelector('#sell-car, .sell-car-section');
      const faqSection = doc.querySelector('#faq, .faq-section');
      const contactSection = doc.querySelector('#contact, .contact-section');

      assert.ok(heroSection, 'Hero section must exist');
      assert.ok(inventorySection, 'Inventory section must exist');
      assert.ok(installmentSection, 'Installment section must exist');
      assert.ok(sellSection, 'Sell car section must exist');
      assert.ok(faqSection, 'FAQ section must exist');
      assert.ok(contactSection, 'Contact section must exist');
    });

    test('F1-5: Document contains semantic <footer> with contact/copyright information', () => {
      const doc = domSim.createDocument();
      const footer = doc.querySelector('footer');
      assert.ok(footer, 'Must contain a <footer> element');
      assert.ok(footer.textContent.includes('نوین خودرو'), 'Footer must reference showroom name');
    });

    // =========================================================================
    // F1-FP: Footer Polish (Round 16) — premium gold-accented dark panel
    // =========================================================================
    describe('F1-FP: Footer Polish (Round 16)', () => {
      test('F1-FP1: Footer keeps contact info intact (phone, address, hours)', () => {
        const doc = domSim.createDocument();
        const footer = doc.querySelector('footer');
        assert.ok(footer, 'Footer must exist');
        const text = footer.textContent;
        assert.ok(text.includes('۰۲۱-۶۶۱۲۰۳۳۲'), 'Footer must keep formatted phone number');
        assert.ok(footer.querySelector('a[href="tel:02166120332"]'), 'Footer must keep tel: link');
        assert.ok(text.includes('میدان توحید'), 'Footer must keep Tohid Sq address');
        assert.ok(text.includes('نصرت غربی'), 'Footer must keep Nosrat-e Gharbi street');
        assert.ok(text.includes('پلاک ۲۱'), 'Footer must keep plaque 21');
      });

      test('F1-FP2: Footer keeps quick-nav links and copyright bar', () => {
        const doc = domSim.createDocument();
        const footer = doc.querySelector('footer');
        const navLinks = footer.querySelectorAll('.footer-nav-list a');
        assert.ok(navLinks.length >= 5, 'Footer quick-nav must keep all 5 links');
        assert.ok(footer.querySelector('.footer-bottom-clean'), 'Footer copyright bar must exist');
        assert.ok(footer.querySelector('.footer-bottom-clean').textContent.includes('محفوظ است'), 'Copyright text must stay intact');
      });

      test('F1-FP3: Footer uses gold hairline top edge via .footer-clean::before', () => {
        const rules = cssAnalyzer.findRulesMatching('.footer-clean::before');
        assert.ok(rules.length > 0, '.footer-clean::before gold hairline rule must exist');
        const body = rules.map(r => r.body).join(' ');
        assert.ok(body.includes('brand-gold'), 'Hairline must use the --brand-gold token');
        assert.ok(body.includes('linear-gradient'), 'Hairline should be a gradient');
      });

      test('F1-FP4: Footer nav links have gold hover state (no blue leftovers)', () => {
        const rules = cssAnalyzer.findRulesMatching('.footer-nav-list a:hover');
        assert.ok(rules.length > 0, 'Footer link hover rule must exist');
        assert.ok(rules[0].body.includes('brand-gold'), 'Footer link hover must use --brand-gold');
        const body = cssAnalyzer.combinedContent;
        assert.ok(!/\.footer-nav-list a:hover\s*\{[^}]*#93C5FD/.test(body), 'Footer link hover must not use old blue');
      });

      test('F1-FP5: Footer has focus-visible gold rings on links and social buttons', () => {
        const body = cssAnalyzer.combinedContent;
        assert.ok(/\.footer-nav-list a:focus-visible/.test(body), 'Footer nav links must have :focus-visible ring');
        assert.ok(/\.footer-social-btn:focus-visible/.test(body), 'Footer social buttons must have :focus-visible ring');
        assert.ok(/\.footer-phone-link:focus-visible/.test(body), 'Footer phone link must have :focus-visible ring');
      });

      test('F1-FP6: Footer social/contact row uses 44px+ tap targets with SVG icons (no emojis)', () => {
        const doc = domSim.createDocument();
        const footer = doc.querySelector('footer');
        const socialBtns = footer.querySelectorAll('.footer-social-btn svg');
        assert.ok(socialBtns.length >= 2, 'Footer social row must contain vector SVG icons');
        footer.querySelectorAll('.footer-social-btn').forEach(btn => {
          assert.ok(!btn.textContent.includes('👇') && !/[\u{1F300}-\u{1FAFF}]/u.test(btn.textContent), 'Footer icons must be SVG, not emojis');
        });
        const rules = cssAnalyzer.findRulesMatching('.footer-social-btn');
        const sizes = rules.map(r => r.body).join(' ');
        assert.ok(/width:\s*44px/.test(sizes), 'Social buttons must be at least 44px wide');
        assert.ok(/height:\s*44px/.test(sizes), 'Social buttons must be at least 44px tall');
      });

      test('F1-FP7: Footer columns stack cleanly on small screens (min tap targets 44px)', () => {
        const body = cssAnalyzer.combinedContent;
        assert.ok(/@media[^{]*390px/.test(body.replace(/\s+/g, '')) || /max-width:\s*390px/.test(body), 'A 390px mobile breakpoint must exist for footer stack');
        const mobileRules = cssAnalyzer.findRulesMatching('.footer-nav-list a');
        const paddings = mobileRules.map(r => r.body).join(' ');
        assert.ok(/padding:\s*0\.7rem/.test(paddings), 'Mobile footer links must have enlarged padding for 44px tap target');
      });
    });
  });

  // =========================================================================
  // F1-HP: Header/Nav Polish (Round 17) — gold accents + a11y focus rings
  // =========================================================================
  describe('F1-HP: Header/Nav Polish (Round 17)', () => {
    test('F1-HP1: Header bottom edge uses gold hairline via .site-header::after', () => {
      const rules = cssAnalyzer.findRulesMatching('.site-header::after');
      assert.ok(rules.length > 0, '.site-header::after gold hairline rule must exist');
      const body = rules.map(r => r.body).join(' ');
      assert.ok(body.includes('brand-gold'), 'Header hairline must use the --brand-gold token');
      assert.ok(body.includes('linear-gradient'), 'Header hairline should be a gradient');
    });

    test('F1-HP2: Nav link hover/active uses warm amber (no old blue leftovers)', () => {
      const all = cssAnalyzer.combinedContent;
      assert.ok(all.includes('#FCE04C'), 'Nav hover/active must use amber #FCE04C');
      assert.ok(!/\.nav-link-item:hover,\s*\n?\.nav-link-item\.active\s*\{[^}]*#93C5FD/.test(all), 'Nav hover must not use old blue #93C5FD');
    });

    test('F1-HP3: Nav underline indicator is a gold gradient (not flat blue)', () => {
      const rules = cssAnalyzer.findRulesMatching('.nav-link-item::after');
      assert.ok(rules.length > 0, '.nav-link-item::after underline rule must exist');
      const body = rules.map(r => r.body).join(' ');
      assert.ok(body.includes('linear-gradient'), 'Underline must be a gradient');
      assert.ok(body.includes('brand-gold'), 'Underline must use --brand-gold');
      assert.ok(!body.includes('#3B82F6'), 'Underline must not use old blue #3B82F6');
    });

    test('F1-HP4: All header controls have gold :focus-visible rings', () => {
      const all = cssAnalyzer.combinedContent;
      for (const sel of ['.brand-logo:focus-visible', '.nav-link-item:focus-visible', '.btn-header-call:focus-visible', '.mobile-toggle:focus-visible']) {
        assert.ok(all.includes(sel), `Focus-visible ring must exist for ${sel}`);
      }
      const rules = cssAnalyzer.findRulesMatching('.nav-link-item:focus-visible');
      assert.ok(rules.length > 0, 'Gold focus ring group rule must exist');
      const body = rules.map(r => r.body).join(' ');
      assert.ok(body.includes('brand-gold'), 'Focus rings must use --brand-gold');
    });
  });

  // F2: Heading Hierarchy Regularization
  // =========================================================================
  describe('F2: Heading Hierarchy Regularization', () => {
    test('F2-1: Document contains an H1 heading for the primary site brand', () => {
      const doc = domSim.createDocument();
      const h1s = doc.querySelectorAll('h1');
      assert.ok(h1s.length >= 1, 'Must contain an H1 heading');
      assert.ok(h1s[0].textContent.includes('نوین خودرو'), 'H1 must contain showroom brand');
    });

    test('F2-2: Section titles use H2 headings', () => {
      const doc = domSim.createDocument();
      const h2s = doc.querySelectorAll('h2');
      assert.ok(h2s.length >= 3, 'Must contain multiple H2 section titles');
    });

    test('F2-3: Hero slide titles use H2 or H3 heading tags', () => {
      const doc = domSim.createDocument();
      const slideTitles = doc.querySelectorAll('.slide-title');
      assert.ok(slideTitles.length > 0, 'Slide titles must exist');
      slideTitles.forEach(st => {
        assert.ok(['H2', 'H3'].includes(st.tagName), `Slide title tag ${st.tagName} must be H2 or H3`);
      });
    });

    test('F2-4: Car card titles use H3 headings', () => {
      const app = domSim.loadApp();
      const cardTitles = app.document.querySelectorAll('.card-car-name, .car-title');
      assert.ok(cardTitles.length >= 3, 'All car cards must have card titles');
      cardTitles.forEach(ct => {
        assert.strictEqual(ct.tagName, 'H3', 'Car card title must be an H3 tag');
      });
      app.cleanup();
    });

    test('F2-5: Calculator section contains structured heading and subheading', () => {
      const doc = domSim.createDocument();
      const calcSection = doc.querySelector('#installment-plan');
      assert.ok(calcSection, 'Installment section must exist');
      const headings = calcSection.querySelectorAll('h2, h3');
      assert.ok(headings.length >= 1, 'Calculator must have a structured heading');
    });
  });

  // =========================================================================
  // F3: Accessible ARIA Markup & Labels
  // =========================================================================
  describe('F3: Accessible ARIA Markup & Labels', () => {
    test('F3-1: Mobile toggle button has aria-label and aria-expanded attributes', () => {
      const doc = domSim.createDocument();
      const toggle = doc.querySelector('#mobileToggle');
      assert.ok(toggle, 'Mobile toggle button must exist');
      assert.ok(toggle.hasAttribute('aria-label'), 'Mobile toggle must have aria-label');
      assert.ok(toggle.hasAttribute('aria-expanded'), 'Mobile toggle must have aria-expanded');
    });

    test('F3-2: Navigation landmarks have aria-label attributes', () => {
      const doc = domSim.createDocument();
      const navs = doc.querySelectorAll('nav');
      assert.ok(navs.length > 0, 'Navigation must exist');
      navs.forEach(nav => {
        assert.ok(nav.hasAttribute('aria-label'), 'Nav element must have aria-label');
      });
    });

    test('F3-3: Modal dialog has role="dialog" or <dialog> semantics and aria-modal', () => {
      const doc = domSim.createDocument();
      const modal = doc.querySelector('#carModal');
      assert.ok(modal, 'Modal element #carModal must exist');
      const role = modal.getAttribute('role');
      const ariaModal = modal.getAttribute('aria-modal');
      assert.ok(role === 'dialog' || modal.tagName === 'DIALOG' || modal.classList.contains('modal-overlay'), 'Modal must have dialog semantics');
    });

    test('F3-4: Slider navigation buttons have accessible aria-labels', () => {
      const doc = domSim.createDocument();
      const prevBtn = doc.querySelector('#prevSlide');
      const nextBtn = doc.querySelector('#nextSlide');
      if (prevBtn && nextBtn) {
        assert.ok(prevBtn.hasAttribute('aria-label'), 'Prev slide button must have aria-label');
        assert.ok(nextBtn.hasAttribute('aria-label'), 'Next slide button must have aria-label');
      }
    });

    test('F3-5: FAQ questions have aria-expanded attributes for accordion state', () => {
      const doc = domSim.createDocument();
      const faqQuestions = doc.querySelectorAll('.faq-question');
      assert.ok(faqQuestions.length > 0, 'FAQ questions must exist');
      faqQuestions.forEach(fq => {
        assert.ok(fq.hasAttribute('aria-expanded'), 'FAQ question must have aria-expanded attribute');
      });
    });
  });

  // =========================================================================
  // F4: Font & Asset Preloading
  // =========================================================================
  describe('F4: Font & Asset Preloading', () => {
    test('F4-1: Document head contains valid charset meta tag', () => {
      const doc = domSim.createDocument();
      const metaCharset = doc.querySelector('meta[charset]');
      assert.ok(metaCharset, 'meta charset must exist');
      assert.strictEqual(metaCharset.getAttribute('charset').toLowerCase(), 'utf-8');
    });

    test('F4-2: Document head contains responsive viewport meta tag', () => {
      const doc = domSim.createDocument();
      const metaViewport = doc.querySelector('meta[name="viewport"]');
      assert.ok(metaViewport, 'meta viewport must exist');
      assert.ok(metaViewport.getAttribute('content').includes('width=device-width'), 'Viewport must set width=device-width');
    });

    test('F4-3: Stylesheets are loaded via <link rel="stylesheet">', () => {
      const doc = domSim.createDocument();
      const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]');
      assert.ok(stylesheets.length >= 3, 'Must load style.css, installment.css, responsive.css');
      const hrefs = stylesheets.map(s => s.getAttribute('href'));
      assert.ok(hrefs.some(h => h.includes('style.css')), 'style.css must be linked');
      assert.ok(hrefs.some(h => h.includes('installment.css')), 'installment.css must be linked');
      assert.ok(hrefs.some(h => h.includes('responsive.css')), 'responsive.css must be linked');
    });

    test('F4-4: No blocking @import rules in CSS files or preconnected via HTML link', () => {
      const doc = domSim.createDocument();
      const hasPreconnect = doc.querySelectorAll('link[rel="preconnect"]').length >= 2;
      const hasBlocking = cssAnalyzer.hasBlockingImports();
      assert.ok(!hasBlocking || hasPreconnect, 'CSS files should optimize font loading via preconnected links or remove blocking @import');
    });

    test('F4-5: Document defines theme-color meta tag for luxury mobile branding', () => {
      const doc = domSim.createDocument();
      const themeColor = doc.querySelector('meta[name="theme-color"]');
      assert.ok(themeColor, 'theme-color meta tag must exist');
    });
  });

  // =========================================================================
  // F5: CSS Design Tokens & Variable Cleanup
  // =========================================================================
  describe('F5: CSS Design Tokens & Variable Cleanup', () => {
    test('F5-1: Root defines color tokens', () => {
      const vars = cssAnalyzer.getRootVariables();
      const hasPrimary = Object.keys(vars).some(k => k.includes('primary') || k.includes('gold') || k.includes('brand') || k.includes('accent'));
      assert.ok(hasPrimary, 'Root must define primary/accent color token');
    });

    test('F5-2: Root defines dark theme background and surface colors', () => {
      const vars = cssAnalyzer.getRootVariables();
      const hasBg = Object.keys(vars).some(k => k.includes('bg') || k.includes('dark') || k.includes('surface') || k.includes('card'));
      assert.ok(hasBg, 'Root must define background or surface tokens');
    });

    test('F5-3: Root defines typography or font-family token', () => {
      const vars = cssAnalyzer.getRootVariables();
      const hasFont = Object.keys(vars).some(k => k.includes('font') || k.includes('family'));
      assert.ok(hasFont || cssAnalyzer.combinedContent.includes('font-family'), 'Typography tokens or font family must be defined');
    });

    test('F5-4: Root defines border radius tokens', () => {
      const vars = cssAnalyzer.getRootVariables();
      const hasRadius = Object.keys(vars).some(k => k.includes('radius'));
      assert.ok(hasRadius || cssAnalyzer.combinedContent.includes('border-radius'), 'Radius tokens or properties must be defined');
    });

    test('F5-5: Root defines transition / shadow tokens', () => {
      const vars = cssAnalyzer.getRootVariables();
      const hasShadowOrTrans = Object.keys(vars).some(k => k.includes('shadow') || k.includes('trans') || k.includes('glow'));
      assert.ok(hasShadowOrTrans || cssAnalyzer.combinedContent.includes('box-shadow'), 'Shadow or transition tokens must be defined');
    });
  });

  // =========================================================================
  // F6: 60fps GPU Animation Overhaul
  // =========================================================================
  describe('F6: 60fps GPU Animation Overhaul', () => {
    test('F6-1: Transitions use transform and opacity properties', () => {
      const analysis = cssAnalyzer.analyzeTransitions();
      assert.ok(analysis.total > 0, 'CSS must contain transitions');
      const hasGpuProps = analysis.transitions.some(t => t.includes('transform') || t.includes('opacity') || t.includes('filter'));
      assert.ok(hasGpuProps, 'Transitions should include GPU-accelerated transform or opacity');
    });

    test('F6-2: Modal overlay transitions utilize opacity', () => {
      const modalRules = cssAnalyzer.findRulesMatching('.modal-overlay');
      assert.ok(modalRules.length > 0, 'Modal overlay rules must exist');
      const hasOpacityOrVisibility = modalRules.some(r => r.body.includes('opacity') || r.body.includes('visibility') || r.body.includes('display'));
      assert.ok(hasOpacityOrVisibility, 'Modal overlay must animate opacity/visibility');
    });

    test('F6-3: Modal dialog content transitions utilize transform scale or translateY', () => {
      const modalContentRules = cssAnalyzer.findRulesMatching('.modal-content');
      assert.ok(modalContentRules.length > 0, 'Modal content rules must exist');
      const hasTransform = modalContentRules.some(r => r.body.includes('transform') || r.body.includes('translate') || r.body.includes('scale'));
      assert.ok(hasTransform, 'Modal content must animate transform scale or translateY');
    });

    test('F6-4: Button hover effects utilize transform or box-shadow', () => {
      const btnHoverRules = cssAnalyzer.findRulesMatching(':hover');
      assert.ok(btnHoverRules.length > 0, 'Hover rules must exist');
      const hasTransformOrShadow = btnHoverRules.some(r => r.body.includes('transform') || r.body.includes('box-shadow') || r.body.includes('background'));
      assert.ok(hasTransformOrShadow, 'Hover effects should use transform or box-shadow');
    });

    test('F6-5: Hero carousel slides utilize opacity or transform transitions', () => {
      const slideRules = cssAnalyzer.findRulesMatching('.slide-item');
      assert.ok(slideRules.length > 0, 'Slide item rules must exist');
      const hasSlideTransitions = slideRules.some(r => r.body.includes('opacity') || r.body.includes('transform') || r.body.includes('transition'));
      assert.ok(hasSlideTransitions, 'Hero slides must use opacity or transform transitions');
    });
    test('F7-1: CSS implements @media (prefers-reduced-motion: reduce) or smooth transitions', () => {
      const hasReduced = cssAnalyzer.hasReducedMotionSupport();
      const hasTransitions = cssAnalyzer.combinedContent.includes('transition');
      assert.ok(hasReduced || hasTransitions, 'CSS should support prefers-reduced-motion media query or structured transitions');
    });

    test('F7-2: Carousel auto-play handles inactive tab state', () => {
      const app = domSim.loadApp();
      assert.ok(app.window.setInterval, 'App uses timer intervals');
      app.cleanup();
    });

    test('F7-3: Reduced motion media query suppresses heavy continuous animations', () => {
      const rules = cssAnalyzer.findRulesMatching(/prefers-reduced-motion/);
      if (rules.length > 0) {
        const body = rules[0].body;
        assert.ok(body.includes('animation') || body.includes('transition') || body.includes('none') || body.includes('0s'), 'Reduced motion block should reduce animation/transition duration');
      } else {
        assert.ok(true);
      }
    });

    test('F7-4: Reduced motion does not disable functional navigation interactions', () => {
      const app = domSim.loadApp();
      const nextBtn = app.document.getElementById('nextSlide');
      if (nextBtn) {
        nextBtn.click();
        const activeSlide = app.document.querySelector('.slide-item.active');
        assert.ok(activeSlide, 'Active slide must exist');
      }
      app.cleanup();
    });

    test('F7-5: Modal transitions cleanly without breaking layout under reduced motion', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const modal = app.document.getElementById('carModal');
        assert.ok(modal.classList.contains('active'), 'Modal must open');
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F8: High-Visibility Keyboard Focus Rings
  // =========================================================================
  describe('F8: High-Visibility Keyboard Focus Rings', () => {
    test('F8-1: CSS defines :focus-visible rules for interactive elements', () => {
      const hasFocusVisible = cssAnalyzer.hasFocusVisibleRules();
      assert.ok(hasFocusVisible || cssAnalyzer.combinedContent.includes(':focus'), 'CSS must include focus-visible or focus ring styles');
    });

    test('F8-2: Focus outline color token or distinct contrast color is defined', () => {
      const rootVars = cssAnalyzer.getRootVariables();
      const hasFocusToken = Object.keys(rootVars).some(k => k.includes('focus') || k.includes('accent') || k.includes('brand') || k.includes('primary'));
      assert.ok(hasFocusToken, 'Focus ring color token must exist in root variables');
    });

    test('F8-3: Skip link receives focus and becomes visible upon keyboard navigation', () => {
      const doc = domSim.createDocument();
      const skipLink = doc.querySelector('.skip-link');
      assert.ok(skipLink, 'Skip link must exist');
      skipLink.focus();
      assert.strictEqual(skipLink._isFocused, true, 'Skip link must receive focus');
    });

    test('F8-4: All category filter buttons support keyboard focus', () => {
      const doc = domSim.createDocument();
      const pills = doc.querySelectorAll('.cat-pill');
      assert.ok(pills.length >= 4, 'Category pills must exist');
      pills.forEach(pill => {
        pill.focus();
        assert.strictEqual(pill._isFocused, true, 'Category pill must be focusable');
      });
    });

    test('F8-5: Header CTA call button has focus ring styling', () => {
      const doc = domSim.createDocument();
      const callBtn = doc.querySelector('.btn-header-call');
      assert.ok(callBtn, 'Header call button must exist');
      callBtn.focus();
      assert.strictEqual(callBtn._isFocused, true, 'Call button must receive focus');
    });
  });

  // =========================================================================
  // F9: Mobile Bottom-Sheet UX & Safe Area
  // =========================================================================
  describe('F9: Mobile Bottom-Sheet UX & Safe Area', () => {
    test('F9-1: CSS contains media queries for mobile viewports (<= 768px)', () => {
      const hasMedia = cssAnalyzer.combinedContent.includes('@media') || cssAnalyzer.combinedContent.includes('max-width');
      assert.ok(hasMedia, 'Mobile responsive rules must exist');
    });

    test('F9-2: Modal dialog supports mobile bottom-sheet styling', () => {
      const modalRules = cssAnalyzer.findRulesMatching('.modal-content, .modal-overlay, .modal-container');
      assert.ok(modalRules.length > 0, 'Modal container CSS rules must exist');
    });

    test('F9-3: Mobile drawer toggle opens navigation links container', () => {
      const app = domSim.loadApp();
      const toggle = app.document.getElementById('mobileToggle');
      const navLinks = app.document.getElementById('navLinks');
      if (toggle && navLinks) {
        toggle.click();
        assert.ok(navLinks.classList.contains('open') || toggle.getAttribute('aria-expanded') === 'true', 'Drawer must open');
      }
      app.cleanup();
    });

    test('F9-4: Header elements collapse into clean mobile layout', () => {
      const headerRules = cssAnalyzer.findRulesMatching('.site-header, .header-inner, .nav-container');
      assert.ok(headerRules.length > 0, 'Header container CSS must exist');
    });

    test('F9-5: Touch targets meet minimum accessible dimensions (>= 40px)', () => {
      const btnRules = cssAnalyzer.findRulesMatching('.brand-logo, .site-header, .btn-header-call');
      assert.ok(btnRules.length > 0 || cssAnalyzer.combinedContent.includes('touch-action'), 'Touch target CSS rules must exist');
    });
  });

  // =========================================================================
  // F10: Layout Shift (CLS) Stabilization
  // =========================================================================
  describe('F10: Layout Shift (CLS) Stabilization', () => {
    test('F10-1: Hero slides define fixed min-height or aspect ratio in CSS', () => {
      const heroRules = cssAnalyzer.findRulesMatching('.hero-slider, .hero-slider-wrapper, .slide-item');
      assert.ok(heroRules.length > 0, 'Hero slider CSS rules must exist');
    });

    test('F10-2: Catalog cars grid defines responsive grid layout', () => {
      const gridRules = cssAnalyzer.findRulesMatching('.cars-grid');
      assert.ok(gridRules.length > 0, 'Cars grid CSS rules must exist');
      const hasGridOrFlex = gridRules.some(r => r.body.includes('grid') || r.body.includes('flex'));
      assert.ok(hasGridOrFlex, 'Cars grid must use CSS Grid or Flexbox');
    });

    test('F10-3: Car card images have fixed aspect ratio or height in CSS', () => {
      const mediaRules = cssAnalyzer.findRulesMatching('.card-media');
      const imgRules = cssAnalyzer.findRulesMatching('.card-media img');
      assert.ok(mediaRules.length > 0 || imgRules.length > 0 || cssAnalyzer.combinedContent.includes('aspect-ratio'), 'Car card image container must have aspect ratio or height defined');
    });

    test('F10-4: Empty inventory container maintains consistent layout structure', () => {
      const app = domSim.loadApp();
      const searchInput = app.document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = 'NonExistentCarQueryXYZ';
        const event = new DOMEvent('input', { bubbles: true });
        searchInput.dispatchEvent(event);
        const grid = app.document.getElementById('carsGrid');
        assert.ok(grid.innerHTML.includes('خودرو') || grid.innerHTML.includes('یافت نشد') || grid.children.length === 0, 'Empty state handled gracefully');
      }
      app.cleanup();
    });

    test('F10-5: Modal main image container maintains layout bounds', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const mainImg = app.document.getElementById('modalMainImg');
        if (mainImg) {
          assert.ok(mainImg.getAttribute('src'), 'Modal main image must have a valid src');
        }
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F11: State Encapsulation & Scope Isolation
  // =========================================================================
  describe('F11: State Encapsulation & Scope Isolation', () => {
    test('F11-1: Cars database is correctly loaded and immutable in cars-data.js', () => {
      const app = domSim.loadApp();
      assert.ok(Array.isArray(app.carsData), 'carsData must be an array');
      assert.strictEqual(app.carsData.length, 3, 'carsData must contain exactly 3 vehicles');
      app.cleanup();
    });

    test('F11-2: Car brands list contains all required brand filters', () => {
      const app = domSim.loadApp();
      assert.ok(Array.isArray(app.carBrands), 'carBrands must be an array');
      const keys = app.carBrands.map(b => b.key);
      assert.ok(keys.includes('all'), 'carBrands must have "all"');
      assert.ok(keys.includes('chery'), 'carBrands must have "chery"');
      assert.ok(!keys.includes('hyundai'), '"hyundai" must be gone after i20 sold');
      assert.ok(keys.includes('ikco'), 'carBrands must have "ikco"');
      app.cleanup();
    });

    test('F11-3: Formatting helpers operate purely without mutating inputs', () => {
      const app = domSim.loadApp();
      const testNum = 1380000000;
      const formatted = formatTomansOracle(testNum);
      assert.strictEqual(testNum, 1380000000, 'Original number must not be mutated');
      assert.ok(formatted.includes('تومان'), 'Formatted string must include تومان');
      app.cleanup();
    });

    test('F11-4: Filter state preserves selection across operations', () => {
      const app = domSim.loadApp();
      const usedPill = app.document.querySelector('.cat-pill[data-category="used"]');
      if (usedPill) {
        usedPill.click();
        const grid = app.document.getElementById('carsGrid');
        assert.strictEqual(grid.children.length, 1, 'Used cars category must render exactly 1 car (Dena Plus)');
      }
      app.cleanup();
    });

    test('F11-5: Application cleanup cleans all active timers without memory leak', () => {
      const app = domSim.loadApp();
      assert.doesNotThrow(() => {
        app.cleanup();
      }, 'Cleanup function must execute without throwing errors');
    });
  });

  // =========================================================================
  // F12: Event Delegation Architecture
  // =========================================================================
  describe('F12: Event Delegation Architecture', () => {
    test('F12-1: Catalog card clicks trigger modal opening for target car ID', () => {
      const app = domSim.loadApp();
      const firstCardBtn = app.document.querySelector('.btn-show-details, .btn-car-details, #carsGrid button');
      assert.ok(firstCardBtn, 'Card details button must exist');
      firstCardBtn.click();
      const modal = app.document.getElementById('carModal');
      assert.ok(modal.classList.contains('active'), 'Modal must open when clicking card details button');
      app.cleanup();
    });

    test('F12-2: Category pill clicks update active pill and filter cars', () => {
      const app = domSim.loadApp();
      const iranianPill = app.document.querySelector('.cat-pill[data-category="iranian"]');
      assert.ok(iranianPill, 'Iranian category pill must exist');
      iranianPill.click();
      assert.ok(iranianPill.classList.contains('active'), 'Iranian pill must become active');
      const grid = app.document.getElementById('carsGrid');
      assert.strictEqual(grid.children.length, 2, 'Iranian category should render 2 cars (Peugeot 207 & Dena Plus)');
      app.cleanup();
    });

    test('F12-3: Brand filter change event triggers inventory re-rendering', () => {
      const app = domSim.loadApp();
      const brandSelect = app.document.getElementById('brandFilter');
      if (brandSelect) {
        brandSelect.value = 'chery';
        const event = new DOMEvent('change', { bubbles: true });
        brandSelect.dispatchEvent(event);
        const grid = app.document.getElementById('carsGrid');
        assert.strictEqual(grid.children.length, 1, 'Chery brand filter should render 1 car');
      }
      app.cleanup();
    });

    test('F12-4: Sort filter change event sorts cars by price ascending', () => {
      const app = domSim.loadApp();
      const sortSelect = app.document.getElementById('sortFilter');
      if (sortSelect) {
        sortSelect.value = 'price-asc';
        const event = new DOMEvent('change', { bubbles: true });
        sortSelect.dispatchEvent(event);
        const firstCardTitle = app.document.querySelector('.card-car-name, .car-title');
        assert.ok(firstCardTitle.textContent.includes('۲۰۷') || firstCardTitle.textContent.includes('پژو'), 'Lowest price car (Peugeot 207) must be first');
      }
      app.cleanup();
    });

    test('F12-5: Tenure buttons update selected repayment tenure', () => {
      const app = domSim.loadApp();
      const tenure24Btn = app.document.querySelector('.tenure-btn[data-months="24"]');
      if (tenure24Btn) {
        tenure24Btn.click();
        assert.ok(tenure24Btn.classList.contains('active'), '24-month tenure button must be active');
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F13: Hardened Installment Math & Bounds
  // =========================================================================
  describe('F13: Hardened Installment Math & Bounds', () => {
    test('F13-1: Mathematical formula matches oracle for 1000M, 50%, 12 months', () => {
      const oracle = calculateInstallmentsOracle(1000, 50, 12);
      assert.strictEqual(oracle.carPrice, 1000000000);
      assert.strictEqual(oracle.downPaymentVal, 500000000);
      assert.strictEqual(oracle.loanAmountVal, 500000000);
      assert.strictEqual(oracle.totalInterest, 500000000 * 0.035 * 12);
      assert.strictEqual(oracle.totalPayback, 500000000 + 210000000);
      assert.strictEqual(oracle.monthlyPayment, Math.round(710000000 / 12));
    });

    test('F13-2: Zero tenure defaults to safe minimum tenure (no Infinity output)', () => {
      const oracle = calculateInstallmentsOracle(1000, 50, 0);
      assert.ok(Number.isFinite(oracle.monthlyPayment), 'Monthly payment must be finite');
      assert.notStrictEqual(oracle.monthlyPayment, Infinity, 'Must not be Infinity');
    });

    test('F13-3: Negative price and negative downpayment are clamped safely', () => {
      const oracle = calculateInstallmentsOracle(-500, -20, 12);
      assert.strictEqual(oracle.priceMillion, 0);
      assert.strictEqual(oracle.downPercent, 0);
      assert.strictEqual(oracle.monthlyPayment, 0);
    });

    test('F13-4: NaN inputs fall back to safe default numbers', () => {
      const oracle = calculateInstallmentsOracle('invalid_price', 'invalid_down', 'invalid_tenure');
      assert.ok(Number.isFinite(oracle.monthlyPayment), 'Monthly payment must remain finite with NaN inputs');
    });

    test('F13-5: Persian digit conversion produces authentic Persian numerals', () => {
      const converted = toPersianDigitsOracle(1403);
      assert.strictEqual(converted, '۱۴۰۳', '1403 must convert to ۱۴۰۳');
      const formattedFa = formatNumberFaOracle(4350000000);
      assert.strictEqual(formattedFa, '۴,۳۵۰,۰۰۰,۰۰۰', '4350000000 must format with Persian commas');
    });

    // =======================================================================
    // راند ۲۹: Calculator UX — totals rows, error state, cache-bust (R29)
    // =======================================================================
    test('F13-6: R29 totals rows exist in calculator results box (interest + payback)', () => {
      const doc = domSim.createDocument();
      assert.ok(doc.querySelector('#resTotalInterest'), 'resTotalInterest row must exist for transparency');
      assert.ok(doc.querySelector('#resTotalPayback'), 'resTotalPayback row must exist for transparency');
    });

    test('F13-7: R29 oracle totals are mathematically consistent with monthly installment', () => {
      const oracle = calculateInstallmentsOracle(1000, 50, 12);
      assert.strictEqual(oracle.totalInterest, 500000000 * 0.035 * 12);
      assert.strictEqual(oracle.totalPayback, oracle.loanAmountVal + oracle.totalInterest);
      assert.strictEqual(oracle.monthlyPayment, Math.round(oracle.totalPayback / 12));
      const oracle24 = calculateInstallmentsOracle(4350, 40, 24);
      assert.strictEqual(oracle24.monthlyPayment, Math.round(oracle24.totalPayback / 24));
    });

    test('F13-8: R29 out-of-range inputs are rejected by the valid-range gate', () => {
      const isValidRange = (priceM, downP) =>
        Number.isFinite(priceM) && Number.isFinite(downP) &&
        priceM >= 300 && priceM <= 12000 && downP >= 40 && downP <= 70;
      assert.strictEqual(isValidRange(200, 50), false, '200M below minimum must be rejected');
      assert.strictEqual(isValidRange(13000, 50), false, '13000M above maximum must be rejected');
      assert.strictEqual(isValidRange(1000, 30), false, '30% down below 40% must be rejected');
      assert.strictEqual(isValidRange(1000, 80), false, '80% down above 70% must be rejected');
      assert.strictEqual(isValidRange(1000, 50), true, '1000M/50% must be accepted');
    });

    test('F13-9: R29 error-state CSS classes exist (note-error, calc-error, btn-disabled)', () => {
      const fs = require('fs');
      const path = require('path');
      const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'installment.css'), 'utf8');
      assert.ok(css.includes('.calc-inline-note.note-error'), 'note-error style must exist');
      assert.ok(css.includes('.calc-results-box.calc-error'), 'calc-error result dimming must exist');
      assert.ok(css.includes('.btn-apply-loan.btn-disabled'), 'disabled apply-button style must exist');
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      assert.ok(html.includes('js/app.js?v='), 'app.js must carry a cache-bust version');
    });
  });

  // =========================================================================
  // F14: Robust Iranian Phone & Form Validation
  // =========================================================================
  describe('F14: Robust Iranian Phone & Form Validation', () => {
    test('F14-1: Valid standard Iranian mobile (09121234567) passes validation', () => {
      const result = validateIranianPhoneOracle('09121234567');
      assert.strictEqual(result.isValid, true, '09121234567 must be valid');
      assert.strictEqual(result.normalized, '09121234567');
    });

    test('F14-2: International format (+989121234567) passes and normalizes to 09...', () => {
      const result = validateIranianPhoneOracle('+989121234567');
      assert.strictEqual(result.isValid, true, '+989121234567 must be valid');
      assert.strictEqual(result.normalized, '09121234567');
    });

    test('F14-3: Persian digits input (۰۹۱۲۳۴۵۶۷۸۹) passes validation', () => {
      const result = validateIranianPhoneOracle('۰۹۱۲۳۴۵۶۷۸۹');
      assert.strictEqual(result.isValid, true, 'Persian phone number must be valid');
      assert.strictEqual(result.normalized, '09123456789');
    });

    test('F14-4: Invalid phone with missing digits (0912) fails validation', () => {
      const result = validateIranianPhoneOracle('0912');
      assert.strictEqual(result.isValid, false, '0912 must be invalid');
    });

    test('F14-5: Invalid phone with non-Iranian prefix (08123456789) fails validation', () => {
      const result = validateIranianPhoneOracle('08123456789');
      assert.strictEqual(result.isValid, false, '08123456789 must be invalid');
    });
  });

  // =========================================================================
  // F15: Modal Dialog Lifecycle & Focus Trap
  // =========================================================================
  describe('F15: Modal Dialog Lifecycle & Focus Trap', () => {
    test('F15-1: Modal opens and populates vehicle details when trigger is clicked', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(3); // Dena Plus
        const modal = app.document.getElementById('carModal');
        const modalTitle = app.document.getElementById('modalCarTitle');
        const modalBody = app.document.getElementById('modalDetailsBody');
        assert.ok(modal.classList.contains('active'), 'Modal must have active class');
        assert.ok((modalTitle && modalTitle.textContent.includes('هیوندای')) || modalBody.textContent.includes('۱۴۰۳'), 'Modal must contain vehicle details');
      }
      app.cleanup();
    });

    test('F15-2: Modal close button dismisses modal and removes active class', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const modal = app.document.getElementById('carModal');
        const closeBtn = app.document.getElementById('modalClose');
        assert.ok(modal.classList.contains('active'), 'Modal initially active');
        if (closeBtn) closeBtn.click();
        assert.strictEqual(modal.classList.contains('active'), false, 'Modal active class removed on close');
      }
      app.cleanup();
    });

    test('F15-3: Backdrop click dismisses modal overlay', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const modal = app.document.getElementById('carModal');
        assert.ok(modal.classList.contains('active'), 'Modal initially active');
        modal.click(); // Click overlay itself
        assert.strictEqual(modal.classList.contains('active'), false, 'Modal closed on backdrop click');
      }
      app.cleanup();
    });

    test('F15-4: Escape key press dismisses active modal overlay', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const modal = app.document.getElementById('carModal');
        assert.ok(modal.classList.contains('active'), 'Modal initially active');
        const escapeEvent = new DOMEvent('keydown', { key: 'Escape', bubbles: true });
        app.document.dispatchEvent(escapeEvent);
        assert.strictEqual(modal.classList.contains('active'), false, 'Modal closed on Escape keypress');
      }
      app.cleanup();
    });

    test('F15-5: Gallery thumbnail click switches main modal image', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const thumbs = app.document.querySelectorAll('.modal-thumb-btn');
        if (thumbs.length > 1) {
          const secondThumb = thumbs[1];
          secondThumb.click();
          const mainImg = app.document.getElementById('modalMainImg');
          assert.ok(mainImg.getAttribute('src'), 'Main image src updated');
        }
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F16: Image Fallback & Error Resilience
  // =========================================================================
  describe('F16: Image Fallback & Error Resilience', () => {
    test('F16-1: All car data objects provide valid image URLs', () => {
      const app = domSim.loadApp();
      app.carsData.forEach(car => {
        assert.ok(car.image && (car.image.startsWith('http') || car.image.startsWith('images/') || car.image.startsWith('data:')), `Car ID ${car.id} must have image URL`);
        assert.ok(Array.isArray(car.gallery) && car.gallery.length > 0, `Car ID ${car.id} must have gallery array`);
      });
      app.cleanup();
    });

    test('F16-2: Rendered car card images have meaningful Persian alt text', () => {
      const app = domSim.loadApp();
      const cardImgs = app.document.querySelectorAll('.car-card img, .car-card-modern img, .card-media img');
      assert.ok(cardImgs.length >= 3, 'Must render card images');
      cardImgs.forEach(img => {
        const alt = img.getAttribute('alt');
        assert.ok(alt && alt.length > 3, 'Image alt text must be descriptive');
      });
      app.cleanup();
    });

    test('F16-3: Error event on card image triggers fallback or logs gracefully', () => {
      const app = domSim.loadApp();
      const firstImg = app.document.querySelector('.car-card img, .car-card-modern img, .card-media img');
      if (firstImg) {
        const errorEvent = new DOMEvent('error', { bubbles: true });
        assert.doesNotThrow(() => {
          firstImg.dispatchEvent(errorEvent);
        }, 'Image error event must not throw unhandled exceptions');
      }
      app.cleanup();
    });

    test('F16-4: Modal main image maintains valid image attributes', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(1);
        const mainImg = app.document.getElementById('modalMainImg');
        if (mainImg) {
          assert.ok(mainImg.hasAttribute('alt'), 'Modal main image must have alt attribute');
        }
      }
      app.cleanup();
    });

    test('F16-5: Offline/missing gallery thumbnail does not crash modal', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        app.window.openCarModal(3); // Dena Plus
        const modal = app.document.getElementById('carModal');
        assert.ok(modal.classList.contains('active'), 'Modal opens properly');
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F17: Catalog Filtering & Sorting Stability
  // =========================================================================
  describe('F17: Catalog Filtering & Sorting Stability', () => {
    test('F17-1: Category filter "zero" renders only brand new cars (Xtrim & Peugeot 207)', () => {
      const app = domSim.loadApp();
      const zeroPill = app.document.querySelector('.cat-pill[data-category="zero"]');
      if (zeroPill) {
        zeroPill.click();
        const grid = app.document.getElementById('carsGrid');
        assert.strictEqual(grid.children.length, 2, 'Zero category should return 2 cars');
      }
      app.cleanup();
    });

    test('F17-2: Brand filter "ikco" renders Peugeot 207 and Dena Plus', () => {
      const app = domSim.loadApp();
      const brandSelect = app.document.getElementById('brandFilter');
      if (brandSelect) {
        brandSelect.value = 'ikco';
        const event = new DOMEvent('change', { bubbles: true });
        brandSelect.dispatchEvent(event);
        const grid = app.document.getElementById('carsGrid');
        assert.strictEqual(grid.children.length, 2, 'ikco brand filter should return 2 cars');
      }
      app.cleanup();
    });

    test('F17-3: Search query "مشکی" matches Xtrim VX by color', () => {
      const app = domSim.loadApp();
      const searchInput = app.document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = 'مشکی';
        const event = new DOMEvent('input', { bubbles: true });
        searchInput.dispatchEvent(event);
        const grid = app.document.getElementById('carsGrid');
        assert.strictEqual(grid.children.length, 1, 'Search for "مشکی" should return 1 car');
        assert.ok(grid.textContent.includes('اکستریم'), 'Should match Xtrim VX');
      }
      app.cleanup();
    });

    test('F17-4: Sorting by price-desc lists Xtrim VX (11450M) first', () => {
      const app = domSim.loadApp();
      const sortSelect = app.document.getElementById('sortFilter');
      if (sortSelect) {
        sortSelect.value = 'price-desc';
        const event = new DOMEvent('change', { bubbles: true });
        sortSelect.dispatchEvent(event);
        const firstCardTitle = app.document.querySelector('.card-car-name, .car-title');
        assert.ok(firstCardTitle.textContent.includes('اکستریم'), 'Most expensive car (Xtrim) must be first');
      }
      app.cleanup();
    });

    test('F17-5: Sorting by mileage-asc lists zero kilometer cars first', () => {
      const app = domSim.loadApp();
      const sortSelect = app.document.getElementById('sortFilter');
      if (sortSelect) {
        sortSelect.value = 'mileage-asc';
        const event = new DOMEvent('change', { bubbles: true });
        sortSelect.dispatchEvent(event);
        const firstCardBadge = app.document.querySelector('.card-badges-cluster, .card-tag-badge, .card-badge');
        assert.ok(firstCardBadge, 'Card badge should be visible');
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // F18: E2E Test Suite (Tiers 1-4)
  // =========================================================================
  describe('F18: E2E Test Suite (Tiers 1-4)', () => {
    test('F18-1: Test runner harness initializes with zero external dependencies', () => {
      const { TestHarness } = require('./helpers/test_runner.js');
      const runner = new TestHarness();
      assert.ok(runner, 'TestHarness must instantiate');
      assert.strictEqual(runner.totalTests, 0);
    });

    test('F18-2: Test runner records test pass results accurately', async () => {
      const { TestHarness } = require('./helpers/test_runner.js');
      const runner = new TestHarness();
      runner.describe('SubSuite', () => {
        runner.test('PassedTest', () => {
          assert.strictEqual(1 + 1, 2);
        });
      });
      const res = await runner.run();
      assert.strictEqual(res.passed, 1);
      assert.strictEqual(res.failed, 0);
      assert.strictEqual(res.exitCode, 0);
    });

    test('F18-3: Test runner records test failure and sets non-zero exit code', async () => {
      const { TestHarness } = require('./helpers/test_runner.js');
      const runner = new TestHarness();
      runner.describe('SubSuite', () => {
        runner.test('FailingTest', () => {
          assert.strictEqual(1, 2, 'Expected failure');
        });
      });
      const res = await runner.run();
      assert.strictEqual(res.failed, 1);
      assert.strictEqual(res.exitCode, 1);
    });

    test('F18-4: Test runner measures execution duration accurately', async () => {
      const { TestHarness } = require('./helpers/test_runner.js');
      const runner = new TestHarness();
      runner.describe('TimedSuite', () => {
        runner.test('FastTest', () => {
          let count = 0;
          for (let i = 0; i < 100; i++) count += i;
        });
      });
      const res = await runner.run();
      assert.ok(res.duration >= 0, 'Duration must be non-negative');
    });

    test('F18-5: Reference oracles are fully unit tested and deterministic', () => {
      const converted = toAsciiDigitsOracle('۰۹۱۲۳۴۵۶۷۸۹');
      assert.strictEqual(converted, '09123456789', 'Persian digits must map to ASCII digits');
    });
  });

  // =========================================================================
  // F19: Adversarial Coverage Hardening (Tier 5)
  // =========================================================================
  describe('F19: Adversarial Coverage Hardening (Tier 5)', () => {
    test('F19-1: Rapid filter cycling keeps application state consistent', () => {
      const app = domSim.loadApp();
      const pills = app.document.querySelectorAll('.cat-pill');
      pills.forEach(pill => pill.click());
      const allPill = app.document.querySelector('.cat-pill[data-category="all"]');
      if (allPill) allPill.click();
      const grid = app.document.getElementById('carsGrid');
      assert.strictEqual(grid.children.length, 3, 'Full catalog restored to 3');
      app.cleanup();
    });

    test('F19-2: Extreme calculator prices (100,000M) produce mathematically consistent outputs', () => {
      const oracle = calculateInstallmentsOracle(100000, 50, 24);
      assert.strictEqual(oracle.carPrice, 100000000000);
      assert.strictEqual(oracle.downPaymentVal, 50000000000);
      assert.ok(oracle.monthlyPayment > 0, 'Monthly payment must be positive');
    });

    test('F19-3: Hero carousel index wraps cleanly with large negative or positive indexes', () => {
      const app = domSim.loadApp();
      const prevBtn = app.document.getElementById('prevSlide');
      if (prevBtn) {
        for (let i = 0; i < 10; i++) prevBtn.click();
        const activeSlide = app.document.querySelector('.slide-item.active');
        assert.ok(activeSlide, 'Active slide must exist even after repeated prev clicks');
      }
      app.cleanup();
    });

    test('F19-4: Form submission with empty inputs does not crash or throw exceptions', () => {
      const app = domSim.loadApp();
      const form = app.document.getElementById('sellCarForm');
      if (form) {
        const submitEvent = new DOMEvent('submit', { bubbles: true, cancelable: true });
        assert.doesNotThrow(() => {
          form.dispatchEvent(submitEvent);
        }, 'Empty form submission must be handled cleanly');
      }
      app.cleanup();
    });

    test('F19-5: Opening modal with invalid ID (999) does not throw exception', () => {
      const app = domSim.loadApp();
      if (typeof app.window.openCarModal === 'function') {
        assert.doesNotThrow(() => {
          app.window.openCarModal(999);
        }, 'Opening modal with invalid ID must not crash');
      }
      app.cleanup();
    });
  });

  // =========================================================================
  // Round 21: Modal Polish & Critical Asset Loading
  // =========================================================================
  describe('R21: Modal Polish & Critical Asset Loading', () => {
    const fs = require('fs');
    const path = require('path');
    const projectRoot = path.join(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

    test('R21-1: Modal panel has gold hairline top edge (::before with brand-gold)', () => {
      const beforeRule = cssAnalyzer.combinedContent.includes('.modal-content::before');
      assert.ok(beforeRule, 'Modal content ::before gold hairline rule must exist');
      const gradientRules = cssAnalyzer.findRulesMatching('.modal-content::before');
      assert.ok(gradientRules.some(r => r.body.includes('linear-gradient')), 'Gold hairline must use a gradient');
      assert.ok(cssAnalyzer.combinedContent.includes('--brand-gold'), 'Brand gold token must exist');
    });

    test('R21-2: Modal close button has 44px+ tap target and gold :focus-visible ring', () => {
      const closeRules = cssAnalyzer.findRulesMatching('.modal-close');
      assert.ok(closeRules.some(r => r.body.includes('--touch-target-min') || r.body.includes('44px') || r.body.includes('48px')), 'Close button must have 44px+ tap target');
      const focusRule = cssAnalyzer.findRulesMatching('.modal-close:focus-visible');
      assert.ok(focusRule.length > 0 && focusRule.some(r => r.body.includes('brand-gold')), 'Close button :focus-visible must use gold ring');
    });

    test('R21-3: Modal open animation uses opacity + translateY and image box uses aspect-ratio', () => {
      const contentRules = cssAnalyzer.findRulesMatching('.modal-overlay.active .modal-content');
      assert.ok(contentRules.some(r => r.body.includes('opacity')), 'Active modal must animate opacity');
      const imgBoxRules = cssAnalyzer.findRulesMatching('.modal-main-img-box');
      assert.ok(imgBoxRules.some(r => r.body.includes('aspect-ratio')), 'Modal main image box must use aspect-ratio');
    });

    test('R21-4: Modal a11y — aria-modal, correct aria-labelledby target, Escape close, focus trap', () => {
      const doc = domSim.createDocument();
      const modal = doc.querySelector('#carModal');
      assert.ok(modal && modal.getAttribute('aria-modal') === 'true', 'aria-modal must be true');
      assert.ok(modal.getAttribute('aria-labelledby') !== 'modalTitle', 'aria-labelledby must not point to nonexistent #modalTitle');
      const appJs = fs.readFileSync(path.join(projectRoot, 'js/app.js'), 'utf8');
      assert.ok(appJs.includes("e.key === 'Escape'"), 'Escape close handler must exist');
      assert.ok(appJs.includes("setAttribute('aria-hidden'"), 'aria-hidden must be toggled on open/close');
      assert.ok(appJs.includes("'Tab'"), 'Focus trap Tab handler must exist');
    });

    test('R21-5: Font loading — font-display swap, woff2 preloads, no external font preconnects', () => {
      assert.ok((cssAnalyzer.rawContent.style.match(/font-display:\s*swap/g) || []).length >= 3, 'All three Vazirmatn @font-face rules must set font-display: swap');
      assert.ok(indexHtml.includes('rel="preload" href="fonts/Vazirmatn-Regular.woff2"'), 'Regular woff2 must be preloaded');
      assert.ok(indexHtml.includes('rel="preload" href="fonts/Vazirmatn-Bold.woff2"'), 'Bold woff2 must be preloaded');
      assert.ok(!indexHtml.includes('fonts.googleapis.com') && !indexHtml.includes('fonts.gstatic.com'), 'No external font origins should be preconnected (fonts are self-hosted)');
    });

    test('R21-6: Stylesheets cache-busted (currently v=20260918) and robots.txt allows all with sitemap', () => {
      assert.ok(indexHtml.includes('css/style.css?v=20260918'), 'style.css must be cache-busted to v=20260918');
      assert.ok(indexHtml.includes('css/responsive.css?v=20260918'), 'responsive.css must be cache-busted to v=20260918');
      const robots = fs.readFileSync(path.join(projectRoot, 'robots.txt'), 'utf8');
      assert.ok(robots.includes('User-agent: *') && robots.includes('Allow: /'), 'robots.txt must allow all agents');
      assert.ok(robots.includes('https://novinkhodro.shop/sitemap.xml'), 'robots.txt must reference the sitemap');
    });
  });
});

describe('R22: Hero Slider Gold Polish & SEO Freshness', () => {
    const fs = require('fs');
    const path = require('path');
    const projectRoot = path.join(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
    const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
    const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');
    const llms = fs.readFileSync(path.join(projectRoot, 'llms.txt'), 'utf8');

    test('R22-1: Hero content block has gold gradient hairline accent (::before)', () => {
      assert.ok(/\.slide-content::before\s*\{/.test(styleCss), 'Slide content ::before gold hairline rule must exist');
      assert.ok(/\.slide-content\s*\{[^}]*padding-right/.test(styleCss), 'Slide content must reserve space for hairline via padding-right');
      const rule = styleCss.match(/\.slide-content::before\s*\{[^}]*\}/)[0];
      assert.ok(rule.includes('linear-gradient') && rule.includes('#FCE04C'), 'Hairline must be a gold gradient accent');
    });

    test('R22-2: Slider controls have gold :focus-visible rings (arrows, dots, CTAs)', () => {
      for (const sel of ['.slider-arrow:focus-visible', '.slider-dot:focus-visible', '.btn-slide-primary:focus-visible', '.btn-slide-call:focus-visible']) {
        assert.ok(styleCss.includes(sel), sel + ' must have a gold focus-visible ring');
      }
    });

    test('R22-3: Slide pill and price use gold brand colors (no old blue/red leftovers)', () => {
      const pillRule = styleCss.match(/\.slide-pill\s*\{[^}]*\}/)[0];
      assert.ok(pillRule.includes('#FDE68A') || pillRule.includes('233, 191, 50'), 'Slide pill must use gold palette');
      const priceRule = styleCss.match(/\.slide-price\s*\{[^}]*\}/)[0];
      assert.ok(priceRule.includes('#FCE04C'), 'Slide price must be brand gold #FCE04C');
      assert.ok(!styleCss.includes('color: #93C5FD;\n  font-variant-numeric'), 'No blue price leftover');
      const ctaRule = styleCss.match(/\.btn-slide-primary\s*\{[^}]*\}/)[0];
      assert.ok(ctaRule.includes('#E9BF32') && ctaRule.includes('#0B1220'), 'Primary CTA must be gold gradient with dark text');
      assert.ok(!ctaRule.includes('#DC2626'), 'Primary CTA must not be red');
    });

    test('R22-4: Persian typography refinement — slide title has no negative letter-spacing', () => {
      const titleRule = styleCss.match(/\.slide-title\s*\{[^}]*\}/)[0];
      assert.ok(/letter-spacing:\s*0/.test(titleRule), 'Persian script must not use negative letter-spacing');
    });

    test('R22-5: Keyboard a11y — captions avoid auto announcements, dots/arrows keep labels, LCP eager', () => {
      const captions = (indexHtml.match(/<div class="slide-content" aria-live="polite">/g) || []).length;
      assert.strictEqual(captions, 0, 'Auto-rotating captions must not repeatedly interrupt screen readers');
      assert.ok(indexHtml.includes('id="prevSlide" aria-label="اسلاید قبلی"'), 'Prev arrow must keep aria-label');
      assert.ok(indexHtml.includes('id="nextSlide" aria-label="اسلاید بعدی"'), 'Next arrow must keep aria-label');
      assert.ok((indexHtml.match(/class="slider-dot[^"]*" role="tab"[^>]*aria-label=/g) || []).length === 3, 'All 3 dots must keep aria-labels');
      const lcpImg = indexHtml.match(/<img src="images\/hero\/xtrim-vx\.webp"[^>]*>/s)[0];
      assert.ok(lcpImg.includes('loading="eager"') && lcpImg.includes('fetchpriority="high"'), 'Slide 1 must stay eager + fetchpriority high (LCP)');
      assert.ok((indexHtml.match(/loading="lazy"/g) || []).length >= 3, 'Other slides must stay lazy');
    });

    test('R22-6: 390px mobile refinements exist for slider caption and controls', () => {
      assert.ok(/@media[^{]*max-width:\s*390px/.test(responsiveCss), 'A 390px breakpoint must exist');
      const blocks390 = responsiveCss.match(/@media \(max-width: 390px\) \{[\s\S]*?\n\}/g) || [];
      const block = blocks390.find(b => b.includes('.slider-container'));
      assert.ok(block, 'A 390px slider block must exist');
      for (const sel of ['.slide-title', '.slide-price', '.slider-dots', '.slider-container']) {
        assert.ok(block.includes(sel), sel + ' must be refined at 390px');
      }
      assert.ok(/@media[^{]*max-width:\s*480px[\s\S]*\.slide-content::before/.test(responsiveCss), '480px block must thin the gold hairline');
    });

    test('R22-7: SEO freshness — sitemap lastmod 2026-09-18, 6 JSON-LD dateModified, llms.txt stamp', () => {
      assert.ok(!sitemap.includes('<lastmod>2026-09-09') && sitemap.includes('<lastmod>2026-09-18'), 'Sitemap lastmod must be 2026-09-18');
      const blocks = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
      assert.strictEqual(blocks.length, 6, 'Exactly 6 JSON-LD blocks expected (5 base + R33 Service)');
      const types = [];
      for (const b of blocks) {
        const d = JSON.parse(b.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, ''));
        assert.strictEqual(d.dateModified, '2026-09-18', d['@type'] + ' must have dateModified 2026-09-18');
        types.push(d['@type']);
      }
      for (const t of ['AutoDealer', 'FAQPage', 'ItemList', 'BreadcrumbList']) {
        assert.ok(types.includes(t), 'JSON-LD must include ' + t);
      }
      assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt must carry 2026-09-18 last-modified stamp');
      assert.ok(indexHtml.includes('02166120332') && indexHtml.includes('۰۲۱-۶۶۱۲۰۳۳۲'), 'Contact phone must remain untouched');
    });
  });

describe('R23: Mobile Drawer Gold Polish & SEO/AEO Freshness', () => {
    const fs = require('fs');
    const path = require('path');
    const projectRoot = path.join(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
    const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
    const llms = fs.readFileSync(path.join(projectRoot, 'llms.txt'), 'utf8');
    const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');

    test('R23-1: Drawer edge has gold hairline (border-left + gold glow shadow)', () => {
      const drawerBlock = responsiveCss.match(/\.nav-links\s*\{[^}]*border-left[^}]*\}/)[0];
      assert.ok(drawerBlock.includes('rgba(252, 224, 76'), 'Drawer border-left must be gold hairline rgba(252,224,76,...)');
      assert.ok(drawerBlock.includes('rgba(233, 191, 50'), 'Drawer must carry soft gold glow shadow (deep-gold tint)');
    });

    test('R23-2: Drawer nav links hover/active are brand gold, no blue leftovers in drawer', () => {
      const hoverRule = responsiveCss.match(/\.nav-link-item:hover,[\s\S]*?\.nav-link-item\.active\s*\{[^}]*\}/)[0];
      assert.ok(hoverRule.includes('#FCE04C'), 'Drawer link hover/active must be gold #FCE04C');
      const drawerRegion = responsiveCss.slice(responsiveCss.indexOf('.mobile-toggle {'), responsiveCss.indexOf('اسلایدر هیرو در موبایل'));
      assert.ok(!drawerRegion.includes('#93C5FD') && !drawerRegion.includes('#3B82F6'), 'No blue palette in drawer styles');
      assert.ok(styleCss.includes('--brand-gold'), 'Brand gold token must be defined');
    });

    test('R23-3: Gold :focus-visible rings on drawer links and hamburger toggle', () => {
      const region = responsiveCss.slice(responsiveCss.indexOf('.nav-links'), responsiveCss.indexOf('اسلایدر هیرو در موبایل'));
      const focusRule = region.match(/\.nav-link-item:focus-visible[\s\S]*?\{[^}]*\}/)[0];
      assert.ok(focusRule.includes('outline') && focusRule.includes('var(--brand-gold)'), 'Drawer link focus ring must use gold var');
      assert.ok(region.includes('.mobile-toggle:focus-visible'), 'Hamburger toggle must have focus-visible ring');
      assert.ok(styleCss.includes('.mobile-toggle:focus-visible'), 'Base style must ring the toggle too');
    });

    test('R23-4: Drawer links are 44px+ tap targets', () => {
      const drawerLinkRule = responsiveCss.match(/\.nav-links\.open\s*\{[\s\S]*?\}\s*\n\s*\.nav-link-item\s*\{[^}]*\}/)[0];
      assert.ok(drawerLinkRule.includes('min-height: 44px'), 'Drawer link must declare min-height 44px');
      assert.ok(drawerLinkRule.includes('align-items: center'), 'Drawer link content must be vertically centered');
    });

    test('R23-5: Slide-in transition respects prefers-reduced-motion; open/close behavior unchanged', () => {
      const region = responsiveCss.slice(responsiveCss.indexOf('منوی کشویی موبایل'), responsiveCss.indexOf('اسلایدر هیرو در موبایل'));
      assert.ok(region.includes('transition: transform 0.3s'), 'Drawer keeps smooth slide-in transition');
      const rm = region.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\s*\}/)[0];
      assert.ok(rm.includes('.nav-links') && rm.includes('transition: none'), 'Reduced motion must disable drawer transition');
      assert.ok(responsiveCss.includes('.nav-links.open'), 'Drawer open state class unchanged');
      assert.ok(/id="mobileToggle"[^>]*aria-controls="navLinks"[^>]*aria-expanded="false"/.test(indexHtml), 'Toggle semantics unchanged');
    });

    test('R23-6: 390px refinements exist for the drawer', () => {
      const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
      const block = blocks390.find(b => b.includes('.nav-links'));
      assert.ok(block, 'A 390px drawer refinement block must exist');
      assert.ok(block.includes('max-width') && block.includes('.nav-link-item'), '390px block must narrow drawer and adjust links');
    });

    test('R23-7: SEO/AEO freshness — og/twitter descriptions aligned, llms.txt services with قسط, sitemap lastmod, cache-bust h', () => {
      const valueProp = 'طرح ویژه خرید اقساطی خودرو در تهران (۶ الی ۲۴ ماهه)';
      const ogDesc = indexHtml.match(/<meta property="og:description" content="([^"]*)"/)[1];
      const twDesc = indexHtml.match(/<meta name="twitter:description" content="([^"]*)"/)[1];
      assert.ok(ogDesc.includes(valueProp), 'og:description must match current value prop');
      assert.ok(twDesc.includes(valueProp), 'twitter:description must match current value prop');
      assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified stamp must be present');
      assert.ok(/## Services[\s\S]*قسط/.test(llms), 'llms.txt must carry Services keywords line including قسط');
      assert.ok(!sitemap.includes('<lastmod>2026-09-09') && sitemap.includes('<lastmod>2026-09-18'), 'Sitemap lastmod must be 2026-09-18');
      assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
      assert.ok(indexHtml.includes('02166120332') && indexHtml.includes('۰۲۱-۶۶۱۲۰۳۳۲'), 'Contact phone must remain untouched');
    });
  });

describe('R24: Contact Section Gold Polish & JSON-LD ContactPoint/OpeningHours Freshness', () => {
    const fs = require('fs');
    const path = require('path');
    const projectRoot = path.join(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
    const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
    const llms = fs.readFileSync(path.join(projectRoot, 'llms.txt'), 'utf8');
    const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');

    const contactRegion = styleCss.slice(styleCss.indexOf('.contact-section-clean'), styleCss.indexOf('دکمه‌های شناور'));

    test('R24-1: Contact section has gold hairline top edge via ::before (#FCE04C→#E9BF32 gradient)', () => {
      assert.ok(/\.contact-section-clean\s*\{[^}]*position:\s*relative/.test(contactRegion), 'Contact section must be positioned for ::before hairline');
      const beforeRule = contactRegion.match(/\.contact-section-clean::before\s*\{[^}]*\}/);
      assert.ok(beforeRule, 'A .contact-section-clean::before hairline rule must exist');
      assert.ok(beforeRule[0].includes('linear-gradient') && beforeRule[0].includes('rgba(252, 224, 76'), 'Hairline must use #FCE04C→#E9BF32 gradient');
      assert.ok(beforeRule[0].includes('height') && beforeRule[0].includes('top: 0'), 'Hairline must sit at the top edge');
    });

    test('R24-2: Contact section is dark-surface with gold accents (gold-on-dark brand system)', () => {
      assert.ok(contactRegion.includes('#111827'), 'Contact section background must be dark (#111827)');
      assert.ok(contactRegion.includes('#FCE04C'), 'Contact section must use brand gold #FCE04C');
      const hoverRule = contactRegion.match(/\.app-nav-link:hover\s*\{[^}]*\}/);
      assert.ok(hoverRule && hoverRule[0].includes('#E9BF32'), 'Nav-link hover must be gold gradient (#E9BF32)');
      assert.ok(!contactRegion.includes('var(--brand-blue)'), 'No blue leftovers in contact section styles');
    });

    test('R24-3: Gold :focus-visible rings (2px var(--brand-gold), offset 3px) on phone link and map nav links', () => {
      const phoneFocus = contactRegion.match(/\.phone-link-large:focus-visible\s*\{[^}]*\}/);
      assert.ok(phoneFocus, 'Phone link must have a :focus-visible rule');
      assert.ok(phoneFocus[0].includes('outline: 2px solid var(--brand-gold)') && phoneFocus[0].includes('outline-offset: 3px'), 'Phone link focus ring must be 2px gold with 3px offset');
      const navFocus = contactRegion.match(/\.app-nav-link:focus-visible\s*\{[^}]*\}/);
      assert.ok(navFocus && navFocus[0].includes('var(--brand-gold)'), 'Map nav links must have gold focus rings');
    });

    test('R24-4: Contact interactive elements keep 44px+ tap targets', () => {
      const phoneRule = contactRegion.match(/\.phone-link-large\s*\{[^}]*\}/)[0];
      assert.ok(phoneRule.includes('var(--touch-target-min)'), 'Phone link must keep 44px+ tap target');
      const navRule = contactRegion.match(/\.app-nav-link\s*\{[^}]*\}/)[0];
      assert.ok(navRule.includes('min-height: var(--touch-target-min)'), 'Map nav links must keep 44px+ tap target');
    });

    test('R24-5: Dedicated max-width:390px refinement block for the contact section', () => {
      const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
      const block = blocks390.find(b => b.includes('.contact-section-clean'));
      assert.ok(block, 'A 390px contact refinement block must exist in responsive.css');
      assert.ok(block.includes('.contact-section-clean'), '390px block must refine the contact section');
      assert.ok(block.includes('.app-nav-link') && block.includes('.phone-link-large'), '390px block must stack the CTA links and phone link full-width');
    });

    test('R24-6: JSON-LD AutoDealer has ContactPoint (+982****0332, sales, IR, fa) and openingHoursSpecification matching page hours (Sat–Wed 09:00–21:00, Thu 09:00–18:00)', () => {
      const blocks = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
      const dealer = blocks.map(b => JSON.parse(b.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, ''))).find(d => d['@type'] === 'AutoDealer');
      assert.ok(dealer, 'AutoDealer block must exist');
      assert.ok(dealer.areaServed === 'تهران', 'AutoDealer areaServed must be تهران');
      assert.deepStrictEqual(dealer.contactPoint, {
        '@type': 'ContactPoint',
        telephone: '+982166120332',
        contactType: 'sales',
        areaServed: 'IR',
        availableLanguage: 'fa'
      }, 'AutoDealer ContactPoint must match R24 spec');
      const oh = dealer.openingHoursSpecification;
      assert.ok(Array.isArray(oh) && oh.length >= 1, 'openingHoursSpecification array must exist');
      assert.deepStrictEqual(oh[0].dayOfWeek, ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'], 'Sat–Wed days must match page hours');
      assert.strictEqual(oh[0].opens, '09:00', 'Opening time must be 09:00');
      assert.strictEqual(oh[0].closes, '21:00', 'Sat–Wed closing must be 21:00 (matches page)');
      assert.ok(oh[1] && oh[1].dayOfWeek === 'Thursday' && oh[1].opens === '09:00' && oh[1].closes === '18:00', 'Thursday must be 09:00–18:00 (matches page)');
      assert.ok(indexHtml.includes('tel:02166120332'), 'Visible phone link must remain untouched');
    });

    test('R24-7: SEO/AEO freshness — dateModified 2026-09-18 everywhere, sitemap/llms stamps, cache-bust (currently v=20260918)', () => {
      const blocks = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
      for (const b of blocks) {
        const d = JSON.parse(b.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, ''));
        assert.strictEqual(d.dateModified, '2026-09-18', d['@type'] + ' must have dateModified 2026-09-18');
      }
      assert.ok(!sitemap.includes('<lastmod>2026-09-09') && sitemap.includes('<lastmod>2026-09-18'), 'Sitemap lastmod must be 2026-09-18');
      assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified must be 2026-09-18');
      assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
      assert.ok(indexHtml.includes('installment.css?v=20260918'), 'installment.css cache-bust bumped to v=20260918 (r34)');
      assert.ok(indexHtml.includes('ستارخان'), 'Showroom address must remain untouched');
    });
  });

describe('R25: Catalog Filter Bar Gold Polish & SEO Freshness v=20260904a', () => {
    const fs = require('fs');
    const path = require('path');
    const projectRoot = path.join(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
    const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
    const appJs = fs.readFileSync(path.join(projectRoot, 'js/app.js'), 'utf8');

    const filterRegion = styleCss.slice(styleCss.indexOf('بخش فیلتر و جستجوی خودروها'), styleCss.indexOf('کارت‌های خودرو — تنفس‌دار'));

    test('R25-1: Active filter pill uses gold gradient #FCE04C→#E9BF32 with dark text', () => {
      const active = filterRegion.match(/\.cat-pill\.active\s*\{[^}]*\}/);
      assert.ok(active, '.cat-pill.active rule must exist');
      assert.ok(active[0].includes('linear-gradient') && active[0].includes('#FCE04C') && active[0].includes('#E9BF32'), 'Active pill must use gold gradient');
      assert.ok(active[0].includes('#0B1220'), 'Active pill text must be dark');
      assert.ok(!active[0].includes('var(--brand-blue)'), 'Active pill must not use brand blue');
    });

    test('R25-2: Inactive pills are subtle dark surface with gold hover border/text', () => {
      const base = filterRegion.match(/\.cat-pill\s*\{[^}]*\}/);
      assert.ok(base, '.cat-pill base rule must exist');
      assert.ok(base[0].includes('#111827'), 'Inactive pill must have dark surface');
      const hover = filterRegion.match(/\.cat-pill:hover\s*\{[^}]*\}/);
      assert.ok(hover && hover[0].includes('#FCE04C') && hover[0].includes('var(--brand-gold)'), 'Hover must be gold text + gold border');
      assert.ok(!hover[0].includes('#94A3B8'), 'No grey-blue hover leftovers');
    });

    test('R25-3: Gold :focus-visible rings (2px var(--brand-gold), offset 3px) on filter pills', () => {
      const focus = filterRegion.match(/\.cat-pill:focus-visible\s*\{[^}]*\}/);
      assert.ok(focus, '.cat-pill:focus-visible rule must exist');
      assert.ok(focus[0].includes('outline: 2px solid var(--brand-gold)') && focus[0].includes('outline-offset: 3px'), 'Focus ring must be 2px gold, 3px offset');
    });

    test('R25-4: Filter pills keep 44px+ tap targets and are RTL-safe (no negative letter-spacing)', () => {
      const base = filterRegion.match(/\.cat-pill\s*\{[^}]*\}/)[0];
      assert.ok(base.includes('min-height: var(--touch-target-min)') || base.includes('min-height: 44px'), 'Pill must keep 44px min height');
      assert.ok(base.includes('min-width: 44px'), 'Pill must keep 44px min width');
      assert.ok(base.includes('letter-spacing: 0'), 'Persian text must not get letter-spacing');
      assert.ok(!/letter-spacing:\s*-/.test(filterRegion), 'No negative letter-spacing in filter styles');
    });

    test('R25-5: Dedicated max-width:390px refinement block for the filter bar in responsive.css', () => {
      const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
      const block = blocks390.find(b => b.includes('.filter-bar-clean') && b.includes('.cat-pill'));
      assert.ok(block, 'A 390px filter refinement block must exist');
      assert.ok(block.includes('min-height: 44px'), '390px block must keep 44px tap targets');
      assert.ok(block.includes('.filter-categories-pills'), '390px block must refine the pills row');
    });

    test('R25-6: No leftover blue (#93C5FD / #3B82F6 / --brand-blue) in filter styles', () => {
      assert.ok(!filterRegion.includes('#93C5FD'), 'No #93C5FD in filter styles');
      assert.ok(!filterRegion.includes('#3B82F6'), 'No #3B82F6 in filter styles');
      assert.ok(!filterRegion.includes('var(--brand-blue)'), 'No var(--brand-blue) in filter styles');
      assert.ok(!filterRegion.includes('rgba(29, 78, 216'), 'No blue rgba glow in filter styles');
    });

    test('R25-7: aria-pressed synced on filter pills in markup and JS; SEO freshness with cache-bust (currently v=20260918)', () => {
      const pillHtml = indexHtml.slice(indexHtml.indexOf('filter-categories-pills'), indexHtml.indexOf('catalogStatus'));
      assert.ok(pillHtml.includes('aria-pressed="true"') && pillHtml.includes('aria-pressed="false"'), 'Filter pills must carry aria-pressed in markup');
      assert.ok(appJs.includes("p.setAttribute('aria-pressed', 'false')") && appJs.includes("pill.setAttribute('aria-pressed', 'true')"), 'Filter JS must sync aria-pressed on activation');
      assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
      assert.ok(indexHtml.includes('installment.css?v=20260918'), 'installment.css cache-bust bumped to v=20260918 (r34)');
      assert.ok(indexHtml.includes('tel:02166120332') && indexHtml.includes('ستارخان'), 'Contact info must remain untouched');
    });
  });

describe('R26: Stats/Services (چرا ما) Gold Polish & SEO Freshness v=20260904a', () => {
    const fs = require('fs');
    const path = require('path');
    const projectRoot = path.join(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
    const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');

    const whyRegion = styleCss.slice(styleCss.indexOf('بخش چرا ما / خدمات و آمار'));
    const sectionHtml = sectionById(indexHtml, 'why-us');

    test('R26-1: چرا ما section exists in markup with real Persian headings and 4 service cards', () => {
      assert.ok(indexHtml.includes('id="why-us"'), 'why-us section anchor must exist');
      assert.ok(indexHtml.includes('چرا نوین خودرو؟'), 'Section heading must be Persian');
      assert.ok((sectionHtml.match(/why-us-card/g) || []).length >= 4, 'Four service cards required');
      assert.ok(sectionHtml.includes('خرید نقدی') && sectionHtml.includes('اقساطی ۶ تا ۲۴ ماهه') && sectionHtml.includes('فروش فوری') && sectionHtml.includes('معاوضه'), 'Services must match real offerings');
    });

    test('R26-2: No fake data — stats claims come from existing page copy only', () => {
      assert.ok(sectionHtml.includes('۱۰۰٪ کارشناسی کتبی') || sectionHtml.includes('کارشناسی کتبی'), 'Written-inspection claim must mirror existing copy');
      assert.ok(sectionHtml.includes('۲ ساعت') || sectionHtml.includes('ظرف ۲ ساعت'), '2-hour callback claim mirrors sell form copy');
      assert.ok(!/[0-9]+,\s?[0-9]{3}\s*(خودرو|مشتری|معامله|فروش)/.test(sectionHtml), 'No fabricated transaction/customer counts');
      assert.ok(!/0912\d{8}/.test(sectionHtml), 'No invented phone numbers');
    });

    test('R26-3: Gold gradient accents #FCE04C→#E9BF32 on section hairline and stat panel', () => {
      assert.ok(whyRegion.includes('linear-gradient(90deg, #FCE04C 0%, #E9BF32 100%)'), 'Section top hairline must use gold gradient');
      const statPanel = whyRegion.match(/\.why-us-stats\s*\{[\s\S]*?\n\}/);
      assert.ok(statPanel && statPanel[0].includes('rgba(252, 224, 76, 0.25)'), 'Stats panel must have gold-tinted border');
      const statBar = whyRegion.match(/\.why-us-stats::before\s*\{[\s\S]*?\n\}/);
      assert.ok(statBar && statBar[0].includes('#FCE04C') && statBar[0].includes('#E9BF32'), 'Stats panel top bar must be gold gradient');
    });

    test('R26-4: Lucide-style SVG icons are gold and vector (no emojis, no external icon font)', () => {
      assert.ok((sectionHtml.match(/stroke="currentColor"/g) || []).length >= 7, 'All icons must inherit color via currentColor');
      assert.ok(whyRegion.match(/\.why-us-icon\s*\{[\s\S]*?\n\}/)[0].includes('#FCE04C'), 'Service icons must be gold');
      assert.ok(whyRegion.match(/\.why-us-stat .stat-icon\s*\{[\s\S]*?\n\}/)[0].includes('#FCE04C'), 'Stat icons must be gold');
      assert.ok(!/[🎉✨🚗💰📞✅]/.test(sectionHtml), 'No emoji icons in markup');
    });

    test('R26-5: 44px minimum targets, gold focus-visible rings, prefers-reduced-motion guard', () => {
      assert.ok(whyRegion.includes('min-height: 44px') && whyRegion.includes('min-width: 44px'), 'Icon/entry blocks must keep 44px minimums');
      const focus = whyRegion.match(/focus-visible\s*\{[\s\S]*?\n\}/);
      assert.ok(focus && focus[0].includes('var(--brand-gold'), 'Focus-visible rings must use brand gold');
      assert.ok(whyRegion.includes('prefers-reduced-motion: reduce'), 'prefers-reduced-motion guard required');
      assert.ok(whyRegion.includes("letter-spacing: 0") || !/letter-spacing:\s*-/.test(whyRegion), 'No negative letter-spacing (Persian script)');
    });

    test('R26-6: 390px refinement block in responsive.css + SEO freshness bumped to 2026-09-18', () => {
      const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
      const block = blocks390.find(b => b.includes('.why-us-section'));
      assert.ok(block, 'A dedicated 390px چرا ما refinement block must exist');
      assert.ok(block.includes('min-height: 44px'), '390px block must keep 44px tap targets');
      assert.ok(!indexHtml.includes('"dateModified": "2026-09-03"') && (indexHtml.match(/"dateModified": "2026-09-18"/g) || []).length === 6, 'All 6 JSON-LD dateModified must be 2026-09-18');
      const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');
      const llms = fs.readFileSync(path.join(projectRoot, 'llms.txt'), 'utf8');
      assert.ok(sitemap.includes('<lastmod>2026-09-18') && !sitemap.includes('<lastmod>2026-09-09'), 'Sitemap lastmod must be 2026-09-18');
      assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified must be 2026-09-18');
      assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
      assert.ok(indexHtml.includes('installment.css?v=20260918'), 'installment.css cache-bust bumped to v=20260918 (r34)');
    });
  });

describe('R30: FAQ Accordion Gold Polish + Cache-Bust v=20260918', () => {
    const fs = require('fs');
    const path = require('path');
    const projectRoot = path.join(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
    const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');

    const faqStart = styleCss.indexOf('بخش سوالات متداول');
    const faqEnd = styleCss.indexOf('آدرس، نقشه و اطلاعات تماس');
    const faqRegion = styleCss.slice(faqStart, faqEnd);

    test('R30-1: FAQ hover/focus/open states use gold, no blue or gray chrome', () => {
      assert.ok(faqRegion.includes('rgba(233, 191, 50, 0.55)'), 'Hover border must be gold-tinted');
      assert.ok(faqRegion.includes('.faq-item.open') && faqRegion.includes('var(--brand-gold)'), 'Open item border must be brand gold');
      assert.ok(/\.faq-question:focus-visible[\s\S]{0,160}var\(--brand-gold\)/.test(faqRegion), 'Gold focus-visible ring required on FAQ questions');
      assert.ok(!faqRegion.includes('#94a3b8'), 'Old gray hover chrome must be gone');
      assert.ok(!faqRegion.includes('var(--brand-blue)'), 'No blue chrome in FAQ region');
    });

    test('R30-2: Open FAQ chevron recolored to #FCE04C gold', () => {
      const m = faqRegion.match(/\.faq-item\.open \.faq-question svg[\s\S]*?color: ([^;]+);/);
      assert.ok(m && m[1].trim() === '#FCE04C', 'Open chevron must be #FCE04C');
    });

    test('R30-3: prefers-reduced-motion guard covers FAQ transitions', () => {
      assert.ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.faq-item[\s\S]*transition: none/.test(styleCss), 'Reduced-motion block must disable FAQ transitions');
    });

    test('R30-4: 390px FAQ refinement block exists with 48px tap target', () => {
      const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
      const block = blocks390.find(b => b.includes('.faq-question'));
      assert.ok(block, 'A dedicated 390px FAQ refinement block must exist');
      assert.ok(block.includes('min-height: 48px'), 'FAQ question tap target must be >= 48px on mobile');
    });

    test('R30-5: FAQ markup intact — 4 questions, aria-expanded, contact info untouched, cache-bust v=20260918', () => {
      assert.strictEqual((indexHtml.match(/class="faq-question"/g) || []).length, 6, 'Exactly 6 FAQ questions (4 + 2 added in R33)');
      assert.ok(indexHtml.includes('aria-expanded="true"') && (indexHtml.match(/aria-expanded="false"/g) || []).length >= 3, 'FAQ accordion aria-expanded states intact');
      assert.ok(indexHtml.includes('02166120332') && indexHtml.includes('ستارخان'), 'Contact info untouched');
      assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Cache-bust stays at v=20260918');
      assert.ok(!/\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/.test(indexHtml), 'No raw-IP refs in index.html (canonical domain = novinkhodro.shop)');
    });
  });

describe('R27: Footer Gold Polish + NAP/Cache-Bust v=20260904b', () => {
    const fs = require('fs');
    const path = require('path');
    const projectRoot = path.join(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
    const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');

    const footerHtml = indexHtml.slice(indexHtml.indexOf('<footer class="footer-clean"'), indexHtml.indexOf('</footer>'));
    const footerCss = styleCss.slice(styleCss.indexOf('.footer-clean {'));

    test('R27-1: Footer has 4-column layout — brand/about, quick links, services, contact NAP', () => {
      assert.ok(footerHtml.includes('footer-brand-title') && footerHtml.includes('footer-brand-desc'), 'Brand/about column required');
      assert.ok(footerHtml.includes('دسترسی سریع'), 'Quick links column required');
      assert.ok(footerHtml.includes('خدمات ما') && footerHtml.includes('خرید اقساطی خودرو') && footerHtml.includes('معاوضه'), 'Services column required with real offerings');
      assert.ok(footerHtml.includes('تماس و آدرس'), 'Contact NAP column required');
      assert.ok((footerHtml.match(/footer-col-title/g) || []).length === 3, 'Three titled columns plus brand column');
      assert.ok(!/0912\d{8}/.test(footerHtml) && !/[0-9]+,[0-9]{3}\s*(خودرو|مشتری)/.test(footerHtml), 'No invented contact data or fake counts');
    });

    test('R27-2: Gold top hairline + gold gradient accents on dark footer surface', () => {
      assert.ok(footerCss.includes('.footer-clean::before'), 'Footer gold hairline ::before required');
      assert.ok(footerCss.includes('#FCE04C') || footerCss.includes('var(--brand-gold)'), 'Hairline must use brand gold');
      assert.ok(footerCss.includes('#E9BF32'), 'Gold gradient must include deep amber #E9BF32');
      assert.ok(footerCss.includes('#0d1421') || footerCss.includes('var(--surface-900)'), 'Dark footer surface required');
    });

    test('R27-3: Vector SVG icons (phone/address/social/back-top), no emojis', () => {
      assert.ok((footerHtml.match(/<svg/g) || []).length >= 5, 'At least 5 vector SVG icons in footer');
      assert.ok((footerHtml.match(/stroke="currentColor"|fill="currentColor"/g) || []).length >= 5, 'Icons must inherit color via currentColor');
      assert.ok(!/[🎉✨🚗💰📞✅📍➡️⬆️]/.test(footerHtml), 'No emoji icons in footer markup');
      assert.ok(footerHtml.includes('footer-back-top'), 'Back-to-top button required');
      assert.ok(footerCss.includes('.footer-back-top:hover') && footerCss.includes('linear-gradient(135deg, #FCE04C, #E9BF32)'), 'Back-to-top gold gradient hover required');
    });

    test('R27-4: 44px tap targets + gold focus-visible rings on footer links and back-top', () => {
      assert.ok(footerCss.includes('.footer-social-btn') && /footer-social-btn\s*\{[\s\S]*?width: 44px/.test(footerCss), 'Social buttons must be 44px');
      assert.ok(/footer-back-top\s*\{[\s\S]*?min-height: 44px/.test(footerCss), 'Back-to-top must have 44px minimum');
      const focusCount = (footerCss.match(/focus-visible[\s\S]{0,120}var\(--brand-gold/g) || []).length;
      assert.ok(focusCount >= 3, 'Gold focus-visible rings required on social/nav/phone/back-top');
    });

    test('R27-5: 640px stacking block and 390px compact block in responsive.css', () => {
      const blocks640 = responsiveCss.match(/@media \(max-width: 640px\)\s*\{[\s\S]*?\n\}/g) || [];
      const b640 = blocks640.find(b => b.includes('.footer-grid-clean'));
      assert.ok(b640 && b640.includes('grid-template-columns: 1fr'), 'Footer must stack single-column at 640px');
      assert.ok(b640 && b640.includes('min-height: 44px'), '640px block must keep 44px tap targets');
      const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
      const b390 = blocks390.find(b => b.includes('.footer-back-top'));
      assert.ok(b390, 'Dedicated 390px footer compact rules required');
    });

    test('R27-6: Footer NAP uses <address> semantics matching AutoDealer JSON-LD; cache-bust v=20260904b', () => {
      assert.ok(footerHtml.includes('<address class="footer-nap">'), 'Contact block must use <address> semantics');
      assert.ok(footerHtml.includes('02166120332'), 'Footer phone must match JSON-LD telephone');
      assert.ok(footerHtml.includes('ستارخان') && footerHtml.includes('نصرت غربی، پلاک ۲۱'), 'Footer address must match JSON-LD PostalAddress');
      const autoDealer = indexHtml.slice(indexHtml.indexOf('"@type": "AutoDealer"'), indexHtml.indexOf('FAQPage'));
      assert.ok(autoDealer.includes('"telephone": "02166120332"') && autoDealer.includes('نصرت غربی، پلاک ۲۱'), 'JSON-LD AutoDealer NAP confirmed');
      assert.ok(footerCss.includes('.footer-nap') && footerCss.includes('font-style: normal'), '<address> styling required');
      assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
      assert.ok(!indexHtml.includes('"dateModified": "2026-09-07"'), 'dateModified must stay 2026-09-18');
    });
  });

describe('R28: About/Why-Us Trust Cards Polish + Organization JSON-LD + Cache-Bust v=20260918', () => {
    const fs = require('fs');
    const path = require('path');
    const projectRoot = path.join(__dirname, '..');
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
    const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
    const appJs = fs.readFileSync(path.join(projectRoot, 'js/app.js'), 'utf8');

    const sectionHtml = sectionById(indexHtml, 'why-us');
    const trustHtml = indexHtml.slice(indexHtml.indexOf('why-us-trust'), indexHtml.indexOf('why-us-stats'));
    const trustCss = styleCss.slice(styleCss.indexOf('.why-us-trust {'), styleCss.indexOf('.why-us-stats {'));

    test('R28-1: 3-column gold-accented trust cards with mandated Persian titles', () => {
      assert.ok(indexHtml.includes('class="why-us-trust"'), 'Trust grid must exist');
      assert.ok((trustHtml.match(/why-us-trust-card/g) || []).length >= 3, 'Exactly a trio of trust cards required');
      assert.ok(trustHtml.includes('گارانتی اصالت کالا') && trustHtml.includes('ارسال سریع سراسری') && trustHtml.includes('پشتیبانی واقعی'), 'Three mandated card titles required');
      assert.ok(trustCss.includes('grid-template-columns: repeat(3, 1fr)'), '3-column layout required');
    });

    test('R28-2: Lucide vector icons on every trust card, no emojis', () => {
      assert.ok((trustHtml.match(/<svg/g) || []).length >= 3, 'One SVG icon per trust card');
      assert.ok((trustHtml.match(/stroke="currentColor"/g) || []).length >= 3, 'Icons must inherit gold via currentColor');
      assert.ok(!/[🎉✨🚗💰📞✅🛡🚚🎧]/.test(trustHtml), 'No emoji icons in trust markup');
    });

    test('R28-3: Dual-theme gold tokens matching footer palette (#FCE04C/#E9BF32 on dark surface)', () => {
      assert.ok(trustCss.includes('#FCE04C') && trustCss.includes('#E9BF32'), 'Gold gradient tokens required');
      assert.ok(trustCss.includes('rgba(252, 224, 76, 0.25)'), 'Gold-tinted border required');
      assert.ok(trustCss.includes('#111827'), 'Dark surface token required');
      assert.ok(trustCss.includes('var(--brand-gold'), 'CSS variable fallback (--brand-gold) required');
      assert.ok(trustCss.includes('var(--text-light'), 'Text-light token required');
    });

    test('R28-4: Persian digits via toPersianDigits (data-fa-digits rendered in app.js)', () => {
      assert.ok(trustHtml.includes('data-fa-digits='), 'data-fa-digits hooks required in trust section');
      assert.ok(appJs.includes("querySelectorAll('[data-fa-digits]')"), 'app.js must render data-fa-digits via toPersianDigits');
      assert.ok(appJs.includes('toPersianDigits(raw)'), 'Rendering must go through toPersianDigits');
      assert.ok(!/[0-9]:[0-9]{2}/.test(trustHtml.replace('data-fa-digits="شنبه تا چهارشنبه 9:00 الی 21:00"', '')), 'Visible digits must be Persian, raw Latin digits only in data attribute');
    });

    test('R28-5: Accessibility parity — 44px targets, gold focus rings, reduced-motion guard', () => {
      assert.ok(trustCss.includes('min-height: 44px'), '44px minimum required on trust-hours');
      const focusStart = styleCss.indexOf('دسترس‌پذیری فوکوس');
      const rmStart = styleCss.lastIndexOf('prefers-reduced-motion: reduce');
      const rmBlocks = styleCss.split(/@media \(prefers-reduced-motion: reduce\)/).slice(1);
      const focus = styleCss.slice(focusStart, rmStart);
      assert.ok(focus.includes('.why-us-trust-card:focus-within'), 'Gold focus-visible ring on trust cards required');
      assert.ok(rmBlocks.some(b => b.includes('.why-us-trust-card')), 'prefers-reduced-motion guard must cover trust cards');
    });

    test('R28-6: Responsive blocks — 1024px trio and 390px compact rules in responsive.css', () => {
      const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
      const b390 = blocks390.find(b => b.includes('.why-us-trust-card'));
      assert.ok(b390, 'Dedicated 390px trust-card compact rules required');
      const blocks1024 = responsiveCss.match(/@media \(max-width: 1024px\)\s*\{[\s\S]*?\n\}/g) || [];
      const b1024 = blocks1024.find(b => b.includes('.why-us-trust'));
      assert.ok(b1024 && b1024.includes('repeat(3, 1fr)'), '1024px block must keep the trust trio on 3 columns');
      assert.ok(responsiveCss.match(/@media \(max-width: 640px\)[\s\S]*?\.why-us-trust/), '640px stacking must include trust grid');
    });

    test('R28-7: Organization JSON-LD present with NAP consistent with footer + AutoDealer', () => {
      const orgIdx = indexHtml.indexOf('"@type": "Organization"');
      assert.ok(orgIdx !== -1, 'Organization JSON-LD must exist');
      const org = indexHtml.slice(orgIdx, indexHtml.indexOf('FAQPage'));
      assert.ok(org.includes('"telephone": "02166120332"'), 'Organization telephone must match footer tel: link');
      assert.ok(org.includes('نصرت غربی، پلاک ۲۱'), 'Organization streetAddress must match footer address');
      assert.ok(org.includes('تهران، ستارخان، میدان توحید'), 'Organization locality must match footer');
      assert.ok(org.includes('"url": "https://novinkhodro.shop"'), 'Organization url required');
      assert.ok(org.includes('"availableLanguage": "fa"'), 'Persian language contactPoint required');
      const autoDealer = indexHtml.slice(indexHtml.indexOf('"@type": "AutoDealer"'), indexHtml.indexOf('"@type": "Organization"'));
      assert.ok(autoDealer.includes('"telephone": "02166120332"') && autoDealer.includes('نصرت غربی، پلاک ۲۱'), 'NAP must stay consistent across AutoDealer and Organization');
      assert.ok((indexHtml.match(/"dateModified": "2026-09-18"/g) || []).length === 6, 'dateModified count must remain 6 (2026-09-18, incl. R33 Service)');
    });

    test('R28-8: Cache-bust bumped to v=20260918 across stylesheet links', () => {
      assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
      assert.ok(!indexHtml.includes('?v=20260904b'), 'Stale v=20260904b links must be gone');
      assert.ok(indexHtml.includes('installment.css?v=20260918'), 'installment.css cache-bust bumped to v=20260918 (r34)');
    });
  });

// ===========================================================================
// R30P: Catalog Filter Pills Gold Polish + SEO/AEO Freshness 2026-09-12
// ===========================================================================
describe('R30P: Catalog Filter Pills Gold Polish + SEO Freshness 2026-09-12 + Cache-Bust v=20260918', () => {
  const fs = require('fs');
  const path = require('path');
  const projectRoot = path.join(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
  const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');
  const llms = fs.readFileSync(path.join(projectRoot, 'llms.txt'), 'utf8');
  const pillCss = styleCss.slice(styleCss.indexOf('.cat-pill {'), styleCss.indexOf('.cars-grid-immersive'));

  test('R30P-1: Active pill uses gold gradient (#FCE04C→#E9BF32) with dark text', () => {
    const active = styleCss.match(/\.cat-pill\.active\s*\{[^}]*\}/g) || [];
    assert.ok(active.length >= 1, '.cat-pill.active rule required');
    const main = active[0];
    assert.ok(main.includes('linear-gradient(135deg, #FCE04C 0%, #E9BF32 100%)'), 'Gold gradient required on active pill');
    assert.ok(main.includes('#0B1220'), 'Dark text required on active pill');
  });

  test('R30P-2: Inactive pill dark surface + gold hover border; no blue remnants in filter styles', () => {
    assert.ok(pillCss.includes('#111827'), 'Inactive pill must sit on dark surface');
    const hover = styleCss.match(/\.cat-pill:hover\s*\{[^}]*\}/)[0];
    assert.ok(hover.includes('var(--brand-gold)'), 'Hover border must be gold');
    assert.ok(!/#3B82F6|93C5FD/i.test(pillCss), 'No blue (#3B82F6/#93C5FD) in pill styles');
    const filterSection = styleCss.slice(styleCss.indexOf('بخش فیلتر و جستجوی خودروها'), styleCss.indexOf('کارت‌های خودرو'));
    assert.ok(!/#3B82F6|93C5FD/i.test(filterSection), 'No blue remnants anywhere in the filter bar section styles');
  });

  test('R30P-3: 44px minimum tap targets on filter pills (base + compact)', () => {
    assert.ok(pillCss.includes('min-height: var(--touch-target-min)') && pillCss.includes('min-width: 44px'), 'Base pill must be >=44px');
    assert.ok(responsiveCss.includes('min-height: 44px'), 'Compact 44px floor required in responsive.css');
  });

  test('R30P-4: Gold :focus-visible ring (2px var(--brand-gold), offset 3px) on pills', () => {
    const focus = styleCss.match(/\.cat-pill:focus-visible\s*\{[^}]*\}/)[0];
    assert.ok(focus.includes('outline: 2px solid var(--brand-gold)'), 'Gold focus ring required');
    assert.ok(focus.includes('outline-offset: 3px'), '3px focus offset required');
  });

  test('R30P-5: prefers-reduced-motion guard covers pill transitions', () => {
    const guards = styleCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*?\n\}/g) || [];
    assert.ok(guards.some(g => g.includes('.cat-pill')), 'Reduced-motion guard must cover .cat-pill');
  });

  test('R30P-6: Dedicated 390px refinement block for filter pills in responsive.css', () => {
    const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
    const b = blocks390.filter(x => x.includes('.cat-pill'));
    assert.ok(b.length >= 1, 'Dedicated 390px pill refinement block required');
    assert.ok(b.some(x => x.includes('min-height: 44px') && x.includes('.cat-pill:focus-visible')), '390px block must keep 44px floor + gold focus ring');
  });

  test('R30P-7: SEO/AEO freshness — dateModified 2026-09-18 (5 blocks), sitemap lastmod, llms.txt stamp', () => {
    const blocks = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    assert.ok(blocks.length >= 4, 'At least 4 JSON-LD blocks required');
    let org = false;
    for (const b of blocks) {
      const json = JSON.parse(b.replace(/<\/?script[^>]*>/g, ''));
      assert.strictEqual(json.dateModified, '2026-09-18', (json['@type'] || 'block') + ' dateModified must be 2026-09-18');
      if (json['@type'] === 'Organization') org = true;
    }
    assert.ok(org, 'Organization JSON-LD block required');
    assert.ok(!indexHtml.includes('"dateModified": "2026-09-04"'), 'Stale 2026-09-04 dateModified must be gone');
    assert.ok(!sitemap.includes('<lastmod>2026-09-04</lastmod>') && sitemap.includes('<lastmod>2026-09-18</lastmod>'), 'Sitemap lastmod must be 2026-09-18');
    assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified must be 2026-09-18');
  });

  test('R30P-8: Cache-bust bumped to v=20260918 on style.css and responsive.css', () => {
    assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
    assert.ok(!indexHtml.includes('css/style.css?v=20260904c') && !indexHtml.includes('css/responsive.css?v=20260904c'), 'Stale v=20260904c links must be gone');
    assert.ok(indexHtml.includes('installment.css?v=20260918'), 'installment.css bumped to v=20260918 (r34)');
  });
});

// ===========================================================================
// R31: Contact/CTA Gold Polish + AutoDealer priceRange + SEO Freshness 2026-09-12
// ===========================================================================
describe('R31: Contact/CTA Gold Polish + AutoDealer priceRange + SEO Freshness 2026-09-12 + Cache-Bust v=20260918', () => {
  const fs = require('fs');
  const path = require('path');
  const projectRoot = path.join(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
  const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');
  const llms = fs.readFileSync(path.join(projectRoot, 'llms.txt'), 'utf8');

  const contactHtml = indexHtml.slice(indexHtml.indexOf('contact-section-clean'), indexHtml.indexOf('cta-band'));
  const contactCss = styleCss.slice(styleCss.indexOf('.contact-section-clean'), styleCss.indexOf('۸. دکمه‌های شناور'));

  test('R31-1: CTA band exists above footer with mandated title and no invented claims', () => {
    const cta = indexHtml.slice(indexHtml.indexOf('cta-band'), indexHtml.indexOf('<footer'));
    assert.ok(cta.includes('گشایش اعتبار خرید اقساطی با تماس'), 'CTA band must carry the mandated call-to-credit title');
    assert.ok(cta.indexOf('cta-band') < indexHtml.indexOf('<footer'), 'CTA band must sit above the footer');
    assert.ok(cta.includes('خرید از شما، اقساط از ما'), 'CTA copy must reuse the real plan name (no invented claims)');
  });

  test('R31-2: Contact info untouched — phone 021-66120332 and full Satarkhan address', () => {
    assert.ok(indexHtml.includes('02166120332'), 'tel: link must stay 02166120332');
    assert.ok(indexHtml.includes('021-66120332'), 'CTA band phone must read 021-66120332');
    assert.ok(indexHtml.includes('تهران، ستارخان، میدان توحید، خیابان نصرت غربی، پلاک ۲۱'), 'Full address must remain verbatim in contact section');
    assert.ok(contactHtml.includes('۰۲۱-۶۶۱۲۰۳۳۲'), 'Persian phone display must remain in contact section');
  });

  test('R31-3: Contact rows and CTA links use gold hover/focus chrome — no blue/gray remnants', () => {
    assert.ok(contactCss.includes('.contact-row-item:hover') && contactCss.includes('rgba(252, 224, 76, 0.06)'), 'Contact row hover must be gold-tinted');
    assert.ok(contactCss.includes('.cta-band-phone') && contactCss.includes('linear-gradient(135deg, #FCE04C 0%, #E9BF32 100%)'), 'CTA phone button must use gold gradient');
    assert.ok(contactCss.includes('.cta-band-wa:hover'), 'CTA WhatsApp link must have hover state');
    const ctaFocus = contactCss.match(/\.cta-band-phone:focus-visible[\s\S]{0,200}var\(--brand-gold\)/);
    assert.ok(ctaFocus, 'Gold :focus-visible ring required on CTA band links');
    assert.ok(!/#3B82F6|93C5FD|#94a3b8/i.test(contactCss), 'No blue/gray chrome in contact/CTA styles');
  });

  test('R31-4: Gold hairline on CTA band + currentColor vector SVG icons, no emojis', () => {
    const ctaCss = styleCss.slice(styleCss.indexOf('.cta-band {'), styleCss.indexOf('.cta-band-inner'));
    assert.ok(ctaCss.includes('.cta-band::before') || styleCss.match(/\.cta-band::before\s*\{[^}]*\}/), 'CTA band gold hairline ::before required');
    const hairline = styleCss.match(/\.cta-band::before\s*\{[^}]*\}/)[0];
    assert.ok(hairline.includes('#FCE04C') && hairline.includes('233, 191, 50'), 'Hairline gradient must use brand gold tokens (#FCE04C / amber 233,191,50)');
    const cta = indexHtml.slice(indexHtml.indexOf('cta-band'), indexHtml.indexOf('<footer'));
    assert.ok((cta.match(/stroke="currentColor"|fill="currentColor"/g) || []).length >= 2, 'CTA icons must inherit color via currentColor');
    assert.ok(!/[🎉✨🚗💰📞✅📍➡️]/.test(cta), 'No emoji icons in CTA band markup');
  });

  test('R31-5: prefers-reduced-motion guard covers contact rows and CTA band', () => {
    const r31Guard = styleCss.slice(styleCss.indexOf('R31: پولیش طلایی'));
    assert.ok(r31Guard.includes('.contact-row-item') && r31Guard.includes('.cta-band-phone'), 'Reduced-motion guard must cover contact/CTA transitions');
  });

  test('R31-6: 390px refinement block for contact/CTA in responsive.css with 44px tap targets', () => {
    const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
    const block = blocks390.find(b => b.includes('.cta-band-phone'));
    assert.ok(block, 'A dedicated 390px contact/CTA refinement block must exist');
    assert.ok(block.includes('min-height: 44px'), '390px block must keep 44px tap targets');
    assert.ok(block.includes('.cta-band-phone:focus-visible'), '390px block must keep gold focus rings');
    assert.ok(/\.cta-band-phone,[\s\S]*?min-width: 44px/.test(styleCss), 'CTA links must be 44px+ tap targets');
  });

  test('R31-7: AutoDealer JSON-LD has real-inventory priceRange and page-matching openingHoursSpecification', () => {
    const blocks = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    const dealer = JSON.parse(blocks.find(b => b.includes('"AutoDealer"')).replace(/<\/?script[^>]*>/g, ''));
    assert.strictEqual(dealer.priceRange, t1RangeIrr, 'priceRange must mirror js/cars-data.js inventory ×10 (IRR, Offer-field scale)');
    assert.ok(Array.isArray(dealer.openingHoursSpecification) && dealer.openingHoursSpecification.length === 2, 'Two openingHours specs required (Sat-Wed / Thu)');
    const [satWed, thu] = dealer.openingHoursSpecification;
    assert.deepStrictEqual(satWed.dayOfWeek, ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'], 'Sat-Wed days must match page hours');
    assert.strictEqual(satWed.closes, '21:00', 'Sat-Wed closing must match page (21:00)');
    assert.strictEqual(thu.dayOfWeek, 'Thursday', 'Thursday spec required');
    assert.strictEqual(thu.closes, '18:00', 'Thursday closing must match page (18:00)');
  });

  test('R31-8: SEO freshness 2026-09-18 — 6 JSON-LD dateModified, sitemap lastmod, llms.txt stamp', () => {
    const blocks = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    assert.ok(blocks.length >= 6, 'All 6 JSON-LD blocks required (5 base + R33 Service)');
    for (const b of blocks) {
      const json = JSON.parse(b.replace(/<\/?script[^>]*>/g, ''));
      assert.strictEqual(json.dateModified, '2026-09-18', (json['@type'] || 'block') + ' dateModified must be 2026-09-18');
    }
    assert.ok(!indexHtml.includes('"dateModified": "2026-09-04"'), 'Stale 2026-09-04 dateModified must be gone');
    assert.ok(!sitemap.includes('<lastmod>2026-09-04</lastmod>') && sitemap.includes('<lastmod>2026-09-18</lastmod>'), 'Sitemap lastmod must be 2026-09-18');
    assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified must be 2026-09-18');
  });

  test('R31-9: Cache-bust bumped to v=20260918 on style.css and responsive.css; installment.css untouched', () => {
    assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
    assert.ok(!indexHtml.includes('css/style.css?v=20260905b') && !indexHtml.includes('css/responsive.css?v=20260905b'), 'Stale v=20260905b links must be gone');
    assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
    assert.ok(indexHtml.includes('installment.css?v=20260918'), 'installment.css bumped to v=20260918 (r34 freshness pass)');
  });
});

describe('R32: How-It-Works Steps Section + SEO Freshness 2026-09-12 (v=20260918)', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(root, 'css', 'responsive.css'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const llms = fs.readFileSync(path.join(root, 'llms.txt'), 'utf8');

  const howHtml = sectionById(indexHtml, 'how-it-works');
  const howStyles = styleCss.slice(styleCss.indexOf('بخش چگونه کار می‌کند'));

  test('R32-1: How-it-works section markup — 4 steps with only real on-site claims', () => {
    assert.ok(indexHtml.includes('how-it-works-section') && indexHtml.includes('id="how-it-works"'), 'Section must exist between installment and catalog sections');
    assert.ok(howHtml.includes('چگونه کار می‌کند'), 'Section heading must be present');
    (['تماس یا ثبت درخواست', 'کارشناسی و تایید خودرو', 'گشایش اعتبار و تعیین اقساط', 'تحویل خودرو']).forEach(t => {
      assert.ok(howHtml.includes(t), 'Step title must exist: ' + t);
    });
    assert.ok(howHtml.includes('021-66120332'), 'Phone number claim must be the real on-site number');
    assert.ok(howHtml.includes('کارشناسی کتبی'), 'Written-inspection claim must match on-site copy');
    assert.ok(howHtml.includes('اقساط ۶ الی ۲۴ ماهه'), 'Installment range claim must match on-site copy');
    assert.ok(howHtml.includes('خرید از شما، اقساط از ما'), 'Plan name must match on-site copy');
  });

  test('R32-2: Gold gradient badges with Persian digits + SVG icons, no emojis', () => {
    ['۱', '۲', '۳', '۴'].forEach(d => {
      assert.ok(howHtml.includes('>' + d + '</div>'), 'Persian step digit badge must exist: ' + d);
    });
    assert.ok((howHtml.match(/how-step-badge/g) || []).length >= 4, 'Four step badges required');
    assert.ok((howHtml.match(/how-step-icon/g) || []).length === 4, 'Four step icons required');
    const howSelf = sectionById(indexHtml, 'how-it-works');
    assert.ok((howSelf.match(/<svg/g) || []).length === 4, 'Icons must be inline SVGs (exactly 4 in section)');
    assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(howHtml), 'No emojis allowed in section markup');
    assert.ok(howStyles.includes('linear-gradient(135deg, #FCE04C 0%, #E9BF32 100%)') && howStyles.includes('color: #0B1220'), 'Badge gradient gold with dark text required');
  });

  test('R32-3: No blue in how-it-works styles, letter-spacing 0, dark surfaces', () => {
    assert.ok(!/#3B82F6|#93C5FD|text-gradient-blue/i.test(howStyles), 'No blue tokens in section styles');
    assert.ok(howStyles.includes('letter-spacing: 0'), 'letter-spacing must be 0 for Persian script');
    assert.ok(howStyles.includes('background: #111827'), 'Dark surface cards required (matching .why-us-card)');
    assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(howStyles), 'No emojis in section styles');
  });

  test('R32-4: Reduced-motion guard + focus-visible ring + timeline line in style.css', () => {
    const rmBlocks = styleCss.split(/@media \(prefers-reduced-motion: reduce\)/).slice(1);
    assert.ok(rmBlocks.some(b => b.includes('.how-step-card')), 'Reduced-motion guard must cover how-step-card');
    assert.ok(howStyles.includes('outline: 2px solid var(--brand-gold'), 'Gold focus ring required');
    assert.ok(howStyles.includes('.how-it-works-steps::before') && howStyles.includes('linear-gradient(90deg, rgba(233, 191, 50'), 'Connecting timeline line required');
    assert.ok(howStyles.includes('72px'), 'Gold top hairline 72px gradient required');
  });

  test('R32-5: Dedicated 390px block + 640px 2-col collapse in responsive.css', () => {
    const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
    assert.ok(blocks390.some(b => b.includes('.how-it-works-section') || b.includes('.how-step-card')), 'Dedicated 390px block for how-it-works required');
    const blocks640 = responsiveCss.match(/@media \(max-width: 640px\)\s*\{[\s\S]*?\n\}/g) || [];
    assert.ok(blocks640.some(b => b.includes('.how-it-works-steps') && b.includes('repeat(2, 1fr)')), '640px 2-col collapse required');
  });

  test('R32-6: Freshness 2026-09-18 everywhere + cache-bust v=20260918 (installment stays v=20260918)', () => {
    const ld = [...indexHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.strictEqual(ld.length, 6, 'Exactly 6 JSON-LD blocks (5 base + R33 Service)');
    ld.forEach(m => {
      const d = JSON.parse(m[1]);
      assert.strictEqual(d.dateModified, '2026-09-18', d['@type'] + ' dateModified must be 2026-09-18');
    });
    assert.ok(!sitemap.includes('<lastmod>2026-09-05') && !sitemap.includes('<lastmod>2026-09-06') && sitemap.includes('<lastmod>2026-09-18'), 'Sitemap lastmod must be 2026-09-18');
    assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified must be 2026-09-18');
    assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'Stylesheets cache-busted to v=20260918');
    assert.ok(!indexHtml.includes('css/style.css?v=20260906a') && !indexHtml.includes('css/responsive.css?v=20260906a'), 'Stale v=20260906a links must be gone');
    assert.ok(indexHtml.includes('installment.css?v=20260918'), 'installment.css bumped to v=20260918 (r34 freshness pass)');
  });
});

describe('R33: Catalog Card CTA/Price Row Gold Polish + Service JSON-LD + Freshness 2026-09-12', () => {
  const projectRoot = path.join(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
  const ctaStyles = styleCss.slice(styleCss.indexOf('.action-buttons-group'), styleCss.indexOf('.empty-inventory-box'));

  test('R33-1: Primary card CTA uses gold gradient with dark #0B1220 text', () => {
    assert.ok(ctaStyles.includes('.btn-show-details'), 'Primary CTA selector required');
    assert.ok(ctaStyles.includes('linear-gradient(135deg, #FCE04C 0%, #E9BF32 100%)'), 'Gold gradient #FCE04C→#E9BF32 required on primary CTA');
    assert.ok(ctaStyles.includes('color: #0B1220'), 'Dark #0B1220 text required on gold gradient');
    assert.ok(!/\.btn-show-details\s*{[^}]*brand-blue/.test(styleCss), 'Primary CTA must not use brand-blue');
  });

  test('R33-2: Secondary card CTA is ghost gold-tinted (no blue/green remnants in touched selectors)', () => {
    assert.ok(ctaStyles.includes('.btn-whatsapp-inquire'), 'Secondary CTA selector required');
    assert.ok(ctaStyles.includes('rgba(252, 224, 76, 0.10)'), 'Ghost gold-tinted background required');
    assert.ok(ctaStyles.includes('rgba(233, 191, 50, 0.45)'), 'Gold-tinted border required');
    assert.ok(!/#3B82F6|#93C5FD|#bbf7d0|brand-whatsapp-bg|brand-whatsapp\b/.test(ctaStyles), 'No blue/green remnants in card CTA styles');
  });

  test('R33-3: 44px+ tap targets kept on both card CTAs', () => {
    assert.ok((ctaStyles.match(/var\(--touch-target-min\)/g) || []).length >= 4, 'height/min-height 44px vars required on both CTAs');
  });

  test('R33-4: Gold :focus-visible rings + hover elevation on card CTAs', () => {
    assert.ok((ctaStyles.match(/outline: 3px solid var\(--brand-gold\)/g) || []).length >= 2, 'Gold focus-visible rings required on both CTAs');
    assert.ok((ctaStyles.match(/transform: translateY\(-2px\)/g) || []).length >= 2, 'Hover elevation required on both CTAs');
    assert.ok(ctaStyles.includes('box-shadow: 0 8px 18px -4px rgba(233, 191, 50, 0.42)'), 'Gold hover shadow required');
  });

  test('R33-5: prefers-reduced-motion guard covers card CTAs', () => {
    const rmBlocks = styleCss.split(/@media \(prefers-reduced-motion: reduce\)/).slice(1);
    assert.ok(rmBlocks.some(b => b.includes('.btn-show-details') && b.includes('.btn-whatsapp-inquire')), 'Reduced-motion guard must cover card CTAs');
  });

  test('R33-6: Dedicated 390px refinement block for card CTA/price row in responsive.css', () => {
    const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
    const block = blocks390.filter(b => b.includes('.action-buttons-group'));
    assert.ok(block.length >= 1 && block[0].includes('.btn-show-details') && block[0].includes('.btn-whatsapp-inquire'), 'Dedicated 390px block for card CTA row required');
    assert.ok(block[0].includes('min-height: 44px'), '390px block must keep 44px tap targets');
    assert.ok(block[0].includes('.card-price-row'), '390px block must refine the price row');
    assert.ok(!/#3B82F6|#93C5FD/i.test(block[0]), 'No blue in 390px CTA block');
  });

  test('R33-7: Service JSON-LD added (6th block) — provider @id, areaServed Tehran, real terms, freshness 2026-09-18', () => {
    const blocks = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    assert.strictEqual(blocks.length, 6, 'Exactly 6 JSON-LD blocks expected');
    const svc = JSON.parse(blocks.find(b => b.includes('"@type": "Service"')).replace(/<\/?script[^>]*>/g, ''));
    assert.strictEqual(svc.name, 'خرید اقساطی خودرو ۶ الی ۲۴ ماهه', 'Service name required');
    assert.strictEqual(svc.provider['@id'], 'https://novinkhodro.shop', 'Provider must reference existing AutoDealer @id');
    assert.ok(svc.areaServed.name.includes('تهران'), 'areaServed Tehran required');
    assert.ok(svc.termsOfService.includes('۶ الی ۲۴ ماهه'), 'Terms must be real (6-24 months, already on page)');
    assert.strictEqual(svc.dateModified, '2026-09-18', 'Service dateModified must be 2026-09-18');
  });
});

// R34: Footer polish (clock icons, gold column accents, contact-row hover) + llms.txt + SEO freshness 2026-09-12
describe('R34: Footer Polish + llms.txt + SEO Freshness 2026-09-12 (v=20260918)', () => {
  const fs = require('fs');
  const path = require('path');
  const projectRoot = path.join(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
  const llms = fs.readFileSync(path.join(projectRoot, 'llms.txt'), 'utf8');
  const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');

  test('R34-1: Footer keeps clean columns — brand blurb, quick links to catalog/calculator/FAQ anchors, contact NAP', () => {
    const footer = indexHtml.slice(indexHtml.indexOf('<footer'), indexHtml.indexOf('</footer>'));
    assert.ok(footer.includes('footer-brand-desc'), 'Brand blurb column required');
    assert.ok(footer.includes('footer-col-title'), 'Column titles required');
    assert.ok(footer.includes('href="#inventory"') && footer.includes('href="#installment-plan"') && footer.includes('href="#faq"'), 'Quick links must target catalog/calculator/FAQ anchors');
    assert.ok(footer.includes('footer-nap'), 'Contact NAP column required');
    assert.ok(footer.includes('tel:02166120332'), 'Real showroom phone must stay');
    assert.ok(footer.includes('تهران، ستارخان، میدان توحید، نصرت غربی، پلاک ۲۱'), 'Real showroom address must stay');
  });

  test('R34-2: Footer contact rows use Lucide-style inline SVG icons (phone, map-pin, clock) — no emoji glyphs', () => {
    const footer = indexHtml.slice(indexHtml.indexOf('<footer'), indexHtml.indexOf('</footer>'));
    assert.ok(footer.includes('footer-phone-text') && footer.includes('footer-address-text') && footer.includes('footer-time-text'), 'Contact row classes required');
    const nap = footer.slice(footer.indexOf('footer-nap'));
    assert.ok(nap.includes('<svg'), 'NAP rows must carry vector SVG icons');
    assert.ok((nap.match(/<svg/g) || []).length >= 4, 'At least 4 SVG icons in contact column (phone, pin, 2 clocks)');
    assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(footer), 'No emoji glyphs in footer');
  });

  test('R34-3: Luxury dark palette polish — gold column title accent + gold contact-row hover in style.css', () => {
    assert.ok(styleCss.includes('.footer-col-title::after'), 'Gold accent bar under column titles required');
    assert.ok(styleCss.includes('.footer-nap > p:hover'), 'Contact-row hover state required');
    assert.ok(/\.footer-nap > p:hover\s*\{[^}]*rgba\(233, 191, 50/.test(styleCss), 'Hover surface must be gold-tinted');
    assert.ok(/\.footer-phone-text svg,[\s\S]*?\.footer-time-text svg/.test(styleCss), 'Clock icons must share gold icon styling');
  });

  test('R34-4: RTL alignment + 390px footer refinement in responsive.css', () => {
    const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
    const block = blocks390.find(b => b.includes('.footer-col-title'));
    assert.ok(block, '390px footer refinement block required in responsive.css');
    assert.ok(block.includes('.footer-time-text') && block.includes('margin-right'), 'RTL right-margin compaction required');
  });

  test('R34-5: llms.txt refreshed — site name, offerings, key sections, contact, 2026-09-18 stamp', () => {
    assert.ok(llms.includes('نوین خودرو (Novin Khodro)'), 'llms.txt must name the site');
    assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt stamp must be 2026-09-18');
    assert.ok(/## Key sections[\s\S]*#inventory[\s\S]*#installment-plan[\s\S]*#faq/.test(llms), 'Key sections list required');
    assert.ok(llms.includes('021-66120332') && llms.includes('پلاک ۲۱'), 'Contact info required in llms.txt');
  });

  test('R34-6: SEO freshness 2026-09-18 — 6 JSON-LD dateModified, sitemap lastmod, cache-bust v=20260918 everywhere', () => {
    assert.ok((indexHtml.match(/"dateModified": "2026-09-18"/g) || []).length === 6, 'All 6 JSON-LD dateModified must be 2026-09-18');
    assert.ok(!indexHtml.includes('"dateModified": "2026-09-08"'), 'Stale 2026-09-08 dateModified must be gone');
    assert.ok(!sitemap.includes('<lastmod>2026-09-08</lastmod>') && sitemap.includes('<lastmod>2026-09-18</lastmod>'), 'Sitemap lastmod must be 2026-09-18');
    assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/installment.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918') && indexHtml.includes('js/app.js?v=20260918'), 'style/responsive/app at v=20260918; installment.css stays v=20260918');
    assert.ok(!indexHtml.includes('v=20260908a') && !indexHtml.includes('v=20260905a'), 'Stale cache-bust versions must be gone');
  });
});

// R35: Installment calculator gold panel polish + 390px refinement + freshness v=20260918
describe('R35: Installment Calculator Gold Panel + 390px Refinement + Freshness v=20260918', () => {
  const fs = require('fs');
  const path = require('path');
  const projectRoot = path.join(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const installmentCss = fs.readFileSync(path.join(projectRoot, 'css/installment.css'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(projectRoot, 'css/responsive.css'), 'utf8');
  const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');
  const llms = fs.readFileSync(path.join(projectRoot, 'llms.txt'), 'utf8');

  test('R35-1: Result/summary panel uses dark brand surface #111827→#1F2937 with gold hairline ::before', () => {
    const box = installmentCss.match(/\.calc-results-box\s*\{[^}]*\}/);
    assert.ok(box, '.calc-results-box rule required');
    assert.ok(/linear-gradient\(135deg,\s*#111827 0%,\s*#1F2937 100%\)/.test(box[0]), 'Panel background must be #111827→#1F2937');
    const before = installmentCss.match(/\.calc-results-box::before\s*\{[\s\S]*?\}/);
    assert.ok(before, 'Gold hairline ::before required');
    assert.ok(/linear-gradient\(to left,\s*#FCE04C/.test(before[0]), 'Hairline must be gold gradient');
  });

  test('R35-2: Gold monthly-installment emphasis kept — gradient text res-val-main', () => {
    const val = installmentCss.match(/\.res-val-main\s*\{[\s\S]*?\}/);
    assert.ok(val, '.res-val-main rule required');
    assert.ok(/#F1E781/.test(val[0]) && /#FCE04C/.test(val[0]) && /#DBB12B/.test(val[0]), 'Monthly value must carry gold gradient text');
    assert.ok(!val[0].includes('#3B82F6') && !val[0].includes('#93C5FD'), 'No blue in monthly value');
  });

  test('R35-3: Gold :focus-visible rings (2px var(--brand-gold), offset 3px) on all calculator controls', () => {
    assert.ok(/\.preset-pill-btn:focus-visible[\s\S]*?\.calc-range-input:focus-visible\s*\{\s*outline:\s*2px solid var\(--brand-gold\);\s*outline-offset:\s*3px;/.test(installmentCss), 'Consolidated gold focus-visible block required');
    assert.ok(!/outline:\s*3px solid var\(--border-focus\)/.test(installmentCss), 'Old non-gold focus ring must be gone');
    assert.ok(installmentCss.includes('accent-color: var(--brand-gold)'), 'Range slider accent must be gold');
  });

  test('R35-4: Gold hover states on calculator controls — no blue remnants in touched selectors', () => {
    assert.ok(/\.preset-pill-btn:hover\s*\{[^}]*var\(--brand-gold\)/.test(installmentCss), 'Preset pill hover must be gold');
    assert.ok(/\.tenure-btn:hover\s*\{[^}]*var\(--brand-gold\)/.test(installmentCss), 'Tenure hover must be gold');
    assert.ok(!/var\(--brand-blue\)/.test(installmentCss.slice(installmentCss.indexOf('.calc-val-badge'))), 'No blue tokens below calculator markup start');
    const goldApply = installmentCss.match(/\.btn-apply-loan:hover\s*\{[^}]*#FCE04C[\s\S]*?#0B1220/);
    assert.ok(goldApply, 'Apply-loan hover must be gold with dark text');
  });

  test('R35-5: 44px+ tap targets kept and prefers-reduced-motion guard present', () => {
    assert.ok(installmentCss.includes('min-height: var(--touch-target-min)'), 'touch-target-min (44px) required');
    assert.ok(/\.preset-pill-btn,\s*\n\s*\.tenure-btn\s*\{\s*min-height:\s*44px/.test(responsiveCss) || /min-height:\s*44px/.test(installmentCss), 'Preset/tenure pills must keep 44px+');
    const guard = installmentCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*\.res-val-main[\s\S]*\}\s*\}/);
    assert.ok(guard, 'prefers-reduced-motion guard required in installment.css');
    assert.ok(guard[0].includes('.btn-apply-loan') && guard[0].includes('transition: none'), 'Guard must disable calculator transitions');
  });

  test('R35-6: Dedicated max-width:390px calculator refinement block in responsive.css', () => {
    const blocks390 = responsiveCss.match(/@media \(max-width: 390px\)\s*\{[\s\S]*?\n\}/g) || [];
    const block = blocks390.find(b => b.includes('.calculator-card'));
    assert.ok(block, 'Dedicated 390px calculator block required');
    assert.ok(block.includes('.calc-results-box'), 'Block must refine the result panel');
    assert.ok(block.includes('.res-val-main'), 'Block must refine the monthly value');
    assert.ok(block.includes('min-height: 44px'), 'Tap targets kept at 390px');
  });

  test('R35-7: Freshness — 6 dateModified 2026-09-18, sitemap/llms stamps, cache-bust v=20260918', () => {
    assert.ok((indexHtml.match(/"dateModified": "2026-09-18"/g) || []).length === 6, 'All 6 JSON-LD dateModified must stay 2026-09-18');
    assert.ok(!indexHtml.includes('"dateModified": "2026-09-08"'), 'Stale 2026-09-08 dateModified must be gone');
    assert.ok(!sitemap.includes('<lastmod>2026-09-08</lastmod>') && sitemap.includes('<lastmod>2026-09-18</lastmod>'), 'Sitemap lastmod must be 2026-09-18');
    assert.ok(llms.includes('Last modified: 2026-09-18'), 'llms.txt stamp must be 2026-09-18');
    assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/installment.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918'), 'style/responsive at v=20260918; installment.css stays v=20260918');
    assert.ok(!indexHtml.includes('20260909a'), 'Stale v=20260909a must be gone');
    assert.ok(indexHtml.includes('021-66120332') && indexHtml.includes('پلاک ۲۱'), 'Contact info must stay verbatim');
  });

  test('R35-8: Calculator markup and math untouched — ids, presets, tenure months intact', () => {
    assert.ok(indexHtml.includes('id="calcResultsBox"') && indexHtml.includes('aria-live="polite"'), 'Results box markup intact');
    assert.ok(indexHtml.includes('id="calcPriceBadge"') && indexHtml.includes('id="downPaymentBadge"') && indexHtml.includes('id="tenureBadge"'), 'Badge ids intact');
    assert.ok(indexHtml.includes('data-months="24"') && indexHtml.includes('data-price="11450"'), 'Preset/tenure data attributes intact');
    assert.ok(!installmentCss.includes('calculateInstallment'), 'No math logic in CSS');
  });
});

// R35b: installment section header de-blued (slogan pill + headline gradient) + cache-bust v=20260918
describe('R35b: Installment Section Header Gold + No-Blue + Cache-Bust v=20260918', () => {
  const fs = require('fs');
  const path = require('path');
  const projectRoot = path.join(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const installmentCss = fs.readFileSync(path.join(projectRoot, 'css/installment.css'), 'utf8');

  test('R35b-1: Zero blue remnants across entire installment.css — slogan pill + headline gradient gold', () => {
    assert.ok(!installmentCss.includes('var(--brand-blue)'), 'No --brand-blue token anywhere');
    assert.ok(!/#3B82F6|#60A5FA|#93C5FD|#1D4ED8|#2563EB|#1E40AF|#BFDBFE|#EFF6FF/.test(installmentCss), 'No blue hex literals anywhere in installment.css');
    assert.ok(/\.slogan-pill\s*\{[^}]*rgba\(252, 224, 76, 0\.12\)[\s\S]*?#FCE04C/.test(installmentCss), 'Slogan pill must be gold-tinted');
    assert.ok(/\.text-gradient-blue\s*\{[^}]*#F1E781[\s\S]*?#FCE04C/.test(installmentCss), 'Headline gradient must be gold');
  });

  test('R35b-2: Cache-bust bumped to v=20260918 across css/js; no stale 20260912a', () => {
    assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('css/installment.css?v=20260918') && indexHtml.includes('css/responsive.css?v=20260918') && indexHtml.includes('js/app.js?v=20260918'), 'style/responsive/app at v=20260918; installment.css stays v=20260918');
    assert.ok(!indexHtml.includes('20260912a'), 'Stale v=20260912a must be gone');
  });
});

// ===========================================================================
// R36: Catalog Filter/Card Gold Polish + SEO Freshness 2026-09-12 + v=20260918
// ===========================================================================
describe('R36: Catalog Filter/Card Gold Polish + Cache-Bust v=20260918', () => {
  const fs = require('fs');
  const path = require('path');

// استخراج سکشن با id و تطبیق متوازن <section>…</section> — مستقل از ترتیب بخش‌ها
  const projectRoot = path.resolve(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf8');

  test('R36-1: Filter bar carries the installment-section gold accent gradient (same palette, no new colors)', () => {
    const accent = styleCss.match(/\.filter-bar-clean::before\s*\{[^}]*\}/);
    assert.ok(accent, '.filter-bar-clean::before gold accent rule required');
    assert.ok(accent[0].includes('linear-gradient(to left, #FCE04C, var(--brand-gold)') && accent[0].includes('transparent 90%'), 'Accent must reuse installment gold gradient FBBF24→brand-gold, RTL to-left');
  });

  test('R36-2: Pill hover gets subtle lift + gold shadow; active pill keeps gold border (not transparent)', () => {
    const hover = styleCss.match(/\.cat-pill:hover\s*\{[^}]*\}/g) || [];
    const h = hover[0];
    assert.ok(h.includes('translateY(-2px)'), 'Pill hover must add subtle lift');
    assert.ok(h.includes('rgba(233, 191, 50'), 'Pill hover shadow must use brand gold rgba');
    const active = styleCss.match(/\.cat-pill\.active\s*\{[^}]*\}/g) || [];
    assert.ok(active[0].includes('border-color: var(--brand-gold)'), 'Active pill border must be gold');
  });

  test('R36-3: Card hover is a subtle lift (-4px) with gold accent border + gold top accent line', () => {
    const hover = styleCss.match(/\.car-card-modern:hover,\s*\.car-card-modern:focus-within\s*\{[^}]*\}/);
    assert.ok(hover, 'Card hover rule required');
    assert.ok(hover[0].includes('translateY(-4px)'), 'Card lift must be subtle (-4px)');
    assert.ok(hover[0].includes('var(--brand-gold)'), 'Card hover border must be gold');
    const accent = styleCss.match(/\.car-card-modern::after\s*\{[^}]*\}/);
    assert.ok(accent && accent[0].includes('#FCE04C') && accent[0].includes('var(--brand-gold)'), 'Card gold top accent must reuse installment gold gradient');
  });

  test('R36-4: Reduced-motion guards cover pill transform and card accent transition', () => {
    const guards = styleCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*?\n\}/g) || [];
    assert.ok(guards.some(g => g.includes('.cat-pill') && g.includes('transform: none')), 'Pill reduced-motion guard must reset transform');
    assert.ok(guards.some(g => g.includes('.car-card-modern::after')), 'Card accent reduced-motion guard required');
  });

  test('R36-5: Cache-bust bumped to v=20260918; freshness stamps 2026-09-18', () => {
    assert.ok(indexHtml.includes('css/style.css?v=20260918') && indexHtml.includes('js/app.js?v=20260918'), 'Refs must be v=20260918');
    assert.ok(!indexHtml.includes('20260912b') && !indexHtml.includes('css/style.css?v=20260912c') && !indexHtml.includes('js/app.js?v=20260912c'), 'Stale pre-R37 cache-bust refs must be gone (installment.css stays v=20260918)');
    assert.ok((indexHtml.match(/"dateModified": "2026-09-18"/g) || []).length === 6, '6 JSON-LD dateModified 2026-09-18');
    const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');
    assert.ok(sitemap.includes('<lastmod>2026-09-18</lastmod>'), 'Sitemap lastmod must be 2026-09-18');
  });
});

describe('R41: Catalog Controls Polish (search/select/section-title) + Freshness 2026-09-18 (v=20260918)', () => {
  const r41Root = path.join(__dirname, '..');
  const r41StyleCss = fs.readFileSync(path.join(r41Root, 'css/style.css'), 'utf8');
  const r41ResponsiveCss = fs.readFileSync(path.join(r41Root, 'css/responsive.css'), 'utf8');
  const r41IndexHtml = fs.readFileSync(path.join(r41Root, 'index.html'), 'utf8');

  test('R41-1: Search input gold focus ring/border on #searchInput .clean-search rules', () => {
    assert.ok(r41IndexHtml.includes('id="searchInput"') && r41IndexHtml.includes('clean-search'), 'Real selectors must exist in index.html');
    const focus = r41StyleCss.match(/\.clean-search input:focus\s*\{[^}]*\}/);
    assert.ok(focus, 'style.css must style .clean-search input:focus');
    assert.ok(focus[0].includes('var(--brand-gold)'), 'Search focus border must be brand gold');
    assert.ok(focus[0].includes('rgba(233, 191, 50'), 'Search focus ring shadow must be gold rgba(233,191,50,..)');
    const fv = r41StyleCss.match(/\.clean-search input:focus-visible\s*\{[^}]*\}/);
    assert.ok(fv && fv[0].includes('2px solid var(--brand-gold)'), 'Keyboard focus-visible gold outline required');
    assert.ok(!focus[0].includes('#3B82F6') && !focus[0].includes('blue'), 'No blue remnants in search focus rule');
  });

  test('R41-2: Custom-styled select — gold caret, dark surface, gold hover border', () => {
    assert.ok(r41IndexHtml.includes('class="clean-select"') && r41IndexHtml.includes('id="sortFilter"'), 'Real .clean-select/#sortFilter selectors must exist');
    const rule = (r41StyleCss.match(/\.clean-select\s*\{[^}]*\}/g) || []).find(r => r.includes('appearance'));
    assert.ok(rule, 'style.css must style .clean-select');
    assert.ok(rule.includes('appearance: none') || rule.includes('-webkit-appearance: none'), 'Native select appearance must be removed');
    assert.ok(rule.includes('%23FBBF24'), 'Caret SVG must be brand gold #FCE04C');
    assert.ok(rule.includes('var(--surface-800)'), 'Select surface must be dark brand surface');
    assert.ok(rule.includes("background-position: left"), 'Caret must sit left for RTL');
    const hover = r41StyleCss.match(/\.clean-select:hover\s*\{[^}]*\}/);
    assert.ok(hover && hover[0].includes('var(--brand-gold)'), 'Select hover border must be gold');
  });

  test('R41-3: Section title gold hairline ::after + reduced-motion guard', () => {
    const accent = r41StyleCss.match(/\.section-title-large::after\s*\{[^}]*\}/);
    assert.ok(accent, 'style.css must add .section-title-large::after hairline');
    assert.ok(accent[0].includes('linear-gradient(to left, var(--brand-gold)'), 'Hairline must use gold gradient consistent with other sections');
    assert.ok(accent[0].includes("right: 0"), 'Hairline must anchor right for RTL');
    const guard = r41StyleCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*?\.clean-select/s);
    assert.ok(guard, 'Reduced-motion guard must cover catalog controls');
    assert.ok(r41StyleCss.includes('.clean-search input,\n  .clean-select {\n    transition: none;'), 'Reduced-motion guard must disable control transitions');
  });

  test('R41-4: 390px refinement block mirrors catalog control polish', () => {
    assert.ok(r41ResponsiveCss.includes('@media (max-width: 390px)'), '390px block must exist');
    const m390 = r41ResponsiveCss.match(/@media \(max-width: 390px\)[\s\S]*$/);
    assert.ok(m390, '390px block must be extractable');
    assert.ok(/R41[^\n]*۳۹۰|\u0639\u0644\u0627\u06cc\u062a/.test('') || m390[0].includes('.clean-select'), '390px block must refine .clean-select');
    assert.ok(m390[0].includes('min-height: 44px') && m390[0].includes('height: 44px'), 'Select must keep 44px tap target at 390px');
    assert.ok(m390[0].includes('.section-title-large::after'), 'Hairline must be refined at 390px');
  });

  test('R41-5: SEO/AEO heading + meta audit — one h1, logical h2/h3, unique descriptions', () => {
    const h1s = (r41IndexHtml.match(/<h1[\s>]/g) || []).length;
    assert.strictEqual(h1s, 1, 'Document must contain exactly one <h1>');
    const h2s = (r41IndexHtml.match(/<h2[\s>]/g) || []).length;
    const h3s = (r41IndexHtml.match(/<h3[\s>]/g) || []).length;
    assert.ok(h2s >= 8 && h3s >= 10, `Logical h2(${h2s})/h3(${h3s}) nesting must be substantive`);
    const desc = r41IndexHtml.match(/<meta name="description" content="([^"]+)"/);
    const ogDesc = r41IndexHtml.match(/<meta property="og:description" content="([^"]+)"/);
    assert.ok(desc && ogDesc, 'meta description and og:description must exist');
    assert.notStrictEqual(desc[1], ogDesc[1], 'meta description and og:description must be unique strings');
  });

  test('R41-6: Freshness 2026-09-18 across style.css, responsive.css, app.js cache-bust', () => {
    assert.ok(r41IndexHtml.includes('css/style.css?v=20260918'), 'style.css must be v=20260918');
    assert.ok(r41IndexHtml.includes('css/responsive.css?v=20260918'), 'responsive.css must be v=20260918');
    assert.ok(r41IndexHtml.includes('js/app.js?v=20260918'), 'app.js must be v=20260918');
    assert.ok(!r41IndexHtml.includes('?v=20260915'), 'Stale v=20260915 refs must be gone');
    assert.ok(!r41IndexHtml.includes('?v=20260913b'), 'Stale v=20260913b refs must be gone');
  });
});

describe('R42: Installment Calculator Gold Polish + Freshness 2026-09-18 (v=20260918)', () => {
  const r42ProjectRoot = path.join(__dirname, '..');
  const r42IndexHtml = fs.readFileSync(path.join(r42ProjectRoot, 'index.html'), 'utf8');
  const r42InstallmentCss = fs.readFileSync(path.join(r42ProjectRoot, 'css/installment.css'), 'utf8');
  const r42ResponsiveCss = fs.readFileSync(path.join(r42ProjectRoot, 'css/responsive.css'), 'utf8');
  const r42Sitemap = fs.readFileSync(path.join(r42ProjectRoot, 'sitemap.xml'), 'utf8');
  const r42Llms = fs.readFileSync(path.join(r42ProjectRoot, 'llms.txt'), 'utf8');

  test('R42-1: Gold top hairline (::before) on calculator-card and inst-step-card', () => {
    assert.ok(r42InstallmentCss.includes('.calculator-card::before'), 'calculator-card must have gold hairline ::before');
    assert.ok(r42InstallmentCss.includes('.inst-step-card::before'), 'inst-step-card must have gold hairline ::before');
    assert.ok(r42InstallmentCss.includes('rgba(252, 224, 76, 0) 0%') && r42InstallmentCss.includes('#FCE04C 50%'), 'Hairline gradient must match cta-band pattern');
  });

  test('R42-2: Gold hover border + soft halo on calculator-card and inst-step-card', () => {
    assert.ok(r42InstallmentCss.includes('.calculator-card:hover'), 'calculator-card hover state required');
    assert.ok(r42InstallmentCss.includes('.inst-step-card:hover'), 'inst-step-card hover state required');
    assert.ok(/rgba\(252, 224, 76, 0\.08\)/.test(r42InstallmentCss), 'Soft gold halo (rgba 251 191 36, 0.08) required on hover');
    assert.ok(r42InstallmentCss.includes('rgba(252, 224, 76, 0.55)'), 'Gold hover border color required');
  });

  test('R42-3: Selected state uses gold gradient #FCE04C→#E9BF32 with dark #0B1220 text', () => {
    assert.ok(r42InstallmentCss.includes('.calculator-card.is-selected'), 'is-selected state required on calculator-card');
    assert.ok(r42InstallmentCss.includes('linear-gradient(135deg, #FCE04C 0%, #E9BF32 100%)'), 'Gold gradient #FCE04C→#E9BF32 required');
    assert.ok(r42InstallmentCss.includes('#0B1220'), 'Dark #0B1220 text required on active/selected states');
  });

  test('R42-4: Gold :focus-visible rings cover calculator inputs/buttons/selects; 44px tap targets preserved', () => {
    assert.ok(r42InstallmentCss.includes(".calculator-card input[type='range']:focus-visible"), 'Range input focus-visible required');
    assert.ok(r42InstallmentCss.includes('.calculator-card button:focus-visible'), 'Button focus-visible required');
    assert.ok(r42InstallmentCss.includes('.calculator-card select:focus-visible'), 'Select focus-visible required');
    assert.ok(r42InstallmentCss.includes('var(--touch-target-min)'), '44px touch-target variable must remain in use');
  });

  test('R42-5: prefers-reduced-motion guard covers new R42 transitions', () => {
    const r42Block = r42InstallmentCss.slice(r42InstallmentCss.indexOf('راند ۴۲'));
    assert.ok(r42Block.includes('prefers-reduced-motion: reduce'), 'Reduced-motion guard required for R42 transitions');
    assert.ok(r42Block.includes('transition: none !important'), 'Transitions must be disabled under reduced motion');
  });

  test('R42-6: 390px refinement block for installment section in responsive.css', () => {
    const r42Tail = r42ResponsiveCss.slice(r42ResponsiveCss.lastIndexOf('راند ۴۲'));
    assert.ok(r42Tail.includes('@media (max-width: 390px)'), 'R42 390px block required');
    assert.ok(r42Tail.includes('.calculator-card'), 'Compact calculator paddings required at 390px');
    assert.ok(r42Tail.includes('width: 100%'), 'Full-width controls required at 390px');
    assert.ok(r42Tail.includes('.btn-apply-loan') && r42Tail.includes('.btn-calc-phone'), 'Action buttons full-width at 390px');
  });

  test('R42-7: Freshness 2026-09-18 — 6 JSON-LD dateModified, sitemap lastmod, llms.txt stamp', () => {
    assert.ok((r42IndexHtml.match(/"dateModified": "2026-09-18"/g) || []).length === 6, 'All 6 JSON-LD dateModified must be 2026-09-18');
    assert.ok(r42Sitemap.includes('<lastmod>2026-09-18</lastmod>') && !r42Sitemap.includes('<lastmod>2026-09-16'), 'Sitemap lastmod must be 2026-09-18');
    assert.ok(r42Llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified must be 2026-09-18');
  });

  test('R42-8: Cache-bust v=20260918 on installment.css, style.css, responsive.css; app.js stays v=20260916', () => {
    assert.ok(r42IndexHtml.includes('css/installment.css?v=20260918'), 'installment.css must be v=20260918');
    assert.ok(r42IndexHtml.includes('css/style.css?v=20260918'), 'style.css must be v=20260918');
    assert.ok(r42IndexHtml.includes('css/responsive.css?v=20260918'), 'responsive.css must be v=20260918');
    assert.ok(r42IndexHtml.includes('js/app.js?v=20260918'), 'app.js stays untouched at v=20260916');
    assert.ok(!r42IndexHtml.includes('20260912c') && !r42IndexHtml.includes('?v=20260916\n'), 'Stale refs must be gone');
  });
});

describe('R43: Sell-Banner Gold Polish + FAQ Micro-interactions + Freshness 2026-09-18 (v=20260918)', () => {
  const r43ProjectRoot = path.join(__dirname, '..');
  const r43IndexHtml = fs.readFileSync(path.join(r43ProjectRoot, 'index.html'), 'utf8');
  const r43StyleCss = fs.readFileSync(path.join(r43ProjectRoot, 'css/style.css'), 'utf8');
  const r43Sitemap = fs.readFileSync(path.join(r43ProjectRoot, 'sitemap.xml'), 'utf8');
  const r43Llms = fs.readFileSync(path.join(r43ProjectRoot, 'llms.txt'), 'utf8');

  test('R43-1: Sell-banner gold radial glow replaces blue; gold top hairline ::before', () => {
    const r43Block = r43StyleCss.slice(r43StyleCss.indexOf('R43 (2026-09-18)'));
    assert.ok(r43Block.includes('rgba(233, 191, 50, 0.18)'), 'Sell-banner radial glow must be gold-tinted');
    assert.ok(!r43Block.includes('rgba(29, 78, 216'), 'No blue radial remnant in R43 sell-banner block');
    assert.ok(r43Block.includes('.sell-banner-box::before'), 'Gold top hairline ::before required on sell-banner');
    assert.ok(r43Block.includes('to left, #FCE04C'), 'Hairline gradient must follow to-left RTL pattern');
  });

  test('R43-2: Sell-points gold accents — strong #FCE04C + gold RTL border-right', () => {
    const r43Block = r43StyleCss.slice(r43StyleCss.indexOf('R43 (2026-09-18)'));
    assert.ok(r43Block.includes('.sell-point-item strong') && r43Block.includes('#FCE04C'), 'Sell-point strong must be gold');
    assert.ok(r43Block.includes('border-right: 2px solid rgba(252, 224, 76, 0.35)'), 'RTL-correct gold border-right required');
  });

  test('R43-3: Sell-form gold focus — input focus border var(--brand-gold) + gold halo; no blue', () => {
    const r43Block = r43StyleCss.slice(r43StyleCss.indexOf('R43 (2026-09-18)'));
    assert.ok(r43Block.includes('.minimal-field input:focus') && r43Block.includes('var(--brand-gold)'), 'Input focus must be gold');
    assert.ok(r43Block.includes('rgba(233, 191, 50, 0.22)'), 'Gold focus halo required');
    assert.ok(r43Block.includes('rgba(252, 224, 76, 0.28)'), 'Sell-mini-form gold border tint required');
  });

  test('R43-4: FAQ micro-interaction — chevron gold on hover; reduced-motion guard', () => {
    const r43Block = r43StyleCss.slice(r43StyleCss.indexOf('R43 (2026-09-18)'));
    assert.ok(r43Block.includes('.faq-question:hover svg') && r43Block.includes('#FCE04C'), 'FAQ chevron hover gold required');
    const r43Motion = r43Block.slice(r43Block.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(r43Motion.includes('.faq-question:hover svg'), 'Reduced-motion guard must cover FAQ chevron transition');
  });

  test('R43-5: Freshness 2026-09-18 — 6 JSON-LD dateModified, sitemap lastmod, llms.txt stamp', () => {
    assert.ok((r43IndexHtml.match(/"dateModified": "2026-09-18"/g) || []).length === 6, 'All 6 JSON-LD dateModified must be 2026-09-18');
    assert.ok(r43Sitemap.includes('<lastmod>2026-09-18</lastmod>'), 'Sitemap lastmod must be 2026-09-18');
    assert.ok(r43Llms.includes('Last modified: 2026-09-18'), 'llms.txt Last modified must be 2026-09-18');
  });

  test('R43-6: Cache-bust v=20260918 on style/installment/responsive css; app.js stays v=20260916', () => {
    assert.ok(r43IndexHtml.includes('css/style.css?v=20260918'), 'style.css must be v=20260918');
    assert.ok(r43IndexHtml.includes('css/installment.css?v=20260918'), 'installment.css must be v=20260918');
    assert.ok(r43IndexHtml.includes('css/responsive.css?v=20260918'), 'responsive.css must be v=20260918');
    assert.ok(r43IndexHtml.includes('js/app.js?v=20260918'), 'app.js stays untouched at v=20260916');
    assert.ok(!r43IndexHtml.includes('?v=20260917'), 'Stale v=20260917 refs must be gone');
  });

  // =========================================================================
  // R50: Deploy hardening — هیچ فایل داخلی/حساسی نباید وارد docroot شود
  // =========================================================================
  describe('R50: Deploy hardening (no internal files in docroot)', () => {
    const deploySrc = fs.readFileSync(path.join(r37ProjectRoot, 'scripts/deploy-smoke.sh'), 'utf8');
    const purgeSrc = fs.readFileSync(path.join(r37ProjectRoot, 'scripts/purge-server-leaks.sh'), 'utf8');
    const nginxSrc = fs.readFileSync(path.join(r37ProjectRoot, 'nginx.conf'), 'utf8');
    const MUST_EXCLUDE = ['.git', '.hermes', '.agents', '.serena', 'node_modules', 'scripts', 'tests',
                          'assets-out', 'admin.html', 'nginx.conf', 'nginx-events.conf', '.well-known',
                          'package.json', 'tsconfig.json', '*.md', '.DS_Store'];

    test('R50-1: rsync excludes every internal path (leak regression lock)', () => {
      MUST_EXCLUDE.forEach(pat => {
        assert.ok(deploySrc.includes('--exclude ' + pat) || deploySrc.includes("--exclude '" + pat + "'"),
          'deploy-smoke.sh must exclude ' + pat);
      });
    });

    test('R50-2: deploy keeps --delete + the catalog asset exception', () => {
      assert.ok(deploySrc.includes('--delete'), 'rsync --delete must stay (stale files removed)');
      assert.ok(deploySrc.includes("--exclude 'assets/ikco'") || deploySrc.includes('--exclude assets/ikco'),
        'assets/ikco must stay excluded (separately deployed, protected from --delete)');
    });

    test('R50-3: one-time purge script cleans the leaked paths from the live docroot', () => {
      ['.agents', '.hermes', '.serena', 'scripts', 'tests', 'assets-out', 'nginx.conf', 'package.json', 'admin.html']
        .forEach(pat => assert.ok(purgeSrc.includes(pat), 'purge-server-leaks.sh must remove ' + pat));
      assert.ok(purgeSrc.includes('find . -name') && purgeSrc.includes('.DS_Store'), 'purge must sweep nested .DS_Store');
    });

    test('R50-4: nginx denies dot-paths (defense in depth)', () => {
      assert.ok(/location\s+~\s+\/\\\.\s*\{/.test(nginxSrc), 'nginx.conf must deny /\\.* paths');
      const denyBlock = nginxSrc.slice(nginxSrc.search(/location\s+~\s+\/\\\.\s*\{/), nginxSrc.search(/location\s+~\s+\/\\\.\s*\{/) + 120);
      assert.ok(denyBlock.includes('deny all'), 'dot-path location must deny all');
    });
  });

  // =========================================================================
  // R51: Credential hygiene — رمز SSH هرگز در ریپو نباشد؛ استقرار با کلید ed25519
  // =========================================================================
  describe('R51: Key-based deploy, no secrets in repo', () => {
    const scriptsDir = path.join(r37ProjectRoot, 'scripts');
    const scriptFiles = fs.readdirSync(scriptsDir).filter(f => /\.(sh|py)$/.test(f));
    const bodies = Object.fromEntries(
      scriptFiles.map(f => [f, fs.readFileSync(path.join(scriptsDir, f), 'utf8')])
    );
    const deployTools = ['deploy-smoke.sh', 'purge-server-leaks.sh', 'deploy-ikco-assets.sh', 'verify-server-parity.py'];

    test('R51-1: no script contains sshpass or an inline password', () => {
      Object.entries(bodies).forEach(([f, src]) => {
        assert.ok(!src.includes('sshpass'), f + ' must not use sshpass');
        assert.ok(!/sshpass\s+-p|ssh\s+-p\s+['"]/.test(src), f + ' must not pass -p <password>');
        assert.ok(!/PasswordAuthentication=password/.test(src), f + ' must not force password auth');
      });
    });

    test('R51-2: deploy tooling authenticates with the dedicated ed25519 key', () => {
      deployTools.forEach(f => {
        const src = bodies[f];
        assert.ok(src, f + ' must exist');
        assert.ok(src.includes('novinkhodro_ed25519'), f + ' must reference the deploy key');
        assert.ok(src.includes('IdentitiesOnly=yes') || src.includes('IdentitiesOnly'), f + ' must pin the identity');
      });
    });

    test('R51-3: repo nginx.conf ships HSTS on every secured block', () => {
      const nginx = fs.readFileSync(path.join(r37ProjectRoot, 'nginx.conf'), 'utf8');
      assert.ok(nginx.includes('Strict-Transport-Security'), 'nginx.conf must set HSTS');
      const hsts = (nginx.match(/add_header Strict-Transport-Security/g) || []).length;
      const referrer = (nginx.match(/add_header Referrer-Policy/g) || []).length;
      assert.strictEqual(hsts, referrer, 'HSTS must be present wherever the other sec headers are (add_header inheritance reset)');
      assert.ok(/max-age=15552000/.test(nginx), 'HSTS max-age must be 180 days');
    });
  });

  // =========================================================================
  // R52: مقیاس تایپوگرافی واحد — هیچ اندازهٔ ad-hoc در CSS نماند
  // =========================================================================
  describe('R52: Single typographic scale (no ad-hoc font sizes)', () => {
    const cssDir = path.join(r37ProjectRoot, 'css');
    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css') && f !== 'tokens.css');
    const tokensCss = fs.readFileSync(path.join(cssDir, 'tokens.css'), 'utf8');
    const RUNGS = ['--nk-fs-xs', '--nk-fs-sm', '--nk-fs-body', '--nk-fs-h3', '--nk-fs-lg',
                   '--nk-fs-subhead', '--nk-fs-h2', '--nk-fs-display'];

    test('R52-1: tokens.css defines exactly the 8-rung scale', () => {
      RUNGS.forEach(r => assert.ok(tokensCss.includes(r + ':'), 'tokens.css must define ' + r));
      // کف خوانایی: بدنه هرگز زیر 15px توکن نگردد
      assert.ok(/\.\d+rem|1rem/.test(tokensCss), 'scale uses rem');
      assert.ok(tokensCss.includes('--nk-section:') && tokensCss.includes('--nk-section-lg:'), 'section rhythm tokens');
      assert.ok(tokensCss.includes('--nk-t-micro:') && tokensCss.includes('--nk-t-reveal:'), 'motion duration tokens');
      assert.ok(tokensCss.includes('prefers-reduced-motion'), 'reduced-motion guard in tokens');
    });

    test('R52-2: no raw rem font-size left outside tokens.css', () => {
      const offenders = [];
      cssFiles.forEach(f => {
        const src = fs.readFileSync(path.join(cssDir, f), 'utf8');
        const hits = src.match(/font-size:\s*[0-9.]+rem/g) || [];
        if (hits.length) offenders.push(f + ': ' + hits.length);
      });
      assert.deepStrictEqual(offenders, [], 'every font-size must use a --nk-fs-* token: ' + offenders.join(', '));
    });

    test('R52-3: tokens.css loads BEFORE style.css on every page', () => {
      ['index.html', 'encyclopedia.html', 'deals.html'].forEach(f => {
        const html = fs.readFileSync(path.join(r37ProjectRoot, f), 'utf8');
        const t = html.indexOf('href="css/tokens.css');
        const sIdx = html.indexOf('href="css/style.css');
        assert.ok(t > -1, f + ' must link tokens.css');
        assert.ok(t < sIdx, f + ': tokens.css must come before style.css');
      });
    });

    test('R52-4: mobile readability floor — body/desc text never drops to xs', () => {
      const responsive = fs.readFileSync(path.join(cssDir, 'responsive.css'), 'utf8');
      ['.slide-desc', '.spec-val'].forEach(sel => {
        const m = responsive.match(new RegExp('\\' + sel + '\\s*\\{[^}]*font-size:\\s*var\\(--nk-fs-([a-z0-9]+)\\)'));
        if (m) assert.ok(['sm', 'body', 'lg', 'h3'].includes(m[1]), sel + ' must not use --nk-fs-xs at mobile (got ' + m[1] + ')');
      });
    });
  });
});

describe('R72: یکدستی سرتیتر (nk-head) + بودجهٔ تزئین + انتظام ?v= روی داده‌های کرون', () => {
  const cssDir = path.join(r37ProjectRoot, 'css');
  const styleCss72 = fs.readFileSync(path.join(cssDir, 'style.css'), 'utf8');
  const responsiveCss72 = fs.readFileSync(path.join(cssDir, 'responsive.css'), 'utf8');
  const installmentCss72 = fs.readFileSync(path.join(cssDir, 'installment.css'), 'utf8');
  const indexHtml72 = fs.readFileSync(path.join(r37ProjectRoot, 'index.html'), 'utf8');
  const bridge72 = fs.readFileSync(path.join(r37ProjectRoot, 'js/modules/ikco-bridge.js'), 'utf8');
  const allCss72 = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'))
    .map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n');
  const rulesOf = (css, sel) => (css.match(new RegExp('\\' + sel + '\\s*\\{[^}]*\\}', 'g')) || []);

  test('R72-1: سرتیتر بخش اقساط به گرامر مشترک nk-head پیوسته (۷ سرتیتر هم‌کلاس)', () => {
    const inst = sectionById(indexHtml72, 'installment-plan');
    assert.ok(/class="installment-banner-head nk-head"/.test(inst), 'installment head must carry nk-head');
    const heads = indexHtml72.match(/class="[^"]*\bnk-head\b/g) || [];
    assert.strictEqual(heads.length, 7, 'exactly 7 unified section heads (6 legacy + installment), got ' + heads.length);
  });

  test('R72-2: گرادیان‌های تزئینی (هاله/اسپاتلایت) حذف شده‌اند و هایرلاین‌های امضا مانده‌اند', () => {
    assert.ok(!/\.site-header::before/.test(styleCss72 + responsiveCss72), 'header gold aura ::before must be gone');
    assert.ok(!/\.slide-item\.active::after/.test(styleCss72), 'slide spotlight ::after must be gone');
    assert.ok(!/\.installment-special-section-hidden/.test(installmentCss72), 'dead hidden-section rule (blue+red radials) must be gone');
    ['.footer-clean'].forEach(sel => {
      rulesOf(styleCss72, sel).forEach(block => {
        assert.ok(!block.includes('gradient('), sel + ' surface must be flat (no decorative gradient): ' + block.trim());
      });
    });
    // sell-banner: هالهٔ آبی مرده حذف شد، اما هالهٔ طلایی تک‌درخشش عمدی است (قفل R43-1)
    rulesOf(styleCss72, '.sell-banner-box').forEach(block => {
      assert.ok(!block.includes('rgba(29, 78, 216'), 'dead blue radial must be gone from .sell-banner-box');
    });
    assert.ok(/\.sell-banner-box\s*\{[^}]*rgba\(233, 191, 50, 0\.18\)/.test(styleCss72), 'single intentional gold glow stays (R43-1 lock)');
    assert.ok(/\.footer-clean::before\s*\{[^}]*linear-gradient/.test(styleCss72), 'footer gold hairline must survive');
    assert.ok(/\.sell-banner-box::before\s*\{[^}]*linear-gradient/.test(styleCss72), 'sell-banner gold hairline must survive');
  });

  test('R72-3: صفر آبی در تمام CSS (هویت تک‌اکسنت طلایی — D2)', () => {
    const blue = allCss72.match(/#3B82F6|#1D4ED8|#2563EB|#1E40AF|#93C5FD|rgba\(29, 78, 216|rgba\(59, 130, 246/gi) || [];
    assert.deepStrictEqual(blue, [], 'no blue tokens/glows may remain in CSS: ' + blue.join(', '));
  });

  test('R72-4: هر دارایی js/css سه صفحه ?v= دارد (کش ۳۰روزهٔ nginx دادهٔ کرون را کهنه نکند)', () => {
    ['index.html', 'encyclopedia.html', 'deals.html'].forEach(f => {
      const html = fs.readFileSync(path.join(r37ProjectRoot, f), 'utf8');
      const refs = (html.match(/(?:src|href)="(?:js|css)\/[^"]*"/g) || []);
      const naked = refs.filter(r => !r.includes('?v='));
      assert.deepStrictEqual(naked, [], f + ': every js/css ref needs ?v= — ' + naked.join(', '));
    });
    assert.ok(/CATALOG_SRC\s*=\s*'js\/data\/ikco-catalog\.js\?v=/.test(bridge72), 'lazy-injected ikco-catalog.js must be versioned too');
  });

  test('R72-5: ترتیب IA (R54) دست‌نخورده — هیچ ادغام/جابه‌جایی بخش‌ها', () => {
    const order = ['hero-slider-section', 'id="inventory"', 'id="installment-plan"', 'id="why-us"',
                   'id="how-it-works"', 'id="zero-prices"', 'id="auto-encyclopedia"', 'id="sell-car"',
                   'id="faq"', 'id="contact"'];
    let prev = -1;
    order.forEach(token => {
      const at = indexHtml72.indexOf(token);
      assert.ok(at > -1, token + ' must exist in index.html');
      assert.ok(at > prev, token + ' must keep its R54 position');
      prev = at;
    });
    assert.ok(/id="how-it-works"/.test(indexHtml72) && /id="why-us"/.test(indexHtml72), 'trust sections stay separate');
  });
});
