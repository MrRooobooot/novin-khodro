#!/usr/bin/env python3
"""تولید og-image.jpg — ۱۲۰۰×۶۳۰ برای Open Graph (واتساپ/توییتر/فیسبوک)"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630
img = Image.new("RGB", (W, H), "#0B1220")

# گرادیان عمودی سرمه‌ای
overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
for y in range(H):
    t = y / H
    od.line([(0, y), (W, y)], fill=(int(11 + 8 * t), int(18 + 15 * t), int(32 + 30 * t), 255))
img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

# هاله آبی محو بالا-راست
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
for i in range(50):
    a = int(2.4 * (50 - i))
    gd.ellipse([W - 450 - i * 9, -350 - i * 6, W + 150 + i * 9, 250 + i * 6], fill=(29, 78, 216, a))
glow = glow.filter(ImageFilter.GaussianBlur(30))
img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

# خط برند افقی پایین (گرادیان آبی→قرمز شبیه برند)
strip = Image.new("RGBA", (W, 8), (0, 0, 0, 0))
sd = ImageDraw.Draw(strip)
for x in range(W):
    t = x / W
    sd.line([(x, 0), (x, 8)], fill=(int(29 + 191 * t), int(78 - 40 * t), int(216 - 90 * t), 255))
img.paste(strip, (0, H - 8))

d = ImageDraw.Draw(img)

FA_BLACK = "Vazirmatn-Black.ttf"
FA_BOLD = "Vazirmatn-Bold.ttf"
FA_REG = "Vazirmatn-Regular.ttf"

f_title = ImageFont.truetype(FA_BLACK, 74)
f_sub = ImageFont.truetype(FA_BOLD, 34)
f_small = ImageFont.truetype(FA_REG, 26)
f_phone = ImageFont.truetype(FA_BOLD, 30)

def center(text, f, y, fill):
    box = d.textbbox((0, 0), text, font=f)
    w = box[2] - box[0]
    d.text(((W - w) / 2, y), text, font=f, fill=fill)

# نوار برچسب بالای عنوان
center("طرح ویژه نمایشگاه نوین خودرو در سراسر تهران", f_small, 120, "#93C5FD")

# عنوان اصلی
center("خرید از شما، اقساط از ما!", f_title, 195, "#FFFFFF")

# خط زیرین
d.rounded_rectangle([W / 2 - 90, 320, W / 2 + 90, 328], radius=4, fill="#DC2626")

# زیرعنوان
center("تسهیلات تا ۶۰٪ ارزش خودرو • بازپرداخت ۶ تا ۲۴ ماهه", f_sub, 370, "#E2E8F0")

# بج‌های اعتماد
center("کارشناسی کتبی رسمی  |  تسویه نقدی فوری  |  انتقال سند در دفترخانه", f_small, 460, "#94A3B8")

# تلفن
center("۰۲۱ - ۶۶۱۲۰۳۳۲", f_phone, 520, "#93C5FD")

img.save("images/og-image.jpg", "JPEG", quality=90, optimize=True)
print("images/og-image.jpg:", img.size)
