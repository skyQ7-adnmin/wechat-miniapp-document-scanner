/**
 * sync-demo-components.js — Sync demo to be fully self-contained.
 * Copies component + src runtime dependencies into examples/.
 * Run after modifying miniprogram-component/ or src/.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const demoRoot = path.join(root, "examples", "wechat-miniprogram-demo");

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const sp = path.join(src, entry);
    const dp = path.join(dst, entry);
    if (fs.statSync(sp).isDirectory()) copyDir(sp, dp);
    else fs.copyFileSync(sp, dp);
  }
}

// 1. Clean old
rmDir(path.join(demoRoot, "components", "document-cropper"));
rmDir(path.join(demoRoot, "src"));

// 2. Copy component
copyDir(
  path.join(root, "miniprogram-component", "document-cropper"),
  path.join(demoRoot, "components", "document-cropper")
);
console.log(`✓ Copied component`);

// 3. Copy runtime src
copyDir(path.join(root, "src"), path.join(demoRoot, "src"));
console.log(`✓ Copied src/`);

// 4. Verify component can resolve its require
const compPath = path.join(demoRoot, "components", "document-cropper", "index.js");
const compSrc = fs.readFileSync(compPath, "utf8");
const requires = compSrc.match(/require\(["']([^"']+)["']\)/g) || [];
const baseDir = path.dirname(compPath);

let allOk = true;
for (const req of requires) {
  const modPath = req.match(/["']([^"']+)["']/)[1];
  const resolved = path.resolve(baseDir, modPath);
  if (!resolved.startsWith(demoRoot)) {
    console.error(`  ❌ ${modPath} → ${resolved} (OUTSIDE demo root)`);
    allOk = false;
  } else if (!fs.existsSync(resolved) && !fs.existsSync(resolved + ".js")) {
    console.error(`  ❌ ${modPath} → not found`);
    allOk = false;
  }
}
if (allOk) console.log(`✓ All component requires resolve inside demo`);
else process.exit(1);
