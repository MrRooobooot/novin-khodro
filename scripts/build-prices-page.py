#!/usr/bin/env python3
"""ساخت صفحهٔ عمومی و ایندکس‌پذیر «قیمت روز بازار آزاد» (prices.html) از js/data/zero-prices.js.

هدف: تنها سطح بزرگ محتوای قابل ایندکس سایت (۱۰۹ برند / ۴۶۹ مدل / ۸۸۵ تیپ) — بدون آگهی، بدون داده دستی.
اجرا: python3 scripts/build-prices-page.py   (deploy-smoke.sh قبل از rsync صدا می‌زند)
"""
import json
import os
import re
import subprocess
import sys
from datetime import date
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = "https://novinkhodro.shop"
OUT = os.path.join(ROOT, "prices.html")
WA = "https://wa.me/982166120332"
TEL = "tel:02166120332"


def load_prices():
    script = """
import fs from 'fs';
const src = fs.readFileSync('js/data/zero-prices.js', 'utf8');
const w = {};
new Function('window', src)(w);
console.log(JSON.stringify(w.zeroPrices || []));
"""
    res = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, capture_output=True, text=True)
    if res.returncode != 0 or not res.stdout.strip():
        print(res.stderr, file=sys.stderr)
        raise SystemExit("zero-prices.js load failed")
    return json.loads(res.stdout)


def freshness_stamp():
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as fh:
        m = re.search(r'"dateModified":\s*"(\d{4}-\d{2}-\d{2})"', fh.read())
    return m.group(1) if m else date.today().isoformat()


def asset_version(asset):
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as fh:
        m = re.search(re.escape(asset) + r"\?v=([0-9a-z-]+)", fh.read())
    return m.group(1) if m else "1"


def fa_digits(v):
    return str(v).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def commas(v):
    return f"{int(v):,}".replace(",", "،")


def tomans(v):
    return f"{commas(v)} تومان"


def esc(t):
    return (str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def slugify(text, fallback):
    s = re.sub(r"[^\w\u0600-\u06FF]+", "-", str(text)).strip("-").lower()
    return s or fallback


def trend(rec):
    prev = rec.get("prevPrice")
    price = rec.get("price") or 0
    if not prev or not price or prev == price:
        return "<span class=\"nk-tr-steel\">ثابت</span>", 0
    pct = (price - prev) / prev * 100
    arrow = "▲" if pct > 0 else "▼"
    cls = "up" if pct > 0 else "down"
    return (f"<span class=\"nk-tr-{cls}\">{arrow} {fa_digits(f'{abs(pct):.1f}')}٪</span>", pct)


def main():
    rows = load_prices()
    if not rows:
        raise SystemExit("no price records")

    brands = {}
    for r in rows:
        bname = (r.get("brandName") or r.get("brand") or "سایر").strip()
        brands.setdefault(bname, {}).setdefault(r.get("name") or r.get("model") or "-", []).append(r)

    order = sorted(brands.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    stamp = freshness_stamp()
    css_v = asset_version("css/style.css")
    js_v = asset_version("js/analytics.js")
    today_label = date.today().isoformat()

    index_links, sections = [], []
    for brand_index, (bname, models) in enumerate(order):
        bslug = f"{slugify(bname, 'brand')}-{brand_index}"
        tcount = sum(len(v) for v in models.values())
        index_links.append(f"<li><a href=\"#p-{bslug}\">{esc(bname)} <span>{fa_digits(tcount)}</span></a></li>")
        body = []
        for mname, trims in sorted(models.items(), key=lambda kv: -max(t.get("price", 0) for t in kv[1])):
            trims_sorted = sorted(trims, key=lambda t: -t.get("price", 0))
            cells = []
            for t in trims_sorted:
                tstr, _ = trend(t)
                trim_label = t.get("trim") or ""
                cells.append(
                    "<tr><td>" + esc(trim_label or "—") + "</td>"
                    f"<td>{esc(t.get('yearLabel') or '—')}</td>"
                    f"<td>{tomans(t.get('price') or 0)}</td>"
                    f"<td>{tstr}</td></tr>"
                )
            body.append(
                f"<tr class=\"nk-model\"><th colspan=\"4\">{esc(mname)}</th></tr>" + "".join(cells)
            )
        sections.append(f"""
<section class="nk-brand" id="p-{bslug}" aria-labelledby="h-{bslug}">
  <h2 id="h-{bslug}">{esc(bname)} <span class="nk-count">{fa_digits(tcount)} تیپ</span></h2>
  <table class="nk-price-table">
    <caption class="sr-only">قیمت بازار آزاد {esc(bname)} — {fa_digits(tcount)} تیپ، آخرین بروزرسانی {fa_digits(today_label)}</caption>
    <thead><tr><th scope="col">تیپ</th><th scope="col">مدل</th><th scope="col">قیمت بازار آزاد</th><th scope="col">روند</th></tr></thead>
    <tbody>{''.join(body)}</tbody>
  </table>
  <p class="nk-brand-cta">
    <a href="{WA}?text={quote(f'سلام، درباره قیمت‌های {bname} و خرید اقساطی راهنمایی می‌خواهم.')}" target="_blank" rel="noopener">استعلام اقساط {esc(bname)} در واتساپ</a>
    <a href="{TEL}">تماس: ۰۲۱-۶۶۱۲۰۳۳۲</a>
  </p>
</section>""")

    jsonld = json.dumps({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "قیمت روز خودروهای صفر بازار آزاد ایران",
        "url": f"{SITE}/prices.html",
        "dateModified": stamp,
        "inLanguage": "fa-IR",
        "isPartOf": {"@type": "WebSite", "url": f"{SITE}/", "name": "نمایشگاه نوین خودرو"},
        "about": {"@type": "ItemList", "numberOfItems": len(rows),
                  "itemListElement": [{"@type": "Thing", "name": b} for b, _ in order]},
    }, ensure_ascii=False)
    crumb = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "نمایشگاه نوین خودرو", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "قیمت روز بازار آزاد", "item": f"{SITE}/prices.html"},
        ],
    }, ensure_ascii=False)

    html = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>قیمت روز خودروهای صفر ایران — {fa_digits(len(order))} برند و {fa_digits(len(rows))} تیپ | نوین خودرو</title>
<meta name="description" content="قیمت لحظه‌ای بازار آزاد خودروهای صفر ایرانی: {fa_digits(len(rows))} تیپ از {fa_digits(len(order))} برند (ایران‌خودرو، سایپا، مدیران‌خودرو، کرمان‌موتور و…) با روند روزانه و شرایط خرید نقدی و اقساطی ۶ تا ۲۴ ماهه در نمایشگاه نوین خودرو.">
<link rel="canonical" href="{SITE}/prices.html">
<meta property="og:type" content="website">
<meta property="og:title" content="قیمت روز خودروهای صفر — بازار آزاد | نوین خودرو">
<meta property="og:description" content="{fa_digits(len(rows))} تیپ از {fa_digits(len(order))} برند با روند روزانه قیمت و شرایط اقساط.">
<meta property="og:url" content="{SITE}/prices.html">
<meta property="og:locale" content="fa_IR">
<link rel="stylesheet" href="/css/tokens.css?v={css_v}">
<link rel="stylesheet" href="/css/style.css?v={css_v}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">{jsonld}</script>
<script type="application/ld+json">{crumb}</script>
<style>
.nk-wrap{{max-width:1100px;margin:0 auto;padding:2rem 1rem 4rem}}
.nk-wrap h1{{font-size:1.65rem;margin:.2rem 0 .6rem}}
.nk-meta{{color:var(--text-muted,#94A3B8);font-size:.85rem;margin-bottom:1rem}}
.nk-idx{{display:flex;flex-wrap:wrap;gap:.35rem;margin:1rem 0 2rem;padding:0;list-style:none}}
.nk-idx a{{display:inline-block;border:1px solid rgba(128,128,128,.3);border-radius:999px;padding:.3rem .7rem;font-size:.8rem;text-decoration:none;color:inherit}}
.nk-idx a span{{color:var(--text-muted);font-size:.72rem}}
.nk-brand{{margin:2rem 0}}
.nk-brand h2{{font-size:1.15rem;margin:0 0 .6rem}}
.nk-count{{font-size:.75rem;color:var(--text-muted);font-weight:400}}
.nk-price-table{{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:.85rem}}
.nk-price-table th,.nk-price-table td{{border:1px solid rgba(128,128,128,.25);padding:.4rem .55rem;text-align:right}}
.nk-price-table thead th{{background:rgba(128,128,128,.12);font-weight:600}}
tr.nk-model th{{background:var(--brand-gold,#E9BF32);color:#0B1220;text-align:right;font-weight:800}}
.nk-tr-up{{color:#e0555c}}.nk-tr-down{{color:#3aa76d}}.nk-tr-steel{{color:var(--text-muted)}}
.nk-brand-cta a{{margin-inline-end:1rem;font-size:.85rem}}
.sr-only{{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}
</style>
</head>
<body>
<main class="nk-wrap">
<nav aria-label="مسیر صفحه" class="nk-meta">
  <a href="/">نمایشگاه نوین خودرو</a> › <a href="/#zero-prices">قیمت روز</a> › <span>بازار آزاد</span>
</nav>
<h1>قیمت روز خودروهای صفر — بازار آزاد</h1>
<p class="nk-meta">
  {fa_digits(len(rows))} تیپ از {fa_digits(len(order))} برند — آخرین بروزرسانی: {fa_digits(today_label)} ·
  منبع: تجمیع قیمت‌های اعلامی بازار آزاد (روزانه) · خرید نقدی و اقساطی ۶ تا ۲۴ ماهه
</p>
<p><a href="/#inventory">موجودی نمایشگاه نوین خودرو</a> · <a href="/cars/">صفحات خودروهای موجود</a> · <a href="/#installment-plan">محاسبه‌گر اقساط</a></p>
<nav aria-label="فهرست برندها"><ul class="nk-idx">{''.join(index_links)}</ul></nav>
{''.join(sections)}
<p class="nk-meta">قیمت‌ها بازار آزاد است و روزانه بازخوانی می‌شود؛ برای شرایط خرید و اقساط با نمایشگاه تماس بگیرید: <a href="{TEL}">۰۲۱-۶۶۱۲۰۳۳۲</a></p>
</main>
<script src="/js/analytics.js?v={js_v}" defer></script>
</body>
</html>
"""

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"prices.html: {len(rows)} تیپ | {len(order)} برند | {os.path.getsize(OUT) // 1024}KB | lastmod {stamp}")


if __name__ == "__main__":
    main()
