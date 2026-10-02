#!/bin/bash
# One-off incremental upload of IKCO assets to prod server.
# rsync delta-only; safe to re-run. Never deletes remote files.
set -e
cd "$(cd "$(dirname "$0")/.." && pwd)"
if [ -f deploy.env ]; then . ./deploy.env; fi
HOST="${VPS_USER:-ubuntu}@${VPS_HOST:?VPS_HOST not set — copy deploy.env.example to deploy.env}"
RSYNC="rsync -az --stats -e 'ssh -i $HOME/.ssh/novinkhodro_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes'"
echo "== deploy-ikco-assets: $(date) =="
echo "src: assets-out/ikco/ -> "$HOST":/var/www/novin-khodro/assets/ikco/"
eval "$RSYNC" assets-out/ikco/ "$HOST":/var/www/novin-khodro/assets/ikco/
echo "== done: $(date) =="
