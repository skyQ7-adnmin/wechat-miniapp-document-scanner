/**
 * src/crop/validate-points.js — Validate crop point arrays and geometry
 */

/**
 * Sort four points into [topLeft, topRight, bottomLeft, bottomRight] order.
 * @param {{x:number,y:number}[]} points - array of 4 points
 * @returns {{x:number,y:number}[]} sorted points
 */
function sortCorners(points) {
  if (!points || points.length !== 4) return null;
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[0], bottom[1]];
}

/**
 * Check if four points form a valid convex quadrilateral.
 * @param {{x:number,y:number}[]} points
 * @returns {boolean}
 */
function isConvexQuad(points) {
  if (!points || points.length !== 4) return false;

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  const signs = [];
  for (let i = 0; i < 4; i++) {
    const o = points[i];
    const a = points[(i + 1) % 4];
    const b = points[(i + 2) % 4];
    signs.push(cross(o, a, b));
  }

  const positive = signs.every((s) => s >= 0);
  const negative = signs.every((s) => s <= 0);
  return positive || negative;
}

/**
 * Validate crop points against image dimensions.
 * @param {{x:number,y:number}[]} points
 * @param {{width:number,height:number}} imageSize
 * @param {{minAreaRatio?:number,maxAreaRatio?:number}} [options]
 * @returns {{ valid:boolean, errors:string[] }}
 */
function validateCropPoints(points, imageSize, options) {
  const errors = [];
  const opts = options || {};
  const minAreaRatio = opts.minAreaRatio || 0.15;
  const maxAreaRatio = opts.maxAreaRatio || 0.95;

  if (!points || points.length !== 4) {
    return { valid: false, errors: ["Points must contain exactly 4 corners"] };
  }

  // Check all points within image bounds
  for (let i = 0; i < 4; i++) {
    const p = points[i];
    if (p.x < 0 || p.x > imageSize.width || p.y < 0 || p.y > imageSize.height) {
      errors.push(`Point ${i} (${p.x},${p.y}) out of image bounds (${imageSize.width}x${imageSize.height})`);
    }
  }

  // Check not self-intersecting
  if (!isConvexQuad(points)) {
    errors.push("Points do not form a convex quadrilateral");
  }

  // Check area ratio
  const sorted = sortCorners(points);
  if (sorted) {
    const w = Math.max(sorted[1].x, sorted[3].x) - Math.min(sorted[0].x, sorted[2].x);
    const h = Math.max(sorted[2].y, sorted[3].y) - Math.min(sorted[0].y, sorted[1].y);
    const area = w * h;
    const imgArea = imageSize.width * imageSize.height;
    const ratio = area / imgArea;
    if (ratio < minAreaRatio) errors.push(`Area ratio ${ratio.toFixed(3)} below minimum ${minAreaRatio}`);
    if (ratio > maxAreaRatio) errors.push(`Area ratio ${ratio.toFixed(3)} above maximum ${maxAreaRatio}`);
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { sortCorners, isConvexQuad, validateCropPoints };
