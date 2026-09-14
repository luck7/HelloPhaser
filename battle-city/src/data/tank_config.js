/**
 * 坦克与基地配置表 tank_config.js
 * ----------------------------------------------------------------
 * 继承自 constants.js 中的全局枚举（TANK / ENEMY_TYPE / COLOR / BULLET 等），
 * 把「数值」与「逻辑」分离：
 *   - 数值平衡调整只改本文件，不碰实体/场景代码；
 *   - 实体通过 TANK_CONFIG / BASE_CONFIG 全局对象查表取参数。
 *
 * 结构说明：
 *   TANK_CONFIG.PLAYER[level]           → 玩家坦克等级 0~3 的完整参数
 *   TANK_CONFIG.ENEMY[ENEMY_TYPE.XXX]   → 4 种敌军坦克的完整参数
 *   BASE_CONFIG                         → 老鹰基地参数（生命值、保护期等）
 */

// ============================================================
// 玩家坦克：4 个等级（对应道具 star / gun）
// 索引 0 → 初始；1 → 双子弹；2 → 穿甲弹；3 → 可破坏钢墙 + 速度提升
// 与 constants.js 中 PLAYER_TANK_LEVEL 保持一致，做了字段扩展。
// ============================================================

const PLAYER_TANK_CONFIG = Object.freeze([
    // 等级 0：初始（1 级火力）
    Object.freeze({
        level:         0,
        speed:         160,                 // 移动速度（像素/秒）
        maxBullets:    1,                   // 同屏最大子弹数
        bulletLevel:   1,                   // 子弹等级（1=普通，2=穿甲，3=破钢墙）
        pierceSteel:   false,               // 是否可破坏钢墙
        bulletSpeed:   BULLET.SPEED,        // 子弹速度
        bulletDamage:  BULLET.DAMAGE_NORMAL,// 子弹伤害
        shootCooldown: TANK.DEFAULT_SHOOT_COOLDOWN, // 射击冷却（毫秒）
        hp:            TANK.DEFAULT_HP,     // 坦克生命（玩家通常 1 血，但无敌时可抵消）
        color:         COLOR.PLAYER_TANK,   // 占位图颜色
        scoreValue:    0,                   // 玩家被击毁不记分
        owner:         BULLET_OWNER.PLAYER, // 子弹归属
    }),
    // 等级 1：双子弹
    Object.freeze({
        level:         1,
        speed:         160,
        maxBullets:    2,
        bulletLevel:   1,
        pierceSteel:   false,
        bulletSpeed:   BULLET.SPEED,
        bulletDamage:  BULLET.DAMAGE_NORMAL,
        shootCooldown: TANK.DEFAULT_SHOOT_COOLDOWN,
        hp:            1,
        color:         COLOR.PLAYER_TANK,
        scoreValue:    0,
        owner:         BULLET_OWNER.PLAYER,
    }),
    // 等级 2：穿甲弹（子弹提速 + 高伤害）
    Object.freeze({
        level:         2,
        speed:         160,
        maxBullets:    2,
        bulletLevel:   2,
        pierceSteel:   false,
        bulletSpeed:   BULLET.SPEED_FAST,
        bulletDamage:  BULLET.DAMAGE_ARMOR,
        shootCooldown: TANK.DEFAULT_SHOOT_COOLDOWN,
        hp:            1,
        color:         COLOR.PLAYER_TANK,
        scoreValue:    0,
        owner:         BULLET_OWNER.PLAYER,
    }),
    // 等级 3：满级（速度 +5、子弹可破钢墙）
    Object.freeze({
        level:         3,
        speed:         180,
        maxBullets:    2,
        bulletLevel:   3,
        pierceSteel:   true,
        bulletSpeed:   BULLET.SPEED_FAST,
        bulletDamage:  BULLET.DAMAGE_ARMOR,
        shootCooldown: TANK.DEFAULT_SHOOT_COOLDOWN,
        hp:            1,
        color:         COLOR.PLAYER_TANK,
        scoreValue:    0,
        owner:         BULLET_OWNER.PLAYER,
    }),
]);

// ============================================================
// 敌军坦克：4 种类型（basic / fast / armor / power）
// 道具坦克与普通坦克参数相同，但被击毁后必定掉落一个道具。
// ============================================================

const ENEMY_TANK_CONFIG = Object.freeze({
    [ENEMY_TYPE.BASIC]: Object.freeze({
        type:          ENEMY_TYPE.BASIC,
        speed:         100,                       // 慢速
        maxBullets:    1,
        bulletLevel:   1,
        pierceSteel:   false,
        bulletSpeed:   BULLET.SPEED,
        bulletDamage:  BULLET.DAMAGE_NORMAL,
        shootCooldown: 900,                       // 射击间隔比玩家长
        hp:            1,                         // 1 枪秒
        color:         COLOR.ENEMY_BASIC,         // 灰色
        scoreValue:    100,                       // 击毁 100 分
        owner:         BULLET_OWNER.ENEMY,
        dropsPowerup:  false,                     // 正常情况不掉道具
        aiShootChance: 0.015,                     // 每帧 AI 决策：射击概率（参考）
        aiTurnChance:  0.02,                      // 每帧 AI 决策：转向概率（未撞墙时）
    }),

    [ENEMY_TYPE.FAST]: Object.freeze({
        type:          ENEMY_TYPE.FAST,
        speed:         180,                       // 约为玩家初始速度的 1.1×
        maxBullets:    1,
        bulletLevel:   1,
        pierceSteel:   false,
        bulletSpeed:   BULLET.SPEED,
        bulletDamage:  BULLET.DAMAGE_NORMAL,
        shootCooldown: 800,
        hp:            1,
        color:         COLOR.ENEMY_FAST,          // 白色
        scoreValue:    200,
        owner:         BULLET_OWNER.ENEMY,
        dropsPowerup:  false,
        aiShootChance: 0.018,
        aiTurnChance:  0.03,                      // 转向更频繁，走位更飘
    }),

    [ENEMY_TYPE.ARMOR]: Object.freeze({
        type:          ENEMY_TYPE.ARMOR,
        speed:         80,                        // 更慢
        maxBullets:    1,
        bulletLevel:   1,
        pierceSteel:   false,
        bulletSpeed:   BULLET.SPEED,
        bulletDamage:  BULLET.DAMAGE_NORMAL,
        shootCooldown: 1000,
        hp:            4,                         // 需连打 4 枪
        color:         COLOR.ENEMY_ARMOR,         // 绿色（受击时可闪变色提示剩余血量）
        scoreValue:    300,
        owner:         BULLET_OWNER.ENEMY,
        dropsPowerup:  false,
        aiShootChance: 0.012,
        aiTurnChance:  0.015,
    }),

    [ENEMY_TYPE.POWER]: Object.freeze({
        // 道具坦克：基础数值与 basic 类似，唯一差别是必掉道具
        type:          ENEMY_TYPE.POWER,
        speed:         110,
        maxBullets:    1,
        bulletLevel:   1,
        pierceSteel:   false,
        bulletSpeed:   BULLET.SPEED,
        bulletDamage:  BULLET.DAMAGE_NORMAL,
        shootCooldown: 850,
        hp:            1,
        color:         COLOR.ENEMY_POWER,         // 粉色 / 闪烁贴图
        scoreValue:    500,                       // 奖励高分
        owner:         BULLET_OWNER.ENEMY,
        dropsPowerup:  true,                      // 关键标记：被击毁掉落道具
        aiShootChance: 0.015,
        aiTurnChance:  0.025,
    }),
});

// ============================================================
// 聚合导出：TANK_CONFIG（被实体/场景引用的入口对象）
// ============================================================

const TANK_CONFIG = Object.freeze({
    PLAYER: PLAYER_TANK_CONFIG,
    ENEMY:  ENEMY_TANK_CONFIG,

    /**
     * 便捷方法：获取玩家指定等级的配置
     * @param {number} level 0~3，越界自动钳制
     */
    getPlayer(level = 0)
    {
        const lvl = Phaser.Utils.Clamp(level, 0, PLAYER_TANK_CONFIG.length - 1);
        return PLAYER_TANK_CONFIG[lvl];
    },

    /**
     * 便捷方法：获取敌军指定类型的配置
     * @param {string} type ENEMY_TYPE.*；非法值回退到 BASIC
     */
    getEnemy(type)
    {
        return ENEMY_TANK_CONFIG[type] || ENEMY_TANK_CONFIG[ENEMY_TYPE.BASIC];
    },
});

// ============================================================
// 老鹰基地配置
// ============================================================

const BASE_CONFIG = Object.freeze({
    hp:                 1,                 // 正常 1 击即毁
    size:               TILE_SIZE * 2,     // 基地占 2×2 瓦片（64×64）
    depth:              TANK.DEPTH - 1,    // 层级略低于坦克，保证坦克压上去会被挡住

    // 基地周围 8 格砖墙（经典「四角要塞」模式）
    // 相对基地 2×2 中心左上角瓦片坐标（以瓦片为单位）：
    //   B B B
    //   B E B      E = 老鹰基地 2×2（本身由 TILE.BASE/BASE_RUINED 填充）
    //   B B B
    // 实际布局中这 8 个位置在 level_maps.js 中写为 TILE.BRICK，
    // 此处记录结构便于「铲子道具」把它们统一替换为 TILE.STEEL 15 秒。
    fortressOffsetTiles: Object.freeze([
        // 以基地左上角瓦片 (bx, by) 为基准的 8 个相对偏移
        { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: -1 },
        { dx: -1, dy:  0 },                              { dx: 2, dy:  0 },
        { dx: -1, dy:  1 }, { dx: 0, dy:  1 }, { dx: 1, dy:  1 }, { dx: 2, dy:  1 },
        { dx: -1, dy:  2 },                              { dx: 2, dy:  2 },
        { dx: -1, dy:  3 }, { dx: 0, dy:  3 }, { dx: 1, dy:  3 }, { dx: 2, dy:  3 },
    ]),

    // 铲子道具保护期：15 秒（与 POWERUP_DURATION 对齐）
    fortifyDurationMs: POWERUP_DURATION.SHOVEL,
});
