#!/bin/bash
# فعال‌سازی www: پیش‌نیاز = رکورد DNS «www → <server-ip>» (پنل ابرآروان).
# کار: افزودن www به گواهی موجود (webroot، بدون دست‌زدن به کانفیگ nginx) + reload + ورایفای.
set -e
cd "$(cd "$(dirname "$0")/.." && pwd)"

if [ -f deploy.env ]; then . ./deploy.env; fi
HOST="${VPS_USER:-ubuntu}@${VPS_HOST:?VPS_HOST not set — copy deploy.env.example to deploy.env}"
SSH_OPTS="ssh -i $HOME/.ssh/novinkhodro_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes"

echo "--- preflight: DNS www ---"
WWW_IP=$(dig +short A www.novinkhodro.shop @1.1.1.1 | head -1)
ORIGIN="$VPS_HOST"
if [ -z "$WWW_IP" ]; then
  echo "BLOCKED: www.novinkhodro.shop رکورد A ندارد. در پنل ابرآروان → رکوردها:"
  echo "  نوع A | نام www | مقدار $ORIGIN | TTL 300 (کلید ابر/CDN خاموش)"
  echo "سپس همین اسکریپت را دوباره اجرا کنید."
  exit 1
fi
echo "www -> $WWW_IP"
if [ "$WWW_IP" != "$ORIGIN" ]; then
  echo "BLOCKED: www به IP دیگری ($WWW_IP) اشاره می‌کند، نه origin ($ORIGIN)."
  echo "  اگر رکورد از نوع Cloud/CDN ابرآروان است: رکورد www را ویرایش کنید و «ابر» را خاموش کنید"
  echo "  سپس مقدار را $ORIGIN بگذارید (وگرنه گواهی Let's Encrypt برای www صادر نمی‌شود و https://www خطای TLS می‌دهد)."
  exit 1
fi

$SSH_OPTS "$HOST" '
  set -e
  sudo mkdir -p /var/www/novin-khodro/.well-known/acme-challenge
  sudo certbot certonly --webroot -w /var/www/novin-khodro \
       -d novinkhodro.shop -d www.novinkhodro.shop --expand \
       --non-interactive --keep-until-expiring
  sudo nginx -t
  sudo systemctl reload nginx
  echo CERT_OK
  sudo openssl x509 -in /etc/letsencrypt/live/novinkhodro.shop/fullchain.pem -noout -ext subjectAltName | tail -2
'

echo "--- live verification ---"
set +e
printf "%-40s " "http://www  (301 apex expected)";  curl -s  -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://www.novinkhodro.shop/ --max-time 20
printf "%-40s " "https://www (301 apex expected)"; curl -k -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.novinkhodro.shop/ --max-time 20
printf "%-40s " "https://apex (200 expected)";     curl -k -s -o /dev/null -w "%{http_code}\n" https://novinkhodro.shop/ --max-time 20
printf "%-40s " "HTTP unknown-host (444 expected)"; curl -s -o /dev/null -w "%{http_code}\n" -H "Host: bogus-example.com" http://$VPS_HOST/ --max-time 20
printf "%-40s " "ACME path reachable (404 expected)"; curl -s -o /dev/null -w "%{http_code}\n" http://novinkhodro.shop/.well-known/acme-challenge/probe-missing --max-time 20
