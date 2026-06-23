/**
 * document-cropper component v0.1.0
 * All WXML style strings are pre-computed in JS.
 * No calc(), no arithmetic in WXML bindings.
 */

Component({
  properties: {
    src: { type: String, value: "" },
    imageInfo: { type: Object, value: null },
    cropPoints: { type: Array, value: null, observer: "_cropPointsObserver" },
  },

  data: {
    showOverlay: false,
    cropLines: { topStyle: "", bottomStyle: "", leftStyle: "", rightStyle: "" },
    cornerStyles: [],
    edgeStyles: [],
    cropRect: { moveStyle: "" },
    dragMode: "",
    dragIndex: -1,
  },

  lifetimes: {
    attached() {
      this._p = true;
      this._ds = null; this._ip = null; this._dr = null;
      this._ua = false; this._ld = 0; this._rt = 0; this._tid = Math.random();
    },
    detached() { this._p = false; },
  },

  observers: {
    "src,imageInfo"(s, info) {
      if (s && info && info.width > 0 && info.height > 0) {
        this._ua = false; this._rt = 0; this._tid = Math.random();
        this._init();
      }
    },
  },

  methods: {
    /* ---------- serialization ---------- */
    _sp(pts) { return Array.isArray(pts) ? pts.map(function (p) { return { x: Number(p.x || 0), y: Number(p.y || 0) }; }) : []; },
    _em(msg) { this.triggerEvent("error", { message: String(msg || "?") }); },
    _dbg(l, d) { if (typeof __wxConfig === "undefined" || __wxConfig.envVersion !== "release") console.log("[crop]", l, d || ""); },

    _px(v) { return Math.round(v) + "px"; },

    /* ---------- init ---------- */
    _cropPointsObserver(pts) { if (pts && pts.length === 4 && this._ip) { this._ip = this._sp(pts); this._draw(); } },

    _init() {
      var self = this, info = this.properties.imageInfo, src = this.properties.src;
      if (!src || !info || !info.width || !info.height) return;
      var m = 0.05;
      self._ip = [
        { x: info.width * m, y: info.height * m },
        { x: info.width * (1 - m), y: info.height * m },
        { x: info.width * (1 - m), y: info.height * (1 - m) },
        { x: info.width * m, y: info.height * (1 - m) },
      ];
      self._ua = false;
      self._dbg("init pts", JSON.stringify(self._ip[0]));
      self._waitContainer();
    },

    _waitContainer() {
      var self = this, max = 10;
      function tryR() {
        if (!self._p) return;
        var q = self.createSelectorQuery();
        q.select(".cropper-container").boundingClientRect(function (r) {
          if (r && r.width > 0) { self._cr = r; self._dbg("rect", r.width + "x" + r.height); self._draw(); self._triggerReady(); return; }
          self._rt++; if (self._rt < max) setTimeout(tryR, 60); else self._em("Container measure failed");
        }); q.exec();
      }
      setTimeout(tryR, 60);
    },

    _triggerReady() { this.triggerEvent("ready", {}); },

    /* ---------- display ---------- */
    _calcDR() {
      var info = this.properties.imageInfo, cr = this._cr;
      if (!info || !cr) return null;
      var sc = Math.min(cr.width / info.width, cr.height / info.height),
        w = info.width * sc, h = info.height * sc;
      return { x: cr.x + (cr.width - w) / 2, y: cr.y + (cr.height - h) / 2, w: w, h: h };
    },

    _map2d(pts, dr) {
      var info = this.properties.imageInfo;
      if (!pts || !dr || !info) return [];
      return pts.map(function (p) { return { x: dr.x + (p.x / info.width) * dr.w, y: dr.y + (p.y / info.height) * dr.h }; });
    },

    _draw() {
      var dr = this._calcDR(), ip = this._ip;
      if (!dr || !ip || ip.length !== 4) return;
      this._dr = dr;
      var dp = this._map2d(ip, dr);
      var tl = dp[0], tr = dp[1], br = dp[2], bl = dp[3];

      var xmn = Math.min(tl.x, bl.x), xmx = Math.max(tr.x, br.x),
        ymn = Math.min(tl.y, tr.y), ymx = Math.max(bl.y, br.y);

      // crop lines
      var ls = {
        topStyle: "left:" + this._px(xmn - cr.x) + ";top:" + this._px(ymn - cr.y) + ";width:" + this._px(xmx - xmn),
        bottomStyle: "left:" + this._px(xmn - cr.x) + ";top:" + this._px(ymx - cr.y) + ";width:" + this._px(xmx - xmn),
        leftStyle: "left:" + this._px(xmn - cr.x) + ";top:" + this._px(ymn - cr.y) + ";height:" + this._px(ymx - ymn),
        rightStyle: "left:" + this._px(xmx - cr.x) + ";top:" + this._px(ymn - cr.y) + ";height:" + this._px(ymx - ymn),
      };

      // corner styles
      var cs = [tl, tr, br, bl].map(function (p) {
        return "left:" + this._px(p.x - cr.x) + ";top:" + this._px(p.y - cr.y);
      }, this);

      // edge styles (top row center, bottom row center, left col center, right col center)
      var es = [
        "left:" + this._px((tl.x + tr.x) / 2 - cr.x) + ";top:" + this._px(tl.y - cr.y) + ";width:" + this._px(tr.x - tl.x) + ";height:" + "44px",
        "left:" + this._px((bl.x + br.x) / 2 - cr.x) + ";top:" + this._px(bl.y - cr.y) + ";width:" + this._px(br.x - bl.x) + ";height:" + "44px",
        "left:" + this._px(tl.x - cr.x) + ";top:" + this._px((tl.y + bl.y) / 2 - cr.y) + ";width:" + "44px;height:" + this._px(bl.y - tl.y),
        "left:" + this._px(tr.x - cr.x) + ";top:" + this._px((tr.y + br.y) / 2 - cr.y) + ";width:" + "44px;height:" + this._px(br.y - tr.y),
      ];

      var cr = this._cr;
      this.setData({
        showOverlay: true,
        cropLines: ls,
        cornerStyles: cs,
        edgeStyles: es,
        cropRect: { moveStyle: "left:" + this._px(xmn - cr.x) + ";top:" + this._px(ymn - cr.y) + ";width:" + this._px(xmx - xmn) + ";height:" + this._px(ymx - ymn) },
      });
    },

    /* ---------- drag ---------- */
    onTouchStart(e) {
      var m = e.currentTarget.dataset.mode || "move";
      var idx = Number(e.currentTarget.dataset.index);
      var t = e.touches[0];
      this._ds = { x: t.clientX, y: t.clientY };
      this._dpts = this._sp(this._ip || []);
      this._ua = true;
      this.setData({ dragMode: m, dragIndex: idx >= 0 ? idx : -1 });
    },

    onTouchMove(e) {
      if (!this._ds || !this._dr) return;
      var t = e.touches[0], n = Date.now();
      if (n - (this._ld || 0) < 16) { this._ld = n; return; }
      this._ld = n;
      var info = this.properties.imageInfo;
      var idx = (this._dr.w / info.width) || 1, idy = (this._dr.h / info.height) || 1;
      var ddx = (t.clientX - this._ds.x) / idx, ddy = (t.clientY - this._ds.y) / idy;

      var pts = this._sp(this._dpts || []);
      var m = this.data.dragMode, ix = this.data.dragIndex;

      if (m === "corner" && ix >= 0) {
        pts[ix] = { x: pts[ix].x + ddx, y: pts[ix].y + ddy };
      } else if (m === "edge") {
        if (ix === 0) { pts[0].y += ddy; pts[1].y += ddy; }
        else if (ix === 1) { pts[2].y += ddy; pts[3].y += ddy; }
        else if (ix === 2) { pts[0].x += ddx; pts[2].x += ddx; }
        else if (ix === 3) { pts[1].x += ddx; pts[3].x += ddx; }
      } else {
        pts = pts.map(function (p) { return { x: p.x + ddx, y: p.y + ddy }; });
        var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
        var ox = Math.min.apply(null, xs) < 0 ? -Math.min.apply(null, xs) : Math.max.apply(null, xs) > info.width ? info.width - Math.max.apply(null, xs) : 0;
        var oy = Math.min.apply(null, ys) < 0 ? -Math.min.apply(null, ys) : Math.max.apply(null, ys) > info.height ? info.height - Math.max.apply(null, ys) : 0;
        if (ox || oy) pts = pts.map(function (p) { return { x: p.x + ox, y: p.y + oy }; });
      }
      this._ip = this._cstr(pts);
      this._draw();
      this.triggerEvent("change", { points: this._sp(this._ip) });
    },

    onTouchEnd() {
      this._ds = null;
      this.setData({ dragMode: "", dragIndex: -1 });
      if (this._ip) this.triggerEvent("crop", { points: this._sp(this._ip) });
    },

    _cstr(pts) {
      var info = this.properties.imageInfo;
      var m = Math.max(8, Math.min(info.width, info.height) * 0.015);
      return pts.map(function (p) { return { x: Math.max(m, Math.min(info.width - m, p.x)), y: Math.max(m, Math.min(info.height - m, p.y)) }; });
    },

    /* ---------- public ---------- */
    getPoints() { return this._sp(this._ip || []); },
    setPoints(p) { this._ip = this._sp(p); this._draw(); },

    exportCrop() {
      if (this._ip && this._ip.length === 4) {
        var b = {
          x: Math.round(Math.min.apply(null, this._ip.map(function (p) { return p.x; }))),
          y: Math.round(Math.min.apply(null, this._ip.map(function (p) { return p.y; }))),
          w: Math.round(Math.max.apply(null, this._ip.map(function (p) { return p.x; })) - Math.min.apply(null, this._ip.map(function (p) { return p.x; }))),
          h: Math.round(Math.max.apply(null, this._ip.map(function (p) { return p.y; })) - Math.min.apply(null, this._ip.map(function (p) { return p.y; }))),
        };
        var self = this;
        return new Promise(function (res, rej) {
          var q = self.createSelectorQuery();
          q.select("#cropCanvas").fields({ node: true }).exec(function (r) {
            if (!r || !r[0]) { self._em("Canvas not found"); return rej(new Error("Canvas not found")); }
            var c = r[0].node, ctx = c.getContext("2d"), img = c.createImage();
            img.onload = function () {
              var sc = Math.min(3000 / b.w, 3000 / b.h, 1), ow = Math.round(b.w * sc), oh = Math.round(b.h * sc);
              c.width = ow; c.height = oh;
              ctx.drawImage(img, b.x, b.y, b.w, b.h, 0, 0, ow, oh);
              wx.canvasToTempFilePath({
                canvas: c, x: 0, y: 0, width: ow, height: oh, destWidth: ow, destHeight: oh, fileType: "jpg", quality: 0.95,
                success: function (r) { res({ tempFilePath: r.tempFilePath, width: ow, height: oh }); },
                fail: function () { self._em("Export failed"); rej(new Error("Export failed")); },
              });
            };
            img.onerror = function () { self._em("Image load failed"); rej(new Error("Image load failed")); };
            img.src = self.properties.src;
          });
        });
      }
      this._em("No crop points");
      return Promise.reject(new Error("No crop points"));
    },
  },
});
