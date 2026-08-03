import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageJson.name)}`;
const response = await fetch(registryUrl, {
  headers: { accept: "application/vnd.npm.install-v1+json" },
});

if (response.status === 404) {
  console.log(`Package name available: ${packageJson.name}@${packageJson.version} is not published.`);
  process.exit(0);
}

if (!response.ok) {
  throw new Error(`Could not verify ${packageJson.name} on npm: ${response.status} ${response.statusText}`);
}

const registryPackage = await response.json();
const publishedRepository = normalizeRepository(registryPackage.repository);
const expectedRepository = normalizeRepository(packageJson.repository);

if (!publishedRepository || publishedRepository !== expectedRepository) {
  throw new Error(
    `Package name collision: ${packageJson.name} is published from ${publishedRepository ?? "an unknown repository"}, expected ${expectedRepository}.`,
  );
}

if (Object.hasOwn(registryPackage.versions ?? {}, packageJson.version)) {
  throw new Error(`Package version collision: ${packageJson.name}@${packageJson.version} is already published.`);
}

console.log(`Package release available: ${packageJson.name}@${packageJson.version} is not published yet.`);

function normalizeRepository(repository) {
  const value = typeof repository === "string" ? repository : repository?.url;
  return value
    ?.replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}
