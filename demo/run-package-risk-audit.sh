#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

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

printf '%s\n' "$risky_output" > .typoscope-risk-report.json

grep -q '"code": "dependency-lookalike"' .typoscope-risk-report.json
grep -q '"code": "risky-lifecycle-script"' .typoscope-risk-report.json
grep -q '"code": "suspicious-script-command"' .typoscope-risk-report.json

echo "typoscope demo ok: wrote .typoscope-risk-report.json"
