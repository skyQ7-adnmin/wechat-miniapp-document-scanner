/**
 * src/detector/geometry.js — Core geometry utilities
 */

/**
 * Clamp a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate the median of an array of numbers.
 * @param {number[]} values
 * @returns {number|null}
 */
function median(values) {
  if (!values || !values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Calculate the mean of an array of numbers.
 * @param {number[]} values
 * @returns {number}
 */
function mean(values) {
  if (!values || !values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate median absolute deviation.
 * @param {number[]} values
 * @param {number} center
 * @returns {number}
 */
function mad(values, center) {
  if (!values || !values.length || center == null) return 999;
  return median(values.map((v) => Math.abs(v - center))) || 0;
}

/**
 * Calculate a percentile value from sorted copy.
 * @param {number[]} values
 * @param {number} ratio - 0..1
 * @returns {number}
 */
function percentile(values, ratio) {
  if (!values || !values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[clamp(Math.floor(sorted.length * ratio), 0, sorted.length - 1)];
}

module.exports = { clamp, median, mean, mad, percentile };
