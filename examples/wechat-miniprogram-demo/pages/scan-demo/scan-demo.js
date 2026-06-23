/**
 * scan-demo.js — Single & multi-page document scanning demo
 * No OCR, no server calls.
 */

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

  /* ---- Image selection ---- */

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ["original"],
      sourceType: ["album"],
      success: (res) => {
        const path = res.tempFilePaths[0];
        wx.getImageInfo({
          src: path,
          success: (info) => {
            this.setData({ currentSrc: path, currentImageInfo: info, croppedSrc: "", cropPoints: null });
          },
        });
      },
    });
  },

  /* ---- Crop events ---- */

  onCropperReady(e) {
    console.log("[cropper] ready");
  },

  onCropperCrop(e) {
    this.setData({ cropPoints: e.detail.points });
  },

  onCropperChange(e) {
    this.setData({ cropPoints: e.detail.points });
  },

  onDetectStart() {
    console.log("[detect] started");
  },

  onDetectComplete(e) {
    const { points, confidence } = e.detail;
    console.log(`[detect] complete, confidence: ${(confidence * 100).toFixed(0)}%`);
    this.setData({ cropPoints: points });
  },

  onDetectFallback(e) {
    console.log(`[detect] fallback: ${e.detail.reason}`);
  },

  /* ---- Export ---- */

  exportCropped() {
    const cropper = this.selectComponent("#cropper");
    if (!cropper) {
      wx.showToast({ title: "Cropper not ready", icon: "none" });
      return;
    }
    wx.showLoading({ title: "Exporting..." });
    cropper.exportCrop().then(({ tempFilePath }) => {
      wx.hideLoading();
      this.setData({ croppedSrc: tempFilePath });
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: "Export failed", icon: "none" });
      console.error(err);
    });
  },

  /* ---- Multi-page ---- */

  switchMode(e) {
    const m = e.currentTarget.dataset.mode;
    this.setData({ mode: m, pages: [], currentSrc: "", currentImageInfo: null, croppedSrc: "" });
  },

  addCurrentPage() {
    const { currentSrc, currentImageInfo } = this.data;
    if (!currentSrc) {
      wx.showToast({ title: "Select an image first", icon: "none" });
      return;
    }
    const pages = this.data.pages.concat([{ src: currentSrc, imageInfo: currentImageInfo }]);
    this.setData({ pages, currentIndex: pages.length - 1 });
  },

  finishMultiPage() {
    if (this.data.currentSrc) this.addCurrentPage();
    wx.showToast({ title: `${this.data.pages.length} page(s) captured`, icon: "success" });
  },

  selectPage(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (isNaN(idx)) return;
    const page = this.data.pages[idx];
    if (!page) return;
    this.setData({
      currentIndex: idx,
      currentSrc: page.src,
      currentImageInfo: page.imageInfo,
      croppedSrc: "",
      cropPoints: null,
    });
  },

  deletePage(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (isNaN(idx)) return;
    const pages = this.data.pages.filter((_, i) => i !== idx);
    this.setData({ pages, currentIndex: Math.min(this.data.currentIndex, pages.length - 1) });
    if (pages.length === 0) {
      this.setData({ currentSrc: "", currentImageInfo: null, croppedSrc: "" });
    }
  },
});
