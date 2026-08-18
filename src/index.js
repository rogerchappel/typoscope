#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const version = "0.1.0";

export const help = `typoscope

Local-first package.json risk scanner for suspicious npm dependency names and scripts.

Usage:
  typoscope --help
  typoscope --version
  typoscope audit [package.json] [--json]

The first audit pass runs without network access and flags common typosquatting lookalikes plus risky lifecycle scripts.`;

const popularPackages = [
  "axios",
  "chalk",
  "commander",
  "eslint",
  "express",
  "lodash",
  "next",
  "react",
  "typescript",
  "vite",
];

const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const riskyScriptNames = ["preinstall", "install", "postinstall", "prepare"];
const riskyScriptPatterns = [
  { pattern: /\bcurl\b|\bwget\b/i, reason: "downloads remote content" },
  { pattern: /\bsudo\b/i, reason: "requests elevated privileges" },
  { pattern: /chmod\s+777/i, reason: "loosens file permissions" },
  { pattern: /rm\s+-rf\s+(?:\/|\$HOME|~)/i, reason: "removes broad filesystem paths" },
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateManifest(manifest) {
  if (!isPlainObject(manifest)) {
    throw new Error("Invalid package.json: root must be a JSON object.");
  }

  for (const section of dependencySections) {
    const dependencies = manifest[section];
    if (dependencies === undefined) continue;
    if (!isPlainObject(dependencies)) {
      throw new Error(`Invalid package.json: ${section} must be a JSON object.`);
    }
    for (const [name, range] of Object.entries(dependencies)) {
      if (typeof range !== "string") {
        throw new Error(`Invalid package.json: ${section}.${name} must be a string.`);
      }
    }
  }

  if (manifest.scripts !== undefined && !isPlainObject(manifest.scripts)) {
    throw new Error("Invalid package.json: scripts must be a JSON object.");
  }
  for (const scriptName of riskyScriptNames) {
    const command = manifest.scripts?.[scriptName];
    if (command !== undefined && typeof command !== "string") {
      throw new Error(`Invalid package.json: scripts.${scriptName} must be a string.`);
    }
  }
}

function distance(left, right) {
  let previousPrevious;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 0; i < left.length; i += 1) {
    const current = [i + 1];

    for (let j = 0; j < right.length; j += 1) {
      const substitutionCost = left[i] === right[j] ? 0 : 1;
      let editDistance = Math.min(
        previous[j + 1] + 1,
        current[j] + 1,
        previous[j] + substitutionCost,
      );

      if (
        previousPrevious
        && i > 0
        && j > 0
        && left[i] === right[j - 1]
        && left[i - 1] === right[j]
      ) {
        editDistance = Math.min(editDistance, previousPrevious[j - 1] + 1);
      }

      current.push(editDistance);
    }

    previousPrevious = previous;
    previous = current;
  }

  return previous[right.length];
}

function packageNameOnly(name) {
  if (!name.startsWith("@")) {
    return name;
  }

  return name.split("/").at(-1) ?? name;
}

export function auditManifest(manifest, filePath = "package.json") {
  validateManifest(manifest);
  const findings = [];

  for (const section of dependencySections) {
    const dependencies = manifest[section] ?? {};
    for (const name of Object.keys(dependencies)) {
      const bareName = packageNameOnly(name);
      const match = popularPackages.find((popular) => popular !== bareName && distance(bareName, popular) <= 1);

      if (match) {
        findings.push({
          level: "critical",
          code: "dependency-lookalike",
          package: name,
          section,
          message: `${name} looks similar to ${match}.`,
        });
      }
    }
  }

  const scripts = manifest.scripts ?? {};
  for (const scriptName of riskyScriptNames) {
    const command = scripts[scriptName];
    if (!command) {
      continue;
    }

    findings.push({
      level: "high",
      code: "risky-lifecycle-script",
      script: scriptName,
      message: `${scriptName} runs during installation or packaging.`,
    });

    for (const { pattern, reason } of riskyScriptPatterns) {
      if (pattern.test(command)) {
        findings.push({
          level: "critical",
          code: "suspicious-script-command",
          script: scriptName,
          message: `${scriptName} ${reason}.`,
        });
      }
    }
  }

  return {
    ok: findings.length === 0,
    file: path.resolve(filePath),
    findings,
  };
}

function readManifest(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ${filePath}: ${detail}`);
  }
}

function formatReport(result) {
  if (result.ok) {
    return `typoscope found no package.json risk findings in ${result.file}.`;
  }

  return [
    `typoscope found ${result.findings.length} package.json risk finding${result.findings.length === 1 ? "" : "s"} in ${result.file}:`,
    ...result.findings.map((finding) => `- ${finding.level} ${finding.code}: ${finding.message}`),
  ].join("\n");
}

export function run(argv = process.argv.slice(2), log = console.log, errorLog = console.error) {
  const [arg, ...args] = argv;

  if (argv.length === 0 || (arg === "--help" && args.length === 0)) {
    log(help);
    return 0;
  }

  if ((arg === "--version" || arg === "-v") && args.length === 0) {
    log(version);
    return 0;
  }

  if (arg === "audit") {
    const operands = args.filter((value) => value !== "--json");
    const unknownOption = operands.find((value) => value.startsWith("-"));

    if (unknownOption) {
      errorLog(`typoscope: Unknown option: ${unknownOption}`);
      return 2;
    }

    if (operands.length > 1) {
      errorLog("typoscope: audit accepts at most one package.json path");
      return 2;
    }

    const filePath = operands[0] ?? "package.json";
    let result;

    try {
      result = auditManifest(readManifest(filePath), filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errorLog(`typoscope: ${message}`);
      return 2;
    }

    if (args.includes("--json")) {
      log(JSON.stringify(result, null, 2));
    } else {
      log(formatReport(result));
    }

    return result.ok ? 0 : 1;
  }

  errorLog(`typoscope: Unknown command or option: ${arg}`);
  return 2;
}

function isDirectExecution(entrypoint = process.argv[1]) {
  if (!entrypoint) {
    return false;
  }

  try {
    return realpathSync(entrypoint) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  process.exitCode = run(process.argv.slice(2));
}
