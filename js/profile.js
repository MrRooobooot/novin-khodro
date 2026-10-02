/**
 * صفحه پروفایل خودرو — hash-routed (فاز ۲)
 * مسیر: #profile/<slug> — دیتا از js/data/ikco-catalog.js (lazy توسط IkcoBridge.ensure)
 * مستقل از app.js؛ فقط از IkcoBridge (normalize/ensure/toPersianDigits) استفاده می‌کند.
 */
(function () {
  'use strict';

  const ROUTE_RE = /^profile\/([a-z0-9-]+)$/;
  const HOME_TITLE = 'نمایشگاه نوین خودرو | خرید از شما، اقساط از ما';
  // عنوان صفحهٔ میزبان — در index.html = عنوان فروشگاه، در encyclopedia.html = عنوان همان صفحه.
  // بدون این، بستن پروفایل عنوان صفحهٔ دانشنامه را با عنوان فروشگاه بازنویسی می‌کرد (SEO).
  const PAGE_TITLE = (typeof document !== 'undefined' && document.title) ? document.title : HOME_TITLE;

  // ---------- ابزار ----------

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fa(v) { return bridge().toPersianDigits(v); }

  /** «10/4» (کسر با اسلش مبدا) → «۱۰٫۴» فارسی؛ مقادیر دیگر دست‌نخورده */
  function faDecimal(v) {
    const s = String(v == null ? '' : v).trim();
    const m = s.match(/^(\d+)\/(\d+)$/);
    if (m) return fa(m[1]) + '٫' + fa(m[2]);
    return bridge().toPersianDigits(s);
  }

  /** مقدار spec: اعشار با اسلش فقط برای مصرف سوخت/انرژی/شارژ فارسی می‌شود */
  function formatSpecValue(key, value) {
    const isRatioKey = /مصرف|سیکل|شایب|شتاب|ظرفیت باتری|شارژ/.test(key);
    if (isRatioKey && /^\d+\/\d+$/.test(String(value).trim())) return faDecimal(value);
    return bridge().toPersianDigits(value);
  }

  /** پارامترهای گروه‌بندی مشخصات (اسلش ممیز IKCO فقط در مصرف سوخت اعشار است) */
  function specGroup(key) {
    if (/موتور|سوپاپ|انژکتوری|سوخت (خودرو)?$|نوع سوخت/.test(key) && !/مصرف/.test(key)) return 'powertrain';
    if (/مصرف سوخت|مصرف انرژی/.test(key)) return 'consumption';
    if (/انتقال قدرت|گیربکس/.test(key)) return 'transmission';
    if (/شتاب|حداکثر سرعت|شیب روی/.test(key)) return 'performance';
    if (/طول|عرض|ارتفاع|فاصله بین دو محور|وزن|بار مجاز|ظرفیت حمل بار|صندوق/.test(key)) return 'dimensions';
    if (/باتری|شارژ/.test(key)) return 'battery';
    return 'other';
  }

  const SPEC_GROUP_LABELS = {
    powertrain: 'پیشرانه',
    transmission: 'انتقال قدرت',
    consumption: 'مصرف سوخت و انرژی',
    performance: 'عملکرد',
    dimensions: 'ابعاد و وزن',
    battery: 'باتری و شارژ',
    other: 'سایر مشخصات',
  };
  const SPEC_GROUP_ORDER = ['powertrain', 'transmission', 'performance', 'consumption', 'dimensions', 'battery', 'other'];

  /** استخراج اعداد طلایی strip: توان (hp) / گشتاور (Nm) / شتاب / مصرف ترکیبی */
  function extractHighlights(rec) {
    const specs = rec.techSpecs || {};
    const items = [];
    const hp = findSpec(specs, /حداکثر توان موتور/);
    if (hp) items.push({ icon: 'bolt', value: fa(String(hp).replace(/\s*اسب بخار.*$/, '')), unit: 'اسب بخار', label: 'حداکثر توان' });
    const nm = findSpec(specs, /حداکثر گشتاور/);
    if (nm) items.push({ icon: 'gear', value: fa(String(nm).replace(/\s*نیوتون متر.*$/, '')), unit: 'نیوتون‌متر', label: 'حداکثر گشتاور' });
    const acc = findSpec(specs, /شتاب/);
    if (acc) items.push({ icon: 'timer', value: faDecimal(acc), unit: 'ثانیه', label: 'شتاب ۰ تا ۱۰۰' });
    const fuel = findSpec(specs, /مصرف سوخت ترکیبی|مصرف انرژی/);
    if (fuel) items.push({ icon: 'fuel', value: faDecimal(fuel), unit: 'لیتر/۱۰۰ کیلومتر', label: 'مصرف' });
    return items.slice(0, 4);
  }

  function findSpec(specs, re) {
    const key = Object.keys(specs).find((k) => re.test(k));
    return key ? String(specs[key]) : null;
  }

  function bridge() {
    return (typeof window !== 'undefined' && window.IkcoBridge) || {
      ensure: () => Promise.resolve([]),
      toPersianDigits: (v) => String(v),
      normalizeName: (s) => String(s || ''),
      matchCatalogName: () => null,
    };
  }

  /**
   * مسیر asset: دیتا همیشه با پیشوند production (`assets/ikco/`) تولید می‌شود.
   * پوشهٔ `assets-out/ikco/` فقط روی ماشین توسعه‌دهنده وجود دارد و **هرگز روی VPS نیست**،
   * پس بازنویسی مسیر فقط روی localhost مجاز است — وگرنه پروفایل هر بازدیدکننده
   * صدها درخواست ۴۰۴ روی `/assets-out/...` می‌سازد (R73).
   */
  const LOCAL_ASSETS = (function () {
    const h = (typeof location !== 'undefined' && location && location.hostname) || '';
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(h);
  })();

  function altSrc(src) {
    if (!src) return '';
    if (!LOCAL_ASSETS) return String(src);
    return String(src).replace(/^assets\/ikco\//, 'assets-out/ikco/');
  }

  function imgFallback(src, alt, cls, attrs) {
    const base = 'data:image/svg+xml;base64,' + btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#101A2E"/></svg>'
    );
    return '<img src="' + esc(src) + '" alt="' + esc(alt) + '" class="' + cls + '" ' + (attrs || '') +
      ' onerror="this.onerror=null;this.src=\'' + base + '\';" ' +
      'data-alt-src="' + esc(altSrc(src)) + '">';
  }

  /** اجرای fallback دوم پس از تزریق: اگر src لود نشد و alt-src موجود، سوییچ شود */
  function attachAltSrcFallbacks(rootEl) {
    rootEl.querySelectorAll('img[data-alt-src]').forEach((img) => {
      img.addEventListener('error', function handler() {
        const alt = img.getAttribute('data-alt-src');
        if (alt && img.src !== alt && img.src.indexOf('assets-out') === -1) {
          img.removeEventListener('error', handler);
          img.src = alt;
        }
      });
    });
  }

  // ---------- ساخت HTML بخش‌ها ----------

  const ICONS = {
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/>',
    fuel: '<line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/>',
    rotate: '<path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v6h-6"/>',
    back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  };

  function iconSvg(name, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" fill="none" viewBox="0 0 24 24" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONS[name] || '') + '</svg>';
  }

  function heroHtml(rec) {
    return (
      '<figure class="ikco-hero">' +
      imgFallback(rec.image, 'تصویر ' + rec.name, 'ikco-hero-img', 'width="800" height="500" decoding="async"') +
      '</figure>'
    );
  }

  function stripHtml(rec) {
    const items = extractHighlights(rec);
    if (!items.length) return '';
    return (
      '<div class="ikco-spec-strip" role="list" aria-label="مشخصات کلیدی">' +
      items.map((it) =>
        '<div class="ikco-strip-item" role="listitem">' +
        '<span class="ikco-strip-icon" aria-hidden="true">' + iconSvg(it.icon, 18) + '</span>' +
        '<div class="ikco-strip-body"><strong class="ikco-strip-val">' + esc(it.value) + '</strong>' +
        '<span class="ikco-strip-unit">' + esc(it.unit) + '</span>' +
        '<span class="ikco-strip-label">' + esc(it.label) + '</span></div>' +
        '</div>'
      ).join('') +
      '</div>'
    );
  }

  const TABS = [
    ['overview', 'معرفی'],
    ['specs', 'مشخصات فنی'],
    ['features', 'تجهیزات'],
    ['gallery', 'گالری'],
    ['documents', 'کاتالوگ و راهنما'],
    ['tour360', 'نمای ۳۶۰'],
  ];

  function tabsHtml(rec, withTour) {
    const tabs = withTour ? TABS : TABS.slice(0, 5);
    return (
      '<div class="ikco-tabs" role="tablist" aria-label="بخش‌های پروفایل خودرو">' +
      tabs.map(([id, label], i) =>
        '<button type="button" class="ikco-tab' + (i === 0 ? ' active' : '') + '" role="tab" ' +
        'id="ikco-tab-' + id + '" aria-selected="' + (i === 0 ? 'true' : 'false') + '" ' +
        'aria-controls="ikco-panel-' + id + '" data-tab="' + id + '" tabindex="' + (i === 0 ? '0' : '-1') + '">' +
        label + '</button>'
      ).join('') +
      '</div>'
    );
  }

  function panelsShellHtml(rec, withTour) {
    const ids = withTour ? TABS.map((t) => t[0]) : TABS.slice(0, 5).map((t) => t[0]);
    return ids.map((id, i) =>
      '<section class="ikco-panel' + (i === 0 ? ' active' : '') + '" id="ikco-panel-' + id + '" role="tabpanel" ' +
      'aria-labelledby="ikco-tab-' + id + '"' + (i === 0 ? '' : ' hidden data-ikco-lazy="1"') + '></section>'
    ).join('');
  }

  function panelOverview(rec) {
    let html = '<div class="ikco-panel-inner">';
    if (rec.description) {
      html += '<p class="ikco-overview-text">' + esc(rec.description).replace(/\n+/g, '<br>') + '</p>';
    }
    if (Array.isArray(rec.variants) && rec.variants.length) {
      html += '<h4 class="ikco-sub-heading">تیپ‌ها و گیربکس‌ها</h4><div class="ikco-variant-chips">';
      rec.variants.forEach((v) => { html += '<span class="ikco-variant-chip">' + esc(v.name) + '</span>'; });
      html += '</div>';
    }
    if (rec.videoUrl) {
      html +=
        '<div class="ikco-video-box">' +
        '<iframe src="' + esc(aparatEmbed(rec.videoUrl)) + '" title="ویدیوی معرفی ' + esc(rec.name) + '" loading="lazy" ' +
        'allowfullscreen referrerpolicy="no-referrer"></iframe>' +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  /** https://www.aparat.com/v/HASH → https://www.aparat.com/video/video/embed/videohash/HASH/vt/frame */
  function aparatEmbed(url) {
    const m = String(url || '').match(/aparat\.com\/v\/([A-Za-z0-9]+)/);
    return m ? 'https://www.aparat.com/video/video/embed/videohash/' + m[1] + '/vt/frame' : String(url || '');
  }

  function panelSpecs(rec) {
    const specs = rec.techSpecs || {};
    const groups = {};
    Object.keys(specs).forEach((k) => {
      const g = specGroup(k);
      (groups[g] = groups[g] || []).push([k, specs[k]]);
    });
    let html = '<div class="ikco-panel-inner"><table class="ikco-spec-table"><caption class="sr-only">' +
      'جدول مشخصات فنی ' + esc(rec.name) + '</caption>';
    SPEC_GROUP_ORDER.forEach((g) => {
      if (!groups[g]) return;
      html += '<tbody class="ikco-spec-group"><tr class="ikco-spec-group-head"><th colspan="2" scope="rowgroup">' +
        esc(SPEC_GROUP_LABELS[g]) + '</th></tr>';
      groups[g].forEach(([k, v]) => {
        html += '<tr><th scope="row" class="ikco-spec-key">' + esc(k) + '</th>' +
          '<td class="ikco-spec-val" dir="auto">' + esc(formatSpecValue(k, v)) + '</td></tr>';
      });
      html += '</tbody>';
    });
    html += '</table><p class="ikco-last-updated">آخرین بروزرسانی کارخانه: ' + esc(rec.lastUpdated || '') + '</p></div>';
    return html;
  }

  function panelFeatures(rec) {
    if (!Array.isArray(rec.features) || !rec.features.length) {
      return '<div class="ikco-panel-inner"><p class="ikco-empty-note">فهرست تجهیزات این خودرو ثبت نشده است.</p></div>';
    }
    let html = '<div class="ikco-panel-inner"><ul class="ikco-feature-list">';
    rec.features.forEach((f) => {
      html += '<li class="ikco-feature-item">' +
        '<span class="ikco-feature-icon" aria-hidden="true">' + iconSvg('check', 16) + '</span>' +
        '<span>' + esc(f) + '</span></li>';
    });
    html += '</ul></div>';
    return html;
  }

  function panelGalleryHtml(rec) {
    const main = rec.gallery && rec.gallery[0] ? rec.gallery[0] : rec.image;
    let html = '<div class="ikco-panel-inner">' +
      '<figure class="ikco-gallery-main">' + imgFallback(main, 'گالری ' + rec.name, 'ikco-gallery-img', 'width="800" height="500" decoding="async"') + '</figure>';
    if (Array.isArray(rec.gallery) && rec.gallery.length) {
      html += '<div class="ikco-gallery-thumbs" role="list" aria-label="بندانگشتی‌های گالری">';
      rec.gallery.forEach((img, i) => {
        html += '<button type="button" class="ikco-thumb' + (i === 0 ? ' active' : '') + '" role="listitem" ' +
          'data-full="' + esc(img) + '" aria-label="تصویر ' + fa(i + 1) + ' از ' + fa(rec.gallery.length) + '">' +
          '<img src="' + esc(altSrc(img)) + '" alt="" width="96" height="64" loading="lazy" decoding="async">' +
          '</button>';
      });
      html += '</div>';
      html += '<button type="button" class="ikco-lightbox-trigger" data-full="' + esc(main) + '">' +
        iconSvg('camera', 16) + ' نمایش بزرگ‌تر (lightbox)</button>';
    }
    html += '</div>';
    return html;
  }

  function panelDocuments(rec) {
    const docs = Array.isArray(rec.documents) ? rec.documents : [];
    if (!docs.length) {
      return '<div class="ikco-panel-inner"><p class="ikco-empty-note">مدارک قابل دانلودی برای این خودرو ثبت نشده است.</p></div>';
    }
    let html = '<div class="ikco-panel-inner"><ul class="ikco-doc-list">';
    docs.forEach((d) => {
      const href = altSrc(d.file);
      html += '<li class="ikco-doc-item">' +
        '<a class="ikco-doc-btn" href="' + esc(href) + '" download ' +
        'aria-label="دانلود ' + esc(d.label || 'سند') + ' ' + esc(rec.name) + '">' +
        '<span class="ikco-doc-icon" aria-hidden="true">' + iconSvg('pdf', 18) + '</span>' +
        '<span class="ikco-doc-label">' + esc(d.label || 'سند') + '</span>' +
        '<span class="ikco-doc-name" dir="auto">' + esc(String(d.file).split('/').pop()) + '</span>' +
        '</a></li>';
    });
    html += '</ul></div>';
    return html;
  }

  function panelTourHtml(rec) {
    const slugs = ['interior-0', 'interior-1'];
    let html = '<div class="ikco-panel-inner"><p class="ikco-tour-hint">' +
      '<span class="ikco-tour-icon" aria-hidden="true">' + iconSvg('rotate', 16) + '</span> ' +
      'برای چرخاندن نمای داخلی، بکشید (drag).</p>';
    slugs.forEach((name) => {
      html +=
        '<div class="ikco-pano" data-pano role="application" tabindex="0" ' +
        'aria-label="نمای ۳۶۰ درجه ' + esc(rec.name) + ' — ' + (name === 'interior-0' ? 'داخل' : 'داخل دوم') + '" ' +
        'data-pano-prefix="' + esc('assets/ikco/' + rec.slug + '/tour-360/' + name) + '">' +
        '<div class="ikco-pano-surface"></div>' +
        '<span class="ikco-pano-badge">۳۶۰°</span>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildProfileHtml(rec) {
    const withTour = rec.tour360 === true;
    return (
      '<div class="ikco-profile-head">' +
      '<a class="ikco-back-btn" href="#" data-ikco-back aria-label="بازگشت به کاتالوگ فروش">' +
      iconSvg('back', 18) + ' بازگشت</a>' +
      '<div class="ikco-title-wrap">' +
      '<h2 class="ikco-title">' + esc(rec.name) + '</h2>' +
      '<span class="ikco-encyclopedia-tag">دانشنامهٔ ایران‌خودرو</span>' +
      '</div>' +
      '<span class="ikco-updated">بروزرسانی: ' + esc(rec.lastUpdated || '') + '</span>' +
      '</div>' +
      heroHtml(rec) +
      stripHtml(rec) +
      tabsHtml(rec, withTour) +
      '<div class="ikco-panels">' + panelsShellHtml(rec, withTour) + '</div>'
    );
  }

  // ---------- پانورامای CSS-drag (بدون dependency) ----------

  /**
   * probe منبع تصویر پانوراما: **اول مسیر production** (`assets/ikco/...`)،
   * و فقط اگر آن شکست خورد fallback لوکال (`assets-out/ikco/...` — فقط روی localhost).
   * قبلاً مسیر لوکال بی‌قید اول probe می‌شد → روی VPS همیشه ۴۰۴ و نمایش پیام
   * «پیش‌نمایش ۳۶۰ در دسترس نیست» با وجود موجود بودن فایل (R73).
   */
  function probeImage(prefix, probe, ok, fail) {
    const prod = prefix + '/' + probe;
    const dev = altSrc(prod);
    const trySrc = (src, isLast) => {
      const img = new Image();
      img.onload = () => ok(src);
      img.onerror = () => {
        if (!isLast && dev !== prod) trySrc(dev, true);
        else fail();
      };
      img.src = src;
    };
    trySrc(prod, dev === prod);
  }

  function setupPano(container) {
    const prefix = container.getAttribute('data-pano-prefix');
    const surface = container.querySelector('.ikco-pano-surface');
    if (!prefix || !surface) return;
    let x = 0;
    // منبع نهایی تصویر پس از probe تعیین می‌شود (production یا fallback لوکال)
    let panoSrc = prefix + '/preview.jpg';
    let dragging = false;
    let startX = 0;
    let startOffset = 0;
    let velocity = 0;
    let rafId = null;

    const apply = () => {
      surface.style.backgroundImage = 'url("' + panoSrc + '")';
      surface.style.backgroundSize = 'auto 100%';
      surface.style.backgroundPositionX = x + 'px';
    };
    const stopInertia = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } };
    const inertia = () => {
      if (Math.abs(velocity) < 0.05) { rafId = null; return; }
      x += velocity;
      velocity *= 0.94;
      apply();
      rafId = requestAnimationFrame(inertia);
    };
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onDown = (ev) => {
      dragging = true;
      startX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      startOffset = x;
      velocity = 0;
      stopInertia();
      container.classList.add('dragging');
    };
    const onMove = (ev) => {
      if (!dragging) return;
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const dx = cx - startX;
      velocity = dx - (x - startOffset);
      x = startOffset + dx;
      apply();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      container.classList.remove('dragging');
      if (!reduced && Math.abs(velocity) > 0.05 && !rafId) rafId = requestAnimationFrame(inertia);
    };

    container.addEventListener('pointerdown', (e) => { onDown(e); container.setPointerCapture && container.setPointerCapture(e.pointerId); });
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUp);
    container.addEventListener('pointercancel', onUp);
    container.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 120 : 40;
      if (e.key === 'ArrowRight') { e.preventDefault(); x += step; apply(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); x -= step; apply(); }
    });

    // مسیر production اول؛ fallback لوکال فقط روی localhost (R73)
    probeImage(prefix, 'preview.jpg', (winningSrc) => {
      panoSrc = winningSrc || panoSrc;
      apply();
    }, () => {
      surface.setAttribute('data-pano-error', '1');
      surface.textContent = 'پیش‌نمایش ۳۶۰ در این محیط در دسترس نیست.';
    });
  }

  // ---------- Lightbox ----------

  let lightbox = null;

  function openLightbox(src, alt, gallery, index) {
    closeLightbox();
    lightbox = document.createElement('div');
    lightbox.className = 'ikco-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', alt || 'نمایش تصویر');
    lightbox.innerHTML =
      '<button type="button" class="ikco-lightbox-close" aria-label="بستن">×</button>' +
      (gallery && gallery.length > 1
        ? '<button type="button" class="ikco-lightbox-prev" aria-label="تصویر قبلی">‹</button>' +
          '<button type="button" class="ikco-lightbox-next" aria-label="تصویر بعدی">›</button>'
        : '') +
      '<img class="ikco-lightbox-img" src="' + esc(altSrc(src)) + '" alt="' + esc(alt || '') + '">';
    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';

    let idx = index || 0;
    const img = lightbox.querySelector('.ikco-lightbox-img');
    const show = (i) => {
      if (!gallery || !gallery.length) return;
      idx = (i + gallery.length) % gallery.length;
      img.src = altSrc(gallery[idx]);
    };
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
      if (e.target.classList.contains('ikco-lightbox-prev')) show(idx - 1);
      if (e.target.classList.contains('ikco-lightbox-next')) show(idx + 1);
    });
    lightbox.querySelector('.ikco-lightbox-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(idx + 1);       // RTL: چپ = بعدی
      if (e.key === 'ArrowRight') show(idx - 1);
      if (e.key === 'Escape') closeLightbox();
    });
    const focusable = lightbox.querySelector('.ikco-lightbox-close');
    if (focusable) focusable.focus();
  }

  function closeLightbox() {
    if (lightbox) {
      lightbox.remove();
      lightbox = null;
      document.body.style.overflow = '';
    }
  }

  // ---------- تعامل tabها ----------

  function activateTab(container, tabId) {
    const tabs = container.querySelectorAll('.ikco-tab');
    const panels = container.querySelectorAll('.ikco-panel');
    tabs.forEach((t) => {
      const on = t.getAttribute('data-tab') === tabId;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.setAttribute('tabindex', on ? '0' : '-1');
    });
    panels.forEach((p) => {
      const on = p.id === 'ikco-panel-' + tabId;
      p.classList.toggle('active', on);
      p.hidden = !on;
    });
  }

  // ---------- رندر کل صفحه ----------

  function renderProfile(rec) {
    const page = el('profilePage');
    if (!page) return;
    page.innerHTML = buildProfileHtml(rec);
    page.hidden = false;
    // SPA-like: پنهان‌کردن محتوای اصلی سایت هنگام نمایش پروفایل
    const main = document.getElementById('main-content');
    if (main) main.hidden = true;
    document.title = 'پروفایل کامل ' + rec.name + ' | نوین خودرو';

    // پر کردن پنل‌های lazy (غیر فعال)
    const panelFillers = {
      overview: panelOverview,
      specs: panelSpecs,
      features: panelFeatures,
      gallery: panelGalleryHtml,
      documents: panelDocuments,
      tour360: panelTourHtml,
    };
    page.querySelectorAll('.ikco-panel').forEach((panel) => {
      const id = panel.id.replace('ikco-panel-', '');
      if (typeof panelFillers[id] === 'function') panel.innerHTML = panelFillers[id](rec);
    });

    // گالری: تعویض تصویر اصلی با thumb
    const mainFig = page.querySelector('.ikco-gallery-main');
    page.querySelectorAll('.ikco-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        page.querySelectorAll('.ikco-thumb').forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');
        if (mainFig) mainFig.innerHTML = imgFallback(thumb.getAttribute('data-full'), 'گالری ' + rec.name, 'ikco-gallery-img', 'width="800" height="500" decoding="async"');
      });
    });

    // lightbox
    const galleryList = Array.isArray(rec.gallery) ? rec.gallery : [];
    page.querySelectorAll('.ikco-lightbox-trigger').forEach((btn) => {
      btn.addEventListener('click', () => openLightbox(btn.getAttribute('data-full'), rec.name, galleryList, 0));
    });
    page.querySelectorAll('.ikco-thumb').forEach((thumb, i) => {
      thumb.addEventListener('dblclick', () => openLightbox(thumb.getAttribute('data-full'), rec.name, galleryList, i));
    });

    // tabها
    page.querySelectorAll('.ikco-tab').forEach((tab) => {
      tab.addEventListener('click', () => activateTab(page, tab.getAttribute('data-tab')));
      tab.addEventListener('keydown', (e) => {
        const tabs = Array.prototype.slice.call(page.querySelectorAll('.ikco-tab'));
        const i = tabs.indexOf(tab);
        if (e.key === 'ArrowLeft') { e.preventDefault(); const n = tabs[(i + 1) % tabs.length]; activateTab(page, n.getAttribute('data-tab')); n.focus(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); const n = tabs[(i - 1 + tabs.length) % tabs.length]; activateTab(page, n.getAttribute('data-tab')); n.focus(); }
      });
    });

    // پانوراماها
    page.querySelectorAll('[data-pano]').forEach((p) => setupPano(p));

    // fallback مسیر asset
    attachAltSrcFallbacks(page);
    // اسکرول به بالای پروفایل (نه بالای سایت)
    page.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  function hideProfile() {
    const page = el('profilePage');
    if (page) page.hidden = true;
    // بازگرداندن محتوای اصلی سایت
    const main = document.getElementById('main-content');
    if (main) main.hidden = false;
    document.title = PAGE_TITLE;
  }

  function showNotFound(slug) {
    const page = el('profilePage');
    if (!page) return;
    page.hidden = false;
    const main = document.getElementById('main-content');
    if (main) main.hidden = true;
    page.innerHTML =
      '<div class="ikco-profile-head"><h2 class="ikco-title">پروفایل یافت نشد</h2></div>' +
      '<p class="ikco-empty-note">پروفایلی با شناسه «' + esc(slug) + '» در دانشنامهٔ ایران‌خودرو ثبت نشده است.</p>' +
      '<a class="ikco-back-btn" href="#" data-ikco-back>بازگشت</a>';
    document.title = 'پروفایل یافت نشد | نوین خودرو';
  }

  // ---------- روتر ----------

  function currentSlug() {
    const h = (window.location && window.location.hash) || '';
    const m = h.replace(/^#\/?/, '').match(ROUTE_RE);
    return m ? m[1] : null;
  }

  function renderRoute() {
    const slug = currentSlug();
    if (!slug) { hideProfile(); return; }
    bridge().ensure().then((catalog) => {
      const rec = (catalog || []).find((r) => r.slug === slug);
      if (!rec) { showNotFound(slug); return; }
      renderProfile(rec);
    });
  }

  function ensureShell() {
    if (el('profilePage')) return;
    const shell = document.createElement('main');
    shell.id = 'profilePage';
    shell.className = 'ikco-profile-page';
    shell.hidden = true;
    shell.setAttribute('aria-label', 'پروفایل کامل خودرو');
    document.body.appendChild(shell);
  }

  // ---------- bootstrap ----------

  function init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    ensureShell();

    // دکمهٔ بازگشت: پاک‌کردن hash (history.back هم hashchange را پوشش می‌دهد)
    document.addEventListener('click', (e) => {
      const back = e.target.closest ? e.target.closest('[data-ikco-back]') : null;
      if (!back) return;
      e.preventDefault();
      if (window.history && window.history.length > 1) window.history.back();
      else if (window.location) window.location.hash = '';
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', renderRoute);
    }
    renderRoute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // API محدود برای تست
  window.NovinProfile = { renderRoute, currentSlug, specGroup, faDecimal, formatSpecValue, aparatEmbed };
})();
