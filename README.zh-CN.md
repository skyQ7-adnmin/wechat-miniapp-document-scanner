# 微信小程序文档扫描工具

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-0.1.0-green)](CHANGELOG.md)

轻量级、离线运行的微信小程序文档裁剪工具。

**功能**：拍照后尝试检测文档边界，允许手动调整裁剪框，保存干净的长方形裁剪图。

**不是**：OCR 工具。不进行文字识别、透视矫正或云端处理。

---

## v0.1.0 功能

- **默认5%内缩框** — 无需检测也能立即裁剪
- **720px缩略图分析** — 对缩小版图像进行快速分析
- **手动调整** — 拖角、拖边或整体平移裁剪框
- **自动检测超时回退** — 检测超时自动退回默认框
- **用户调整优先** — 一旦手动移动裁框，自动检测不会覆盖
- **单页/多页** — 支持拍摄一页或多页
- **Canvas导出** — 最大3000px裁剪图像输出

---

## 快速接入

### 1. 复制组件

将 `miniprogram-component/document-cropper/` 复制到你的小程序项目中

### 2. 注册组件

```json
{
  "usingComponents": {
    "document-cropper": "/components/document-cropper/index"
  }
}
```

### 3. 使用

```xml
<document-cropper
  id="cropper"
  src="{{imagePath}}"
  imageInfo="{{imageInfo}}"
  bind:ready="onReady"
  bind:crop="onCrop"
/>
<button bindtap="exportCrop">导出裁剪</button>
```

```js
Page({
  data: { imagePath: "", imageInfo: null },
  chooseImage() {
    wx.chooseImage({
      count: 1, sizeType: ["original"], sourceType: ["album", "camera"],
      success: (res) => {
        wx.getImageInfo({
          src: res.tempFilePaths[0],
          success: (info) => this.setData({ imagePath: res.tempFilePaths[0], imageInfo: info })
        });
      }
    });
  },
  onCrop(e) { this.cropPoints = e.detail.points; },
  exportCrop() {
    this.selectComponent("#cropper").exportCrop().then(({tempFilePath}) => {
      console.log("裁剪完成:", tempFilePath);
    });
  }
});
```

---

## 组件 API

| Properties | 类型 | 默认 | 说明 |
|-----------|------|------|------|
| `src` | String | `""` | 图片临时文件路径 |
| `imageInfo` | Object | `null` | `{width, height}`，来自 `wx.getImageInfo` |
| `cropPoints` | Array | `null` | 覆盖默认裁剪点 `[{x,y}*4]` |

| Events | detail | 说明 |
|--------|--------|------|
| `ready` | `{}` | 组件初始化完成 |
| `detectstart` | `{}` | 边界检测开始 |
| `detectcomplete` | `{points,confidence}` | 检测完成 |
| `detectfallback` | `{reason}` | 检测回退到默认框 |
| `change` | `{points}` | 裁剪框拖动中 |
| `crop` | `{points}` | 拖动结束，裁剪框确认 |
| `error` | `{message}` | 错误信息 |

| Methods | 返回 | 说明 |
|---------|------|------|
| `getPoints()` | `[{x,y}*4]` | 获取当前裁剪点 |
| `setPoints(points)` | — | 设置裁剪点 |
| `exportCrop()` | `Promise<{tempFilePath}>` | 导出裁剪图片 |

---

## 演示项目

目录 `examples/wechat-miniprogram-demo/` 包含一个可独立运行的最小示例：

1. 在微信开发者工具中新建项目
2. 将目录指向 `examples/wechat-miniprogram-demo/`
3. 将 `project.config.json` 中的 `appid` 替换为你自己的 AppID
4. 导入后即可运行

演示包括单页和多页流程：选择图片 → 裁剪 → 导出结果。

---

## 已知限制

- **仅外接矩形裁剪** — v0.1.0 不包含透视矫正
- **不持续处理相机帧** — 不使用 `onCameraFrame`
- **检测精度有限** — 复杂背景可能需要人工调整
- **非专业扫描 SDK** — 不能替代 Adobe Scan 等专业工具

---

## 隐私

所有处理在设备本地完成。不会向任何服务器发送任何图像数据。

---

## License

MIT — 见 [LICENSE](LICENSE)
