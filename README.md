# WeChat Mini Program Document Scanner

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-0.1.0-green)](CHANGELOG.md)

A lightweight, offline rectangular crop tool for WeChat Mini Programs. Provides 5% default inset frame with manual corner/edge/pan adjustment. Auto-detect boundary is experimental; manual adjustment is the stable primary workflow.

**What it does NOT do**: No OCR, no perspective correction, no server calls.

---

## Capability Status (v0.1.0)

| Feature | Status |
|---------|--------|
| Auto-detect boundary | **Experimental** — works best on high-contrast images |
| Manual corner drag | **Stable** |
| Edge drag | **Stable** |
| Frame pan | **Stable** |
| Single-page crop | **Stable** |
| Multi-page management | **Demo** |
| Perspective correction | **Not implemented** |
| OCR | **Not included** |

> The auto-detect boundary is experimental. In testing with 12 synthetic scenarios, it produced an applied detection in high-contrast cases (white paper on dark background) and fell back to the 5% default inset in the remaining cases. Fallback to default inset is **normal design behavior**, not a failure. Manual adjustment is the reliable, intended primary workflow.

---

## Features (v0.1.0)

- **Default 5% inset frame** — instantly usable without detection
- **720px thumbnail analysis** — downscaled for speed
- **Manual adjustment** — drag corners, edges, or pan the entire frame
- **Auto-detect timeout fallback** — if detection takes too long, falls back to default inset
- **User adjustment priority** — once you move the frame, auto-detection won't overwrite it
- **Single & multi-page** — capture one or many pages
- **Canvas export** — exports cropped image up to 3000px (rectangular only)

---

## Installation

1. Install [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. Copy `miniprogram-component/document-cropper/` into your project
3. Register in page JSON:

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
<document-cropper
  src="{{imagePath}}"
  imageInfo="{{imageInfo}}"
  bind:ready="onReady"
  bind:crop="onCrop"
  bind:error="onError"
/>
<button bindtap="exportCrop">Export Crop</button>
```

```js
Page({
  data: { imagePath: "", imageInfo: null },
  chooseImage() {
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
  onCrop(e) { this.cropPoints = e.detail.points; },
  onError(e) { console.error(e.detail.message); },
  exportCrop() {
    this.selectComponent("#cropper").exportCrop().then(({tempFilePath}) => {
      console.log("Cropped:", tempFilePath);
    });
  }
});
```

---

## Component API

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | String | `""` | Image temp file path |
| `imageInfo` | Object | `null` | `{width, height}` from `wx.getImageInfo` |
| `cropPoints` | Array | `null` | Override initial crop points `[{x,y}*4]` |

| Event | Detail | Description |
|-------|--------|-------------|
| `ready` | `{}` | Component initialized, cropper UI ready |
| `detectstart` | `{}` | Auto boundary detection started |
| `detectcomplete` | `{points,confidence}` | Detection produced a result |
| `detectfallback` | `{reason}` | Detection fell back to default inset |
| `change` | `{points}` | Crop frame is being dragged (intermediate) |
| `crop` | `{points}` | Drag finished, crop frame confirmed |
| `error` | `{message}` | Error (invalid input, canvas failure, etc.) |

| Method | Returns | Description |
|--------|---------|-------------|
| `getPoints()` | `[{x,y}*4]` | Current crop points in image coordinates |
| `setPoints(points)` | — | Set crop points programmatically |
| `exportCrop()` | `Promise<{tempFilePath,width,height}>` | Export cropped image |

---

## Demo

See `examples/wechat-miniprogram-demo/` for a runnable single/multi-page demo:

1. Open WeChat DevTools
2. Create project pointing to `examples/wechat-miniprogram-demo/`
3. Replace `appid` in `project.config.json` with your own
4. Compile and preview

The demo supports: choose image → crop adjust → export → multi-page add/delete/switch. No server, no OCR.

---

## Known Limitations

- **Rectangular crop only** — no perspective/warp correction
- **No continuous frame processing** — does not use `onCameraFrame`
- **Auto-detect is experimental** — manual adjustment is the reliable workflow
- **Not a replacement for professional scanning SDKs**

---

## Privacy

All processing happens on-device. No image data is sent to any server.

---

## License

MIT — see [LICENSE](LICENSE)

---

## Links

- **Repository**: https://github.com/skyQ7-adnmin/wechat-miniapp-document-scanner
- **Issues**: https://github.com/skyQ7-adnmin/wechat-miniapp-document-scanner/issues
- **Releases**: https://github.com/skyQ7-adnmin/wechat-miniapp-document-scanner/releases
- **v0.1.0 Release Notes**: [docs/release/v0.1.0.md](docs/release/v0.1.0.md)
- **Roadmap Issues**: [docs/release/roadmap-issues.md](docs/release/roadmap-issues.md)
