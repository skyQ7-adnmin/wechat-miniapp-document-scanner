/**
 * src/detector/confidence.js — Confidence scoring for detected boundaries
 */

const { mean } = require("./geometry");

/**
 * Calculate overall confidence from edge, anchor, and structural scores.
 * @param {{ [side:string]: number }} edgeConfidences - per-side confidence 0..1
 * @param {number} anchorConfidence - anchor-based confidence 0..1
 * @param {number} tableLinesCrossed - table grid line intersections
 * @param {number} paperConfidence - paper-pixel-based confidence 0..1
 * @returns {number} overall confidence 0..1
 */
function computeConfidence(edgeConfidences, anchorConfidence, tableLinesCrossed, paperConfidence) {
  const sides = Object.values(edgeConfidences).filter((v) => v != null);
  const edgeMean = sides.length ? mean(sides) : 0;
  return (
    edgeMean * 0.56 +
    (anchorConfidence || 0) * 0.22 +
    Math.min(tableLinesCrossed / 36.0, 1.0) * 0.10 +
    (paperConfidence || 0) * 0.12
  );
}

/**
 * Check if the detection result should be auto-applied.
 * @param {number} overallConfidence
 * @param {{ [side:string]: number }} edgeConfidences
 * @param {number} autoApplyThreshold - default 0.86
 * @param {number} minEdge - default 0.68
 * @returns {boolean}
 */
function shouldAutoApply(overallConfidence, edgeConfidences, autoApplyThreshold, minEdge) {
  const at = autoApplyThreshold || 0.86;
  const me = minEdge || 0.68;
  if (overallConfidence < at) return false;
  const edgeValues = Object.values(edgeConfidences).filter((v) => v != null);
  return edgeValues.every((v) => v >= me);
}

module.exports = { computeConfidence, shouldAutoApply };
