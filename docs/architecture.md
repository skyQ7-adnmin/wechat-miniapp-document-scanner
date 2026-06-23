# Architecture (v0.1.0)

## Overview

```
src/
├── detector/          # Boundary detection algorithms
│   ├── geometry.js              # clamp, median, percentile
│   ├── confidence.js            # confidence scoring
│   └── document-boundary-detector.js  # 3-phase detection
├── crop/              # Cropping and coordinate mapping
│   ├── coordinate-mapper.js     # display ↔ image coords
│   ├── crop-image.js            # Canvas-based crop export
│   └── validate-points.js       # point validation
├── runtime/           # Async task management
│   ├── task-controller.js       # task lifecycle
│   └── timeout-controller.js    # timeout management
└── index.js           # Public API

miniprogram-component/
└── document-cropper/  # WeChat Mini Program component
    ├── index.js       # Component logic
    ├── index.json     # Component config
    ├── index.wxml     # Template (crop UI)
    └── index.wxss     # Styles
```

## Detection Pipeline

1. **Extract Features**: RGBA → gray, saturation, gradients, bright floor
2. **Paper Anchor**: find paper-like pixels (high brightness, low saturation)
3. **Table Anchor**: detect horizontal/vertical long lines, cluster, validate
4. **Edge Refinement**: scan 7 bands per edge, score by edge + contrast
5. **Validate**: area ratio, aspect ratio, absolute scale, anchor consistency
6. **Safe Padding**: add 1.8% margin

## Fallback Strategy

- Hard timeout (1160ms) → immediate 5% inset
- Soft timeout (900ms) → skip edge refinement, use anchor
- No anchor found → 5% inset fallback
- Confidence < 0.86 → fallback
- Any edge confidence < 0.68 → fallback

## Coordinate System

- **Image space**: original image pixel coordinates (e.g., 4000×3000)
- **Display space**: aspect-fit rendered coordinates on screen
- `mapImageToDisplay` converts image → display
- `mapDisplayToImage` converts display → image
- Crop points are always stored in image space

## Component Lifecycle

```
attached → properties set → _initEditor()
  ├── create default 5% inset points
  ├── _updateDisplay (compute aspect-fit rect)
  ├── triggerEvent("ready")
  └── _startDetection (async)
       ├── triggerEvent("detectstart")
       └── triggerEvent("detectcomplete"|"detectfallback")

touchstart → record drag start → _userAdjusted=true
touchmove  → update points → _updateDisplay → triggerEvent("change")
touchend   → triggerEvent("crop")

detached → abort detection → cleanup
```
