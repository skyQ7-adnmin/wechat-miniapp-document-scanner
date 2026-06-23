# Troubleshooting

## Common Issues

### "Canvas not found"
The hidden export canvas must have `type="2d"` and id `cropCanvas`. Verify the component's WXML includes this element.

### Detection is slow on my image
- Very large images (>12MP) may cause longer analysis
- The detector scales to 720px max side for analysis
- If auto-detect is unnecessary, set `cropPoints` directly and skip detection

### Crop frame doesn't fit properly
- The 5% default inset may not be optimal for all documents
- Adjust the frame manually and the component will respect your changes
- Complex backgrounds (patterned tablecloths, busy desks) reduce accuracy

### "Cannot read property 'width' of undefined"
Ensure `imageInfo` is passed with both `width` and `height` properties from `wx.getImageInfo`.

### Export quality
- JPEG quality defaults to 0.95
- Max output side 3000px
- Change these in `exportCrop()` parameters or in `crop-image.js`

## WeChat DevTools

- Use **Build** → **Preview** to test on device
- Console logs appear in DevTools under the Console tab
- Canvas debugging is limited in simulator; test on real device for best results
