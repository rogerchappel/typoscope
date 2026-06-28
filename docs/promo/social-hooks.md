# Typoscope Social Hooks

Grounding: Typoscope currently audits local `package.json` files for dependency
lookalikes and risky lifecycle scripts without network calls.

## Short posts

1. Typoscope is a tiny local-first check for npm package manifests: catch
   suspicious dependency lookalikes and install-time script risks before they
   land in a PR.

2. Demo angle: one clean `package.json`, one risky fixture with `lodas` and
   `curl ... | sh`, one JSON report you can hand to a reviewer or agent.

3. Supply-chain tooling does not always need a dashboard. Typoscope's first pass
   is deliberately small: deterministic local findings for package review.

## Video hook

Show `node src/index.js audit examples/risky-package.json --json`, pause on the
`dependency-lookalike`, `risky-lifecycle-script`, and
`suspicious-script-command` codes, then run
`bash demo/run-package-risk-audit.sh` to prove the fixture stays reproducible.

## Limits to mention

- No vulnerability database lookups.
- No package download or npm registry calls.
- Findings are prompts for review, not proof that a package is malicious.
