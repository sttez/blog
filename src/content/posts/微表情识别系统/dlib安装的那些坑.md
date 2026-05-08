---
title: "dlib 安装的那些坑"
published: 2025-03-04
tags: [dlib, 安装问题, CMake, 踩坑, Python]
pinned: false
description: "dlib 需要 CMake 编译，Windows 上各种依赖缺失导致 pip install 一直失败的踩坑记录。"
category: 踩坑
project: 微表情识别系统
draft: false
author: sttez
---

# dlib 安装的那些坑

## 问题

项目依赖 dlib 做 68 点面部关键点提取，但 `pip install dlib` 在 Windows 上几乎必报错：

```
CMake must be installed to build dlib
```

或者更离谱的：

```
error: Microsoft Visual C++ 14.0 or greater is required
```

## 排查过程

dlib 不是一个纯 Python 包，它底层是 C++ 代码，需要编译后才能安装。这意味着你的机器上必须有：

1. **CMake**：dlib 的构建系统
2. **Visual Studio Build Tools**：C++ 编译器
3. **合适的 Python 版本**：dlib 对 Python 版本有要求

我先试了最简单的方法：

```bash
pip install dlib
```

直接报 CMake 找不到。装了 CMake 之后：

```bash
pip install cmake
pip install dlib
```

又报 Visual C++ 缺失。

## 解决方案

### 方法一：用预编译的 whl 文件（推荐）

去网上找对应 Python 版本的预编译 whl 文件，跳过本地编译：

```bash
# Python 3.10, Windows 64位
pip install dlib-19.22.99-cp310-cp310-win_amd64.whl
```

这是最快的方法，缺点是要找到匹配的版本。

### 方法二：conda 安装

如果用 Anaconda 环境，conda 可以直接安装预编译版本：

```bash
conda install -c conda-forge dlib
```

这也是我最终采用的方法。项目推荐的环境配置就是 conda：

```bash
conda create -n micro-expression python=3.10
conda activate micro-expression
conda install -c conda-forge dlib
pip install -r requirements.txt
```

### 方法三：从源码编译

如果实在找不到预编译版本，只能硬着头皮从源码编译：

1. 安装 Visual Studio Build Tools（勾选"使用 C++ 的桌面开发"）
2. 安装 CMake：`pip install cmake`
3. 克隆 dlib 仓库：`git clone https://github.com/davisking/dlib.git`
4. 在 dlib 目录下：`python setup.py install`

这一步可能要跑 10-30 分钟，期间会弹出各种 warning，只要没有 Error 就行。

## 形状预测器模型

装好 dlib 还没完，还需要下载预训练的 68 点形状预测器模型：

```
shape_predictor_68_face_landmarks.dat
```

这个文件约 100MB，放在 `utils/` 目录下。如果缺失，运行时会报 `FileNotFoundError`。

## 学到的教训

**有预编译版本就别自己编译。** Python 生态里 dlib 是出了名的难装，尤其是 Windows 环境。用 conda 或预编译 whl 文件是最省事的路线。

如果项目需要给别人部署，建议在 README 里明确写好环境配置步骤，最好提供一个 `environment.yml` 文件，避免别人踩同样的坑。
