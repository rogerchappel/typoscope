# typoscope

Typoscope is a local-first TypeScript CLI that audits npm package.json dependencies for suspicious packages, including typosquatting lookalikes, deprecated or abandoned packages, risky lifecycle scripts, and suspicious package metadata, while maintaining a local safety index without network calls.

## Status

This repository is early-stage, but it now includes a first-pass local `package.json` audit for suspicious dependency names and risky lifecycle scripts. Treat findings as review prompts, not a replacement for vulnerability databases or human supply-chain review.

## Install

After the first registry release, install from the explicit
`@rogerchappel/typoscope` scope so npm never falls back to the unrelated
unscoped `typoscope` package:

```sh
npm install --global @rogerchappel/typoscope
typoscope audit package.json
```

To work from a checkout instead:

```sh
git clone https://github.com/rogerchappel/typoscope.git
cd typoscope
npm install
```

## Use

Run the local manifest audit:

```sh
npx --yes @rogerchappel/typoscope audit package.json
```

The audit exits with status `0` when no findings are present and status `1` when it flags a dependency lookalike or risky install-time script.

For CI or agent workflows, emit JSON:

```sh
npx --yes @rogerchappel/typoscope audit package.json --json
```

## Demo

Run the checked-in fixtures without network access:

```sh
bash demo/run-package-risk-audit.sh
```

The demo scans `examples/clean-package.json`, then verifies that
`examples/risky-package.json` reports a dependency lookalike and risky
install-time script findings. Its temporary JSON report is removed before the
command exits, so the checkout stays clean. See
[Local Package Risk Audit](docs/tutorials/local-package-risk-audit.md) for the
walkthrough and [docs/promo/video-brief-package-risk-audit.md](docs/promo/video-brief-package-risk-audit.md)
for a short recording outline.

For a CI-style package manifest gate that writes JSON evidence:

```sh
bash demo/ci-package-risk-gate.sh
```

The default command validates a temporary report and removes it on exit. Pass
an output path to retain the JSON evidence, for example
`bash demo/ci-package-risk-gate.sh ./risk-report.json`.

See [docs/tutorials/ci-package-risk-gate.md](docs/tutorials/ci-package-risk-gate.md)
for the fixture behavior and expected report.

## Verification

```sh
npm run build
npm test
npm run package:name-check
npm run smoke
npm run package:smoke
npm run release:check
```

## Limitations

- The package is still a v0.1.0 project and only exposes a small first-pass audit.
- Treat the PRD as direction, not a guarantee that every listed capability is implemented.
- The checker uses local heuristics only; it does not call npm, Snyk, OSV, or any vulnerability database.
- Do not use the package as the sole source for production security, compliance, or release decisions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes small, update the PRD or README when scope changes, and include the exact verification command in every pull request.

## Security

See [SECURITY.md](SECURITY.md). Do not include secrets, private tokens, proprietary dependency data, or sensitive logs in public issues or examples.

## License

MIT

Use `npm run package:smoke` or `npm pack --dry-run` to confirm the published tarball includes the support docs and runnable package contents.
