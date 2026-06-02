#!/usr/bin/env node

const help = `typoscope

Early-stage local-first TypeScript CLI scaffold.

Usage:
  typoscope --help
  typoscope --version

The implementation is intentionally minimal while the project is pre-1.0.
See docs/PRD.md for planned scope.`;

const version = "0.1.0";
const arg = process.argv[2];

if (arg === "--version" || arg === "-v") {
  console.log(version);
} else {
  console.log(help);
}
