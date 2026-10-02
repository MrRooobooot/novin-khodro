#!/usr/bin/env python3
"""ارسال URLهای سایت به IndexNow (Bing/Yandex/Seznam) — ایندکس فوری، بدون حساب کاربری.

کلید از فایل <key>.txt در ریشهٔ سایت خوانده می‌شود (همان فایلی که روی دامنه سرو می‌شود).
اجرا: python3 scripts/indexnow-submit.py            # همه URLهای sitemap
      python3 scripts/indexnow-submit.py <url> ...  # فقط همین‌ها
"""
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = "https://novinkhodro.shop"
ENDPOINT = "https://api.indexnow.org/indexnow"


def key_from_file():
    for path in glob.glob(os.path.join(ROOT, "*.txt")):
        name = os.path.basename(path)
        if re.fullmatch(r"[0-9a-f]{16,64}\.txt", name):
            return name[:-4]
    raise SystemExit("کلید IndexNow (<hex>.txt) در ریشه پیدا نشد")


def sitemap_urls():
    with open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8") as fh:
        return re.findall(r"<loc>([^<]+)</loc>", fh.read())


def submit(urls, key):
    payload = {
        "host": "novinkhodro.shop",
        "key": key,
        "keyLocation": f"{SITE}/{key}.txt",
        "urlList": urls,
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = resp.read().decode(errors="replace").strip()
            print(f"IndexNow HTTP {resp.status} (200/202 = پذیرفته شد) {body[:200]}")
            return resp.status in (200, 202)
    except urllib.error.HTTPError as exc:
        print(f"IndexNow HTTP {exc.code}: {exc.read().decode(errors='replace')[:300]}")
        return False
    except Exception as exc:  # شبکه/DNS
        print(f"IndexNow failed: {exc}")
        return False


def main():
    key = key_from_file()
    urls = sys.argv[1:] or sitemap_urls()
    print(f"key: {key} | key file: {SITE}/{key}.txt")
    print(f"urls: {len(urls)}")
    for u in urls:
        print(f"  {u}")
    ok = submit(urls, key)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
