# Video Brief: Local Package Risk Audit

## Promise

Show how Typoscope turns two local `package.json` fixtures into a clean pass and
a reviewable JSON risk report without registry calls.

## Recording beats

1. Open `examples/clean-package.json` and run:

   ```sh
   node src/index.js audit examples/clean-package.json
   ```

2. Open `examples/risky-package.json` and run:

   ```sh
   node src/index.js audit examples/risky-package.json --json
   ```

3. Point to the finding codes:

   - `dependency-lookalike`
   - `risky-lifecycle-script`
   - `suspicious-script-command`

4. Run the reproducible demo:

   ```sh
   bash demo/run-package-risk-audit.sh
   ```

## Accuracy notes

- The audit is local and heuristic.
- It does not call npm, OSV, Snyk, or another vulnerability database.
- Findings are review prompts, not proof that a package is malicious.
