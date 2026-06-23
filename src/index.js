/**
 * wechat-miniapp-document-scanner v0.1.0
 * Public API for document boundary detection, cropping, and coordinate mapping.
 *
 * This module is designed for WeChat Mini Programs.
 * Some functions (e.g., cropImageByPoints) require wx APIs.
 */

const { detectDocumentBoundary } = require("./detector/document-boundary-detector");
const { validateCropPoints, sortCorners, isConvexQuad } = require("./crop/validate-points");
const { mapImageToDisplay, mapDisplayToImage, computeAspectFitRect, createDefaultCropPoints } = require("./crop/coordinate-mapper");
const { cropImageByPoints, getBoundingBox } = require("./crop/crop-image");
const { TaskController, createDetectionTask } = require("./runtime/task-controller");
const { createTimeoutController } = require("./runtime/timeout-controller");

module.exports = {
  // Detector
  detectDocumentBoundary,

  // Geometry
  sortCorners,
  isConvexQuad,
  getBoundingBox,

  // Crop
  cropImageByPoints,
  validateCropPoints,
  createDefaultCropPoints,

  // Coordinate mapping (display ↔ image)
  mapImageToDisplay,
  mapDisplayToImage,
  computeAspectFitRect,

  // Runtime
  TaskController,
  createDetectionTask,
  createTimeoutController,
};
