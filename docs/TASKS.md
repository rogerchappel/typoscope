# Task Status

## Current

- Maintain the implemented local `package.json` audit in [`src/index.js`](../src/index.js):
  dependency lookalike detection, risky lifecycle-script reporting, suspicious
  executable-command detection, text output, JSON output, and documented exit
  statuses.
- Keep the CLI behavior covered by [`test/cli.test.js`](../test/cli.test.js),
  including argument validation, malformed manifest diagnostics, scoped package
  handling, and artifact-free demo execution.
- Keep the reproducible manifests in [`examples/`](../examples/) and the
  runnable local and CI workflows in [`demo/`](../demo/) aligned with the CLI.
- Keep package metadata, documentation, and the checks run by
  `npm run release:check` aligned with shipped behavior.

## Next

- Decide how a versioned local package-name index should be sourced and updated
  before implementing the PRD's `--update-index` workflow.
- Design allowlist configuration and precedence for the planned `--allowlist`
  workflow, then add fixtures and CLI coverage with the implementation.
- Evaluate lockfile inputs separately from the implemented manifest audit;
  [`docs/PRD.md`](PRD.md) lists lockfile auditing as planned scope, not current
  behavior.
