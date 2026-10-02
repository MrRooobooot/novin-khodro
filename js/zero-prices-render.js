/**
 * قیمت روز خودروهای صفر — تجربه مرحله‌به‌مرحله (دسته‌بندی برند → مدل → تیپ)
 * مسیر کاربر: انتخاب برند (گرید کارت برند) → انتخاب مدل (کارت مدل با بازه قیمت) → لیست تیپ/سال با قیمت
 * دیتا: js/data/zero-prices.js (دو منبع). بدون فریمورک، فقط tokenهای showroom.
 */
(function () {
  'use strict';

  var VIEW = 'brands'; // brands | models | trims
  var state = { brand: null, model: null, records: [] };

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function faDigits(v) {
    return String(v == null ? '' : v).replace(/\d/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'[x]; });
  }

  function faDate(iso) {
    if (!iso) return '';
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    var months = ['', 'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
    return faDigits(parseInt(m[3], 10)) + ' ' + months[parseInt(m[2], 10)] + ' ' + faDigits(m[1]);
  }

  var BRAND_ORDER = ['ایران‌خودرو', 'سایپا', 'مدیران‌خودرو', 'کرمان‌موتور', 'فونیکس', 'گروه بهمن', 'هایما', 'چانگان'];
  // نرمال‌سازی برند: املای موازی + زیربرند/مدل → برند مادر (دیتای خام هر ۶ ساعت از cron بازنویسی می‌شود، پس اینجا فیکس می‌شود)
  var BRAND_CANON = {
    'ایران خودرو': 'ایران‌خودرو', 'کرمان موتور': 'کرمان‌موتور', 'مدیران خودرو': 'مدیران‌خودرو',
    'فولکس': 'فولکس‌واگن', 'فولکس واگن': 'فولکس‌واگن',
    'اسکودا': 'اشکودا', 'آواتار': 'آواتر', 'اپل': 'اوپل', 'شوال': 'شوالیه',
    'فردا موتور': 'فردا', 'پارس نوآ': 'پارس خودرو', 'پارس خودرو': 'پارس خودرو',
    'آرتابان (ای ام جی)': 'آرتابان', 'بک (بی ای سی)': 'بی ای سی', 'گک (جی ای سی)': 'جی ای سی',
    'سانگ یانگ (کی جی ام)': 'سانگ یانگ',
    'دنا': 'ایران‌خودرو', 'تارا': 'ایران‌خودرو', 'سمند': 'ایران‌خودرو', 'رانا': 'ایران‌خودرو', 'ری را': 'ایران‌خودرو',
    'شاهین': 'سایپا', 'ساینا': 'سایپا', 'کوییک': 'سایپا', 'سهند': 'سایپا', 'آریسان': 'سایپا', 'زامیاد': 'سایپا',
    'فیدلیتی': 'گروه بهمن', 'دیگنیتی': 'گروه بهمن', 'ریسپکت': 'گروه بهمن', 'کاپرا': 'گروه بهمن',
    'اکستریم': 'فونیکس', 'ایکس تریم': 'فونیکس',
    'ام وی ام': 'مدیران‌خودرو', 'ونوسیا': 'مدیران‌خودرو'
  };
  var IRANI_BRANDS = ['ایران‌خودرو', 'سایپا', 'مدیران‌خودرو', 'کرمان‌موتور', 'فونیکس', 'گروه بهمن', 'هایما', 'پارس خودرو', 'مکث موتور', 'فردا', 'مانیان', 'آرتابان', 'زد ایکس اتو'];
  function canonicalBrand(name) {
    var s = String(name || 'سایر')
      .replace(/[ًٌٍَُِّْـ]/g, '')                       // اعراب/تطویل
      .replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9')
      .replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim(); // ZWNJ→فاصله، همه‌اشیکال یکی
    return BRAND_CANON[s] || s;
  }
  function isIrani(b) { return IRANI_BRANDS.indexOf(b) !== -1; }
  /**
   * R74: فعلاً فقط برندهای ایرانی در UI — ۶۷۵ رکورد خارجی از ۹۲۴ پنهان می‌شود
   * (دیتا و `brandCards` دست‌نخورده می‌مانند، پس با یک سوییچ برمی‌گردد).
   */
  var SHOW_FOREIGN = false;
  function domesticOnly(all) {
    var list = all || [];
    if (SHOW_FOREIGN) return list;
    return list.filter(function (r) { return isIrani(canonicalBrand(r.brandName)); });
  }
  var CAR_SVG = '<svg viewBox="0 0 200 100" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true" focusable="false"><path d="M15 70h170M30 70l20-35h90l30 35M55 70a15 15 0 1 1-30 0M165 70a15 15 0 1 1-30 0"/></svg>';

  /** URL-safe key برای brand/model */
  function key(s) { return String(s || '').replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-'); }

  function trendHtml(rec) {
    var prev = rec.prevPrice;
    if (!prev || prev === rec.price) {
      return '<span class="zp-trend zp-flat">ثابت</span>';
    }
    if (rec.price > prev) {
      var up = Math.round(((rec.price - prev) / prev) * 1000) / 10;
      return '<span class="zp-trend zp-up">▲ ' + faDigits(up) + '٪</span>';
    }
    var dn = Math.round(((prev - rec.price) / prev) * 1000) / 10;
    return '<span class="zp-trend zp-down">▼ ' + faDigits(dn) + '٪</span>';
  }

  // ---------- View 1: برندها ----------
  function normTrim(r) { return String(r.trim || r.name || '').replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function faYearInt(r) {
    return parseInt(String(r.yearLabel || '0').replace(/[^۰-۹0-9]/g, '').replace(/[۰-۹]/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(x); }), 10) || 0;
  }
  function yearRange(recs) {
    var ys = recs.map(faYearInt).filter(Boolean).sort(function (a, b) { return a - b; });
    if (!ys.length) return '';
    return ys[0] === ys[ys.length - 1] ? faDigits(ys[0]) : faDigits(ys[0]) + '–' + faDigits(ys[ys.length - 1]);
  }
  function groupModels(recs) {
    // slug-های موازی با نام نمایشی یکسان (haima-s5/haimas5) ادغام می‌شوند؛ کل = اولین slug
    var byKey = {};
    var order = [];
    recs.forEach(function (r) {
      var m = r.model || r.slug;
      var disp = baseName(r);
      var g = null;
      order.forEach(function (k) { if (byKey[k].disp === disp) g = byKey[k]; });
      if (!g) { g = { key: m, disp: disp, recs: [] }; byKey[m] = g; order.push(m); }
      g.recs.push(r);
    });
    return order.map(function (k) { return byKey[k]; });
  }
  function dedupeTrims(recs) {
    var seen = {};
    var out = [];
    recs.slice().sort(function (a, b) { return a.price - b.price; }).forEach(function (r) {
      var k = normTrim(r) + '|' + (r.yearLabel || '');
      if (!seen[k]) { seen[k] = true; out.push(r); }
    });
    return out;
  }
  function brandCards(records) {
    var groups = {};
    var order = [];
    records.forEach(function (r) {
      var b = canonicalBrand(r.brandName);
      if (!groups[b]) { groups[b] = { models: {}, rows: 0, recs: [] }; order.push(b); }
      groups[b].models[r.model] = true;
      groups[b].rows++;
      groups[b].recs.push(r);
    });
    order.sort(function (a, b) {
      var ia = BRAND_ORDER.indexOf(a), ib = BRAND_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      var da = isIrani(a), db = isIrani(b);
      if (da !== db) return da ? -1 : 1;
      return Object.keys(groups[b].models).length - Object.keys(groups[a].models).length || faStr(a).localeCompare(faStr(b), 'fa');
    });
    var html = '<div class="zp-step-title">برند خودرو را انتخاب کنید</div>' +
      '<input type="search" class="zp-brand-search" id="zpBrandSearch" placeholder="جستجوی برند…" aria-label="جستجوی برند خودرو" autocomplete="off">';
    function searchable(s) {
      return String(s || '').toLowerCase().replace(/\u200c/g, ' ').replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9').replace(/\s+/g, ' ').trim();
    }
    var renderOne = function (b) {
      var g = groups[b];
      var modelCount = groupModels(g.recs).length;
      return '<button type="button" class="zp-brand-card" data-brand="' + esc(b) + '" data-search="' + esc(searchable(b)) + '">' +
        '<span class="zp-brand-watermark" aria-hidden="true">' + CAR_SVG + '</span>' +
        '<span class="zp-brand-name">' + esc(b) + '</span>' +
        '<span class="zp-brand-meta">' + faDigits(modelCount) + ' مدل · ' + faDigits(g.rows) + ' تیپ</span>' +
        '<span class="zp-brand-cta" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></span>' +
        '</button>';
    };
    var irani = order.filter(isIrani), kharej = order.filter(function (b) { return !isIrani(b); });
    if (irani.length) html += '<div class="zp-brand-group"><div class="zp-group-label">برندهای ایرانی</div><div class="zp-brand-cards">' + irani.map(renderOne).join('') + '</div></div>';
    if (kharej.length) html += '<div class="zp-brand-group"><div class="zp-group-label">برندهای خارجی</div><div class="zp-brand-cards">' + kharej.map(renderOne).join('') + '</div></div>';
    return html;
  }
  function faStr(s) { return String(s || ''); }

  // ---------- View 2: مدل‌های یک برند ----------
  function recsForBrand(records, brand) {
    var pool = Array.isArray(records) ? records : state.records;
    return pool.filter(function (r) { return canonicalBrand(r.brandName) === brand; });
  }
  function modelCards(brand, records) {
    var recs = recsForBrand(records, brand);
    var groups = groupModels(recs);
    groups.sort(function (a, b) {
      var pa = Math.min.apply(null, a.recs.map(function (r) { return r.price; }));
      var pb = Math.min.apply(null, b.recs.map(function (r) { return r.price; }));
      return pa - pb;
    });
    var html = breadcrumb(brand) + '<div class="zp-step-title">مدل را انتخاب کنید</div><div class="zp-model-cards">';
    groups.forEach(function (g) {
      var prices = g.recs.map(function (r) { return r.price; });
      var min = Math.min.apply(null, prices);
      var max = Math.max.apply(null, prices);
      var minFa = fmtShort(min);
      var trims = dedupeTrims(g.recs).length;
      html +=
        '<button type="button" class="zp-model-card" data-model="' + esc(g.key) + '">' +
          '<span class="zp-brand-watermark" aria-hidden="true">' + CAR_SVG + '</span>' +
          '<span class="zp-model-name">' + esc(g.disp) + '</span>' +
          '<span class="zp-model-range">' + (min === max ? minFa : 'از ' + minFa + ' تا ' + fmtShort(max)) + ' میلیون تومان</span>' +
          '<span class="zp-model-meta">' + faDigits(trims) + ' تیپ · مدل ' + yearRange(g.recs) + '</span>' +
          '<span class="zp-model-cta" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></span>' +
        '</button>';
    });
    html += '</div>';
    return html;
  }

  function baseName(rec) {
    // نام مدل پایه از اولین رکورد — بدون trim
    var n = rec.name || '';
    var t = rec.trim || '';
    if (t && n.indexOf(t) !== -1) return n.replace(t, '').trim() || n;
    return n.split(' - ')[0].trim() || n;
  }

  function yearsOf(recs) {
    var ys = [];
    recs.forEach(function (r) {
      var y = (r.yearLabel || '').trim();
      if (y && ys.indexOf(y) === -1) ys.push(y);
    });
    return ys.join('، ');
  }

  function fmtShort(price) {
    var m = Math.round(price / 1e6);
    return faDigits(String(m).replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));
  }

  // ---------- View 3: تیپ‌های یک مدل ----------
  function recsForModel(records, model) {
    var pool = Array.isArray(records) ? records : state.records;
    // نام نمایشیِ یکسان = یک مدل (slug موازی هم مثل haima-s5/haimas5) — فقط داخل همان برند
    var target = null, targetBrand = null;
    pool.some(function (r) { if ((r.model || r.slug) === model) { target = baseName(r); targetBrand = canonicalBrand(r.brandName); return true; } return false; });
    var seen = {};
    return pool.filter(function (r) {
      var m = r.model || r.slug;
      if (!m || !target) return false;
      var match = m === model || (baseName(r) === target && canonicalBrand(r.brandName) === targetBrand);
      if (!match) return false;
      var k = m + '|' + normTrim(r) + '|' + (r.yearLabel || '');
      if (seen[k]) return false; seen[k] = 1;
      return true;
    });
  }
  function trimList(model, records) {
    var recs = dedupeTrims(recsForModel(records, model));
    var brand = recs[0] ? canonicalBrand(recs[0].brandName) : '';
    var groups = {};
    var order = [];
    recs.forEach(function (r) {
      var t = normTrim(r);
      if (!groups[t]) { groups[t] = { name: r.trim || r.name, rows: [] }; order.push(t); }
      groups[t].rows.push(r);
    });
    var html = breadcrumb(brand, baseName(recs[0] || {})) +
      '<div class="zp-step-title">تیپ و سال — قیمت‌ها به میلیون تومان</div><div class="zp-trim-list">';
    order.sort(function (a, b) {
      var pa = Math.min.apply(null, groups[a].rows.map(function (r) { return r.price; }));
      var pb = Math.min.apply(null, groups[b].rows.map(function (r) { return r.price; }));
      return pa - pb;
    });
    order.forEach(function (t) {
      var g = groups[t];
      var rows = g.rows.slice().sort(function (a, b) { return faYearInt(b) - faYearInt(a); });
      html +=
        '<div class="zp-trim-group">' +
          '<div class="zp-trim-row zp-trim-head">' +
            '<div class="zp-trim-main"><span class="zp-trim-name">' + esc(g.name) + '</span>' +
            (rows.length > 1 ? '<span class="zp-trim-year">' + faDigits(rows.length) + ' مدل سال</span>' : '') + '</div>' +
            (rows.length > 1 ? '<div class="zp-trim-side"><span class="zp-trim-price">' + (function () {
              var ps = rows.map(function (r) { return r.price; });
              var lo = Math.min.apply(null, ps), hi = Math.max.apply(null, ps);
              return (lo === hi ? fmtShort(lo) : fmtShort(lo) + ' تا ' + fmtShort(hi)) + '<span class="zp-trim-unit">م.ت</span>';
            })() + '</span></div>' : '') +
          '</div>' +
          (rows.map(function (r) {
            return '<div class="zp-trim-row zp-trim-sub">' +
              '<div class="zp-trim-main"><span class="zp-trim-year">مدل ' + esc(r.yearLabel || '') + '</span></div>' +
              '<div class="zp-trim-side"><span class="zp-trim-price">' + fmtShort(r.price) + '<span class="zp-trim-unit">م.ت</span></span>' + trendHtml(r) + '</div>' +
            '</div>';
          }).join('')) +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function breadcrumb(brand, model) {
    var html = '<nav class="zp-breadcrumb" aria-label="مسیر انتخاب">' +
      '<button type="button" class="zp-crumb" data-crumb="brands">برندها</button>';
    if (brand) {
      html += '<span class="zp-crumb-sep" aria-hidden="true">›</span>' +
        '<button type="button" class="zp-crumb" data-crumb="models" data-brand="' + esc(brand) + '">' + esc(brand) + '</button>';
    }
    if (model) {
      html += '<span class="zp-crumb-sep" aria-hidden="true">›</span>' +
        '<span class="zp-crumb-current">' + esc(model) + '</span>';
    }
    html += '</nav>';
    return html;
  }

  // ---------- Router ----------
  function render() {
    var grid = el('zeroPricesBrands');
    if (!grid) return;
    if (VIEW === 'brands') {
      grid.innerHTML = brandCards(state.records);
      var head = document.querySelector('.zero-prices-section .section-head-minimal');
      // شمارنده = تعداد کل تیپ‌ها
      var count = el('zeroPricesCount');
      if (count) count.textContent = faDigits(state.records.length);
    } else if (VIEW === 'models') {
      grid.innerHTML = modelCards(state.brand);
    } else if (VIEW === 'trims') {
      grid.innerHTML = trimList(state.model);
    }
    var updated = el('zeroPricesUpdated');
    var freshest = state.records.reduce(function (acc, r) {
      return (!acc || (r.fetchedAt && r.fetchedAt > acc)) ? (r.fetchedAt || acc) : acc;
    }, '');
    if (updated && freshest) updated.textContent = faDate(freshest);
  }

  function go(view, brand, model) {
    VIEW = view;
    state.brand = brand || null;
    state.model = model || null;
    render();
    var section = el('zero-prices');
    if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  function onGridClick(e) {
    var brandBtn = e.target.closest ? e.target.closest('.zp-brand-card') : null;
    if (brandBtn) { go('models', brandBtn.dataset.brand); return; }
    var modelBtn = e.target.closest ? e.target.closest('.zp-model-card') : null;
    if (modelBtn) { go('trims', state.brand, modelBtn.dataset.model); return; }
    var crumb = e.target.closest ? e.target.closest('.zp-crumb[data-crumb]') : null;
    if (crumb) {
      var c = crumb.dataset.crumb;
      if (c === 'brands') go('brands');
      else if (c === 'models') go('models', crumb.dataset.brand || state.brand);
    }
  }

  function onBrandSearch(e) {
    var q = searchableToken(e.target.value);
    document.querySelectorAll('#zeroPricesBrands .zp-brand-card').forEach(function (c) {
      c.hidden = !!q && (c.getAttribute('data-search') || '').indexOf(q) === -1;
    });
    document.querySelectorAll('#zeroPricesBrands .zp-brand-group').forEach(function (g) {
      var any = [].slice.call(g.querySelectorAll('.zp-brand-card')).some(function (c) { return !c.hidden; });
      g.hidden = !any;
    });
  }
  function searchableToken(s) {
    return String(s || '').toLowerCase().replace(/\u200c/g, ' ').replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9').replace(/\s+/g, ' ').trim();
  }

  function init() {
    var grid = el('zeroPricesBrands');
    if (!grid) return;
    grid.addEventListener('click', onGridClick);
    grid.addEventListener('input', function (e) { if (e.target.classList.contains('zp-brand-search')) onBrandSearch(e); });
    if (window.zeroPrices && window.zeroPrices.length) {
      state.records = domesticOnly(window.zeroPrices);
      render();
      return;
    }
    var s = document.createElement('script');
    s.src = 'js/data/zero-prices.js?v=20260918y';
    s.onload = function () { state.records = domesticOnly(window.zeroPrices); render(); };
    s.onerror = function () { grid.innerHTML = '<p class="zp-error">قیمت‌ها موقتاً در دسترس نیست.</p>'; };
    (document.head || document.body).appendChild(s);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  if (typeof window !== 'undefined') {
    window.NovinZeroPrices = {
      render: render, go: go,
      brandCards: brandCards, modelCards: modelCards, trimList: trimList,
      faDate: faDate, domesticOnly: domesticOnly
    };
  }
})();
