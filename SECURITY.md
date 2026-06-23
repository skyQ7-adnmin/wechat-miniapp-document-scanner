# Security

## Reporting a Vulnerability

If you discover a security vulnerability, please open a private issue on GitHub or email the maintainer. Do not publicly disclose the vulnerability before it is resolved.

## Data Privacy

This library performs all image processing on-device. No image data is sent to any server during boundary detection, cropping, or export.

## Dependencies

- Node.js (for the test runner and CI)
- WeChat Mini Program runtime (for the component)
- No third-party npm dependencies at runtime

## CI Security Checks

The CI pipeline runs:
- `node --check` on all source files
- Unit tests
- Security scan for leaked secrets, tokens, private domains, company names
- Database/backup file presence check
- `.env` file presence check
