#!/bin/bash
# دریافت لاگ‌های دسترسی nginx از VPS به .hermes/logs/nginx/ برای سنجش واقعی ROI
set -e
cd "$(cd "$(dirname "$0")/.." && pwd)"

KEY="$HOME/.ssh/novinkhodro_ed25519"
if [ -f deploy.env ]; then . ./deploy.env; fi
HOST="${VPS_USER:-ubuntu}@${VPS_HOST:?VPS_HOST not set — copy deploy.env.example to deploy.env}"
SSH_OPTS="ssh -i $KEY -o IdentitiesOnly=yes -o BatchMode=yes"
DEST=".hermes/logs/nginx"
mkdir -p "$DEST"
# انتقال مالکیت خواندن به ubuntu سپس rsync
$SSH_OPTS "$HOST" 'sudo chmod -R a+rX /var/log/nginx && echo LOGS_READABLE'
rsync -az --no-perms --no-owner --no-group \
  -e "$SSH_OPTS" \
  "$HOST:/var/log/nginx/access.log*" "$DEST/"
rsync -az --no-perms --no-owner --no-group \
  -e "$SSH_OPTS" \
  "$HOST:/var/log/nginx/nk-events.log*" "$DEST/" 2>/dev/null || true
rsync -az --no-perms --no-owner --no-group \
  -e "$SSH_OPTS" \
  "$HOST:/var/log/nginx/nk-leads.log*" "$DEST/" 2>/dev/null || true
ls -la "$DEST" | tail -20
echo "TOTAL_FILES=$(ls -1 "$DEST" | wc -l | tr -d ' ')"
