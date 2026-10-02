/**
 * دانشنامه خودروها — گرید ۳۷ مدل ایران‌خودرو (فاز ۲.۵)
 * رندر استاتیک از js/data/ikco-catalog.js (lazy) داخل سکشن #auto-encyclopedia
 * کلیک → صفحه پروفایل hash-routed (#profile/<slug>)
 */
(function () {
  'use strict';

  var BRIDGE_READY = false;

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fa(n) {
    if (window.IkcoBridge) return window.IkcoBridge.toPersianDigits(n);
    return String(n);
  }

  /** مسیر asset: دیتا با پیشوند assets/ikco تولید شده؛ fallback به assets-out فقط روی localhost (R73) */
  const LOCAL_ASSETS = (function () {
    const h = (typeof location !== 'undefined' && location && location.hostname) || '';
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(h);
  })();

  function altSrc(src) {
    if (!src) return '';
    if (!LOCAL_ASSETS) return String(src);
    return String(src).replace(/^assets\/ikco\//, 'assets-out/ikco/');
  }

  function engineOneLiner(rec) {
    var es = rec.engineSummary || '';
    var gb = rec.gearbox || '';
    if (es && gb) return es + ' | ' + gb;
    return es || gb || 'مشخصات فنی کامل';
  }

  function cardHtml(rec) {
    return (
      '<a class="ency-card" href="#profile/' + esc(rec.slug) + '" aria-label="مشاهده پروفایل کامل ' + esc(rec.name) + '">' +
        '<span class="ency-card-media">' +
          '<img src="' + esc(rec.image) + '" alt="' + esc(rec.name) + '" width="320" height="200" loading="lazy" decoding="async"' +
            ' data-alt-src="' + esc(altSrc(rec.image)) + '"' +
            ' onerror="this.onerror=null;this.src=this.getAttribute(\'data-alt-src\')||this.src">' +
        '</span>' +
        '<span class="ency-card-body">' +
          '<span class="ency-card-name">' + esc(rec.name) + '</span>' +
          '<span class="ency-card-specs">' + esc(engineOneLiner(rec)) + '</span>' +
        '</span>' +
        '<span class="ency-card-cta" aria-hidden="true">' +
          'پروفایل کامل' +
          '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>' +
        '</span>' +
      '</a>'
    );
  }

  function render(catalog) {
    var grid = el('encyGrid');
    if (!grid || !Array.isArray(catalog)) return;
    var html = '';
    catalog.forEach(function (rec) { html += cardHtml(rec); });
    grid.innerHTML = html;
    // کارت‌های رندرشدهٔ async باید به آبزرور reveal اضافه شوند (وگرنه opacity:0 می‌مانند)
    if (window.NovinReveal) window.NovinReveal();
    var count = el('encyCount');
    if (count) count.textContent = fa(catalog.length);
  }

  function init() {
    var grid = el('encyGrid');
    if (!grid) return;
    if (window.IkcoBridge && window.IkcoBridge.ensure) {
      BRIDGE_READY = true;
      window.IkcoBridge.ensure().then(render);
    } else {
      // bridge نیست (ترتیب اسکریپت خراب) — یک‌بار تلاش با event
      document.addEventListener('DOMContentLoaded', function () {
        if (window.IkcoBridge && window.IkcoBridge.ensure) window.IkcoBridge.ensure().then(render);
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // API برای تست
  if (typeof window !== 'undefined') {
    window.NovinEncyclopedia = { render: render, cardHtml: cardHtml };
  }
})();
