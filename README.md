# typoscope

Typoscope is a local-first TypeScript CLI that audits npm package.json dependencies for suspicious packages, including typosquatting lookalikes, deprecated or abandoned packages, risky lifecycle scripts, and suspicious package metadata, while maintaining a local safety index without network calls.

## Status

This repository is early-stage. The README now reflects the current project intent from `docs/PRD.md`, but behavior should still be treated as pre-1.0 until implementation, examples, and release checks mature.

## Install from a checkout

```sh
git clone https://github.com/rogerchappel/typoscope.git
cd typoscope
npm install
```

## Use

The current CLI contract is intentionally small while the audit engine is still being built:

```sh
npx typoscope --help
npx typoscope --version
```

Start deeper evaluation by reading the product notes and running the local checks:

```sh
npm test
npm run release:check
```

## Verification

```sh
npm run build
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

## Limitations

- The package is still a v0.1.0 project and may not expose a finished CLI or public API yet.
- Treat the PRD as direction, not a guarantee that every listed capability is implemented.
- Do not use the package for production security, compliance, or release decisions until tests and examples cover that workflow.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes small, update the PRD or README when scope changes, and include the exact verification command in every pull request.

## Security

See [SECURITY.md](SECURITY.md). Do not include secrets, private tokens, proprietary dependency data, or sensitive logs in public issues or examples.

## License

MIT

Use `npm run package:smoke` or `npm pack --dry-run` to confirm the published tarball includes the support docs and runnable package contents.
