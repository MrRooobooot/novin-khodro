#!/bin/bash
# اعمال vhost + log_format نوین‌خودرو روی VPS (بکاپ می‌گیرد، قبل از reload تست می‌کند)
set -e
cd "$(cd "$(dirname "$0")/.." && pwd)"

if [ -f deploy.env ]; then . ./deploy.env; fi
HOST="${VPS_USER:-ubuntu}@${VPS_HOST:?VPS_HOST not set — copy deploy.env.example to deploy.env}"
SSH_OPTS="ssh -i $HOME/.ssh/novinkhodro_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes"
STAMP=$(date +%Y%m%d-%H%M%S)

scp -q -i "$HOME/.ssh/novinkhodro_ed25519" -o IdentitiesOnly=yes \
  nginx.conf nginx-events.conf "$HOST:/tmp/" 

$SSH_OPTS "$HOST" "
  set -e
  sudo cp -a /etc/nginx/sites-available/novin-khodro /etc/nginx/sites-available/novin-khodro.bak-$STAMP
  sudo mv /tmp/nginx.conf /etc/nginx/sites-available/novin-khodro
  sudo chown root:root /etc/nginx/sites-available/novin-khodro
  sudo chmod 644 /etc/nginx/sites-available/novin-khodro
  sudo mv /tmp/nginx-events.conf /etc/nginx/conf.d/nk-events.conf
  sudo chown root:root /etc/nginx/conf.d/nk-events.conf
  sudo chmod 644 /etc/nginx/conf.d/nk-events.conf
  sudo nginx -t
  sudo systemctl reload nginx
  echo NGINX_RELOADED
  # گواهی باید با webroot تمدید شود، نه پلاگین nginx (وگرنه certbot این vhost دستی را بازنویسی می‌کند)
  sudo python3 - <<'PY'
import re
p = '/etc/letsencrypt/renewal/novinkhodro.shop.conf'
s = open(p).read()
if 'authenticator = nginx' in s:
    s = s.replace('authenticator = nginx', 'authenticator = webroot\nwebroot_path = /var/www/novin-khodro,')
    s = re.sub(r'\ninstaller = nginx', '', s)
    open(p, 'w').write(s)
    print('renewal mode -> webroot')
else:
    print('renewal mode already webroot')
PY
  sudo grep -E 'authenticator|webroot_path' /etc/letsencrypt/renewal/novinkhodro.shop.conf
"

echo "--- live verification ---"
set +e   # curl روی 444 (قطع اتصال) کد غیرصفر می‌دهد؛ نباید اسکریپت را متوقف کند
printf "%-34s " "GET / (200 expected)"; curl -k -s -o /dev/null -w "%{http_code}\n" https://novinkhodro.shop/ --max-time 15
printf "%-34s " "GET /nonexistent (404 expected)"; curl -k -s -o /dev/null -w "%{http_code}\n" https://novinkhodro.shop/nonexistent-xyz --max-time 15
printf "%-34s " "GET /index.php (444 expected)"; curl -k -s -o /dev/null -w "%{http_code}\n" https://novinkhodro.shop/index.php --max-time 15
printf "%-34s " "GET /t?e=selftest (204 expected)"; curl -k -s -o /dev/null -w "%{http_code}\n" "https://novinkhodro.shop/t?e=selftest&p=deploy" --max-time 15
printf "%-34s " "http://novinkhodro.shop (301 expected)"; curl -s -o /dev/null -w "%{http_code}\n" http://novinkhodro.shop/ --max-time 15
printf "%-34s " "POST / (444 expected, was 405)"; curl -k -s -o /dev/null -w "%{http_code}\n" -X POST https://novinkhodro.shop/ --max-time 15
$SSH_OPTS "$HOST" 'sudo tail -2 /var/log/nginx/nk-events.log; echo ---; sudo ls -la /var/log/nginx/nk-events.log'
