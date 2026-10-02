#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-ikco-catalog.py — Transform IKCO scraped profiles → js/data/ikco-catalog.js + assets stage
منبع: ./ikco-profiles/<نام خودرو>/
خروجی:
  js/data/ikco-catalog.js         ← const ikcoCatalog = [...] (global، الگوی cars-data.js)
  assets-out/ikco/<slug>/         ← gallery WebP + overview WebP + downloads + manual(آخرین نسخه) + tour-360
Usage: python3 scripts/build-ikco-catalog.py [--src DIR] [--out-root DIR] [--dry-run]
"""
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

SRC_DEFAULT = Path("./ikco-profiles")
OUT_ROOT_DEFAULT = Path(__file__).resolve().parent.parent  # repo root

# ---------------------------------------------------------------- slug map (۳۷ مدل، جدول دستی — امن‌تر از ترنسلیتریشن خودکار)
SLUG_MAP = {
    "بستیون NAT": "bestiun-nat",
    "تارا": "tara",
    "تندر 90": "tondar-90",
    "دانگ فنگ E70": "dongfeng-e70",
    "دانگ فنگ H30 Cross": "dongfeng-h30-cross",
    "دانگ فنگ S30": "dongfeng-s30",
    "دنا": "dena",
    "دنا پلاس": "dena-plus",
    "رانا": "runna",
    "رانا پلاس": "runna-plus",
    "ری‌را": "rira",
    "سمند LX": "samand-lx",
    "سمند SE": "samand-se",
    "سورن": "soren",
    "سورن پلاس": "soren-plus",
    "سوزوکی گراند ویتارا": "suzuki-grand-vitara",
    "شاین مکس": "shain-max",
    "لونا GRE": "luna-gre",
    "هایما 7X": "haima-7x",
    "هایما 8S": "haima-8s",
    "هایما S5": "haima-s5",
    "هایما S5 Pro": "haima-s5-pro",
    "هایما S7": "haima-s7",
    "هایما S7 پرو": "haima-s7-pro",
    "هایما S7pro": "haima-s7-pro",          # نام index.json
    "هایما S7 پلاس": "haima-s7-plus",
    "وانت آریسان 2": "arisun-2",
    "وانت تندر پیکاپ": "tondar-pickup",
    "تندر پیکاپ": "tondar-pickup",          # نام index.json
    "پژو 2008": "peugeot-2008",
    "پژو 206": "peugeot-206",
    "پژو 206 SD": "peugeot-206-sd",
    "پژو 207i": "peugeot-207i",
    "پژو 207i صندوق‌دار": "peugeot-207i-sedan",
    "207i صندوقدار": "peugeot-207i-sedan",  # نام index.json
    "پژو 301 وارداتی": "peugeot-301",
    "پژو 405": "peugeot-405",
    "پژو 508": "peugeot-508",
    "پژو پارس": "peugeot-pars",
    "کپچر": "captcher",
}

# aliasهای index.json: نام داخل پوشه ≠ نام index (ZWNJ و اختصار)
FALLBACK_SLUGS = {
    "دانگ فنگ E70": "dongfeng-e70",
    "دانگ فنگ H30 Cross": "dongfeng-h30-cross",
    "دانگ فنگ S30": "dongfeng-s30",
    "هایما S7 پرو": "haima-s7-pro",
    "وانت تندر پیکاپ": "tondar-pickup",
    "پژو 207i صندوق‌دار": "peugeot-207i-sedan",
}

# ردیف‌های ناوبری IKCO که spec نیستند
NAV_KEYS = ("در یک نگاه", "مقایسه مدل‌ها")
LAST_UPDATED_KEY = "آخرین بروزرسانی"

# --------------------------------------------------------------- character normalization
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "۰۱۲۳۴۵۶۷۸۹")


def normalize_fa(text):
    """ي/ك عربی→فارسی، ارقام عربی→فارسی، NFKC، فاصله مضاعف→تک، نیم‌فاصله استاندارد."""
    if not isinstance(text, str):
        return text
    t = unicodedata.normalize("NFKC", text)
    t = t.replace("ي", "ی").replace("ك", "ک").replace("ى", "ی").replace("ئ", "ئ")
    t = t.translate(ARABIC_DIGITS)
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = t.replace("‌ ", "‌")  # space after ZWNJ
    return t.strip()


# کلیدهایی که مقدارشان اعشار فارسی اسلشی دارد («9/2» = ۹٫۲)
DECIMAL_SLASH_KEYS = ("شتاب", "مصرف", "باتری", "شارژ", "حجم موتور")


def fix_decimal_slash(value, key=""):
    """اعداد اعشاری فارسی با اسلش → ممیز: '10/4'→'۱۰٫۴'، '54/4'→'۵۴٫۴'، '1/8'→'۱٫۸'.
    فقط در کلیدهای مشخص (DECIMAL_SLASH_KEYS)؛ توان/گشتاور «169/6000» = @rpm دست‌نخورده،
    گارانتی «100/000» هزارگان دست‌نخورده."""
    if not isinstance(value, str) or not value:
        return value
    if not any(pat in key for pat in DECIMAL_SLASH_KEYS):
        return value
    def repl(m):
        left, right = m.group(1), m.group(2)
        if len(right) == 3:  # هزارگان محتمل (40/000) — دست نخورده
            return m.group(0)
        return f"{left}٫{right}"
    return re.sub(r"\b(\d{1,3})/(\d{1,3})\b", repl, value)


def to_ascii_digits(text):
    if not isinstance(text, str):
        return text
    return str.maketrans("۰۱۲۳۴۵۶۷۸۹٫", "0123456789.").sub if False else text.translate(
        str.maketrans("۰۱۲۳۴۵۶۷۸۹٫", "0123456789.")
    )


def parse_engine_summary(specs):
    """خلاصه موتور: حجم + توان از ردیف‌های specs."""
    vol = power = None
    for row in specs:
        k = row["key"]
        v = row["value"]
        if "حجم موتور" in k:
            vol = to_ascii_digits(v).split(".")[0].strip()
        if "حداکثر توان" in k or "حداكثر توان" in k:
            m = re.search(r"(\d+)", to_ascii_digits(v))
            power = m.group(1) if m else None
    parts = []
    if vol:
        parts.append(f"{vol} سی‌سی")
    if power:
        parts.append(f"{power} اسب بخار")
    return "، ".join(parts) if parts else ""


def parse_gearbox(tech):
    """از techSpecs پاکسازی‌شده بخوان (ردیف variant با 'مقایسه' قبلاً حذف شده)."""
    for k, v in tech.items():
        if "انتقال قدرت" in k or "گیربکس" in k:
            return v
    return ""


def clean_specs(raw_specs, car_name):
    """حذف ردیف‌های ناوبری/variant/lastUpdated؛ خروجی (techSpecs dict, variants, lastUpdated)."""
    tech = {}
    variants = []
    last_updated = ""
    # کلمه اول نام خودرو (تارا، هایما، دنا…) برای تشخیص ردیف variant
    head = car_name.split()[0] if car_name else ""
    for row in raw_specs:
        key = normalize_fa(row["key"])
        val = normalize_fa(row.get("value", ""))
        if any(key.startswith(n) for n in NAV_KEYS):
            continue
        if key.startswith(LAST_UPDATED_KEY):
            last_updated = val
            continue
        # ردیف variant: value با «مقایسه مدل‌ها» شروع می‌شود و key حاوی نام‌های تیپ
        if val.startswith("مقایسه") or ("توقف تولید" in key and "مقایسه" in val):
            for vn in re.split(r"\s+(?=" + re.escape(head) + r")", key) if head else [key]:
                vn = vn.strip()
                if vn and len(vn) > 3:
                    variants.append({
                        "name": vn,
                        "discontinued": "توقف تولید" in vn or "توقف توليد" in vn,
                    })
            continue
        val = fix_decimal_slash(val, key)
        tech[key] = val
    # dedupe variants
    seen = set()
    variants = [v for v in variants if not (v["name"] in seen or seen.add(v["name"]))]
    return tech, variants, last_updated


def parse_equipment(raw):
    """equipment = رشته عظیم با \n. split + حذف سطرهای ناوبری."""
    if isinstance(raw, list):
        text = "\n".join(str(x) for x in raw)
    else:
        text = str(raw)
    lines = []
    for ln in text.split("\n"):
        ln = normalize_fa(ln)
        if not ln or len(ln) < 4:
            continue
        if re.search(r"مشخصات فنی \||در یک نگاه|آخرین بروزرسانی", ln):
            continue
        lines.append(ln)
    return lines


def pick_latest_manual(files):
    """فقط آخرین نسخه دفترچه (بزرگ‌ترین سال-ماه شمسی در نام فایل)."""
    manuals = files.get("manual", [])
    if not manuals:
        return None
    def year_key(f):
        m = re.search(r"-(\d{4})-(\d{1,2})", f.get("name", "") or Path(f.get("path", "")).name)
        return (int(m.group(1)), int(m.group(2))) if m else (0, 0)
    return max(manuals, key=year_key)


def has(p):
    return p is not None and Path(p).exists()


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ⚠ cmd failed: {' '.join(cmd[:3])}...: {r.stderr[:200]}")
    return r.returncode == 0


def convert_webp(src, dst, max_width=1600, q=80):
    """JPG → WebP با cwebp؛ resize با sips در صورت نیاز."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst = dst.with_suffix(".webp")
    tmp = dst.with_suffix(".tmp.jpg")
    shutil.copyfile(src, tmp)
    try:
        w, h = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(tmp)],
                              capture_output=True, text=True).stdout.splitlines()[-2:]
        pw = int(w.split()[-1])
        if pw > max_width:
            subprocess.run(["sips", "-Z", str(max_width), str(tmp)], capture_output=True)
        return run(["cwebp", "-quiet", "-q", str(q), str(tmp), "-o", str(dst)])
    finally:
        tmp.unlink(missing_ok=True)


def fix_path(path, real_dir):
    """profile.json pathها slug-dash دارند («دنا-پلاس») ولی پوشه واقعی space دارد.
    segment نام خودرو (دو پوشه قبل از نام فایل) را با dir واقعی جایگزین کن."""
    if not isinstance(path, str) or not path:
        return path
    parts = path.replace("\\", "/").split("/")
    # .../<نام خودرو>/gallery/img-01.jpg → index -3 = نام خودرو
    if len(parts) >= 4:
        parts[-3] = real_dir
        return "/".join(parts)
    return path


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, default=SRC_DEFAULT)
    ap.add_argument("--out-root", type=Path, default=OUT_ROOT_DEFAULT)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = args.src
    out_root = args.out_root
    assets_out = out_root / "assets-out" / "ikco"
    js_out = out_root / "js" / "data" / "ikco-catalog.js"

    index_path = src / "index.json"
    entries = json.loads(index_path.read_text(encoding="utf-8"))
    print(f"index.json: {len(entries)} entries")

    records = []
    flagged = []
    for ent in entries:
        name = normalize_fa(ent.get("name", ""))
        if not name:
            name = normalize_fa(ent.get("dir", ""))
        slug = SLUG_MAP.get(name)
        if not slug:
            # تلاش با کلیدهای نزدیک
            for k, v in SLUG_MAP.items():
                if normalize_fa(k).replace(" ", "").replace("\u200c", "") == name.replace(" ", "").replace("\u200c", ""):
                    slug = v
                    break
        if not slug:
            # fallback: نام dir (پوشه) متفاوت از نام index است — dir را در جدول fallback ببین
            slug = FALLBACK_SLUGS.get(ent.get("dir", "").strip()) or FALLBACK_SLUGS.get(normalize_fa(ent.get("dir", "")))
        if not slug:
            flagged.append(f"no-slug: {name!r} (dir={ent.get('dir')!r})")
            continue
        pdir = src / ent.get("dir", name)
        if not pdir.exists():
            # تلاش با نام normalized
            pdir = src / name
        pj = pdir / "profile.json"
        if not pj.exists():
            flagged.append(f"no-profile.json: {pdir}")
            continue
        prof = json.loads(pj.read_text(encoding="utf-8"))

        raw_specs = prof.get("specs", [])
        tech, variants, last_updated = clean_specs(raw_specs, name)
        if len(tech) < 15:
            flagged.append(f"few-specs({len(tech)}): {name}")

        eq = parse_equipment(prof.get("equipment", []))
        ov = prof.get("overview", {}) or {}
        ov_text = normalize_fa(ov.get("text", "") or "")
        # description: جمله اول overview (تا ۳۰۰ کاراکتر)
        desc = ov_text[:300].rsplit(" ", 1)[0] + "…" if len(ov_text) > 300 else ov_text
        video = ov.get("video") or ""

        files = prof.get("files", {})
        # pathهای profile.json با dash نوشته شده‌اند؛ dir واقعی را جایگزین segment نام کن
        real_dir = pdir.name
        for cat in ("gallery", "downloads", "manual", "overview", "tour"):
            for f in files.get(cat, []):
                if isinstance(f, dict) and f.get("path"):
                    f["path"] = fix_path(f["path"], real_dir)
        gallery_files = [f for f in files.get("gallery", []) if has(f.get("path"))]
        downloads_files = [f for f in files.get("downloads", []) if has(f.get("path"))]
        latest_manual = pick_latest_manual(files)
        tour360 = prof.get("tour360", []) or []

        rec = {
            "slug": slug,
            "ikcoId": str(ent.get("id", prof.get("id", ""))),
            "name": name,
            "brand": "ikco",
            "image": f"assets/ikco/{slug}/gallery/img-01.webp",
            "galleryCount": len(gallery_files),
            "gallery": [f"assets/ikco/{slug}/gallery/img-{i:02d}.webp" for i in range(1, len(gallery_files) + 1)],
            "techSpecs": tech,
            "engineSummary": parse_engine_summary(raw_specs),
            "gearbox": parse_gearbox(tech),
            "fuel": tech.get("نوع سوخت", "بنزین"),
            "features": eq[:40],
            "description": desc,
            "videoUrl": video,
            "documents": [],  # پر می‌شود پس از stage
            "tour360": bool(tour360),
            "variants": variants,
            "lastUpdated": last_updated,
        }

        if not args.dry_run:
            adir = assets_out / slug
            # gallery → WebP
            for i, f in enumerate(gallery_files, 1):
                convert_webp(Path(f["path"]), adir / "gallery" / f"img-{i:02d}.webp")
            # documents: downloads (کاتالوگ/مشخصات فنی/پوستر/ویدیو) — با برچسب فارسی از نام فایل
            docs_tmp = []
            # overview
            ov_img = pdir / "overview" / "overview.jpg"
            if ov_img.exists():
                convert_webp(ov_img, adir / "overview.webp")
            # downloads (کپی مستقیم؛ پوسترهای پوشه‌ای = img-NN.jpg؛ WMV تبدیل جدا)
            for f in downloads_files:
                p = Path(f["path"])
                if not p.exists():
                    continue
                if p.is_dir():
                    # پوستر چندتصویری: هر JPG → downloads/<نام پوشه>-img-NN.webp
                    imgs = sorted(p.glob("*.jpg")) + sorted(p.glob("*.JPG"))
                    for i, im in enumerate(imgs, 1):
                        convert_webp(im, adir / "downloads" / f"{p.name}-img-{i:02d}")
                    docs_tmp.append({"type": "poster", "label": "پوستر",
                                     "file": f"assets/ikco/{slug}/downloads/{p.name}-img-01.webp"})
                    continue
                dst = adir / "downloads" / p.name
                dst.parent.mkdir(parents=True, exist_ok=True)
                if p.suffix.lower() == ".wmv":
                    mp4 = dst.with_suffix(".mp4")
                    if not mp4.exists():
                        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(p),
                             "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                             "-c:a", "aac", str(mp4)])
                    docs_tmp.append({"type": "video", "label": "ویدیو",
                                     "file": f"assets/ikco/{slug}/downloads/{mp4.name}"})
                elif p.suffix.lower() == ".rar":
                    continue  # ارزش انتشار ندارد
                else:
                    shutil.copyfile(p, dst)
                    stem = p.stem
                    if stem.startswith("کاتالوگ"):
                        dtype, dlabel = "catalog", "کاتالوگ"
                    elif stem.startswith("مشخصات فنی"):
                        dtype, dlabel = "specs", "مشخصات فنی و تجهیزات (چاپی)"
                    elif stem.startswith("اینفوگرافی"):
                        dtype, dlabel = "infographic", "اینفوگرافی"
                    elif stem.startswith("سوالات"):
                        dtype, dlabel = "faq", "سوالات متداول"
                    elif stem.startswith("پوستر"):
                        dtype, dlabel = "poster", "پوستر"
                    elif stem.startswith("بروشور"):
                        dtype, dlabel = "brochure", "بروشور"
                    else:
                        dtype, dlabel = "doc", "سند"
                    docs_tmp.append({"type": dtype, "label": dlabel,
                                     "file": f"assets/ikco/{slug}/downloads/{p.name}"})
            # manual: فقط آخرین نسخه
            if latest_manual and has(latest_manual.get("path")):
                mp = Path(latest_manual["path"])
                mdir = adir / "manual"
                mdir.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(mp, mdir / mp.name)
                rec["documents"].append({"type": "manual", "label": "دفترچه راهنما",
                                         "file": f"assets/ikco/{slug}/manual/{mp.name}"})
            rec["documents"] = docs_tmp + rec["documents"]
            # tour-360: کپی کامل (فقط ۲ خودرو دارند)
            tdir_src = pdir / "tour-360"
            if tdir_src.exists() and any(tdir_src.iterdir()):
                if not args.dry_run:
                    shutil.copytree(tdir_src, adir / "tour-360", dirs_exist_ok=True)

        records.append(rec)
        print(f"  ✓ {slug}: specs={len(tech)} eq={len(eq)} gallery={len(gallery_files)} variants={len(variants)}")

    if not args.dry_run:
        js_out.parent.mkdir(parents=True, exist_ok=True)
        header = (
            "/**\n"
            " * کاتالوگ فنی محصولات ایران‌خودرو — تولید خودکار توسط scripts/build-ikco-catalog.py\n"
            " * منبع: اسکرپ ikco.ir (۳۷ محصول). دستی ویرایش نکنید؛ دوباره تولید کنید.\n"
            " * اتصال به موجودی فروش: cars-data.js[*].catalogSlug === این[*].slug\n"
            " * NOTE: window.ikcoCatalog — const top-level روی window نمی‌نشیند؛ bridge به window چک می‌کند\n"
            " */\n\nwindow.ikcoCatalog = "
        )
        js_out.write_text(header + json.dumps(records, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
        print(f"\n✓ wrote {js_out} ({js_out.stat().st_size//1024}KB, {len(records)} records)")

    print(f"\nflagged ({len(flagged)}):")
    for f in flagged:
        print("  -", f)


if __name__ == "__main__":
    main()
