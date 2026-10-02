#!/bin/bash
# Cron runner: zero market prices + deals -> deploy if changed
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || { echo "FAIL: repo not found"; exit 0; }
if [ -f deploy.env ]; then . ./deploy.env; fi
HOST="${VPS_USER:-ubuntu}@${VPS_HOST:?VPS_HOST not set — copy deploy.env.example to deploy.env}"

# network/DNS readiness — the Mac wakes for cron before its resolver is up (2026-09-16 06:16/06:22
# both daily jobs died with Errno 8 on EVERY host = offline, not a source outage). Bounded 5-min wait
# so a wake-time outage self-heals instead of burning the cycle; data stays untouched either way.
dns_ready() { python3 -c "import socket; socket.getaddrinfo('bama.ir',443)" 2>/dev/null; }
if ! dns_ready; then
  for _ in 1 2 3 4 5 6 7 8 9 10; do sleep 30; dns_ready && break; done
fi
if ! dns_ready; then
  echo "FAIL: network/DNS unavailable (5min wait) — machine offline or still waking; cycle skipped, data untouched"
  exit 0
fi
PREV="/tmp/zero-prices.prev.js"
DATA="js/data/zero-prices.js"
DEALS_DATA="js/data/deals.js"
DEALS_PREV="/tmp/deals.prev.js"
CHANGED=0

[ -f "$DATA" ] && cp "$DATA" "$PREV"
[ -f "$DEALS_DATA" ] && cp "$DEALS_DATA" "$DEALS_PREV"

OUT=$(python3 scripts/zero-price-extractor.py 2>&1)
RC=$?
if [ $RC -ne 0 ]; then
  echo "FAIL: zero-price-extractor.py exited $RC"
  echo "$OUT" | tail -20
  exit 0
fi
if [ ! -f "$DATA" ]; then
  echo "FAIL: $DATA not produced"
  echo "$OUT" | tail -20
  exit 0
fi

DEALS_OUT=$(python3 scripts/deal-scraper.py 2>&1)
DRC=$?
if [ $DRC -ne 0 ]; then
  echo "WARN: deal-scraper.py exited $DRC — continuing with prices only"
  echo "$DEALS_OUT" | tail -10
fi
[ -f "$DEALS_DATA" ] || DEALS_DATA=""

if [ -f "$PREV" ] && cmp -s "$PREV" "$DATA"; then
  echo "prices: no changes."
else
  CHANGED=1
fi
if [ -n "$DEALS_DATA" ] && [ -f "$DEALS_PREV" ] && cmp -s "$DEALS_PREV" "$DEALS_DATA"; then
  echo "deals: no changes."
else
  [ -n "$DEALS_DATA" ] && CHANGED=1
fi

if [ $CHANGED -eq 0 ]; then
  echo "OK: no changes — no deploy."
  echo "$OUT" | tail -10
  exit 0
fi

# deploy pre-flight: a wedged/unreachable VPS makes rsync hang ~60s and then die with a
# confusing "unexpected end file"; probe SSH first and report the real reason instead.
if ! ssh -i "$HOME/.ssh/novinkhodro_ed25519" -o IdentitiesOnly=yes -o BatchMode=yes \
        -o ConnectTimeout=8 "$HOST" 'true' 2>/dev/null; then
  echo "DEFERRED: VPS unreachable — data updated locally, deploy skipped (recovery watchdog retries)"
  exit 0
fi

DEPLOY=$(bash scripts/deploy-smoke.sh 2>&1); RC=$?
if [ $RC -ne 0 ]; then
  # Docroot-not-served vs real failure: if nginx is not running on the VPS the rsync still
  # succeeded, but every live URL check is doomed (e.g. 443 handed over to a relay). Report that
  # instead of a FAIL that looks like a broken deploy; auto-reverts once nginx is active again.
  if ! ssh -i "$HOME/.ssh/novinkhodro_ed25519" -o IdentitiesOnly=yes -o BatchMode=yes \
          -o ConnectTimeout=8 "$HOST" 'systemctl is-active --quiet nginx' 2>/dev/null; then
    echo "DEFERRED: files synced to docroot, but nginx is INACTIVE on the VPS — site not served (live verify skipped)"
    exit 0
  fi
  echo "FAIL: deploy-smoke.sh (rc=$RC)"
  echo "$DEPLOY" | tail -20
  exit 0
fi
echo "OK: zero-prices.js / deals.js updated and deployed."
echo "--- extractor summary ---"
echo "$OUT" | tail -20
echo "--- deal-scraper summary ---"
echo "$DEALS_OUT" | tail -5
