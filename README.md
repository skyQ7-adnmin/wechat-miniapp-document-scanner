# WeChat Mini Program Document Scanner

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-0.1.0-green)](CHANGELOG.md)

A lightweight, offline document cropping tool for WeChat Mini Programs.

**What it does**: After taking a photo of a document, it attempts to detect the document boundary and lets you manually adjust the crop frame before saving a clean, rectangular crop.

**What it does NOT do**: This is NOT an OCR tool. It does not perform text recognition, perspective correction, or cloud-based processing.

---

## Features (v0.1.0)

- **Static boundary suggestion** — 5% default inset frame
- **720px thumbnail analysis** — analyzes a downscaled version for speed
- **Manual adjustment** — drag corners, edges, or pan the entire frame
- **Auto-detect timeout fallback** — if detection takes too long, falls back to default inset
- **User adjustment priority** — once you move the frame, auto-detection won't overwrite it
- **Single & multi-page** — capture one or many pages
- **Canvas export** — exports cropped image up to 3000px

---

## Installation

1. Install [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. Copy the `miniprogram-component/document-cropper/` folder into your miniprogram project
3. Register the component in your page's `.json`:

```json
{
  "usingComponents": {
    "document-cropper": "/components/document-cropper/index"
  }
}
```

---

## Quick Start

```xml
<!-- page.wxml -->
<document-cropper
  src="{{imagePath}}"
  imageInfo="{{imageInfo}}"
  bind:crop="onCropUpdate"
/>
<button bindtap="exportCropped">Export</button>
```

```js
// page.js
Page({
  data: { imagePath: "", imageInfo: null },
  onChooseImage() {
    wx.chooseImage({
      count: 1, sizeType: ["original"], sourceType: ["album", "camera"],
      success: (res) => {
        wx.getImageInfo({
          src: res.tempFilePaths[0],
          success: (info) => this.setData({ imagePath: res.tempFilePaths[0], imageInfo: info })
        });
      }
    });
  },
  onCropUpdate(e) { console.log("crop updated:", e.detail.points); },
  exportCropped() {
    const cropper = this.selectComponent("#cropper");
    cropper.exportCrop().then(({ tempFilePath }) => {
      console.log("cropped:", tempFilePath);
      this.setData({ croppedImage: tempFilePath });
    });
  }
});
```

---

## API

### Component: `<document-cropper>`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | String | `""` | Image temp file path |
| `imageInfo` | Object | `null` | `{width, height}` from `wx.getImageInfo` |
| `cropPoints` | Array | `null` | Override default crop points |

| Event | Detail | Description |
|-------|--------|-------------|
| `bind:crop` | `{points}` | Fires when crop frame is adjusted |

| Method | Returns | Description |
|--------|---------|-------------|
| `getPoints()` | `[{x,y}*4]` | Current crop points |
| `setPoints(points)` | — | Set crop points programmatically |
| `exportCrop()` | `Promise<{tempFilePath,width,height}>` | Export cropped image |

### Core Functions (Node.js / pure JS)

```js
const { detectDocumentBoundary, createDefaultCropPoints, mapImageToDisplay } = require("wechat-miniapp-document-scanner");

// Detect boundary from RGBA pixel data
const result = detectDocumentBoundary(rgbaData, width, height);
// → { rect, confidence, source, diagnostics }

// Create 5% inset default
const points = createDefaultCropPoints({ width: 4000, height: 3000 });

// Map image coords to display coords
const display = mapImageToDisplay(points, displayRect, imageSize);
```

---

## Known Limitations

- **Rectangular crop only** — no perspective/warp correction in v0.1.0
- **No continuous frame processing** — does not use `onCameraFrame`
- **Detection is not 100% accurate** — user adjustment is always available
- **Not a replacement for professional scanning SDKs**

---

## Privacy

All processing happens on-device. No image data is sent to any server.

---

## License

MIT — see [LICENSE](LICENSE)
