#!/usr/bin/env python3
"""سورسینگ عکس واقعی خودرو (بازاستفاده‌پذیر) — طبق نردبان مهارت real-car-image-sourcing.

  fetch   : کاندید جمع می‌کند (گالری استودیویی IKCO روی دیسک + Wikimedia Commons) به /tmp/nk-photos/<slug>/
  encode  : کاندید تأییدشده را به webp کارت تبدیل می‌کند (۹۰۰px عرض، <100KB)

تفکیک وظیفه: این اسکریپت «جمع‌آوری + پیش‌فیلتر» است؛ تأیید رنگی/زاویه با vision_analyze
(چشم انسان‌نما) انجام می‌شود — هیچ کاندیدی بدون تأیید رنگ وارد موجودی نمی‌شود.

نمونه:
  python3 scripts/source-car-photos.py fetch --slug haima-s7 --model "هایما S7" --local assets-out/ikco/haima-s7
  python3 scripts/source-car-photos.py encode /tmp/nk-photos/haima-s7/cand-03.jpg --out images/cars/haima-s7.webp
"""
import argparse
import glob
import io
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TMP = "/tmp/nk-photos"
UA = "NovinKhodroBot/1.0 (photo sourcing; contact: showroom)"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"


def http_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode())


def http_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def to_jpg(src, dst):
    """webp/png → jpg برای بررسی با vision (sips روی این مک webp نمی‌نویسد)."""
    try:
        from PIL import Image
        im = Image.open(src).convert("RGB")
        im.thumbnail((1600, 1600), Image.LANCZOS)
        im.save(dst, "JPEG", quality=88)
        return True
    except Exception as exc:  # noqa: BLE001 — fallback به sips
        print(f"  ! PIL failed ({exc}); trying sips", file=sys.stderr)
        try:
            subprocess.run(["sips", "-s", "format", "jpeg", src, "--out", dst],
                           check=True, capture_output=True)
            return True
        except Exception:
            return False


def brightness_stats(path):
    """پیش‌فیلتر ارزان: میانگین روشنایی + میانگین چهار گوشه (کار استودیویی/کات‌اوت را جدا می‌کند)."""
    try:
        from PIL import Image, ImageStat
        im = Image.open(path).convert("L")
        w, h = im.size
        avg = ImageStat.Stat(im).mean[0]
        c = 0.08
        corners = []
        for box in ((0, 0, int(w * c), int(h * c)), (w - int(w * c), 0, w, int(h * c)),
                    (0, h - int(h * c), int(w * c), h), (w - int(w * c), h - int(h * c), w, h)):
            corners.append(ImageStat.Stat(im.crop(box)).mean[0])
        return {"avg": round(avg, 1), "corner_avg": round(sum(corners) / 4, 1), "w": w, "h": h}
    except Exception:
        return {"avg": None, "corner_avg": None, "w": None, "h": None}


def commons_candidates(model, out_dir, limit=12):
    """جست‌وجوی Wikimedia Commons با درخواست دسته‌ای (تحدید نرخ: خواب بین درخواست‌ها)."""
    found = []
    params = {
        "action": "query", "generator": "search", "gsrsearch": model, "gsrnamespace": "6",
        "gsrlimit": str(limit), "prop": "imageinfo", "iiprop": "url|size",
        "iiurlwidth": "1600", "format": "json",
    }
    try:
        data = http_json(f"{COMMONS_API}?{urllib.parse.urlencode(params)}")
    except Exception as exc:  # noqa: BLE001
        print(f"  ! Commons search failed: {exc}", file=sys.stderr)
        return found
    pages = (data.get("query") or {}).get("pages") or {}
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        width = info.get("width") or 0
        url = info.get("thumburl") or info.get("url")
        if not url or width < 1000:
            continue
        found.append({"title": page.get("title"), "url": url, "width": width,
                      "height": info.get("height"), "source": "wikimedia"})
        time.sleep(1.2)  # محدودیت نرخ Commons
    return found


def fetch(args):
    out_dir = os.path.join(TMP, args.slug)
    os.makedirs(out_dir, exist_ok=True)
    manifest, idx = [], 0

    # ۱) گالری استودیویی رسمی روی دیسک (بالاترین اولویت — پس‌زمینه تمیز)
    if args.local:
        local_dir = os.path.join(ROOT, args.local, "gallery") if os.path.isdir(os.path.join(ROOT, args.local, "gallery")) else os.path.join(ROOT, args.local)
        for src in sorted(glob.glob(os.path.join(local_dir, "img-*.*"))):
            idx += 1
            dst = os.path.join(out_dir, f"cand-{idx:02d}-local.jpg")
            if to_jpg(src, dst):
                manifest.append({"file": dst, "source": "ikco-local", "origin": os.path.relpath(src, ROOT),
                                 **brightness_stats(dst)})

    # ۲) Wikimedia Commons (مدل‌های وارداتی/واردات چین و برندهای خارجی)
    for cand in commons_candidates(args.model, out_dir):
        idx += 1
        dst = os.path.join(out_dir, f"cand-{idx:02d}-commons.jpg")
        try:
            with open(dst, "wb") as fh:
                fh.write(http_bytes(cand["url"]))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! download failed {cand['url'][:60]}: {exc}", file=sys.stderr)
            continue
        manifest.append({"file": dst, "source": cand["source"], "url": cand["url"],
                         "origin_w": cand["width"], **brightness_stats(dst)})
        time.sleep(1.2)

    manifest_path = os.path.join(out_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump({"slug": args.slug, "model": args.model, "color": args.color,
                   "wanted": "رنگ موجودی + زاویه ۳/۴ جلو + بدون واترمارک/پلاک خوانا",
                   "candidates": manifest}, fh, ensure_ascii=False, indent=2)
    print(f"{len(manifest)} کاندید → {out_dir}")
    for c in manifest:
        print(f"  {os.path.basename(c['file']):<24} {c['source']:<12} {c['w']}x{c['h']} avg={c['avg']} corner={c['corner_avg']}")
    print(f"manifest: {manifest_path}")
    print("گام بعد: vision_analyze روی شورت‌لیست (رنگ/زاویه/واترمارک) → سپس encode")


def encode(args):
    from PIL import Image
    im = Image.open(args.candidate).convert("RGB")
    w = args.width
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    dst = os.path.join(ROOT, args.out) if not os.path.isabs(args.out) else args.out
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, "WEBP", quality=args.quality, method=6)
    size_kb = os.path.getsize(dst) / 1024
    print(f"{os.path.relpath(dst, ROOT)}  {im.width}x{im.height}  {size_kb:.1f}KB")
    if size_kb > 100:
        print("  ! >100KB — کیفیت را کم کنید (scope: کارت‌ها <100KB)", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description="سورسینگ عکس خودرو (Novin Khodro)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    f = sub.add_parser("fetch", help="جمع‌آوری کاندیدها")
    f.add_argument("--slug", required=True)
    f.add_argument("--model", required=True, help="عبارت جست‌وجو، مثل «هایما S7» یا «Exeed VX»")
    f.add_argument("--color", default="")
    f.add_argument("--local", default="", help="مسیر پوشهٔ گالری استودیویی IKCO (اختیاری)")
    f.set_defaults(func=fetch)

    e = sub.add_parser("encode", help="تبدیل کاندید تأییدشده به webp کارت")
    e.add_argument("candidate")
    e.add_argument("--out", required=True, help="مثل images/cars/haima-s7.webp")
    e.add_argument("--width", type=int, default=900)
    e.add_argument("--quality", type=int, default=72)
    e.set_defaults(func=encode)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
