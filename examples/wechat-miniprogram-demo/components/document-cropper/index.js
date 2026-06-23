/**
 * document-cropper — minimal debug version.
 * Fixed red crop box, no auto-detect, no complex mapping.
 * All positions use container-relative pixel values pre-computed in JS.
 */
Component({
  properties: {
    src: { type: String, value: "" },
    imageInfo: { type: Object, value: null },
  },

  data: {
    debugFixedCrop: true,
    ready: false,
    diag: "",
    cropLeft: 0, cropTop: 0, cropW: 0, cropH: 0,
    overlayVisible: false,
  },

  lifetimes: {
    attached() {
      this._ip = null;               // image points (original coords)
      this._cr = null;               // container rect (page coords)
      this._dr = null;               // display rect (container-relative)
      this._ds = null;               // drag start touch
      this._dspts = null;            // drag start points
      this._ua = false;              // user adjusted
    },
  },

  observers: {
    "src,imageInfo"(s, info) {
      if (!s || !info || !info.width || !info.height) return;
      this._ua = false;
      this._init();
    },
  },

  methods: {
    /* ---- helpers ---- */
    _d(label, data) {
      this.setData({ diag: (this.data.diag || "") + label + ": " + JSON.stringify(data) + "\n" });
    },

    _sp(pts) {
      if (!Array.isArray(pts)) return [];
      return pts.map(function (p) { return { x: Number(p.x || 0), y: Number(p.y || 0) }; });
    },

    /* ---- init ---- */
    _init() {
      var self = this, info = this.properties.imageInfo;
      self._d("image", info.width + "x" + info.height);

      // Wait for container layout
      function measure() {
        var q = self.createSelectorQuery();
        q.select(".crop-stage").boundingClientRect(function (r) {
          if (r && r.width > 0 && r.height > 0) {
            self._cr = r;
            self._d("container", Math.round(r.width) + "x" + Math.round(r.height));
            self._showFixedCrop();
            return;
          }
          setTimeout(measure, 80);
        });
        q.exec();
      }
      setTimeout(measure, 100);
    },

    /* ---- fixed crop ---- */
    _showFixedCrop() {
      var info = this.properties.imageInfo, cr = this._cr;
      if (!info || !cr) return;

      // Compute aspect-fit display rect (container-relative)
      var sc = Math.min(cr.width / info.width, cr.height / info.height);
      var dw = info.width * sc, dh = info.height * sc;
      var dx = (cr.width - dw) / 2, dy = (cr.height - dh) / 2;
      this._dr = { x: dx, y: dy, w: dw, h: dh };
      this._d("display", Math.round(dw) + "x" + Math.round(dh) + " @ " + Math.round(dx) + "," + Math.round(dy));

      // 10% inset crop box inside display rect
      var m = 0.1;
      var cl = dx + dw * m, ct = dy + dh * m;
      var cw = dw * (1 - 2 * m), ch = dh * (1 - 2 * m);

      // Save image points for export
      this._ip = [
        { x: info.width * m, y: info.height * m },
        { x: info.width * (1 - m), y: info.height * m },
        { x: info.width * (1 - m), y: info.height * (1 - m) },
        { x: info.width * m, y: info.height * (1 - m) },
      ];

      this.setData({
        ready: true,
        overlayVisible: true,
        cropLeft: Math.round(cl),
        cropTop: Math.round(ct),
        cropW: Math.round(cw),
        cropH: Math.round(ch),
      });
      this._d("crop", Math.round(cl) + "," + Math.round(ct) + " " + Math.round(cw) + "x" + Math.round(ch));
      this.triggerEvent("ready", {});
    },

    /* ---- drag ---- */
    _toImage(dx, dy) {
      var info = this.properties.imageInfo, dr = this._dr;
      return { x: dx * info.width / dr.w, y: dy * info.height / dr.h };
    },

    _fromImage(ip) {
      var info = this.properties.imageInfo, dr = this._dr;
      return {
        x: dr.x + (ip.x / info.width) * dr.w,
        y: dr.y + (ip.y / info.height) * dr.h,
      };
    },

    _syncFromImage() {
      if (!this._ip || this._ip.length !== 4) return;
      var tl = this._fromImage(this._ip[0]), br = this._fromImage(this._ip[2]);
      this.setData({
        cropLeft: Math.round(Math.min(tl.x, br.x)),
        cropTop: Math.round(Math.min(tl.y, br.y)),
        cropW: Math.round(Math.abs(br.x - tl.x)),
        cropH: Math.round(Math.abs(br.y - tl.y)),
      });
    },

    onCropTouchStart(e) {
      var t = e.touches[0];
      this._ds = { x: t.clientX, y: t.clientY };
      this._dspts = this._sp(this._ip || []);
      this._ua = true;
    },

    onCropTouchMove(e) {
      if (!this._ds || !this._dr) return;
      var t = e.touches[0];
      var ddx = t.clientX - this._ds.x, ddy = t.clientY - this._ds.y;
      var id = this._toImage(ddx, ddy);

      var pts = this._sp(this._dspts || []);
      pts = pts.map(function (p) { return { x: p.x + id.x, y: p.y + id.y }; });

      // Clamp
      var info = this.properties.imageInfo, m = Math.max(8, Math.min(info.width, info.height) * 0.015);
      pts = pts.map(function (p) { return { x: Math.max(m, Math.min(info.width - m, p.x)), y: Math.max(m, Math.min(info.height - m, p.y)) }; });

      // Keep within bounds
      var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
      var ox = Math.min.apply(null, xs) < m ? m - Math.min.apply(null, xs) : Math.max.apply(null, xs) > info.width - m ? (info.width - m) - Math.max.apply(null, xs) : 0;
      var oy = Math.min.apply(null, ys) < m ? m - Math.min.apply(null, ys) : Math.max.apply(null, ys) > info.height - m ? (info.height - m) - Math.max.apply(null, ys) : 0;
      if (ox || oy) pts = pts.map(function (p) { return { x: p.x + ox, y: p.y + oy }; });

      this._ip = pts;
      this._syncFromImage();
      this.triggerEvent("crop", { points: this._sp(this._ip) });
    },

    onCropTouchEnd() {
      this._ds = null;
      this.triggerEvent("crop", { points: this._sp(this._ip || []) });
    },

    /* ---- corner drag ---- */
    onCornerStart(e) {
      var idx = Number(e.currentTarget.dataset.index);
      if (isNaN(idx)) return;
      var t = e.touches[0];
      this._ds = { x: t.clientX, y: t.clientY };
      this._dspts = this._sp(this._ip || []);
      this._cornerIdx = idx;
      this._ua = true;
    },

    onCornerMove(e) {
      if (!this._ds || !this._dr) return;
      var t = e.touches[0];
      var id = this._toImage(t.clientX - this._ds.x, t.clientY - this._ds.y);
      var idx = this._cornerIdx;
      if (idx == null) return;

      var pts = this._sp(this._dspts || []);
      pts[idx] = { x: pts[idx].x + id.x, y: pts[idx].y + id.y };

      var info = this.properties.imageInfo, m = Math.max(8, Math.min(info.width, info.height) * 0.015);
      pts = pts.map(function (p) { return { x: Math.max(m, Math.min(info.width - m, p.x)), y: Math.max(m, Math.min(info.height - m, p.y)) }; });

      this._ip = pts;
      this._syncFromImage();
      this.triggerEvent("crop", { points: this._sp(this._ip) });
    },

    onCornerEnd() {
      this._ds = null; this._cornerIdx = null;
      this.triggerEvent("crop", { points: this._sp(this._ip || []) });
    },

    /* ---- public ---- */
    getPoints() { return this._sp(this._ip || []); },

    exportCrop() {
      var self = this;
      if (!self._ip || self._ip.length !== 4) {
        return Promise.reject(new Error("No crop points"));
      }
      var b = {
        x: Math.round(Math.min.apply(null, self._ip.map(function (p) { return p.x; }))),
        y: Math.round(Math.min.apply(null, self._ip.map(function (p) { return p.y; }))),
        w: Math.round(Math.max.apply(null, self._ip.map(function (p) { return p.x; })) - Math.min.apply(null, self._ip.map(function (p) { return p.x; }))),
        h: Math.round(Math.max.apply(null, self._ip.map(function (p) { return p.y; })) - Math.min.apply(null, self._ip.map(function (p) { return p.y; }))),
      };
      return new Promise(function (res, rej) {
        var q = self.createSelectorQuery();
        q.select("#cropCanvas").fields({ node: true }).exec(function (r) {
          if (!r || !r[0]) return rej(new Error("Canvas not found"));
          var c = r[0].node, ctx = c.getContext("2d"), img = c.createImage();
          img.onload = function () {
            var sc = Math.min(3000 / b.w, 3000 / b.h, 1), ow = Math.round(b.w * sc), oh = Math.round(b.h * sc);
            c.width = ow; c.height = oh;
            ctx.drawImage(img, b.x, b.y, b.w, b.h, 0, 0, ow, oh);
            wx.canvasToTempFilePath({
              canvas: c, x: 0, y: 0, width: ow, height: oh, destWidth: ow, destHeight: oh,
              fileType: "jpg", quality: 0.95,
              success: function (r) { res({ tempFilePath: r.tempFilePath, width: ow, height: oh }); },
              fail: function () { rej(new Error("Export failed")); },
            });
          };
          img.onerror = function () { rej(new Error("Image load failed")); };
          img.src = self.properties.src;
        });
      });
    },
  },
});
