#!/usr/bin/env python3
"""Generate encyclopedia.html — standalone SEO page for the IKCO catalog (37 models).

Reuses existing renderers (js/encyclopedia.js + js/profile.js over IkcoBridge) so no new
front-end logic is introduced: the same grid + profile routing that already run on index.html
are mounted on their own indexable URL.

Run: python3 scripts/build-encyclopedia-page.py
"""
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
V = "20260918k"  # keep in sync with index.html cache-bust token

# کاتالوگ منبع یک فایل JS است — با node به JSON تبدیل می‌شود (بدون وابستگی به فایل موقت)
_NODE = (
    "const fs=require('fs');const w={};"
    "new Function('window',fs.readFileSync(process.argv[1],'utf8'))(w);"
    "process.stdout.write(JSON.stringify((w.ikcoCatalog||[]).map(r=>({slug:r.slug,name:r.name}))));"
)
CATALOG = json.loads(
    subprocess.run(
        ["node", "-e", _NODE, str(ROOT / "js/data/ikco-catalog.js")],
        check=True, capture_output=True, text=True,
    ).stdout
)
NAME_MAP = {r["slug"]: r["name"] for r in CATALOG}

ITEM_LIST = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "دانشنامه خودروهای ایران‌خودرو — نوین خودرو",
    "dateModified": "2026-09-18",
    "numberOfItems": len(CATALOG),
    "itemListElement": [
        {
            "@type": "ListItem",
            "position": i,
            "item": {
                "@type": "Product",
                "name": name,
                "url": f"https://novinkhodro.shop/encyclopedia.html#profile/{slug}",
                "brand": {"@type": "Brand", "name": "ایران خودرو"},
            },
        }
        for i, (slug, name) in enumerate(NAME_MAP.items(), 1)
    ],
}

COLLECTION = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "دانشنامه خودروهای ایران‌خودرو | نوین خودرو",
    "url": "https://novinkhodro.shop/encyclopedia.html",
    "dateModified": "2026-09-18",
    "isPartOf": {"@id": "https://novinkhodro.shop"},
    "publisher": {"@type": "AutoDealer", "name": "نمایشگاه اتومبیل نوین خودرو", "telephone": "02166120332"},
}

HTML = """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>دانشنامه خودروهای ایران‌خودرو | مشخصات فنی، تجهیزات و گالری ۳۷ مدل — نوین خودرو</title>
  <meta name="description" content="دانشنامه کامل خودروهای ایران‌خودرو در نمایشگاه نوین خودرو: مشخصات فنی، تجهیزات، رنگ‌ها، گالری تصاویر، کاتالوگ رسمی و دفترچه راهنما برای ۳۷ مدل (تارا، دنا پلاس، ۲۰۷i، رانا، سورن، هایما و…). تلفن: ۰۲۱۶۶۱۲۰۳۳۲">
  <meta name="keywords" content="دانشنامه خودرو, مشخصات فنی ایران خودرو, تارا, دنا پلاس, پژو ۲۰۷i, رانا پلاس, سورن پلاس, هایما S7, کاتالوگ ایران خودرو, نوین خودرو">
  <meta name="theme-color" content="#0B1220">
  <link rel="canonical" href="https://novinkhodro.shop/encyclopedia.html">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="alternate icon" href="favicon.ico">

  <!-- Open Graph & Twitter -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fa_IR">
  <meta property="og:site_name" content="نمایشگاه اتومبیل نوین خودرو">
  <meta property="og:title" content="دانشنامه خودروهای ایران‌خودرو — ۳۷ مدل با مشخصات کامل | نوین خودرو">
  <meta property="og:description" content="مشخصات فنی، تجهیزات، گالری تصاویر و کاتالوگ رسمی ۳۷ مدل ایران‌خودرو در دانشنامه نوین خودرو.">
  <meta property="og:url" content="https://novinkhodro.shop/encyclopedia.html">
  <meta property="og:image" content="https://novinkhodro.shop/images/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="دانشنامه خودروهای ایران‌خودرو — نوین خودرو">
  <meta name="twitter:description" content="مشخصات فنی، تجهیزات و گالری ۳۷ مدل ایران‌خودرو در دانشنامه نوین خودرو.">
  <meta name="twitter:image" content="https://novinkhodro.shop/images/og-image.jpg">

  <!-- JSON-LD -->
  <script type="application/ld+json">
__COLLECTION__
  </script>
  <script type="application/ld+json">
__ITEM_LIST__
  </script>

  <link rel="preload" href="fonts/Vazirmatn-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="fonts/Vazirmatn-Bold.woff2" as="font" type="font/woff2" crossorigin>

  <link rel="stylesheet" href="css/style.css?v=__V__">
  <link rel="stylesheet" href="css/responsive.css?v=__V__">
  <link rel="stylesheet" href="css/profile.css?v=__V__">
</head>
<body>
  <a href="#main-content" class="skip-link">پرش به محتوای اصلی</a>

  <header class="site-header" role="banner">
    <div class="container">
      <div class="header-inner">
        <a href="https://novinkhodro.shop/" class="brand-logo" aria-label="بازگشت به صفحه اصلی نمایشگاه اتومبیل نوین خودرو">
          <img src="images/logo-novin-gold.svg" alt="لوگوی رسمی نوین خودرو" width="246" height="52" class="brand-logo-img" decoding="async" fetchpriority="high">
        </a>

        <nav aria-label="منوی اصلی">
          <ul class="nav-links" id="navLinks">
            <li><a href="https://novinkhodro.shop/#inventory" class="nav-link-item">موجودی نمایشگاه</a></li>
            <li><a href="encyclopedia.html" class="nav-link-item active" aria-current="page">دانشنامه خودروها</a></li>
            <li><a href="https://novinkhodro.shop/#installment-plan" class="nav-link-item">خرید اقساطی</a></li>
            <li><a href="https://novinkhodro.shop/#sell-car" class="nav-link-item">فروش فوری خودرو</a></li>
            <li><a href="https://novinkhodro.shop/#contact" class="nav-link-item">آدرس و تماس</a></li>
          </ul>
        </nav>

        <div class="header-actions">
          <a href="tel:02166120332" class="btn-header-call" aria-label="تماس تلفنی با نمایشگاه نوین خودرو شماره ۰۲۱۶۶۱۲۰۳۳۲">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            تماس فوری
          </a>
        </div>
      </div>
    </div>
  </header>

  <main id="main-content">
    <section class="encyclopedia-section" id="auto-encyclopedia" aria-labelledby="encyHeading">
      <div class="container">
        <nav aria-label="مسیر صفحه" class="ency-breadcrumb">
          <ol>
            <li><a href="https://novinkhodro.shop/">صفحه اصلی</a></li>
            <li aria-current="page">دانشنامه خودروهای ایران‌خودرو</li>
          </ol>
        </nav>

        <div class="section-head-minimal">
          <h1 class="section-title-large" id="encyHeading">
            دانشنامه خودروهای ایران‌خودرو
            <span>مشخصات فنی کامل، تجهیزات، گالری تصاویر، کاتالوگ رسمی و دفترچه راهنما — <strong id="encyCount">۳۷</strong> مدل</span>
          </h1>
        </div>

        <div class="ency-grid" id="encyGrid" role="region" aria-label="فهرست مدل‌های خودروهای ایران‌خودرو">
          <!-- رندر خودکار توسط js/encyclopedia.js از js/data/ikco-catalog.js -->
        </div>
      </div>
    </section>

    <section class="why-us-section" id="contact" aria-labelledby="encContactHeading">
      <div class="container">
        <div class="section-head-minimal">
          <h2 class="section-title-large" id="encContactHeading">
            خرید، فروش و معاوضه
            <span>موجودی روز نمایشگاه، کارشناسی ۱۰۰٪ کتبی و طرح «خرید از شما، اقساط از ما» (۶ تا ۲۴ ماهه)</span>
          </h2>
        </div>
        <div class="header-actions">
          <a href="tel:02166120332" class="btn-header-call">تماس: ۰۲۱-۶۶۱۲۰۳۳۲</a>
          <a href="https://novinkhodro.shop/#inventory" class="btn-slide-primary">مشاهده موجودی نمایشگاه</a>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <address class="footer-nap">
        <p class="footer-address-text">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          تهران، ستارخان، میدان توحید، نصرت غربی، پلاک ۲۱
        </p>
        <p class="footer-phone-text">
          <a href="tel:02166120332" class="footer-phone-link">۰۲۱-۶۶۱۲۰۳۳۲</a>
        </p>
      </address>
      <div class="footer-bottom-clean">
        <p>© کلیه حقوق برای نمایشگاه اتومبیل نوین خودرو محفوظ است.</p>
        <p><a href="https://novinkhodro.shop/">بازگشت به صفحه اصلی</a></p>
      </div>
    </div>
  </footer>

  <div class="toast-container" id="toastContainer" role="status" aria-live="polite" aria-atomic="true"></div>

  <script src="js/modules/ikco-bridge.js" defer></script>
  <script src="js/encyclopedia.js?v=__V__" defer></script>
  <script src="js/profile.js?v=__V__" defer></script>
</body>
</html>
"""

out = (
    HTML.replace("__COLLECTION__", json.dumps(COLLECTION, ensure_ascii=False, indent=2))
    .replace("__ITEM_LIST__", json.dumps(ITEM_LIST, ensure_ascii=False, indent=2))
    .replace("__V__", V)
)
(ROOT / "encyclopedia.html").write_text(out, encoding="utf-8")
print(f"wrote encyclopedia.html — {len(out):,} bytes, {len(CATALOG)} models in ItemList")
