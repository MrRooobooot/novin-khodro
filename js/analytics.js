/**
 * نوین خودرو — سنجش بازدهی first-party
 * رخدادها فقط به نقطه پایانی خود سایت (/t) به‌صورت پیکسل GET می‌روند و در
 * /var/log/nginx/nk-events.log ثبت می‌شوند. هیچ CDN، کوکی، شناسه کاربر یا داده‌ای
 * به بیرون نمی‌رود. گزارش: python3 scripts/roi-report.py
 */
(function () {
  var ENDPOINT = '/t';

  function send(event, opts) {
    opts = opts || {};
    var params = [];
    params.push('e=' + encodeURIComponent(event));
    if (opts.c) params.push('c=' + encodeURIComponent(opts.c));
    if (opts.p) params.push('p=' + encodeURIComponent(opts.p));
    if (opts.v) params.push('v=' + encodeURIComponent(opts.v));
    if (opts.r) params.push('r=' + encodeURIComponent(opts.r));
    var url = ENDPOINT + '?' + params.join('&');
    try {
      var img = new Image();
      img.referrerPolicy = 'no-referrer-when-downgrade';
      img.src = url;
    } catch (err) {
      /* بلاک‌شده یا آفلاین — سنجش نباید تجربه کاربر را خراب کند */
    }
  }

  window.nkTrack = send;

  /**
   * ثبت سرنخ واقعی مشتری در صندوق سرنخ سرور (/lead → nk-leads.log).
   * هیچ داده‌ای به بیرون نمی‌رود؛ این مسیر جای واتساپ را نمی‌گیرد، فقط برای پیگیری ذخیره می‌کند.
   */
  function lead(type, fields) {
    fields = fields || {};
    var params = ['t=' + encodeURIComponent(type || 'unknown')];
    if (fields.n) params.push('n=' + encodeURIComponent(fields.n));
    if (fields.ph) params.push('ph=' + encodeURIComponent(fields.ph));
    if (fields.c) params.push('c=' + encodeURIComponent(fields.c));
    if (fields.m) params.push('m=' + encodeURIComponent(fields.m));
    if (fields.v) params.push('v=' + encodeURIComponent(fields.v));
    if (fields.p) params.push('p=' + encodeURIComponent(fields.p));
    try {
      var img = new Image();
      img.src = '/lead?' + params.join('&');
    } catch (err) {
      /* سنجش نباید تجربه کاربر را خراب کند */
    }
  }

  window.nkLead = lead;

  // محل کلیک: نزدیک‌ترین بخش دارای id + نقش دکمه
  function place(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.id) return node.id;
      if (node.className && typeof node.className === 'string') {
        var cls = node.className.split(/\s+/).filter(function (c) {
          return /btn|call|float|bar|band|cta|footer|header|modal/.test(c);
        })[0];
        if (cls) return cls;
      }
      node = node.parentElement;
    }
    return 'unknown';
  }

  // یک شنونده نماینده برای همه لینک‌های تماس/واتساپ در تمام صفحات و مودال‌ها
  document.addEventListener('click', function (ev) {
    var target = ev.target;
    var link = target && target.closest ? target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) {
      send('tel', { p: place(link) });
    } else if (/^https?:\/\/wa\.me/.test(href)) {
      send('wa', { p: place(link), v: href.indexOf('?text=') > -1 ? 'prefilled' : 'plain' });
    }
  }, false);
})();
