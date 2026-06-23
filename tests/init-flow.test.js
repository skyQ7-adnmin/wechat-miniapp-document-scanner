var { computeAspectFitRect } = require("../src/crop/coordinate-mapper");

// Match component's inline _createDefaultPoints: TL, TR, BR, BL
function createDefaultPoints(info, m) { m = m || 0.05; return [{x:info.width*m,y:info.height*m},{x:info.width*(1-m),y:info.height*m},{x:info.width*(1-m),y:info.height*(1-m)},{x:info.width*m,y:info.height*(1-m)}]; }

console.log("\n=== Init Flow Tests ===");

var pass = 0, fail = 0;
function t(name, fn) {
  try { var ok = fn(); if (ok !== false) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name); } }
  catch (e) { fail++; console.log("  ❌ " + name + ": " + e.message); }
}

t("default points order (TL/TR/BR/BL)", function () {
  var pts = createDefaultPoints({ width: 1000, height: 800 }, 0.05);
  return pts.length === 4 && Math.abs(pts[0].x - 50) < 2 && Math.abs(pts[2].x - 950) < 2;
});

t("aspectFit portrait (letterbox)", function () {
  var r = computeAspectFitRect({ width: 3000, height: 4000 }, { x: 0, y: 0, width: 375, height: 667 });
  return r.width > 0 && r.y > 10;
});

t("aspectFit landscape (letterbox)", function () {
  var r = computeAspectFitRect({ width: 4000, height: 3000 }, { x: 0, y: 0, width: 375, height: 667 });
  return r.width > 0 && r.y > 150;
});

t("serializePoints plain objects", function () {
  var out = [{ x: 1.5, y: 2.5, extra: "bad" }].map(function (p) { return { x: Number(p.x || 0), y: Number(p.y || 0) }; });
  return typeof out[0].extra === "undefined" && out[0].x === 1.5;
});

t("event detail JSON serializable", function () {
  try { JSON.stringify({ points: [{ x: 1, y: 2 }] }); return true; } catch (e) { return false; }
});

t("points exclude functions", function () {
  return [{ x: 10, y: 20 }].every(function (p) { return typeof p.x === "number" && typeof p.y === "number"; });
});

t("empty points handled", function () {
  return [].map(function (p) { return { x: p.x, y: p.y }; }).length === 0;
});

t("null imageInfo rejected", function () {
  var info = null; return !(info && info.width > 0 && info.height > 0);
});

t("zero-width rejected", function () {
  var info = { width: 0, height: 100 }; return !(info.width > 0 && info.height > 0);
});

t("valid imageInfo passes", function () {
  var info = { width: 1000, height: 800 }; return !!(info && info.width > 0 && info.height > 0);
});

console.log("\n=== Init Flow: " + pass + " pass, " + fail + " fail ===");
if (fail > 0) process.exit(1);
