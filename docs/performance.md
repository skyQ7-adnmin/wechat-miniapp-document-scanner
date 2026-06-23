# Performance

## Detection Speed

- Analysis image scaled to **720px** max side (down from 4000+px camera)
- Feature extraction: ~50-150ms on modern devices
- Paper anchor: ~10-30ms
- Table anchor: ~20-60ms  
- Edge refinement: ~50-120ms
- **Total**: typically 100-400ms

## Timeout Protection

- Soft timeout: **900ms** — prefers fallback if detection exceeds this
- Hard timeout: **1160ms** — forces immediate fallback
- In v0.1.0 (no detector worker), detection triggers immediately

## Memory

- Analysis buffer: 720×960 ≈ 2.7MB RGBA
- Crop canvas: up to 3000px side, ~36MB at full resolution
- Component overhead: < 5MB

## WeChat Base Library

- Minimum: 2.25.0 (for Canvas 2D API)
- Recommended: 2.30.0+
- Tested platforms: iOS 12+, Android 8+
