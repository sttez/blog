---
title: "MVP 完整流程搭建"
published: 2026-04-16
tags: [Flutter, Dart, MVP, 产品设计]
category: 指南
project: Momentify
draft: false
description: "从选模板到保存到相册，五步走通核心用户流程"
author: sttez
sourceLink: "https://github.com/sttez/Momentify"
---

# MVP 完整流程搭建

## 用户旅程

Momentify 的核心流程只有五步：

1. **浏览模板库**：按分类筛选，选择一个喜欢的模板
2. **选择图片**：从相册中选择对应数量的照片
3. **编辑调整**：拖拽位置、应用滤镜、添加文字和贴纸
4. **预览导出**：查看整图或九宫格效果
5. **保存到相册**：一键导出高清 PNG

## 页面串联

五个步骤对应五个页面，通过 GoRouter 串联：

```
HomePage → PickerPage → EditorPage → ExportPage
                ↓
            MarkerPage（仅 3D 模板）
                ↓
            EditorPage
```

页面间的数据传递全部通过 Riverpod Provider 完成：

- HomePage 写入 `selectedTemplateProvider`
- PickerPage 读取模板约束，写入 `selectedImagesProvider`
- EditorPage 读取所有 Provider，组合渲染
- ExportPage 读取 `exportedImageProvider` 展示结果

## MVP 之外的取舍

MVP 阶段做了以下取舍：

| 做了 | 没做 |
|------|------|
| 18 套硬编码模板 | 服务端动态模板加载 |
| 本地图片编辑 | 云存储和同步 |
| 6 种滤镜 | 自定义滤镜调节 |
| 48 个 emoji 贴纸 | 自定义贴纸上传 |
| 保存到相册 | 直接分享到微信 |

没做的部分不是不能做，而是 MVP 应该先验证核心需求——用户是否真的需要一个朋友圈美化工具。

## 性能考虑

MVP 阶段的性能目标是**不卡顿**。具体指标：

- 首页模板列表加载 < 500ms
- 编辑页拖拽响应 < 16ms（60fps）
- 导出一张 1080×1080 图片 < 3s

目前用 18 套静态模板 + 本地图片处理，这三个指标都能达到。后续加动态模板时需要关注网络加载的影响。
