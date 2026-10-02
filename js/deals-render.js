/**
 * شکارها — جدول آگهی‌های چشمگیر ارزان‌تر از میانه بازار (چند-پلتفرمی: bama + divar + sheypoor)
 * گیت توکن دستگاه: HMAC hash در کد؛ توکن درست → localStorage → رندر جدول.
 * ستون پلتفرم + دکمه‌های فیلتر پلتفرم. بدون backend — استاتیک.
 */
(function () {
  'use strict';

  var DEALS_TOKEN_HASH = '00afe40235fa8d4898497204';
  var LS_KEY = 'nk_deals_token';

  var PLATFORM_FA = {
    bama: 'باما',
    divar: 'دیوار',
    sheypoor: 'شیپور'
  };

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function faDigits(v) {
    return String(v == null ? '' : v).replace(/\d/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'[x]; });
  }

  function faPrice(n) {
    return faDigits(Number(n).toLocaleString('en-US').replace(/,/g, '٫'));
  }

  function faDate(iso) {
    if (!iso) return '';
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    var months = ['', 'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
    return faDigits(parseInt(m[3], 10)) + ' ' + months[parseInt(m[2], 10)] + ' ' + faDigits(m[1]);
  }

  function platformFa(p) {
    return PLATFORM_FA[p] || esc(p || '—');
  }

  function isUnlocked() {
    try { return String(window.localStorage.getItem(LS_KEY) || '') === DEALS_TOKEN_HASH; }
    catch (e) { return false; }
  }

  function renderGate(msg) {
    var grid = el('dealsList');
    if (!grid) return;
    grid.innerHTML =
      '<div class="deal-gate">' +
      '<h2>دسترسی محدود</h2>' +
      '<p>برای مشاهده شکارها توکن دستگاه را وارد کنید.</p>' +
      '<form id="dealsGateForm" autocomplete="off">' +
      '<input type="password" id="dealsTokenInput" inputmode="text" placeholder="توکن دستگاه" aria-label="توکن دستگاه" required>' +
      '<button type="submit">ورود</button>' +
      '</form>' +
      (msg ? '<p class="deal-gate-error" role="alert">' + esc(msg) + '</p>' : '') +
      '</div>';
    var form = el('dealsGateForm');
    if (form && typeof form.addEventListener === 'function') {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var inp = el('dealsTokenInput');
        var token = String((inp && inp.value) || '').trim();
        if (token === DEALS_TOKEN_HASH) {
          try { window.localStorage.setItem(LS_KEY, token); } catch (e) { /* private mode */ }
          renderDeals();
        } else {
          renderGate('توکن نادرست است.');
        }
      });
    }
  }

  function platformFilters(deals) {
    var platforms = [];
    var seen = {};
    deals.forEach(function (d) {
      var p = d.platform || d.source || 'bama';
      if (!seen[p]) { seen[p] = true; platforms.push(p); }
    });
    var btns = ['<button type="button" class="deal-platform-btn deal-platform-active" data-platform="all">همه</button>'];
    platforms.forEach(function (p) {
      btns.push('<button type="button" class="deal-platform-btn" data-platform="' + esc(p) + '">' + platformFa(p) + '</button>');
    });
    return '<div class="deal-platform-filter" role="group" aria-label="فیلتر پلتفرم">' + btns.join('') + '</div>';
  }

  function dealRow(d) {
    var plat = d.platform || d.source || 'bama';
    var title = d.title || '';
    return '<tr class="deal-row" data-platform="' + esc(plat) + '">' +
      '<td class="deal-name">' + esc(d.name) + (d.trim ? ' <span class="deal-trim">' + esc(d.trim) + '</span>' : '') + (title ? '<div class="deal-trim">' + esc(title) + '</div>' : '') + '</td>' +
      '<td class="deal-year">' + faDigits(d.year) + '</td>' +
      '<td class="deal-price">' + faPrice(d.price) + '</td>' +
      '<td class="deal-median">' + faPrice(d.marketMedian) + '</td>' +
      '<td class="deal-discount"><span class="deal-badge">−' + faDigits(d.discountPct) + '٪</span></td>' +
      '<td class="deal-platform"><span class="deal-platform-tag deal-platform-' + esc(plat) + '">' + platformFa(plat) + '</span></td>' +
      '<td class="deal-link">' + (/^https:\/\//.test(String(d.href)) ? '<a href="' + esc(d.href) + '" target="_blank" rel="noopener nofollow">مشاهده آگهی ↗</a>' : '<span class="deal-trim">—</span>') + '</td>' +
      '<td class="deal-date">' + faDate(d.fetchedAt) + '</td>' +
      '</tr>';
  }

  function attachFilter(deals) {
    var wrap = el('dealsPlatformFilter');
    if (!wrap || typeof wrap.addEventListener !== 'function') return;
    wrap.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('.deal-platform-btn') : null;
      if (!btn) return;
      var plat = btn.getAttribute('data-platform');
      var all = wrap.querySelectorAll('.deal-platform-btn');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.remove('deal-platform-active');
      }
      btn.classList.add('deal-platform-active');
      var rows = el('dealsList').querySelectorAll('.deal-row');
      for (var j = 0; j < rows.length; j++) {
        var show = plat === 'all' || rows[j].getAttribute('data-platform') === plat;
        rows[j].style.display = show ? '' : 'none';
      }
    });
  }

  function renderDeals() {
    var grid = el('dealsList');
    if (!grid) return;
    var deals = (typeof window.carDeals === 'object' && window.carDeals) || [];
    if (!deals.length) {
      grid.innerHTML = '<div class="deal-gate"><h2>شکارها</h2><p>هنوز شکاری ثبت نشده — بعداً سر بزنید.</p></div>';
      return;
    }
    var rows = deals.map(dealRow).join('');
    grid.innerHTML =
      '<p class="deal-count">' + faDigits(deals.length) + ' شکار فعال — آخرین بروزرسانی: ' + faDate(deals[0] && deals[0].fetchedAt) + '</p>' +
      platformFilters(deals) +
      '<div class="deal-table-wrap"><table class="deal-table">' +
      '<thead><tr><th>خودرو</th><th>سال</th><th>قیمت آگهی</th><th>میانه بازار</th><th>تخفیف</th><th>پلتفرم</th><th>آگهی</th><th>زمان</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
    var wrap = grid.querySelector('.deal-platform-filter');
    if (wrap && typeof wrap.removeAttribute === 'function') {
      wrap.removeAttribute('id');
      wrap.id = 'dealsPlatformFilter';
    }
    attachFilter(deals);
  }

  function render() {
    if (isUnlocked()) {
      renderDeals();
    } else {
      renderGate('');
    }
  }

  window.NovinDeals = { render: render, renderGate: renderGate, renderDeals: renderDeals, isUnlocked: isUnlocked, DEALS_TOKEN_HASH: DEALS_TOKEN_HASH };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }
})();
