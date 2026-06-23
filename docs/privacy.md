# Privacy

## Data Processing

All image processing in this library occurs **entirely on-device**. No image data is transmitted to any server at any point.

- **Boundary detection**: pure JavaScript pixel analysis on device
- **Crop export**: WeChat Canvas 2D API, local processing only
- **No network requests**: the component makes zero outbound requests

## Permissions

The component requires only:
- `wx.chooseImage` (user-initiated photo/album access)
- No `wx.camera` or continuous camera access
- No location, contacts, or storage permissions

## Compliance

- GDPR/CCPA friendly (no data collection)
- Suitable for processing sensitive documents (invoices, contracts, IDs)
- No data persistence beyond user's explicit save action
