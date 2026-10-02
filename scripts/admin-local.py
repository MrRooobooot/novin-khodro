#!/usr/bin/env python3
"""
Novin Khodro — لوکال پنل مدیریت موجودی (local-only; deploy نمی‌شود).
Run:  python3 scripts/admin-local.py   →  http://127.0.0.1:8790

UI:   admin.html (root-relative fetch → /admin-api/*)
Data: .hermes/admin/inventory.json  (کارینگ‌کپی، first boot از js/cars-data.js seed می‌شود)
Save: اعتبارسنجی کامل → js/cars-data.js ریپو (source of truth تست‌ها و دیپلوی)
Binding روی 127.0.0.1 = مرز امنیتی؛ بدون توکن (ابزار local).
"""
import argparse, csv, glob, gzip, io, json, os, re, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote

ROOT = Path(__file__).resolve().parents[1]
INV = ROOT / ".hermes" / "admin" / "inventory.json"
CARS_JS = ROOT / "js" / "cars-data.js"
LEAD_DIR = ROOT / ".hermes" / "logs" / "nginx"
FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
REQUIRED = ("id", "title", "price", "image")
MAX_BODY = 1024 * 1024
MAX_LEADS = 300
_lock = threading.Lock()

# نگاشت سرستون فارسی/انگلیسی ورودی دستی → کلید canonical cars-data
FIELD_ALIASES = {
    "وضعیت بدنه": "bodyStatus", "وضعیت شاسی": "chassisStatus", "بیمه": "insuranceMonths",
    "عنوان": "title", "نام": "title", "خودرو": "title", "title": "title",
    "قیمت": "price", "price": "price", "قیمت تومان": "price",
    "برند": "brand", "brand": "brand",
    "دسته": "category", "category": "category",
    "سال": "modelYear", "مدل سال": "modelYear", "year": "modelYear",
    "کارکرد": "mileage", "کیلومتر": "mileage", "mileage": "mileage",
    "تصویر": "image", "عکس": "image", "image": "image",
    "رنگ": "color", "رنگ بدنه": "color", "color": "color",
    "رنگ داخل": "interiorColor", "گیربکس": "gearbox", "موتور": "engine", "سوخت": "fuel",
    "توضیحات": "description", "description": "description",
    "امکانات": "features", "features": "features",
    "گالری": "gallery", "gallery": "gallery",
    "صفر": "isZero", "isZero": "isZero", "id": "id",
}
BRAND_ALIASES = {
    "ایران خودرو": "ikco", "ایرانخودرو": "ikco", "پژو": "ikco", "دنا": "ikco", "سمند": "ikco",
    "سایپا": "saipa", "کوییک": "saipa", "شاهین": "saipa",
    "مدیران خودرو": "chery", "اکستریم": "chery", "چری": "chery", "فونیکس": "chery",
    "هیوندای": "hyundai", "کیا": "kia", "تویوتا": "toyota",
}
ZERO_VALUES = {"۱", "1", "true", "yes", "بله", "صفر", "صفر کیلومتر"}


def fa_to_int(value):
    """«۲٫۲ میلیارد تومان» / «۲,۲۰۰,۰۰۰,۰۰۰» / «۲۲۰۰ میلیون» → عدد تومان."""
    if isinstance(value, (int, float)):
        return int(value)
    s = str(value or "").strip()
    if not s:
        raise ValueError("empty price")
    s = s.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    s = s.replace("،", "").replace(",", "").replace("٫", ".").replace(" تومان", "").strip()
    mult = 1
    if "میلیارد" in s:
        mult, s = 1_000_000_000, s.replace("میلیارد", "")
    elif "میلیون" in s:
        mult, s = 1_000_000, s.replace("میلیون", "")
    m = re.search(r"-?\d+(?:\.\d+)?", s)
    if not m:
        raise ValueError(f"price not numeric: {value!r}")
    return int(round(float(m.group(0)) * mult))



def fa_format(price: int) -> str:
    s = f"{price:,}".replace(",", "،")
    return s.translate(str.maketrans("0123456789", FA_DIGITS)) + " تومان"


def validate_cars(data):
    if not isinstance(data, list) or not (1 <= len(data) <= 50):
        raise ValueError("cars must be a list of 1..50 items")
    ids = set()
    for i, c in enumerate(data):
        if not isinstance(c, dict):
            raise ValueError(f"item {i}: not an object")
        for k in REQUIRED:
            if k not in c:
                raise ValueError(f"item {i}: missing {k}")
        if not isinstance(c["id"], int) or c["id"] <= 0 or c["id"] in ids:
            raise ValueError(f"item {i}: bad/duplicate id")
        ids.add(c["id"])
        if not isinstance(c["title"], str) or not (2 <= len(c["title"].strip()) <= 120):
            raise ValueError(f"item {i}: title 2..120 chars")
        if not isinstance(c["price"], int) or not (10_000_000 <= c["price"] <= 1_000_000_000_000):
            raise ValueError(f"item {i}: price int between 1e7 and 1e12")
        if not isinstance(c["image"], str) or not re.fullmatch(r"images/[\w\-./]+|data:[\w/+.;=,-]+", c["image"]):
            raise ValueError(f"item {i}: image must be local images/ path or data URI")
        if not isinstance(c.get("mileage", 0), int) or c.get("mileage", 0) < 0:
            raise ValueError(f"item {i}: mileage int >= 0")
        c["priceFormatted"] = fa_format(c["price"])      # auto-derived, zero-hardcode
        c["priceMillion"] = round(c["price"] / 1_000_000)
        for lst in ("gallery", "features"):
            v = c.get(lst, [])
            if not isinstance(v, list) or not all(isinstance(x, str) and len(x) < 400 for x in v):
                raise ValueError(f"item {i}: {lst} list of short strings")
        if not isinstance(c.get("badges", []), list) or any(
            not isinstance(b, dict) or b.get("type") not in (None, "verified", "zero", "insurance", "clean")
            for b in c.get("badges", [])
        ):
            raise ValueError(f"item {i}: badges must be objects with known type")
    return data


def normalize_row(raw, next_id):
    """یک ردیف ورودی دستی (CSV/JSON) → شیء سازگار با cars-data. عکس اجباری است."""
    row = {}
    for key, value in (raw or {}).items():
        canon = FIELD_ALIASES.get(str(key).strip().lower()) or FIELD_ALIASES.get(str(key).strip())
        if canon:
            row[canon] = value
    if not row.get("title"):
        raise ValueError("عنوان خودرو لازم است")
    row["title"] = str(row["title"]).strip()
    row["price"] = fa_to_int(row.get("price"))
    brand_raw = str(row.get("brand") or "").strip()
    row["brand"] = BRAND_ALIASES.get(brand_raw, brand_raw.lower() or "other")
    row.setdefault("category", {"ikco": "iranian", "saipa": "iranian", "chery": "chinese"}.get(row["brand"], "imported"))
    row["modelYear"] = str(row.get("modelYear") or "").strip() or "—"
    if not row.get("image") or not re.fullmatch(r"images/[\w\-./]+", str(row["image"])):
        raise ValueError("تصویر اجباری است و باید مسیر محلی images/... باشد (بدون عکس منتشر نمی‌شود)")
    row["image"] = str(row["image"])
    for lst in ("features", "gallery"):
        v = row.get(lst)
        if isinstance(v, str):
            row[lst] = [x.strip() for x in re.split(r"[\n؛;|]", v) if x.strip()]
        elif v is None:
            row[lst] = []
    is_zero = str(row.get("isZero", "")).strip().lower() in ZERO_VALUES
    row["isZero"] = is_zero
    row["mileage"] = 0 if is_zero else fa_to_int(row.get("mileage") or 0)
    row.setdefault("mileageText", "صفر کیلومتر خشک" if is_zero else f"{row['mileage']:,} کیلومتر".replace(",", "،"))
    row["id"] = int(row.get("id") or next_id)
    return row


def parse_import(payload):
    """ورودی: {"cars":[...]} یا {"text":"<JSON یا CSV>"} → لیست ردیف‌های خام."""
    if isinstance(payload.get("cars"), list):
        return payload["cars"]
    text = str(payload.get("text") or "").strip()
    if not text:
        raise ValueError("چیزی برای ایمپورت نفرستاده شد (cars یا text)")
    if text[0] in "[{":
        data = json.loads(text)
        return data if isinstance(data, list) else [data]
    sample = text.splitlines()[0]
    delim = "\t" if "\t" in sample else (";" if ";" in sample else ",")
    return [r for r in csv.DictReader(io.StringIO(text), delimiter=delim) if any((v or "").strip() for v in r.values())]


def read_leads():
    """صندوق سرنخ از لاگ سرور (اگر لاگ محلی نکشیده شده باشد، خالی برمی‌گردد)."""
    leads = []
    for path in sorted(glob.glob(str(LEAD_DIR / "nk-leads.log*"))):
        opener = gzip.open if path.endswith(".gz") else open
        try:
            with opener(path, "rt", errors="replace") as fh:
                for line in fh:
                    parts = line.rstrip("\n").split("|")
                    if len(parts) < 9:
                        continue
                    leads.append({
                        "ts": parts[0], "type": unquote(parts[1]) or "-", "name": unquote(parts[2]) or "-",
                        "phone": unquote(parts[3]) or "-", "car": unquote(parts[4]) or "-",
                        "msg": unquote(parts[5]) or "-", "value": unquote(parts[6]) or "-",
                        "place": unquote(parts[7]) or "-", "ip": parts[8],
                    })
        except OSError:
            continue
    leads.sort(key=lambda x: x["ts"], reverse=True)
    return leads[:MAX_LEADS]


def render_cars_js(cars) -> str:
    """خروجی سازگار با ساختار فعلی js/cars-data.js (تست‌های tier1/tier5 همین را parse می‌کنند)."""
    lines = [
        "/**",
        " * بانک اطلاعاتی خودروهای موجود در نمایشگاه نوین خودرو",
        " * تولیدشده توسط پنل لوکال — source of truth: .hermes/admin/inventory.json",
        " *",
        " * - قیمت‌ها: تومان. priceFormatted با ارقام فارسی و جداکننده «٬».",
        " * - brand: کلید فیلتر (chery/hyundai/ikco/saipa). category: chinese/imported/iranian.",
        " * - isZero: خودروی صفر کیلومتر.",
        " */",
        "",
        "const carsData = " + json.dumps(cars, ensure_ascii=False, indent=2) + ";",
        "",
        "const carBrands = (() => {",
        "  const NAMES = { chery: 'اکستریم / مدیران خودرو', hyundai: 'هیوندای', ikco: 'ایران خودرو', saipa: 'سایپا' };",
        "  const seen = [...new Set(carsData.map(c => c.brand).filter(Boolean))];",
        "  return [{ key: 'all', name: 'همه برندها' },",
        "    ...seen.map(k => ({ key: k, name: NAMES[k] || k }))];",
        "})();",
        "",
        "if (typeof window !== 'undefined') {",
        "  window.carsData = carsData;",
        "  window.carBrands = carBrands;",
        "}",
        "",
        "if (typeof module !== 'undefined' && module.exports) {",
        "  module.exports = { carsData, carBrands };",
        "}",
        "",
    ]
    return "\n".join(lines) + "\n"


def atomic_write(path: Path, text: str):
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
        os.chmod(path, 0o644)  # mkstemp=0600 — without this nginx gets 403 after deploy
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def seed_if_missing():
    if INV.exists():
        return
    INV.parent.mkdir(parents=True, exist_ok=True)
    node = (
        "const fs=require('fs');const src=fs.readFileSync(process.argv[1],'utf8');const w={};"
        "new Function('window', src + ';window.carsData=carsData;')(w);"
        "fs.writeFileSync(process.argv[2], JSON.stringify(w.carsData, null, 2));"
    )
    subprocess.run(["node", "-e", node, str(CARS_JS), str(INV)], check=True)
    print(f"seeded {INV} از {CARS_JS.name}")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _json(self, code, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path in ("/", "/admin.html"):
            html = (ROOT / "admin.html").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(html)
            return
        if self.path == "/admin-api/inventory":
            try:
                return self._json(200, {"cars": json.loads(INV.read_text(encoding="utf-8"))})
            except (OSError, ValueError):
                return self._json(500, {"error": "inventory unreadable"})
        if self.path.startswith("/admin-api/leads"):
            leads = read_leads()
            return self._json(200, {"leads": leads, "count": len(leads)})
        if self.path.startswith(("/fonts/", "/images/", "/css/")):
            # R63: query-string (?v=) باید حذف شود وگرنه مسیر فایل پیدا نمی‌شود
            rel = self.path.split("?", 1)[0].lstrip("/")
            safe = (ROOT / rel).resolve()
            if not str(safe).startswith(str(ROOT)) or not safe.is_file():
                return self._json(404, {"error": "not found"})
            ctype = "font/woff2" if safe.suffix == ".woff2" else (
                "image/svg+xml" if safe.suffix == ".svg" else (
                    "text/css; charset=utf-8" if safe.suffix == ".css" else "application/octet-stream"))
            blob = safe.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(blob)))
            self.end_headers()
            self.wfile.write(blob)
            return
        return self._json(404, {"error": "not found"})

    def do_PUT(self):
        if self.path != "/admin-api/inventory":
            return self._json(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if not (0 < n <= MAX_BODY):
                raise ValueError("body size")
            payload = json.loads(self.rfile.read(n).decode("utf-8"))
            cars = validate_cars(payload.get("cars"))
        except (ValueError, json.JSONDecodeError) as e:
            return self._json(400, {"error": str(e)})
        with _lock:
            atomic_write(INV, json.dumps(cars, ensure_ascii=False, indent=2))
            atomic_write(CARS_JS, render_cars_js(cars))
        print(f"saved {len(cars)} cars → js/cars-data.js", flush=True)
        return self._json(200, {"ok": True, "count": len(cars)})

    def do_POST(self):
        """ایمپورت گروهی (CSV/JSON) — تنها راه افزودن سریع موجودی با حفظ اعتبارسنجی."""
        if self.path != "/admin-api/import":
            return self._json(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if not (0 < n <= MAX_BODY):
                raise ValueError("body size")
            payload = json.loads(self.rfile.read(n).decode("utf-8"))
            rows = parse_import(payload)
        except (ValueError, json.JSONDecodeError) as e:
            return self._json(400, {"error": str(e)})

        try:
            existing = json.loads(INV.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            existing = []
        added, errors = [], []
        next_id = max([c.get("id", 0) for c in existing] + [0]) + 1
        for i, raw in enumerate(rows):
            try:
                row = normalize_row(raw, next_id)
                if any(str(c.get("id")) == str(row["id"]) for c in existing + added) or \
                   any(c.get("title") == row["title"] for c in existing + added):
                    errors.append(f"ردیف {i + 1}: تکراری (id/title) — رد شد")
                    continue
                added.append(row)
                next_id = max(next_id, row["id"] + 1)
            except (ValueError, TypeError) as exc:
                errors.append(f"ردیف {i + 1}: {exc}")
        if not added:
            return self._json(400, {"error": "هیچ ردیف سالمی نبود", "errors": errors})
        try:
            cars = validate_cars(existing + added)
        except ValueError as exc:
            return self._json(400, {"error": f"اعتبارسنجی کل موجودی ناموفق: {exc}", "errors": errors})
        with _lock:
            atomic_write(INV, json.dumps(cars, ensure_ascii=False, indent=2))
            atomic_write(CARS_JS, render_cars_js(cars))
        print(f"imported {len(added)} cars (total {len(cars)}) → js/cars-data.js", flush=True)
        return self._json(200, {"ok": True, "added": len(added), "total": len(cars), "errors": errors})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8790)
    args = ap.parse_args()
    seed_if_missing()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"پنل لوکال: http://127.0.0.1:{args.port}  (Ctrl+C خروج)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
