Page({
  data: {
    src: "",
    imageInfo: null,
    croppedSrc: "",
    exportStatus: "",
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
              exportStatus: "",
            });
          },
          fail: function () {
            wx.showToast({ title: "Failed to load image", icon: "none" });
          },
        });
      },
    });
  },

  onCropReady: function () {},
  onCrop: function (e) {},

  exportCrop: function () {
    var self = this;
    var cropper = self.selectComponent("#cropper");

    if (!cropper) {
      self.setData({ exportStatus: "ERROR: component not found" });
      wx.showToast({ title: "Cropper not found", icon: "none" });
      return;
    }

    if (typeof cropper.exportCrop !== "function") {
      self.setData({ exportStatus: "ERROR: exportCrop not a function" });
      wx.showToast({ title: "Export unavailable", icon: "none" });
      return;
    }

    self.setData({ exportStatus: "Exporting..." });
    wx.showLoading({ title: "Exporting..." });

    Promise.resolve(cropper.exportCrop()).then(function (result) {
      wx.hideLoading();
      if (result && result.tempFilePath) {
        self.setData({ croppedSrc: result.tempFilePath, exportStatus: "OK: " + result.width + "x" + result.height });
      } else {
        self.setData({ exportStatus: "ERROR: no tempFilePath" });
      }
    }).catch(function (err) {
      wx.hideLoading();
      var msg = String(err && err.message ? err.message : err);
      self.setData({ exportStatus: "ERROR: " + msg });
      wx.showToast({ title: msg, icon: "none" });
    });
  },
});
