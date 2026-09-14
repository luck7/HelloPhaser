/**
 * 玩家坦克 PlayerTank
 * ----------------------------------------------------------------
 * 继承 TankBase，只负责两件事：
 *   1) 读取键盘（WASD / 方向键 / Space / P）并驱动 move / stop / tryShoot
 *   2) 读取 tank_config 的玩家等级参数（速度、子弹数），升级时重新 applyLevel
 *
 * 射击不直接 new Bullet（避免对象耦合），而是沿用 TankBase.onShoot 回调：
 *   Game 场景在构造玩家时挂上：
 *     player.onShoot = (tank, bulletData) => bulletPool.spawn(...)
 *   这样玩家实体本身不感知对象池，职责更单一。
 */
class PlayerTank extends TankBase
{
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x  出生点 X
     * @param {number} y  出生点 Y
     * @param {number} [playerIndex=0] 1P=0 / 2P=1（后续双人模式扩展键位）
     * @param {number} [level=0] 初始火力等级 0~3
     * @param {string} [texture] 贴图键名；空 → 占位图
     */
    constructor (scene, x, y, playerIndex = 0, level = 0, texture = '')
    {
        // 用 TANK_CONFIG.getPlayer(level) 取出完整参数作为父类 cfg
        const cfg = TANK_CONFIG.getPlayer(level);

        super(scene, x, y, texture, cfg);

        this.playerIndex = playerIndex;
        this.level = level;

        // 玩家默认子弹归属方：PLAYER（在 cfg 中已有，这里是显式断言）
        this.cfg.owner = BULLET_OWNER.PLAYER;

        // 键盘输入绑定
        this._bindKeys();

        // 开场 3 秒无敌（经典 Battle City 设定）
        this.setInvincible(true, 3000);

        console.log(`<---playerTank[${playerIndex}] level=${level}--->`);
    }

    // =============================================================
    // 升级玩家火力（拾取 star / gun 道具时调用）
    // =============================================================
    upgradeLevel (targetLevel = this.level + 1)
    {
        const newCfg = TANK_CONFIG.getPlayer(targetLevel);
        this.level  = newCfg.level;
        this.cfg    = newCfg;
        // 归属方在 apply 后保持 PLAYER
        this.cfg.owner = BULLET_OWNER.PLAYER;
    }

    // =============================================================
    // 每帧更新：读按键 → 移动 / 射击
    // 由场景 Game.update() 显式调用（不走父类 update，避免与 Sprite 生命周期混淆）
    // =============================================================
    tickInput (nowMs)
    {
        if (!this.alive) return;

        // —— 1) 计算当前意图方向（支持 WASD + 方向键，后按优先） ——
        const dir = this._readDirection();

        if (dir)
        {
            this.move(dir);
        }
        else
        {
            this.stop();
        }

        // —— 2) 射击键（按一次射一发，按住也受冷却限制）——
        const shootPressed = this._isShootPressed();
        if (shootPressed) this.tryShoot(nowMs);
    }

    // =============================================================
    // 内部：键盘绑定（读取 constants.js 的 KEY 枚举）
    // =============================================================
    _bindKeys ()
    {
        const keyboard = this.scene.input.keyboard;

        if (this.playerIndex === 0)
        {
            // 1P：WASD + Space
            this._keys = {
                up:    [KEY.UP, KEY.UP_ALT],      // 'W' 或 'UP'（合并兼容两种键位手感）
                down:  [KEY.DOWN, KEY.DOWN_ALT],
                left:  [KEY.LEFT, KEY.LEFT_ALT],
                right: [KEY.RIGHT, KEY.RIGHT_ALT],
                shoot: [KEY.SHOOT],
            };
        }
        else
        {
            // 2P 预留（后续可使用数字键盘等）
            this._keys = {
                up:    ['UP'],
                down:  ['DOWN'],
                left:  ['LEFT'],
                right: ['RIGHT'],
                shoot: ['ENTER'],
            };
        }

        // 用 Phaser 的 addKeys 一次性注册
        this._keyRefs = {};
        for (const action of Object.keys(this._keys))
        {
            this._keyRefs[action] = this._keys[action].map(k => keyboard.addKey(k));
        }
    }

    /**
     * 按优先级读取方向：后按优先。
     * 为了简化最小闭环：优先级 UP > LEFT > DOWN > RIGHT
     * （后续可升级成「记录按键按下时间戳，取最新」）
     */
    _readDirection ()
    {
        const r = this._keyRefs;
        if (this._anyDown(r.up))    return DIRECTION.UP;
        if (this._anyDown(r.left))  return DIRECTION.LEFT;
        if (this._anyDown(r.down))  return DIRECTION.DOWN;
        if (this._anyDown(r.right)) return DIRECTION.RIGHT;
        return null;
    }

    _isShootPressed ()
    {
        return this._anyJustDown(this._keyRefs.shoot);
    }

    /** 多键其一按下（持续触发） */
    _anyDown (keys)
    {
        return keys.some(k => k.isDown);
    }

    /** 多键其一刚按下（仅本帧触发一次，避免连发） */
    _anyJustDown (keys)
    {
        return keys.some(k =>
        {
            // Phaser Key 的 JustDown 在单帧内会自动复位
            if (typeof k.isDown === 'boolean' && k.justDown) return true;
            // 兼容没有 justDown 标记的情况，退化为"按下即触发"（但由于有冷却限制也不会失控连发）
            return k.isDown;
        });
    }
}
