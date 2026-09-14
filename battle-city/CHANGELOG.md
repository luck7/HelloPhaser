# Changelog · 变更日志

> 本文件按版本时间倒序记录项目的所有重要变更。
> 格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，
> 版本号遵循 [语义化版本 SemVer 2.0](https://semver.org/lang/zh-CN/)。

***

## 版本类型说明

| 标识           | 含义          |
| ------------ | ----------- |
| `Added`      | 新增功能 / 文件   |
| `Changed`    | 对现有功能的调整    |
| `Deprecated` | 即将废弃（仍可用）   |
| `Removed`    | 已移除的功能 / 文件 |
| `Fixed`      | Bug 修复      |
| `Security`   | 安全相关修复      |

***

## \[Unreleased] · 未发布

> 下一版本正在开发中的变更。

### Added

- 新增 `.gitignore`：覆盖系统缓存、编辑器配置、Node 构建产物、部署目录等

- 新增 `README.md`：项目说明、目录结构、快速开始、开发指南

- 新增 `CHANGELOG.md`：本变更日志文件

- 新增 `AGENTS.md`：AI Agent 协作与编码规范文档

- 新增 `src/utils/constants.js`：全局常量骨架，包含方向枚举、瓦片类型、坦克/子弹/敌军参数、颜色、场景键名、游戏数值等分组，并全部冻结（`Object.freeze`）禁止运行时修改

- 新增 `src/entities/TankBase.js`：坦克基类骨架

  - 继承 `Phaser.Physics.Arcade.Sprite`，封装玩家/敌军共用的移动、射击冷却、子弹计数、生命/受击/死亡流程

  - 自带无贴图占位渲染（带方向指示箭头），便于阶段 2 在正式素材导入前直接调试

  - 暴露 `onShoot / onHit / onDead` 钩子，由场景负责子弹对象池生成、得分统计、爆炸特效等

  - 提供 `setInvincible(flag, durationMs)` 无敌接口（盾牌道具/开场保护）

  - 内部每次设置速度前清零另一轴，规避「斜向同时按两键速度叠加过快」陷阱

- 新增 `src/data/tank_config.js`：坦克与基地配置表

  - `TANK_CONFIG.PLAYER[0~3]`：玩家 4 级火力表（速度/子弹数/穿甲/破钢墙/冷却），并提供 `getPlayer(level)` 快捷方法

  - `TANK_CONFIG.ENEMY[4 种]`：basic / fast / armor / power 的速度、血量、得分、AI 概率参数，power 类型标记 `dropsPowerup = true`

  - `BASE_CONFIG`：基地 2×2 尺寸、四角要塞的 16 格相对偏移（供铲子道具统一替换钢墙）、加固持续时间

  - 所有字段均 `Object.freeze`，与 `constants.js` 中 COLOR / ENEMY\_TYPE / POWERUP\_DURATION 等枚举一一对应

- 新增 `src/data/level_maps.js`：关卡地图（前 3 关示例）

  - 统一 25 列 × 18 行（GAME\_WIDTH/HEIGHT ÷ TILE\_SIZE），数字矩阵严格对齐 `TILE.*` 枚举（0 空 / 1 砖 / 2 钢 / 3 草 / 4 水 / 5 冰 / 6 基地）

  - 3 关主题：L1 入门砖墙要塞 · L2 钢墙草丛迂回 · L3 冰面迷宫，敌军波次难度逐级提升（装甲坦克比例增加）

  - 每关附带 `playerSpawn`（双人 2 点）、`enemySpawns`（左/中/右 3 点）、`baseTile`（基地左上角瓦片坐标）、`enemyWave`（20 辆出场顺序）

  - 提供 `MAP_UTIL` 工具对象：`getLevel(n)`、`tileToWorld / worldToTile`、`tileAt`、`baseCenter`

- 新增 `assets/images/`：从 `sprite_sheet_nobg.png` 切片并放大 2x 生成的 65 个 PNG 素材

  - 坦克精灵图 8 张（256×128，单帧 32×32，含 4 方向 × 2 动画帧 × 4 型号）

  - 瓦片/地形 17 张、子弹·爆炸·护盾动画帧 29 张、HUD 图标与像素字体字符 12 张（均 32×32）

- 在 [Preloader.js](file:///e:/projects/Phaser/battle-city/src/scenes/Preloader.js) 的 `preload()` 中（`/* phaser:assets:end */` 标记区块外）补全全部素材加载

  - 坦克以 `spritesheet` 加载，`frameWidth/frameHeight = TILE_SIZE(32)`，对齐放大 2x 后的单帧尺寸与 `constants.js` 的 `TILE_SIZE` 设计

  - 瓦片/砖钢破坏状态/实心块、子弹·爆炸·护盾动画帧、HUD 图标与像素字体字符以 `image` 加载，键名与文件名一致

  - 加载代码写在自动生成区块外，遵循 AGENTS §2「资源加载集中在 Preloader」与「禁止修改 Phaser 标记区块」约束

- 引入两套完整 ASCII bitmap font（覆盖 95 个可打印字符 0x20\~0x7E），供 `this.add.bitmapText(x, y, key, '任意文本')` 使用：

  - **PressStart2P**（FC 经典风格，方正粗重）：`assets/fonts/press_start_2p.png`（256×96，16 列×6 行，单字符 16×16）+ `press_start_2p.xml`，基于 `PressStart2P-Regular.ttf` 以 fontSize=8、BASE=8（像素完全对齐、AA=0、顶部完整 0 裁切）渲染 8×8 → 最近邻 2× → 16×16

  - **PublicPixel**（现代像素风格）：`assets/fonts/public_pixel_font.png` + `public_pixel_font.xml`，基于 `PublicPixel.ttf` 同流程渲染

  - 加载键名分别为 `PressStart2P` / `PublicPixel`（Preloader 中 `load.bitmapFont`），HUD、菜单、Game Over 等界面按需选用

### Changed

- 调整 [index.html](file:///e:/projects/Phaser/battle-city/index.html) 脚本加载顺序，严格遵循 AGENTS §3.2 约定：

  1. `phaser.js` → 2. `src/utils/*.js` → 3. `src/entities/*.js` → **3.5** **`src/data/*.js`** → 4. `src/scenes/*.js` → 5. `src/main.js`

- 同步重排场景脚本顺序为 `Boot → Preloader → MainMenu → Game`，与 Phaser 场景运行时流转顺序一致

- 去除原先重复引入的 Phaser 引擎 `<script>`（已与 head 中引用合并为单处）

- 合并子弹 4 方向单图为 `bullet_spritesheet.png`（128×32，帧顺序 0=up/1=right/2=down/3=left），删除原 `bullet_up/right/down/left.png`；[Preloader.js](file:///e:/projects/Phaser/battle-city/src/scenes/Preloader.js) 以 `spritesheet` 加载（键名 `bullet`）

- 合并水面 3 帧动画为 `tile_water_spritesheet.png`（96×32，帧顺序 0=wave1 / 1=wave2 / 2=wave3），删除原 `tile_water_1/2/3.png`；[Preloader.js](file:///e:/projects/Phaser/battle-city/src/scenes/Preloader.js) 以 `spritesheet` 加载（键名 `tile_water`），后续可通过 `generateFrameNumbers('tile_water', { start:0, end:2 })` 创建水面循环动画

- 拆分原 `explosion_spritesheet.png`（20 帧）：前 7 帧（道具图标）抽取为新文件 `powerup_spritesheet.png`（224×32，键名 `powerup`，帧 0~~6）；剩余 13 帧（爆炸火光）重排为新的~~ ~~`explosion_spritesheet.png`（416×32，键名~~ ~~`explosion`，帧 0~~12 = 原帧 7\~19）；已在 [Preloader.js](file:///e:/projects/Phaser/battle-city/src/scenes/Preloader.js) 同步新增 `powerup` spritesheet 加载并更新爆炸帧数量注释

- 二次拆分 `explosion_spritesheet.png`（13 帧）：帧 0~~2 抽取为~~ **~~小爆炸~~**\~\~\~\~ ~~`small_explosion_spritesheet.png`（96×32，3 帧，子弹击中砖墙时的火光小爆炸）；帧 8~~9 抽取为 **防护罩** `shield_spritesheet.png`（64×32，2 帧，玩家开场保护/盾牌道具动画）；剩余帧 \[3,4,5,6,7,10,11,12]（共 8 帧）重排为新的 **大爆炸** `explosion_spritesheet.png`（256×32，8 帧，坦克/敌军销毁）；Preloader 同步新增 `small_explosion` 与 `shield` 两个 spritesheet 加载

- 交换帧：`explosion_spritesheet.png` 第 5 帧（0-based 帧 4，原爆炸消散帧 solid=160）与 `shield_spritesheet.png` 第 2 帧（0-based 帧 1，防护罩 solid=420 / 右上角白色像素）做了对调；两文件其余帧零污染，尺寸 / 帧数 / 加载键名不变

- **大爆炸重构为两帧 64×64**：撤销「爆炸帧5 ↔ shield帧1」交换（8 个爆炸小帧恢复纯爆炸、shield 帧1 重新恢复为防护罩），然后按 2×2 象限拼法把 8 个 32×32 小帧重组成 2 个 64×64 大爆炸帧（`explosion_spritesheet.png` 从 256×32/8 帧改为 **128×64/2 帧**）；大爆炸帧0 = TL小帧0 / TR小帧1 / BL小帧4 / BR小帧5；大爆炸帧1 = TL小帧2 / TR小帧3 / BL小帧6 / BR小帧7；[Preloader.js](file:///e:/projects/Phaser/battle-city/src/scenes/Preloader.js#L78-L85) 同步更新 `frameWidth/TILE_SIZE*2 = 64`，注释写明象限映射；随后按用户最终确认：**(1) 回退 small\_explosion 为用户说"没问题"的原始 3 帧（E0/E1/E2，不再参与大爆炸拼帧），(2) 再次按 8 纯爆炸帧 \[E3,E4,E5,E6,E7,E10,E11,E12] 重拼大爆炸象限，(3) 精确交换 shield 帧1 ↔ explosion帧0左下象限**（32×32 互换，其余所有象限/文件零污染，small\_explosion 完全不动）

- [Bullet.js](file:///e:/projects/Phaser/battle-city/src/entities/Bullet.js) 接入真实贴图：移除「白色矩形 + 方向小尖」占位图形（`_buildPlaceholderGraphic` / `_applyDirectionVisual`），改用 `super(scene, x, y, 'bullet')` + 新增 `BULLET_FRAME` 方向→帧索引映射 + `_applyDirectionFrame` 按 `setFrame` 切换方向帧

- **images 目录按类型分文件夹**：`assets/images/` 根下 35 个 PNG 全部分类移入 6 个子目录（`tanks/` 8 坦克精灵图 · `tiles/` 14 瓦片+水面动画 · `effects/` 4 特效 spritesheet：敌军出生/大爆炸/小爆炸/防护罩 · **`bullets/`** **子弹方向帧** · `hud/` 7 HUD图标+分值 · `powerups/` 1 道具 spritesheet）；[Preloader.js](file:///e:/projects/Phaser/battle-city/src/scenes/Preloader.js) 所有图片加载路径同步加上对应子目录前缀；同时补上此前遗漏的 `bullet` 键 `load.spritesheet` 加载语句（Bullet.js 需要该键，之前重写 anims 段时被意外删除）

- **基地图标归类 + 重命名 + 接入真实贴图**：原 `hud/hud_enemy_icon.png`（老鹰标）/ `hud/icon_flag.png`（折断旗）误放 HUD 目录，实为基地地形贴图 → 移动至 `tiles/` 并重命名为 `eagle_normal.png` / `eagle_destroyed.png`，键名同步改为 `eagle_normal` / `eagle_destroyed`，统一通过 [Preloader.js](file:///e:/projects/Phaser/battle-city/src/scenes/Preloader.js#L49-L62) tiles 数组按瓦片路径加载；HUD 段 forEach 加载器空化为注释说明

- **Game 场景基地视觉/碰撞重构**：此前 `TILE.BASE` 使用 4 个分散金色矩形作占位 → 改为 **4 格透明物理碰撞体（仅负责阻挡坦克 + 接收子弹命中） + 在 2×2 中心统一放 1 张完整** **`eagle_normal`（scale=2 覆盖 64×64）**，命中基地时一次性把 2×2 共 4 格替换为 `TILE.BASE_RUINED`（仍阻挡坦克，但不再加入子弹碰撞组避免重复触发），同时通过 `this.baseEagle.setTexture('eagle_destroyed')` 切换为折断旗视觉；`_destroyTile` 新增 `BASE_RUINED` 分支重建透明阻挡碰撞体，`_buildTileMap` 新增 `TILE.BASE_RUINED` switch case 支持从 tileGrid 直接加载废墟格

### Removed

- 移除 `assets/images/font_01.png` \~ `font_10.png`（原 sprite sheet 切出的零散像素字符块，仅覆盖 ~~20 字符）与 3 张参考索引图（`font_index.png`~~ ~~/~~ ~~`font_index_nobg.png`~~ ~~/~~ ~~`font_ascii_index.png`），ASCII 字符现统一由 bitmap font 覆盖：`assets/fonts/press_start_2p.png`（CGA 风格）与~~ ~~`public_pixel_font.png`（PublicPixel 风格），两者都是完整 95 个可打印 ASCII（0x20~~0x7E），通过 `this.add.bitmapText` 显示任意文本

- 同步删除 [Preloader.js](file:///e:/projects/Phaser/battle-city/src/scenes/Preloader.js) 中 `font_01`\~`font_10` 的 10 个 `load.image` 键（HUD 列表精简为 2 键：`hud_enemy_icon` / `icon_flag`）

- 移除 `assets/images/font_index_preview.txt`（旧字符块时代生成的 ASCII 点阵预览，已被 bitmap font 取代）

***

## \[0.1.0] - 2026-09-01

### Added

- 使用 Phaser Editor 1.1.2 创建项目骨架，基于 Phaser 3.88.2

- 项目画布尺寸 800 × 600，缩放模式 FIT + 居中

- 新增启动场景 [Boot.js](file:///e:/projects/Phaser/battle-city/src/scenes/Boot.js)

  - 配置音频不随窗口失焦暂停（`pauseOnBlur = false`）

- 新增预加载场景 [Preloader.js](file:///e:/projects/Phaser/battle-city/src/scenes/Preloader.js)

  - 提供带进度条的资源加载界面

  - 预留 `/* phaser:assets:* */` 自动生成区块

- 新增主菜单场景 [MainMenu.js](file:///e:/projects/Phaser/battle-city/src/scenes/MainMenu.js)

  - 显示标题与 "Click to start" 提示

  - 点击屏幕后切换至 Game 场景

- 新增游戏主场景 [Game.js](file:///e:/projects/Phaser/battle-city/src/scenes/Game.js)

  - 占位文本 "Your game starts here"

- 新增入口配置 [main.js](file:///e:/projects/Phaser/battle-city/src/main.js)

  - 注册 Boot → Preloader → MainMenu → Game 四个场景

- 新增 [index.html](file:///e:/projects/Phaser/battle-city/index.html)

  - 通过 `<script>` 标签加载 Phaser 引擎与各场景模块

- 新增 `project.config`：编辑器配置（标题、尺寸、版本、创建时间等）

- 引入 `phaser.min.js`：Phaser 3.88.2 引擎本地副本

### Known Issues

- `index.html` 中重复引入了两次 `phaser.min.js`（第 11 行与第 15 行）

- 主菜单标题文本为 "My Mega Game"，尚未更正为 "Battle City"

- 资源列表为空，尚未导入坦克、瓦片、音效等游戏素材

- Game 场景尚无实际游戏逻辑

***

## 版本对比链接

- [Unreleased vs 0.1.0](#)

- [0.1.0 Initial](#)

***

## 贡献格式模板

新增版本条目时请参考以下格式：

```markdown
## [x.y.z] - YYYY-MM-DD

### Added
- 新增了什么功能

### Changed
- 调整了什么现有功能

### Fixed
- 修复了什么 Bug

### Removed
- 移除了什么内容
```

