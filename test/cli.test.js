import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { help, run, version } from "../src/index.js";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../src/index.js", import.meta.url));
const expectedHelp = `${(await readFile("test/fixtures/help.txt", "utf8")).trimEnd()}\n`;

async function runCli(args = []) {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}

describe("typoscope CLI scaffold", () => {
  it("prints help text for --help", async () => {
    const { stdout, stderr } = await runCli(["--help"]);

    assert.equal(stderr, "");
    assert.equal(stdout, expectedHelp);
  });

  it("prints the package version for --version", async () => {
    const { stdout, stderr } = await runCli(["--version"]);

    assert.equal(stderr, "");
    assert.equal(stdout, `${version}\n`);
  });

  it("defaults to help text for unknown arguments while pre-1.0", async () => {
    const { stdout, stderr } = await runCli(["--audit", "package.json"]);

    assert.equal(stderr, "");
    assert.match(stdout, /Early-stage local-first TypeScript CLI scaffold/);
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
