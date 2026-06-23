/**
 * src/crop/coordinate-mapper.js — Map between display and image coordinate spaces.
 *
 * Display space = where the image renders on screen (aspect-fit)
 * Image space = original image pixel coordinates
 * Crop points are always stored in image space.
 */

/**
 * Map image coordinates to display coordinates using aspect-fit layout.
 * @param {{x:number,y:number}[]} points - points in image space
 * @param {{x:number,y:number,width:number,height:number}} displayRect - image's actual render rect on screen
 * @param {{width:number,height:number}} imageSize - original image dimensions
 * @returns {{x:number,y:number}[]} points in display space
 */
function mapImageToDisplay(points, displayRect, imageSize) {
  if (!points || !displayRect || !imageSize) return [];
  return points.map((p) => ({
    x: displayRect.x + (p.x / imageSize.width) * displayRect.width,
    y: displayRect.y + (p.y / imageSize.height) * displayRect.height,
  }));
}

/**
 * Map display coordinates back to image coordinates.
 * Clamps to display rect boundaries.
 * @param {{x:number,y:number}} displayPoint - point in display space
 * @param {{x:number,y:number,width:number,height:number}} displayRect
 * @param {{width:number,height:number}} imageSize
 * @returns {{x:number,y:number}} point in image space
 */
function mapDisplayToImage(displayPoint, displayRect, imageSize) {
  const x = Math.max(displayRect.x, Math.min(displayPoint.x, displayRect.x + displayRect.width));
  const y = Math.max(displayRect.y, Math.min(displayPoint.y, displayRect.y + displayRect.height));
  return {
    x: ((x - displayRect.x) / displayRect.width) * imageSize.width,
    y: ((y - displayRect.y) / displayRect.height) * imageSize.height,
  };
}

/**
 * Calculate the aspect-fit display rectangle for an image within a container.
 * @param {{width:number,height:number}} imageSize
 * @param {{width:number,height:number,x:number,y:number}} containerRect
 * @param {number} [maxDisplaySide=720] - optional max side for downscaling
 * @returns {{x:number,y:number,width:number,height:number}}
 */
function computeAspectFitRect(imageSize, containerRect, maxDisplaySide) {
  const maxSide = maxDisplaySide || containerRect.width;
  const scale = Math.min(maxSide / imageSize.width, maxSide / imageSize.height);
  const displayW = imageSize.width * scale;
  const displayH = imageSize.height * scale;
  return {
    x: containerRect.x + (containerRect.width - displayW) / 2,
    y: containerRect.y + (containerRect.height - displayH) / 2,
    width: displayW,
    height: displayH,
  };
}

/**
 * Create default crop points with an inset margin (5% default).
 * @param {{width:number,height:number}} imageSize
 * @param {number} [insetRatio=0.05]
 * @returns {{x:number,y:number}[]} four corner points in image space
 */
function createDefaultCropPoints(imageSize, insetRatio) {
  const inset = insetRatio || 0.05;
  const left = imageSize.width * inset;
  const top = imageSize.height * inset;
  const right = imageSize.width * (1 - inset);
  const bottom = imageSize.height * (1 - inset);
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
  ];
}

module.exports = {
  mapImageToDisplay,
  mapDisplayToImage,
  computeAspectFitRect,
  createDefaultCropPoints,
};
