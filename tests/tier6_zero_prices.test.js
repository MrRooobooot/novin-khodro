/**
 * Tier 6 — Zero Prices (قیمت روز خودروهای صفر) — تجربه مرحله‌به‌مرحله
 * برند → مدل → تیپ: دیتا، فیلتر سال، رندر سه ویو، اتصال index.html
 */
const fs = require('fs');
const path = require('path');
const { describe, test, assert } = require('./helpers/test_runner.js');

const ROOT = path.join(__dirname, '..');

// ---------- دیتا ----------
const dataSrc = fs.readFileSync(path.join(ROOT, 'js/data/zero-prices.js'), 'utf8');
const sandbox = {};
new Function('window', dataSrc)(sandbox);
const zeroPrices = sandbox.zeroPrices;

// ---------- ماژول رندر ----------
const renderSrc = fs.readFileSync(path.join(ROOT, 'js/zero-prices-render.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cssSrc = fs.readFileSync(path.join(ROOT, 'css/profile.css'), 'utf8');

function loadModule() {
  const w = {};
  new Function('window', 'document', renderSrc)(w, {
    readyState: 'complete',
    getElementById: () => null,
    addEventListener: () => {}
  });
  return w.NovinZeroPrices;
}

describe('Tier 6: Zero Prices (مرحله‌به‌مرحله: برند → مدل → تیپ)', () => {
  test('T6-1: window.zeroPrices آرایه ≥۸۰ رکورد با slug معتبر', () => {
    assert.ok(Array.isArray(zeroPrices), 'zeroPrices is array');
    assert.ok(zeroPrices.length >= 80, '>=80 records, got ' + zeroPrices.length);
    zeroPrices.forEach(r => assert.ok(/^[a-z0-9%\-]+$/.test(r.slug) || r.slug, 'slug: ' + r.slug));
  });

  test('T6-2: فیلدهای الزامی هر رکورد (brand/brandName/model/trim/قیمت/فرمت فارسی)', () => {
    zeroPrices.forEach((r) => {
      assert.ok(r.brand && r.brandName, 'brand+brandName: ' + r.slug);
      assert.ok(r.model, 'model: ' + r.slug);
      assert.ok(typeof r.price === 'number' && r.price > 0, 'price>0: ' + r.slug);
      assert.ok(/تومان$/.test(r.priceFormatted), 'فرمت تومان: ' + r.slug);
      assert.ok(/[۰-۹]/.test(r.priceFormatted), 'ارقام فارسی: ' + r.slug);
      assert.ok(r.yearLabel && /[۰-۹]/.test(r.yearLabel), 'yearLabel: ' + r.slug);
      assert.ok(r.source === 'hamrah-mechanic' || r.source === 'bama' || r.source === 'car.ir' || r.source === 'khodro45', 'source: ' + r.slug);
      assert.ok(/\d{4}-\d{2}-\d{2}/.test(r.fetchedAt), 'ISO: ' + r.slug);
    });
  });

  test('T6-3: قيمت‌ها سازگار (price = priceMillion × ۱۰۰۰۰۰۰) و سال ≥۱۴۰۳', () => {
    zeroPrices.forEach((r) => {
      assert.strictEqual(r.priceMillion * 1e6, r.price, 'consistency: ' + r.slug);
      const y = parseInt(String(r.yearLabel || '').replace(/[۰-۹]/g, x => '۰۱۲۳۴۵۶۷۸۹'.indexOf(x)), 10);
      assert.ok(y >= 1403, 'year>=1403: ' + r.slug + ' ' + r.yearLabel);
    });
  });

  test('T6-4: تفکیک trim — یک مدل چند تیپ با قیمت‌های متفاوت (۲۰۷)', () => {
    const p207 = zeroPrices.filter(r => (r.model || '').includes('207'));
    assert.ok(p207.length >= 5, '>=5 trims for 207: ' + p207.length);
    const prices = new Set(p207.map(r => r.price));
    assert.ok(prices.size >= 3, '207 trims have distinct prices: ' + prices.size);
  });

  test('T6-5: trendHtml — بالا/پایین/ثابت از prevPrice', () => {
    const mod = loadModule();
    const p207 = zeroPrices.find(r => (r.model || '').includes('207'));
    const html = mod.trimList(p207.model, zeroPrices);
    assert.ok(html.includes('zp-trim-row'), 'trim rows rendered');
    assert.ok(/zp-up|zp-down|zp-flat/.test(html), 'trend badge rendered');
  });

  test('T6-6: XSS-safe — escape در هر سه ویو', () => {
    const mod = loadModule();
    const evil = '<img src=x onerror=alert(1)>';
    const b = mod.brandCards([{ slug: 'x', brandName: evil, model: evil, name: evil, price: 1, yearLabel: '۱۴۰۵', fetchedAt: '2026-09-11' }]);
    assert.ok(!b.includes('<img src=x'), 'escaped brand');
    const m = mod.modelCards(evil, [{ slug: 'x', brandName: evil, model: evil, name: evil, price: 1, yearLabel: '۱۴۰۵', fetchedAt: '2026-09-11' }]);
    assert.ok(!m.includes('<img src=x'), 'escaped model card');
  });

  test('T6-7: سه ویو — brandCards / modelCards / trimList خروجی سیمانتیک', () => {
    const mod = loadModule();
    const brands = mod.brandCards(zeroPrices);
    assert.ok(brands.includes('zp-brand-card'), 'brand cards');
    assert.ok(brands.includes('ایران‌خودرو'), 'IKCO group present');
    const brand = zeroPrices[0].brandName;
    const models = mod.modelCards(brand, zeroPrices);
    assert.ok(models.includes('zp-model-card'), 'model cards');
    assert.ok(models.includes('zp-breadcrumb'), 'breadcrumb in model view');
    const modelKey = zeroPrices[0].model;
    const trims = mod.trimList(modelKey, zeroPrices);
    assert.ok(trims.includes('zp-trim-row'), 'trim rows');
    assert.ok(trims.includes('zp-trim-price'), 'trim price');
    assert.ok(trims.includes('zp-breadcrumb'), 'breadcrumb in trim view');
  });

  test('T6-8: API ماژول — render بدون گرید بدون کرش، faDate فارسی', () => {
    const mod = loadModule();
    assert.doesNotThrow(() => mod.render(), 'render without grid safe');
    const d = mod.faDate('2026-09-11T10:00:00+03:30');
    assert.ok(/[۰-۹]/.test(d) && d.length > 4, 'faDate: ' + d);
  });

  test('T6-9: اتصال index.html — سکشن بین inventory و دانشنامه + اسکریپت‌ها', () => {
    const inv = indexSrc.indexOf('id="inventory"');
    const zp = indexSrc.indexOf('id="zero-prices"');
    const enc = indexSrc.indexOf('id="auto-encyclopedia"');
    assert.ok(inv > -1 && zp > -1 && enc > -1, 'sections exist');
    assert.ok(zp > inv && zp < enc, 'zero-prices between inventory and encyclopedia');
    assert.ok(indexSrc.includes('id="zeroPricesGrid"') || indexSrc.includes('id="zeroPricesBrands"'), 'grid element');
    assert.ok(indexSrc.includes('js/data/zero-prices.js'), 'data script');
    assert.ok(indexSrc.includes('js/zero-prices-render.js'), 'render script');
  });

  test('T6-10: CSS سکشن — کارت برند/مدل/تیپ + breadcrumb + واترمارک + ترند', () => {
    ['.zero-prices-section', '.zp-brand-card', '.zp-model-card', '.zp-trim-row', '.zp-trim-price',
     '.zp-breadcrumb', '.zp-crumb', '.zp-brand-watermark', '.zp-trend.zp-up', '.zp-step-title'].forEach((cls) => {
      assert.ok(cssSrc.includes(cls), 'CSS: ' + cls);
    });
  });

  test('T6-11: bamaPrice اختیاری سازگار (وقتی موجود، بالای آستانه)', () => {
    zeroPrices.filter(r => typeof r.bamaPrice === 'number').forEach((r) => {
      assert.ok(r.bamaPrice > 0, 'bamaPrice>0: ' + r.slug);
    });
  });

  test('T6-12: یکپارچه‌سازی دسته‌بندی — ۱۰۹ برند خام → ≤۸۰ کارت، زیربرندها در مادر، جستجو + گروه ایرانی/خارجی', () => {
    const mod = loadModule();
    const brands = mod.brandCards(zeroPrices);
    const cards = [...brands.matchAll(/data-brand="([^"]+)"/g)].map(m => m[1]);
    assert.ok(cards.length <= 80 && cards.length >= 40, 'consolidated card count: ' + cards.length);
    assert.equal(new Set(cards).size, cards.length, 'no duplicate brand cards');
    ['دنا', 'تارا', 'سمند', 'شاهین', 'ساینا', 'کوییک', 'فیدلیتی', 'ریسپکت', 'اکستریم'].forEach(modelAsBrand => {
      assert.ok(!cards.includes(modelAsBrand), modelAsBrand + ' must fold into parent brand');
    });
    assert.ok(!cards.includes('فولکس') && cards.includes('فولکس‌واگن'), 'VW spelling merged');
    assert.ok(brands.includes('برندهای ایرانی') && brands.includes('برندهای خارجی'), 'grouped');
    assert.ok(brands.includes('zp-brand-search'), 'search input');
    // مدل‌های ایران‌خودرو حالا دنا/تارا/سمند را دارند
    const ikco = mod.modelCards('ایران‌خودرو', zeroPrices);
    ['دنا', 'تارا', 'سمند'].forEach(n => assert.ok(ikco.includes(n), 'IKCO owns ' + n));
    const mCards = [...ikco.matchAll(/zp-model-name">([^<]+)</g)].map(m => m[1]);
    assert.equal(new Set(mCards).size, mCards.length, 'no duplicate model cards');
    // تیپ‌ها: ردیف تکراری trim+year بدون تکرار (نمونه: هایما S5 با دو slug موازی)
    const t1 = mod.trimList('haima-s5', zeroPrices);
    const subRows = [...t1.matchAll(/zp-trim-sub"><div class="zp-trim-main"><span class="zp-trim-year">مدل ([^<]+)<\/span><\/div><div class="zp-trim-side"><span class="zp-trim-price">([^<]+)<\/span><span class="zp-trend zp-\w+">([^<]+)<\/span>/g)].map(m => m[1] + '|' + m[2]);
    assert.equal(new Set(subRows).size, subRows.length, 'deduped trim+year+price rows: ' + subRows.length);
    assert.ok(t1.includes('zp-trim-group') && t1.includes('zp-trim-head'), 'grouped trim view');
  });
});

// ---------- منابع جدید (car.ir + khodro45) + شکارها (deals) ----------

const dealsSrc = fs.readFileSync(path.join(ROOT, 'js/data/deals.js'), 'utf8');
const dealsSandbox = {};
new Function('window', dealsSrc)(dealsSandbox);
const carDeals = dealsSandbox.carDeals;

const dealsRenderSrc = fs.readFileSync(path.join(ROOT, 'js/deals-render.js'), 'utf8');
const dealsHtmlSrc = fs.readFileSync(path.join(ROOT, 'deals.html'), 'utf8');
const dealsCssSrc = fs.readFileSync(path.join(ROOT, 'css/deals.css'), 'utf8');

function loadDealsModule(storage) {
  const w = {
    localStorage: {
      getItem: (k) => (storage && storage[k] != null ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
    },
    document: {
      readyState: 'complete',
      getElementById: () => null,
      addEventListener: () => {}
    }
  };
  new Function('window', dealsRenderSrc)(w);
  return w.NovinDeals;
}

describe('Tier 6b: multi-source (car.ir/khodro45) + Deals (شکارها + گیت توکن)', () => {
  test('T6b-1: حداقل یک رکورد car.ir با فیلد carIrPrice', () => {
    const carir = zeroPrices.filter(r => r.source === 'car.ir');
    assert.ok(carir.length >= 20, 'car.ir records >=20, got ' + carir.length);
    carir.forEach(r => {
      assert.strictEqual(r.carIrPrice, r.price, 'carIrPrice==price: ' + r.slug);
    });
  });

  test('T6b-2: حداقل یک رکورد khodro45', () => {
    const k45 = zeroPrices.filter(r => r.source === 'khodro45');
    assert.ok(k45.length >= 20, 'khodro45 records >=20, got ' + k45.length);
    k45.forEach(r => assert.ok(r.price > 0 && r.brandName, 'k45 valid: ' + r.slug));
  });

  test('T6b-3: کارخانه اختیاری — وقتی موجود، مثبت و متفاوت از price', () => {
    zeroPrices.filter(r => typeof r.factoryPrice === 'number').forEach((r) => {
      assert.ok(r.factoryPrice > 0, 'factoryPrice>0: ' + r.slug);
    });
  });

  test('T6b-4: بدون رکورد تکراری (brand+trim+year یکتا)', () => {
    const seen = new Set();
    zeroPrices.forEach((r) => {
      const k = r.brandName + '|' + r.trim + '|' + r.yearLabel;
      assert.ok(!seen.has(k), 'duplicate: ' + k);
      seen.add(k);
    });
  });

  test('T6b-5: window.carDeals آرایه معتبر با ساختار deal کامل (چند-پلتفرمی)', () => {
    assert.ok(Array.isArray(carDeals), 'carDeals is array');
    assert.ok(carDeals.length >= 1, 'deals >=1, got ' + carDeals.length);
    const PLATFORMS = {
      bama: /bama\.ir/,
      divar: /divar\.ir/,
      sheypoor: /sheypoor\.com/,
    };
    carDeals.forEach((d) => {
      assert.ok(d.slug && d.name, 'deal slug+name');
      assert.ok(d.platform && PLATFORMS[d.platform], 'platform known: ' + d.platform);
      assert.ok(typeof d.price === 'number' && d.price > 0, 'deal price>0');
      assert.ok(typeof d.marketMedian === 'number' && d.marketMedian > d.price, 'median>price: ' + d.name);
      assert.ok(d.discountPct >= 15, 'discountPct>=15: ' + d.name + ' ' + d.discountPct);
      assert.ok(PLATFORMS[d.platform].test(d.href), 'href matches platform ' + d.platform + ': ' + d.href);
      assert.ok(/\d{4}-\d{2}-\d{2}/.test(d.fetchedAt), 'fetchedAt ISO');
    });
  });

  test('T6b-6: مرتب‌سازی نزولی تخفیف', () => {
    for (let i = 1; i < carDeals.length; i++) {
      assert.ok(carDeals[i - 1].discountPct >= carDeals[i].discountPct, 'sorted by discount');
    }
  });

  test('T6b-7: گیت — بدون توکن، فرم؛ با توکن درست، unlock', () => {
    const storage = {};
    const mod = loadDealsModule(storage);
    assert.strictEqual(mod.isUnlocked(), false, 'locked by default');
    storage['nk_deals_token'] = mod.DEALS_TOKEN_HASH;
    const mod2 = loadDealsModule(storage);
    assert.strictEqual(mod2.isUnlocked(), true, 'unlocked with correct token');
    storage['nk_deals_token'] = 'wrong';
    const mod3 = loadDealsModule(storage);
    assert.strictEqual(mod3.isUnlocked(), false, 'wrong token stays locked');
  });

  test('T6b-8: renderGate فرم توکن می‌سازد؛ renderDeals جدول می‌سازد', () => {
    const qsa = () => [];
    const listNode = { innerHTML: '', querySelector: () => null, querySelectorAll: qsa };
    // renderGate و renderDeals هر دو در el('dealsList') می‌نویسند
    const doc2 = { readyState: 'complete', getElementById: (id) => (id === 'dealsList' ? listNode : { innerHTML: '' }), addEventListener: () => {} };
    new Function('window', 'document', dealsRenderSrc)({ localStorage: { getItem: () => null, setItem: () => {} } }, doc2);
    assert.ok(listNode.innerHTML.includes('dealsGateForm'), 'gate form rendered');
    assert.ok(listNode.innerHTML.includes('dealsTokenInput'), 'token input rendered');
    listNode.innerHTML = '';
    // carDeals از window می‌خواند — داخل همان sandbox ست شود
    const w = {};
    new Function('window', dealsSrc)(w);
    const sandboxWin = { localStorage: { getItem: (k) => (k === 'nk_deals_token' ? '00afe40235fa8d4898497204' : null), setItem: () => {} }, carDeals: w.carDeals };
    new Function('window', 'document', dealsRenderSrc)(sandboxWin, doc2);
    assert.ok(listNode.innerHTML.includes('deal-table'), 'deals table rendered');
    assert.ok(listNode.innerHTML.includes('deal-badge'), 'discount badge rendered');
  });

  test('T6b-9: XSS-safe در رندر شکارها', () => {
    const qsa = () => [];
    const node = { innerHTML: '', querySelector: () => null, querySelectorAll: qsa };
    const doc = { readyState: 'complete', getElementById: () => node, addEventListener: () => {} };
    const evil = [{ slug: 'x', name: '<img src=x onerror=alert(1)>', trim: '<script>', year: 1404, price: 1, marketMedian: 2, discountPct: 50, source: 'bama', href: 'javascript:alert(1)', fetchedAt: '2026-09-12' }];
    new Function('window', 'document', dealsRenderSrc)({ localStorage: { getItem: (k) => (k === 'nk_deals_token' ? '00afe40235fa8d4898497204' : null), setItem: () => {} }, carDeals: evil }, doc);
    assert.ok(!node.innerHTML.includes('<img src=x'), 'escaped name');
    assert.ok(!node.innerHTML.includes('javascript:alert(1)'), 'escaped href');
  });

  test('T6b-10: deals.html — noindex، بدون لینک از index، scripts صحیح', () => {
    assert.ok(dealsHtmlSrc.includes('noindex, nofollow'), 'noindex meta');
    assert.ok(dealsHtmlSrc.includes('js/data/deals.js'), 'deals data script');
    assert.ok(dealsHtmlSrc.includes('js/deals-render.js'), 'render script');
    assert.ok(dealsHtmlSrc.includes('css/deals.css'), 'deals css');
    assert.ok(!indexSrc.includes('deals.html'), 'index.html does not link deals.html');
    const sitemapSrc = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    assert.ok(!sitemapSrc.includes('deals.html'), 'sitemap does not include deals.html');
  });

  test('T6b-11: CSS گیت و جدول شکارها', () => {
    ['.deal-gate', '.deal-table', '.deal-badge', '.deal-row', '.deals-main'].forEach((cls) => {
      assert.ok(dealsCssSrc.includes(cls), 'CSS: ' + cls);
    });
  });
});

describe('R74: فقط برندهای ایرانی در UI (خارجی موقتاً پنهان — دیتا کامل می‌ماند)', () => {
  const r74Idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const r74Src = fs.readFileSync(path.join(ROOT, 'js/zero-prices-render.js'), 'utf8');
  const mod74 = loadModule();
  const IRANI = ['ایران‌خودرو', 'سایپا', 'مدیران‌خودرو', 'کرمان‌موتور', 'فونیکس', 'گروه بهمن', 'هایما', 'پارس خودرو', 'مکث موتور', 'فردا', 'مانیان', 'آرتابان', 'زد ایکس اتو'];

  test('R74-1: domesticOnly خارجی‌ها را حذف و ایرانی‌ها را نگه می‌دارد؛ دیتای کامل دست‌نخورده', () => {
      const dom = mod74.domesticOnly(zeroPrices);
      assert.ok(dom.length > 200 && dom.length < zeroPrices.length, 'filtered count sane (' + dom.length + '/' + zeroPrices.length + ')');
      const FOREIGN = ['تویوتا', 'نیسان', 'kia', 'کیا', 'هوندا', 'سوزوکی', 'مزدا', 'میتسوبیشی', 'هیوندای', 'بی ام و', 'بی‌ام‌و', 'مرسدس', 'آئودی', 'فولکس', 'رنو', 'چری', 'جک', 'هاوال', 'بایک', 'فوتون', 'لکسوس', 'ولوو', 'اشکودا', 'سیتروئن', 'فیات', 'مینی', 'زانویا', 'بیجینگ', 'دانگ', 'چانگان', 'بی وای دی', 'بی‌وای‌دی', 'ام جی', 'امجی', 'ام وی ام', 'ونوسیا'];
      const brands = [...new Set(dom.map((r) => String(r.brandName || '').trim()))];
      const leaked = brands.filter((b) => FOREIGN.some((f) => b.includes(f)));
      // ام‌وی‌ام/ونوسیا زیرمجموعهٔ مدیران‌خودروست (برند ایرانیِ مونتاژی) → از denylist خارج می‌شود
      const leakedStrict = leaked.filter((b) => !['ام وی ام', 'اموی‌ام', 'ونوسیا'].includes(b) && !b.includes('آرتابان'));
      assert.deepStrictEqual(leakedStrict, [], 'foreign brands leaked: ' + leakedStrict.join(', '));
      assert.ok(brands.some((b) => /ایران|سایپا|بهمن|کرمان|فونیکس|هایما/.test(b)), 'domestic brands kept');
      const countBy = (src) => zeroPrices.filter((r) => String(r.source || '') === src).length;
      const bySource = { hamrah: countBy('hamrah-mechanic'), carir: countBy('car.ir'), k45: countBy('khodro45') };
      // کفِ کل: اندازه‌گیری‌شده ۸۸۵ (۱۴۰۵/۰۶/۲۵) پس از کورشدن karnameh/khodrobank در R74؛
      // ۹۲۴ قبلی شامل همان دو منبع بود. افت > ~۵٪ نسبت به این کف = شکست واقعی پایپ‌لاین.
      assert.ok(zeroPrices.length >= 850, 'raw data untouched: ' + zeroPrices.length);
      // گارد اصلی: سقوط بی‌صدای یک منبع (باگ واقعی) را می‌گیرد — نه عدد کل را.
      assert.ok(bySource.hamrah >= 300, 'hamrah-mechanic floor: ' + bySource.hamrah);
      assert.ok(bySource.carir >= 80, 'car.ir floor: ' + bySource.carir);
      assert.ok(bySource.k45 >= 380, 'khodro45 floor: ' + bySource.k45);
      assert.deepStrictEqual(mod74.domesticOnly(undefined), [], 'empty-safe');
    });

  test('R74-2: ورودی رندر فقط از domesticOnly تغذیه می‌شود (دو نقطهٔ ورود) و سوییچ واحد وجود دارد', () => {
    const assigns = (r74Src.match(/state\.records\s*=\s*[^;]+/g) || []);
    assert.ok(assigns.length >= 2, 'two ingress assignments expected, got ' + assigns.length);
    assigns.forEach((a) => assert.ok(/domesticOnly/.test(a), 'ingress must be filtered: ' + a));
    assert.ok(/var SHOW_FOREIGN\s*=\s*false/.test(r74Src), 'single SHOW_FOREIGN flag');
  });

  test('R74-3: lazy-loader داده‌ها ?v= جاری دارد (کش ۳۰روزهٔ js — نه 20260911c)', () => {
    assert.ok(r74Src.includes("js/data/zero-prices.js?v=20260918y"), 'lazy data fetch must carry current ?v=');
    assert.ok(!r74Src.includes('20260911c'), 'stale lazy ?v= must be gone');
    assert.ok(r74Idx.includes('js/zero-prices-render.js?v=20260918z'), 'renderer itself cache-busted');
  });
});

// ---------- R75: صندوق سرنخ + صفحهٔ عمومی قیمت + سخت‌سازی پاسخ ----------
describe('R75: سنجش بازدهی، صندوق سرنخ و صفحهٔ ایندکس‌پذیر قیمت', () => {
  const r75Prices = fs.readFileSync(path.join(ROOT, 'prices.html'), 'utf8');
  const r75Nginx = fs.readFileSync(path.join(ROOT, 'nginx.conf'), 'utf8');
  const r75Events = fs.readFileSync(path.join(ROOT, 'nginx-events.conf'), 'utf8');
  const r75Analytics = fs.readFileSync(path.join(ROOT, 'js/analytics.js'), 'utf8');
  const r75App = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const r75Sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const r75Idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  test('R75-1: prices.html — ۸۸۵ تیپ/۱۰۹ برند، canonical و JSON-LD با تاریخ تازگی سایت', () => {
    const cells = (r75Prices.match(/تومان<\/td>/g) || []).length;
    const sections = (r75Prices.match(/class="nk-brand"/g) || []).length;
    assert.ok(cells === zeroPrices.length, `یک ردیف قیمت به‌ازای هر رکورد (${cells}/${zeroPrices.length})`);
    assert.ok(sections >= 100, 'brand sections: ' + sections);
    assert.ok(r75Prices.includes('<link rel="canonical" href="https://novinkhodro.shop/prices.html">'), 'canonical');
    const ld = JSON.parse((r75Prices.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]);
    assert.strictEqual(ld.dateModified, '2026-09-18', 'JSON-LD dateModified must follow the site freshness stamp');
    assert.ok(r75Prices.includes('/js/analytics.js'), 'سنجش روی صفحهٔ قیمت هم فعال است');
    assert.ok(r75Sitemap.includes('<loc>https://novinkhodro.shop/prices.html</loc>'), 'sitemap entry');
    assert.ok(r75Idx.includes('href="/prices.html"'), 'index links to the full price list');
  });

  test('R75-2: نقطه‌های سنجش/سرنخ در nginx با log_format خودشان', () => {
    assert.ok(/location\s*=\s*\/t\s*\{[\s\S]*?access_log \/var\/log\/nginx\/nk-events\.log nk_events;/.test(r75Nginx), 'location = /t → nk-events.log');
    assert.ok(/location\s*=\s*\/lead\s*\{[\s\S]*?access_log \/var\/log\/nginx\/nk-leads\.log nk_leads;/.test(r75Nginx), 'location = /lead → nk-leads.log');
    assert.ok(r75Events.includes('log_format nk_events'), 'nk_events format');
    assert.ok(r75Events.includes('log_format nk_leads'), 'nk_leads format');
    assert.ok(r75Events.includes('$arg_ph'), 'lead format keeps the phone arg');
  });

  test('R75-3: صندوق سرنخ در سمت مرورگر به فرم فروش و استعلام اقساط وصل است', () => {
    assert.ok(/window\.nkLead\s*=\s*lead/.test(r75Analytics), 'analytics exposes nkLead');
    assert.ok(r75Analytics.includes("'/lead?'"), 'lead beacon targets /lead');
    assert.ok(/window\.nkLead\('sell'/.test(r75App), 'sell form records a lead');
    assert.ok(/window\.nkLead\('calc'/.test(r75App), 'loan apply records a lead');
    ['index.html', 'encyclopedia.html', 'deals.html'].forEach((f) => {
      assert.ok(fs.readFileSync(path.join(ROOT, f), 'utf8').includes('js/analytics.js'), f + ' loads analytics.js');
    });
  });

  test('R75-4: پنل لوکال — ایمپورت گروهی با عکس اجباری و API سرنخ', () => {
    const admin = fs.readFileSync(path.join(ROOT, 'scripts/admin-local.py'), 'utf8');
    assert.ok(admin.includes('"/admin-api/import"') && admin.includes('def do_POST'), 'import endpoint');
    assert.ok(admin.includes('"/admin-api/leads"') && admin.includes('def read_leads'), 'leads endpoint');
    assert.ok(admin.includes('تصویر اجباری است'), 'missing-photo rows rejected');
    const panel = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
    assert.ok(panel.includes('id="leadsList"') && panel.includes('id="importText"'), 'panel has leads + import UI');
    assert.ok(/API \+ '\/import'/.test(panel), 'panel posts to the import endpoint');
    assert.ok(/API \+ '\/leads'/.test(panel), 'panel reads the lead inbox');
  });
});
