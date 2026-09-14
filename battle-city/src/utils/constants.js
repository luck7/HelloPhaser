/**
 * 全局常量：集中管理方向、尺寸、速度、颜色、关卡参数等魔法数字
 * ——禁止在实体/场景中硬编码 32、160 等语义不明的字面量，
 * 一律在此处声明后通过常量名引用，便于统一数值平衡。
 */

// ============================================================
// 画布与基础尺寸（与 project.config / main.js 保持一致）
// ============================================================

const GAME_WIDTH  = 800;    // 游戏逻辑宽度（像素）
const GAME_HEIGHT = 600;    // 游戏逻辑高度（像素）
const TILE_SIZE   = 32;     // 瓦片标准尺寸（32×32，Battle City 经典 26×26 格取偶数方便居中）
const HALF_TILE   = TILE_SIZE / 2;

// ============================================================
// 方向（4 方向枚举：坦克/子弹通用）
// 数值设计为角度的整数倍，便于旋转贴图时直接转换
// ============================================================

const DIRECTION = Object.freeze({
    UP:    'up',
    DOWN:  'down',
    LEFT:  'left',
    RIGHT: 'right',
});

// 方向 → Phaser 角度（单位：度），Sprite 默认朝右，按逆时针正向需校准
// 这里直接约定：贴图默认"朝右"时使用的旋转角，可根据实际贴图方向调整
const DIRECTION_ANGLE = Object.freeze({
    [DIRECTION.UP]:    -90,
    [DIRECTION.DOWN]:   90,
    [DIRECTION.LEFT]:  180,
    [DIRECTION.RIGHT]:   0,
});

// 方向 → 速度向量（单位方向，乘以 speed 即可得到速度分量）
const DIRECTION_VECTOR = Object.freeze({
    [DIRECTION.UP]:    { x:  0, y: -1 },
    [DIRECTION.DOWN]:  { x:  0, y:  1 },
    [DIRECTION.LEFT]:  { x: -1, y:  0 },
    [DIRECTION.RIGHT]: { x:  1, y:  0 },
});

// 相反方向映射：敌军 AI 撞墙时常需"掉头"
const OPPOSITE_DIRECTION = Object.freeze({
    [DIRECTION.UP]:    DIRECTION.DOWN,
    [DIRECTION.DOWN]:  DIRECTION.UP,
    [DIRECTION.LEFT]:  DIRECTION.RIGHT,
    [DIRECTION.RIGHT]: DIRECTION.LEFT,
});

// ============================================================
// 坦克通用参数（不同类型可在 tank_config.js 中覆盖）
// ============================================================

const TANK = Object.freeze({
    // 显示尺寸（碰撞体略小于显示尺寸，视觉上更贴近经典）
    BODY_SIZE:      28,          // 显示大小 28×28
    COLLIDER_SIZE:  26,          // 物理碰撞体 26×26
    DEPTH:          10,          // 显示层级（在瓦片之上、草地之下）

    // 默认速度：玩家坦克基准（像素/秒）
    DEFAULT_SPEED:  160,

    // 射击冷却（毫秒）：避免一帧内射穿多颗
    DEFAULT_SHOOT_COOLDOWN: 350,

    // 默认最大同屏子弹数（玩家 1 级 1 颗，每升一级 +1，上限 2）
    DEFAULT_MAX_BULLETS: 1,

    // 默认生命值
    DEFAULT_HP: 1,
});

// ============================================================
// 玩家坦克各等级参数（对应 pu_star 升级）
// ============================================================

const PLAYER_TANK_LEVEL = Object.freeze([
    // 等级 0：初始
    { speed: 160, maxBullets: 1, bulletLevel: 1, pierceSteel: false },
    // 等级 1：双子弹
    { speed: 160, maxBullets: 2, bulletLevel: 1, pierceSteel: false },
    // 等级 2：穿甲弹（更快）
    { speed: 160, maxBullets: 2, bulletLevel: 2, pierceSteel: false },
    // 等级 3：可破坏钢墙
    { speed: 180, maxBullets: 2, bulletLevel: 3, pierceSteel: true  },
]);

// ============================================================
// 子弹参数
// ============================================================

const BULLET = Object.freeze({
    SIZE:       6,             // 子弹碰撞体大小
    DEPTH:      11,            // 层级比坦克高
    SPEED:      400,           // 普通子弹飞行速度（像素/秒）
    SPEED_FAST: 520,           // 穿甲弹飞行速度
    DAMAGE_NORMAL: 1,          // 普通子弹伤害
    DAMAGE_ARMOR:  2,          // 穿甲子弹伤害（对装甲坦克）
});

// 子弹归属方：碰撞时决定"打谁不打谁"
const BULLET_OWNER = Object.freeze({
    PLAYER: 'player',
    ENEMY:  'enemy',
});

// ============================================================
// 敌军坦克类型（阶段 3 扩展）
// ============================================================

const ENEMY_TYPE = Object.freeze({
    BASIC: 'basic',   // 普通坦克：慢速，1 血，分数 100
    FAST:  'fast',    // 快速坦克：快速，1 血，分数 200
    ARMOR: 'armor',   // 装甲坦克：慢速，4 血，分数 300
    POWER: 'power',   // 道具坦克：被击毁掉落道具
});

// ============================================================
// 瓦片类型 ID（与 tileset_32x32.png / level_maps.js 矩阵对齐）
// 阶段 2 实现地图时在此补全，提前约定可方便实体类引用
// ============================================================

const TILE = Object.freeze({
    EMPTY: 0,       // 空地
    BRICK: 1,       // 砖墙：可被子弹摧毁
    STEEL: 2,       // 钢墙：需穿甲/满级才能摧毁
    GRASS: 3,       // 草地：坦克可通过，会遮挡坦克（渲染在坦克上方）
    WATER: 4,       // 水面：坦克不可通过，子弹可以通过
    ICE:   5,       // 冰面：坦克可通过，会滑行
    BASE:  6,       // 老鹰基地（完好）
    BASE_RUINED: 7, // 老鹰基地（被毁）
});

// 瓦片碰撞层：坦克被以下瓦片阻挡
const TANK_BLOCK_TILES = Object.freeze([
    TILE.BRICK,
    TILE.STEEL,
    TILE.WATER,
    TILE.BASE,       // 基地不能被坦克碾压
    TILE.BASE_RUINED,
]);

// ============================================================
// 道具类型（阶段 4 扩展）
// ============================================================

const POWERUP_TYPE = Object.freeze({
    STAR:   'star',   // 火力升级
    TANK:   'tank',   // 加一条命
    SHOVEL: 'shovel', // 基地变钢墙 15 秒
    BOMB:   'bomb',   // 清屏所有敌军
    SHIELD: 'shield', // 玩家无敌 10 秒
    CLOCK:  'clock',  // 敌军冻结 10 秒
    GUN:    'gun',    // 直接满级火力
});

// ============================================================
// 道具持续时间（毫秒）
// ============================================================

const POWERUP_DURATION = Object.freeze({
    SHOVEL: 15_000,
    SHIELD: 10_000,
    CLOCK:  10_000,
});

// ============================================================
// 键名（键盘输入管理器引用）
// ============================================================

const KEY = Object.freeze({
    UP:     'W',
    DOWN:   'S',
    LEFT:   'A',
    RIGHT:  'D',
    UP_ALT:    'UP',
    DOWN_ALT:  'DOWN',
    LEFT_ALT:  'LEFT',
    RIGHT_ALT: 'RIGHT',
    SHOOT:  'SPACE',
    PAUSE:  'P',
    CONFIRM: 'ENTER',
});

// ============================================================
// 场景键名：与各场景 constructor 中的 super('xxx') 保持一致
// 切换场景时使用常量，避免手误拼错字符串
// ============================================================

const SCENE_KEY = Object.freeze({
    BOOT:       'Boot',
    PRELOADER:  'Preloader',
    MAIN_MENU:  'MainMenu',
    GAME:       'Game',
    GAME_OVER:  'GameOver',
    STAGE_CLEAR:'StageClear',
    PAUSE:      'PauseOverlay',
});

// ============================================================
// 颜色（占位图形/调试文本时使用，接入正式素材后可删除）
// ============================================================

const COLOR = Object.freeze({
    BG:            0x000000,  // 背景黑
    PLAYER_TANK:   0x8bb2ff,  // 玩家坦克占位蓝
    ENEMY_BASIC:   0xc0c0c0,  // 敌军占位灰
    ENEMY_FAST:    0xffffff,  // 快速占位白
    ENEMY_ARMOR:   0x3ca85c,  // 装甲占位绿
    ENEMY_POWER:   0xff66cc,  // 道具占位粉
    BULLET:        0xffffff,  // 子弹占位白
    BRICK:         0xb0592a,  // 砖墙占位棕
    STEEL:         0x909090,  // 钢墙占位银
    WATER:         0x3f6ec0,  // 水面占位蓝
    GRASS:         0x2e8b57,  // 草地占位绿
    BASE:          0xffd700,  // 基地占位金
    TEXT:          0xffe1da,  // 文本默认色
    HUD:           0xffffff,  // HUD 文本色
});

// ============================================================
// 游戏数值（生命、关卡数、单屏敌军上限等）
// ============================================================

const GAME = Object.freeze({
    START_LIVES:        3,     // 初始生命数
    EXTRA_LIFE_SCORE:   20000, // 每 20000 分加一条命（可选奖励）
    MAX_LEVEL:          35,    // 经典 35 关
    ENEMY_SPAWN_DELAY:  3000,  // 敌军刷新间隔（毫秒）
    ENEMIES_PER_LEVEL:  20,    // 每关敌军总数
    ENEMIES_ON_SCREEN:  4,     // 同屏敌军上限
    BASE_INVINCIBLE_SPAWN: 0,  // 基地初始保护时间（铲子道具扩展）
});
