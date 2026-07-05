# CI Package Risk Social Hooks

Grounded promotion notes for `demo/ci-package-risk-gate.sh`.

## Short posts

1. Dependency review can start before a network call. `typoscope` flags a local
   package manifest with an `expres` lookalike and risky `prepare` script.
2. This demo turns a suspicious `package.json` into JSON evidence that a CI job
   or agent can attach to a PR.
3. `typoscope` is not a vulnerability database. It is a local first-pass review
   for typosquatting-like names and install-time scripts worth inspecting.

## Video beat

- Show `examples/ci-risky-package.json`.
- Run `bash demo/ci-package-risk-gate.sh`.
- Open `.typoscope-ci-risk-report.json`.
- Highlight `dependency-lookalike`, `risky-lifecycle-script`, and
  `suspicious-script-command`.

## Caption

`typoscope` gives dependency-review workflows a local manifest gate before
package installs or vulnerability lookups begin.
