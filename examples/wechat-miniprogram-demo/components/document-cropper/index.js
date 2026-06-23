/**
 * document-cropper component v0.1.0
 * WeChat Mini Program custom component for document cropping.
 *
 * Features: 5% default inset, auto-detect boundary, drag corners/edges/pan,
 * timeout fallback, user adjustment priority, Canvas crop export.
 *
 * IMPORTANT: All triggerEvent detail objects contain ONLY serializable data.
 * No functions, Error, Canvas, Map, Set, or circular references.
 * No OCR, no server calls, no app.globalData dependency.
 */

Component({
  properties: {
    src: { type: String, value: "" },
    imageInfo: { type: Object, value: null },
    cropPoints: { type: Array, value: null, observer: "_cropPointsObserver" },
  },

  data: {
    displayPoints: [],
    cropLines: {},
    cropRect: {},
    dragMode: "",
    dragIndex: -1,
    detecting: false,
  },

  lifetimes: {
    attached() {
      this._pageAlive = true;
      this._detectorTask = null;
      this._dragStart = null;
      this._imagePoints = null;
      this._displayRect = null;
      this._userAdjusted = false;
      this._lastDragAt = 0;
    },
    detached() {
      this._pageAlive = false;
      if (this._detectorTask) this._detectorTask.abort();
    },
  },

  observers: {
    "src,imageInfo"(src, imageInfo) {
      if (src && imageInfo && imageInfo.width && imageInfo.height) {
        this._userAdjusted = false;
        this._initEditor();
      }
    },
  },

  methods: {
    /* ---- Helpers (must produce serializable-only output) ---- */

    _serializePoints(points) {
      if (!Array.isArray(points)) return [];
      return points.map(function (p) {
        return { x: Number(p.x || 0), y: Number(p.y || 0) };
      });
    },

    _emitError(message) {
      this.triggerEvent("error", { message: String(message || "unknown error") });
    },

    _cropPointsObserver(points) {
      if (points && points.length === 4 && this._imagePoints) {
        this._imagePoints = this._serializePoints(points);
        this._updateDisplay();
      }
    },

    _initEditor() {
      var imageInfo = this.properties.imageInfo;
      var cropPoints = this.properties.cropPoints;
      var src = this.properties.src;
      if (!imageInfo || !imageInfo.width || !imageInfo.height) {
        this._emitError("imageInfo is required with valid width and height");
        return;
      }
      if (!src) {
        this._emitError("src is required (image file path)");
        return;
      }
      var points = cropPoints && cropPoints.length === 4
        ? this._serializePoints(cropPoints)
        : this._createDefaultCropPoints(imageInfo);

      this._imagePoints = points;
      this._dragStartPoints = points.map(function (p) { return { x: p.x, y: p.y }; });
      this._userAdjusted = false;

      var self = this;
      this._getContainerRect(function () {
        self._updateDisplay();
        self.triggerEvent("ready", {});
        self._startDetection();
      });
    },

    /** inline to avoid require() in WeChat component top-level */
    _createDefaultCropPoints(imageInfo) {
      var inset = 0.05;
      var left = imageInfo.width * inset;
      var top = imageInfo.height * inset;
      var right = imageInfo.width * (1 - inset);
      var bottom = imageInfo.height * (1 - inset);
      return [
        { x: left, y: top },
        { x: right, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
      ];
    },

    _getContainerRect(cb) {
      var self = this;
      var query = this.createSelectorQuery();
      query.select(".cropper-container").boundingClientRect(function (rect) {
        self._containerRect = rect;
        if (cb) cb();
      });
      query.exec();
    },

    _updateDisplay() {
      var imageInfo = this.properties.imageInfo;
      var rect = this._containerRect;
      if (!rect || !imageInfo) return;

      var displayRect = this._computeAspectFitRect(imageInfo, rect);
      var displayPoints = this._mapImageToDisplay(this._imagePoints, displayRect, imageInfo);

      var tl = displayPoints[0], tr = displayPoints[1], bl = displayPoints[2], br = displayPoints[3];
      var cropRect = {
        left: Math.min(tl.x, bl.x),
        top: Math.min(tl.y, tr.y),
        width: Math.abs(tr.x - tl.x),
        height: Math.abs(bl.y - tl.y),
      };

      var cropLines = {
        top: { left: cropRect.left, top: cropRect.top, width: cropRect.width },
        bottom: { left: cropRect.left, top: cropRect.top + cropRect.height, width: cropRect.width },
        left: { left: cropRect.left, top: cropRect.top, height: cropRect.height },
        right: { left: cropRect.left + cropRect.width, top: cropRect.top, height: cropRect.height },
      };

      this._displayRect = displayRect;
      this.setData({
        displayPoints: displayPoints,
        cropRect: this._pxStyle(cropRect),
        cropLines: this._linesStyle(cropLines),
      });
    },

    /** inline computeAspectFitRect */
    _computeAspectFitRect(imageSize, containerRect) {
      var maxSide = containerRect.width;
      var scale = Math.min(maxSide / imageSize.width, maxSide / imageSize.height);
      var displayW = imageSize.width * scale;
      var displayH = imageSize.height * scale;
      return {
        x: containerRect.x + (containerRect.width - displayW) / 2,
        y: containerRect.y + (containerRect.height - displayH) / 2,
        width: displayW,
        height: displayH,
      };
    },

    /** inline mapImageToDisplay */
    _mapImageToDisplay(points, displayRect, imageSize) {
      return points.map(function (p) {
        return {
          x: displayRect.x + (p.x / imageSize.width) * displayRect.width,
          y: displayRect.y + (p.y / imageSize.height) * displayRect.height,
        };
      });
    },

    _pxStyle(rect) {
      var out = {};
      for (var k in rect) { out[k] = rect[k] + "px"; }
      return out;
    },

    _linesStyle(lines) {
      var out = {};
      for (var name in lines) { out[name] = this._pxStyle(lines[name]); }
      return out;
    },

    /* ---- Detection ---- */
    _startDetection() {
      if (!this._pageAlive) return;
      this.setData({ detecting: true });
      this.triggerEvent("detectstart", {});
      var self = this;
      setTimeout(function () {
        if (!self._pageAlive) return;
        self.setData({ detecting: false });
        if (!self._userAdjusted && self._imagePoints) {
          self.triggerEvent("detectfallback", { reason: "no_detector_worker" });
        }
      }, 300);
    },

    /* ---- Drag handlers ---- */
    onTouchStart(e) {
      var mode = e.currentTarget.dataset.mode || "move";
      var index = e.currentTarget.dataset.index != null ? Number(e.currentTarget.dataset.index) : -1;
      var touch = e.touches[0];
      this._dragStart = { x: touch.clientX, y: touch.clientY };
      this._dragStartPoints = this._serializePoints(this._imagePoints || []);
      this._userAdjusted = true;
      this.setData({ dragMode: mode, dragIndex: index });
    },

    onTouchMove(e) {
      if (!this._dragStart || !this._displayRect) return;
      var touch = e.touches[0];
      var dx = touch.clientX - this._dragStart.x;
      var dy = touch.clientY - this._dragStart.y;
      var now = Date.now();
      if (now - (this._lastDragAt || 0) < 16) return;
      this._lastDragAt = now;

      var imageInfo = this.properties.imageInfo;
      var imageDx = (dx / this._displayRect.width) * imageInfo.width;
      var imageDy = (dy / this._displayRect.height) * imageInfo.height;

      var points = this._serializePoints(this._dragStartPoints || []);
      var mode = this.data.dragMode;
      var idx = this.data.dragIndex;

      if (mode === "corner" && idx >= 0) {
        points[idx] = { x: points[idx].x + imageDx, y: points[idx].y + imageDy };
      } else if (mode === "edge") {
        var tl = { x: points[0].x, y: points[0].y };
        var tr = { x: points[1].x, y: points[1].y };
        var bl = { x: points[2].x, y: points[2].y };
        var br = { x: points[3].x, y: points[3].y };
        if (idx === 0) { tl.y += imageDy; tr.y += imageDy; }
        else if (idx === 1) { bl.y += imageDy; br.y += imageDy; }
        else if (idx === 2) { tl.x += imageDx; bl.x += imageDx; }
        else if (idx === 3) { tr.x += imageDx; br.x += imageDx; }
        points = [tl, tr, bl, br];
      } else {
        points = points.map(function (p) { return { x: p.x + imageDx, y: p.y + imageDy }; });
        var xs = points.map(function (p) { return p.x; });
        var ys = points.map(function (p) { return p.y; });
        var offX = Math.min.apply(null, xs) < 0 ? -Math.min.apply(null, xs) : Math.max.apply(null, xs) > imageInfo.width ? imageInfo.width - Math.max.apply(null, xs) : 0;
        var offY = Math.min.apply(null, ys) < 0 ? -Math.min.apply(null, ys) : Math.max.apply(null, ys) > imageInfo.height ? imageInfo.height - Math.max.apply(null, ys) : 0;
        if (offX || offY) {
          points = points.map(function (p) { return { x: p.x + offX, y: p.y + offY }; });
        }
      }

      this._imagePoints = this._constrainPoints(points);
      this._updateDisplay();
      this.triggerEvent("change", { points: this._serializePoints(this._imagePoints) });
    },

    onTouchEnd() {
      this._dragStart = null;
      this.setData({ dragMode: "", dragIndex: -1 });
      if (this._imagePoints) {
        this.triggerEvent("crop", { points: this._serializePoints(this._imagePoints) });
      }
    },

    _constrainPoints(points) {
      var imageInfo = this.properties.imageInfo;
      var margin = Math.max(8, Math.min(imageInfo.width, imageInfo.height) * 0.015);
      return points.map(function (p) {
        return {
          x: Math.max(margin, Math.min(imageInfo.width - margin, p.x)),
          y: Math.max(margin, Math.min(imageInfo.height - margin, p.y)),
        };
      });
    },

    /* ---- Public API (returns plain objects only) ---- */
    getPoints() {
      return this._serializePoints(this._imagePoints || []);
    },

    setPoints(points) {
      this._imagePoints = this._serializePoints(points);
      this._dragStartPoints = this._serializePoints(points);
      this._updateDisplay();
    },

    exportCrop() {
      if (!this._imagePoints || this._imagePoints.length !== 4) {
        this._emitError("No valid crop points to export");
        return Promise.reject(new Error("No valid crop points"));
      }
      var box = {
        x: Math.round(Math.min.apply(null, this._imagePoints.map(function (p) { return p.x; }))),
        y: Math.round(Math.min.apply(null, this._imagePoints.map(function (p) { return p.y; }))),
        width: Math.round(Math.max.apply(null, this._imagePoints.map(function (p) { return p.x; })) - Math.min.apply(null, this._imagePoints.map(function (p) { return p.x; }))),
        height: Math.round(Math.max.apply(null, this._imagePoints.map(function (p) { return p.y; })) - Math.min.apply(null, this._imagePoints.map(function (p) { return p.y; }))),
      };

      var self = this;
      return new Promise(function (resolve, reject) {
        var query = self.createSelectorQuery();
        query.select("#cropCanvas").fields({ node: true, size: true }).exec(function (res) {
          if (!res || !res[0]) {
            self._emitError("Canvas not found");
            return reject(new Error("Canvas not found"));
          }
          var canvas = res[0].node;
          var ctx = canvas.getContext("2d");
          var img = canvas.createImage();
          img.onload = function () {
            var scale = Math.min(3000 / box.width, 3000 / box.height, 1);
            var outW = Math.round(box.width * scale);
            var outH = Math.round(box.height * scale);
            canvas.width = outW;
            canvas.height = outH;
            ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, outW, outH);
            wx.canvasToTempFilePath({
              canvas: canvas, x: 0, y: 0, width: outW, height: outH,
              destWidth: outW, destHeight: outH,
              fileType: "jpg", quality: 0.95,
              success: function (r) { resolve({ tempFilePath: r.tempFilePath, width: outW, height: outH }); },
              fail: function () { self._emitError("Canvas export failed"); reject(new Error("Canvas export failed")); },
            });
          };
          img.onerror = function () { self._emitError("Image load failed"); reject(new Error("Image load failed")); };
          img.src = self.properties.src;
        });
      });
    },
  },
});
