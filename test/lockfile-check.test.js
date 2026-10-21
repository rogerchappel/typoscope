import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const checker = new URL('../scripts/check-lockfile.mjs', import.meta.url);

test('lockfile check ignores unrelated tracked working-tree drift', () => {
  const dir = mkdtempSync(join(tmpdir(), 'typoscope-lockfile-'));
  try {
    const run = (args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    run(['init', '-q']);
    run(['config', 'user.name', 'Test']);
    run(['config', 'user.email', 'test@example.com']);
    writeFileSync(join(dir, 'package-lock.json'), '{"lock":true}\n');
    writeFileSync(join(dir, 'unrelated.txt'), 'committed\n');
    run(['add', '.']);
    run(['commit', '-qm', 'baseline']);
    writeFileSync(join(dir, 'unrelated.txt'), 'local drift\n');
    writeFileSync(join(dir, 'scripts.mjs'), readFileSync(new URL('../scripts/check-lockfile.mjs', import.meta.url)));
    const result = spawnSync(process.execPath, [join(dir, 'scripts.mjs')], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('lockfile check fails when the install changes the lockfile', () => {
  const dir = mkdtempSync(join(tmpdir(), 'typoscope-lockfile-'));
  try {
    const run = (args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    run(['init', '-q']);
    run(['config', 'user.name', 'Test']);
    run(['config', 'user.email', 'test@example.com']);
    writeFileSync(join(dir, 'package-lock.json'), '{"lock":true}\n');
    run(['add', '.']);
    run(['commit', '-qm', 'baseline']);
    writeFileSync(join(dir, 'package-lock.json'), '{"lock":false}\n');
    writeFileSync(join(dir, 'scripts.mjs'), readFileSync(new URL('../scripts/check-lockfile.mjs', import.meta.url)));
    const result = spawnSync(process.execPath, [join(dir, 'scripts.mjs')], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /changed during lockfile verification/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
