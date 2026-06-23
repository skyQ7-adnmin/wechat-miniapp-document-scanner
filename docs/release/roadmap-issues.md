# Roadmap Issues — v0.1.0 release

The following 5 issues should be created on GitHub after pushing v0.1.0.

---

## Issue 1: Improve document boundary detection on complex backgrounds

**Acceptance criteria:**
- Detection produces valid (non-fallback) result on at least 6 of 12 synthetic scenarios
- No regression on high-contrast white-on-dark case
- Confidence threshold tuning documented
- New fixtures added for: patterned tablecloth, busy desk, low-light photo

---

## Issue 2: Add four-point perspective correction

**Acceptance criteria:**
- User can drag 4 independent corner points to arbitrary quadrilateral
- Export performs perspective transform to rectangular output
- Output dimensions auto-calculated from longest edges
- Existing rectangular crop mode preserved as default

---

## Issue 3: Expand Android and iOS device compatibility testing

**Acceptance criteria:**
- Tested on at least 5 Android devices (different vendors/screen ratios)
- Tested on at least 3 iOS devices (including notch and home indicator)
- Touch offset accuracy within 2px on all tested devices
- Canvas export succeeds on all tested devices
- Results documented in `docs/device-compatibility.md`

---

## Issue 4: Improve crop handle visual design

**Acceptance criteria:**
- Corner handles clearly visible on both light and dark images
- Edge drag handles have visible affordance (not fully transparent)
- Active handle state (pressed/selected) feedback
- Handle size adapts to screen density
- Design reviewed against at least 2 reference scanning apps

---

## Issue 5: Add more synthetic detector fixtures

**Acceptance criteria:**
- At least 20 synthetic test images covering: rotated documents, partial shadows, multi-document scenes, receipt-sized papers, A4 landscape, business cards
- Each fixture has expected detection result documented
- Fixtures contain no real customer data
- Test suite runs all fixtures and reports pass/fallback/fail counts
