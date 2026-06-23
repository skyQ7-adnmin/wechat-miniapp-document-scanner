/**
 * scripts/sync-demo-components.js
 * Keeps examples/ demo components in sync with miniprogram-component/ source.
 * Run after modifying the main component code.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "miniprogram-component");
const dst = path.join(__dirname, "..", "examples", "wechat-miniprogram-demo", "components");

// Copy all component files
function copyDir(s, d) {
  fs.mkdirSync(d, { recursive: true });
  for (const entry of fs.readdirSync(s)) {
    const sp = path.join(s, entry);
    const dp = path.join(d, entry);
    if (fs.statSync(sp).isDirectory()) copyDir(sp, dp);
    else fs.copyFileSync(sp, dp);
  }
}

copyDir(src, dst);
console.log(`Synced ${src} → ${dst}`);
