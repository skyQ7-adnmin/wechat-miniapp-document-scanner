/**
 * scan-demo.js — Single & multi-page document scanning demo.
 * No OCR, no server calls.
 *
 * IMPORTANT: Only serializable data (string/number/boolean/null/plain objects/arrays)
 * is used in setData and passed to components. WeChat Mini Programs cannot clone
 * functions, Error, Canvas, Map, Set, or circular references across the bridge.
 */

/** Extract only serializable fields from wx.getImageInfo result */
function safeImageInfo(raw) {
  if (!raw) return null;
  return { width: Number(raw.width || 0), height: Number(raw.height || 0) };
}

Page({
  data: {
    mode: "single",
    pages: [],
    currentIndex: 0,
    currentSrc: "",
    currentImageInfo: null,
    croppedSrc: "",
    cropPoints: null,
  },

  chooseImage: function () {
    var self = this;
    wx.chooseImage({
      count: 1,
      sizeType: ["original"],
      sourceType: ["album"],
      success: function (res) {
        var path = res.tempFilePaths[0];
        wx.getImageInfo({
          src: path,
          success: function (rawInfo) {
            var info = safeImageInfo(rawInfo);
            self.setData({ currentSrc: path, currentImageInfo: info, croppedSrc: "", cropPoints: null });
          },
          fail: function () {
            wx.showToast({ title: "Failed to load image info", icon: "none" });
          },
        });
      },
    });
  },

  onCropperReady: function () {
    // ready — no detail needed
  },

  onCropperCrop: function (e) {
    if (e && e.detail && e.detail.points) {
      this.setData({ cropPoints: e.detail.points });
    }
  },

  onCropperChange: function (e) {
    if (e && e.detail && e.detail.points) {
      this.setData({ cropPoints: e.detail.points });
    }
  },

  onDetectStart: function () {},

  onDetectComplete: function (e) {
    if (e && e.detail && e.detail.points) {
      this.setData({ cropPoints: e.detail.points });
    }
  },

  onDetectFallback: function () {},

  onCropperError: function (e) {
    var msg = (e && e.detail && e.detail.message) ? e.detail.message : "Cropper error";
    console.error("[cropper error]", msg);
  },

  exportCropped: function () {
    var cropper = this.selectComponent("#cropper");
    if (!cropper) {
      wx.showToast({ title: "Cropper not ready", icon: "none" });
      return;
    }
    var self = this;
    wx.showLoading({ title: "Exporting..." });
    cropper.exportCrop().then(function (result) {
      wx.hideLoading();
      self.setData({ croppedSrc: result.tempFilePath });
    }).catch(function (err) {
      wx.hideLoading();
      wx.showToast({ title: "Export failed", icon: "none" });
      console.error(String(err && err.message ? err.message : err));
    });
  },

  switchMode: function (e) {
    var m = e.currentTarget.dataset.mode;
    this.setData({ mode: m, pages: [], currentSrc: "", currentImageInfo: null, croppedSrc: "" });
  },

  addCurrentPage: function () {
    var currentSrc = this.data.currentSrc;
    var currentImageInfo = this.data.currentImageInfo;
    if (!currentSrc) {
      wx.showToast({ title: "Select an image first", icon: "none" });
      return;
    }
    var pages = this.data.pages.concat([{ src: currentSrc, imageInfo: safeImageInfo(currentImageInfo) }]);
    this.setData({ pages: pages, currentIndex: pages.length - 1 });
  },

  finishMultiPage: function () {
    if (this.data.currentSrc) this.addCurrentPage();
    wx.showToast({ title: this.data.pages.length + " page(s) captured", icon: "success" });
  },

  selectPage: function (e) {
    var idx = Number(e.currentTarget.dataset.index);
    if (isNaN(idx)) return;
    var page = this.data.pages[idx];
    if (!page) return;
    this.setData({
      currentIndex: idx,
      currentSrc: page.src,
      currentImageInfo: safeImageInfo(page.imageInfo),
      croppedSrc: "",
      cropPoints: null,
    });
  },

  deletePage: function (e) {
    var idx = Number(e.currentTarget.dataset.index);
    if (isNaN(idx)) return;
    var pages = this.data.pages.filter(function (_, i) { return i !== idx; });
    this.setData({ pages: pages, currentIndex: Math.min(this.data.currentIndex, pages.length - 1) });
    if (pages.length === 0) {
      this.setData({ currentSrc: "", currentImageInfo: null, croppedSrc: "" });
    }
  },
});
