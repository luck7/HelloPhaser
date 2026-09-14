# AGENTS.md · AI Agent 协作指南

> 本文件为 AI Agent（如 TRAE、Cursor、Copilot 等）提供本项目的协作上下文、
> 编码规范与操作约束，确保多智能体或人机协作时的代码质量与一致性。
> 人类开发者亦应参考本规范。

***

## 1. 项目定位

| 项目       | 详情                                   |
| -------- | ------------------------------------ |
| **名称**   | Battle City（坦克大战）                    |
| **类型**   | 2D 俯视角射击游戏                           |
| **引擎**   | Phaser 3.88.2（纯前端，无构建工具）             |
| **入口**   | `index.html` → `src/main.js` → 场景链   |
| **画布尺寸** | 800 × 600 像素                         |
| **语言**   | JavaScript（ES6+，浏览器原生 `<script>` 加载） |

***

## 2. 架构约束（DO / DON'T）

### ✅ DO：允许的操作

1. **场景继承**：所有游戏场景必须继承 `Phaser.Scene`，使用 `constructor() { super('SceneKey'); }` 注册唯一键名
2. **场景注册**：新增场景后，必须同步更新两处

   - `index.html` 中增加 `<script src="./src/scenes/YourScene.js"></script>`（按加载顺序排列）

   - `src/main.js` 的 `scene: []` 数组中加入场景类引用
3. **资源加载**：所有游戏素材必须在 `Preloader` 场景的 `preload()` 中加载，禁止在其他场景调用 `this.load.*`
4. **资源引用**：场景中通过键名（字符串）引用资源，不要使用相对路径
5. **小步提交**：每次修改聚焦一个功能点，修改后手动验证场景切换不报错
6. **日志输出**：每个场景的 `create()` 中添加 `console.log('---SceneKey---')` 便于调试

### ❌ DON'T：禁止的操作

1. **禁止引入构建工具**：本项目为零构建配置，禁止添加 `package.json`、`webpack.config.js`、`vite.config.js` 等
2. **禁止使用模块系统**：禁止 `import / export / require`，所有脚本通过全局 `<script>` 顺序加载
3. **禁止修改 Phaser 标记区块**：`Preloader.js` 中的 `/* phaser:assets:start */` \~ `/* phaser:assets:end */` 区块为 Phaser Editor 自动生成区域，人工代码请写在区块外
4. **禁止硬编码全屏尺寸**：所有居中/定位优先使用 `this.scale.width / 2` 和 `this.scale.height / 2`，不要直接写 400 / 300
5. **禁止破坏场景链**：`Boot → Preloader → MainMenu → Game` 是固定启动流程，不得绕过或调换顺序
6. **禁止删除文档文件**：`README.md`、`CHANGELOG.md`、`AGENTS.md`、`.gitignore` 禁止直接删除或覆盖清空，只能追加与修订

***

## 3. 目录与文件规范

### 3.1 新增文件约定

| 文件类型      | 放置目录             | 命名规范                      | 示例                    |
| --------- | ---------------- | ------------------------- | --------------------- |
| Phaser 场景 | `src/scenes/`    | `PascalCase.js`，类名与文件名一致  | `LevelSelect.js`      |
| 游戏实体类     | `src/entities/`  | `PascalCase.js`           | `Tank.js`、`Bullet.js` |
| 工具函数      | `src/utils/`     | `camelCase.js`            | `collision.js`        |
| 游戏数据/配置   | `src/data/`      | `snake_case.js` 或 `.json` | `level_maps.js`       |
| 图像资源      | `assets/images/` | `snake_case.png`          | `player_tank.png`     |
| 音效资源      | `assets/audio/`  | `snake_case.mp3`          | `shoot.mp3`           |
| 瓦片地图      | `assets/maps/`   | `level_01.json` / `.tmx`  | `level_01.json`       |

> 若目录不存在，请先创建目录再放入文件。

### 3.2 index.html 加载顺序

`<script>` 标签必须严格按以下顺序排列，后加载文件可依赖先加载文件的全局声明：

```
1. phaser.min.js          ← 引擎最先
2. src/utils/*.js         ← 工具函数
3. src/entities/*.js      ← 实体类（Tank、Bullet 等）
4. src/data/*.js          ← 数据配置
5. src/scenes/Boot.js     ← 启动场景
6. src/scenes/Preloader.js
7. src/scenes/MainMenu.js
8. src/scenes/Game.js
9. 其他自定义场景 js
10. src/main.js           ← 入口最后
```

***

## 4. 编码规范

### 4.1 通用原则（与用户规则对齐）

- **注释语言**：所有注释使用**中文**，解释「为什么」而非「做什么」

- **函数单一职责**：一个函数只做一件事，超过 40 行应考虑拆分

- **避免深层嵌套**：优先使用提前返回（guard clause）

- **命名语义化**：避免单字母变量（循环 `i` 除外），不使用拼音缩写

### 4.2 Phaser 场景模板

每个新场景应遵循以下结构：

```javascript
/**
 * 场景说明：该场景负责什么功能
 */
class YourScene extends Phaser.Scene
{
    constructor ()
    {
        // 场景键名：全项目唯一，建议与文件名一致（驼峰）
        super('YourScene');
    }

    init (data)
    {
        // 接收前一场景传入的数据，做轻量初始化
        // 禁止在此调用 this.load.*
    }

    preload ()
    {
        // 仅 Preloader 场景使用资源加载
        // 其他场景此处通常留空
    }

    create ()
    {
        console.log('---yourScene---');

        // 1. 创建游戏对象
        // 2. 注册输入事件
        // 3. 注册碰撞检测
        // 4. 配置相机/物理
    }

    update (time, delta)
    {
        // 每帧更新逻辑（玩家控制、AI、状态检查等）
        // 保持轻量，避免每帧创建新对象
    }
}
```

### 4.3 实体类模板

```javascript
/**
 * 玩家坦克实体：负责渲染、移动、射击、碰撞
 */
class PlayerTank extends Phaser.Physics.Arcade.Sprite
{
    constructor (scene, x, y, texture)
    {
        super(scene, x, y, texture);

        // 加入场景显示列表与物理系统
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 物理属性
        this.setCollideWorldBounds(true);
        this.body.setSize(28, 28);

        // 游戏属性
        this.speed = 160;
        this.direction = 'up'; // up/down/left/right
        this.canShoot = true;
    }

    // 按方向设置速度
    move (direction) { /* ... */ }

    // 射击冷却控制
    shoot () { /* ... */ }
}
```

***

## 5. 修改前检查清单（Checklist）

在任何代码修改**完成后**，逐项检查：

- [ ] `index.html` 是否同步更新了 `<script>` 引用顺序

- [ ] `src/main.js` 是否在 `scene: []` 中注册了新场景

- [ ] 场景是否通过 `Boot → Preloader → MainMenu → Game` 链路可正常启动

- [ ] 浏览器 Console 是否有未捕获的 JS 报错（F12 检查）

- [ ] 资源加载是否都写在 `Preloader.preload()` 中

- [ ] CHANGELOG.md 是否追加了本次变更说明

- [ ] 没有重复引入 `phaser.min.js`

***

## 6. 推荐开发顺序（Roadmap）

Agent 在自主迭代时请按以下优先级推进，未完成上一阶段不要跳入下一阶段：

### 阶段 1：基础框架修复（P0）

1. 修复 `index.html` 中 `phaser.min.js` 重复引用
2. 更正 `MainMenu.js` 标题文本为 "Battle City"
3. 添加全局键盘输入管理（WASD/方向键/Space）

### 阶段 2：核心玩法（P0）

1. 实现 `PlayerTank` 实体（4 方向移动 + 射击）
2. 实现 `Bullet` 实体（飞行、出界销毁、碰撞）
3. 实现基于 Tilemap 的关卡地图（砖墙、钢墙、水、草、老鹰基地）
4. 碰撞检测：子弹↔砖墙、子弹↔钢墙、坦克↔墙、坦克↔坦克
5. 基地被击中 → Game Over 逻辑

### 阶段 3：敌军系统（P1）

1. 实现 `EnemyTank` 基础 AI（巡逻 + 自动射击）
2. 三种敌军类型：普通/快速/装甲（血量、速度、外观差异）
3. 敌军波次生成器 + 剩余敌军 HUD

### 阶段 4：进阶系统（P1）

1. 关卡切换（清除敌军 → 下一关）
2. 玩家生命系统、得分统计
3. 道具系统（星形、铲子、炸弹、盾牌、时钟）
4. 游戏暂停（P 键）与菜单

### 阶段 5：资源与打磨（P2）

1. 导入正式素材替换占位图形
2. 音效/BGM 接入
3. 开始界面、Game Over 界面、通关界面美化

***

## 7. 已知陷阱（Pitfalls）

| # | 陷阱                                             | 规避方法                                                                                  |
| - | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1 | 场景切换时未清理定时器/事件监听 → 内存泄漏                        | 场景 `shutdown()` 或 `destroy()` 中调用 `this.time.removeAllEvents()`、`this.input.off(...)` |
| 2 | 每帧 `update()` 中 `add.sprite` / `new 对象` → 帧率下降 | 对象池模式（Object Pool），子弹/爆炸特效复用                                                          |
| 3 | 子弹击中后未销毁 → 穿透多个目标                              | 碰撞回调第一时间销毁子弹，并 `return` 退出后续逻辑                                                        |
| 4 | 坦克转向时速度叠加 → 斜向移动过快                             | 每次 `setVelocity` 先清零另一轴，或使用 `Math.min` 限速                                             |
| 5 | Tilemap 瓦片碰撞体偏移 → 坦克卡墙                         | 确保瓦片尺寸（如 32px）与碰撞体尺寸一致，地图坐标为瓦片整数倍                                                     |

***

## 8. 文档维护

- **README.md**：新增对外可见的功能、运行方式、依赖变化时更新

- **CHANGELOG.md**：每次提交必须追加条目，按 `Added/Changed/Fixed/Removed` 分类

- **AGENTS.md**：架构、规范、开发阶段发生变化时更新

- **.gitignore**：新增构建产物或临时文件类型时追加条目

***

## 9. 快速参考

```javascript
// 场景切换（无参数）
this.scene.start('Game');

// 场景切换（传数据）
this.scene.start('Game', { level: 2, score: 9999 });
// 目标场景用 init(data) 接收

// 键盘输入（推荐在 create 中缓存引用）
this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');

// 物理碰撞检测（Game场景）
this.physics.add.collider(bullets, walls, (bullet, wall) => {
    bullet.destroy();
    // 砖墙处理：降低瓦片生命值或直接销毁
});

// 文本（等宽字体，保持像素风）
this.add.text(16, 16, 'SCORE: 0', {
    font: '16px monospace',
    color: '#ffffff'
});
```

***

> 🤖 **Agent 提示**：本文件是你在本项目中的「操作手册」，每次接手任务前请先重读第 2 节「架构约束」。违反约束的 PR 将被打回。

