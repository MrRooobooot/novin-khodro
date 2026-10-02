#!/usr/bin/env python3
"""Telegram channel publisher for Novin Khodro.
Reads js/cars-data.js (source of truth), builds Persian HTML captions,
converts webp -> jpg via sips, posts to channel. Token from .hermes/secrets/.
Usage: telegram-post.py [--send]   (default dry-run)
"""
import json, re, subprocess, sys, os, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN = open(os.path.join(ROOT, ".hermes/secrets/telegram_bot_token")).read().strip()
CHAT = "-1004392127354"
API = f"https://api.telegram.org/bot{TOKEN}"
SITE = "https://novinkhodro.shop"
PHONE = "021-66120332"
PHONE_FA = "۰۲۱-۶۶۱۲۰۳۳۲"

FA = str.maketrans("0123456789,", "۰۱۲۳۴۵۶۷۸۹٬")

def fa(s): return str(s).translate(FA)

def fmt_toman(n):
    return fa(f"{n:,}") + " تومان"

def millions(n):
    m = n / 1_000_000
    if m >= 100: m = round(m / 10) * 10
    else: m = round(m)
    return fa(int(m)) + " میلیون تومان"

def loan_example(price, down_pct=50, months=(12, 24)):
    """Loan = Price*(1-Down%); Monthly = (Loan*(1+0.035*Months))/Months"""
    loan = price * (1 - down_pct / 100)
    out = []
    for m in months:
        monthly = (loan * (1 + 0.035 * m)) / m
        out.append((m, monthly))
    return down_pct, out

def esc(t): return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def car_caption(c):
    down, rows = loan_example(c["price"])
    tag = re.sub(r"\s+", "_", c["title"].split("(")[0].strip())
    lines = [
        f"🚗 <b>{esc(c['title'])}</b>",
        f"✅ {esc(c['badge'])} | {esc(c['mileageText'])}",
        "",
        "<b>⚙️ مشخصات کلیدی:</b>",
        f"• موتور: {esc(c['engine'])}",
        f"• گیربکس: {esc(c['gearbox'])}",
        f"• رنگ: {esc(c['color'])}",
        f"• بیمه: {esc(c['insuranceText'])}",
        f"• گارانتی: {esc(c['warranty'])}",
        f"• سند: {esc(c['documentStatus'])}",
        "",
        f"💰 <b>قیمت نقدی: {esc(c['priceFormatted'])}</b>",
        f"📅 <b>خرید اقساطی (پیش‌پرداخت {fa(down)}٪):</b>",
    ]
    for m, monthly in rows:
        lines.append(f"• {fa(m)} ماهه: حدود <b>{millions(monthly)}</b>")
    lines += [
        "",
        "🔍 کارشناسی کتبی ۱۰۰٪ — خرید از شما، اقساط از ما",
        f"📞 {PHONE_FA}",
        f"🌐 {SITE}",
        "",
        f"#نوین_خودرو #{tag}",
    ]
    return "\n".join(lines)

def intro_caption():
    return f"""🏁 <b>نوین خودرو — نمایشگاه اتومبیل تهران</b>

خرید از شما، اقساط از ما!
هر خودرویی از هر جای تهران انتخاب کنید؛ ما تا ۵۰٪ الی ۶۰٪ مبلغ را نقد می‌کنیم و مابقی را ۶ الی ۲۴ ماهه اقساط می‌کنیم.

✅ کارشناسی کتبی ۱۰۰٪
✅ خودروهای صفر و کارکرده کارشناسی‌شده
✅ تسویه فوری نقدی
✅ سند قطعی و مدارک کامل

📍 تهران، ستارخان، میدان توحید، خیابان نصرت غربی، پلاک ۲۱
📞 {PHONE_FA}
🌐 {SITE}

#نوین_خودرو #اقساط_خودرو #نمایشگاه_تهران"""

def convert(src):
    """webp -> jpg via sips (telegram photo needs jpg/png)."""
    if not src.lower().endswith(".webp"): return src
    out = os.path.join(tempfile.gettempdir(), os.path.basename(src)[:-5] + ".jpg")
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "88",
                    os.path.join(ROOT, src), "--out", out], check=True,
                   capture_output=True)
    return out

def tg(method, **kw):
    args = ["curl", "-s", f"{API}/{method}",
            "--form", f"chat_id={CHAT}", "--form", "parse_mode=HTML"]
    photo = kw.pop("photo", None)
    if photo and os.path.exists(photo):
        args += ["--form", f"photo=@{photo}"]
    for k, v in kw.items():
        args += ["--form", f"{k}={v}"]
    r = subprocess.run(args, capture_output=True, text=True)
    return json.loads(r.stdout)

def main():
    send = "--send" in sys.argv
    node = subprocess.run(
        ["node", "-e",
         "const{carsData}=require(process.argv[1]);console.log(JSON.stringify(carsData))",
         os.path.join(ROOT, "js/cars-data.js")],
        capture_output=True, text=True, check=True)
    cars = json.loads(node.stdout)

    posts = [("intro", "images/og-image.jpg", intro_caption())]
    for c in cars:
        posts.append((c["id"], c["image"], car_caption(c)))

    posted = []
    for pid, img, cap in posts:
        assert len(cap) <= 1024, f"caption too long: {pid} ({len(cap)})"
        print(f"--- post {pid} | img={img} | {len(cap)} chars")
        print(cap, "\n")
        if not send: continue
        res = tg("sendPhoto", photo=convert(img), caption=cap)
        ok = res.get("ok")
        mid = res.get("result", {}).get("message_id")
        print(f"SENT {pid}: ok={ok} message_id={mid} {res.get('description','')}")
        if ok: posted.append({"id": pid, "message_id": mid})
    if send and posted:
        log = os.path.join(ROOT, "scripts/telegram-posted.json")
        old = json.load(open(log)) if os.path.exists(log) else []
        now = subprocess.run(["date", "-u", "+%FT%TZ"],
                             capture_output=True, text=True).stdout.strip()
        json.dump(old + [{"date": now, "posts": posted}],
                  open(log, "w"), ensure_ascii=False, indent=1)
        print(f"log -> {log} ({len(old)+len(posted)} total)")

if __name__ == "__main__":
    main()
