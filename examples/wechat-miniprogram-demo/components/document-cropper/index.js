/**
 * document-cropper component v0.1.0
 * WeChat Mini Program custom component for document cropping.
 *
 * Features: 5% default inset, manual drag corners/edges/pan, Canvas export.
 * No OCR, no server calls, no app.globalData.
 *
 * ALL triggerEvent / setData detail objects are plain JSON-serializable data.
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
      this._dragStart = null;
      this._imagePoints = null;
      this._displayRect = null;
      this._userAdjusted = false;
      this._lastDragAt = 0;
      this._initRetries = 0;
      this._initTaskId = Math.random();
    },
    detached() {
      this._pageAlive = false;
    },
  },

  observers: {
    "src,imageInfo"(src, imageInfo) {
      if (src && imageInfo && imageInfo.width > 0 && imageInfo.height > 0) {
        this._userAdjusted = false;
        this._initRetries = 0;
        this._initTaskId = Math.random();
        this._initEditor();
      }
    },
  },

  methods: {
    /* ---- serialization ---- */

    _serializePoints(points) {
      if (!Array.isArray(points)) return [];
      return points.map(function (p) { return { x: Number(p.x || 0), y: Number(p.y || 0) }; });
    },

    _emitError(message) {
      this.triggerEvent("error", { message: String(message || "unknown") });
    },

    _debug(label, data) {
      if (typeof __wxConfig !== "undefined" && __wxConfig.envVersion === "release") return;
      console.log("[cropper]", label, data || "");
    },

    /* ---- initialization ---- */

    _cropPointsObserver(points) {
      if (!points || points.length !== 4) return;
      if (!this._imagePoints) return;
      this._imagePoints = this._serializePoints(points);
      this._updateDisplay();
    },

    _initEditor() {
      var self = this;
      var imageInfo = this.properties.imageInfo;
      var src = this.properties.src;

      if (!src || !imageInfo || !imageInfo.width || !imageInfo.height) {
        self._debug("init: missing data", { src: !!src, w: imageInfo && imageInfo.width });
        return;
      }

      // Default crop points: 5% inset in image coordinates
      // Order: TL, TR, BR, BL
      var points = self._createDefaultPoints(imageInfo);
      self._imagePoints = points;
      self._dragStartPoints = self._serializePoints(points);
      self._userAdjusted = false;

      self._debug("init: default points created", JSON.stringify(points[0]));

      // Wait for DOM to be ready
      self._getContainerRectWithRetry(function () {
        if (!self._pageAlive) return;
        self._updateDisplay();
        self.triggerEvent("ready", {});
        self._startDetection();
      });
    },

    _createDefaultPoints(info) {
      var m = 0.05;
      return [
        { x: info.width * m, y: info.height * m },
        { x: info.width * (1 - m), y: info.height * m },
        { x: info.width * (1 - m), y: info.height * (1 - m) },
        { x: info.width * m, y: info.height * (1 - m) },
      ];
    },

    _getContainerRectWithRetry(cb) {
      var self = this;
      var maxRetries = 10;

      function tryMeasure() {
        if (!self._pageAlive) return;
        var query = self.createSelectorQuery();
        query.select(".cropper-container").boundingClientRect(function (rect) {
          if (rect && rect.width > 0 && rect.height > 0) {
            self._containerRect = rect;
            self._debug("container measured", JSON.stringify({ w: rect.width, h: rect.height }));
            if (cb) cb();
            return;
          }
          self._initRetries++;
          if (self._initRetries < maxRetries) {
            self._debug("container retry " + self._initRetries);
            wx.nextTick ? wx.nextTick(tryMeasure) : setTimeout(tryMeasure, 50);
          } else {
            self._emitError("Container measurement failed after retries");
          }
        });
        query.exec();
      }

      wx.nextTick ? wx.nextTick(tryMeasure) : setTimeout(tryMeasure, 60);
    },

    /* ---- display update ---- */

    _computeAspectFitRect(imageSize, containerRect) {
      var scale = Math.min(containerRect.width / imageSize.width, containerRect.height / imageSize.height);
      var w = imageSize.width * scale;
      var h = imageSize.height * scale;
      return {
        x: containerRect.x + (containerRect.width - w) / 2,
        y: containerRect.y + (containerRect.height - h) / 2,
        width: w,
        height: h,
      };
    },

    _mapImageToDisplay(points, displayRect, imageInfo) {
      return points.map(function (p) {
        return {
          x: displayRect.x + (p.x / imageInfo.width) * displayRect.width,
          y: displayRect.y + (p.y / imageInfo.height) * displayRect.height,
        };
      });
    },

    _updateDisplay() {
      var imageInfo = this.properties.imageInfo;
      var rect = this._containerRect;
      if (!rect || !imageInfo || !this._imagePoints) return;

      var displayRect = this._computeAspectFitRect(imageInfo, rect);
      var displayPoints = this._mapImageToDisplay(this._imagePoints, displayRect, imageInfo);

      var tl = displayPoints[0], tr = displayPoints[1], br = displayPoints[2], bl = displayPoints[3];
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
        cropRect: this._px(cropRect),
        cropLines: this._linesPx(cropLines),
      });
    },

    _px(rect) { var o = {}; for (var k in rect) o[k] = rect[k] + "px"; return o; },
    _linesPx(lines) { var o = {}; for (var k in lines) o[k] = this._px(lines[k]); return o; },

    /* ---- detection stub ---- */

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

    /* ---- drag ---- */

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

      var info = this.properties.imageInfo;
      var iDx = (dx / this._displayRect.width) * info.width;
      var iDy = (dy / this._displayRect.height) * info.height;

      var pts = this._serializePoints(this._dragStartPoints || []);
      var mode = this.data.dragMode, idx = this.data.dragIndex;

      if (mode === "corner" && idx >= 0) {
        pts[idx] = { x: pts[idx].x + iDx, y: pts[idx].y + iDy };
      } else if (mode === "edge") {
        if (idx === 0) { pts[0].y += iDy; pts[1].y += iDy; }
        else if (idx === 1) { pts[2].y += iDy; pts[3].y += iDy; }
        else if (idx === 2) { pts[0].x += iDx; pts[2].x += iDx; }
        else if (idx === 3) { pts[1].x += iDx; pts[3].x += iDx; }
      } else {
        pts = pts.map(function (p) { return { x: p.x + iDx, y: p.y + iDy }; });
        var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
        var ox = Math.min.apply(null, xs) < 0 ? -Math.min.apply(null, xs) : Math.max.apply(null, xs) > info.width ? info.width - Math.max.apply(null, xs) : 0;
        var oy = Math.min.apply(null, ys) < 0 ? -Math.min.apply(null, ys) : Math.max.apply(null, ys) > info.height ? info.height - Math.max.apply(null, ys) : 0;
        if (ox || oy) pts = pts.map(function (p) { return { x: p.x + ox, y: p.y + oy }; });
      }

      this._imagePoints = this._constrainPoints(pts);
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

    _constrainPoints(pts) {
      var info = this.properties.imageInfo;
      var m = Math.max(8, Math.min(info.width, info.height) * 0.015);
      return pts.map(function (p) { return { x: Math.max(m, Math.min(info.width - m, p.x)), y: Math.max(m, Math.min(info.height - m, p.y)) }; });
    },

    /* ---- public API ---- */

    getPoints() { return this._serializePoints(this._imagePoints || []); },
    setPoints(p) { this._imagePoints = this._serializePoints(p); this._dragStartPoints = this._serializePoints(p); this._updateDisplay(); },

    ensureCropInitialized() {
      if (this._imagePoints && this._imagePoints.length === 4) return;
      var info = this.properties.imageInfo;
      var src = this.properties.src;
      if (!src || !info || !info.width || !info.height) return;
      this._imagePoints = this._createDefaultPoints(info);
      this._dragStartPoints = this._serializePoints(this._imagePoints);
      this._updateDisplay();
    },

    exportCrop() {
      this.ensureCropInitialized();
      if (!this._imagePoints || this._imagePoints.length !== 4) {
        this._emitError("Crop points could not be initialized");
        return Promise.reject(new Error("No valid crop points"));
      }
      var pts = this._imagePoints;
      var box = {
        x: Math.round(Math.min.apply(null, pts.map(function (p) { return p.x; }))),
        y: Math.round(Math.min.apply(null, pts.map(function (p) { return p.y; }))),
        width: Math.round(Math.max.apply(null, pts.map(function (p) { return p.x; })) - Math.min.apply(null, pts.map(function (p) { return p.x; }))),
        height: Math.round(Math.max.apply(null, pts.map(function (p) { return p.y; })) - Math.min.apply(null, pts.map(function (p) { return p.y; }))),
      };
      var self = this;
      return new Promise(function (resolve, reject) {
        var query = self.createSelectorQuery();
        query.select("#cropCanvas").fields({ node: true, size: true }).exec(function (res) {
          if (!res || !res[0]) { self._emitError("Canvas not found"); return reject(new Error("Canvas not found")); }
          var canvas = res[0].node, ctx = canvas.getContext("2d");
          var img = canvas.createImage();
          img.onload = function () {
            var s = Math.min(3000 / box.width, 3000 / box.height, 1);
            var ow = Math.round(box.width * s), oh = Math.round(box.height * s);
            canvas.width = ow; canvas.height = oh;
            ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, ow, oh);
            wx.canvasToTempFilePath({
              canvas: canvas, x: 0, y: 0, width: ow, height: oh, destWidth: ow, destHeight: oh,
              fileType: "jpg", quality: 0.95,
              success: function (r) { resolve({ tempFilePath: r.tempFilePath, width: ow, height: oh }); },
              fail: function () { self._emitError("Canvas export failed"); reject(new Error("Export failed")); },
            });
          };
          img.onerror = function () { self._emitError("Image load failed"); reject(new Error("Image load failed")); };
          img.src = self.properties.src;
        });
      });
    },
  },
});
