/**
 * 坦克基类 TankBase
 * ----------------------------------------------------------------
 * 封装玩家坦克与敌军坦克的共有逻辑：
 *   - 4 方向移动与速度控制（避免斜向过快，对应 §7 陷阱 4）
 *   - 射击冷却与同屏子弹数统计
 *   - 生命值、受击与死亡回调
 *   - 贴图方向同步（支持"有图"与"占位矩形"两种渲染模式）
 * 不处理：
 *   - 玩家键盘输入（交给 PlayerTank）
 *   - 敌军 AI 决策（交给 EnemyTank）
 *   - 子弹实体本身（交给 Bullet.js + 对象池）
 *
 * 继承：Phaser.Physics.Arcade.Sprite（有贴图）或回退成矩形 Graphics
 *       正式素材接入前默认用矩形占位，便于阶段 2 快速调试。
 */
class TankBase extends Phaser.Physics.Arcade.Sprite
{
    /**
     * @param {Phaser.Scene} scene     所属场景
     * @param {number}      x         出生点 X（世界坐标，中心对齐）
     * @param {number}      y         出生点 Y
     * @param {string}      [texture] 贴图键名；空字符串或 undefined 则退化为矩形占位
     * @param {object}      [config]  覆盖 TANK 默认值：{ speed, hp, shootCooldown, maxBullets, color }
     */
    constructor (scene, x, y, texture, config = {})
    {
        // 当未提供贴图时，用一个"仅构造一个空白 sprite + 占位 Graphics"的方式
        // 这样可以统一用 Sprite 的物理属性，而不需要分支成 Image/Graphics 两条路。
        // （空白 1×1 Sprite 在未正式贴图前不影响逻辑；占位矩形另建一个 child 显示）
        const useTexture = texture && texture.length > 0;
        super(scene, x, y, useTexture ? texture : '__EMPTY');

        // —— 加入场景显示列表与物理系统 ——
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // —— 合并配置（优先使用调用方传入）——
        this.cfg = Object.assign({
            speed:          TANK.DEFAULT_SPEED,
            hp:             TANK.DEFAULT_HP,
            shootCooldown:  TANK.DEFAULT_SHOOT_COOLDOWN,
            maxBullets:     TANK.DEFAULT_MAX_BULLETS,
            color:          COLOR.PLAYER_TANK,
            owner:          BULLET_OWNER.PLAYER, // 子弹归属：子类构造时会覆盖
            bulletLevel:    1,
            pierceSteel:    false,
        }, config);

        // —— 显示层级与尺寸 ——
        this.setDepth(TANK.DEPTH);
        this.setSize(TANK.BODY_SIZE, TANK.BODY_SIZE);
        this.setDisplaySize(TANK.BODY_SIZE, TANK.BODY_SIZE);

        // —— 物理碰撞体 ——
        this.setCollideWorldBounds(true);
        this.body.setSize(TANK.COLLIDER_SIZE, TANK.COLLIDER_SIZE);
        this.body.setOffset(
            (TANK.BODY_SIZE - TANK.COLLIDER_SIZE) / 2,
            (TANK.BODY_SIZE - TANK.COLLIDER_SIZE) / 2,
        );
        // 坦克不接受外力反弹，否则子弹一碰就会被顶飞
        this.body.setImmovable(true);

        // —— 运行时状态 ——
        this.direction  = DIRECTION.UP;   // 默认朝上（经典 Battle City 开场方向）
        this.isMoving   = false;          // 当前帧是否在移动（用于履带动画）
        this.hp         = this.cfg.hp;
        this.alive      = true;           // 是否存活（死亡后禁止再次进入死亡流程）
        this.invincible = false;          // 无敌状态（盾牌道具/开场保护）

        // —— 射击控制 ——
        this.lastShootAt = 0;                 // 上次射击时刻（毫秒时间戳）
        this.bulletsInAir = 0;                // 当前同屏已发射但未销毁的子弹数

        // —— 回调钩子：子类或场景可挂接 ——
        this.onDead    = null; // (tank, killerBullet) => void
        this.onShoot   = null; // (tank, bulletInstance) => void
        this.onHit     = null; // (tank, bullet) => boolean 返回 false 表示忽略本次伤害

        // —— 无贴图模式：绘制一个带方向提示的矩形 ——
        if (!useTexture)
        {
            this._buildPlaceholderGraphic();
        }

        // 方向初始化一次（占位图形需要画一次方向指示）
        this._applyDirectionVisual();
    }

    // =============================================================
    // 对外：设置 / 查询方向
    // =============================================================

    /**
     * 设置朝向并同步视觉；若正在移动，同时把速度对齐到新方向
     * @param {string} dir DIRECTION.*
     */
    setDirection (dir)
    {
        if (!DIRECTION_VECTOR[dir]) return; // 防御非法值
        if (this.direction === dir) return;

        this.direction = dir;
        this._applyDirectionVisual();

        // 如果坦克当前正处于移动状态（键盘按住），需立即把速度切到新方向
        if (this.isMoving)
        {
            this._applyVelocityToDirection();
        }
    }

    /**
     * 获取当前朝向
     * @returns {string} DIRECTION.*
     */
    getDirection ()
    {
        return this.direction;
    }

    // =============================================================
    // 对外：移动控制（子类 update 中调用）
    // =============================================================

    /**
     * 沿指定方向以配置速度移动。
     * 每次调用都会先清零另一轴速度，避免同时按 W+D 斜向过快（§7 陷阱 4）。
     * 无参调用（如 stop）可停在原地。
     *
     * @param {string|null} [dir] DIRECTION.*；传 null/undefined 则停止
     */
    move (dir)
    {
        if (!this.alive) return;

        // 停止
        if (!dir)
        {
            this.isMoving = false;
            this.body.setVelocity(0, 0);
            return;
        }

        // 方向不一致先对齐朝向（保证射击方向=移动方向）
        if (this.direction !== dir)
        {
            this.setDirection(dir);
        }

        this.isMoving = true;
        this._applyVelocityToDirection();
    }

    /**
     * 停止移动（与 move(null) 等价，语义更清晰的别名）
     */
    stop ()
    {
        this.move(null);
    }

    // =============================================================
    // 对外：射击
    // =============================================================

    /**
     * 尝试射击；受冷却时间与同屏子弹数双重限制。
     * 子弹实体本身不在此 new（避免耦合 Bullet），
     * 而是通过 onShoot 回调由场景交给 ObjectPool 生成。
     *
     * @returns {boolean} true 表示"确实开了一枪"，场景据此计数
     */
    tryShoot (nowMs)
    {
        if (!this.alive) return false;
        if (this.bulletsInAir >= this.cfg.maxBullets) return false;

        const time = (typeof nowMs === 'number') ? nowMs : this.scene.time.now;
        if (time - this.lastShootAt < this.cfg.shootCooldown) return false;

        this.lastShootAt = time;
        this.bulletsInAir += 1;

        // 通过回调把"生成子弹"的职责交给场景 / 对象池
        if (typeof this.onShoot === 'function')
        {
            const bulletData = {
                x:         this.x,
                y:         this.y,
                direction: this.direction,
                owner:     this.cfg.owner,
                speed:     this.cfg.bulletLevel >= 2 ? BULLET.SPEED_FAST : BULLET.SPEED,
                damage:    this.cfg.bulletLevel >= 2 ? BULLET.DAMAGE_ARMOR : BULLET.DAMAGE_NORMAL,
                pierceSteel: this.cfg.pierceSteel,
                tankRef:   this,
            };
            this.onShoot(this, bulletData);
        }

        return true;
    }

    /**
     * 当坦克发射的某颗子弹"飞出场/命中"被销毁时，
     * 场景需调用此方法减少子弹计数，否则后续将无法射击。
     */
    notifyBulletDestroyed ()
    {
        if (this.bulletsInAir > 0) this.bulletsInAir -= 1;
    }

    // =============================================================
    // 对外：伤害 / 死亡
    // =============================================================

    /**
     * 被子弹命中。
     * 无敌或已死时直接忽略；onHit 钩子若返回 false 也忽略。
     *
     * @param {object} bullet 命中的子弹实例（至少包含 damage / owner 字段）
     * @returns {boolean} true 表示造成伤害；false 表示被忽略
     */
    takeHit (bullet)
    {
        if (!this.alive) return false;
        if (this.invincible) return false;

        // 外部钩子可用于"装甲先扣护甲不扣血"等特殊规则
        if (typeof this.onHit === 'function' && this.onHit(this, bullet) === false)
        {
            return false;
        }

        const damage = (bullet && typeof bullet.damage === 'number') ? bullet.damage : 1;
        this.hp -= damage;

        if (this.hp <= 0)
        {
            this._die(bullet);
        }

        return true;
    }

    /**
     * 设置无敌状态（盾牌道具/开场保护/暂停等）
     * @param {boolean} flag   是否无敌
     * @param {number}  [durationMs] 毫秒；不传则永久，需手动再关
     */
    setInvincible (flag, durationMs)
    {
        this.invincible = !!flag;

        // 视觉反馈：占位图闪烁 或 贴图 tint
        if (this._placeholderRect)
        {
            this._placeholderRect.setAlpha(this.invincible ? 0.6 : 1.0);
        }
        else
        {
            this.clearTint();
            if (this.invincible) this.setTint(0x88aaff);
        }

        if (flag && typeof durationMs === 'number' && durationMs > 0)
        {
            this.scene.time.delayedCall(durationMs, () =>
            {
                this.setInvincible(false);
            });
        }
    }

    /**
     * 立即销毁坦克（场景清理用）；不触发 onDead 回调
     */
    dispose ()
    {
        if (!this.active) return;
        if (this._placeholderRect)
        {
            this._placeholderRect.destroy();
            this._placeholderRect = null;
            this._placeholderArrow = null;
        }
        this.destroy();
    }

    // =============================================================
    // 内部辅助
    // =============================================================

    /**
     * 根据 direction 计算速度分量并设置；
     * 每次设置前先清零另一轴，避免斜向叠加。
     */
    _applyVelocityToDirection ()
    {
        const vec = DIRECTION_VECTOR[this.direction];
        this.body.setVelocity(
            vec.x * this.cfg.speed,
            vec.y * this.cfg.speed,
        );
    }

    /**
     * 根据方向同步贴图旋转或占位图形的箭头方向。
     * 正式贴图接入后可覆盖此方法使用 setAngle + 动画帧切换。
     */
    _applyDirectionVisual ()
    {
        // —— 有贴图：按角度旋转 ——
        if (this.texture && this.texture.key !== '__EMPTY')
        {
            this.setAngle(DIRECTION_ANGLE[this.direction]);
            return;
        }

        // —— 无贴图（占位图）：调整箭头指示位置 ——
        if (!this._placeholderArrow) return;

        const offset = TANK.BODY_SIZE / 2 - 2;
        const vec = DIRECTION_VECTOR[this.direction];

        // 箭头相对坦克中心偏移：朝哪个方向就贴在哪一侧
        this._placeholderArrow.setPosition(vec.x * offset, vec.y * offset);
    }

    /**
     * 构建占位视觉：带中心箭头的纯色方块
     */
    _buildPlaceholderGraphic ()
    {
        // 坦克主体方块（作为 Sprite 的子元素，便于同步旋转/位移）
        this._placeholderRect = this.scene.add.rectangle(
            0, 0,
            TANK.BODY_SIZE, TANK.BODY_SIZE,
            this.cfg.color, 1,
        ).setStrokeStyle(1, 0x000000, 0.5);

        // 方向指示箭头（小三角）
        this._placeholderArrow = this.scene.add.triangle(
            0, - (TANK.BODY_SIZE / 2 - 2),
            0, -4, 4, 4, -4, 4,
            0xffffff, 0.9,
        );

        // 把两个图形绑定为自身 children（不占独立 depth，随坦克移动）
        this.add([this._placeholderRect, this._placeholderArrow]);
    }

    /**
     * 死亡流程：标记、停止、回调通知、销毁。
     * 爆炸特效与得分由场景在 onDead 中处理，保持 TankBase 单一职责。
     */
    _die (bullet)
    {
        this.alive = false;
        this.body.setVelocity(0, 0);
        this.setActive(false);

        if (typeof this.onDead === 'function')
        {
            this.onDead(this, bullet);
        }

        this.dispose();
    }
}
