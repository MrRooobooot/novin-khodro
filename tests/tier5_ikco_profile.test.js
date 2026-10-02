/**
 * Tier 5 — IKCO Profile Page (فاز ۲): روتر، تطبیق نام، دیتا، اتصال‌ها
 */
const fs = require('fs');
const path = require('path');
const { describe, test, assert } = require('./helpers/test_runner.js');

const ROOT = path.join(__dirname, '..');

// ---------- دیتا ----------
const catalogSrc = fs.readFileSync(path.join(ROOT, 'js/data/ikco-catalog.js'), 'utf8');
const catalogSandbox = {};
new Function('window', catalogSrc)(catalogSandbox);
const ikcoCatalog = catalogSandbox.ikcoCatalog || catalogSandbox.window && catalogSandbox.window.ikcoCatalog;

// ---------- ماژول‌ها ----------
const bridgeSrc = fs.readFileSync(path.join(ROOT, 'js/modules/ikco-bridge.js'), 'utf8');
const profileSrc = fs.readFileSync(path.join(ROOT, 'js/profile.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const encSrc = fs.readFileSync(path.join(ROOT, 'encyclopedia.html'), 'utf8');
const sitemapSrc = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const carsDataSrc = fs.readFileSync(path.join(ROOT, 'js/cars-data.js'), 'utf8');

function loadProfileModule() {
  const fakeWindow = {};
  const fakeDocument = { addEventListener: () => {}, readyState: 'loading' };
  new Function('window', 'document', profileSrc)(fakeWindow, fakeDocument);
  return fakeWindow.NovinProfile;
}

describe('Tier 5: IKCO Profile (Encyclopedia)', () => {
  test('T5-1: کاتالوگ ۳۷ رکورد با فیلدهای الزامی', () => {
    assert.ok(Array.isArray(ikcoCatalog) && ikcoCatalog.length === 37, '37 records');
    ikcoCatalog.forEach((r) => {
      assert.ok(r.slug && /^[a-z0-9-]+$/.test(r.slug), 'slug ascii: ' + r.slug);
      assert.ok(r.name, 'name: ' + r.slug);
      assert.ok(r.image && r.image.startsWith('assets/ikco/'), 'image path: ' + r.slug);
      assert.ok(r.techSpecs && Object.keys(r.techSpecs).length >= 15, 'specs>=15: ' + r.slug);
    });
  });

  test('T5-2: دیتای پاک — بدون ي/ك عربی و ردیف ناوبری، اعشار اسلشی تمیز', () => {
    const all = JSON.stringify(ikcoCatalog);
    assert.ok(!/[يك]/.test(all), 'no arabic y/k');
    assert.ok(!all.includes('در یک نگاه'), 'no nav row');
    ikcoCatalog.forEach((r) => {
      Object.entries(r.techSpecs).forEach(([k, v]) => {
        if (/شتاب|مصرف|باتری|حجم موتور/.test(k)) {
          assert.ok(!/\d\/\d/.test(v), 'decimal cleaned: ' + r.slug + ' | ' + k + '=' + v);
        }
      });
    });
  });

  test('T5-3: bridge — نرمال‌سازی و تطبیق نام‌محور', () => {
    const w = {};
    const fakeDoc = {
      readyState: 'loading',
      addEventListener: () => {},
      querySelectorAll: () => [],
      createElement: () => ({ setAttribute: () => {}, style: {} }),
    };
    new Function('window', 'document', bridgeSrc)(w, fakeDoc);
    const B = w.IkcoBridge;
    assert.ok(B, 'bridge exposed');
    assert.strictEqual(B.normalizeName('پژو ۲۰۷ی'), B.normalizeName('پژو 207i'), 'fa digits unify');
    const dn = B.matchCatalogName('دنا پلاس توربو اتوماتیک سفید', ikcoCatalog);
    assert.ok(dn && dn.slug === 'dena-plus', 'dena-plus matched');
    const p207 = B.matchCatalogName('پژو ۲۰۷ی دنده‌ای پانوراما', ikcoCatalog);
    assert.ok(p207 && p207.slug === 'peugeot-207i', '207i matched');
    assert.strictEqual(B.matchCatalogName('اکستریم VX شاسی بلند (Xtrim)', ikcoCatalog), null, 'chery not matched');
    assert.strictEqual(B.matchCatalogName('هیوندای i20 مونتاژ کرمان موتور', ikcoCatalog), null, 'hyundai not matched');
  });

  test('T5-4: profile.js — روتر، گروه‌بندی specs، اعشار فارسی', () => {
    // currentSlug از window.location می‌خواند — window Mock با location
    let capturedHash = '#profile/tara';
    const fakeWindow = {
      get location() { return { get hash() { return capturedHash; } }; },
      document: { addEventListener: () => {} },
    };
    const fakeDoc = { addEventListener: () => {}, readyState: 'loading' };
    new Function('window', 'document', profileSrc)(fakeWindow, fakeDoc);
    const NP = fakeWindow.NovinProfile;
    assert.ok(NP, 'NovinProfile API exposed');
    // روتر
    capturedHash = '#profile/tara';
    assert.strictEqual(NP.currentSlug(), 'tara', 'parse valid');
    capturedHash = '#profile/peugeot-207i';
    assert.strictEqual(NP.currentSlug(), 'peugeot-207i', 'parse compound');
    capturedHash = '#other/x';
    assert.strictEqual(NP.currentSlug(), null, 'reject invalid');
    capturedHash = '';
    assert.strictEqual(NP.currentSlug(), null, 'empty hash');
    // گروه‌بندی
    assert.strictEqual(NP.specGroup('حجم موتور (cc)'), 'powertrain', 'powertrain');
    assert.strictEqual(NP.specGroup('مصرف سوخت ترکیبی (Lit/100 km)'), 'consumption', 'consumption');
    assert.strictEqual(NP.specGroup('طول خودرو (mm)'), 'dimensions', 'dimensions');
    assert.strictEqual(NP.specGroup('شتاب صفر تا 100 (ثانیه)'), 'performance', 'performance');
    // اعشار
    assert.ok(NP.faDecimal('10/4').indexOf('٫') !== -1, 'faDecimal slash→momayez');
  });

  test('T5-5: اتصال‌های index.html و app.js — cars-data دست‌خورده', () => {
    assert.ok(indexSrc.includes('css/profile.css'), 'profile.css linked');
    assert.ok(indexSrc.includes('js/modules/ikco-bridge.js'), 'bridge script tag');
    assert.ok(indexSrc.includes('js/profile.js'), 'profile script tag');
    assert.ok(/app\.js\?v=\d+[a-z]/.test(indexSrc), 'app.js cache-bust intact');
    assert.ok(appSrc.includes('IkcoBridge.decorateCard'), 'app.js decorates cards');
    assert.ok(!carsDataSrc.includes('catalogSlug'), 'cars-data untouched');
  });

  test('T5-6: نمای ۳۶۰ فقط برای tara و peugeot-207i', () => {
    const withTour = ikcoCatalog.filter((r) => r.tour360 === true).map((r) => r.slug).sort();
    assert.deepStrictEqual(withTour, ['peugeot-207i', 'tara'], 'tour360 slugs');
  });

  test('T5-7: دانشنامه — سکشن HTML، اسکریپت، رندر کارت از دیتا', () => {
    assert.ok(indexSrc.includes('id="auto-encyclopedia"'), 'ency section in HTML');
    assert.ok(indexSrc.includes('id="encyGrid"'), 'ency grid');
    assert.ok(indexSrc.includes('js/encyclopedia.js'), 'encyclopedia.js script tag');
    const encySrc = fs.readFileSync(path.join(ROOT, 'js/encyclopedia.js'), 'utf8');
    assert.ok(encySrc.includes("IkcoBridge.ensure()"), 'ency renders from bridge catalog');
    // کارت: لینک به #profile/<slug> با عکس گالری
    const w = { IkcoBridge: { toPersianDigits: (v) => String(v) } };
    const fakeDoc = { readyState: 'complete', addEventListener: () => {}, getElementById: () => null };
    new Function('window', 'document', encySrc)(w, fakeDoc);
    const html = w.NovinEncyclopedia.cardHtml(ikcoCatalog[0]);
    assert.ok(html.includes('href="#profile/' + ikcoCatalog[0].slug + '"'), 'card links to profile');
    assert.ok(html.includes(ikcoCatalog[0].image), 'card shows gallery image');
    assert.ok(html.includes('loading="lazy"'), 'lazy images');
  });

  test('T5-8: رکوردها gallery[] واقعی دارند (نه فقط galleryCount)', () => {
    const withGal = ikcoCatalog.filter((r) => Array.isArray(r.gallery) && r.gallery.length > 0);
    assert.strictEqual(withGal.length, 37, 'all 37 have gallery array');
    const tara = ikcoCatalog.find((r) => r.slug === 'tara');
    assert.strictEqual(tara.gallery.length, tara.galleryCount, 'gallery matches galleryCount');
    assert.ok(tara.gallery[0].endsWith('img-01.webp'), 'naming img-01.webp');
    // همه مسیرها assets/ikco پیشوند
    tara.gallery.forEach((g) => assert.ok(g.startsWith('assets/ikco/tara/gallery/'), 'path: ' + g));
  });

  test('T5-9: documents[] شامل کاتالوگ/مشخصات/ویدیو علاوه بر manual', () => {
    const withCatalog = ikcoCatalog.filter((r) => r.documents.some((d) => d.type === 'catalog'));
    assert.ok(withCatalog.length >= 15, 'many cars have catalog PDF: ' + withCatalog.length);
    const withSpecs = ikcoCatalog.filter((r) => r.documents.some((d) => d.type === 'specs'));
    assert.ok(withSpecs.length >= 20, 'many cars have specs PDF: ' + withSpecs.length);
    const soren = ikcoCatalog.find((r) => r.slug === 'soren');
    assert.ok(soren.documents.some((d) => d.type === 'video' && d.file.endsWith('.mp4')), 'soren mp4 docs');
    // همه فایل‌های manual = pdf
    ikcoCatalog.forEach((r) => {
      r.documents.forEach((d) => {
        assert.ok(d.file.startsWith('assets/ikco/'), 'doc path: ' + d.file);
        assert.ok(d.label, 'doc label');
      });
    });
  });

  test('T5-10: آپارات watch → embed تبدیل', () => {
    const fakeWindow = { location: { hash: '' } };
    const fakeDoc = { readyState: 'loading', addEventListener: () => {} };
    new Function('window', 'document', profileSrc)(fakeWindow, fakeDoc);
    const NP = fakeWindow.NovinProfile;
    const embed = NP.aparatEmbed('https://www.aparat.com/v/qR9Mk');
    assert.strictEqual(embed, 'https://www.aparat.com/video/video/embed/videohash/qR9Mk/vt/frame', 'embed url');
    assert.strictEqual(NP.aparatEmbed(''), '', 'empty passthrough');
    assert.strictEqual(NP.aparatEmbed('https://youtube.com/x'), 'https://youtube.com/x', 'non-aparat passthrough');
  });

  test('T5-11: profile route — main-content hide/show + nav لینک دانشنامه', () => {
    assert.ok(profileSrc.includes("getElementById('main-content')"), 'main hidden toggle');
    assert.ok(profileSrc.includes('scrollIntoView'), 'scrolls to profile shell');
    assert.ok(indexSrc.includes('href="#auto-encyclopedia"'), 'nav link to encyclopedia');
  });

  // =========================================================================
  // T5-12: صفحهٔ مستقل دانشنامه (encyclopedia.html) — SEO + بازاستفاده از رندررها
  // =========================================================================
  test('T5-12: encyclopedia.html canonical/JSON-LD/renderer wiring', () => {
    assert.ok(encSrc.includes('rel="canonical" href="https://novinkhodro.shop/encyclopedia.html"'), 'canonical');
    assert.ok(encSrc.includes('og:url" content="https://novinkhodro.shop/encyclopedia.html"'), 'og:url');
    const blocks = encSrc.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || [];
    assert.strictEqual(blocks.length, 2, '2 JSON-LD blocks (CollectionPage + ItemList)');
    blocks.forEach(b => JSON.parse(b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')));
    assert.ok(encSrc.includes('id="auto-encyclopedia"') && encSrc.includes('id="encyGrid"'), 'ency ids');
    assert.ok(encSrc.includes('id="main-content"'), 'profile router needs #main-content');
    assert.ok(encSrc.includes('js/modules/ikco-bridge.js') && encSrc.includes('js/encyclopedia.js') && encSrc.includes('js/profile.js'), 'renderers reused');
    assert.ok(encSrc.includes('<h1'), 'single h1 for SEO');
    assert.ok((encSrc.match(/<h1/g) || []).length === 1, 'exactly one h1');
    const itemList = JSON.parse(blocks[1].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
    assert.strictEqual(itemList['@type'], 'ItemList', 'second block is ItemList');
    assert.strictEqual(itemList.numberOfItems, ikcoCatalog.length, 'ItemList count matches catalog');
    assert.strictEqual(itemList.itemListElement.length, ikcoCatalog.length, 'ItemList entries match catalog');
    assert.ok(encSrc.includes('css/profile.css?v=20260918'), 'profile.css cache-busted');
    assert.ok(encSrc.includes('css/style.css?v=20260918'), 'style.css cache-busted');
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[^<]*document\.write/.test(encSrc), 'no document.write');
  });

  test('T5-13: sitemap + index link discover the standalone encyclopedia', () => {
    assert.ok(sitemapSrc.includes('<loc>https://novinkhodro.shop/encyclopedia.html</loc>'), 'sitemap entry');
    assert.ok(sitemapSrc.includes('<lastmod>2026-09-18</lastmod>'), 'sitemap lastmod');
    assert.ok(indexSrc.includes('href="encyclopedia.html"'), 'index links to standalone page');
    assert.ok(indexSrc.includes('id="auto-encyclopedia"') && indexSrc.includes('href="#auto-encyclopedia"'), 'index section + nav link intact');
  });

  test('T5-14: profile router restores the host page title (encyclopedia != shop)', () => {
    assert.ok(profileSrc.includes('const PAGE_TITLE'), 'PAGE_TITLE captured from host document');
    assert.ok(/document\.title = PAGE_TITLE/.test(profileSrc), 'hideProfile restores host title');
  });

  // =========================================================================
  // T5-15: reveal کارت‌های دانشنامه — رگرسیون زندهٔ R69 (۳۷ کارت در opacity:0
  // گیر کرده بودند چون رندر async بعد از querySelectorAll در app.js اجرا می‌شد)
  // =========================================================================
  test('T5-15: render() کارت‌های تازه‌ساخته را به هوک reveal می‌سپارد', () => {
    assert.ok(/window\.NovinReveal\s*=\s*observeRevealables/.test(appSrc), 'app.js exposes window.NovinReveal');
    assert.ok(/!el\.classList\.contains\('nk-revealed'\)/.test(appSrc), 'already-revealed nodes are not re-observed');

    const encySrc = fs.readFileSync(path.join(ROOT, 'js/encyclopedia.js'), 'utf8');
    assert.ok(encySrc.indexOf('grid.innerHTML = html') < encySrc.indexOf('window.NovinReveal'), 'hook runs after inject');

    const grid = { innerHTML: '' };
    const w = { IkcoBridge: { toPersianDigits: (v) => String(v) } };
    const fakeDoc = {
      readyState: 'complete',
      addEventListener: () => {},
      getElementById: (id) => (id === 'encyGrid' ? grid : null),
    };
    new Function('window', 'document', encySrc)(w, fakeDoc);

    const calls = [];
    w.NovinReveal = () => calls.push(grid.innerHTML.includes('class="ency-card"'));
    w.NovinEncyclopedia.render(ikcoCatalog);
    assert.strictEqual(calls.length, 1, 'reveal hook called once per render');
    assert.ok(calls[0], 'hook fires AFTER cards are injected');
    assert.strictEqual((grid.innerHTML.match(/class="ency-card"/g) || []).length, ikcoCatalog.length, 'all cards injected');

    // بدون هوک (صفحهٔ بدون app.js) نباید خطا بدهد
    delete w.NovinReveal;
    w.NovinEncyclopedia.render(ikcoCatalog);
  });
});

describe('R73: مسیر دارایی‌های IKCO — fallback لوکال فقط روی localhost (بدون ۴۰۴ انبوه روی VPS)', () => {
  const ROOT73 = path.join(__dirname, '..');
  const profile73 = fs.readFileSync(path.join(ROOT73, 'js/profile.js'), 'utf8');
  const ency73 = fs.readFileSync(path.join(ROOT73, 'js/encyclopedia.js'), 'utf8');
  const bridge73 = fs.readFileSync(path.join(ROOT73, 'js/modules/ikco-bridge.js'), 'utf8');
  const idx73 = fs.readFileSync(path.join(ROOT73, 'index.html'), 'utf8');
  const enc73 = fs.readFileSync(path.join(ROOT73, 'encyclopedia.html'), 'utf8');
  const occurrences = (src, needle) => (src.split(needle).length - 1);

  test('R73-1: هر فایل دقیقاً یک مسیر assets-out دارد (داخل دروازهٔ لوکال، نه در قالب‌ها)', () => {
    assert.strictEqual(occurrences(profile73, "'assets-out/ikco/'"), 1, 'profile.js must keep exactly one assets-out literal (inside altSrc)');
    assert.strictEqual(occurrences(ency73, "'assets-out/ikco/'"), 1, 'encyclopedia.js must keep exactly one assets-out literal (inside altSrc)');
    // قالب‌ها هرگز نباید مسیر لوکال را مستقیم بنویسند (تنها منبعش altSrc دروازه‌دار است)
    assert.ok(!/<img src="' \+ esc\('assets-out/.test(profile73), 'templates must not inline a local path');
  });

  test('R73-2: دروازهٔ LOCAL_ASSETS در هر دو فایل هست و altSrc روی هاست production بازنویسی نمی‌کند', () => {
    [['profile.js', profile73], ['encyclopedia.js', ency73]].forEach(([name, src]) => {
      assert.ok(/const LOCAL_ASSETS = \(function \(\) \{[\s\S]{0,220}localhost/.test(src), name + ' must define the localhost host gate');
      const body = src.slice(src.indexOf('function altSrc(src)'), src.indexOf('function altSrc(src)') + 260);
      assert.ok(/if \(!LOCAL_ASSETS\) return String\(src\)/.test(body), name + ': altSrc must return the production path unchanged off-localhost');
    });
  });

  test('R73-3: probe پانوراما اول مسیر production را می‌آزماید (نه assets-out) و apply از panoSrc می‌خواند', () => {
    const probe = profile73.slice(profile73.indexOf('function probeImage('), profile73.indexOf('function setupPano('));
    assert.ok(probe.includes("const prod = prefix + '/' + probe;"), 'probe must build the production path');
    assert.ok(probe.includes('altSrc(prod)'), 'dev path must come from the gated altSrc');
    assert.ok(probe.includes('trySrc(prod, dev === prod)'), 'entry probe must try the production path first');
    assert.ok(probe.includes('img.onload = () => ok(src)'), 'probe must report which src actually loaded');
    assert.ok(!/prefix\.replace\(\/\^assets\\\/ikco\\\/\//.test(profile73), 'no unconditional prefix rewrite may remain');
    const setup = profile73.slice(profile73.indexOf('function setupPano('));
    assert.ok(setup.includes("'url(\"' + panoSrc + '\")'"), 'apply() must use the probed source');
    assert.ok(setup.includes('panoSrc = winningSrc || panoSrc'), 'probe result must feed apply()');
  });

  test('R73-4: بارگذاری profile.js بدون global location خطا نمی‌دهد (sandbox تست‌ها)', () => {
    const w = {};
    const d = { addEventListener: () => {}, readyState: 'loading' };
    assert.doesNotThrow(() => new Function('window', 'document', profile73)(w, d), 'profile.js must evaluate without location');
    const w2 = {};
    const d2 = { addEventListener: () => {}, readyState: 'loading' };
    assert.doesNotThrow(() => new Function('window', 'document', ency73)(w2, d2), 'encyclopedia.js must evaluate without location');
  });

  test('R73-5: هر سه صفحه رندررهای IKCO را با ?v= می‌گیرند (کش ۳۰روزهٔ js)', () => {
    [idx73, enc73].forEach((html) => {
      ['js/profile.js', 'js/encyclopedia.js', 'js/modules/ikco-bridge.js'].forEach((asset) => {
        const m = html.match(new RegExp(asset.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '\\?v=[^"]+'));
        assert.ok(m, asset + ' must be referenced with ?v= in every host page');
      });
    });
    assert.ok(!/assets-out\/ikco\/\[/.test(bridge73), 'bridge must not advertise an un-gated assets-out prefix');
  });
});
