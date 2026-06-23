/**
 * scripts/security-scan.js — Scan repo for sensitive information.
 * Reports: total tracked files, scanned files, skipped files with reasons.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SENSITIVE_PATTERNS = [
  { name: "LiveAppID", regex: /\bwx(?!0000000000000000)[a-f0-9]{16}\b/gi },
  { name: "AppSecret", regex: /(appSecret|appsecret|APP_SECRET)\s*[:=]\s*["'][a-f0-9]{32}["']/gi },
  { name: "TencentCredentials", regex: /(SecretId|SecretKey|TENCENT_SECRET)\s*[:=]\s*["'][A-Za-z0-9\/+=]{20,}["']/gi },
  { name: "Phone", regex: /\b1[3-9]\d{9}\b/g },
  { name: "Email", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: "PrivateDomain", regex: /https?:\/\/(?!github\.com|npmjs\.com|nodejs\.org|developers\.weixin\.qq\.com|opensource\.org)[a-zA-Z0-9.-]+\.(com|cn|net|org|xyz)\b/gi },
  { name: "Token", regex: /(accessToken|access_token|apiKey|api_key)\s*[:=]\s*["'][a-zA-Z0-9_\-.]{10,}["']/gi },
  { name: "Password", regex: /(password|passwd)\s*[:=]\s*["'](?!(example|placeholder|changeme|your_))\S{6,}["']/gi },
  { name: "SQLiteRef", regex: /\.db["']|SQLite|dev\.db/i },
  { name: "OCR_API", regex: /\/api\/ocr|api\/ocr|OCR_ENDPOINT|ocr\.use/i },
  { name: "GlobalData", regex: /app\.globalData\.\s*(scanned|scan|ocr)/gi },
  { name: "BusinessName", regex: /珂明眼镜|石家庄雷德森|supplier-system/i },
];

// File extensions that are text-scannable
const TEXT_EXTS = new Set([".js", ".json", ".md", ".yml", ".yaml", ".xml", ".wxml", ".wxss", ".txt", ".toml", ".css"]);
const BINARY_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".xlsx", ".db", ".sqlite", ".bak"]);

const SKIP_PATHS = ["node_modules", ".git", "fixtures", "security-scan.js", "examples/"];

function getGitTrackedFiles() {
  try {
    return execSync("git ls-files", { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  } catch { return []; }
}

function scanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!TEXT_EXTS.has(ext)) return { hits: [], skipReason: `binary (${ext})` };

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const hits = [];
    for (const rule of SENSITIVE_PATTERNS) {
      const matches = content.match(rule.regex);
      if (matches && matches.length) {
        hits.push({ file: filePath, rule: rule.name, count: Math.min(matches.length, 3) });
      }
    }
    return { hits, skipReason: null };
  } catch {
    return { hits: [], skipReason: "read error" };
  }
}

console.log("=== Security Scan ===\n");

const tracked = getGitTrackedFiles();
console.log(`Git tracked files: ${tracked.length}`);

let textCount = 0, binaryCount = 0, skippedCount = 0, allHits = [];
const skipped = [];

for (const f of tracked) {
  if (SKIP_PATHS.some((s) => f.includes(s))) { skippedCount++; continue; }
  const ext = path.extname(f).toLowerCase();
  if (!TEXT_EXTS.has(ext)) { binaryCount++; continue; }
  textCount++;
  const result = scanFile(f);
  allHits = allHits.concat(result.hits);
}

console.log(`Text files scanned: ${textCount}`);
console.log(`Binary files: ${binaryCount}`);
console.log(`Skipped (by pattern): ${skippedCount}`);

if (allHits.length === 0) {
  console.log(`\n✅ Passed: ${textCount} files, 0 issues`);
  process.exit(0);
} else {
  console.log(`\n❌ FAILED: ${allHits.length} issues`);
  for (const hit of allHits) {
    console.log(`  [${hit.rule}] ${hit.file} (${hit.count} match)`);
  }
  process.exit(1);
}
