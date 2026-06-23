/**
 * src/crop/crop-image.js — Crop image using rectangular crop points.
 *
 * This module performs rectangular (axis-aligned) cropping only.
 * Perspective correction is not implemented in v0.1.0.
 *
 * Platform: WeChat Mini Program (uses wx canvas APIs).
 * In pure Node.js tests, these functions are replaced with DOM-free stubs.
 */

const DEFAULT_OPTIONS = {
  maxOutputSide: 3000,
  format: "jpg",
  quality: 0.95,
};

/**
 * Calculate the bounding box from four corner points.
 * @param {{x:number,y:number}[]} points - four points in image coordinates
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
function getBoundingBox(points) {
  if (!points || points.length !== 4) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  };
}

/**
 * Crop image by rectangular points. wx-environment only.
 *
 * In WeChat Mini Program:
 * 1. Draw original image onto an offscreen canvas at the crop region
 * 2. Scale output so max side <= maxOutputSide
 * 3. Export via wx.canvasToTempFilePath
 *
 * @param {object} options
 * @param {string} options.src - image temp file path
 * @param {{width:number,height:number}} options.imageInfo - original image dimensions
 * @param {{x:number,y:number}[]} options.points - four crop points in image coordinates
 * @param {number} [options.maxOutputSide=3000]
 * @param {number} [options.quality=0.95]
 * @returns {Promise<{tempFilePath:string,width:number,height:number}>}
 */
function cropImageByPoints(options) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const box = getBoundingBox(opts.points);

  if (!box) {
    return Promise.reject(new Error("Invalid crop points"));
  }

  if (typeof wx === "undefined" || !wx.createOffscreenCanvas) {
    return Promise.reject(new Error("cropImageByPoints requires WeChat Mini Program environment"));
  }

  return new Promise((resolve, reject) => {
    try {
      const canvas = wx.createOffscreenCanvas({
        type: "2d",
        width: box.width,
        height: box.height,
      });
      const ctx = canvas.getContext("2d");

      const img = canvas.createImage();
      img.onload = () => {
        ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
        canvas.toTempFilePath({
          x: 0,
          y: 0,
          width: box.width,
          height: box.height,
          destWidth: Math.min(box.width, opts.maxOutputSide),
          destHeight: Math.min(box.height, opts.maxOutputSide),
          fileType: opts.format === "png" ? "png" : "jpg",
          quality: opts.quality,
          success: (res) => resolve({ tempFilePath: res.tempFilePath, width: box.width, height: box.height }),
          fail: reject,
        });
      };
      img.onerror = reject;
      img.src = opts.src;
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { cropImageByPoints, getBoundingBox };
