import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const taskPath = path.join(repoRoot, "docs", "TASKS.md");
const taskStatus = await readFile(taskPath, "utf8");

const staleClaims = [
  "current early-stage scaffold",
  "preserve a minimal cli entrypoint",
  "convert the prd into implementation milestones",
  "add fixtures and tests before claiming production-ready behavior",
];

const normalized = taskStatus.toLowerCase();
for (const claim of staleClaims) {
  if (normalized.includes(claim)) {
    throw new Error(`docs/TASKS.md describes implemented behavior as pending: ${claim}`);
  }
}

const requiredSections = ["## Current", "## Next"];
for (const section of requiredSections) {
  if (!taskStatus.includes(section)) {
    throw new Error(`docs/TASKS.md is missing ${section}`);
  }
}

const requiredReferences = [
  "../src/index.js",
  "../test/cli.test.js",
  "../examples/",
  "../demo/",
  "PRD.md",
];

for (const reference of requiredReferences) {
  if (!taskStatus.includes(`](${reference})`)) {
    throw new Error(`docs/TASKS.md is missing required evidence link: ${reference}`);
  }
  await access(path.resolve(path.dirname(taskPath), reference));
}

console.log("Task status documentation matches implemented repository capabilities.");
