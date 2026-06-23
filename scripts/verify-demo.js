/**
 * verify-demo.js — Verify demo is self-contained.
 * Recursively checks all require() calls resolve within demo root.
 */
const fs = require("fs");
const path = require("path");

const demoRoot = path.join(__dirname, "..", "examples", "wechat-miniprogram-demo");

function walkJS(dir, files) {
  files = files || [];
  for (const entry of fs.readdirSync(dir)) {
    const fp = path.join(dir, entry);
    if (fs.statSync(fp).isDirectory()) walkJS(fp, files);
    else if (entry.endsWith(".js")) files.push(fp);
  }
  return files;
}

function checkRequires(file) {
  const src = fs.readFileSync(file, "utf8");
  const requires = src.match(/require\(["']([^"']+)["']\)/g) || [];
  const base = path.dirname(file);
  const issues = [];
  for (const req of requires) {
    const m = req.match(/["']([^"']+)["']/)[1];
    if (m.startsWith(".")) {
      const resolved = path.resolve(base, m) + ".js";
      if (!resolved.startsWith(demoRoot)) {
        issues.push(`${m} → outside demo root`);
      } else if (!fs.existsSync(resolved)) {
        issues.push(`${m} → NOT FOUND: ${resolved}`);
      }
    }
  }
  return issues;
}

console.log("=== Demo Integrity Check ===");

let allFiles = walkJS(demoRoot);
let failed = 0;
let checked = 0;

for (const f of allFiles) {
  const issues = checkRequires(f);
  checked++;
  if (issues.length) {
    console.error(`\n❌ ${path.relative(demoRoot, f)}`);
    for (const i of issues) console.error(`   ${i}`);
    failed++;
  }
}

console.log(`\nChecked: ${checked} files, Failed: ${failed}`);

if (failed > 0) {
  console.log("❌ Demo integrity check FAILED");
  process.exit(1);
} else {
  console.log("✅ Demo is self-contained");
}
