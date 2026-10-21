import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const lockfile = 'package-lock.json';
const before = execFileSync('git', ['show', `HEAD:${lockfile}`], { encoding: 'utf8' });
const after = readFileSync(lockfile, 'utf8');

if (before !== after) {
  console.error(`${lockfile} changed during lockfile verification; review and commit the intended dependency update.`);
  process.exitCode = 1;
}
