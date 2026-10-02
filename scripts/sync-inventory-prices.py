#!/usr/bin/env python3
"""
Novin Khodro — mirror قیمت بازار آزاد (prices.db) به دارایی‌های وب (kanban t_5f04af2a).

زنجیرهٔ روزانهٔ صبح (cron پروفایل novin-khodro):
  06:00  scripts/price-sync.py             واکشی + اعتبارسنجی -> .hermes/price-history/prices.db
         scripts/sync-inventory-prices.py  همین فایل: DB -> دارایی‌های وب (اتمیک)
  08:00  novin-car-price-sync (agent job)  deploy + رفرش قیمت صفرکیلومتر

قواعد:
  - منبع حقیقت موجودی: .hermes/admin/inventory.json (رندرر: scripts/admin-local.py)
  - قیمت DB فقط وقتی روی قیمت نمایشگاه اعمال می‌شود که آن را بالاتر ببرد
    («هرگز رو به پایین سینک نکن» — پریمیوم نمایشگاه عمدی است، PROJECT_GRAPH §6).
  - هر اجرا گزارش می‌دهد: applied / unchanged / suppressed / unmapped + درصد اختلاف
    هر مدل، و برای |اختلاف| > ۲٪ خط FLAG (فقط گزارش؛ تصمیم با اپراتور).
  - نوشتن‌ها اتمیک‌اند و فقط وقتی حداقل یک قیمت تغییر کرده باشد انجام می‌شوند
    -> روزهای بدون تغییر = صفر چرن (mtime/cache-bust دست‌نخورده).

دارایی‌های مشتق در همان پاس: js/cars-data.js، .hermes/admin/inventory.json،
index.html (Offer هر Car + priceRange + لیبل اسلاید)، llms.txt (دامنهٔ قیمت).

Exit: 0 موفق (حتی بدون تغییر) | 1 دیتابیس ناخوانا/خالی (پرصدا، هرگز بی‌صدا).
"""

import importlib.util
import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "bama"          # تنها منبع مجاز بازار آزاد (هم‌راستا با price-sync.py)
FLAG_PCT = 2.0           # |اختلاف| بیش از این درصد -> خط FLAG در گزارش

FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa_ascii(n):
    """۱۱,۴۵۰,۰۰۰,۰۰۰ — ارقام فارسی با جداکنندهٔ ASCII (فرمت llms.txt و لیبل اسلایدها)."""
    return f"{int(n):,}".translate(FA_DIGITS)


def script_module(stem):
    """اسکریپت هم‌پوشه با نام خط‌فاصله‌دار (price-sync.py) را به‌عنوان ماژول می‌آورد."""
    spec = importlib.util.spec_from_file_location(
        stem.replace("-", "_"), ROOT / "scripts" / f"{stem}.py")
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def db_prices(db):
    """{(brand, model, trim, year): price} برای بازار آزاد — فقط-خواندنی."""
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        return {(b, m, t, y): p for b, m, t, y, p in con.execute(
            "SELECT brand, model, trim, year, price FROM prices WHERE source = ?", (SOURCE,))}
    finally:
        con.close()


def plan(cars, spots, key_of):
    """قیمت DB را روی خودروها اعمال می‌کند (فقط افزایشی). -> (counts, lines, flags)."""
    counts = {"applied": 0, "unchanged": 0, "suppressed": 0, "unmapped": 0}
    lines, flags = [], []
    for car in cars:
        key = key_of(car)
        if key is None:
            counts["unmapped"] += 1
            lines.append(f"[skip] {car['title']}: نگاشت cohort ندارد")
            continue
        spot = spots.get(key)
        if spot is None:
            counts["unmapped"] += 1
            lines.append(f"[skip] {car['title']}: قیمت DB برای {key} موجود نیست")
            continue
        cur = car["price"]
        pct = (spot - cur) / cur * 100
        if spot > cur:
            car["price"] = int(spot)
            counts["applied"] += 1
            action = f"applied {cur:,} -> {spot:,}"
        elif spot == cur:
            counts["unchanged"] += 1
            action = "unchanged"
        else:
            counts["suppressed"] += 1
            action = f"suppressed (spot {spot:,} < showroom {cur:,})"
        lines.append(f"[{car['id']}] {car['title']}: {pct:+.2f}% {action}")
        if abs(pct) > FLAG_PCT:
            flags.append(f"FLAG {pct:+.2f}% {car['title']}: {cur:,} -> {spot:,}")
    return counts, lines, flags


def update_index_html(path, cars, old_by_id, write):
    """Offer قیمت هر Car (IRR = تومان×۱۰) + priceRange + لیبل اسلایدها."""
    html = path.read_text(encoding="utf-8")
    for car in cars:
        anchor = html.find(f'"name": "{car["title"]}"')
        if anchor < 0:
            raise ValueError(f"index.html: Car entry برای «{car['title']}» پیدا نشد")
        m = re.compile(r'"price":\s*\d+').search(html, anchor)
        if m is None:
            raise ValueError(f"index.html: Offer price برای «{car['title']}» پیدا نشد")
        html = f'{html[:m.start()]}"price": {car["price"] * 10}{html[m.end():]}'
    lo, hi = min(c["price"] for c in cars), max(c["price"] for c in cars)
    html = re.sub(r'"priceRange":\s*"[^"]*"',
                  f'"priceRange": "{lo * 10:,} - {hi * 10:,} IRR"', html, count=1)
    # لیبل اسلاید: رشتهٔ فرمت‌شدهٔ قدیم -> جدید (پاس جانشین، تا جابه‌جایی A<->B رخ ندهد)
    for car in cars:
        html = html.replace(fa_ascii(old_by_id[car["id"]]), f"@@SLIDE{car['id']}@@")
    for car in cars:
        html = html.replace(f"@@SLIDE{car['id']}@@", fa_ascii(car["price"]))
    write(path, html)


def update_llms(path, cars, write):
    text = path.read_text(encoding="utf-8")
    lo, hi = min(c["price"] for c in cars), max(c["price"] for c in cars)
    line = (f"دامنه قیمت موجودی بر اساس js/cars-data.js: {fa_ascii(lo)} تا "
            f"{fa_ascii(hi)} تومان.")
    text, n = re.subn(r"دامنه قیمت موجودی بر اساس js/cars-data\.js:[^\n]+", line, text)
    if n != 1:
        raise ValueError(f"llms.txt: خط دامنهٔ قیمت {n} بار پیدا شد (باید ۱ باشد)")
    write(path, text)


def main(root=ROOT, db=None, out=print):
    inv = root / ".hermes" / "admin" / "inventory.json"
    cars_js = root / "js" / "cars-data.js"
    html = root / "index.html"
    llms = root / "llms.txt"
    db = Path(db) if db else root / ".hermes" / "price-history" / "prices.db"

    try:
        spots = db_prices(db)
    except sqlite3.Error as e:
        print(f"ERROR: prices.db ناخوانا است ({db}): {e}", file=sys.stderr)
        return 1
    if not spots:
        print(f"ERROR: هیچ قیمتی برای منبع '{SOURCE}' در {db} نیست", file=sys.stderr)
        return 1

    cars = json.loads(inv.read_text(encoding="utf-8"))
    ps = script_module("price-sync")          # تنها منبع نگاشت cohort -> (brand,model,trim,year)
    adm = script_module("admin-local")        # رندرر/فرمتر رسمی پنل (تک‌منبع فرمت قیمت)

    def key_of(car):
        m = next((x for x in ps.CAR_MAP if re.search(x["match"], car["title"])), None)
        return (m["brand"], m["model"], m["trim"], m["year"]) if m else None

    old_by_id = {c["id"]: c["price"] for c in cars}
    counts, lines, flags = plan(cars, spots, key_of)

    print("=== price mirror report ===")
    for line in lines:
        print("  " + line)
    for flag in flags:
        print("  " + flag)
    print(f"applied={counts['applied']} unchanged={counts['unchanged']} "
          f"suppressed={counts['suppressed']} unmapped={counts['unmapped']} "
          f"flags={len(flags)} source={SOURCE} db={db}")

    if not counts["applied"]:
        print("no change -> دارایی‌های وب دست‌نخورده (صفر چرن)")
        return 0

    adm.validate_cars(cars)                   # priceFormatted/priceMillion از price مشتق می‌شوند
    write = adm.atomic_write
    write(inv, json.dumps(cars, ensure_ascii=False, indent=2) + "\n")
    write(cars_js, adm.render_cars_js(cars))
    update_index_html(html, cars, old_by_id, write)
    update_llms(llms, cars, write)
    print(f"written: {inv.name} cars-data.js index.html llms.txt "
          f"({counts['applied']} price(s) applied)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
