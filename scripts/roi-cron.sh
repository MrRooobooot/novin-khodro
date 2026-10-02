#!/bin/bash
# گزارش روزانه بازدهی: لاگ‌ها را می‌کشد، داشبورد HTML می‌سازد، خلاصهٔ KPI را لاگ می‌کند.
# کرون: روزانه ۰۹:۰۰ تهران (novin-roi-report). بدون LLM، بدون هزینه.
set -e
cd "$(cd "$(dirname "$0")/.." && pwd)"
bash scripts/fetch-access-logs.sh > /dev/null 2>&1
mkdir -p .hermes/reports
python3 scripts/roi_report.py --html .hermes/reports/roi-dashboard.html > /dev/null
{
  echo "=== ROI $(date '+%Y-%m-%d %H:%M %Z') ==="
  python3 scripts/roi_report.py | grep -E "requests total|unique visitors|conversion events|LEAD INBOX" | head -6
} >> .hermes/logs/roi-report.log
tail -8 .hermes/logs/roi-report.log
