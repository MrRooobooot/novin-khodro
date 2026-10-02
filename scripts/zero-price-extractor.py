#!/usr/bin/env python3
"""
Novin Khodro — Zero-km (صفر) Free-Market Price Extractor, dual-source edition.

منبع ۱ (اصلی): hamrah-mechanic.com/carprice — همه تیپ‌ها (trim) همه برندهای
ایرانی در یک fetch (پژو ۲۰۷ با هر تیپ قیمت خودش، ایران‌خودرو/سایپا/کرمان‌موتور/...).
منبع ۲ (cross-check): bama.ir — کوهورت صفر کیلومتر برای مدل‌های هدف؛ قیمتش به
عنوان bamaPrice اختیاری روی رکورد می‌نشیند.

خروجی: js/data/zero-prices.js  — window.zeroPrices = [{brand, brandName, slug,
name (فارسی کامل با trim), model, trim, yearLabel, price, priceFormatted,
priceMillion, source:'hamrah-mechanic', sourceFa, samples, href, bamaPrice?,
prevPrice?, stale?}] + بکاپ تاریخ‌دار .hermes/price-history/<date>.json

فیلتر: سال >= ۱۴۰۳، حذف ردیف‌های بدون قیمت. نگه‌داری prevPrice از فایل قبلی
(تطبیق brand+model+trim+year). فقط stdlib (urllib) — throttle ۲.۵s.
"""

import urllib.request
import urllib.error
import urllib.parse
import json
import re
import sys
import os
import time
import statistics
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_FILE = os.path.join(ROOT, "js", "data", "zero-prices.js")
HISTORY_DIR = os.path.join(ROOT, ".hermes", "price-history")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.7",
}

THROTTLE_S = 2.5
YEAR_FLOOR = 1403
MILEAGE_MAX = 5000
PRICE_STUB_MIN = 1_000_000_000

# برندهای ایرانی نگهداری‌شده در سکشن (همراه مکانیک URL-brand → نام فارسی)
IRANIAN_BRANDS = {
    "irankhodro": "ایران‌خودرو",
    "saipa": "سایپا",
    "modirankhodro": "مدیران‌خودرو",
    "kermanmotor": "کرمان‌موتور",
    "kmc": "کرمان‌موتور",
    "xtrim": "ایکس‌تریم",
    "parskhodro": "پارس‌خودرو",
    "bahmangroup": "گروه بهمن",
    "bahman": "گروه بهمن",
    "fardamotors": "فردا موتور",
    "tigard": "تیگارد",
    "lamari": "لاماری",
    "artabanmotors": "آرتابان",
    "avatar": "آواتار",
    "cheval": "شوالیه",
    "mvm": "ام‌وی‌ام",
    "jac": "جک",
    "changan": "چانگان",
    "haima": "هایما",
    "baic": "بایک",
    "fownix": "فونیکس",
    "fownixmotor": "فونیکس",
    # — از car.ir/khodro45 (برندهای اضافی؛ توسط normalize_carir_brand پر می‌شود) —
    "toyota": "تویوتا",
    "nissan": "نیسان",
    "kia": "کیا",
    "hyundai": "هیوندای",
    "chery": "چری",
    "mg": "ام‌جی",
    "mazda": "مزدا",
    "gac": "جی‌ای‌سی",
    "bestune": "بستیون",
    "jetta": "جتا",
    "skoda": "اسکودا",
    "haval": "هاوال",
    "geely": "جیلی",
    "dongfeng": "دانگ‌فنگ",
    "dong-feng": "دانگ‌فنگ",
    "byd": "بی‌وای‌دی",
    "bmw": "بی‌ام‌و",
    "audi": "آئودی",
    "volkswagen": "فولکس‌واگن",
    "renault": "رنو",
    "opel": "اپل",
    "mitsubishi": "میتسوبیشی",
    "honda": "هوندا",
    "suzuki": "سوزوکی",
    "great-wall": "گریت وال",
    "zhong-xing": "ژانگ ژینگ",
    "dayun": "دایون",
    "max-motor": "مکث موتور",
    "swm": "اس‌دبلیو‌ام",
    "foton": "فوتون",
    "tank": "تانک",
    "maxus": "مکسوس",
    "fiat": "فیات",
    "leap-motor": "لیپ موتور",
    "lamaco": "لاماکو",
    "eres": "ایرس",
    "maanian": "مانیان",
    "lucano": "لوکانو",
    "bm-cars": "بی‌ام‌کارز",
    "venocia": "ونوسیا",
    "hongqi": "هونگچی",
    "zotye": "زوتی",
    "bac": "بی‌ای‌سی",
    "bmwcars": "بی‌ام‌کارز",
}

# model segment همراه‌مکانیک → slug پروفایل موجود (در غیر این‌صورت خود segment)
MODEL_SLUG_MAP = {
    "peugeot207": "peugeot-207i",
    "peugeot206": "peugeot-206",
    "tara": "tara",
    "denaplus": "dena-plus",
    "dena": "dena",
    "runnaplus": "runna-plus",
    "runna": "runna",
    "sorenplus": "soren-plus",
    "soren": "soren",
    "peugeotpars": "peugeot-pars",
    "samand": "samand-lx",
}

# slug bama → model segment همراه‌مکانیک (برای cross-check)
BAMA_MODEL_TO_HM = {
    "tara": "tara",
    "dena-plus": "denaplus",
    "dena": "dena",
    "runna-plus": "runnaplus",
    "runna": "runna",
    "peugeot-207i": "peugeot207",
    "peugeot-206": "peugeot206",
    "soren-plus": "sorenplus",
    "soren": "soren",
    "peugeot-pars": "peugeotpars",
    "samand-lx": "samand",
}

# (bama page, display name, title keyword) — همان لیست قبلی، برای cross-check
TARGET_MODELS = [
    ("tara", ["car/tara"], "تارا", "تارا"),
    ("dena-plus", ["car/dena-plus"], "دنا پلاس", "دنا"),
    ("dena", ["car/dena"], "دنا", "دنا"),
    ("runna-plus", ["car/runna-plus"], "رانا پلاس", "رانا"),
    ("runna", ["car/runna"], "رانا", "رانا"),
    ("peugeot-207i", ["car/peugeot-207"], "پژو ۲۰۷ی", "207"),
    ("peugeot-206", ["car/peugeot-206ir"], "پژو ۲۰۶", "206"),
    ("soren-plus", ["car/samand-soren-plus"], "سورن پلاس", "سورن"),
    ("soren", ["car/samand-soren"], "سورن", "سورن"),
    ("peugeot-pars", ["car/peugeot-pars"], "پژو پارس", "پارس"),
    ("samand-lx", ["car/samand"], "سمند LX", "سمند"),
]


def fetch_url(url, timeout=30):
    # retry: transient SSL/DNS glitches (ISP) aborted a whole cron run 2026-09-12 13:47
    # 2026-09-13 recurrence: 6s total backoff was too short for negative-DNS cache TTL (~30s); widened
    import ssl
    last = RuntimeError("fetch failed")
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            ctx = None
            if attempt >= 2:
                # last resort: unverified — read-only public price data
                ctx = ssl._create_unverified_context()
                print(f"[warn] ssl-fallback (unverified) for {url}", file=sys.stderr)
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            last = e
            time.sleep(12 * (attempt + 1))
    raise last


# ---------- منبع ۱: hamrah-mechanic ----------

HREF_RE = re.compile(r'href="(/carprice/[^"]+)"')
NAME_RE = re.compile(r'model__name__fYre5">([^<]+)<')
TYPE_RE = re.compile(r'type__\w+"><span>([^<]*)</span>-<span>([^<]*)</span>')
PRICE_RE = re.compile(r'>([\u200c\d,]{7,})<')


def parse_hamrah(html):
    """→ [{brand, model, trim, year, price, href}] — همه ردیف‌های جدول قیمت."""
    out = []
    for chunk in html.split("carsBrandPriceList_price-table__row")[1:]:
        h = HREF_RE.search(chunk)
        n = NAME_RE.search(chunk)
        if not h or not n:
            continue
        href = h.group(1)
        parts = href.split("/")
        brand = parts[2] if len(parts) > 3 else ""
        model = parts[3] if len(parts) > 4 else ""
        t = TYPE_RE.search(chunk)
        trim = t.group(1).strip() if t else ""
        try:
            year = int(re.sub(r"[^0-9]", "", t.group(2)) or 0) if t else 0
        except ValueError:
            year = 0
        p = PRICE_RE.search(chunk)
        price = 0
        if p:
            digits = re.sub(r"[^\d]", "", p.group(1).replace("\u200c", ""))
            price = int(digits) if digits else 0
        out.append({
            "brand": brand,
            "model": model,
            "trim": trim,
            "year": year,
            "price": price,
            "href": "https://www.hamrah-mechanic.com" + href,
        })
    return out


def fa_digits(n):
    return str(n).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def format_price_toman(price):
    return fa_digits(f"{price:,}").replace(",", "٫") + " تومان"


def trim_slug(s):
    s = s.replace("\u200c", "").replace(" ", "-")
    s = re.sub(r"[^A-Za-z0-9-]", "", s)
    return s.lower() or "base"


def hamrah_records(raw_rows, prev_by_key):
    """فیلتر برند ایرانی + سال>=۱۴۰۳ + قیمت>۰ → رکوردهای نهایی."""
    tz = datetime.timezone(datetime.timedelta(hours=3, minutes=30))
    now_iso = datetime.datetime.now(tz).isoformat(timespec="seconds")
    records = []
    seen = set()
    for r in raw_rows:
        if r["brand"] not in IRANIAN_BRANDS:
            continue
        if r["price"] <= 0:
            continue
        if r["price"] < PRICE_STUB_MIN:
            continue
        if r["year"] and r["year"] < YEAR_FLOOR:
            continue
        brand_name = IRANIAN_BRANDS[r["brand"]]
        model = r["model"] or "unknown"
        trim = r["trim"] or "پایه"
        model_fa = r.get("model")  # لاتین؛ name فارسی از model__name می‌آید
        key = (r["brand"], model, trim, r["year"])
        if key in seen:
            continue
        seen.add(key)
        base_name = r["name"] if r.get("name") else model
        name = f"{base_name} {trim}".strip()
        slug = MODEL_SLUG_MAP.get(model, model)
        rec = {
            "brand": r["brand"],
            "brandName": brand_name,
            "slug": slug,
            "name": name,
            "model": model,
            "trim": trim,
            "yearLabel": fa_digits(r["year"] or YEAR_FLOOR),
            "price": int(round(r["price"] / 1_000_000) * 1_000_000),
            "priceFormatted": format_price_toman(int(round(r["price"] / 1_000_000) * 1_000_000)),
            "priceMillion": round(r["price"] / 1_000_000),
            "source": "hamrah-mechanic",
            "sourceFa": "همراه مکانیک",
            "samples": 1,
            "href": r["href"],
            "fetchedAt": now_iso,
        }
        old = prev_by_key.get(key)
        if old and old.get("price") and old["price"] != r["price"]:
            rec["prevPrice"] = old["price"]
        records.append(rec)
    return records


# ---------- منبع ۲: bama (cross-check) ----------

def parse_bama_payload(html):
    """Parse the ShallowReactive devalue array → list of ad dicts."""
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
        out.append({
            "title": str(dv(ad.get("title")) or ""),
            "trim": str(dv(ad.get("trim")) or ""),
            "year": str(dv(ad.get("year")) or ""),
            "mileage": int(m_num) if m_num else (0 if "صفر" in mileage_raw else -1),
            "zeroLabel": "صفر" in mileage_raw,
            "price": int(str(pv).replace(",", "")) if pv not in (None, "0") else 0,
        })
    return out


def zero_km_cohort(ads, title_kw, slug="", exclude_kw=None):
    out = []
    for a in ads or []:
        try:
            year = int(re.sub(r"[^0-9]", "", a.get("year", "")) or 0)
        except ValueError:
            year = 0
        title = a.get("title", "")
        if title_kw.lower() not in title.lower():
            continue
        if exclude_kw and exclude_kw in title:
            continue
        if year < YEAR_FLOOR and not (a.get("zeroLabel") and year == 0):
            continue
        if not a.get("zeroLabel") and not (0 <= a.get("mileage", -1) <= MILEAGE_MAX):
            continue
        if a.get("price", 0) < PRICE_STUB_MIN:
            continue
        out.append(a)
    return out


def bama_medians():
    """→ {hm_model: median price} برای cross-check با hamrah."""
    medians = {}
    for slug, pages, name, title_kw in TARGET_MODELS:
        all_ads = []
        for page in pages:
            try:
                all_ads += parse_bama_payload(fetch_url(f"https://bama.ir/{page}"))
            except Exception as e:
                sys.stderr.write(f"[fetch-error] bama {slug} ({page}): {e}\n")
            time.sleep(THROTTLE_S)
        exclude_kw = None
        if slug in ("runna", "dena", "soren"):
            exclude_kw = "پلاس"
        cohort = zero_km_cohort(all_ads, title_kw, slug=slug, exclude_kw=exclude_kw)
        if cohort:
            med = int(statistics.median([a["price"] for a in cohort]))
            medians[BAMA_MODEL_TO_HM.get(slug, slug)] = med
            print(f"[bama-ok] {slug}: median {med:,} from {len(cohort)} ads")
        else:
            print(f"[bama-skip] {slug}: no zero-km cohort")
    return medians


# ---------- منبع ۳: car.ir/prices ----------

# ردیف جدول car.ir: لینک /<id>-<model>-<trim> + دو span (نام فارسی، مدل سال)
CARIR_ROW_RE = re.compile(
    r'<a href="(/(\d+)-([a-z0-9\-]+))" class="trim-cell__title"><span>([^<]*)</span><span>([^<]*)</span></a>'
    r'.*?price-cell__price">([\d,]+)\s*<small[^>]*> تومان'
    r'(?:.*?price-cell__price">([\d,]+)\s*<small[^>]*> تومان)?',
    re.DOTALL)
CARIR_TRIM_OPTION_RE = re.compile(r'trim-cell__option[^>]*>([^<]*)<')

# brand slug داخل لینک car.ir (مثل 'iran-khodro'، 'kermanmotor-kmc') → brand کلید داخلی
CARIR_BRAND_FIX = {
    "iran-khodro": "irankhodro",
    "kermanmotor-kmc": "kmc",
    "kermanmotor": "kermanmotor",
    "peugeot": "irankhodro",
    "saipa": "saipa",
    "bahman": "bahmangroup",
    "dong-feng": "dongfeng",
    "bm-cars": "bmwcars",
    "great-wall": "greatwall",
    "zhong-xing": "zhongxing",
    "max-motor": "maxmotor",
    "leap-motor": "leapmotor",
}


def _fa_to_en_digits(s):
    return s.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))


def parse_carir(html):
    """→ [{name, model, trim, year, marketPrice, factoryPrice, href, brandSlug}]"""
    out = []
    for m in CARIR_ROW_RE.finditer(html):
        href, _cid, seg, name, year_span, market, factory = m.groups()
        name = name.strip()
        model = seg
        trim = ""
        # بخش آخر segment بعد از مدل معمولا trim لاتین است — از name استفاده می‌کنیم
        year = int(re.sub(r"[^0-9]", "", _fa_to_en_digits(year_span or "")) or 0)
        mk = lambda s: int(s.replace(",", "")) if s else 0
        market_p, factory_p = mk(market), mk(factory)
        # option (اکسکلوسیو و ...) اگر در دنباله همین ردیف
        tail = html[m.end():m.end() + 400]
        topt = CARIR_TRIM_OPTION_RE.search(tail)
        if topt and "</tr>" in tail[:tail.find("trim-cell__option") or 400]:
            trim = topt.group(1).strip()
        out.append({
            "name": name, "model": model, "trim": trim, "year": year,
            "marketPrice": market_p, "factoryPrice": factory_p,
            "href": "https://car.ir" + href,
            "brandSlug": seg.split("-")[0],
        })
    return out


def carir_year_filter(rows):
    """حذف مدل‌های میلادی خارجی سال قدیم؛ نگه‌داشتن سال >= 1403 (شمسی) یا >= 2023 (میلادی)"""
    return [r for r in rows if r["year"] >= YEAR_FLOOR or r["year"] >= 2023]


def carir_records(rows, prev_by_key):
    tz = datetime.timezone(datetime.timedelta(hours=3, minutes=30))
    now_iso = datetime.datetime.now(tz).isoformat(timespec="seconds")
    records = []
    seen = set()
    for r in rows:
        if r["marketPrice"] <= 0:
            continue
        if r["marketPrice"] < PRICE_STUB_MIN:
            continue
        brand = CARIR_BRAND_FIX.get(r["brandSlug"], r["brandSlug"])
        brand_name = IRANIAN_BRANDS.get(brand)
        if not brand_name:
            # برند خارجی/ناخواسته — skip (بازار قیمت صفر داخلی هدف ماست؛ اما نام فارسی داریم، نگه نمی‌داریم)
            continue
        trim = r["trim"] or "پایه"
        year_label = fa_digits(r["year"]) if r["year"] >= 1403 else fa_digits(r["year"])
        key = ("carir", r["model"], trim, r["year"])
        if key in seen:
            continue
        seen.add(key)
        name = r["name"] + ((" " + trim) if trim != "پایه" else "")
        price = int(round(r["marketPrice"] / 1_000_000) * 1_000_000)
        rec = {
            "brand": brand,
            "brandName": brand_name,
            "slug": MODEL_SLUG_MAP.get(r["model"], r["model"]),
            "name": name,
            "model": r["model"],
            "trim": trim,
            "yearLabel": year_label,
            "price": price,
            "priceFormatted": format_price_toman(price),
            "priceMillion": round(price / 1_000_000),
            "source": "car.ir",
            "sourceFa": "خودرو (car.ir)",
            "samples": 1,
            "href": r["href"],
            "fetchedAt": now_iso,
            "carIrPrice": r["marketPrice"],
        }
        if r["factoryPrice"] > 0:
            rec["factoryPrice"] = r["factoryPrice"]
        old = prev_by_key.get(key)
        if old and old.get("price") and old["price"] != price:
            rec["prevPrice"] = old["price"]
        records.append(rec)
    return records


def merge_by_model_key(records):
    """merge رکوردهای car.ir با hamrah بر اساس (brandName نرمال‌شده + نام مدل/تیپ نرمال‌شده)"""
    return records


# ---------- منبع ۴: khodro45 (REST API — ۹۴ تیپ فعال) ----------

K45_API = "https://khodro45.com/api/v1/pricing/dailycars/?limit=100&offset=0"


def parse_khodro45():
    """→ [{brandTitle, modelTitle, trim, option, year, marketPrice, factoryPrice, href}]"""
    data = json.loads(fetch_url(K45_API))
    out = []
    for grp in data.get("results", []):
        brand_t = grp.get("brand", {}).get("title", "")
        for m in grp.get("models", []):
            model_t = m.get("model", {}).get("title", "")
            model_slug = m.get("model", {}).get("seo_slug", "")
            for it in m.get("items", []):
                ty = it.get("trimyear", {})
                trim = ty.get("trim", {}).get("title", "")
                year_t = ty.get("year", {}).get("title", "")
                option = (ty.get("option") or {}).get("title", "")
                prices = it.get("prices", {})
                market = (prices.get("market") or {}).get("price") or 0
                factory = (prices.get("company") or {}).get("price") or 0
                if market <= 0:
                    continue
                out.append({
                    "brandTitle": brand_t,
                    "modelTitle": model_t,
                    "modelSlug": model_slug,
                    "trim": trim,
                    "option": option,
                    "year": int(re.sub(r"[^0-9]", "", _fa_to_en_digits(year_t or "")) or 0),
                    "marketPrice": int(market),
                    "factoryPrice": int(factory),
                    "href": "https://khodro45.com/pricing/",
                })
    return out


def khodro45_records(rows, prev_by_key):
    tz = datetime.timezone(datetime.timedelta(hours=3, minutes=30))
    now_iso = datetime.datetime.now(tz).isoformat(timespec="seconds")
    records = []
    seen = set()
    for r in rows:
        if r["marketPrice"] < PRICE_STUB_MIN:
            continue
        if r["year"] and r["year"] < 2020 and r["year"] < YEAR_FLOOR:
            continue
        key = ("k45", r["modelSlug"], r["trim"], r["year"])
        if key in seen:
            continue
        seen.add(key)
        trim = " ".join(x for x in (r["trim"], r["option"]) if x) or "پایه"
        price = int(round(r["marketPrice"] / 1_000_000) * 1_000_000)
        rec = {
            "brand": r["modelSlug"].split("-")[0] if r["modelSlug"] else "khodro45",
            "brandName": r["brandTitle"],
            "slug": r["modelSlug"],
            "name": f'{r["brandTitle"]} {r["modelTitle"]} {trim}'.strip(),
            "model": r["modelSlug"],
            "trim": trim,
            "yearLabel": fa_digits(r["year"]),
            "price": price,
            "priceFormatted": format_price_toman(price),
            "priceMillion": round(price / 1_000_000),
            "source": "khodro45",
            "sourceFa": "خودرو ۴۵",
            "samples": 1,
            "href": r["href"],
            "fetchedAt": now_iso,
        }
        if r["factoryPrice"] > 0:
            rec["factoryPrice"] = r["factoryPrice"]
        old = prev_by_key.get(key)
        if old and old.get("price") and old["price"] != price:
            rec["prevPrice"] = old["price"]
        records.append(rec)
    return records


def dedupe_multi_source(records):
    """حذف تکراری بین منابع: کلید نرمال‌شده (brandName + مدل/تیپ فارسی نرمال + سال). اولویت: hamrah > car.ir > khodro45"""
    PRIO = {"hamrah-mechanic": 0, "car.ir": 1, "khodro45": 2, "bama": 3}
    norm = lambda s: re.sub(r"[\s\u200cـ]+", "", str(s or ""))
    best = {}
    for r in records:
        key = (norm(r.get("brandName")), norm(r.get("trim"))[:12], norm(r.get("yearLabel")))
        cur = best.get(key)
        if not cur or PRIO.get(r["source"], 9) < PRIO.get(cur["source"], 9):
            # ادغام قیمت منابع دیگر به‌عنوان فیلد جدا
            if cur:
                for f in ("bamaPrice", "carIrPrice", "k45Price"):
                    if f not in r and cur.get(f):
                        r[f] = cur[f]
            best[key] = r
        else:
            for f in ("bamaPrice", "carIrPrice", "k45Price"):
                if f not in best[key] and cur.get(f):
                    best[key][f] = cur[f]
    return list(best.values())


# ---------- منبع ۵: karnameh (کوئری SSR __NEXT_DATA__ — میانگین ۶۰٪/۱۴۰٪ برند) ----------

KARNAMEH_URL = "https://karnameh.com/car-price/manufacturer_country/domestic"

# brand_en karnameh → brand کلید داخلی IRANIAN_BRANDS
KARNAMEH_BRAND_MAP = {
    "IranKhodro": "irankhodro", "Peugeot": "irankhodro", "Samand": "irankhodro",
    "Dena": "irankhodro", "Runna": "irankhodro", "Tara": "irankhodro", "Rira": "irankhodro",
    "Saipa": "saipa", "Pride": "saipa", "Quick": "saipa", "Saina": "saipa", "Shahin": "saipa",
    "Atlas": "saipa", "Sahand": "saipa", "KMC": "kmc", "Zamiad": "saipa",
    "Pars Khodro": "parskhodro", "MVM": "mvm", "JAC": "jac", "Changan": "changan",
    "Haima": "haima", "Chery": "chery", "MG": "mg", "Fownix": "fownix", "Bahman": "bahmangroup",
    "KermanMotor": "kermanmotor", "ModiranKhodro": "modirankhodro", "Fidelity": "bahmangroup",
    "Dignity": "bahmangroup", "Lamari": "lamari", "Tigard": "tigard", "Farda": "fardamotors",
    "BAIC": "baic", "BYD": "byd", "Haval": "haval", "GAC": "gac",
}


def parse_karnameh():
    """→ {brand_fa: {avg60, avg140, count}} از dehydratedState در __NEXT_DATA__."""
    html = fetch_url(KARNAMEH_URL)
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        raise ValueError("karnameh __NEXT_DATA__ not found")
    d = json.loads(m.group(1))
    queries = d["props"]["pageProps"]["dehydratedState"]["queries"]
    for q in queries:
        data = (q.get("state") or {}).get("data")
        if isinstance(data, list) and data and isinstance(data[0], dict) and "average_60_percent_of_price" in data[0]:
            return {e["brand_fa"]: {"avg60": e["average_60_percent_of_price"],
                                    "avg140": e.get("average_140_percent_of_price") or 0,
                                    "count": e.get("count") or 0} for e in data}
    raise ValueError("karnameh getZeroPriceList not found")


def attach_karnameh(records, karnameh_data):
    """فیلد karnamehAvg روی رکوردهایی که نام فارسی برند/مدل‌شان در karnameh هست."""
    if not karnameh_data:
        return 0
    norm = lambda s: re.sub(r"[\s\u200cـ]+", "", str(s or ""))
    kn = {norm(k): v for k, v in karnameh_data.items()}
    n = 0
    for r in records:
        for key in (norm(r.get("brandName")), norm(r.get("name")).split("پژو")[-1]):
            hit = kn.get(key)
            if not hit:
                # تطبیق برند روی ابتدای نام رکورد (مثل «رانا پلاس ...» → رانا)
                for bk, bv in kn.items():
                    if bk and (norm(r.get("name")).startswith(bk) or bk == norm(r.get("brandName"))):
                        hit = bv
                        break
            if hit and hit.get("avg60"):
                r["karnamehAvg"] = int(round(hit["avg60"] / 1_000_000) * 1_000_000)
                n += 1
                break
    return n


# ---------- منبع ۶: khodrobank.com (لیست ۱۱۸ مدل — قیمت نمایندگی/بازار) ----------

KHODROBANK_URL = "https://www.khodrobank.com/قیمت-خودرو"


def parse_khodrobank():
    """→ [{brandFa, name, price, href}] از صفحه لیست قیمت خودروبانک."""
    html = fetch_url(urllib.parse.quote(KHODROBANK_URL, safe=":/"))
    out = []
    for m in re.finditer(r"href='(/cars/[^']+)'[^>]*class=[\"']title-link[\"']>\s*([^<]+)<", html):
        tail = html[m.end():m.end() + 1500]
        pm = re.search(r"([\d,]{9,})\s*تومان", tail)
        if not pm:
            continue
        href = m.group(1)
        brand_fa = urllib.parse.unquote(href).split("/cars/")[1].split("/")[0]
        out.append({
            "brandFa": brand_fa,
            "name": m.group(2).strip(),
            "price": int(pm.group(1).replace(",", "")),
            "href": "https://www.khodrobank.com" + urllib.parse.unquote(href),
        })
    return out


def attach_khodrobank(records, kb_rows):
    """فیلد khodrobankPrice با تطبیق نرمال‌شده نام فارسی رکورد و نام ردیف خودروبانک."""
    if not kb_rows:
        return 0
    norm = lambda s: re.sub(r"[\s\u200cـ\-]+", "", str(s or "")).lower()
    kb = [(norm(e["name"]), e) for e in kb_rows]
    n = 0
    for r in records:
        rn = norm(r.get("name"))
        if not rn:
            continue
        for kn, e in kb:
            # تطبیق دوطرفه حداقل ۸ نویسه مشترک
            if (rn in kn or kn in rn) and min(len(rn), len(kn)) >= 8:
                r["khodrobankPrice"] = int(round(e["price"] / 1_000_000) * 1_000_000)
                r["khodrobankHref"] = e["href"]
                n += 1
                break
    return n


# ---------- منبع ۷: divar (SSR صفحه مدل — کوهورت صفر، cross-check + شکار) ----------

DIVAR_MODEL_PAGES = {
    "tara": ["tara"],
    "dena-plus": ["dena/plus"],
    "dena": ["dena"],
    "runna-plus": ["runna/plus"],
    "runna": ["runna"],
    "peugeot207": ["peugeot/207i"],
    "peugeot206": ["peugeot/206"],
    "sorenplus": ["samand/soren-plus"],
    "soren": ["samand/soren"],
    "peugeotpars": ["peugeot/pars"],
    "samand": ["samand"],
    "quick": ["quick"],
    "shahin": ["shahin"],
    "atlas": ["atlas"],
}

DIVAR_FETCH_TRIES = 4


def divar_posts(html):
    """→ [{tok, title, km, zero, price, year, href}] از SSR دیوار (اگر صفحه کامل باشد)."""
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
        year = 0
        if t:
            ym = re.search(r"(1[34]\d\d)", fa(t.group(1)))
            if ym:
                year = int(ym.group(1))
        out.append({
            "tok": tok, "title": t.group(1) if t else "", "km": km, "zero": zero,
            "price": price, "year": year,
            "href": "https://divar.ir" + urllib.parse.unquote(href),
        })
    return out


def fetch_divar_model(model_paths):
    """با تلاش مجدد (SSR دیوار ناپایدار است) → لیست آگهی یا []."""
    for path in model_paths:
        url = "https://divar.ir" + urllib.parse.quote("/s/tehran/car/" + path)
        for _ in range(DIVAR_FETCH_TRIES):
            try:
                html = fetch_url(url)
                posts = divar_posts(html)
                if posts:
                    return posts
            except Exception as e:
                sys.stderr.write(f"[divar-retry] {path}: {str(e)[:60]}\n")
            time.sleep(THROTTLE_S)
    return []


def divar_medians():
    """→ {hm_model: {median, zeroAds}} کوهورت صفر دیوار برای مدل‌های هدف."""
    medians = {}
    for model, paths in DIVAR_MODEL_PAGES.items():
        posts = fetch_divar_model([paths[0]])
        cohort = [p for p in posts
                  if p["price"] >= PRICE_STUB_MIN
                  and p["year"] >= YEAR_FLOOR
                  and (p["zero"] or 0 <= p["km"] <= MILEAGE_MAX)
                  and "اقساط" not in p["title"]]
        if len(cohort) >= 3:
            med = int(statistics.median([p["price"] for p in cohort]))
            medians[model] = {"median": med, "ads": cohort}
            print(f"[divar-ok] {model}: median {med:,} from {len(cohort)} ads")
        else:
            print(f"[divar-skip] {model}: cohort {len(cohort)} < 3")
        time.sleep(THROTTLE_S)
    return medians


# ---------- منبع ۵ prev & output ----------

def load_prev_by_key():
    if not os.path.exists(OUT_FILE):
        return {}
    try:
        src = open(OUT_FILE, encoding="utf-8").read()
        m = re.search(r"window\.zeroPrices\s*=\s*(\[.*?\]);", src, re.DOTALL)
        if not m:
            return {}
        prev = json.loads(re.sub(r",\s*]$", "]", m.group(1)))
        out = {}
        for r in prev:
            yr = int(_fa_to_en_digits(str(r.get("yearLabel", ""))) or 0)
            key = (r.get("brand", ""), r.get("model", r.get("slug", "")),
                   r.get("trim", ""), yr)
            out[key] = r
        return out
    except Exception as e:
        sys.stderr.write(f"[warn] cannot read previous zero-prices.js: {e}\n")
        return {}


def main():
    os.makedirs(HISTORY_DIR, exist_ok=True)
    tz = datetime.timezone(datetime.timedelta(hours=3, minutes=30))
    now_iso = datetime.datetime.now(tz).isoformat(timespec="seconds")
    today = now_iso[:10]
    prev_by_key = load_prev_by_key()

    # --- منبع ۱: hamrah-mechanic ---
    try:
        html = fetch_url("https://www.hamrah-mechanic.com/carprice/")
        raw_rows = parse_hamrah(html)
        # name فارسی از model__name__fYre5 در همان chunk — دوباره بگیر (parse_hamrah فقط ساختار)
        records = []
        chunks = html.split("carsBrandPriceList_price-table__row")[1:]
        # بازسازی: name را از همان chunk وصل کن
        idx = 0
        name_by_row = []
        for chunk in chunks:
            n = NAME_RE.search(chunk)
            h = HREF_RE.search(chunk)
            name_by_row.append((h.group(1) if h else None, n.group(1).strip() if n else None))
        # attach names
        by_href = {href: nm for href, nm in name_by_row if href}
        for r in raw_rows:
            href_tail = r["href"].replace("https://www.hamrah-mechanic.com", "")
            r["name"] = by_href.get(href_tail, "")
        records = hamrah_records(raw_rows, prev_by_key)
    except Exception as e:
        sys.stderr.write(f"[fatal] hamrah-mechanic fetch failed: {e}\n")
        records = []
    # ponytail: آستانه سخت‌گیرانه؛ با تغییر ساختار صفحه hamrah آستانه را بازبینی کن.
    hamrah_n = len(records)
    # --- منبع ۳: car.ir/prices ---
    carir_recs = []
    try:
        chtml = fetch_url("https://car.ir/prices")
        crows = carir_year_filter(parse_carir(chtml))
        carir_recs = carir_records(crows, prev_by_key)
        print(f"[carir-ok] parsed {len(crows)} rows → {len(carir_recs)} records")
    except Exception as e:
        sys.stderr.write(f"[warn] car.ir fetch failed: {e}\n")
    time.sleep(THROTTLE_S)

    # --- منبع ۴: khodro45 API ---
    k45_recs = []
    try:
        krows = parse_khodro45()
        k45_recs = khodro45_records(krows, prev_by_key)
        print(f"[k45-ok] parsed {len(krows)} rows → {len(k45_recs)} records")
    except Exception as e:
        sys.stderr.write(f"[warn] khodro45 fetch failed: {e}\n")

    # ادغام همه منابع + حذف تکراری بین‌منبعی
    records = dedupe_multi_source(records + carir_recs + k45_recs)

    # گارد: اگر منبع اصلی (hamrah) خالی بود، خروجی قبلی را با data-less جایگزین نکن.
    if hamrah_n < 100:
        sys.stderr.write(f"[abort] hamrah records={hamrah_n} (<100) — refusing to rewrite zero-prices.js\n")
        return 3

    # سال عددی در رکورد برای تطبیق next-run
    for r in records:
        m = re.sub(r"[^0-9]", "", r["yearLabel"])
        r["yearNum"] = int(m) if m else 0

    # --- منبع ۲: bama cross-check ---
    bama_prices = bama_medians()
    for r in records:
        bp = bama_prices.get(r["model"])
        if bp:
            r["bamaPrice"] = bp

    # --- منبع ۵: karnameh — R74: کور شده (تطبیق برند-سطح = خطای −۳۰٪ تا −۵۹٪؛
    # میانگین «برند» روی تیپ اشتباه می‌نشست و اطلاعات غلط می‌ساخت. اگر روزی
    # تطبیق مدل/تیپ دقیق آمد، برگردانده می‌شود.) ---
    karnameh_n = 0
    # R74: attach_karnameh حذف شد — میانگین برند-سطح روی تیپ‌ها می‌نشست (خطای تا −۵۹٪).
    # در عوض یک pass «فرسایش میراث» دارد: رکوردهای قدیمی که karnamehAvg/khodrobankPrice
    # از اجراهای قبلی به ارث برده‌اند هم تمیز می‌شوند.

    # --- منبع ۶: khodrobank.com — R74: کور شده (تطبیق زیررشته‌ای نام فارسی قیمت
    # «نمایندگی/کارخانه» را جای «بازار» می‌نشاند: −۸۴٪ تا −۹۰٪ غلط) ---
    khodrobank_n = 0
    # R74: attach_khodrobank حذف شد — همان pass فرسایش میراث پایین، فیلدهای قدیمی را هم پاک می‌کند.

    # --- R74: فرسایش میراث — فیلدهای خرابِ به‌ارث‌رسیده از اجراهای قبل پاک می‌شوند
    # (karnamehAvg/khodrobankPrice هرگز به‌عنوان قیمت نمایش نمی‌آیند ولی دادهٔ غلط
    # در فایل نمی‌ماند). prev_by_key از فایل قبلی می‌آید؛ اینجا روی خود prev هم اعمال می‌شود
    # تا prevPrice سالم بماند ولی فیلدهای کور نشده منتقل نشوند. ---
    stripped = 0
    for r in records:
        for f in ("karnamehAvg", "khodrobankPrice", "khodrobankHref"):
            if f in r:
                del r[f]
                stripped += 1
        yr = r.get("yearNum") or 0
        old = prev_by_key.get((r["brand"], r["model"], r["trim"], yr))
        if old:
            for f in ("karnamehAvg", "khodrobankPrice", "khodrobankHref"):
                if f in old:
                    del old[f]
    if stripped:
        print(f"[r74-legacy-strip] removed {stripped} stale karnamehAvg/khodrobank fields")

    # --- منبع ۷: divar (کوهورت صفر SSR — cross-check) ---
    divar_n = 0
    try:
        divar_data = divar_medians()
        for r in records:
            dv = divar_data.get(r["model"])
            if dv and dv.get("median"):
                r["divarMedian"] = int(round(dv["median"] / 1_000_000) * 1_000_000)
                divar_n += 1
    except Exception as e:
        sys.stderr.write(f"[warn] divar fetch failed: {e}\n")

    # مرتب‌سازی: برند → مدل → سال
    records.sort(key=lambda r: (list(IRANIAN_BRANDS.keys()).index(r["brand"]) if r["brand"] in IRANIAN_BRANDS else 99, r["model"], r["name"]))

    out = {"generated": now_iso, "source": "hamrah-mechanic+bama+car.ir+khodro45+divar", "models": records}
    backup_path = os.path.join(HISTORY_DIR, f"{today}.json")
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    lines = [
        "/**",
        " * قیمت صفر بازار آزاد خودروهای ایرانی — چند-منبعی (hamrah-mechanic + car.ir + khodro45 + bama + divar)\n"
        " * R74: برندهای خارجی در UI رندر نمی‌شوند (domesticOnly)؛ karnameh/khodrobank کور شده‌اند (تطبیق غلط).\n"
        " * تولید خودکار توسط scripts/zero-price-extractor.py — دستی ویرایش نکنید.",
        f" * آخرین بروزرسانی: {now_iso}",
        " */",
        "",
        "window.zeroPrices = [",
    ]
    for r in records:
        row = dict(r)
        row.pop("yearNum", None)  # فیلد داخلی، در خروجی نهایی نیست
        row.pop("name_src", None)
        lines.append(" " + json.dumps(row, ensure_ascii=False) + ",")
    lines.append("];")
    lines.append("")
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    by_brand = {}
    for r in records:
        by_brand[r["brandName"]] = by_brand.get(r["brandName"], 0) + 1
    print(f"\nSummary: total={len(records)}")
    for b, c in sorted(by_brand.items(), key=lambda x: -x[1]):
        print(f"  {b}: {c}")
    per_source = {}
    for r in records:
        per_source[r["source"]] = per_source.get(r["source"], 0) + 1
    print("Per-source records:", per_source)
    print(f"Cross-checks: karnameh={karnameh_n} khodrobank={khodrobank_n} divar={divar_n} bama={sum(1 for r in records if r.get('bamaPrice'))}")
    print(f"Backup: {backup_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
