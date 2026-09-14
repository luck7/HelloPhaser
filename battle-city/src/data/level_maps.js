/**
 * 关卡地图数据 level_maps.js
 * ----------------------------------------------------------------
 * 地图尺寸：800/32=25 列 × (600-64)/32≈18 行（TILE_SIZE=32，顶底各留一些间距）
 *   —— 实际 18 行 × 576 像素，剩下 24 像素做顶/底外边距不参与渲染
 *
 * 矩阵语义：与 constants.js 中 TILE.* 枚举一一对应
 *   0=空地  1=砖墙  2=钢墙  3=草地  4=水面  5=冰面  6=基地完好  7=基地被毁
 *
 * 基地（老鹰）固定占 2×2 瓦片：4 个 TILE.BASE 放在地图底部正中
 * （行 R-2、R-1 × 列 C/2-1、C/2，其中 R=18, C=25 → cols 12-13 中间偏）
 *
 * 每关除了 tiles 矩阵，还附带：
 *   - playerSpawn：玩家出生瓦片坐标（中心对齐）；双人时可放两个
 *   - enemySpawns：敌军 3 个出生点（左上/中上/右上），轮流刷新
 *   - baseTile：基地左上角瓦片坐标（用于铲子道具替换周边砖墙）
 *   - enemyWave：本关敌军出场顺序 ENEMY_TYPE[]（长度 = GAME.ENEMIES_PER_LEVEL = 20）
 *
 * 注：本文件先给出前 3 关示例矩阵，其余 32 关可按相同结构在后续迭代中追加。
 */

// 为了让每一行数字矩阵更易读（不写满 25 个字面量 0），这里定义几个「积木」
// ——它们仅本文件内部使用，不暴露到全局——
const _ = TILE.EMPTY;
const B = TILE.BRICK;
const S = TILE.STEEL;
const G = TILE.GRASS;
const W = TILE.WATER;
const I = TILE.ICE;
const E = TILE.BASE;        // 仅用于地图底部基地 2×2 区域
const R = TILE.BASE_RUINED; // 不直接出现在地图上（动态替换）

// ============================================================
// Level 1：经典入门关——全砖墙对称关卡，新手熟悉移动/射击
// 共 18 行 × 25 列。行号 0 在画布顶部，行号 17 在底部。
// ============================================================

const LEVEL_01 = Object.freeze({
    id: 1,
    name: '入门·砖墙要塞',
    // 敌军出场顺序（20 辆）：14 基本 + 2 快速 + 2 装甲 + 2 道具
    enemyWave: Object.freeze([
        'basic','basic','basic','fast',
        'basic','basic','basic','fast',
        'power','basic','basic','armor',
        'basic','basic','basic','basic',
        'basic','power','armor','basic',
    ]),
    // 瓦片矩阵：逐行书写，每行长度必须 = 25
    tiles: Object.freeze([
        // 0  (顶部)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // 1
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // 2：第 1 道砖墙，分段对称
        [_,_,B,B,_,_,B,B,_,_,B,B,_,_,B,B,_,_,B,B,_,_,B,B,_],
        // 3：同 2
        [_,_,B,B,_,_,B,B,_,_,B,B,_,_,B,B,_,_,B,B,_,_,B,B,_],
        // 4：两侧加钢墙（经典引导玩家"普通子弹打不动钢墙"）
        [_,S,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,S],
        // 5：中部 4 组砖墙方块
        [_,_,B,B,_,_,_,_,B,B,_,_,_,_,_,B,B,_,_,_,_,B,B,_,_],
        // 6：同 5
        [_,_,B,B,_,_,_,_,B,B,_,_,_,_,_,B,B,_,_,_,_,B,B,_,_],
        // 7：十字通道：中间空行，四角放草地
        [G,G,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,G,G],
        // 8：十字通道两侧水面（让玩家学会绕路）
        [_,_,_,_,_,W,W,W,_,_,_,_,_,_,_,_,_,W,W,W,_,_,_,_,_],
        // 9
        [_,_,_,_,_,W,W,W,_,_,_,_,_,_,_,_,_,W,W,W,_,_,_,_,_],
        // 10：两行小草地遮蔽条
        [_,_,_,G,G,G,G,G,_,_,B,B,B,B,_,_,G,G,G,G,G,_,_,_,_],
        // 11
        [_,_,_,G,G,G,G,G,_,_,B,B,B,B,_,_,G,G,G,G,G,_,_,_,_],
        // 12：4 组方块砖墙（中间形成走廊）
        [_,_,_,_,_,B,B,_,_,_,_,_,_,_,_,_,_,B,B,_,_,_,_,_,_],
        // 13
        [_,_,_,_,_,B,B,_,_,_,_,_,_,_,_,_,_,B,B,_,_,_,_,_,_],
        // 14：靠近基地的大片砖墙（玩家保护基地用）
        [_,_,_,_,_,_,_,_,_,B,B,B,B,B,B,B,B,B,_,_,_,_,_,_,_],
        // 15：基地保护砖墙 + 基地 2×2（列 11-14 左右包砖）
        [_,_,_,_,_,_,_,_,_,B,B,_,_,_,_,_,B,B,_,_,_,_,_,_,_],
        // 16：基地 2×2 主体（行 16 cols 12-13）+ 上下砖墙
        [_,_,_,_,_,_,_,_,_,B,B,E,E,B,B,_,_,_,_,_,_,_,_,_,_],
        // 17：底部，基地下沿
        [_,_,_,_,_,_,_,_,_,_,_,E,E,_,_,_,_,_,_,_,_,_,_,_,_],
    ]),
    // 玩家出生瓦片坐标（1P 在基地左前方、2P 在右前方）
    playerSpawn: Object.freeze([
        { col:  8, row: 16, dir: DIRECTION.UP },
        { col: 16, row: 16, dir: DIRECTION.UP },
    ]),
    // 敌军出生点（左/中/右 3 处，行 0~1 上方）
    enemySpawns: Object.freeze([
        { col:  0, row: 0, dir: DIRECTION.DOWN },
        { col: 12, row: 0, dir: DIRECTION.DOWN },
        { col: 24, row: 0, dir: DIRECTION.DOWN },
    ]),
    // 基地 2×2 左上角瓦片坐标（用于铲子道具、基地被击判定）
    baseTile: Object.freeze({ col: 12, row: 16 }),
});

// ============================================================
// Level 2：加入钢墙与草地 —— 穿甲弹、隐蔽战术
// ============================================================

const LEVEL_02 = Object.freeze({
    id: 2,
    name: '迂回·钢墙草丛',
    enemyWave: Object.freeze([
        'basic','basic','fast','basic',
        'basic','fast','basic','armor',
        'basic','power','basic','basic',
        'fast','basic','armor','basic',
        'armor','basic','power','fast',
    ]),
    tiles: Object.freeze([
        // 0-1：顶部留出敌军出生缓冲
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // 2-3：钢墙十字
        [S,S,_,_,_,_,_,S,S,S,S,S,S,S,S,_,_,_,_,_,_,S,S,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // 4-5：两侧砖块夹钢
        [_,_,B,B,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_,B,B,B,_,_,_],
        [_,_,B,_,B,_,_,_,B,B,B,B,B,B,B,_,_,_,_,B,_,B,_,_,_],
        // 6-7：草地遮蔽条
        [G,G,_,_,_,_,G,G,_,_,_,_,_,_,_,G,G,_,_,_,_,G,G,G,_],
        [G,G,_,_,_,_,G,G,_,_,_,_,_,_,_,G,G,_,_,_,_,G,G,G,_],
        // 8-9：水面分隔上下
        [_,_,_,_,W,W,_,_,_,_,_,_,_,_,_,_,_,W,W,_,_,_,_,_,_],
        [_,_,_,_,W,W,_,_,_,_,S,S,_,_,_,_,_,W,W,_,_,_,_,_,_],
        // 10-11：中部钢墙迷宫
        [_,_,_,_,_,_,B,B,B,B,_,_,_,_,B,B,B,B,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // 12-13：下层砖块方块
        [_,_,_,B,B,_,_,_,B,B,_,_,_,_,B,B,_,_,_,B,B,_,_,_,_],
        [_,_,_,B,B,_,_,_,B,B,_,_,_,_,B,B,_,_,_,B,B,_,_,_,_],
        // 14：大片草地掩护
        [_,_,G,G,G,G,G,G,G,_,_,_,_,_,_,G,G,G,G,G,G,G,G,_,_],
        // 15：基地上方砖块
        [_,_,_,_,_,_,_,_,_,B,B,_,_,_,_,B,B,_,_,_,_,_,_,_,_],
        // 16：基地主体
        [_,_,_,_,_,_,_,_,_,B,B,E,E,B,B,_,_,_,_,_,_,_,_,_,_],
        // 17：底部
        [_,_,_,_,_,_,_,_,_,_,_,E,E,_,_,_,_,_,_,_,_,_,_,_,_],
    ]),
    playerSpawn: Object.freeze([
        { col:  8, row: 16, dir: DIRECTION.UP },
        { col: 16, row: 16, dir: DIRECTION.UP },
    ]),
    enemySpawns: Object.freeze([
        { col:  0, row: 0, dir: DIRECTION.DOWN },
        { col: 12, row: 0, dir: DIRECTION.DOWN },
        { col: 24, row: 0, dir: DIRECTION.DOWN },
    ]),
    baseTile: Object.freeze({ col: 12, row: 16 }),
});

// ============================================================
// Level 3：冰面 + 水面迷宫 —— 滑行与绕路，装甲坦克比例提高
// ============================================================

const LEVEL_03 = Object.freeze({
    id: 3,
    name: '寒域·冰面迷宫',
    enemyWave: Object.freeze([
        'basic','fast','armor','basic',
        'armor','basic','power','fast',
        'basic','armor','basic','basic',
        'armor','fast','basic','power',
        'armor','armor','fast','basic',
    ]),
    tiles: Object.freeze([
        // 0-1
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // 2-3：砖块城墙（三道门）
        [B,B,B,B,B,_,B,B,B,B,B,_,B,B,B,B,B,_,B,B,B,B,B,B,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // 4-5：钢墙哨所
        [_,S,S,_,_,_,_,_,S,S,_,_,S,S,_,_,_,_,_,_,S,S,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // 6-7：大面积冰面
        [_,_,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,_,_,_],
        [_,_,I,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,I,_,_,_],
        // 8-9：冰面 + 中央砖墙
        [_,_,I,_,B,B,B,B,B,_,_,_,_,_,B,B,B,B,B,_,_,I,_,_,_],
        [_,_,I,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,I,_,_,_],
        // 10-11：两侧水面夹中央草地带
        [W,W,_,_,_,_,_,_,_,G,G,G,G,G,G,G,G,_,_,_,_,_,_,W,W],
        [W,W,_,_,_,_,_,_,_,G,G,G,G,G,G,G,G,_,_,_,_,_,_,W,W],
        // 12-13：下半部分冰面迷宫 + 钢门
        [_,_,B,B,B,_,_,_,_,_,_,S,S,_,_,_,_,_,_,B,B,B,_,_,_],
        [_,_,_,_,_,_,_,I,I,I,I,I,I,I,I,I,_,_,_,_,_,_,_,_,_],
        // 14-15：砖块环绕基地
        [_,_,_,_,_,_,_,_,I,B,B,B,B,B,B,B,I,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,B,B,_,_,_,_,B,B,_,_,_,_,_,_,_,_],
        // 16：基地主体
        [_,_,_,_,_,_,_,_,_,B,B,E,E,B,B,_,_,_,_,_,_,_,_,_,_],
        // 17：底部
        [_,_,_,_,_,_,_,_,_,_,_,E,E,_,_,_,_,_,_,_,_,_,_,_,_],
    ]),
    playerSpawn: Object.freeze([
        { col:  8, row: 16, dir: DIRECTION.UP },
        { col: 16, row: 16, dir: DIRECTION.UP },
    ]),
    enemySpawns: Object.freeze([
        { col:  0, row: 0, dir: DIRECTION.DOWN },
        { col: 12, row: 0, dir: DIRECTION.DOWN },
        { col: 24, row: 0, dir: DIRECTION.DOWN },
    ]),
    baseTile: Object.freeze({ col: 12, row: 16 }),
});

// ============================================================
// 聚合导出：LEVEL_MAPS（供 Game 场景按 level 索引取数）
// ============================================================

const LEVEL_MAPS = Object.freeze([
    LEVEL_01,
    LEVEL_02,
    LEVEL_03,
]);

// ============================================================
// 便捷工具：关卡读取、尺寸查询、瓦片坐标 ↔ 世界坐标互转
// （避免场景中到处写 25/18/32 字面量）
// ============================================================

const MAP_UTIL = Object.freeze({
    /** 地图列数 = GAME_WIDTH / TILE_SIZE */
    COLS: GAME_WIDTH / TILE_SIZE,
    /** 地图行数 */
    ROWS: 18,
    /** 地图实际像素宽（等于 GAME_WIDTH） */
    WIDTH_PX: GAME_WIDTH,
    /** 地图实际像素高 */
    HEIGHT_PX: 18 * TILE_SIZE,

    /**
     * 获取关卡数据。levelNumber 从 1 开始。超过现有关卡自动回环。
     * @param {number} levelNumber 1..MAX_LEVEL
     */
    getLevel(levelNumber)
    {
        const n = (typeof levelNumber === 'number' && levelNumber >= 1) ? levelNumber : 1;
        const idx = (n - 1) % LEVEL_MAPS.length;
        return LEVEL_MAPS[idx];
    },

    /**
     * 瓦片坐标 → 世界中心坐标（返回 {x, y} 为瓦片中心像素）
     */
    tileToWorld(col, row)
    {
        return {
            x: col * TILE_SIZE + HALF_TILE,
            y: row * TILE_SIZE + HALF_TILE,
        };
    },

    /**
     * 世界像素坐标 → 瓦片坐标（向下取整）
     */
    worldToTile(x, y)
    {
        return {
            col: Math.floor(x / TILE_SIZE),
            row: Math.floor(y / TILE_SIZE),
        };
    },

    /**
     * 安全查询某瓦片的值：越界返回 TILE.EMPTY
     */
    tileAt(level, col, row)
    {
        if (!level || !level.tiles) return TILE.EMPTY;
        if (row < 0 || row >= level.tiles.length) return TILE.EMPTY;
        const line = level.tiles[row];
        if (col < 0 || col >= line.length) return TILE.EMPTY;
        return line[col];
    },

    /**
     * 基地 2×2 区域的世界中心点（用于放置老鹰精灵）
     */
    baseCenter(level)
    {
        const t = level.baseTile;
        return {
            // 2 × 2 瓦片的中心：col + 1, row + 1（以瓦片为单位）→ 换算像素中心
            x: (t.col + 1) * TILE_SIZE,
            y: (t.row + 1) * TILE_SIZE,
        };
    },
});
