/**
 * document-cropper v0.1.0 — Stable manual crop with accurate export.
 *
 * Coordinates:
 *   - displayCropPoints: px in component display area (for WXML + drag)
 *   - cropPoints: original image pixel coords (for export only)
 *   - Touch coordinates: subtract container rect to convert to component-local.
 */

Component({
  properties: {
    src: { type: String, value: "" },
    imageInfo: { type: Object, value: null },
  },

  data: {
    showOverlay: false,
    cropLeft: 0, cropTop: 0, cropW: 0, cropH: 0,
    hasCrop: false,
  },

  lifetimes: {
    attached() {
      this._imagePts = null;       // image-space crop points [TL,TR,BR,BL]
      this._displayPts = null;     // display-space crop points
      this._stageRect = null;      // container page-coords
      this._imgRect = null;        // image display rect (aspect-fit, container-relative)
      this._dragStart = null;
      this._dragStartImg = null;
      this._dragCornerIdx = -1;
    },
  },

  observers: {
    "src,imageInfo"(src, info) {
      if (src && info && info.width > 0 && info.height > 0) {
        this._initCrop();
      }
    },
  },

  methods: {
    _dbg(label, data) {
      if (typeof __wxConfig !== "undefined" && __wxConfig.envVersion === "release") return;
      console.log("[crop]", label, data || "");
    },

    _sp(pts) {
      if (!Array.isArray(pts)) return [];
      return pts.map(function (p) { return { x: Number(p.x || 0), y: Number(p.y || 0) }; });
    },

    /* ---------- init ---------- */
    _initCrop() {
      var self = this, info = this.properties.imageInfo;
      var m = 0.1;
      self._imagePts = [
        { x: info.width * m, y: info.height * m },
        { x: info.width * (1 - m), y: info.height * m },
        { x: info.width * (1 - m), y: info.height * (1 - m) },
        { x: info.width * m, y: info.height * (1 - m) },
      ];
      self._dbg("imagePts init", JSON.stringify(self._imagePts[0]));

      function measure() {
        var q = self.createSelectorQuery();
        q.select(".crop-stage").boundingClientRect(function (r) {
          if (r && r.width > 0) {
            self._stageRect = r;
            self._computeImgRect();
            self._syncDisplayFromImage();
            self.setData({ showOverlay: true, hasCrop: true });
            self.triggerEvent("ready", {});
            return;
          }
          setTimeout(measure, 80);
        });
        q.exec();
      }
      setTimeout(measure, 100);
    },

    _computeImgRect() {
      var info = this.properties.imageInfo, r = this._stageRect;
      if (!info || !r) return;
      var sc = Math.min(r.width / info.width, r.height / info.height);
      var w = info.width * sc, h = info.height * sc;
      this._imgRect = { x: (r.width - w) / 2, y: (r.height - h) / 2, w: w, h: h, sc: sc };
      this._dbg("imgRect", JSON.stringify(this._imgRect));
    },

    _imgToDisplay(p) {
      var ir = this._imgRect;
      return { x: ir.x + (p.x * ir.sc), y: ir.y + (p.y * ir.sc) };
    },

    _displayToImg(p) {
      var ir = this._imgRect;
      return { x: (p.x - ir.x) / ir.sc, y: (p.y - ir.y) / ir.sc };
    },

    _syncDisplayFromImage() {
      if (!this._imagePts || !this._imgRect) return;
      this._displayPts = this._imagePts.map(this._imgToDisplay, this);
      this._updateBox();
    },

    _updateBox() {
      var dp = this._displayPts;
      if (!dp || dp.length !== 4) return;
      var xs = dp.map(function (p) { return p.x; });
      var ys = dp.map(function (p) { return p.y; });
      this.setData({
        cropLeft: Math.round(Math.min.apply(null, xs)),
        cropTop: Math.round(Math.min.apply(null, ys)),
        cropW: Math.round(Math.max.apply(null, xs) - Math.min.apply(null, xs)),
        cropH: Math.round(Math.max.apply(null, ys) - Math.min.apply(null, ys)),
      });
    },

    /* ---------- drag ---------- */
    onMoveStart(e) {
      var t = e.touches[0];
      this._dragStart = { x: t.clientX, y: t.clientY };
      this._dragStartImg = this._sp(this._imagePts);
    },

    onMove(e) {
      if (!this._dragStart || !this._imgRect) return;
      var t = e.touches[0];
      var ddx = (t.clientX - this._dragStart.x) / this._imgRect.sc;
      var ddy = (t.clientY - this._dragStart.y) / this._imgRect.sc;
      var info = this.properties.imageInfo;
      var pts = this._sp(this._dragStartImg).map(function (p) { return { x: p.x + ddx, y: p.y + ddy }; });
      pts = this._clamp(pts, info);
      this._imagePts = pts;
      this._syncDisplayFromImage();
      this.triggerEvent("change", { points: this._sp(pts) });
    },

    onMoveEnd() {
      this._dragStart = null;
      this.triggerEvent("crop", { points: this._sp(this._imagePts) });
    },

    onCornerStart(e) {
      var idx = Number(e.currentTarget.dataset.index);
      if (isNaN(idx)) return;
      var t = e.touches[0];
      this._dragStart = { x: t.clientX, y: t.clientY };
      this._dragStartImg = this._sp(this._imagePts);
      this._dragCornerIdx = idx;
    },

    onCornerMove(e) {
      if (!this._dragStart || this._dragCornerIdx < 0 || !this._imgRect) return;
      var t = e.touches[0];
      var ddx = (t.clientX - this._dragStart.x) / this._imgRect.sc;
      var ddy = (t.clientY - this._dragStart.y) / this._imgRect.sc;
      var idx = this._dragCornerIdx;
      var pts = this._sp(this._dragStartImg);
      pts[idx] = { x: pts[idx].x + ddx, y: pts[idx].y + ddy };
      pts = this._clamp(pts, this.properties.imageInfo);
      this._imagePts = pts;
      this._syncDisplayFromImage();
      this.triggerEvent("change", { points: this._sp(pts) });
    },

    onCornerEnd() {
      this._dragStart = null;
      this._dragCornerIdx = -1;
      this.triggerEvent("crop", { points: this._sp(this._imagePts) });
    },

    _clamp(pts, info) {
      var m = Math.max(8, Math.min(info.width, info.height) * 0.015);
      return pts.map(function (p) {
        return { x: Math.max(m, Math.min(info.width - m, p.x)), y: Math.max(m, Math.min(info.height - m, p.y)) };
      });
    },

    /* ---------- public ---------- */
    getPoints() { return this._sp(this._imagePts || []); },

    exportCrop() {
      var self = this;
      if (!self._imagePts || self._imagePts.length !== 4) {
        return Promise.reject(new Error("No crop points"));
      }
      var pts = self._sp(self._imagePts);
      var xs = pts.map(function (p) { return p.x; });
      var ys = pts.map(function (p) { return p.y; });
      var sx = Math.round(Math.min.apply(null, xs));
      var sy = Math.round(Math.min.apply(null, ys));
      var sw = Math.round(Math.max.apply(null, xs) - sx);
      var sh = Math.round(Math.max.apply(null, ys) - sy);

      self._dbg("export", JSON.stringify({ sx: sx, sy: sy, sw: sw, sh: sh }));

      return new Promise(function (resolve, reject) {
        var q = self.createSelectorQuery();
        q.select("#cropCanvas").fields({ node: true }).exec(function (r) {
          if (!r || !r[0]) return reject(new Error("Canvas not found"));
          var c = r[0].node, ctx = c.getContext("2d"), img = c.createImage();
          img.onload = function () {
            var maxSide = 3000;
            var sc = Math.min(maxSide / sw, maxSide / sh, 1);
            var ow = Math.round(sw * sc), oh = Math.round(sh * sc);
            c.width = ow; c.height = oh;
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
            wx.canvasToTempFilePath({
              canvas: c, x: 0, y: 0, width: ow, height: oh, destWidth: ow, destHeight: oh,
              fileType: "jpg", quality: 0.95,
              success: function (r) { resolve({ tempFilePath: r.tempFilePath, width: ow, height: oh }); },
              fail: function () { reject(new Error("Canvas export failed")); },
            });
          };
          img.onerror = function () { reject(new Error("Image load failed")); };
          img.src = self.properties.src;
        });
      });
    },
  },
});
