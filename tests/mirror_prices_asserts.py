#!/usr/bin/env python3
"""Assert-based test for scripts/sync-inventory-prices.py (kanban t_5f04af2a).

Fixture root (copy of index.html/llms.txt + rendered cars-data.js) + temp
prices.db — checks: apply-only-upward mirror, atomic writes, derived assets
(JSON-LD Offer/priceRange/slide label/llms range), zero churn on no-change,
loud exit on unusable DB, no .tmp leftovers.
"""

import importlib.util
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "sync_inventory_prices", ROOT / "scripts" / "sync-inventory-prices.py")
assert spec and spec.loader
mirror = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mirror)

adm = mirror.script_module("admin-local")
FA = mirror.fa_ascii


def make_db(path, rows):
    con = sqlite3.connect(path)
    con.executescript("""
        CREATE TABLE prices (
            id INTEGER PRIMARY KEY, source TEXT NOT NULL, brand TEXT NOT NULL,
            model TEXT NOT NULL, trim TEXT NOT NULL, year TEXT NOT NULL,
            price INTEGER NOT NULL, currency TEXT DEFAULT 'TOMAN',
            fetched_at TEXT NOT NULL,
            UNIQUE (source, brand, model, trim, year));
    """)
    for brand, model, trim, year, price in rows:
        con.execute("INSERT INTO prices (source,brand,model,trim,year,price,fetched_at) "
                    "VALUES ('bama',?,?,?,?,?,'2026-09-15T06:00:00+03:30')",
                    (brand, model, trim, year, price))
    con.commit()
    con.close()


def fixture(td):
    root = Path(td) / "repo"
    (root / ".hermes" / "admin").mkdir(parents=True)
    (root / "js").mkdir()
    inv = json.loads((ROOT / ".hermes" / "admin" / "inventory.json").read_text("utf-8"))
    (root / ".hermes" / "admin" / "inventory.json").write_text(
        json.dumps(inv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (root / "js" / "cars-data.js").write_text(adm.render_cars_js(inv), encoding="utf-8")
    for name in ("index.html", "llms.txt"):
        shutil.copy(ROOT / name, root / name)
    return root, inv


def mt(path):
    return os.stat(path).st_mtime_ns


def main():
    with tempfile.TemporaryDirectory() as td:
        root, inv = fixture(td)
        inv_path = root / ".hermes" / "admin" / "inventory.json"
        cars_js = root / "js" / "cars-data.js"
        html_path, llms_path = root / "index.html", root / "llms.txt"
        base = {c["id"]: c["price"] for c in inv}
        x_id = next(c["id"] for c in inv if "اکستریم" in c["title"])
        dena_id = next(c["id"] for c in inv if "دنا" in c["title"])
        up = 12_000_000_000
        quiet = lambda *a, **k: None

        # 1. upward spot applies + every derived asset moves in the same pass
        db1 = Path(td) / "up.db"
        make_db(db1, [("chery", "Xtrim", "VX 4WD", "1403", up),
                      ("peugeot", "207i", "Panorama Manual", "1403", base[2]),
                      ("ikco", "Dena Plus", "Turbo Automatic Optional", "1403",
                       base[dena_id])])
        assert mirror.main(root=root, db=db1, out=quiet) == 0
        saved = json.loads(inv_path.read_text("utf-8"))
        car = next(c for c in saved if c["id"] == x_id)
        assert car["price"] == up, "DB spot must raise the showroom price"
        assert car["priceFormatted"] == adm.fa_format(up), car["priceFormatted"]
        assert car["priceMillion"] == up // 1_000_000
        js = cars_js.read_text("utf-8")
        assert f'"price": {up}' in js and f'"priceMillion": {up // 1_000_000}' in js
        html = html_path.read_text("utf-8")
        anchor = html.find(f'"name": "{car["title"]}"')
        offer = html[html.find('"price":', anchor):html.find('"price":', anchor) + 40]
        assert f'"price": {up * 10}' in offer, f"JSON-LD Offer must be IRR (Toman*10): {offer}"
        assert f'"priceRange": "{base[2] * 10:,} - {up * 10:,} IRR"' in html, "priceRange stale"
        assert f'<span class="slide-price">{FA(up)} تومان</span>' in html, "slide label stale"
        llms = llms_path.read_text("utf-8")
        assert FA(up) in llms and FA(base[2]) in llms, "llms.txt range stale"
        assert not list(root.rglob("*.tmp")), ".tmp leftover after atomic writes"

        # 2. downward spot is reported, never applied (showroom premium kept)
        db2 = Path(td) / "down.db"
        make_db(db2, [("chery", "Xtrim", "VX 4WD", "1403", 9_875_000_000)])
        before = {p: mt(p) for p in (inv_path, cars_js, html_path, llms_path)}
        assert mirror.main(root=root, db=db2, out=quiet) == 0
        again = json.loads(inv_path.read_text("utf-8"))
        assert next(c for c in again if c["id"] == x_id)["price"] == up, "must not sync down"

        # 3. nothing to do -> zero writes (no mtime churn, no cache-bust churn)
        time.sleep(0.01)
        assert mirror.main(root=root, db=db2, out=quiet) == 0
        assert {p: mt(p) for p in before} == before, "no-change run must not touch assets"

        # 4. unusable DB fails loud (never silent-success)
        empty = Path(td) / "empty.db"
        make_db(empty, [])
        assert mirror.main(root=root, db=empty, out=quiet) == 1
        assert mirror.main(root=root, db=Path(td) / "missing.db", out=quiet) == 1
        assert json.loads(inv_path.read_text("utf-8")) == again, "failed run must not mutate"

    print("mirror_prices_asserts: 4/4 OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
