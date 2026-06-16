import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import assert from "node:assert/strict";

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
    assert.match(stdout, /docs\/PRD\.md/);
  });

  it("prints the package version for --version", async () => {
    const { stdout, stderr } = await runCli(["--version"]);

    assert.equal(stderr, "");
    assert.equal(stdout.trim(), "0.1.0");
  });

  it("defaults to help text for unknown arguments while pre-1.0", async () => {
    const { stdout, stderr } = await runCli(["--audit", "package.json"]);

    assert.equal(stderr, "");
    assert.match(stdout, /Early-stage local-first TypeScript CLI scaffold/);
  });
});
