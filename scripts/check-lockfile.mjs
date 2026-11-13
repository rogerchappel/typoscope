import { readFileSync } from 'node:fs';

try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  if (lock.lockfileVersion !== 3 || lock.name !== packageJson.name || lock.version !== packageJson.version || lock.packages?.['']?.name !== packageJson.name || lock.packages?.['']?.version !== packageJson.version || !lock.packages || typeof lock.packages !== 'object') {
    throw new Error('package metadata does not match package.json or lockfile structure is invalid');
  }
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`invalid package entry: ${path}`);
    if (path && !path.startsWith('node_modules/')) throw new Error(`invalid package path: ${path}`);
    if (path && typeof entry.version !== 'string') throw new Error(`missing package version: ${path}`);
  }
} catch (error) {
  console.error(`package-lock.json is invalid or inconsistent with package.json: ${error.message}`);
  process.exitCode = 1;
}
