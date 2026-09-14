/**
 * 子弹实体 Bullet
 * ----------------------------------------------------------------
 * 继承 Arcade Sprite，以物理速度方式飞行，支持：
 *   - spawn / despawn（与 ObjectPool 协作）
 *   - 归属方（PLAYER / ENEMY），碰撞回调中据此过滤目标
 *   - 命中伤害、穿甲等级（能否打穿钢墙）
 *   - 出界自动归还对象池
 *   - 贴图：bullet spritesheet（4 方向帧），按方向 setFrame 切换
 *
 * 设计要点（对应 AGENTS §7 陷阱）：
 *   - 碰撞回调由场景统一处理（保持 Bullet 单一职责）
 *   - despawn 由场景在「命中、出界、场景停止」三处都会调用
 *   - spawn 时重置 active/visible/velocity/方向/属性，避免继承上一次状态
 */

// 方向 → bullet spritesheet 帧索引
// 合并顺序：0=up, 1=right, 2=down, 3=left
const BULLET_FRAME = Object.freeze({
    [DIRECTION.UP]:    0,
    [DIRECTION.RIGHT]: 1,
    [DIRECTION.DOWN]:  2,
    [DIRECTION.LEFT]:  3,
});

class Bullet extends Phaser.Physics.Arcade.Sprite
{
    constructor (scene, x, y)
    {
        // 子弹贴图：Preloader 已加载的 bullet spritesheet（4 方向帧）
        super(scene, x, y, 'bullet');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 显示与物理尺寸
        this.setSize(BULLET.SIZE, BULLET.SIZE);
        this.setDisplaySize(BULLET.SIZE, BULLET.SIZE);
        this.setDepth(BULLET.DEPTH);

        // 碰撞体：与 SIZE 一致（子弹无需额外偏移）
        this.body.setSize(BULLET.SIZE, BULLET.SIZE);

        // 子弹不被"坦克撞击"顶飞（碰撞处理时再做伤害结算）
        this.body.setImmovable(true);

        // 初始禁用（由 ObjectPool 调用 spawn 时启用）
        this.despawn();
    }

    // =============================================================
    // ObjectPool 接口：取出
    // params: { direction, owner, speed, damage, pierceSteel, sourceTank }
    // =============================================================
    spawn (x, y, params = {})
    {
        const dir    = params.direction || DIRECTION.UP;
        const vec    = DIRECTION_VECTOR[dir];
        const speed  = params.speed   || BULLET.SPEED;
        const damage = params.damage  || BULLET.DAMAGE_NORMAL;

        // 基础属性
        this.direction   = dir;
        this.owner       = params.owner       || BULLET_OWNER.PLAYER;
        this.damage      = damage;
        this.pierceSteel = !!params.pierceSteel;
        this.sourceTank  = params.sourceTank  || null;   // 打出这颗子弹的坦克引用（用于 notifyBulletDestroyed）
        this.alive       = true;

        // 激活 + 显示
        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;
        this.body.reset(x, y);   // 物理复位（清除上次残留速度）

        // 方向速度（用 vec * speed，避免 XY 叠加）
        this.setVelocity(vec.x * speed, vec.y * speed);

        // 同步方向视觉：按方向切换 spritesheet 帧
        this._applyDirectionFrame();
    }

    // =============================================================
    // ObjectPool 接口：归还
    // =============================================================
    despawn ()
    {
        if (!this.alive && !this.active) return; // 已停用则跳过

        this.alive = false;
        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
        this.setVelocity(0, 0);

        // 通知源头坦克扣减「同屏子弹计数」
        if (this.sourceTank && typeof this.sourceTank.notifyBulletDestroyed === 'function')
        {
            this.sourceTank.notifyBulletDestroyed();
            this.sourceTank = null;
        }
    }

    // =============================================================
    // 每帧更新：检查出界（由场景 update 中遍历 used bullets 调用）
    // ——为什么不用 Phaser worldbounds collide 事件？——
    //   子弹命中边界时我们希望"归还对象池"而非"反弹/停留"，
    //   主动在 update 中检测更直接，并避免多个事件监听器。
    // =============================================================
    tickOutOfBounds ()
    {
        if (!this.alive) return;

        const x = this.x;
        const y = this.y;
        if (
            x < -BULLET.SIZE || x > GAME_WIDTH  + BULLET.SIZE ||
            y < -BULLET.SIZE || y > GAME_HEIGHT + BULLET.SIZE
        )
        {
            // 由持有池的场景负责 despawn（这里只做标记），
            // 场景可选择调用「池.despawn(bullet)」或我们暴露一个 selfDespawn 回调。
            if (typeof this.onDespawn === 'function')
            {
                this.onDespawn(this);
            }
        }
    }

    // =============================================================
    // 内部：按方向切换 spritesheet 帧
    // =============================================================
    _applyDirectionFrame ()
    {
        const frame = BULLET_FRAME[this.direction];
        if (frame !== undefined)
        {
            this.setFrame(frame);
        }
    }
}
