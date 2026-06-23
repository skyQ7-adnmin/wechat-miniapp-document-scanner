/**
 * scripts/security-scan.js — Scan repo for sensitive information
 */

const fs = require("fs");
const path = require("path");

const SENSITIVE_PATTERNS = [
  { name: "AppID", regex: /\bwx[a-f0-9]{16}\b/gi },
  { name: "AppSecret", regex: /(appSecret|appsecret|APP_SECRET)\s*[:=]\s*["'][a-f0-9]{32}["']/gi },
  { name: "TencentSecret", regex: /(SecretId|SecretKey|TENCENT_SECRET)/gi },
  { name: "Phone", regex: /\b1[3-9]\d{9}\b/g },
  { name: "Email", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: "PrivateDomain", regex: /https?:\/\/(?!github\.com|npmjs\.com|nodejs\.org|developers\.weixin\.qq\.com)[a-zA-Z0-9.-]+\.(com|cn|net|org|xyz)/gi },
  { name: "Token", regex: /(accessToken|access_token|apiKey|api_key)\s*[:=]\s*["'][a-zA-Z0-9_\-.]{10,}["']/gi },
  { name: "Password", regex: /(password|passwd)\s*[:=]\s*["'](?!example|placeholder|changeme)([^"'\s]{6,})["']/gi },
  { name: "LiveCredentials", regex: /(SecretId|SecretKey|TENCENT_SECRET)\s*[:=]\s*["'][a-zA-Z0-9/+=]{20,}["']/gi },
];

const SCAN_DIRS = ["src", "miniprogram-component", "examples", "docs", "tests", "scripts"];
const SKIP = ["node_modules", ".git", "fixtures", "security-scan.js"];

function walk(dir) {
  let results = [];
  try {
    for (const entry of fs.readdirSync(dir)) {
      if (entry.startsWith(".") && entry !== ".github") continue;
      const full = path.join(dir, entry);
      if (SKIP.some((s) => full.includes(s))) continue;
      try {
        if (fs.statSync(full).isDirectory()) {
          results = results.concat(walk(full));
        } else if (/\.(js|json|md|yml|yaml|xml|wxml|wxss|ts|tsx)$/.test(entry)) {
          results.push(full);
        }
      } catch {}
    }
  } catch {}
  return results;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const hits = [];
  for (const rule of SENSITIVE_PATTERNS) {
    const matches = content.match(rule.regex);
    if (matches && matches.length) {
      hits.push({ file: filePath, rule: rule.name, count: Math.min(matches.length, 3) });
    }
  }
  return hits;
}

console.log("=== Security Scan ===");

const files = [];
for (const dir of SCAN_DIRS) {
  if (fs.existsSync(dir)) files.push(...walk(dir));
}

let allHits = [];
for (const f of files) {
  allHits = allHits.concat(scanFile(f));
}

if (allHits.length === 0) {
  console.log(`✅ Passed: ${files.length} files scanned, 0 issues`);
  process.exit(0);
} else {
  console.log(`❌ FAILED: ${allHits.length} issues found`);
  for (const hit of allHits) {
    console.log(`  [${hit.rule}] ${hit.file} (${hit.count} match(es))`);
  }
  process.exit(1);
}
