# Typoscope PRD

Status: in-progress

## Summary

Typoscope is a local-first TypeScript CLI that audits npm package.json dependencies for suspicious packages — typosquatting lookalikes, deprecated/abandoned packages, packages with risky install scripts, and packages with suspicious permissions — maintaining a local safety index without any network calls.

## Motivation

Supply chain attacks via npm typosquatting are common. Developers install a package that looks like a well-known library but has one letter off. Even legitimate packages can have risky `install`/`postinstall` scripts that run arbitrary code, or require dangerous permissions (e.g., `sudo` in scripts). Typoscope gives fast, zero-network safety checks for dependency trees.

## Target users

- OSS maintainers reviewing new dependencies
- Security-minded developers and their AI agents
- CI pipelines that gate on dependency safety
- Teams doing dependency audits

## Goals

- Audit `package.json` (and optionally `package-lock.json`/`pnpm-lock.yaml`) against a local ruleset
- Typosquatting detection: fuzzy-match dependency names against a curated list of popular/npm-top packages
- Risky script detection: flag packages with `install`, `preinstall`, `postinstall`, or `prepare` scripts
- Permission warnings: flag packages referencing `sudo`, `chmod 777`, or other dangerous patterns in scripts
- Deprecated/abandoned detection: flag packages with `"_deprecated"` field in local index
- Output: categorized report per package with risk level, reason, and suggested action
- Support `--update-index` to refresh the local popular-package index from a JSON feed
- JSON output mode for CI pipelines
- Support `--allowlist` for pre-approved packages
- Exit non-zero on critical findings

## Non-goals

- Real-time network vulnerability scanning (use `npm audit` or Snyk for that)
- Lockfile resolution or dependency tree solving
- Replacing npm audit (complements it)

## Source attribution

Inspired by npm-audit, depcheck, and supply chain security research on typosquatting (e.g., research from Sonatype, Snyk). Typoscope is a reframed local-first take focused on static risk analysis with no network dependency, prioritizing typosquatting and risky-script detection over vulnerability databases.
