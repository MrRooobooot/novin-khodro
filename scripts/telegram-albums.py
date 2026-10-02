#!/usr/bin/env python3
"""sendPhoto albums (2 real photos per car) + refreshed captions, Sep 19 2026."""
import json, subprocess, os, tempfile, shutil

ROOT = str(__import__("pathlib").Path(__file__).resolve().parent.parent)
TOKEN = open(f"{ROOT}/.hermes/secrets/telegram_bot_token").read().strip()
CHAT = "-1004392127354"
API = f"https://api.telegram.org/bot{TOKEN}"
TMP = tempfile.mkdtemp(prefix="tg-album-")

def cv(src, name):
    dst = os.path.join(TMP, name)
    subprocess.run(["sips","-s","format","jpeg","-s","formatOptions","88",
                    f"{ROOT}/{src}","--out",dst],check=True,capture_output=True)
    return dst

def post(media, caption):
    args = ["curl","-s",f"{API}/sendMediaGroup","--form",f"chat_id={CHAT}",
            "--form","parse_mode=HTML"]
    files = []
    for i,(src,name) in enumerate(media):
        f = cv(src, name)
        files.append(f)
        args += ["--form", f"photo{i}=@{f}"]
    items = [{"type":"photo","media":f"attach://photo{i}",
              **({"caption":caption,"parse_mode":"HTML"} if i==0 else {})}
             for i in range(len(media))]
    args += ["--form", "media="+json.dumps(items, ensure_ascii=False)]
    r = subprocess.run(args, capture_output=True, text=True)
    res = json.loads(r.stdout)
    ok = res.get("ok")
    mid = (res.get("result") or [{}])[0].get("message_id") if ok else None
    print("ALBUM:", ok, mid, res.get("description",""))
    return ok, mid

XTRIM = """🔥 <b>اکستریم VX شاسی‌بلند — پرچم‌دار صفر ایران</b>

لوکس‌ترین شاسی‌بلند بازار با موتور توربوی ۱۹۷ اسبی و گیربکس ۷ سرعته DCT.
✅ صفر خشک، بدون حتی یک خط و خش
✅ گارانتی ۷ ساله فعال مدیران خودرو
✅ سقف پانوراما، HUD، صوتی سونی، صندلی ماساژور

💰 <b>۱۱,۴۵۰,۰۰۰,۰۰۰ تومان</b>
📅 اقساط از ۵۰٪ پیش‌پرداخت:
• ۱۲ ماهه: ~۶۸۰ میلیون/ماه
• ۲۴ ماهه: ~۴۴۰ میلیون/ماه

📍 ستارخان، میدان توحید، نصرت غربی، پلاک ۲۱
📞 ۰۲۱-۶۶۱۲۰۳۳۲
🌐 novinkhodro.shop

#اکستریم_VX #نوین_خودرو"""

P207 = """🚗 <b>پژو ۲۰۷i پانوراما دنده‌ای — به‌روزترین قیمت روز</b>

قیمت این صفرِ محبوب امروز بر اساس نرخ لحظه‌ای بازار آزاد تثبیت شد:
💰 <b>۲,۲۵۰,۰۰۰,۰۰۰ تومان</b> (به‌روزرسانی ۲۱ شهریور)

✅ صفر کیلومتر تحویل روز + کارت طلایی
✅ سقف تمام‌شیشه‌ای پانوراما
✅ ۳ سال گارانتی رسمی ایران خودرو

📅 اقساط از ۵۰٪ پیش‌پرداخت (۱,۱۲۵ میلیون):
• ۱۲ ماهه: ~۱۳۰ میلیون/ماه
• ۲۴ ماهه: ~۸۶ میلیون/ماه

📍 ستارخان، میدان توحید، نصرت غربی، پلاک ۲۱
📞 ۰۲۱-۶۶۱۲۰۳۳۲
🌐 novinkhodro.shop

#پژو_207 #نوین_خودرو"""

DENA = """🚙 <b>دنا پلاس توربو آپشنال — در حد صفر، کارشناسی‌شده</b>

فقط ۴,۰۰۰ کیلومتر کارکرد! سند تک‌برگ، بیمه ۱۱ ماه، گارانتی فعال ایران خودرو.
✅ کارشناسی کتبی ۱۰۰٪ با ضمانت سلامت
✅ سانروف، سنسور باران و نور، TPMS
✅ تحویل فوری — نقدی یا اقساطی

💰 <b>۲,۸۱۰,۰۰۰,۰۰۰ تومان</b>
📅 اقساط از ۵۰٪ پیش‌پرداخت:
• ۱۲ ماهه: ~۱۷۰ میلیون/ماه
• ۲۴ ماهه: ~۱۱۰ میلیون/ماه

📍 ستارخان، میدان توحید، نصرت غربی، پلاک ۲۱
📞 ۰۲۱-۶۶۱۲۰۳۳۲
🌐 novinkhodro.shop

#دنا_پلاس #نوین_خودرو"""

PLAN = """📋 <b>طرح «خرید از شما، اقساط از ما» چطور کار می‌کند؟</b>

۱️⃣ هر ماشینی از هر جای تهران انتخاب کنید — دیوار، باما یا هر نمایشگاهی
۲️⃣ ما تا ۵۰٪ تا ۶۰٪ مبلغ را نقد می‌کنیم
۳️⃣ مابقی را ۶ تا ۲۴ ماهه قسطی می‌پردازید

✅ کارشناسی کتبی ۱۰۰٪ کنار شما
✅ قرارداد با کارشناس حقوقی نمایشگاه
✅ بررسی مدارک در کمتر از ۲ ساعت
✅ بدون منشی صوتی — تماس مستقیم با نمایشگاه

خدمات فعلی: تهران و کرج
📍 ستارخان، میدان توحید، نصرت غربی، پلاک ۲۱
📞 ۰۲۱-۶۶۱۲۰۳۳۲
🌐 novinkhodro.shop

#اقساط_خودرو #نوین_خودرو"""

results = []
for media, cap in [
    ([("images/cars/xtrim-vx-v2.webp","x1.jpg"), ("images/hero/xtrim-vx.webp","x2.jpg")], XTRIM),
    ([("images/cars/peugeot-207.webp","p1.jpg"), ("images/hero/peugeot-207.webp","p2.jpg")], P207),
    ([("images/cars/dena-plus.webp","d1.jpg"), ("images/hero/dena-plus.webp","d2.jpg")], DENA),
]:
    assert len(cap) <= 1024, len(cap)
    ok, mid = post(media, cap)
    results.append({"message_id": mid, "album": cap.split("\n")[0][:40]})

# plan explainer — single photo (og-image)
og = os.path.join(TMP, "og.jpg")
subprocess.run(["sips","-s","format","jpeg","-s","formatOptions","88",
                f"{ROOT}/images/og-image.jpg","--out",og],check=True,capture_output=True)
args = ["curl","-s",f"{API}/sendPhoto","--form",f"chat_id={CHAT}","--form","parse_mode=HTML",
        f"--form","photo=@{og}", f"--form","caption={PLAN}"]
res = json.loads(subprocess.run(args, capture_output=True, text=True).stdout)
mid = (res.get("result") or {}).get("message_id")
print("PLAN:", res.get("ok"), mid, res.get("description",""))
results.append({"message_id": mid, "album": "plan-explainer"})

shutil.rmtree(TMP, ignore_errors=True)
log = f"{ROOT}/scripts/telegram-posted.json"
old = json.load(open(log)) if os.path.exists(log) else []
old.append({"date":"2026-09-19-refresh","posts":results})
json.dump(old, open(log,"w"), ensure_ascii=False, indent=1)
print("log total:", sum(len(e.get("posts",[])) for e in old))
