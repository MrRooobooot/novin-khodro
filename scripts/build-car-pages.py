#!/usr/bin/env python3
"""ساخت صفحات ثابت هر خودرو (SEO surface) + هاب /cars/ + به‌روزرسانی sitemap.xml.

داده‌ها: js/cars-data.js و اقساط از js/modules/calculator.js — هیچ عدد دست‌نویسی نیست.
اجرا: python3 scripts/build-car-pages.py   (deploy-smoke.sh قبل از rsync صدا می‌زند)
"""
import json
import os
import re
import subprocess
import sys
from datetime import date

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = "https://novinkhodro.shop"
OUT_DIR = os.path.join(ROOT, "cars")

# نگاشت واژه‌های پرتکرار فارسی برای خوانا شدن اسلاگ (فقط زیبایی؛ نبودش fallback دارد)
FA_TOKENS = {
    "شاسی": "shasi", "بلند": "boland", "دنده": "dande", "ای": "i",
    "پانوراما": "panorama", "پلاس": "plus", "توربو": "turbo",
    "اتوماتیک": "automatic", "آپشنال": "options", "صفر": "zero",
    "کیلومتر": "km", "مدل": "model", "دو": "dual", "تنفس": "atmo",
}

# برند واقعی مدل از عنوان (car.brand فقط گروه است: chery/ikco)
MODEL_BRAND = {
    "پژو": "peugeot", "دنا": "dena", "هایما": "haima", "تارا": "tara",
    "اکستریم": "xtrim", "جک": "jac", "کوییک": "quick", "ساینا": "saina",
    "کیا": "kia", "هیوندای": "hyundai", "تویوتا": "toyota", "چری": "chery",
    "فیدلیتی": "fidelity", "لاماری": "lamari", "ریسپکت": "respect",
    "رانا": "rana", "شاهین": "shahin", "آریسان": "arisan", "سوزوکی": "suzuki",
}


def load_cars():
    """خودروها + اقساط محاسبه‌شده با ماژول دامنه (بدون بازنویسی فرمول)."""
    script = """
import { carsData } from './js/cars-data.js';
import { calculateInstallment, FINANCING_CONSTANTS } from './js/modules/calculator.js';
const tenures = [6, 12, 18, 24];
const downs = [30, 40, 50];
const rate = FINANCING_CONSTANTS.MONTHLY_PROFIT_RATE;
const out = {
  rate,
  cars: carsData.map(car => ({
    ...car,
    plans: tenures.map(m => ({
      months: m,
      rows: downs.map(d => ({ downPercent: d, ...calculateInstallment(car.priceMillion, d, m) })),
    })),
  })),
};
console.log(JSON.stringify(out));
"""
    res = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT, capture_output=True, text=True,
    )
    if res.returncode != 0:
        print(res.stderr, file=sys.stderr)
        raise SystemExit("node failed to load domain data")
    payload = json.loads(res.stdout)
    return payload["cars"], payload["rate"]


def slugify(car):
    title = car["title"]
    brand = next((v for k, v in MODEL_BRAND.items() if k in title), car["brand"])
    # ارقام فارسی در عنوان (۲۰۷i) باید ASCII شوند تا در اسلاگ بیایند
    title_ascii = title.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    ascii_tokens = [t.lower() for t in re.findall(r"[A-Za-z0-9]+", title_ascii)]
    if ascii_tokens:
        parts = [brand] + ascii_tokens          # عنوان لاتین دارد → اسلاگ جمع‌وجور
    else:
        fa = [FA_TOKENS[w] for w in re.split(r"\s+", re.sub(r"[^\u0600-\u06FF\s]", " ", title)) if w in FA_TOKENS]
        parts = [brand] + fa
    seen = []
    for p in parts:
        if p and p not in seen:
            seen.append(p)
    if len(seen) < 2:
        seen.append(str(car["id"]))
    return "-".join(seen)


def fa_digits(value):
    return str(value).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def commas(value):
    return f"{int(value):,}".replace(",", "،")


def tomans(value):
    return f"{commas(value)} تومان"


def tomans_m(value_million):
    """ارقام ماژول دامنه بر حسب میلیون تومان است → تبدیل دقیق به تومان."""
    return tomans(round(value_million * 1_000_000))


def esc(text):
    return (str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def asset_version(asset):
    """نسخه cache-bust همان است که index.html استفاده می‌کند (بدون واگرایی)."""
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as fh:
        html = fh.read()
    m = re.search(re.escape(asset) + r"\?v=([0-9a-z-]+)", html)
    return m.group(1) if m else "1"


WA = "https://wa.me/982166120332"
TEL = "tel:02166120332"


def wa_link(car, extra=""):
    msg = (f"سلام و احترام، درباره خودروی «{car['title']}» مدل {car['modelYear']} "
           f"به قیمت {car['priceFormatted']} در نمایشگاه نوین خودرو راهنمایی می‌خواهم.{extra}")
    from urllib.parse import quote
    return f"{WA}?text={quote(msg)}"


def fa_rate(rate):
    return fa_digits(f"{rate * 100:.1f}".replace(".", "٫"))


def plan_table(car, rate):
    head = "".join(f"<th scope=\"col\">پیش‌پرداخت {fa_digits(r['downPercent'])}٪</th>" for r in car["plans"][0]["rows"])
    rows = []
    for plan in car["plans"]:
        cells = "".join(
            f"<td>{tomans_m(r['monthlyInstallment'])}<span class=\"nk-plan-sub\">قسط ماهیانه · "
            f"تسهیلات {tomans_m(r['loanAmount'])}</span></td>"
            for r in plan["rows"]
        )
        rows.append(f"<tr><th scope=\"row\">{fa_digits(plan['months'])} ماهه</th>{cells}</tr>")
    return (
        '<div class="nk-plan-scroll" tabindex="0" role="region" aria-label="جدول اقساط خودرو"><table class="nk-plan-table"><caption>جدول اقساط «خرید از شما، اقساط از ما» — '
        f"کارمزد {fa_rate(rate)}٪ ماهیانه</caption>"
        f"<thead><tr><th scope=\"col\">مدت بازپرداخت</th>{head}</tr></thead>"
        f"<tbody>{''.join(rows)}</tbody></table></div>"
    )


def specs(car):
    items = [
        ("برند", car.get("brandLabel") or car["brand"]),
        ("مدل / سال", car["modelYear"]),
        ("کارکرد", car.get("mileageText") or f"{car['mileage']} کیلومتر"),
        ("رنگ بدنه", car.get("color", "")),
        ("رنگ داخل", car.get("interiorColor", "")),
        ("گیربکس", car.get("gearbox", "")),
        ("موتور", car.get("engine", "")),
        ("سوخت", car.get("fuel", "")),
        ("وضعیت بدنه", car.get("bodyStatus", "")),
        ("وضعیت شاسی", car.get("chassisStatus", "")),
        ("بیمه", car.get("insuranceText", "")),
        ("گارانتی", car.get("warranty", "")),
        ("سند", car.get("documentStatus", "")),
        ("کارشناسی", car.get("inspectionSummary", "")),
    ]
    return "".join(
        f"<div class=\"nk-spec\"><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>"
        for k, v in items if v
    )


def car_page(car, others, css_v, js_v, rate):
    url = f"{SITE}/cars/{car['slug']}.html"
    gallery = car.get("gallery") or [car.get("image")]
    gallery_html = "".join(
        f"<img src=\"/{esc(src)}\" alt=\"{esc(car['title'])} — تصویر {fa_digits(i + 1)}\" "
        f"loading=\"{'eager' if i == 0 else 'lazy'}\" width=\"800\" height=\"533\">"
        for i, src in enumerate(gallery) if src
    )
    features = "".join(f"<li>{esc(f)}</li>" for f in car.get("features", []))
    related = "".join(
        f"<li><a href=\"/cars/{o['slug']}.html\">{esc(o['title'])} — {esc(o['priceFormatted'])}</a></li>"
        for o in others
    )
    ld = {
        "@context": "https://schema.org",
        "@type": "Vehicle",
        "name": car["title"],
        "brand": {"@type": "Brand", "name": car["brand"]},
        "model": car["title"],
        "vehicleModelDate": car["modelYear"],
        "color": car.get("color", ""),
        "vehicleTransmission": car.get("gearbox", ""),
        "fuelType": car.get("fuel", ""),
        "mileageFromOdometer": {"@type": "QuantitativeValue", "value": car["mileage"], "unitCode": "KMT"},
        "image": [f"{SITE}/{g}" for g in gallery if g],
        "offers": {
            "@type": "Offer",
            "url": url,
            "price": car["price"],
            "priceCurrency": "IRR",
            "availability": "https://schema.org/InStock",
            "seller": {"@type": "AutoDealer", "name": "نمایشگاه نوین خودرو", "telephone": "+982166120332"},
        },
    }
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "نمایشگاه نوین خودرو", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "موجودی نمایشگاه", "item": f"{SITE}/#inventory"},
            {"@type": "ListItem", "position": 3, "name": car["title"], "item": url},
        ],
    }
    return f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(car['title'])} {esc(car['modelYear'])} — {esc(car['priceFormatted'])} | خرید نقدی و اقساطی نوین خودرو</title>
<meta name="description" content="{esc(car['title'])} مدل {esc(car['modelYear'])} با {esc(car.get('mileageText') or str(car['mileage']) + ' کیلومتر کارکرد')} — {esc(car['priceFormatted'])}. خرید نقدی و اقساطی ۶ تا ۲۴ ماهه در نمایشگاه نوین خودرو، کارشناسی‌شده با گارانتی کتبی.">
<link rel="canonical" href="{url}">
<meta property="og:type" content="product">
<meta property="og:title" content="{esc(car['title'])} — {esc(car['priceFormatted'])}">
<meta property="og:description" content="{esc(car['title'])} {esc(car['modelYear'])} | خرید نقدی و اقساطی در نمایشگاه نوین خودرو">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/{esc(car.get('image', ''))}">
<meta property="og:locale" content="fa_IR">
<link rel="stylesheet" href="/css/tokens.css?v={css_v}">
<link rel="stylesheet" href="/css/style.css?v={css_v}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(breadcrumb, ensure_ascii=False)}</script>
<style>
.nk-car{{max-width:1100px;margin:0 auto;padding:2rem 1rem 4rem}}
.nk-crumb{{font-size:.85rem;color:var(--text-muted,#94A3B8);margin-bottom:1rem}}
.nk-crumb a{{color:inherit}}
.nk-car h1{{font-size:1.9rem;margin:0 0 .5rem}}
.nk-price{{font-size:1.5rem;font-weight:800;margin:.25rem 0 1rem}}
.nk-cta{{display:flex;gap:.75rem;flex-wrap:wrap;margin:1.25rem 0}}
.nk-cta a{{padding:.8rem 1.4rem;border-radius:12px;text-decoration:none;font-weight:700;border:1px solid currentColor}}
.nk-plan-scroll{{overflow-x:auto;-webkit-overflow-scrolling:touch}}
.nk-plan-table{{width:100%;border-collapse:collapse;margin:1.5rem 0;font-variant-numeric:tabular-nums}}
.nk-plan-table caption{{text-align:right;font-weight:700;padding-bottom:.6rem}}
.nk-plan-table th,.nk-plan-table td{{border:1px solid rgba(128,128,128,.35);padding:.55rem .5rem;text-align:center;font-size:.9rem}}
.nk-plan-sub{{display:block;font-size:.72rem;color:var(--text-muted);margin-top:.2rem}}
.nk-specs{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.5rem;margin:1.5rem 0}}
.nk-spec{{display:flex;gap:.5rem;border:1px solid rgba(128,128,128,.25);border-radius:10px;padding:.5rem .7rem}}
.nk-spec dt{{font-weight:700;min-width:6.5rem}}
.nk-spec dd{{margin:0;opacity:.85}}
.nk-gallery{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.6rem;margin:1.5rem 0}}
.nk-gallery img{{width:100%;height:auto;border-radius:12px}}
</style>
</head>
<body>
<main class="nk-car">
<nav class="nk-crumb" aria-label="مسیر صفحه">
<a href="/">نمایشگاه نوین خودرو</a> › <a href="/#inventory">موجودی نمایشگاه</a> › <span>{esc(car['title'])}</span>
</nav>
<h1>{esc(car['title'])} {esc(car['modelYear'])}</h1>
<p class="nk-price">{esc(car['priceFormatted'])} <span class="nk-plan-sub">قیمت بازار آزاد — نقدی</span></p>
<div class="nk-gallery">{gallery_html}</div>
<div class="nk-cta">
<a href="{wa_link(car)}" target="_blank" rel="noopener">استعلام و رزرو بازدید در واتساپ</a>
<a href="{TEL}">تماس تلفنی: ۰۲۱-۶۶۱۲۰۳۳۲</a>
</div>
{plan_table(car, rate)}
<section aria-labelledby="nk-specs-h">
<h2 id="nk-specs-h">مشخصات و شناسنامه کارشناسی</h2>
<dl class="nk-specs">{specs(car)}</dl>
</section>
<section aria-labelledby="nk-features-h">
<h2 id="nk-features-h">آپشن‌ها و امکانات</h2>
<ul>{features}</ul>
</section>
<section aria-labelledby="nk-related-h">
<h2 id="nk-related-h">سایر خودروهای موجود نمایشگاه</h2>
<ul>{related}</ul>
</section>
<p><a href="/#installment-plan">محاسبه‌گر اقساط سایر خودروها</a></p>
</main>
<script src="/js/analytics.js?v={js_v}" defer></script>
</body>
</html>
"""


def hub_page(cars, css_v, js_v, stamp):
    items = "".join(
        f"<li><a href=\"/cars/{c['slug']}.html\">{esc(c['title'])} {esc(c['modelYear'])} — {esc(c['priceFormatted'])}</a></li>"
        for c in cars
    )
    return f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>موجودی نمایشگاه نوین خودرو — خرید نقدی و اقساطی ({fa_digits(len(cars))} خودرو)</title>
<meta name="description" content="فهرست کامل خودروهای موجود نمایشگاه نوین خودرو در تهران: قیمت بازار آزاد، شرایط خرید نقدی و اقساطی ۶ تا ۲۴ ماهه، کارشناسی‌شده با گارانتی کتبی.">
<link rel="canonical" href="{SITE}/cars/">
<link rel="stylesheet" href="/css/tokens.css?v={css_v}">
<link rel="stylesheet" href="/css/style.css?v={css_v}">
<style>main{{max-width:900px;margin:0 auto;padding:2rem 1rem 4rem}}</style>
</head>
<body>
<main>
<h1>موجودی نمایشگاه نوین خودرو</h1>
<p>آخرین به‌روزرسانی: {stamp}</p>
<ul>{items}</ul>
<p><a href="/">بازگشت به صفحه اصلی و محاسبه‌گر اقساط</a></p>
</main>
<script src="/js/analytics.js?v={js_v}" defer></script>
</body>
</html>
"""


def freshness_stamp():
    """تاریخ تازگی سایت از تنها منبع حقیقت (JSON-LD در index.html) — بدون هاردکد دوم.

    تست‌های R22/R23/... همین تاریخ را برای sitemap اجباری می‌کنند؛ پس از index.html
    مشتق می‌شود تا با تغییر آن، sitemap خودکار هم‌گام بماند.
    """
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as fh:
        html = fh.read()
    m = re.search(r'"dateModified":\s*"(\d{4}-\d{2}-\d{2})"', html)
    return m.group(1) if m else date.today().isoformat()


def write_slug_map(cars, js_v_note=""):
    """نقشه id→slug برای لینک‌سازی کارت‌های صفحه اصلی (منبع واحد: همین اسکریپت)."""
    mapping = {str(c["id"]): c["slug"] for c in cars}
    body = json.dumps(mapping, ensure_ascii=False, separators=(",", ":"))
    path = os.path.join(ROOT, "js", "data", "car-slugs.js")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("/* AUTO-GENERATED by scripts/build-car-pages.py — id خودرو → اسلاگ صفحه اختصاصی */\n"
                 f"window.CAR_SLUGS = {body};\n")
    return path


def write_sitemap(cars, stamp):
    urls = [f"{SITE}/", f"{SITE}/cars/", f"{SITE}/prices.html", f"{SITE}/encyclopedia.html"]
    urls += [f"{SITE}/cars/{c['slug']}.html" for c in cars]
    body = "".join(
        f"  <url><loc>{u}</loc><lastmod>{stamp}</lastmod>"
        f"<changefreq>{'daily' if '/cars/' in u or u.endswith('/') else 'weekly'}</changefreq>"
        f"<priority>{'1.0' if u == SITE + '/' else '0.8'}</priority></url>\n"
        for u in urls
    )
    xml = ("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
           "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
           f"{body}</urlset>\n")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as fh:
        fh.write(xml)
    return urls


def sync_hero(cars):
    """Keep curated hero slots bound to stable slugs, never mutable inventory IDs."""
    from pathlib import Path
    path = Path(ROOT) / 'index.html'
    html = path.read_text(encoding='utf-8')
    by_slug = {car['slug']: car for car in cars}

    def render(match):
        block = match.group(0)
        slug = match.group(1)
        if slug not in by_slug:
            raise ValueError(f'Hero car no longer in inventory: {slug}; choose a replacement before deploy')
        car = by_slug[slug]
        values = {
            'slide-title': esc(car['title']),
            'slide-desc': esc(f"مدل {car['modelYear']} | {car['mileageText']} | {car['gearbox']}"),
            'slide-price': esc(fa_digits(tomans(car['price']))),
        }
        for cls, value in values.items():
            block = re.sub(r'(<(?:h2|p|span) class="' + cls + r'">)[^<]*',
                           lambda m: m[1] + value, block)
        block = re.sub(r'openCarModal\(\d+(?:, this)?\)', f"openCarModal({car['id']}, this)", block)
        block = re.sub(r'(<div class="slide-installment-hint">\s*<span>)[^<]*',
                       r'\g<1>نمونه پیش‌پرداخت ۵۰٪:', block)
        block = re.sub(r'(<div class="slide-installment-hint">\s*<span>[^<]*</span>\s*<strong>)[^<]*',
                       lambda m: m[1] + esc(fa_digits(tomans(car['price'] * .5))), block)
        return block

    html, count = re.subn(r'<div class="slide-item[^"\n]*" id="slideItem\d+" data-car-slug="([^"]+)"[\s\S]*?(?=<div class="slide-item|<button class="slider-arrow)', render, html)
    if count != 3:
        raise ValueError(f'Expected 3 bound hero slots, found {count}')
    path.write_text(html, encoding='utf-8')


def main():
    cars, rate = load_cars()
    for car in cars:
        car["slug"] = slugify(car)
    slugs = [c["slug"] for c in cars]
    if len(set(slugs)) != len(slugs):
        raise SystemExit(f"duplicate slugs: {slugs}")

    sync_hero(cars)
    css_v = asset_version("css/style.css")
    js_v = asset_version("js/analytics.js")
    stamp = freshness_stamp()
    os.makedirs(OUT_DIR, exist_ok=True)

    written = []
    for car in cars:
        others = [c for c in cars if c["id"] != car["id"]]
        path = os.path.join(OUT_DIR, f"{car['slug']}.html")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(car_page(car, others, css_v, js_v, rate))
        written.append(path)
    hub = os.path.join(OUT_DIR, "index.html")
    with open(hub, "w", encoding="utf-8") as fh:
        fh.write(hub_page(cars, css_v, js_v, stamp))
    slug_map = write_slug_map(cars)
    urls = write_sitemap(cars, stamp)

    print(f"cars: {len(cars)} | slugs: {', '.join(slugs)}")
    print(f"hub : {os.path.relpath(hub, ROOT)}")
    print(f"map : {os.path.relpath(slug_map, ROOT)}")
    print(f"sitemap urls: {len(urls)}")
    for u in urls:
        print(f"  {u}")


if __name__ == "__main__":
    main()
