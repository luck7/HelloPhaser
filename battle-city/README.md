# Battle City · 坦克大战

> 使用 Phaser 3 重制的经典坦克大战（Battle City）游戏。

---

## 📖 项目简介

Battle City（坦克大战）是一款由 Namco 于 1985 年发布的经典多方向射击游戏。本项目使用 **Phaser 3.88.2** 游戏引擎进行重制，基于纯前端 HTML5 + JavaScript 实现，无需构建工具即可运行。

玩家需要控制一辆坦克，保护己方基地（老鹰）免受敌方坦克攻击，同时消灭所有敌军坦克即可通关。

---

## 🎮 游戏特性（Roadmap）

- [ ] **玩家坦克**：WASD / 方向键移动，空格键射击
- [ ] **敌方坦克 AI**：普通坦克、快速坦克、装甲坦克
- [ ] **可摧毁地图**：砖墙、钢墙、草地、水域、基地
- [ ] **关卡系统**：多关卡地图切换，敌军波次生成
- [ ] **道具系统**：星形（火力升级）、铲子（加固基地）、炸弹（清屏）等
- [ ] **UI/HUD**：剩余生命、关卡号、剩余敌军数量
- [ ] **音效与 BGM**：射击、爆炸、关卡开始等音效

---

## 🛠 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| [Phaser](https://phaser.io/) | 3.88.2 | 2D HTML5 游戏引擎 |
| JavaScript | ES6+ | 核心编程语言 |
| HTML5 Canvas / WebGL | — | Phaser.AUTO 自动选择渲染器 |
| Phaser Editor | 1.1.2 | 可视化编辑器（可选） |

---

## 📁 目录结构

```
battle-city/
├── index.html              # 游戏入口页面
├── phaser.min.js           # Phaser 3 引擎库（本地引用）
├── project.config          # Phaser Editor 项目配置
├── .gitignore              # Git 忽略规则
├── README.md               # 本文件
├── CHANGELOG.md            # 变更日志
├── AGENTS.md               # AI Agent 协作指南
├── thumbnail.png           # 编辑器缩略图
└── src/
    ├── main.js             # 游戏配置与启动入口
    └── scenes/             # Phaser 场景模块
        ├── Boot.js         # 启动场景：一次性全局初始化
        ├── Preloader.js    # 预加载场景：资源加载 + 进度条
        ├── MainMenu.js     # 主菜单场景：标题 + 开始入口
        └── Game.js         # 游戏场景：核心玩法逻辑
```

---

## 🚀 快速开始

### 方式一：直接打开（简单）

用浏览器直接打开项目根目录下的 `index.html` 文件即可开始游戏。

> 部分浏览器对本地 `file://` 协议有限制，若资源加载失败请使用方式二。

### 方式二：本地 HTTP 服务器（推荐）

任选一种启动本地静态服务器：

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# PHP
php -S localhost:8080
```

启动后访问：`http://localhost:8080`

---

## 🎯 场景流程

游戏采用标准的 Phaser 多场景架构，按以下顺序流转：

```
┌──────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐
│   Boot   │───▶│ Preloader  │───▶│ MainMenu   │───▶│   Game   │
│ 启动配置  │    │ 资源加载    │    │ 主菜单      │    │ 游戏主场景│
└──────────┘    └────────────┘    └────────────┘    └──────────┘
```

| 场景 | 键名 | 主要职责 |
|------|------|----------|
| Boot | `'Boot'` | 全局配置（音频策略、插件注册等） |
| Preloader | `'Preloader'` | 加载游戏资源，显示进度条 |
| MainMenu | `'MainMenu'` | 游戏标题、开始按钮、设置入口 |
| Game | `'Game'` | 坦克大战核心游戏逻辑 |

---

## ⌨️ 操作说明

| 按键 | 功能 |
|------|------|
| `W` / `↑` | 向上移动 |
| `S` / `↓` | 向下移动 |
| `A` / `←` | 向左移动 |
| `D` / `→` | 向右移动 |
| `Space` | 发射子弹 |
| `P` | 暂停/继续 |

> 后续将支持自定义按键与手柄。

---

## 🧩 开发指南

### 新增场景

1. 在 `src/scenes/` 下创建 `YourScene.js`，继承 `Phaser.Scene`
2. 在 `index.html` 中通过 `<script>` 标签引入
3. 在 `src/main.js` 的 `scene` 数组中注册场景类

### 新增资源

1. 将资源文件放入项目对应目录
2. 在 `Preloader.js` 的 `preload()` 中使用 `this.load.*` 加载
3. 在其他场景中通过资源键名引用

---

## 🐛 问题反馈

如遇到 Bug 或有功能建议，欢迎通过以下方式反馈：

1. 提交 Issue
2. 联系项目维护者

---

## 📄 许可协议

本项目仅供学习与研究使用。
Battle City 原版游戏版权归 Bandai Namco Entertainment Inc. 所有。
