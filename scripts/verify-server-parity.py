#!/usr/bin/env python3
"""Parity check: local repo (HEAD) vs live VPS docroot for every web-served path.

Excludes mirror deploy-smoke.sh (--exclude .git .hermes node_modules assets/ikco admin.html .serena).
Reports: IDENTICAL / DIFF / MISSING-ON-VPS / EXTRA-ON-VPS.
"""
import hashlib
import posixpath
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
import os as _os
_host = _os.environ.get("VPS_HOST")
if not _host:
    sys.exit("VPS_HOST not set — export VPS_HOST (see deploy.env.example)")
VPS = f"{_os.environ.get('VPS_USER', 'ubuntu')}@{_host}"
DOCROOT = "/var/www/novin-khodro"
KEY = Path.home() / ".ssh/novinkhodro_ed25519"
SSH_OPTS = ["-i", str(KEY), "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes"]
if not KEY.exists():
    sys.exit(f"missing deploy key: {KEY}")

SKIP_TOP = {".git", ".hermes", "node_modules", "assets", "assets-out", "admin.html", ".serena", "tsconfig.json",
            "package.json", "design-tokens.json", "nginx.conf", "PROJECT_GRAPH.md", "CHANGELOG_AGENT.md",
            "TASKS.md", "PROJECT.md", "TEST_INFRA.md", "TEST_READY.md", "BLOCKED.md", "ORIGINAL_REQUEST.md"}


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def deployable(rel: str) -> bool:
    top = rel.split("/", 1)[0]
    if top in SKIP_TOP or Path(rel).name == '.DS_Store' or rel == 'nginx-events.conf':
        return False  # Already excluded by deploy-smoke.sh; not web assets.
    if rel.startswith("scripts/") or rel.startswith("tests/"):
        return False
    return True


local = {}
for p in ROOT.rglob("*"):
    if not p.is_file():
        continue
    rel = p.relative_to(ROOT).as_posix()
    if rel.startswith(".") or not deployable(rel):
        continue
    local[rel] = sha(p)

remote_cmd = (
    f"cd {DOCROOT} && find . -type f "
    "-not -path './.git/*' -not -path './node_modules/*' "
    "-not -path './scripts/*' -not -path './tests/*' "
    "-not -name 'admin.html' -not -path './assets/*' "
    "-exec sha256sum {} + | sed 's|  \\./|  |'"
)
out = subprocess.run(
    ["ssh", *SSH_OPTS, VPS, remote_cmd],
    capture_output=True, text=True, check=True,
).stdout

remote = {}
for line in out.splitlines():
    if "  " not in line:
        continue
    h, rel = line.split("  ", 1)
    rel = rel.strip()
    if rel:
        remote[rel] = h

identical, diff, missing, extra = [], [], [], []
for rel, h in sorted(local.items()):
    if rel not in remote:
        missing.append(rel)
    elif remote[rel] == h:
        identical.append(rel)
    else:
        diff.append(rel)

for rel in sorted(remote):
    if rel not in local:
        extra.append(rel)

print(f"local files: {len(local)} | remote files: {len(remote)}")
print(f"IDENTICAL : {len(identical)}")
print(f"DIFF      : {len(diff)} -> {diff}")
print(f"MISSING   : {len(missing)} -> {missing}")
print(f"EXTRA     : {len(extra)} -> {extra[:15]}{' …' if len(extra) > 15 else ''}")
sys.exit(0 if not diff and not missing else 1)
