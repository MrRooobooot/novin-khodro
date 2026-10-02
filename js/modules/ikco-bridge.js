/**
 * پل اتصال کاتالوگ ایران‌خودرو (ikco-catalog.js) به کاتالوگ فروش سایت
 * - lazy-load دیتای کاتالوگ (تزریق یک‌بارهٔ اسکریپت، غیرمسدودکننده)
 * - تطبیق نام‌محور نرمال‌شدهٔ عنوان inventory با نام پروفایل‌ها (بدون تغییر cars-data.js)
 * - افزودن دکمهٔ «پروفایل کامل» روی کارت خودروهای دارای پروفایل
 */
(function () {
  'use strict';

  const CATALOG_SRC = 'js/data/ikco-catalog.js?v=20260918y'; // R72: بدون ?v= با کش ۳۰روزهٔ nginx کهنه می‌شد
  const ASSET_PREFIXES = ['assets/ikco', 'assets-out/ikco'];

  let loadPromise = null;

  /** بارگذاری یک‌بارهٔ دیتای کاتالوگ — همیشه Promise.resolve حتی در غیاب DOM/شبکه */
  function ensure() {
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        resolve([]);
        return;
      }
      if (window.ikcoCatalog && window.ikcoCatalog.length) {
        resolve(window.ikcoCatalog);
        return;
      }
      const s = document.createElement('script');
      s.src = CATALOG_SRC;
      s.defer = true;
      s.onload = () => resolve(window.ikcoCatalog || []);
      s.onerror = () => resolve([]);
      (document.head || document.body).appendChild(s);
    });
    return loadPromise;
  }

  /** تبدیل ارقام فارسی/عربی به ASCII */
  function toAsciiDigits(str) {
    return String(str)
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  }

  /** نرمال‌سازی نام برای تطبیق نویسه/ارقام/فاصله */
  function normalizeName(str) {
    if (!str) return '';
    return toAsciiDigits(String(str))
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      // «207i» لاتین ↔ «۲۰۷ی» فارسی: i لاتین بین/بعد از رقم → ی
      .replace(/i/g, 'ی')
      .replace(/[\u200c\u064b-\u0652]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * تطبیق نام خودروی inventory با پروفایل‌های کاتالوگ.
   * قاعده: بلندترین نام پروفایل که زیررشتهٔ عنوان نرمال‌شدهٔ خودرو باشد.
   */
  function matchCatalogName(title, catalog) {
    const normTitle = normalizeName(title);
    if (!normTitle || !Array.isArray(catalog)) return null;
    let best = null;
    catalog.forEach((rec) => {
      const normName = normalizeName(rec.name);
      if (!normName) return;
      if (normTitle.indexOf(normName) !== -1) {
        if (!best || normName.length > normalizeName(best.name).length) best = rec;
      }
    });
    return best;
  }

  /** ارقام فارسی (نسخهٔ مشترک مستقل از app.js) */
  function toPersianDigits(val) {
    if (val === null || val === undefined) return '';
    return String(val).replace(/\d/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(x, 10)]);
  }

  /** ساخت href پروفایل */
  function profileHref(slug) {
    return '#profile/' + slug;
  }

  /**
   * افزودن دکمهٔ «پروفایل کامل» به کارت خودرو (idempotent).
   * application از داخل app.js بعد از رندر هر کارت صدا زده می‌شود؛ همچنین
   * پس از بارگذاری async کاتالوگ، کارت‌های موجود دوباره تزئین می‌شوند.
   */
  function decorateCard(cardEl, car) {
    if (!cardEl || !car || !car.title) return;
    ensure().then((catalog) => {
      if (!catalog || !catalog.length) return;
      const match = matchCatalogName(car.title, catalog);
      
      if (cardEl.querySelector('a.ikco-profile-link')) return; // idempotent
      const actions = cardEl.querySelector('.action-buttons-group');
      if (!actions) return;
      const a = document.createElement('a');
      a.className = 'ikco-profile-link';
      a.href = match ? profileHref(match.slug) : 'encyclopedia.html';
      a.setAttribute('aria-label', (match ? 'پروفایل کامل فنی ' : 'دانشنامه خودروها برای ') + car.title);
      a.innerHTML =
        '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><circle cx="12" cy="12" r="10"/></svg>' +
        '<span>' + (match ? 'پروفایل کامل' : 'دانشنامه خودروها') + '</span>';
      actions.insertBefore(a, actions.firstChild);
    });
  }

  /** تزئین کارت‌های از قبل رندرشده (پس از بارگذاری async کاتالوگ) */
  function decorateExistingCards() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    const cards = document.querySelectorAll('#carsGrid .car-card-modern');
    if (!cards || !cards.length) return;
    ensure().then((catalog) => {
      if (!catalog || !catalog.length) return;
      cards.forEach((cardEl) => {
        const nameEl = cardEl.querySelector('.card-car-name');
        if (!nameEl) return;
        if (cardEl.querySelector('a.ikco-profile-link')) return;
        const fakeCar = { title: nameEl.textContent };
        const match = matchCatalogName(fakeCar.title, catalog);
        
        const actions = cardEl.querySelector('.action-buttons-group');
        if (!actions) return;
        const a = document.createElement('a');
        a.className = 'ikco-profile-link';
        a.href = match ? profileHref(match.slug) : 'encyclopedia.html';
        a.setAttribute('aria-label', (match ? 'پروفایل کامل فنی ' : 'دانشنامه خودروها برای ') + nameEl.textContent);
        a.innerHTML =
          '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><circle cx="12" cy="12" r="10"/></svg>' +
          '<span>' + (match ? 'پروفایل کامل' : 'دانشنامه خودروها') + '</span>';
        actions.insertBefore(a, actions.firstChild);
      });
    });
  }

  window.IkcoBridge = {
    ensure,
    toAsciiDigits,
    normalizeName,
    matchCatalogName,
    toPersianDigits,
    profileHref,
    decorateCard,
    decorateExistingCards,
    ASSET_PREFIXES,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => window.IkcoBridge.decorateExistingCards());
    } else {
      window.IkcoBridge.decorateExistingCards();
    }
  }
})();
