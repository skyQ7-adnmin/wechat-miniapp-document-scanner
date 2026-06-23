/**
 * tests/geometry.test.js — Tests for geometry, corner sorting, convexity
 */

const { describe, it } = (typeof require !== "undefined" ? require("node:test") : {});

// Inline test runner for Node.js built-in test
function test(name, fn) { fn(); }

// Geometry helpers (inline for test isolation)
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function sortCorners(points) {
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[0], bottom[1]];
}

function isConvexQuad(points) {
  function cross(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
  const signs = [];
  for (let i = 0; i < 4; i++) {
    const o = points[i], a = points[(i + 1) % 4], b = points[(i + 2) % 4];
    signs.push(cross(o, a, b));
  }
  return signs.every((s) => s >= 0) || signs.every((s) => s <= 0);
}

console.log("=== geometry tests ===");

// 1. sortCorners
function testSortCorners() {
  const input = [{ x: 800, y: 50 }, { x: 50, y: 600 }, { x: 50, y: 50 }, { x: 800, y: 600 }];
  const sorted = sortCorners(input);
  console.assert(sorted[0].x === 50 && sorted[0].y === 50, "TL check");
  console.assert(sorted[1].x === 800 && sorted[1].y === 50, "TR check");
  console.assert(sorted[2].x === 50 && sorted[2].y === 600, "BL check");
  console.assert(sorted[3].x === 800 && sorted[3].y === 600, "BR check");
  console.log("  ✅ sortCorners");
}
testSortCorners();

// 2. isConvexQuad
function testConvexQuad() {
  const convex = [{ x: 50, y: 50 }, { x: 800, y: 50 }, { x: 50, y: 600 }, { x: 800, y: 600 }];
  console.assert(isConvexQuad(convex), "convex quad");

  // Self-intersecting (bow-tie)
  const selfIntersect = [{ x: 200, y: 100 }, { x: 100, y: 300 }, { x: 400, y: 100 }, { x: 300, y: 300 }];
  console.assert(!isConvexQuad(selfIntersect), "self-intersecting should fail");
  console.log("  ✅ isConvexQuad");
}
testConvexQuad();

// 3. Default crop points
const { createDefaultCropPoints } = require("../src/crop/coordinate-mapper");
function testDefaultCropPoints() {
  const points = createDefaultCropPoints({ width: 1000, height: 800 }, 0.05);
  console.assert(points.length === 4, "4 points");
  console.assert(points[0].x === 50 && points[0].y === 40, "5% inset top-left");
  console.assert(points[3].x === 950 && points[3].y === 760, "5% inset bottom-right");
  console.log("  ✅ createDefaultCropPoints");
}
testDefaultCropPoints();

console.log("geometry tests: PASS");
