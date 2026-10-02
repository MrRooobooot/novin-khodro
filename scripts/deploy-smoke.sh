#!/bin/bash
# Deploy Novin Khodro to prod and smoke-check live origin
#
# امنیت: فقط دارایی‌های وب‌سرو می‌شوند. هر چیز داخلی (اسکریپت‌ها، تست‌ها، اسناد،
# استور پنل، تنظیمات nginx، دارایی‌های dev) باید exclude بماند — وگرنه روی
# https://novinkhodro.shop/scripts/deploy-smoke.sh و مشابهش عمومی می‌شود.
# نکته: مسیرهای exclude از --delete محافظت می‌شوند؛ برای پاک‌کردن باقی‌مانده‌های
# قدیمی روی سرور، scripts/purge-server-leaks.sh را یک‌بار اجرا کنید.
set -e
cd "$(cd "$(dirname "$0")/.." && pwd)"
if [ -f deploy.env ]; then . ./deploy.env; fi
HOST="${VPS_USER:-ubuntu}@${VPS_HOST:?VPS_HOST not set — copy deploy.env.example to deploy.env}"
# صفحات ثابت هر خودرو + sitemap از داده واقعی inventory بازتولید می‌شوند (بدون hardcode)
python3 scripts/build-car-pages.py
# صفحهٔ عمومی قیمت بازار آزاد (۸۸۵ تیپ / ۱۰۹ برند) از js/data/zero-prices.js
python3 scripts/build-prices-page.py
# احراز هویت با کلید ed25519 اختصاصی (رمز SSH از ریپو حذف شد — R51)
SSH_OPTS="ssh -i $HOME/.ssh/novinkhodro_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes"
rsync -az --delete \
  -e "$SSH_OPTS" \
  ./ "$HOST":/var/www/novin-khodro/ \
  --exclude .git \
  --exclude .gitignore \
  --exclude .well-known \
  --exclude .hermes \
  --exclude .agents \
  --exclude .serena \
  --exclude .DS_Store \
  --exclude node_modules \
  --exclude scripts \
  --exclude tests \
  --exclude 'assets/ikco' \
  --exclude assets-out \
  --exclude admin.html \
  --exclude nginx.conf \
  --exclude nginx-events.conf \
  --exclude design-tokens.json \
  --exclude package.json \
  --exclude tsconfig.json \
  --exclude '*.md'
HOST=https://novinkhodro.shop
echo "--- og:url:"; curl -k -s "$HOST/" | grep -o 'property="og:url" content="[^"]*"'
echo "--- css cache-bust:"; curl -k -s "$HOST/" | grep -o 'style.css?v=[^"]*'
echo "--- llms.txt head:"; curl -k -s "$HOST/llms.txt" | head -3
echo "--- sitemap lastmod:"; curl -k -s "$HOST/sitemap.xml" | grep -o '<lastmod>[^<]*</lastmod>' | head -2
