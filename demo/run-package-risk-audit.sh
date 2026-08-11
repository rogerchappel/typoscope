#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

report_path="$(mktemp "${TMPDIR:-/tmp}/typoscope-risk-report.XXXXXX.json")"
trap 'rm -f "$report_path"' EXIT

node src/index.js audit examples/clean-package.json

set +e
risky_output="$(node src/index.js audit examples/risky-package.json --json 2>&1)"
risky_status=$?
set -e

if [ "$risky_status" -ne 1 ]; then
  echo "expected risky package audit to exit 1, got $risky_status" >&2
  echo "$risky_output" >&2
  exit 1
fi

printf '%s\n' "$risky_output" > "$report_path"

grep -q '"code": "dependency-lookalike"' "$report_path"
grep -q '"code": "risky-lifecycle-script"' "$report_path"
grep -q '"code": "suspicious-script-command"' "$report_path"

echo "typoscope demo ok: validated a temporary JSON report"
