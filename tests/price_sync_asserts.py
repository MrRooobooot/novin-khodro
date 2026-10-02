#!/usr/bin/env python3
"""Assert-based test for scripts/price-sync.py (kanban t_b982f0cc).
Fixture fetcher, temp DB — checks upsert, idempotency, history, error exit."""

import os
import sqlite3
import sys
import tempfile
import importlib.util

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location(
    "price_sync", os.path.join(ROOT, "scripts", "price-sync.py"))
assert spec and spec.loader
ps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ps)

FIXTURE = {"xtrim_vx": 11_450_000_000, "peugeot_207": 2_100_000_000,
           "dena_plus": 2_750_000_000, "hyundai_i20": 4_050_000_000}

def rows(db):
    con = sqlite3.connect(db)
    p = con.execute("SELECT source,brand,model,trim,year,price FROM prices ORDER BY id").fetchall()
    h = con.execute("SELECT count(*) FROM price_history").fetchone()[0]
    con.close()
    return p, h

def main():
    inv = ps.load_inventory()
    assert inv and all("title" in c for c in inv), "fixture inventory must load"
    n_cars = len(inv)

    with tempfile.TemporaryDirectory() as td:
        db = os.path.join(td, "prices.db")

        # 1. first manual run: every mapped car recorded with price + fetched_at
        rc = ps.run(db=db, fetcher=lambda k: FIXTURE[k])
        assert rc == 0, f"run1 rc={rc}"
        p, h = rows(db)
        assert len(p) == n_cars, f"expected {n_cars} rows, got {len(p)}"
        assert h == n_cars, "each insert must seed one history row"
        con = sqlite3.connect(db)
        bad = con.execute("SELECT count(*) FROM prices WHERE fetched_at IS NULL OR fetched_at=''").fetchone()[0]
        con.close()
        assert bad == 0, "fetched_at must be set on all rows"
        prices = {(r[1], r[2], r[3]): r[5] for r in p}
        assert prices[("chery", "Xtrim", "VX 4WD")] == 11_450_000_000
        assert prices[("peugeot", "207i", "Panorama Manual")] == 2_100_000_000

        # 2. re-run identical fixture -> idempotent: no dupes, no new history
        rc = ps.run(db=db, fetcher=lambda k: FIXTURE[k])
        assert rc == 0
        p2, h2 = rows(db)
        assert len(p2) == n_cars, f"UNIQUE key violated: {len(p2)} rows"
        assert h2 == h, f"unchanged price must not append history ({h} -> {h2})"

        # 3. price change -> UPDATE not INSERT, one new history row
        changed = dict(FIXTURE, dena_plus=2_900_000_000)
        rc = ps.run(db=db, fetcher=lambda k: changed[k])
        assert rc == 0
        p3, h3 = rows(db)
        assert len(p3) == n_cars, "update must not insert"
        assert h3 == h2 + 1, "price change must append exactly one history row"
        dena = [r for r in p3 if r[2] == "Dena Plus"][0]
        assert dena[5] == 2_900_000_000

        # 4. network/source error -> loud, non-zero exit, no silent crash, no write
        def boom(k):
            raise OSError("simulated 5xx / timeout")
        rc = ps.run(db=db, fetcher=boom)
        assert rc == 1, f"fetch failure must exit 1, got {rc}"
        p4, h4 = rows(db)
        assert p4 == p3 and h4 == h3, "failed run must not mutate DB"

        # 5. CHECK constraint: price>0 rejected
        con = sqlite3.connect(db)
        try:
            con.execute("INSERT INTO prices (source,brand,model,trim,year,price,fetched_at) "
                        "VALUES ('bama','x','y','z','1',0,'now')")
            assert False, "CHECK price>0 must reject zero"
        except sqlite3.IntegrityError:
            pass
        con.close()

        # --- validation gate (kanban t_60194ce4) ---
        baseline_p, baseline_h = p4, h4  # state after test 4
        last_good = dict(FIXTURE, dena_plus=2_900_000_000)  # == baseline state

        # 6. out-of-bounds outlier -> quarantine, healthy price untouched
        outlier = dict(last_good, dena_plus=999_000_000_000)
        rc = ps.run(db=db, fetcher=lambda k: outlier[k])
        assert rc == 0, f"quarantine run should not error-exit, rc={rc}"
        p5, h5 = rows(db)
        assert p5 == baseline_p and h5 == baseline_h, \
            "outlier must never mutate prices/history"
        con = sqlite3.connect(db)
        q = con.execute("SELECT brand,model,price,reason FROM quarantine").fetchall()
        con.close()
        assert len(q) == 1 and q[0][1] == "Dena Plus" \
            and q[0][2] == 999_000_000_000 and "out of bounds" in q[0][3], \
            f"expected 1 quarantine row, got {q}"

        # 7. missing price (None) -> skip, no quarantine row, no mutation
        missing = dict(last_good, peugeot_207=None)
        rc = ps.run(db=db, fetcher=lambda k: missing[k])
        assert rc == 0
        p6, h6 = rows(db)
        assert p6 == baseline_p and h6 == baseline_h, "skip must not mutate DB"
        con = sqlite3.connect(db)
        qn = con.execute("SELECT count(*) FROM quarantine").fetchone()[0]
        con.close()
        assert qn == 1, "skip must NOT quarantine (only bound/jump violations)"

        # 8. >30% jump within bounds -> quarantine, old price stays
        with tempfile.TemporaryDirectory() as td2:
            db2 = os.path.join(td2, "prices.db")
            seed = dict(FIXTURE, dena_plus=2_350_000_000)
            assert ps.run(db=db2, fetcher=lambda k: seed[k]) == 0
            jumped = dict(seed, dena_plus=3_070_000_000)  # +30.6%, inside [2.3B..3.1B]
            assert ps.run(db=db2, fetcher=lambda k: jumped[k]) == 0
            con = sqlite3.connect(db2)
            dena = con.execute(
                "SELECT price FROM prices WHERE model='Dena Plus'").fetchone()[0]
            qj = con.execute(
                "SELECT reason FROM quarantine WHERE model='Dena Plus'").fetchall()
            con.close()
            assert dena == 2_350_000_000, f"jump must not replace price, got {dena}"
            assert qj and "jump" in qj[0][0], f"expected jump quarantine, got {qj}"

        # 9. invalid source -> skip all, counted, prices empty
        with tempfile.TemporaryDirectory() as td3:
            db3 = os.path.join(td3, "prices.db")
            rc = ps.run(db=db3, fetcher=lambda k: FIXTURE[k], source="telegram_bot")
            con = sqlite3.connect(db3)
            pn = con.execute("SELECT count(*) FROM prices").fetchone()[0]
            con.close()
            assert pn == 0, "invalid source must never write prices"
            assert rc == 0, "pure skips are a clean run, counted in summary"

    print("OK: price-sync 9/9 assertions passed")

if __name__ == "__main__":
    sys.exit(main())
