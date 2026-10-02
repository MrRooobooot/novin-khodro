#!/usr/bin/env python3
"""
Novin Khodro — Deal Scraper (شکار آگهی‌های چشمگیر ارزان‌تر از بازار) — چند-پلتفرمی.

پلتفرم‌های آگهی‌محور:
  ۱) bama.ir   — کوهورت صفر/کارکرد کم per مدل (parse devalue SSR) → platform:'bama'
  ۲) divar.ir  — SSR صفحه مدل (ناپایدار؛ تلاش مجدد ۴×) → platform:'divar'
  ۳) sheypoor.com — RSC stream صفحه مدل → platform:'sheypoor'

منطق: فقط آگهی‌های تهران. برای هر مدل هدف در هر پلتفرم، کوهورت (صفر یا km≤۱۲۰هزار، سال≥۱۴۰۰) →
میانه بازار per-(مدل، سال) = marketMedian (fallback میانه مدل)؛
شکار = median×FAKE_FLOOR ≤ price < median×0.85 (زیر floor = آگهی بیعانه/قیمت‌ریزی، رد).
خروجی: js/data/deals.js — window.carDeals = [{slug, name, trim, year, price,
marketMedian, discountPct, source, platform, href, fetchedAt}] (مرتب بر تخفیف)
+ بکاپ .hermes/price-history/deals-<date>.json

فقط stdlib (urllib). throttle ۲.۵s.
"""

import urllib.request
import urllib.error
import urllib.parse
import json
import re
import os
import sys
import time
import statistics
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_FILE = os.path.join(ROOT, "js", "data", "deals.js")
HISTORY_DIR = os.path.join(ROOT, ".hermes", "price-history")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.7",
}

THROTTLE_S = 2.5
YEAR_FLOOR = 1400          # شکار می‌تواند کارکرده هم باشد
MILEAGE_MAX = 120_000
PRICE_STUB_MIN = 1_000_000_000
DEAL_THRESHOLD = 0.85      # زیر ۸۵٪ میانه همان سال = شکار
FAKE_FLOOR = 0.55          # زیر ۵۵٪ میانه = قیمت‌ریزی/آگهی بیعانه، نه شکار
BUCKET_MIN = 3             # حداقل نمونه برای میانهٔ per-year
DIVAR_TRIES = 4

# (slug, نام فارسی, title keyword, exclude keyword) — مدل‌های هدف پنل
TARGET_MODELS = [
    ("tara", "تارا", "تارا", None),
    ("dena-plus", "دنا پلاس", "دنا", None),
    ("dena", "دنا", "دنا", "پلاس"),
    ("runna-plus", "رانا پلاس", "رانا", None),
    ("runna", "رانا", "رانا", "پلاس"),
    ("peugeot-207i", "پژو ۲۰۷", "207", None),
    ("peugeot-206", "پژو ۲۰۶", "206", None),
    ("soren-plus", "سورن پلاس", "سورن", None),
    ("soren", "سورن", "سورن", "پلاس"),
    ("peugeot-pars", "پژو پارس", "پارس", None),
    ("samand-lx", "سمند", "سمند", None),
    ("quick", "کوییک", "کوییک", None),
    ("shahin", "شاهین", "شاهین", None),
    ("atlas", "اطلس", "اطلس", None),
]

# مسیر صفحه مدل در هر پلتفرم
BAMA_PAGE = {slug: f"car/{slug}" for slug, *_ in TARGET_MODELS}
DIVAR_PAGE = {
    "tara": "tara", "dena-plus": "dena/plus", "dena": "dena",
    "runna-plus": "runna/plus", "runna": "runna", "peugeot-207i": "peugeot/207i",
    "peugeot-206": "peugeot/206", "soren-plus": "samand/soren-plus",
    "soren": "samand/soren", "peugeot-pars": "peugeot/pars", "samand": "samand",
    "quick": "quick", "shahin": "shahin", "atlas": "atlas",
}
SHEYPOOR_PAGE = {
    "tara": "tara", "dena-plus": "dena/plus", "dena": "dena",
    "runna-plus": "runna", "runna": "runna", "peugeot-207i": "peugeot/207i",
    "peugeot-206": "peugeot/206", "soren-plus": "samand/soren-plus",
    "soren": "samand/soren", "peugeot-pars": "peugeot/pars", "samand-lx": "samand",
    "quick": "quick", "shahin": "shahin", "atlas": "atlas",
}


def fetch_url(url, timeout=30):
    import http.client
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except http.client.IncompleteRead as e:
        # RSC stream شیپور گاهی ناقص می‌بندد — partial کافی است
        partial = getattr(e, "partial", b"") or b""
        if partial:
            return partial.decode("utf-8", errors="ignore")
        return ""


def fa_to_en(s):
    return str(s).translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))


def year_from_title(title):
    t = fa_to_en(title)
    m = re.search(r"(1[34]\d\d)", t)
    if m:
        return int(m.group(1))
    m = re.search(r"\b(9[0-9]|8[4-9])\b", t)
    if m:
        return 1300 + int(m.group(1))
    return 0


# ---------- باما (devalue SSR) ----------

def parse_bama_payload(html):
    """Parse the ShallowReactive devalue array → list of ad dicts (با href)."""
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL)
    payload = None
    for s in scripts:
        if "ShallowReactive" in s:
            try:
                payload = json.loads(s)
                break
            except (json.JSONDecodeError, ValueError):
                continue
    if not payload or not isinstance(payload, list):
        return []

    flat = payload

    def dv(o, depth=0):
        while isinstance(o, int) and 0 <= o < len(flat) and depth < 12:
            o = flat[o]
            depth += 1
        return o

    listing = None
    for o in flat:
        if isinstance(o, dict) and "ads" in o and "url" in o:
            listing = o
            break
    if not listing:
        return []

    ads_ref = listing["ads"]
    ads = dv(ads_ref)
    if not isinstance(ads, list):
        return []

    out = []
    for ref in ads:
        ad = flat[ref] if isinstance(ref, int) and ref < len(flat) else None
        if not isinstance(ad, dict):
            continue
        if dv(ad.get("type")) != "ad":
            continue
        p = dv(ad.get("price"))
        pv = dv(p.get("price")) if isinstance(p, dict) else p
        mileage_raw = str(dv(ad.get("mileage")) or "")
        m_num = re.sub(r"[^0-9]", "", mileage_raw)
        href = str(dv(ad.get("url")) or "")
        if href and not href.startswith("http"):
            href = "https://bama.ir" + href
        out.append({
            "title": str(dv(ad.get("title")) or ""),
            "trim": str(dv(ad.get("trim")) or ""),
            "year": str(dv(ad.get("year")) or ""),
            "mileage": int(m_num) if m_num else (0 if "صفر" in mileage_raw else -1),
            "zeroLabel": "صفر" in mileage_raw,
            "href": href,
            "location": str(dv(ad.get("location")) or ""),
            "price": int(str(pv).replace(",", "")) if pv not in (None, "0") else 0,
        })
    return out


# ---------- دیوار (SSR ناپایدار) ----------

def divar_posts(html):
    fa = lambda s_: s_.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
    out = []
    for m in re.finditer(
            r'href="(/v/[^"]+/([a-zA-Z0-9_\-]{6,12}))"[^>]*>\s*<div class="kt-post-card__body">(.*?)</a>',
            html, re.DOTALL):
        href, tok, seg = m.groups()
        t = re.search(r"<h2[^>]*>([^<]+)</h2>", seg)
        descs = re.findall(r'kt-post-card__description">([^<]+)<', seg)
        km, price, zero = -1, 0, False
        for d in descs:
            if "کیلومتر" in d:
                km = int(fa(re.sub(r"[^\d]", "", d)) or 0)
            elif "تومان" in d:
                price = int(fa(re.sub(r"[^\d]", "", d)))
            elif "صفر" in d:
                zero = True
        out.append({
            "title": t.group(1) if t else "",
            "year": str(year_from_title(t.group(1)) if t else 0),
            "mileage": km,
            "zeroLabel": zero,
            "price": price,
            "href": "https://divar.ir" + urllib.parse.unquote(href),
        })
    return out


def fetch_divar(path):
    url = "https://divar.ir" + urllib.parse.quote("/s/tehran/car/" + path)
    for _ in range(DIVAR_TRIES):
        try:
            posts = divar_posts(fetch_url(url))
            if posts:
                return posts
        except Exception as e:
            sys.stderr.write(f"[divar-retry] {path}: {str(e)[:60]}\n")
        time.sleep(THROTTLE_S)
    return []


# ---------- شیپور (RSC stream) ----------

def sheypoor_ads(html):
    env = {}
    for p in html.split(chr(92) + "n"):
        m = re.match(r"^([0-9a-f]{1,4}):(.*)$", p)
        if m:
            env[m.group(1)] = m.group(2)

    def resolve(ref, depth=0):
        ref = ref.lstrip("$")
        if ref not in env or depth > 8:
            return None
        v = env[ref]
        m = re.match(r'^\[\\+"\$([0-9a-f]{1,4})\\+"\]$', v)
        if m:
            return resolve(m.group(1), depth + 1)
        m = re.match(r'^\{\\+"label\\+":\\+"\\+",\\+"amount\\+":\\+"([\d,]+)\\+"', v)
        if m:
            return int(m.group(1).replace(",", ""))
        return None

    out, seen = [], set()
    for p in html.split(chr(92) + "n"):
        t = re.search(r'\{\\+"title\\+":\\+"([^\\+]{3,90}?)\\+",', p)
        u = re.search(r'\\+"url\\+":\\+"(https://www\.sheypoor\.com/v/[^\\+]+?)\\+"', p)
        pr = re.search(r'price\\":\\"\$([0-9a-f]{1,4})', p)
        if not (t and u):
            continue
        url = u.group(1)
        if url in seen or "script" in url:
            continue
        seen.add(url)
        out.append({
            "title": t.group(1),
            "year": str(year_from_title(t.group(1))),
            "mileage": -1,
            "zeroLabel": "صفر" in t.group(1),
            "price": resolve(pr.group(1)) if pr else 0,
            "href": url,
        })
    return out


def _is_tehran(a, platform):
    """تهران-فیلتر: bama روی location آگهی؛ divar/sheypoor از قبل URL /s/tehran/."""
    if platform != "bama":
        return True
    loc = (a.get("location") or "").strip()
    return bool(loc) and loc.split("،")[0].strip().startswith("تهران")


def cohort_filter(ads, title_kw, exclude_kw, platform):
    """فیلتر کوهورت صفر/کارکرد کم برای یک مدل یک پلتفرم."""
    out = []
    for a in ads:
        try:
            year = int(fa_to_en(re.sub(r"[^0-9۰-۹]", "", str(a.get("year", "")))) or 0)
        except ValueError:
            year = 0
        if not year:
            year = year_from_title(a.get("title", ""))
        title = a.get("title", "")
        if title_kw.lower() not in title.lower():
            continue
        if not _is_tehran(a, platform):
            continue
        if exclude_kw and exclude_kw in title:
            continue
        if "اقساط" in title or "اجاره" in title or "ثبت نام" in title:
            continue
        if year < YEAR_FLOOR:
            continue
        if not a.get("zeroLabel") and not (0 <= a.get("mileage", -1) <= MILEAGE_MAX):
            continue
        price = a.get("price") or 0
        if not isinstance(price, (int, float)) or price < PRICE_STUB_MIN:
            continue
        out.append({"year": year, **a})
    return out


def scrape_platform(platform):
    """→ {slug: (ads, median)} برای یک پلتفرم."""
    result = {}
    for slug, name_fa, title_kw, exclude_kw in TARGET_MODELS:
        ads = []
        if platform == "bama":
            page = BAMA_PAGE.get(slug)
            if not page:
                continue
            try:
                ads = parse_bama_payload(fetch_url("https://bama.ir/" + page))
            except Exception as e:
                sys.stderr.write(f"[fetch-error] bama {slug}: {e}\n")
            time.sleep(THROTTLE_S)
        elif platform == "divar":
            page = DIVAR_PAGE.get(slug)
            if not page:
                continue
            ads = fetch_divar(page)
            time.sleep(THROTTLE_S)
        elif platform == "sheypoor":
            page = SHEYPOOR_PAGE.get(slug)
            if not page:
                continue
            try:
                ads = sheypoor_ads(fetch_url("https://www.sheypoor.com/s/tehran/car/" + page))
            except Exception as e:
                sys.stderr.write(f"[fetch-error] sheypoor {slug}: {e}\n")
            time.sleep(THROTTLE_S)
        cohort = cohort_filter(ads, title_kw, exclude_kw, platform)
        if len(cohort) >= 5:
            model_median = int(statistics.median([a["price"] for a in cohort]))
            result[slug] = {"ads": cohort, "median": model_median}
            print(f"[{platform}] {slug}: median {model_median:,} cohort {len(cohort)}")
        else:
            print(f"[{platform}-skip] {slug}: cohort {len(cohort)} < 5")
    return result


def median_for(cohort_info, year):
    """میانه per-year (bucket)؛ fallback به نزدیک‌ترین سالِ دارای نمونه — نه میانه مخلوط."""
    try:
        year = int(year)
    except (TypeError, ValueError):
        return cohort_info["median"]
    if not year:
        return cohort_info["median"]
    def yv(a):
        try:
            return int(fa_to_en(re.sub(r"[^0-9۰-۹]", "", str(a.get("year") or ""))) or 0)
        except ValueError:
            return 0
    by_year = {}
    for a in cohort_info["ads"]:
        by_year.setdefault(yv(a), []).append(a["price"])
    same = by_year.get(year, [])
    if len(same) >= BUCKET_MIN:
        return int(statistics.median(same))
    # نزدیک‌ترین سال با نمونه کافی
    cand = [(abs(y - year), int(statistics.median(ps)))
            for y, ps in by_year.items() if y and len(ps) >= BUCKET_MIN]
    if cand:
        return min(cand)[1]
    return cohort_info["median"]


def scrape_deals():
    tz = datetime.timezone(datetime.timedelta(hours=3, minutes=30))
    now_iso = datetime.datetime.now(tz).isoformat(timespec="seconds")
    deals = []

    platforms = (("bama", scrape_platform("bama")),
                 ("divar", scrape_platform("divar")),
                 ("sheypoor", scrape_platform("sheypoor")))

    for platform_name, per_model in platforms:
        for slug, info in per_model.items():
            name_fa = next(n for s, n, *_ in TARGET_MODELS if s == slug)
            for a in info["ads"]:
                median = median_for(info, a.get("year") or 0)
                if a["price"] < median * FAKE_FLOOR:
                    continue  # آگهی بیعانه/قیمت‌ریزی — شکار واقعی نیست
                if a["price"] < median * DEAL_THRESHOLD:
                    discount = round((1 - a["price"] / median) * 100, 1)
                    trim = a.get("trim") or ""
                    if not trim and platform_name in ("divar", "sheypoor"):
                        trim = ""
                    deals.append({
                        "slug": slug,
                        "name": name_fa,
                        "trim": trim,
                        "title": a.get("title", "") if platform_name != "bama" else "",
                        "year": a.get("year") or 0,
                        "price": a["price"],
                        "marketMedian": median,
                        "discountPct": discount,
                        "source": platform_name,
                        "platform": platform_name,
                        "href": a.get("href") or f"https://{platform_name}.ir",
                        "fetchedAt": now_iso,
                    })
        n = sum(1 for d in deals if d["platform"] == platform_name)
        # sheypoor search cards expose no mileage → cohort gate starves it → 0 deals is structural, not a fetch failure
        note = " (cohort<5: search cards expose no mileage)" if n == 0 and platform_name == "sheypoor" else ""
        print(f"[deals:{platform_name}] {n} deals{note}")

    deals.sort(key=lambda d: -d["discountPct"])
    return deals, now_iso


def main():
    os.makedirs(HISTORY_DIR, exist_ok=True)
    deals, now_iso = scrape_deals()

    backup_path = os.path.join(HISTORY_DIR, f"deals-{now_iso[:10]}.json")
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump({"generated": now_iso, "sources": ["bama", "divar", "sheypoor"], "deals": deals}, f, ensure_ascii=False, indent=2)

    lines = [
        "/**",
        " * شکارها — آگهی‌های چشمگیر ارزان‌تر از میانه بازار (چند-پلتفرمی: bama + divar + sheypoor)",
        " * تولید خودکار توسط scripts/deal-scraper.py — دستی ویرایش نکنید.",
        f" * آخرین بروزرسانی: {now_iso}",
        " */",
        "",
        "window.carDeals = [",
    ]
    for d in deals:
        lines.append(" " + json.dumps(d, ensure_ascii=False) + ",")
    lines.append("];")
    lines.append("")
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    per_platform = {}
    for d in deals:
        per_platform[d["platform"]] = per_platform.get(d["platform"], 0) + 1
    print(f"\nSummary: {len(deals)} deals → {OUT_FILE}")
    print("Per-platform:", per_platform)
    print(f"Backup: {backup_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
