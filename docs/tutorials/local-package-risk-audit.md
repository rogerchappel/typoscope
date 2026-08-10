# Local Package Risk Audit

This walkthrough shows the current Typoscope audit pass against two local
`package.json` fixtures. It does not call npm, Snyk, OSV, or any network
service.

## Run the clean fixture

```sh
node src/index.js audit examples/clean-package.json
```

Expected result: Typoscope reports no package risk findings and exits `0`.

## Run the risky fixture as JSON

```sh
node src/index.js audit examples/risky-package.json --json
```

Expected result: Typoscope exits `1` and reports review prompts for:

- `lodas`, which is one edit away from `lodash`
- a `postinstall` lifecycle script
- a `curl ... | sh` install-time command

## One-command demo

```sh
bash demo/run-package-risk-audit.sh
```

The demo verifies the clean manifest, captures the risky JSON in a temporary
report, and checks for the expected finding codes. It removes the report on
exit so running the documented command does not generate checkout artifacts.

## Where this fits

Use this audit before publishing an example, accepting generated dependency
changes, or handing a package manifest to an agent workflow. The current
heuristics are intentionally small and local; treat findings as review prompts,
not as vulnerability database results.
