import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const output = execFileSync("npm", ["pack", "--json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
const [pack] = JSON.parse(output);
const files = new Set(pack.files.map((file) => file.path));
const requiredFiles = [
  "src/index.js",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
];

const missing = requiredFiles.filter((file) => !files.has(file));
if (missing.length > 0) {
  console.error("Package smoke failed; missing expected packed file(s):");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "typoscope-package-smoke-"));
try {
  execFileSync("npm", ["init", "-y"], { cwd: tmp, stdio: "ignore" });
  execFileSync("npm", ["install", join(process.cwd(), pack.filename)], {
    cwd: tmp,
    stdio: ["ignore", "pipe", "inherit"],
  });

  assertIncludes(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import(process.argv[1]).then(({ version }) => console.log(version))",
        packageJson.name,
      ],
      { cwd: tmp, encoding: "utf8" },
    ),
    packageJson.version,
  );

  const bin = join(tmp, "node_modules", ".bin", "typoscope");
  assertIncludes(execFileSync(bin, ["--help"], { encoding: "utf8" }), "typoscope audit [package.json]");
  assertIncludes(execFileSync(bin, ["--version"], { encoding: "utf8" }), packageJson.version);
  assertIncludes(
    execFileSync(bin, ["audit", join(process.cwd(), "package.json")], {
      encoding: "utf8",
    }),
    "typoscope found no package.json risk findings",
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
  rmSync(pack.filename, { force: true });
}

console.log(`Package smoke OK: ${pack.name}@${pack.version} includes ${pack.files.length} files and a runnable typoscope bin.`);

function assertIncludes(output, expected) {
  if (!output.includes(expected)) {
    console.error(`Package smoke failed; expected output to include: ${expected}`);
    console.error(output);
    process.exit(1);
  }
}
