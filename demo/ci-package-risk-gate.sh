#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_json="${1:-"$repo_root/.typoscope-ci-risk-report.json"}"

cd "$repo_root"

node src/index.js audit examples/clean-package.json

set +e
node src/index.js audit examples/ci-risky-package.json --json > "$out_json"
status=$?
set -e

if [ "$status" -ne 1 ]; then
  echo "expected risky CI package audit to exit 1, got $status" >&2
  cat "$out_json" >&2
  exit 1
fi

grep -q '"code": "dependency-lookalike"' "$out_json"
grep -q '"package": "expres"' "$out_json"
grep -q '"code": "risky-lifecycle-script"' "$out_json"
grep -q '"code": "suspicious-script-command"' "$out_json"

echo "typoscope CI package gate wrote $out_json"
