/**
 * tests/coordinate-mapper.test.js — Tests for coordinate mapping
 */

const { mapImageToDisplay, mapDisplayToImage, computeAspectFitRect } = require("../src/crop/coordinate-mapper");

console.log("=== coordinate-mapper tests ===");

// 1. mapImageToDisplay
function testMapToDisplay() {
  const points = [{ x: 0, y: 0 }, { x: 1000, y: 800 }];
  const displayRect = { x: 50, y: 25, width: 300, height: 240 };
  const imageSize = { width: 1000, height: 800 };
  const result = mapImageToDisplay(points, displayRect, imageSize);
  console.assert(Math.abs(result[0].x - 50) < 1 && Math.abs(result[0].y - 25) < 1, "origin maps");
  console.assert(Math.abs(result[1].x - 350) < 1 && Math.abs(result[1].y - 265) < 1, "far corner maps");
  console.log("  ✅ mapImageToDisplay");
}
testMapToDisplay();

// 2. mapDisplayToImage
function testMapToImage() {
  const point = { x: 200, y: 145 };
  const displayRect = { x: 50, y: 25, width: 300, height: 240 };
  const imageSize = { width: 1000, height: 800 };
  const result = mapDisplayToImage(point, displayRect, imageSize);
  console.assert(Math.abs(result.x - 500) < 1, "x maps back");
  console.assert(Math.abs(result.y - 400) < 1, "y maps back");
  console.log("  ✅ mapDisplayToImage");
}
testMapToImage();

// 3. Roundtrip consistency
function testRoundtrip() {
  const imageSize = { width: 1200, height: 900 };
  const containerRect = { x: 0, y: 0, width: 375, height: 667 };
  const displayRect = computeAspectFitRect(imageSize, containerRect);
  const imagePoints = [{ x: 200, y: 150 }, { x: 1000, y: 750 }];
  const displayPoints = mapImageToDisplay(imagePoints, displayRect, imageSize);
  const back = displayPoints.map((p) => mapDisplayToImage(p, displayRect, imageSize));
  console.assert(Math.abs(back[0].x - imagePoints[0].x) < 2, "roundtrip x1");
  console.assert(Math.abs(back[1].y - imagePoints[1].y) < 2, "roundtrip y2");
  console.log("  ✅ roundtrip consistency");
}
testRoundtrip();

// 4. computeAspectFitRect
function testAspectFit() {
  const imageSize = { width: 4000, height: 3000 };
  const container = { x: 0, y: 0, width: 375, height: 667 };
  const rect = computeAspectFitRect(imageSize, container);
  console.assert(rect.width <= 375 && rect.height <= 667, "fits container");
  console.assert(Math.abs(rect.width / rect.height - 4 / 3) < 0.01, "preserves aspect ratio");
  console.log("  ✅ computeAspectFitRect");
}
testAspectFit();

console.log("coordinate-mapper tests: PASS");
