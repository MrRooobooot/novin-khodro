#!/usr/bin/env python3
"""گزارش بازدهی (ROI) واقعی نوین‌خودرو از لاگ‌های خود سرور — بدون هیچ ابزار ثالث.

منابع: .hermes/logs/nginx/access.log*  +  nk-events.log* (رخدادهای /t از js/analytics.js)
اجرا:
  python3 scripts/roi_report.py                 # گزارش متنی
  python3 scripts/roi_report.py --serve 8791    # داشبورد 127.0.0.1:8791
ابتدا: bash scripts/fetch-access-logs.sh
"""
import gzip
import glob
import html
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import unquote

# اهداف تعیین‌شده (round تصمیم R75): ۱۰ سرنخ در هفته، ۵۰ بازدید ارگانیک در روز
TARGET_LEADS_PER_WEEK = 10
TARGET_VISITORS_PER_DAY = 50

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".hermes", "logs", "nginx")

LINE_RE = re.compile(
    r'^(?P<ip>\S+) \S+ \S+ \[(?P<ts>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+)[^"]*" '
    r'(?P<status>\d{3}) (?P<size>\S+) "(?P<ref>[^"]*)" "(?P<ua>[^"]*)"'
)
BOT_RE = re.compile(
    r'bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|curl|wget|'
    r'python-requests|go-http|monitoring|uptime|semrush|ahrefs|dataprovider|bytespider|'
    r'petalbot|yisou|sogou|exabot|seznam|infrawatch|zgrab|masscan|nmap',
    re.I,
)
# مرورگر مدرن واقعی: اگر امضا نداشت، ربات/اسکنر است
MODERN_RE = re.compile(r'(Chrome/1[0-9]{2}|Firefox/1[0-9]{2}|Safari/605|Edg/1[0-9]{2}|Version/1[0-9])', re.I)
SEARCH_BOT_RE = re.compile(r'googlebot|bingbot|yandex|duckduckbot|baiduspider', re.I)


def read_logs(prefix):
    out = []
    for path in sorted(glob.glob(os.path.join(LOG_DIR, prefix))):
        opener = gzip.open if path.endswith(".gz") else open
        try:
            with opener(path, "rt", errors="replace") as fh:
                out.extend(fh)
        except OSError as exc:
            print(f"! {path}: {exc}", file=sys.stderr)
    return out


def parse_ts(ts):
    # 16/Sep/2026:11:39:04 +0000
    m = re.match(r'(\d{2})/(\w{3})/(\d{4}):(\d{2}:\d{2}:\d{2})', ts)
    return m.group(3) + "-" + m.group(2) + "-" + m.group(1) if m else "?"


def collect():
    days = defaultdict(lambda: {"req": 0, "visitors": set(), "human_req": 0, "bot": 0, "crawler": 0})
    refs = Counter()
    host_refs = Counter()
    human_paths = Counter()
    status = Counter()
    s404 = Counter()
    events = Counter()
    events_day = defaultdict(Counter)
    event_cars = Counter()
    event_places = Counter()
    visitors = set()
    event_ips = set()

    for line in read_logs("access.log*"):
        m = LINE_RE.match(line)
        if not m:
            continue
        ua = m.group("ua")
        day = parse_ts(m.group("ts"))
        path = m.group("path")
        d = days[day]
        d["req"] += 1
        status[m.group("status")] += 1
        if m.group("status") == "404":
            s404[path.split("?")[0]] += 1
        if SEARCH_BOT_RE.search(ua):
            d["crawler"] += 1
        is_bot = bool(BOT_RE.search(ua)) or not MODERN_RE.search(ua)
        if is_bot:
            d["bot"] += 1
        else:
            ip = m.group("ip")
            d["human_req"] += 1
            d["visitors"].add(ip)
            visitors.add(ip)
            human_paths[path.split("?")[0]] += 1
        ref = m.group("ref")
        if ref and ref != "-":
            host = re.sub(r'^https?://', '', ref).split("/")[0]
            host_refs[host] += 1
            if "novinkhodro" not in host and not re.match(r'^\d+\.\d+\.\d+\.\d+$', host):
                refs[host] += 1

    for line in read_logs("nk-events.log*"):
        parts = line.rstrip("\n").split("|")
        if len(parts) < 6:
            continue
        ts, name, car, place, value = parts[0], parts[1], parts[2], parts[3], parts[4]
        ip = parts[6] if len(parts) > 6 else "-"
        day = ts[:10]
        events[name or "?"] += 1
        events_day[day][name or "?"] += 1
        if car and car != "-":
            event_cars[f"{name}:{car}"] += 1
        if place and place != "-":
            event_places[f"{name}@{place}"] += 1
        if ip and ip != "-":
            event_ips.add(ip)

    leads = []
    for line in read_logs("nk-leads.log*"):
        parts = line.rstrip("\n").split("|")
        if len(parts) < 9:
            continue
        ts, ltype, name, phone, car, msg, value, place = (unquote(p) for p in parts[:8])
        leads.append({
            "ts": ts, "type": ltype, "name": name, "phone": phone,
            "car": car, "msg": msg, "value": value, "place": place,
            "ip": parts[8] if len(parts) > 8 else "-",
        })
    leads.sort(key=lambda x: x["ts"], reverse=True)
    lead_days = Counter(l["ts"][:10] for l in leads)
    recent = Counter(l["ts"][:10] for l in leads if l["ts"][:10] >= (date.today() - timedelta(days=6)).isoformat())

    conv = events["tel"] + events["wa"] + events["lead"]
    days_out = {}
    for k, v in sorted(days.items()):
        row = dict(v)
        row["visitors"] = len(v["visitors"])
        days_out[k] = row
    return {
        "days": days_out,
        "visitors_total": len(visitors),
        "visitor_days": sum(r["visitors"] for r in days_out.values()),
        "refs": refs,
        "host_refs": host_refs,
        "human_paths": human_paths,
        "status": status,
        "s404": s404,
        "events": events,
        "events_day": {k: dict(v) for k, v in sorted(events_day.items())},
        "event_cars": event_cars,
        "event_places": event_places,
        "event_ips": len(event_ips),
        "conversions": conv,
        "leads": leads,
        "lead_days": dict(lead_days),
        "leads_last_7d": sum(recent.values()),
        "leads_by_type": dict(Counter(l["type"] or "?" for l in leads)),
        "targets": {"leads_per_week": TARGET_LEADS_PER_WEEK, "visitors_per_day": TARGET_VISITORS_PER_DAY},
        "requests_total": sum(d["req"] for d in days.values()),
    }


def text_report(data):
    print("=" * 72)
    print("NOVIN KHODRO — ROI REPORT (server logs, first-party, no third party)")
    print("=" * 72)
    print(f"requests total    : {data['requests_total']}")
    print(f"unique visitors   : {data['visitors_total']}  (visitor-days {data['visitor_days']})")
    print(f"conversion events : {data['conversions']}  "
          f"(tel {data['events']['tel']} | wa {data['events']['wa']} | lead {data['events']['lead']})")
    print(f"event-session IPs : {data['event_ips']}")
    if data["visitor_days"]:
        print(f"click-through     : {data['conversions'] / data['visitor_days'] * 100:.1f}% of visitor-days")
    print("-" * 72)
    print(f"{'day':<12}{'req':>7}{'visitors':>10}{'human_req':>11}{'bot':>7}{'crawler':>9}{'conv':>6}")
    for day, d in data["days"].items():
        print(f"{day:<12}{d['req']:>7}{d['visitors']:>10}{d['human_req']:>11}{d['bot']:>7}"
              f"{d['crawler']:>9}{sum(data['events_day'].get(day, {}).values()):>6}")
    print("-" * 72)
    tgt = data["targets"]
    l7 = data["leads_last_7d"]
    print(f"LEAD INBOX (صندوق سرنخ) — ۷ روز اخیر: {l7} / هدف {tgt['leads_per_week']} در هفته "
          f"({l7 / tgt['leads_per_week'] * 100:.0f}%)")
    for k, v in Counter(data["leads_by_type"]).most_common():
        print(f"  {k:<10} {v:>6}")
    for lead in data["leads"][:10]:
        print(f"  {lead['ts'][:16]}  {lead['type']:<5} {lead['name'][:24]:<24} {lead['phone']:<12} "
              f"{lead['value'][:18]:<18} {lead['place'][:14]}")
    if not data["leads"]:
        print("  (خالی — تا اولین فرم واقعی)")
    print("-" * 72)
    print("CONVERSION EVENTS")
    for k, v in data["events"].most_common():
        print(f"  {k:<10} {v:>6}")
    if data["event_places"]:
        print("  -- by place --")
        for k, v in Counter(data["event_places"]).most_common(12):
            print(f"     {k:<28} {v:>5}")
    if data["event_cars"]:
        print("  -- by car --")
        for k, v in Counter(data["event_cars"]).most_common(12):
            print(f"     {k:<28} {v:>5}")
    print("INBOUND REFERRERS (marketing reach)")
    if data["refs"]:
        for k, v in data["refs"].most_common(12):
            print(f"  {v:>6}  {k}")
    else:
        print("  none")
    print("TOP HUMAN PATHS")
    for k, v in data["human_paths"].most_common(12):
        print(f"  {v:>6}  {k}")
    print("STATUS CODES")
    for k, v in data["status"].most_common():
        print(f"  {v:>6}  {k}")
    print("TOP 404 (crawl waste / broken links)")
    for k, v in data["s404"].most_common(10):
        print(f"  {v:>6}  {k}")


CSS = """
body{font-family:system-ui,-apple-system,'Vazirmatn',sans-serif;background:#0f1115;color:#e8eaed;
margin:0;padding:2rem;direction:rtl}
h1{font-size:1.4rem;margin:0 0 .3rem}h2{font-size:1.05rem;margin:1.8rem 0 .6rem;color:#c9b37e}
.kpis{display:flex;gap:.8rem;flex-wrap:wrap;margin:1rem 0}
.kpi{background:#171a21;border:1px solid #262b36;border-radius:12px;padding:.8rem 1rem;min-width:150px}
.kpi b{display:block;font-size:1.5rem;font-variant-numeric:tabular-nums}
.kpi span{color:#9aa0aa;font-size:.8rem}
table{border-collapse:collapse;width:100%;font-size:.85rem;font-variant-numeric:tabular-nums}
th,td{border:1px solid #262b36;padding:.4rem .55rem;text-align:right}
th{background:#171a21;color:#9aa0aa;font-weight:600}
tr:nth-child(even) td{background:#14171d}
"""


def html_report(data):
    def kpi(label, value, sub=""):
        return f"<div class='kpi'><b>{value}</b><span>{label}{(' — ' + sub) if sub else ''}</span></div>"

    def table(headers, rows):
        th = "".join(f"<th>{html.escape(str(h))}</th>" for h in headers)
        tr = "".join("<tr>" + "".join(f"<td>{html.escape(str(c))}</td>" for c in r) + "</tr>" for r in rows)
        return f"<table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>"

    day_rows = []
    for day, d in data["days"].items():
        ev = data["events_day"].get(day, {})
        day_rows.append([day, d["req"], d["visitors"], d["human_req"], d["bot"], d["crawler"],
                         ev.get("tel", 0), ev.get("wa", 0), ev.get("lead", 0)])
    parts = [
        "<!DOCTYPE html><html lang='fa'><head><meta charset='utf-8'>",
        "<meta name='viewport' content='width=device-width,initial-scale=1'>",
        "<title>داشبورد بازدهی نوین خودرو</title>", f"<style>{CSS}</style></head><body>",
        "<h1>داشبورد بازدهی — نمایشگاه نوین خودرو</h1>",
        "<p style='color:#9aa0aa;font-size:.85rem'>منبع: لاگ خود سرور (first-party). "
        "به‌روزرسانی: <code>bash scripts/fetch-access-logs.sh</code></p>",
        "<div class='kpis'>",
        kpi("بازدیدکننده یکتا", data["visitors_total"]),
        kpi("رخداد تماس", data["events"]["tel"]),
        kpi("رخداد واتساپ", data["events"]["wa"]),
        kpi("فرم فروشنده", data["events"]["lead"]),
        kpi("نرخ تماس+واتساپ", f"{(data['conversions'] / data['visitor_days'] * 100):.1f}%" if data["visitor_days"] else "—",
            "از بازدید"),
        kpi("بازدیدکننده/روز (میانگین)",
            f"{data['visitor_days'] / max(1, len(data['days'])):.0f}",
            f"هدف {data['targets']['visitors_per_day']}"),
        "</div>",
        "<h2>صندوق سرنخ (۷ روز اخیر / هدف هفتگی)</h2>",
        "<div class='kpis'>",
        kpi("سرنخ ۷ روز اخیر", data["leads_last_7d"], f"هدف {data['targets']['leads_per_week']} در هفته"),
        kpi("سرنخ فروشنده (sell)", data["leads_by_type"].get("sell", 0)),
        kpi("درخواست اقساط (calc)", data["leads_by_type"].get("calc", 0)),
        "</div>",
        table(["زمان", "نوع", "خودرو/نام", "شماره تماس", "کارکرد/سال", "محل", "IP"],
              [[l["ts"][:19], l["type"], l["name"], l["phone"], l["value"], l["place"], l["ip"]]
               for l in data["leads"][:100]] or [["—", "—", "—", "—", "—", "—", "—"]]),
        "<h2>روزانه</h2>",
        table(["روز", "کل درخواست", "بازدیدکننده", "درخواست انسانی", "ربات", "خزنده گوگل",
               "tel", "wa", "فرم"], day_rows),
        "<h2>رخدادها بر اساس محل</h2>",
        table(["رخداد@محل", "تعداد"], Counter(data["event_places"]).most_common(20) or [["—", 0]]),
        "<h2>رخدادها بر اساس خودرو</h2>",
        table(["رخداد:خودرو", "تعداد"], Counter(data["event_cars"]).most_common(20) or [["—", 0]]),
        "<h2>منابع ورودی</h2>",
        table(["ارجاع‌دهنده", "تعداد"], data["refs"].most_common(20) or [["—", 0]]),
        "<h2>پرتقاضاترین مسیرهای انسانی</h2>",
        table(["مسیر", "بازدید"], data["human_paths"].most_common(20)),
        "<h2>وضعیت پاسخ‌ها</h2>",
        table(["کد", "تعداد"], data["status"].most_common()),
        "<h2>۴۰۴ (هدر رفت خزش / لینک شکسته)</h2>",
        table(["مسیر", "تعداد"], data["s404"].most_common(15)),
        "</body></html>",
    ]
    return "".join(parts)


def serve(port):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith("/data.json"):
                body = json.dumps(collect(), ensure_ascii=False, default=list).encode()
                ctype = "application/json; charset=utf-8"
            else:
                body = html_report(collect()).encode()
                ctype = "text/html; charset=utf-8"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format, *args):  # noqa: A002 — امضای پایه http.server
            pass

    print(f"ROI dashboard: http://127.0.0.1:{port}/  (Ctrl+C to stop)")
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()


def main():
    args = sys.argv[1:]
    if args and args[0] == "--serve":
        serve(int(args[1]) if len(args) > 1 else 8791)
        return
    data = collect()
    if args and args[0] == "--html":
        with open(args[1] if len(args) > 1 else "/tmp/roi.html", "w", encoding="utf-8") as fh:
            fh.write(html_report(data))
        print("wrote html")
        return
    text_report(data)


if __name__ == "__main__":
    main()
