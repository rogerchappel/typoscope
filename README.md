# typoscope

Typoscope is a local-first JavaScript CLI that performs a small first-pass npm
`package.json` audit for dependency names resembling popular packages and for
risky lifecycle scripts, without network calls.

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
npm ci
```

## Use

Run the local manifest audit:

```sh
npx --yes @rogerchappel/typoscope audit package.json
```

The audit exits with status `0` when no findings are present and status `1` when it flags a dependency lookalike or risky install-time script.

The local dependency-name heuristic compares unscoped package names with a
small built-in catalogue. It flags one insertion, deletion, substitution, or
adjacent-character transposition, while exact catalogue matches remain clean.
Scoped names stay within their own namespace and are not compared with the
unscoped catalogue. Each dependency entry produces at most one lookalike
finding.

For CI or agent workflows, emit JSON:

```sh
npx --yes @rogerchappel/typoscope audit package.json --json
```

Options may appear before or after the manifest path, so `audit --json
package.json` is equivalent. Omit the path to audit `package.json` in the
current directory. Unknown commands, options, and extra paths exit with status
`2` and print a concise diagnostic to stderr.

The manifest root, dependency sections, and `scripts` section must be JSON
objects. Dependency ranges and inspected lifecycle script values must be
strings. Invalid shapes also exit with status `2` and a concise diagnostic.

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

The committed `package-lock.json` is the dependency contract for development,
CI, release previews, and tagged releases. Use `npm ci` for a clean,
reproducible install. After intentionally changing `package.json`, run
`npm install` to update the lockfile and commit both files. Maintainers can run
`npm run lockfile:check` to verify that the lockfile is synchronized and that a
clean install succeeds without lifecycle scripts.

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
