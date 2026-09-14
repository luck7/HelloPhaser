/**
 * 对象池 ObjectPool：复用子弹、爆炸等生命周期短、数量多的对象。
 * ----------------------------------------------------------------
 * 设计目标：解决 AGENTS §7 陷阱 2「每帧 update 里 add.sprite/new 对象 → 帧率下降」。
 *
 * 使用方法（以子弹为例）：
 *   1) 在场景 create() 中创建一个池：
 *        const bulletPool = new ObjectPool(this, 'bullet', Bullet, { initialSize: 30 });
 *   2) 需要发射时：
 *        const b = bulletPool.spawn(x, y, { direction: 'up', owner: 'player', speed: 400 });
 *   3) 子弹失效（出界/命中）时：
 *        bulletPool.despawn(b);  // 等价于 b.despawn()
 *
 * 说明：
 *   - 池内所有对象必须暴露 `spawn()` 与 `despawn()` 方法（Bullet.js 已实现）；
 *   - 如传入的 Class 不满足，可在 options.wrapSpawn / wrapDespawn 中自定义桥接；
 *   - initialSize 表示预热的空闲对象数量，不够时池会自动扩容（建议设置略高于峰值）。
 */
class ObjectPool
{
    /**
     * @param {Phaser.Scene} scene        所属场景
     * @param {string}      key          调试用标签
     * @param {Function}    ClassCtor    对象构造函数（new ClassCtor(scene, x, y, initParams)）
     * @param {object}      [options]
     * @param {number}      [options.initialSize = 20]  预热数量
     * @param {Function}    [options.wrapSpawn] 可选：自定义 spawn 逻辑(obj, x, y, params) => void
     * @param {Function}    [options.wrapDespawn] 可选：自定义 despawn 逻辑(obj) => void
     */
    constructor (scene, key, ClassCtor, options = {})
    {
        this.scene = scene;
        this.key = key;
        this.Ctor = ClassCtor;

        this.wrapSpawn = options.wrapSpawn || ((obj, x, y, params) => obj.spawn(x, y, params));
        this.wrapDespawn = options.wrapDespawn || ((obj) => obj.despawn());

        this._free = [];        // 空闲池
        this._used = new Set(); // 正在使用的实例集合（便于快速查重）

        const size = options.initialSize || 20;
        for (let i = 0; i < size; i++) this._free.push(this._newInstance());

        // 调试信息（可选在 HUD 中展示）
        this._peak = 0;
    }

    /**
     * 从池内取出一个对象，初始化并返回；池空时自动扩容。
     * @param {number} x
     * @param {number} y
     * @param {object} [params] 传给 ClassCtor 实例 spawn() 的参数
     */
    spawn (x, y, params)
    {
        const obj = this._free.length > 0
            ? this._free.pop()
            : this._newInstance(); // 自动扩容

        this.wrapSpawn(obj, x, y, params);
        this._used.add(obj);
        if (this._used.size > this._peak) this._peak = this._used.size;
        return obj;
    }

    /**
     * 归还一个对象到空闲池；重复归还会被忽略避免二次污染。
     */
    despawn (obj)
    {
        if (!obj) return;
        if (!this._used.has(obj)) return; // 已在池中或从未被 spawn，跳过

        this.wrapDespawn(obj);
        this._used.delete(obj);
        this._free.push(obj);
    }

    /**
     * 全部归还并销毁（场景 shutdown 时调用，防内存泄漏）
     */
    shutdown ()
    {
        for (const obj of this._used) this.wrapDespawn(obj);
        this._used.clear();

        for (const obj of this._free)
        {
            if (typeof obj.destroy === 'function')
            {
                try { obj.destroy(true); } catch (e) { /* 忽略已销毁对象 */ }
            }
        }
        this._free.length = 0;
    }

    /** @returns {{free:number, used:number, peak:number}} 统计信息 */
    stats ()
    {
        return {
            free: this._free.length,
            used: this._used.size,
            peak: this._peak,
        };
    }

    // =============================================================
    // 内部：创建一个全新的实例（预热 / 扩容共用）
    // =============================================================
    _newInstance ()
    {
        // 构造时传入 (0, 0) 占位，后续 spawn 再移动到真实位置
        const inst = new this.Ctor(this.scene, 0, 0);
        // 新实例先进入"停用"状态（不可见、不参与物理）
        this.wrapDespawn(inst);
        return inst;
    }
}
