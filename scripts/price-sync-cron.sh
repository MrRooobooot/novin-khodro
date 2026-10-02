#!/bin/bash
# Cron runner: daily DB price fetch (scripts/price-sync.py) + retry + alert + staleness
# + mirror to web assets (scripts/sync-inventory-prices.py, kanban t_5f04af2a).
# Output goes to stdout (Hermes cron delivers to bot-chat on failure/price-day).
# Exit 0 always (same convention as zero-price-cron.sh: FAIL text in output = alert, job stays scheduled).
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || { echo "FAIL: repo not found"; exit 0; }

LOG_DIR=".hermes/logs"
LOG="$LOG_DIR/price-sync.log"
mkdir -p "$LOG_DIR"
# rotation: single-gen, cap 100KB (one line cluster per day → ~months between rolls)
[ -f "$LOG" ] && [ "$(stat -f%z "$LOG")" -gt 102400 ] && mv "$LOG" "$LOG.1"

# flock substitute (macOS has no flock): mkdir lock + stale takeover by PID
LOCK=".hermes/price-sync.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  LPID=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$LPID" ] && ! kill -0 "$LPID" 2>/dev/null; then
    rm -rf "$LOCK"; mkdir "$LOCK"
  else
    echo "$(date -u +%FT%TZ) SKIP: another price-sync run active (pid $LPID)" >> "$LOG"
    echo "SKIP: lock held by live run (pid $LPID)"; exit 0
  fi
fi
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT

# network/DNS readiness — the Mac wakes for this 06:00 job before its resolver is up:
# 2026-09-16 06:16/06:32 both daily jobs died with Errno 8 (nodename nor servname) on every host.
# Bounded wait (5 min) so a wake-time outage self-heals instead of burning the whole cycle.
dns_ready() { python3 -c "import socket; socket.getaddrinfo('bama.ir',443)" 2>/dev/null; }
if ! dns_ready; then
  echo "=== run $(date -u +%FT%TZ) waiting for network/DNS ===" >> "$LOG"
  for _ in 1 2 3 4 5 6 7 8 9 10; do sleep 30; dns_ready && break; done
fi
if ! dns_ready; then
  echo "$(date -u +%FT%TZ) SKIP: network/DNS unavailable after 5min — machine offline/sleeping, no fetch attempted" >> "$LOG"
  echo "FAIL: network/DNS unavailable (5min wait) — machine offline or still waking; rerun next cycle"
  exit 0
fi

# stale-data threshold (days)
STALE_DAYS="${STALE_DAYS:-3}"

RC=1
for attempt in 1 2 3; do
  OUT=$(python3 scripts/price-sync.py 2>&1)
  RC=$?
  echo "=== run $(date -u +%FT%TZ) attempt $attempt rc=$RC ===" >> "$LOG"
  echo "$OUT" >> "$LOG"
  [ $RC -eq 0 ] && break
  [ $attempt -lt 3 ] && sleep "${RETRY_SLEEP:-60}"   # transient-error backoff
done

# staleness: newest fetched_at in prices.db older than STALE_DAYS → alert even if this run printed OK
export STALE_DAYS
STALE=$(python3 - <<'PY'
import os, sqlite3
from datetime import datetime, timezone, timedelta
TEHRAN = timezone(timedelta(hours=3, minutes=30))
limit = int(os.environ.get("STALE_DAYS", "3"))
db = ".hermes/price-history/prices.db"
try:
    last = sqlite3.connect(db).execute("SELECT MAX(fetched_at) FROM prices").fetchone()[0]
    if not last:
        print("EMPTY")
    else:
        age = (datetime.now(TEHRAN) - datetime.fromisoformat(last)).days
        print("STALE" if age > limit else "FRESH", last, f"age={age}d")
except Exception as e:
    print("STALE", "unreadable:", e)
PY
)
echo "$STALE" >> "$LOG"

# mirror: DB -> js/cars-data.js + index.html + llms.txt (atomic, apply-only-upward).
# Only on a successful, fresh fetch — never render stale/unvalidated prices into the site.
MIRROR_OUT=""; MRC=0
if [ $RC -eq 0 ] && [ "${STALE%% *}" = "FRESH" ]; then
  MIRROR_OUT=$(python3 scripts/sync-inventory-prices.py 2>&1)
  MRC=$?
  echo "=== mirror $(date -u +%FT%TZ) rc=$MRC ===" >> "$LOG"
  echo "$MIRROR_OUT" >> "$LOG"
fi

if [ $RC -ne 0 ]; then
  echo "FAIL: price-sync failed after 3 attempts (rc=$RC)"
  echo "$OUT" | tail -20
elif [ "${STALE%% *}" = "STALE" ]; then
  echo "FAIL: stale price data (>${STALE_DAYS}d): ${STALE#STALE }"
elif [ $MRC -ne 0 ]; then
  echo "FAIL: price mirror failed (rc=$MRC)"
  echo "$MIRROR_OUT" | tail -20
elif printf '%s\n' "$MIRROR_OUT" | grep -qE '(FLAG |^applied=[1-9])'; then
  # قیمت عوض شد یا اختلاف >۲٪ → گزارش روزانه به کانال هشدار؛ موفقِ بی‌تغییر همچنان ساکت می‌ماند
  echo "PRICE DAY ($(date -u +%FT%TZ)):"
  printf '%s\n' "$MIRROR_OUT" | grep -E '(^  \[|FLAG |^applied=)'
else
  # OK stays log-only: Hermes cron delivers non-empty stdout to bot-chat → silence = no daily spam
  echo "OK: price-sync daily run complete. ${STALE}" >> "$LOG"
fi
exit 0
