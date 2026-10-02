#!/usr/bin/env python3
"""
Novin Khodro price fetch + DB sync (kanban t_b982f0cc).

Every run: fetch free-market spot price per active inventory car via
market-price-extractor cohorts (strict - no silent fallbacks), validate
(kanban t_60194ce4), upsert into .hermes/price-history/prices.db keyed by
(source, brand, model, trim, year), append price_history only when price
actually changes (trackable, no dupes).

Validation gate (never silently replace a healthy price with a bad one):
  - price outside per-car logical min/max  -> quarantine (kept for review)
  - jump > 30% vs last stored price        -> quarantine, old price stays
  - missing/invalid price, invalid source  -> skip + count
  - every run prints summary: updated / skipped / quarantined / errors

Exit codes: 0 ok | 1 source/network failure (logged, never silent) | 2 bad args.
Idempotent: re-run with same data -> rows unchanged, zero new history rows.
"""

import json
import os
import re
import sqlite3
import sys
import importlib.util
from datetime import datetime, timezone, timedelta

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, ".hermes", "price-history", "prices.db")
INVENTORY_PATH = os.path.join(PROJECT_ROOT, ".hermes", "admin", "inventory.json")
TEHRAN = timezone(timedelta(hours=3, minutes=30))

# inventory title -> extractor cohort key + normalized (brand, model, trim, year)
# min/max = per-car logical free-market bounds (Toman); outside -> quarantine.
# Xtrim floor 9B: bama cohort ~9.875B valid, showroom 11.45B premium — never sync down.
CAR_MAP = [
    {"match": "اکستریم", "cohort": "xtrim_vx", "brand": "chery", "model": "Xtrim",
     "trim": "VX 4WD", "year": "1403",
     "min": 9_000_000_000, "max": 13_000_000_000},
    {"match": "۲۰۷i", "cohort": "peugeot_207", "brand": "peugeot", "model": "207i",
     "trim": "Panorama Manual", "year": "1403",
     "min": 1_800_000_000, "max": 2_600_000_000},
    {"match": "دنا پلاس", "cohort": "dena_plus", "brand": "ikco", "model": "Dena Plus",
     "trim": "Turbo Automatic Optional", "year": "1403",
     "min": 2_300_000_000, "max": 3_100_000_000},
    {"match": "i20", "cohort": "hyundai_i20", "brand": "hyundai", "model": "i20",
     "trim": "Kerman Motor", "year": "1397",
     "min": 3_500_000_000, "max": 4_800_000_000},
]

VALID_SOURCES = {"bama"}
MAX_PRICE_JUMP = 0.30  # vs last stored price; beyond -> quarantine for review


def load_extractor():
    spec = importlib.util.spec_from_file_location(
        "mpe", os.path.join(PROJECT_ROOT, "scripts", "market-price-extractor.py"))
    assert spec and spec.loader
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def init_db(db):
    os.makedirs(os.path.dirname(db), exist_ok=True)
    con = sqlite3.connect(db)
    con.executescript("""
        CREATE TABLE IF NOT EXISTS prices (
            id INTEGER PRIMARY KEY,
            source TEXT NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL,
            trim TEXT NOT NULL, year TEXT NOT NULL,
            price INTEGER NOT NULL CHECK (price > 0),
            currency TEXT NOT NULL DEFAULT 'TOMAN',
            fetched_at TEXT NOT NULL,
            UNIQUE (source, brand, model, trim, year)
        );
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY,
            price_id INTEGER NOT NULL REFERENCES prices(id),
            price INTEGER NOT NULL,
            changed_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS quarantine (
            id INTEGER PRIMARY KEY,
            source TEXT NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL,
            trim TEXT NOT NULL, year TEXT NOT NULL,
            price INTEGER NOT NULL,
            reason TEXT NOT NULL,
            quarantined_at TEXT NOT NULL
        );
    """)
    return con


def validate(rec, mapping, old_price):
    """-> None (ok) | ("skip", why) | ("quarantine", why).
    Skip = unusable record (no/invalid price, bad source). Quarantine =
    plausible-looking but untrusted value — kept for review, NEVER replaces
    a healthy stored price silently."""
    if rec["source"] not in VALID_SOURCES:
        return "skip", f"invalid source '{rec['source']}'"
    if not isinstance(rec["price"], (int, float)) or isinstance(rec["price"], bool) \
            or rec["price"] <= 0:
        return "skip", f"missing/invalid price {rec['price']!r}"
    if not (mapping["min"] <= rec["price"] <= mapping["max"]):
        return "quarantine", (f"out of bounds {rec['price']:,} not in "
                              f"[{mapping['min']:,}..{mapping['max']:,}]")
    if old_price is not None and abs(rec["price"] - old_price) > MAX_PRICE_JUMP * old_price:
        return "quarantine", f"jump {rec['price']:,} vs {old_price:,} > {MAX_PRICE_JUMP:.0%}"
    return None


def upsert(con, rec, now_iso):
    """Returns (action, price_id). action in {inserted, updated, unchanged}."""
    cur = con.execute(
        "SELECT id, price FROM prices "
        "WHERE source=? AND brand=? AND model=? AND trim=? AND year=?",
        (rec["source"], rec["brand"], rec["model"], rec["trim"], rec["year"]))
    row = cur.fetchone()
    if row is None:
        cur = con.execute(
            "INSERT INTO prices (source,brand,model,trim,year,price,fetched_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (rec["source"], rec["brand"], rec["model"], rec["trim"],
             rec["year"], rec["price"], now_iso))
        pid = cur.lastrowid
        con.execute("INSERT INTO price_history (price_id,price,changed_at) VALUES (?,?,?)",
                    (pid, rec["price"], now_iso))
        return "inserted", pid
    pid, old = row
    if old != rec["price"]:
        con.execute("UPDATE prices SET price=?, fetched_at=? WHERE id=?",
                    (rec["price"], now_iso, pid))
        con.execute("INSERT INTO price_history (price_id,price,changed_at) VALUES (?,?,?)",
                    (pid, rec["price"], now_iso))
        return f"updated {old}->{rec['price']}", pid
    con.execute("UPDATE prices SET fetched_at=? WHERE id=?", (now_iso, pid))
    return "unchanged", pid


def load_inventory():
    with open(INVENTORY_PATH, encoding="utf-8") as f:
        inv = json.load(f)
    return inv if isinstance(inv, list) else inv.get("cars", [])


def run(db=DB_PATH, strict=True, fetcher=None, source="bama"):
    """fetcher(cohort)->price override for tests; else live extractor."""
    now_iso = datetime.now(TEHRAN).isoformat(timespec="seconds")
    cars = load_inventory()
    mpe = None if fetcher else load_extractor()
    con = init_db(db)
    errors, report = [], []
    counts = {"inserted": 0, "updated": 0, "unchanged": 0,
              "skipped": 0, "quarantined": 0}
    for car in cars:
        title = car.get("title", "")
        mapping = next((m for m in CAR_MAP if re.search(m["match"], title)), None)
        if mapping is None:
            errors.append(f"no cohort mapping for '{title}' (id {car.get('id')})")
            continue
        try:
            price = fetcher(mapping["cohort"]) if fetcher \
                else mpe.get_market_spot_price(mapping["cohort"], strict=strict)
        except Exception as e:
            errors.append(f"{title}: fetch failed: {e}")
            continue
        rec = {"source": source, "brand": mapping["brand"], "model": mapping["model"],
               "trim": mapping["trim"], "year": mapping["year"], "price": price}
        old = con.execute(
            "SELECT price FROM prices WHERE source=? AND brand=? AND model=? AND trim=? AND year=?",
            (rec["source"], rec["brand"], rec["model"], rec["trim"], rec["year"])).fetchone()
        verdict = validate(rec, mapping, old[0] if old else None)
        if verdict:
            kind, why = verdict
            counts["skipped" if kind == "skip" else "quarantined"] += 1
            if kind == "quarantine":
                con.execute(
                    "INSERT INTO quarantine "
                    "(source,brand,model,trim,year,price,reason,quarantined_at) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (rec["source"], rec["brand"], rec["model"], rec["trim"],
                     rec["year"], rec["price"], why, now_iso))
            report.append(f"[{kind}] {rec['brand']} {rec['model']} {rec['trim']}: {why}")
            continue
        rec["price"] = int(rec["price"])
        action, pid = upsert(con, rec, now_iso)
        counts["inserted" if action == "inserted"
               else "updated" if action.startswith("updated")
               else "unchanged"] += 1
        report.append(f"[{pid}] {rec['brand']} {rec['model']} {rec['trim']} "
                      f"{rec['year']}: {rec['price']:,} T -> {action}")
    con.commit()
    con.close()
    print("=== price-sync report ===")
    for line in report:
        print("  " + line)
    if errors:
        print("=== ERRORS ===", file=sys.stderr)
        for e in errors:
            print("  " + e, file=sys.stderr)
    print(f"updated={counts['inserted'] + counts['updated']} "
          f"unchanged={counts['unchanged']} skipped={counts['skipped']} "
          f"quarantined={counts['quarantined']} errors={len(errors)} at {now_iso}")
    return 1 if (errors or not report) else 0


if __name__ == "__main__":
    if "--soft" in sys.argv:
        sys.exit(run(strict=False))
    sys.exit(run())
