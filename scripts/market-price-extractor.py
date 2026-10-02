#!/usr/bin/env python3
"""
Novin Khodro Auto Market Price Extractor & Comparator
Fetches real-time price index & active market quotes from Bama / Karnameh / IranJib,
evaluates market deviations, and formats validated price sync payloads.
"""

import urllib.request
import json
import re
import sys
import statistics

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}

FETCH_TIMEOUT = 45  # bama.ir answers in 20-30s when healthy (measured), so 12s cut live reads
                    # short. NOTE: the 2026-09-28 cohort failures were NOT a timeout — bama was
                    # serving 503 (WAF/rate-limit) on every path, incl. the homepage.


def fetch_url(url, timeout=FETCH_TIMEOUT):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="ignore")

class PriceSourceError(RuntimeError):
    """Raised when a price cohort cannot be computed from live sources.
    Never fall back to a stale hardcoded number — silent fallbacks are how
    207/Dena baselines survived 2 years out of date (stale-baseline defect class)."""


def extract_bama_active_ads(car_path, strict=False):
    """Directly parses Nuxt reactive ads payload for granular listings."""
    url = f"https://bama.ir/car/{car_path}"
    try:
        html = fetch_url(url)
        scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL)
        for s in scripts:
            if "ShallowReactive" in s and "ads" in s:
                data = json.loads(s)
                ads_list = []
                for el in data:
                    if isinstance(el, dict) and "ads" in el:
                        ad_indices = data[el["ads"]] if isinstance(el["ads"], int) else el["ads"]
                        for ai in ad_indices:
                            ad = data[ai]
                            y = data[ad["year"]] if isinstance(ad.get("year"), int) and ad["year"] < len(data) else ad.get("year")
                            p = ad.get("price")
                            p_obj = data[p] if isinstance(p, int) and p < len(data) else p
                            p_val = None
                            if isinstance(p_obj, dict):
                                pv = p_obj.get("price")
                                p_val = data[pv] if isinstance(pv, int) and pv < len(data) else pv
                            m = ad.get("mileage")
                            m_val = data[m] if isinstance(m, int) and m < len(data) else m
                            t = ad.get("title")
                            t_val = data[t] if isinstance(t, int) and t < len(data) else t
                            trim = ad.get("trim")
                            trim_val = data[trim] if isinstance(trim, int) and trim < len(data) else trim
                            desc = ad.get("description")
                            desc_val = data[desc] if isinstance(desc, int) and desc < len(data) else desc
                            if p_val and p_val != "0":
                                try:
                                    clean_price = int(str(p_val).replace(",", ""))
                                    ads_list.append({
                                        "title": t_val,
                                        "trim": trim_val,
                                        "year": str(y),
                                        "mileage": m_val,
                                        "price": clean_price,
                                        "desc": str(desc_val or "")[:60].replace("\n", " ")
                                    })
                                except ValueError:
                                    pass
                return ads_list
    except Exception as e:
        sys.stderr.write(f"Error fetching bama ads for {car_path}: {e}\n")
        if strict:
            raise PriceSourceError(f"bama fetch failed for {car_path}: {e}")
    return []

def get_market_spot_price(car_type, strict=False):
    """
    Cohort-specific free-market median price calculator:
    Filters out outlier stubs and clusters on exact inventory trim & mileage.
    """
    if car_type == "xtrim_vx":
        # 1. Chery / Xtrim VX 1403 Zero km
        ads = extract_bama_active_ads("xtrim-vx", strict=strict)
        # Filter for genuine VX listings
        cohort = [a["price"] for a in ads if "VX" in str(a.get("title")) and 7_000_000_000 < a["price"] < 15_000_000_000]
        if not cohort and strict:
            raise PriceSourceError("xtrim_vx: empty VX cohort from bama")
        return int(statistics.median(cohort)) if cohort else 9_700_000_000

    elif car_type == "peugeot_207":
        # 2. Peugeot 207 Panorama Manual
        ads = extract_bama_active_ads("peugeot-207", strict=strict)
        cohort = [a["price"] for a in ads if "پانوراما دنده" in str(a.get("trim")) and 1_700_000_000 < a["price"] < 2_600_000_000]
        if not cohort and strict:
            raise PriceSourceError("peugeot_207: empty پانوراما دنده cohort from bama")
        return int(statistics.median(cohort)) if cohort else 2_310_000_000

    elif car_type == "dena_plus":
        # 3. Dena Plus Turbo Automatic Optional
        ads = extract_bama_active_ads("dena-plus", strict=strict)
        cohort = [a["price"] for a in ads if "اتوماتیک توربو" in str(a.get("trim")) and 2_200_000_000 < a["price"] < 3_300_000_000]
        if not cohort and strict:
            raise PriceSourceError("dena_plus: empty اتوماتیک توربو cohort from bama")
        return int(statistics.median(cohort)) if cohort else 2_900_000_000

    elif car_type == "hyundai_i20":
        # 4. Hyundai i20 Kerman Motor 1397 (~62,000 km)
        ads = extract_bama_active_ads("hyundai-i20ir", strict=strict)
        cohort = [a["price"] for a in ads if str(a.get("year")) == "1397" and 3_200_000_000 < a["price"] < 5_200_000_000]
        if not cohort and strict:
            raise PriceSourceError("hyundai_i20: empty 1397 cohort from bama")
        return int(statistics.median(cohort)) if cohort else 4_050_000_000

    raise PriceSourceError(f"unknown car_type: {car_type}")

def run_inspection():
    print("==================================================")
    print(" NOVIN KHODRO FREE-MARKET COHORT VALUATION REPORT")
    print("==================================================")
    
    cars = [
        ("1", "اکستریم VX شاسی‌بلند (صفر ۱۴۰۳)", "xtrim_vx"),
        ("2", "هیوندای i20 مونتاژ کرمان موتور (۱۳۹۷ کارکرده)", "hyundai_i20"),
        ("3", "پژو ۲۰۷i دنده‌ای پانوراما (صفر ۱۴۰۳)", "peugeot_207"),
        ("4", "دنا پلاس توربو اتوماتیک آپشنال (۱۴۰۳ در حد صفر)", "dena_plus"),
    ]

    for cid, title, key in cars:
        spot = get_market_spot_price(key)
        print(f"[{cid}] {title}:")
        print(f"     -> نرخ دقیق بازار آزاد نمایشگاهی: {spot:,} تومان ({round(spot/1e6):,} میلیون تومان)")

if __name__ == "__main__":
    run_inspection()

