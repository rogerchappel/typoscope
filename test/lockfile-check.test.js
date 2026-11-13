import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const checker = readFileSync(new URL('../scripts/check-lockfile.mjs', import.meta.url));
const packageJson = readFileSync(new URL('../package.json', import.meta.url));
const lockfile = readFileSync(new URL('../package-lock.json', import.meta.url));

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'typoscope-lockfile-'));
  mkdirSync(join(dir, 'scripts'));
  writeFileSync(join(dir, 'scripts/check-lockfile.mjs'), checker);
  writeFileSync(join(dir, 'package.json'), packageJson);
  writeFileSync(join(dir, 'package-lock.json'), lockfile);
  return dir;
}

function check(dir) {
  return spawnSync(process.execPath, ['scripts/check-lockfile.mjs'], { cwd: dir, encoding: 'utf8' });
}

test('accepts a valid committed lockfile change without mutating it', () => {
  const dir = fixture();
  try {
    const lockPath = join(dir, 'package-lock.json');
    const lock = JSON.parse(readFileSync(lockPath));
    lock.packages['node_modules/example-fixture'] = { version: '1.0.0' };
    writeFileSync(lockPath, JSON.stringify(lock));
    const committedContent = readFileSync(lockPath, 'utf8');
    const result = check(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(lockPath, 'utf8'), committedContent);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('rejects inconsistent lockfile metadata', () => {
  const dir = fixture();
  try {
    const lock = JSON.parse(readFileSync(join(dir, 'package-lock.json')));
    lock.version = '99.0.0';
    writeFileSync(join(dir, 'package-lock.json'), JSON.stringify(lock));
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /invalid or inconsistent/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('rejects malformed package entries', () => {
  const dir = fixture();
  try {
    const lockPath = join(dir, 'package-lock.json');
    const lock = JSON.parse(readFileSync(lockPath));
    lock.packages['node_modules/example-fixture'] = {};
    writeFileSync(lockPath, JSON.stringify(lock));
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing package version/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
