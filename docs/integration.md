# Integration Guide

## Add to Your Project

1. Copy `miniprogram-component/document-cropper/` to your project
2. Register in page JSON
3. See [README.zh-CN.md](../README.zh-CN.md) for minimal example

## Custom Detection

```js
const { detectDocumentBoundary } = require("./path/to/src/detector/document-boundary-detector");

wx.chooseImage({
  success: (res) => {
    // Get RGBA pixel data
    wx.getImageInfo({ src: res.tempFilePaths[0], success: (info) => {
      // Access pixel data via Canvas or wx API
      // Then: detectDocumentBoundary(pixelData, info.width, info.height);
    }});
  }
});
```

## Coordinate Mapping

```js
const { mapDisplayToImage, computeAspectFitRect } = require("./src/crop/coordinate-mapper");

const displayRect = computeAspectFitRect({ width: 4000, height: 3000 }, { x: 0, y: 0, width: 375, height: 667 });
const imagePoint = mapDisplayToImage({ x: 200, y: 300 }, displayRect, { width: 4000, height: 3000 });
```

## Multi-page Support

```js
// Track pages separately
const pages = [];
// Add page
pages.push({ src: path, imageInfo: info });
// Each page gets its own cropper instance or reuses the same component with different src
```
