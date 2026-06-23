Page({
  data: {
    mode: "single",
    src: "",
    imageInfo: null,
    croppedSrc: "",
    exportMsg: "",
    pages: [],
    currentIndex: 0,
  },

  chooseImage: function () {
    var self = this;
    wx.chooseImage({
      count: 1, sizeType: ["original"], sourceType: ["album"],
      success: function (res) {
        var path = res.tempFilePaths[0];
        wx.getImageInfo({
          src: path,
          success: function (info) {
            self.setData({
              src: path,
              imageInfo: { width: Number(info.width), height: Number(info.height) },
              croppedSrc: "",
              exportMsg: "",
            });
          },
          fail: function () { wx.showToast({ title: "Image info failed", icon: "none" }); },
        });
      },
    });
  },

  switchMode: function (e) {
    var m = e.currentTarget.dataset.mode;
    this.setData({ mode: m, pages: [], currentIndex: 0, src: "", imageInfo: null, croppedSrc: "", exportMsg: "" });
  },

  addPage: function () {
    var self = this;
    if (!self.data.src) { wx.showToast({ title: "Choose image first", icon: "none" }); return; }
    var cropper = self.selectComponent("#cropper");
    var pts = cropper ? cropper.getPoints() : [];
    var pages = self.data.pages.concat([{
      src: self.data.src,
      imageInfo: self.data.imageInfo,
      cropPoints: pts,
      croppedPath: "",
    }]);
    self.setData({ pages: pages, currentIndex: pages.length - 1 });
    wx.showToast({ title: "Page " + pages.length + " added", icon: "success" });
  },

  selectPage: function (e) {
    var idx = Number(e.currentTarget.dataset.index);
    if (isNaN(idx)) return;
    var p = this.data.pages[idx];
    if (!p) return;
    this.setData({
      currentIndex: idx,
      src: p.src,
      imageInfo: p.imageInfo,
      croppedSrc: p.croppedPath || "",
      exportMsg: "",
    });
  },

  deletePage: function (e) {
    var idx = Number(e.currentTarget.dataset.index);
    if (isNaN(idx)) return;
    var pages = this.data.pages.filter(function (_, i) { return i !== idx; });
    var newIdx = Math.min(this.data.currentIndex, Math.max(0, pages.length - 1));
    this.setData({ pages: pages, currentIndex: newIdx });
    if (pages.length === 0) {
      this.setData({ src: "", imageInfo: null, croppedSrc: "", exportMsg: "" });
    } else {
      var p = pages[newIdx];
      this.setData({ src: p.src, imageInfo: p.imageInfo, croppedSrc: p.croppedPath || "", exportMsg: "" });
    }
  },

  _exportOne: function (cropper) {
    var self = this;
    if (!cropper) return Promise.reject(new Error("Component not found"));
    if (typeof cropper.exportCrop !== "function") return Promise.reject(new Error("exportCrop unavailable"));
    return Promise.resolve(cropper.exportCrop()).then(function (r) {
      if (!r || !r.tempFilePath) throw new Error("No output file");
      return r;
    });
  },

  exportCurrent: function () {
    var self = this;
    var cropper = self.selectComponent("#cropper");
    self.setData({ exportMsg: "Exporting..." });
    wx.showLoading({ title: "Exporting..." });
    self._exportOne(cropper).then(function (r) {
      wx.hideLoading();
      self.setData({ croppedSrc: r.tempFilePath, exportMsg: "OK " + r.width + "x" + r.height });
      wx.showToast({ title: "Exported", icon: "success" });
      if (self.data.mode === "multi" && self.data.pages.length > 0) {
        var idx = self.data.currentIndex;
        var pages = self.data.pages.slice();
        pages[idx] = pages[idx] || {};
        pages[idx].croppedPath = r.tempFilePath;
        self.setData({ pages: pages });
      }
    }).catch(function (err) {
      wx.hideLoading();
      var msg = String(err && err.message ? err.message : err);
      self.setData({ exportMsg: "ERR: " + msg });
      wx.showToast({ title: msg, icon: "none" });
    });
  },

  exportAll: function () {
    var self = this;
    if (self.data.pages.length === 0) { wx.showToast({ title: "No pages", icon: "none" }); return; }
    self.setData({ exportMsg: "Exporting all " + self.data.pages.length + "..." });
    wx.showLoading({ title: "Exporting..." });

    var pages = self.data.pages.slice();
    var results = [];
    var i = 0;

    function next() {
      if (i >= pages.length) {
        wx.hideLoading();
        self.setData({ pages: pages, exportMsg: "Exported " + results.length + " page(s)" });
        wx.showToast({ title: results.length + " exported", icon: "success" });
        return;
      }
      var p = pages[i];
      // Set current page and wait for component to update
      self.setData({
        currentIndex: i, src: p.src, imageInfo: p.imageInfo, croppedSrc: "",
      }, function () {
        // Wait for component to initialize
        setTimeout(function () {
          var cropper = self.selectComponent("#cropper");
          if (!cropper) { i++; next(); return; }
          cropper.exportCrop().then(function (r) {
            pages[i].croppedPath = r.tempFilePath;
            results.push(r);
            i++;
            next();
          }).catch(function () {
            i++;
            next();
          });
        }, 400);
      });
    }
    next();
  },
});
