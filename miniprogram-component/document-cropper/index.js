/**
 * document-cropper component — WeChat Mini Program document cropping UI.
 *
 * v0.1.0 provides rectangular crop with:
 * - Default 5% inset frame
 * - Drag corners (4 handles)
 * - Drag edges (4 handles)
 * - Pan the entire frame
 * - Coordinate mapping (display ↔ image)
 * - Export cropped image via Canvas
 *
 * Usage:
 *   <document-cropper
 *     src="{{imagePath}}"
 *     imageInfo="{{imageInfo}}"
 *     bind:crop="onCrop"
 *   />
 */

const { mapImageToDisplay, mapDisplayToImage, computeAspectFitRect, createDefaultCropPoints } = require("../../src/crop/coordinate-mapper");

Component({
  properties: {
    src: { type: String, value: "" },
    imageInfo: { type: Object, value: null },
    cropPoints: { type: Array, value: null },
  },

  data: {
    displayPoints: [],
    cropLines: {},
    cropRect: {},
    containerRect: null,
    dragMode: "",
    dragIndex: -1,
  },

  observers: {
    "src,imageInfo"(src, imageInfo) {
      if (src && imageInfo && imageInfo.width && imageInfo.height) {
        this._initEditor();
      }
    },
  },

  methods: {
    _initEditor() {
      const { imageInfo, cropPoints } = this.properties;
      const points = cropPoints || createDefaultCropPoints(imageInfo, 0.05);

      this._imagePoints = [...points];
      this._getContainerRect(() => {
        this._updateDisplay();
      });
    },

    _getContainerRect(cb) {
      const query = this.createSelectorQuery();
      query.select(".cropper-container").boundingClientRect((rect) => {
        this._containerRect = rect;
        if (cb) cb();
      });
      query.exec();
    },

    _updateDisplay() {
      const { imageInfo } = this.properties;
      const rect = this._containerRect;
      if (!rect || !imageInfo) return;

      const displayRect = computeAspectFitRect(imageInfo, rect);
      const displayPoints = mapImageToDisplay(this._imagePoints, displayRect, imageInfo);

      const [tl, tr, bl, br] = displayPoints;
      const cropRect = {
        left: Math.min(tl.x, bl.x),
        top: Math.min(tl.y, tr.y),
        width: Math.abs(tr.x - tl.x),
        height: Math.abs(bl.y - tl.y),
      };

      const cropLines = {
        top: { left: cropRect.left, top: cropRect.top, width: cropRect.width },
        bottom: { left: cropRect.left, top: cropRect.top + cropRect.height, width: cropRect.width },
        left: { left: cropRect.left, top: cropRect.top, height: cropRect.height },
        right: { left: cropRect.left + cropRect.width, top: cropRect.top, height: cropRect.height },
      };

      this._displayRect = displayRect;
      this.setData({ displayPoints, cropRect: this._pxStyle(cropRect), cropLines: this._linesStyle(cropLines) });
    },

    _pxStyle(rect) {
      return Object.fromEntries(Object.entries(rect).map(([k, v]) => [k, `${v}px`]));
    },

    _linesStyle(lines) {
      const out = {};
      for (const [name, val] of Object.entries(lines)) {
        out[name] = this._pxStyle(val);
      }
      return out;
    },

    /* --- Drag handlers --- */

    onTouchStart(e) {
      const mode = e.currentTarget.dataset.mode || "move";
      const index = e.currentTarget.dataset.index != null ? Number(e.currentTarget.dataset.index) : -1;
      const touch = e.touches[0];
      this._dragStart = { x: touch.clientX, y: touch.clientY };
      this._dragStartPoints = [...this._imagePoints];
      this.setData({ dragMode: mode, dragIndex: index });
    },

    onTouchMove(e) {
      if (!this._dragStart || !this._displayRect) return;
      const touch = e.touches[0];
      const dx = touch.clientX - this._dragStart.x;
      const dy = touch.clientY - this._dragStart.y;
      const now = Date.now();
      if (now - (this._lastDragAt || 0) < 16) return;
      this._lastDragAt = now;

      const imageDx = (dx / this._displayRect.width) * this.properties.imageInfo.width;
      const imageDy = (dy / this._displayRect.height) * this.properties.imageInfo.height;

      let points = [...this._dragStartPoints];
      const mode = this.data.dragMode;
      const idx = this.data.dragIndex;

      if (mode === "corner" && idx >= 0) {
        points[idx] = { x: points[idx].x + imageDx, y: points[idx].y + imageDy };
      } else if (mode === "edge") {
        const imageInfo = this.properties.imageInfo;
        const [tl, tr, bl, br] = points.map((p) => ({ x: p.x, y: p.y }));
        if (idx === 0) { tl.y += imageDy; tr.y += imageDy; }
        else if (idx === 1) { bl.y += imageDy; br.y += imageDy; }
        else if (idx === 2) { tl.x += imageDx; bl.x += imageDx; }
        else if (idx === 3) { tr.x += imageDx; br.x += imageDx; }
        points = [tl, tr, bl, br];
      } else if (mode === "move") {
        points = points.map((p) => ({ x: p.x + imageDx, y: p.y + imageDy }));
        const { width, height } = this.properties.imageInfo;
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const offsetX = Math.min(...xs) < 0 ? -Math.min(...xs) : Math.max(...xs) > width ? width - Math.max(...xs) : 0;
        const offsetY = Math.min(...ys) < 0 ? -Math.min(...ys) : Math.max(...ys) > height ? height - Math.max(...ys) : 0;
        if (offsetX || offsetY) points = points.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
      }

      this._imagePoints = this._constrainPoints(points);
      this._updateDisplay();
    },

    onTouchEnd() {
      this._dragStart = null;
      this.setData({ dragMode: "", dragIndex: -1 });
      this.triggerEvent("crop", { points: [...this._imagePoints] });
    },

    _constrainPoints(points) {
      const { width, height } = this.properties.imageInfo;
      const margin = Math.max(8, Math.min(width, height) * 0.015);
      for (let i = 0; i < 4; i++) {
        points[i].x = Math.max(margin, Math.min(width - margin, points[i].x));
        points[i].y = Math.max(margin, Math.min(height - margin, points[i].y));
      }
      return points;
    },

    /* --- Public methods --- */

    getPoints() {
      return [...this._imagePoints];
    },

    setPoints(points) {
      this._imagePoints = [...points];
      this._dragStartPoints = [...points];
      this._updateDisplay();
    },

    exportCrop() {
      const box = {
        x: Math.round(Math.min(...this._imagePoints.map((p) => p.x))),
        y: Math.round(Math.min(...this._imagePoints.map((p) => p.y))),
        width: Math.round(Math.max(...this._imagePoints.map((p) => p.x)) - Math.min(...this._imagePoints.map((p) => p.x))),
        height: Math.round(Math.max(...this._imagePoints.map((p) => p.y)) - Math.min(...this._imagePoints.map((p) => p.y))),
      };

      return new Promise((resolve, reject) => {
        const query = this.createSelectorQuery();
        query.select("#cropCanvas").fields({ node: true, size: true }).exec((res) => {
          if (!res || !res[0]) return reject(new Error("Canvas not found"));
          const canvas = res[0].node;
          const ctx = canvas.getContext("2d");

          const img = canvas.createImage();
          img.onload = () => {
            const scale = Math.min(3000 / box.width, 3000 / box.height, 1);
            const outW = Math.round(box.width * scale);
            const outH = Math.round(box.height * scale);
            canvas.width = outW;
            canvas.height = outH;
            ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, outW, outH);

            wx.canvasToTempFilePath({
              canvas,
              x: 0, y: 0, width: outW, height: outH,
              destWidth: outW, destHeight: outH,
              fileType: "jpg", quality: 0.95,
              success: (r) => resolve({ tempFilePath: r.tempFilePath, width: outW, height: outH }),
              fail: reject,
            });
          };
          img.onerror = reject;
          img.src = this.properties.src;
        });
      });
    },
  },
});
