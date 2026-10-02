#!/bin/bash
# یک‌بار: پاک‌کردن فایل‌های داخلی/حساسی که در دورهای قبلی داخل docroot منتشر شده‌اند.
# (rsync --delete مسیرهای exclude را پاک نمی‌کند، پس این پاک‌سازی دستی لازم است.)
set -e
DOCROOT=/var/www/novin-khodro
if [ -f deploy.env ]; then . ./deploy.env; fi
HOST="${VPS_USER:-ubuntu}@${VPS_HOST:?VPS_HOST not set — copy deploy.env.example to deploy.env}"
ssh -i $HOME/.ssh/novinkhodro_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes \
  "$HOST" bash -s <<EOF
set -e
cd $DOCROOT
echo "--- before:"; du -sh . | cut -f1
# ۱) پوشه‌های داخلی
rm -rf .agents .hermes .serena scripts tests assets-out .git .gitignore
# ۲) فایل‌های ریشه‌ای غیر‌وب
rm -f nginx.conf package.json tsconfig.json design-tokens.json admin.html
rm -f *.md .DS_Store
# ۳) هر .DS_Store باقی‌مانده در زیرپوشه‌ها
find . -name '.DS_Store' -delete
echo "--- after:"; du -sh . | cut -f1
echo "--- root listing:"; ls -A | head -30
EOF
