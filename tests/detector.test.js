/**
 * tests/detector.test.js — Core detector tests with synthetic images
 * Tests: valid rect, low-confidence fallback, timeout, edge cases
 */

const { detectDocumentBoundary } = require("../src/detector/document-boundary-detector");

// RGBA helpers
function createRGBA(width, height, fill) {
  const size = width * height * 4;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i += 4) {
    buf[i] = fill.r; buf[i + 1] = fill.g; buf[i + 2] = fill.b; buf[i + 3] = 255;
  }
  return { data: buf, width, height };
}

function drawRect(rgba, imgW, imgH, x, y, w, h, color) {
  const { data } = rgba;
  for (let py = y; py < y + h && py < imgH; py++) {
    for (let px = x; px < x + w && px < imgW; px++) {
      if (py < 0 || px < 0) continue;
      const idx = (py * imgW + px) * 4;
      data[idx] = color.r;
      data[idx + 1] = color.g;
      data[idx + 2] = color.b;
    }
  }
}

function drawInnerRect(rgba, imgW, imgH, ratio, fg, bg) {
  const margin = 0.08;
  const x = Math.floor(imgW * margin);
  const y = Math.floor(imgH * margin);
  const w = Math.floor(imgW * (1 - 2 * margin));
  const h = Math.floor(imgH * (1 - 2 * margin));
  // fill bg
  drawRect(rgba, imgW, imgH, 0, 0, imgW, imgH, bg);
  // draw fg inner rect
  drawRect(rgba, imgW, imgH, x, y, w, h, fg);
  return { x, y, w, h };
}

function printResult(label, result) {
  const { rect, confidence, source, diagnostics } = result;
  const status = diagnostics.applied ? "applied" : `fallback(${diagnostics.fallbackReason || "?"})`;
  console.log(`  ${label}: ${status}, conf=${(confidence||0).toFixed(3)}, src=${source}, time=${diagnostics.elapsedMs}ms`);
}

const W = 720, H = 960;
let pass = 0, fail = 0;

function test(name, fn) {
  try {
    const ok = fn();
    if (ok !== false) { pass++; console.log(`  ✅ ${name}`); }
    else { fail++; console.log(`  ❌ ${name}: returned false`); }
  } catch (e) {
    fail++; console.log(`  ❌ ${name}: ${e.message}`);
  }
}

console.log("\n=== Detector Tests ===\n");

// ---- Basic synthetic images ----

// 1. White paper on dark background
console.log("[1] White paper on dark background");
{
  const rgba = createRGBA(W, H, { r: 20, g: 20, b: 30 });
  const inner = drawInnerRect(rgba, W, H, 0.5, { r: 240, g: 240, b: 245 }, { r: 20, g: 20, b: 30 });
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("white-on-dark", result);
  test("returns rect", () => result.rect && result.rect.left != null);
  test("coords in bounds", () => result.rect.left >= 0 && result.rect.right <= W);
  test("not nil confidence", () => result.confidence != null);
  test("diagnostics present", () => result.diagnostics && result.diagnostics.elapsedMs > 0);
}

// 2. White paper on light background (low contrast)
console.log("[2] White paper on light background");
{
  const rgba = createRGBA(W, H, { r: 230, g: 228, b: 225 });
  drawInnerRect(rgba, W, H, 0.5, { r: 250, g: 250, b: 255 }, { r: 230, g: 228, b: 225 });
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("white-on-light", result);
  test("returns rect (may be fallback)", () => !!result.rect);
  test("coords valid", () => result.rect.left >= 0 && result.rect.right <= W);
}

// 3. Keyboard-like grid at bottom
console.log("[3] Keyboard-like grid below content");
{
  const rgba = createRGBA(W, H, { r: 200, g: 200, b: 200 });
  // Content area (top 60%)
  drawRect(rgba, W, H, 40, 30, W - 80, Math.floor(H * 0.6) - 30, { r: 250, g: 250, b: 255 });
  // Keyboard grid (bottom) - lots of small rectangles
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      const kx = 50 + col * 80;
      const ky = Math.floor(H * 0.62) + row * 40;
      drawRect(rgba, W, H, kx, ky, 70, 30, { r: 100, g: 100, b: 110 });
    }
  }
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("keyboard-like", result);
  test("does not crash", () => true);
  test("returns valid rect", () => !!result.rect);
}

// 4. Surrounding box rectangles
console.log("[4] Surrounding boxes");
{
  const rgba = createRGBA(W, H, { r: 30, g: 35, b: 40 });
  // Four surrounding boxes
  drawRect(rgba, W, H, 20, 20, 150, 100, { r: 180, g: 180, b: 180 });
  drawRect(rgba, W, H, W - 170, 20, 150, 100, { r: 180, g: 180, b: 180 });
  drawRect(rgba, W, H, 20, H - 120, 150, 100, { r: 180, g: 180, b: 180 });
  drawRect(rgba, W, H, W - 170, H - 120, 150, 100, { r: 180, g: 180, b: 180 });
  // Center paper
  drawRect(rgba, W, H, 180, 130, W - 360, H - 260, { r: 250, g: 250, b: 255 });
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("surrounding-boxes", result);
  test("no crash", () => true);
  test("rect in bounds", () => result.rect.left >= 0 && result.rect.right <= W);
}

// 5. Dense table grid
console.log("[5] Dense table grid");
{
  const rgba = createRGBA(W, H, { r: 245, g: 245, b: 250 });
  const margin = 60;
  const gw = W - 2 * margin, gh = H - 2 * margin;
  // Draw border
  for (let x = margin; x <= margin + gw; x++) { drawRect(rgba, W, H, x, margin, 1, 1, { r: 40, g: 40, b: 50 }); }
  for (let y = margin; y <= margin + gh; y++) { drawRect(rgba, W, H, margin, y, 1, 1, { r: 40, g: 40, b: 50 }); }
  // Grid lines
  for (let i = 1; i < 6; i++) {
    const ly = margin + Math.floor(gh * i / 6);
    for (let x = margin; x <= margin + gw; x += 2) { drawRect(rgba, W, H, x, ly, 1, 1, { r: 60, g: 60, b: 70 }); }
  }
  for (let j = 1; j < 8; j++) {
    const lx = margin + Math.floor(gw * j / 8);
    for (let y = margin; y <= margin + gh; y += 2) { drawRect(rgba, W, H, lx, y, 1, 1, { r: 60, g: 60, b: 70 }); }
  }
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("dense-table", result);
  test("returns rect", () => !!result.rect);
  test("coords valid", () => result.rect.left >= 0 && result.rect.right <= W);
}

// 6. No complete outer border
console.log("[6] No complete outer border");
{
  const rgba = createRGBA(W, H, { r: 50, g: 50, b: 55 });
  // Table with top and left borders only (no bottom, no right)
  for (let x = 60; x <= W - 80; x++) { drawRect(rgba, W, H, x, 80, 1, 1, { r: 20, g: 20, b: 30 }); }
  for (let y = 80; y <= H - 100; y++) { drawRect(rgba, W, H, 60, y, 1, 1, { r: 20, g: 20, b: 30 }); }
  // Table interior
  drawRect(rgba, W, H, 61, 81, W - 141, H - 181, { r: 245, g: 245, b: 250 });
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("partial-border", result);
  test("no crash on partial border", () => true);
}

// 7. Slight rotation simulation (shifted inner rect)
console.log("[7] Slight rotation (shifted rect)");
{
  const rgba = createRGBA(W, H, { r: 30, g: 30, b: 40 });
  const shiftX = 15, shiftY = 10;
  drawRect(rgba, W, H, 80 + shiftX, 100 + shiftY, W - 200, H - 250, { r: 250, g: 248, b: 245 });
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("shifted-rect", result);
  test("rect valid", () => result.rect.left >= 0 && result.rect.right <= W);
}

// 8. Shadow region
console.log("[8] Shadow region");
{
  const rgba = createRGBA(W, H, { r: 40, g: 40, b: 50 });
  // Gradient shadow at top
  for (let y = 0; y < 40; y++) {
    const v = Math.floor(40 + y * 5);
    for (let x = 0; x < W; x++) { drawRect(rgba, W, H, x, y, 1, 1, { r: v, g: v, b: v + 5 }); }
  }
  drawRect(rgba, W, H, 80, 100, W - 160, H - 200, { r: 250, g: 250, b: 255 });
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("with-shadow", result);
  test("no crash on shadow", () => true);
}

// 9. Low confidence fallback
console.log("[9] Low confidence fallback");
{
  const rgba = createRGBA(W, H, { r: 128, g: 128, b: 128 });
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("uniform-gray", result);
  test("falls back to default rect", () => result.source === "fallback");
  test("5% inset rect", () => {
    return Math.abs(result.rect.left - W * 0.05) < 5 &&
           Math.abs(result.rect.top - H * 0.05) < 5 &&
           Math.abs(result.rect.right - W * 0.95) < 5 &&
           Math.abs(result.rect.bottom - H * 0.95) < 5;
  });
}

// 10. Non-table ordinary document
console.log("[10] Non-table ordinary document");
{
  const rgba = createRGBA(W, H, { r: 25, g: 28, b: 35 });
  // Irregular document shape
  drawRect(rgba, W, H, 100, 80, W - 180, H - 200, { r: 245, g: 242, b: 240 });
  // Some text-like blobs
  for (let i = 0; i < 20; i++) {
    const tx = 120 + Math.floor(Math.random() * (W - 300));
    const ty = 100 + Math.floor(Math.random() * (H - 350));
    drawRect(rgba, W, H, tx, ty, 30 + Math.floor(Math.random() * 40), 5 + Math.floor(Math.random() * 3), { r: 30, g: 30, b: 40 });
  }
  const result = detectDocumentBoundary(rgba.data, W, H);
  printResult("ordinary-doc", result);
  test("rect in bounds", () => result.rect.left >= 0 && result.rect.right <= W);
}

// 11. Abnormal image size
console.log("[11] Abnormal image size");
{
  const small = createRGBA(100, 80, { r: 30, g: 30, b: 40 });
  drawRect(small, 100, 80, 10, 8, 80, 64, { r: 250, g: 250, b: 255 });
  const result = detectDocumentBoundary(small.data, 100, 80);
  printResult("small-image", result);
  test("no crash on small image", () => !!result.rect);

  const wide = createRGBA(1200, 400, { r: 25, g: 25, b: 35 });
  drawRect(wide, 1200, 400, 80, 40, 1040, 320, { r: 250, g: 250, b: 255 });
  const result2 = detectDocumentBoundary(wide.data, 1200, 400);
  printResult("wide-image", result2);
  test("no crash on wide image", () => !!result2.rect);
}

// 12. Timeout simulation
console.log("[12] Timeout — startedAt past hard timeout");
{
  const rgba = createRGBA(W, H, { r: 240, g: 240, b: 245 });
  drawRect(rgba, W, H, 100, 120, W - 200, H - 240, { r: 245, g: 242, b: 240 });
  // Set startedAt far in the past to force immediate timeout
  const result = detectDocumentBoundary(rgba.data, W, H, { startedAt: Date.now() - 5000 });
  printResult("timeout", result);
  test("fallback on timeout", () => result.source === "fallback");
  test("fallback rect is 5% inset", () => {
    return Math.abs(result.rect.left - W * 0.05) < 5 &&
           Math.abs(result.rect.top - H * 0.05) < 5;
  });
}

console.log(`\n=== Results: ${pass} pass, ${fail} fail ===`);
if (fail > 0) process.exit(1);
