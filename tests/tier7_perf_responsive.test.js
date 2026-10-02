/**
 * Tier 7 — Performance & Responsive Gate (2026-09-12)
 * ریشه‌یابی‌شده از sweep واقعی ۷ viewport (1920→360) روی index + deals:
 * safe-area نوار موبایل، preload فونت 900 (LCP RTL)، layer انفجار کارت‌ها،
 * Cache-Control سروری (HTML revalidate / woff2 immutable / asset no-transform).
 */
const fs = require('fs');
const path = require('path');
const { describe, test, assert } = require('./helpers/test_runner.js');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const indexHtml = read('index.html');
const dealsHtml = read('deals.html');
const styleCss = read('css/style.css');
const responsiveCss = read('css/responsive.css');
const nginxConf = read('nginx.conf');

describe('Tier 7: Performance & Responsive Gate', () => {

  test('T7-1: viewport-fit=cover در index.html و deals.html (safe-area نوار موبایل + notch)', () => {
    assert.ok(indexHtml.includes('width=device-width, initial-scale=1.0, viewport-fit=cover'), 'index viewport-fit');
    assert.ok(dealsHtml.includes('width=device-width, initial-scale=1.0, viewport-fit=cover'), 'deals viewport-fit');
    // padding-bottom نوار چسبان به env(safe-area-inset-bottom) وابسته است؛ بدون cover همیشه ۰
    assert.ok(responsiveCss.includes('env(safe-area-inset-bottom'), 'safe-area consumed in CSS');
  });

  test('T7-2: preload کامل فونت‌های self-hosted — Black(900) برای تیترهای LCP', () => {
    ['Regular', 'Bold', 'Black'].forEach(w => {
      assert.ok(indexHtml.includes(`href="fonts/Vazirmatn-${w}.woff2"`), `preload Vazirmatn-${w}`);
      assert.ok(fs.existsSync(path.join(ROOT, `fonts/Vazirmatn-${w}.woff2`)), `font file ${w}`);
    });
    assert.ok(styleCss.includes('font-weight: 900'), '900 face declared');
    // هیچ preload فونت شکسته‌ای (Medium وجود ندارد)
    assert.ok(!indexHtml.includes('Vazirmatn-Medium'), 'no preload of non-existent face');
  });

  test('T7-3: car-card-modern — will-change دائمی حذف؛ فقط روی hover (۴۶ کارت = layer explosion)', () => {
    const cardBlk = styleCss.match(/\.car-card-modern \{[^}]*\}/);
    assert.ok(cardBlk, '.car-card-modern base rule');
    assert.ok(!cardBlk[0].includes('will-change'), 'no permanent will-change on cards');
    assert.ok(/\.car-card-modern:hover \{[^}]*will-change: transform/.test(styleCss), 'hover-scoped will-change');
  });

  test('T7-4: nginx.conf — استراتژی کش سه‌لایه: woff2 immutable > assets > html no-cache', () => {
    const woff2 = nginxConf.indexOf('\\.woff2$');
    const assets = nginxConf.indexOf('\\.(css|js|svg|jpg|jpeg|png|webp|ico)$');
    const html = nginxConf.indexOf('\\.html$');
    assert.ok(woff2 > -1 && assets > -1 && html > -1, 'all three cache blocks exist');
    assert.ok(woff2 < assets, 'woff2 block BEFORE generic (nginx regex order = first match wins)');
    assert.ok(nginxConf.includes('max-age=31536000, immutable'), 'fonts immutable 1y');
    assert.ok(nginxConf.includes('Cache-Control "no-cache"'), 'html revalidate');
    // woff2 نباید در بلوک generic باقی بماند (وگرنه هرگز به immutable نمی‌رسد)
    assert.ok(!/\(css\|js[^)]*woff2/.test(nginxConf), 'woff2 removed from generic block');
    // add_header در location، ارث‌بری سرور-سطح را ریست می‌کند → هدر امنیتی داخل asset blocks
    const assetSec = (nginxConf.match(/Cache-Control[^;]+;\s*(?:\n\s*#.*)?\n\s*add_header X-Frame-Options/g) || []).length;
    assert.ok(assetSec >= 3, 'sec headers re-declared per location (found ' + assetSec + ')');
  });

  test('T7-5: touch-target — hit-area ۳۶px اسلایدر (AA 2.5.8≥24) بدون هم‌پوشانی ناحیه تپ', () => {
    const dot = styleCss.match(/\.slider-dot \{[^}]*\}/);
    const after = styleCss.match(/\.slider-dot::after \{[^}]*\}/);
    assert.ok(dot && dot[0].includes('height: 12px'), 'dot 12px');
    assert.ok(after && after[0].includes('inset: -16px'), 'inset -16 → 44px hit area (mobile pitch raised to 49px, zero overlap)');
    // موبایل: gap 1.5rem → pitch = 12+24 = 36 = دقیقاً اندازه هیت‌ایرئی، صفر تداخل
    assert.ok(/\.slider-dots \{[^}]*gap: 2\.1rem/.test(responsiveCss), 'mobile dot pitch ≈45.6px ≥ 44px hit area = no overlap');
  });

  test('T7-6: نوار موبایل — body padding برابر ارتفاع نوار + safe-area (هیچ صفحه‌ای زیر بار نمی‌ماند)', () => {
    assert.ok(responsiveCss.includes('padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px))'), 'bottom-bar scroll buffer');
  });

  test('T7-7: بدون CDN/منبع خارجیِ runtime (اسکریپت/استایل/فونت) — نرم در شبکه قطع', () => {
    const ext = [indexHtml, dealsHtml].join('\n').match(/<link[^>]*stylesheet[^>]*href="https?:\/\/[^"]+"|<script[^>]*src="https?:\/\/[^"]+"/g) || [];
    assert.deepStrictEqual(ext, [], 'runtime external assets: ' + ext);
    const cssExt = (read('css/style.css') + read('css/installment.css') + read('css/profile.css')).match(/url\(['"]?https?:\/\//g) || [];
    assert.deepStrictEqual(cssExt, [], 'no external url() in CSS: ' + cssExt);
  });

  test('T7-8: تصاویر — width/height ذاتی روی همه static + lazy در تمپلیت JS (CLS)', () => {
    const imgs = indexHtml.match(/<img[^>]*>/g) || [];
    assert.ok(imgs.length >= 4, 'static imgs present: ' + imgs.length);
    const noDim = imgs.filter(i => !/width="\d+"/.test(i) || !/height="\d+"/.test(i));
    assert.deepStrictEqual(noDim, [], 'static imgs intrinsic size');
    // کارت‌های موجودی/هیرو در app.js زاده می‌شوند
    const appJs = read('js/app.js');
    const jsImgs = appJs.match(/<img[^>]*>/g) || [];
    assert.ok(jsImgs.length >= 2, 'templates have imgs: ' + jsImgs.length);
    const jsNoDim = jsImgs.filter(i => !i.includes('width=') || !i.includes('height='));
    assert.deepStrictEqual(jsNoDim, [], 'JS img templates need intrinsic size');
    assert.ok(jsImgs.every(i => i.includes('loading="lazy"') || i.includes("loading='lazy'") || i.includes('fetchpriority')), 'below-fold imgs lazy or hero high-priority');
  });

  test('T7-9: یکدستی پالت شناورها — قرمز/سبز/آبی از hub و نوار موبایل حذف (هویت تیتانیوم/طلایی)', () => {
    const hub = styleCss.match(/\.float-btn\.whatsapp \{[^}]*\}[\s\S]*?\.float-btn\.call \{[^}]*\}/);
    const bar = styleCss.match(/\.mob-bar-btn\.call \{[^}]*\}[\s\S]*?\.mob-bar-btn\.calc \{[^}]*\}/);
    assert.ok(hub && bar, 'float + mob-bar rules exist');
    assert.ok(!/DC2626|B91C1C|15803D|16a34a|bfdbfe|#10B981/.test(hub[0] + bar[0]), 'no off-brand red/green/blue: ' + (hub[0] + bar[0]).slice(0, 60));
    assert.ok(/FBBF24|brand-gold/.test(hub[0]) && /FBBF24|brand-gold/.test(bar[0]), 'gold token used');
    // نوار موبایل تیره = همان surface سایت
    assert.ok(/\.mobile-bottom-bar \{[^}]*rgba\(11, 18, 32/.test(styleCss), 'dark titanium bar');
    // هدر CTA دمو‌کراتیک‌شده: outline، نه fill هم‌سایز primary
    assert.ok(/\.btn-header-call \{[^}]*background: transparent/.test(styleCss), 'header call is outline');
    // hub دایره‌ای ۵۶px آیکون‌محور (لبه چپ، خارج از گرید)
    assert.ok(/\.float-btn \{[^}]*width: 56px/.test(styleCss), 'circular FAB 56px');
    assert.ok(indexHtml.includes('class="float-label"'), 'hub labels collapse to hover');
  });

  test('T7-10: هدر بدون سرریز — کشوی ناوبری از 1200px، فون-لینک فوتر تارگت ۴۴px', () => {
    const blk = responsiveCss.match(/@media \(max-width: 1200px\)\s*\{[\s\S]*?\n\}/);
    assert.ok(blk, 'drawer breakpoint 1200 must exist');
    assert.ok(blk[0].includes('.nav-links') && blk[0].includes('position: fixed'), 'drawer activates at 1200');
    assert.ok(!/\.nav-links \{[^}]*width: 82%/.test(styleCss), 'drawer must not be position-fixed in base css');
    assert.ok(/\.footer-phone-link \{[^}]*min-height: 44px/.test(styleCss), 'footer tel link 44px touch target');
    assert.ok(!/\.header-inner \{[^}]*gap: 2rem/.test(styleCss), 'header gap tightened');
  });
});
