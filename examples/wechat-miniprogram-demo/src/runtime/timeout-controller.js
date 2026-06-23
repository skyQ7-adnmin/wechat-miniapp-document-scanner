/**
 * src/runtime/timeout-controller.js — Detection timeout management.
 *
 * Provides hard timeout (force fallback) and soft timeout (prefer fallback).
 */

/**
 * Check if a timeout has elapsed.
 * @param {number} startedAt - Date.now() when started
 * @param {number} timeoutMs - timeout duration in milliseconds
 * @returns {boolean}
 */
function timedOut(startedAt, timeoutMs) {
  return Date.now() - startedAt > timeoutMs;
}

/**
 * Create a timeout controller.
 * @param {{ softTimeoutMs?:number, hardTimeoutMs?:number }} [options]
 * @returns {{ startedAt:number, soft:function():boolean, hard:function():boolean, elapsed:function():number }}
 */
function createTimeoutController(options) {
  const opts = options || {};
  const softMs = opts.softTimeoutMs || 900;
  const hardMs = opts.hardTimeoutMs || 1160;
  const startedAt = Date.now();

  return {
    startedAt,
    soft: () => timedOut(startedAt, softMs),
    hard: () => timedOut(startedAt, hardMs),
    elapsed: () => Date.now() - startedAt,
  };
}

module.exports = { timedOut, createTimeoutController };
