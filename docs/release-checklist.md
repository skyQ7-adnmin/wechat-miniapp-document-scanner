# v0.1.0 Release Checklist

## Automated Checks (CI)

- [x] `npm run check` — all modules load
- [x] `npm test` — 4 test suites, 22 detector assertions pass
- [x] `npm run security` — 0 sensitive data detected

## WeChat DevTools (manual)

- [ ] Import `examples/wechat-miniprogram-demo/` as new project
- [ ] Replace `appid` in `project.config.json` with your own
- [ ] Compile without errors
- [ ] Select landscape image from album
- [ ] Select portrait image from album
- [ ] Default 5% crop frame appears immediately
- [ ] Drag 4 corners independently
- [ ] Drag 4 edges
- [ ] Pan entire frame
- [ ] Export cropped image (check result appears in UI)
- [ ] Switch to new image — old crop points not carried over
- [ ] Single page flow: choose → crop → export
- [ ] Multi-page: add 3 pages, verify count, delete page, switch pages

## Android Real Device (manual)

- [ ] Touch targets accurate (corner/edge handles hit)
- [ ] Crop result matches frame visually
- [ ] No frame drops during drag
- [ ] No excessive heat during continuous use

## iPhone Real Device (manual)

- [ ] Safe area respected (no notch/home indicator overlap)
- [ ] Image orientation correct (EXIF rotation handled)
- [ ] Drag offset matches finger position
- [ ] Canvas export succeeds
- [ ] Temp file path valid for display

## Pre-publish

- [ ] No real AppID in `project.config.json`
- [ ] No private domains or API keys in source
- [ ] `v0.1.0` tag on latest commit
- [ ] No remote Git configured
- [ ] `git status` is clean
