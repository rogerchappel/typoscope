# CI Package Risk Gate

This recipe shows how to use `typoscope` as a local CI-style check for package
manifests before a dependency update lands.

## Run it

```sh
bash demo/ci-package-risk-gate.sh
```

The script first audits `examples/clean-package.json`, then scans
`examples/ci-risky-package.json` with `--json`. By default it validates a
temporary report and removes it on exit, leaving the checkout clean. To retain
the JSON evidence, pass an output path:

```sh
bash demo/ci-package-risk-gate.sh ./risk-report.json
```

## Fixture behavior

- `expres` is flagged as a dependency lookalike for `express`.
- `prepare` is flagged as an install-time lifecycle script.
- The `wget ... | sh` command is flagged as suspicious remote-content
  execution.

The risky audit exits `1` by design. The demo treats that as expected evidence
and verifies the JSON report includes the finding codes.
