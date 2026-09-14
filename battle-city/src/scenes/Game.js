/**
 * 游戏主场景 Game —— 最小闭环（阶段 2 骨架）
 * ----------------------------------------------------------------
 * 已接入：
 *   ① 占位地图渲染：按 LEVEL_MAPS[0] 的 tiles 数字矩阵逐格画方块，颜色与 constants.COLOR 对应
 *   ② 玩家坦克生成：1P 使用 LEVEL.playerSpawn[0] 瓦片坐标
 *   ③ 键盘输入：WASD/方向键 移动，Space 射击，P 暂停（调试）
 *   ④ 子弹对象池：ObjectPool 管理 30 颗 Bullet，射击 → 归还 循环复用
 *   ⑤ 子弹 ↔ 砖墙 碰撞：命中后摧毁砖（该瓦片置空）+ 归还子弹
 *   ⑥ 子弹 ↔ 钢墙 碰撞：普通子弹直接反弹消失，无伤害（保留破钢墙等级为后续扩展）
 *   ⑦ 坦克 ↔ 边界砖墙 碰撞：使用 Physics collider 禁止穿过（仅玩家与砖块层）
 *   ⑧ 分值飘字基础设施：_showScorePopup(x, y, score) 用 score_100~500 纹理做上浮淡出，
 *      敌军系统（阶段 3）接入后由 onDead 钩子调用
 *   ⑨ 敌军出生动画基础设施：_playEnemySpawnEffect(x, y, onDone) 用 enemy_spawn spritesheet
 *      播放 4 帧闪烁动画后回调 onDone，敌军系统（阶段 3）在生成 EnemyTank 前调用
 *
 * 未接入（留给后续迭代）：
 *   - 敌军坦克（阶段 3）→ 接入后调用 _playEnemySpawnEffect / _showScorePopup
 *   - 基地被毁 / 胜负判定
 *   - 子弹 ↔ 坦克 碰撞（装甲血量/玩家死亡复活）
 *   - 道具、HUD、GameOver 界面（阶段 4）
 */
class Game extends Phaser.Scene
{
    constructor ()
    {
        super(SCENE_KEY.GAME);
    }

    init (data)
    {
        // 支持从上一场景传入：{ level: 1 }；默认第 1 关
        this.levelNumber = (data && typeof data.level === 'number') ? data.level : 1;
    }

    create ()
    {
        console.log('---game---');

        // ——— 1) 加载关卡数据 ———
        this.level = MAP_UTIL.getLevel(this.levelNumber);
        this._debugText(`关卡 ${this.level.id} · ${this.level.name}`, 16, 16);

        // ——— 2) 渲染占位瓦片地图 + 注册静态物理体 ———
        this._buildTileMap();

        // ——— 3) 子弹对象池（预热 30 颗，上限 ≈ 同屏敌军 4 + 玩家 2 的子弹之和绰绰有余）———
        this.bulletPool = new ObjectPool(this, 'bullet', Bullet, { initialSize: 30 });
        // 为子弹绑定「自销毁」回调（子弹 tickOutOfBounds 命中时会调用）
        this._bindBulletSelfDespawn();

        // ——— 4) 生成玩家坦克 ———
        this._buildPlayer();

        // ——— 5) 碰撞：子弹 ←→ 瓦片层（砖墙/钢墙/基地/水） ———
        this._buildBulletVsTileCollider();

        // ——— 6) 碰撞：玩家 ←→ 瓦片层（坦克阻挡瓦片集合） ———
        this._buildPlayerVsTileCollider();

        // ——— 7) 监听场景关闭 → 清理对象池（防内存泄漏 §7 陷阱 1）———
        this.events.on('shutdown', () => this._cleanup());
        this.events.on('destroy',  () => this._cleanup());

        // 调试 HUD：池状态
        this._hudText = this.add.text(GAME_WIDTH - 16, 16, '', {
            font: '12px monospace',
            color: '#ffffff',
        }).setOrigin(1, 0);
    }

    update (time, delta)
    {
        if (!this.player || !this.player.alive) return;

        // ——— 1) 读玩家键盘 → 移动 / 射击 ———
        this.player.tickInput(time);

        // ——— 2) 遍历在用子弹：检测出界 + 自销毁 ———
        for (const bullet of this.bulletPool._used)
        {
            bullet.tickOutOfBounds();
        }

        // ——— 3) 调试 HUD ———
        const s = this.bulletPool.stats();
        this._hudText.setText([
            `子弹池：free=${s.free} used=${s.used} peak=${s.peak}`,
            `玩家生命：${this.player.hp}  方向：${this.player.getDirection()}  同屏子弹：${this.player.bulletsInAir}/${this.player.cfg.maxBullets}`,
        ]);
    }

    // =============================================================
    // 子构建函数：瓦片地图（占位矩形 + 静态物理体）
    // =============================================================
    _buildTileMap ()
    {
        // 存两层瓦片数据：
        //   this.tileGrid[row][col]      → 当前 TILE 类型（砖墙被打空后会变 0，便于二次查询）
        //   this.tileSprites[row][col]   → 对应的 Phaser Rectangle（销毁/替换时用）
        this.tileGrid = [];
        this.tileSprites = [];

        // 玩家阻挡瓦片的静态物理组（所有阻挡瓦片加入该组，统一与坦克碰撞）
        this.tileBlockGroup = this.physics.add.staticGroup();
        // 子弹碰撞瓦片组：包含砖/钢/基地等可被子弹命中的瓦片（水与冰不参与）
        this.tileBulletHitGroup = this.physics.add.staticGroup();

        for (let r = 0; r < MAP_UTIL.ROWS; r++)
        {
            this.tileGrid[r] = [];
            this.tileSprites[r] = [];

            for (let c = 0; c < MAP_UTIL.COLS; c++)
            {
                const value = this.level.tiles[r][c];
                this.tileGrid[r][c] = value;

                const pos = MAP_UTIL.tileToWorld(c, r);
                let sprite = null;

                switch (value)
                {
                    case TILE.BRICK:
                        sprite = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, COLOR.BRICK, 1)
                            .setStrokeStyle(1, 0x000000, 0.4);
                        this.tileBlockGroup.add(sprite, true);   // 阻挡坦克
                        this.tileBulletHitGroup.add(sprite, true); // 可被子弹命中
                        break;

                    case TILE.STEEL:
                        sprite = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, COLOR.STEEL, 1)
                            .setStrokeStyle(2, 0xffffff, 0.6);
                        this.tileBlockGroup.add(sprite, true);
                        this.tileBulletHitGroup.add(sprite, true);
                        break;

                    case TILE.WATER:
                        sprite = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, COLOR.WATER, 0.9)
                            .setStrokeStyle(1, 0xffffff, 0.2);
                        this.tileBlockGroup.add(sprite, true);   // 坦克不可通过
                        // 水：子弹可通过 → 不加入 bulletHitGroup
                        break;

                    case TILE.GRASS:
                        // 草地：坦克/子弹皆可通过，但需要渲染在坦克之上 → depth = 坦克 + 1
                        sprite = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, COLOR.GRASS, 0.75)
                            .setDepth(TANK.DEPTH + 1);
                        // 不加入任何物理组（纯装饰）
                        break;

                    case TILE.ICE:
                        sprite = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, 0xbce9ff, 0.55)
                            .setStrokeStyle(1, 0xffffff, 0.35);
                        // 冰面：坦克可通过 → 不阻挡
                        break;

                    case TILE.BASE:
                        // 基地 2×2：每格仅保留透明碰撞体（阻挡坦克 + 可被子弹命中）
                        // 视觉上在 2×2 中心统一放一张 eagle_normal 老鹰图（见循环结束后）
                        sprite = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, 0x000000, 0);
                        this.tileBlockGroup.add(sprite, true);
                        this.tileBulletHitGroup.add(sprite, true);
                        break;

                    case TILE.BASE_RUINED:
                        // 基地废墟：仅阻挡坦克（子弹不再触发二次命中逻辑）
                        sprite = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, 0x000000, 0);
                        this.tileBlockGroup.add(sprite, true);
                        break;

                    default:
                        // EMPTY：保持空
                        sprite = null;
                        break;
                }

                if (sprite)
                {
                    // 把瓦片元信息挂在 sprite 上，碰撞时可以反查 row/col/type
                    sprite.setData('tile', { row: r, col: c, value });
                }
                this.tileSprites[r][c] = sprite;
            }
        }

        // —— 基地视觉层：在 2×2 中心放一张完整老鹰图，scale=2 覆盖 64×64 ——
        //   命中时再通过 this.baseEagle.setTexture('eagle_destroyed') 切换为折断旗
        const bc = MAP_UTIL.baseCenter(this.level);
        this.baseEagle = this.add.image(bc.x, bc.y, 'eagle_normal')
            .setScale(2);
    }

    // =============================================================
    // 子构建函数：玩家坦克（1P）
    // =============================================================
    _buildPlayer ()
    {
        const spawnTile = this.level.playerSpawn[0];
        const pos = MAP_UTIL.tileToWorld(spawnTile.col, spawnTile.row);

        // PlayerTank(scene, x, y, playerIndex, level, texture)
        this.player = new PlayerTank(this, pos.x, pos.y, 0, 0, '');

        // 预先对齐玩家出生方向（与 playerSpawn.dir 一致：UP）
        this.player.setDirection(spawnTile.dir || DIRECTION.UP);

        // 射击钩子 → 从对象池取一颗子弹
        this.player.onShoot = (tank, bulletData) =>
        {
            this.bulletPool.spawn(bulletData.x, bulletData.y, {
                direction:   bulletData.direction,
                owner:       bulletData.owner,
                speed:       bulletData.speed,
                damage:      bulletData.damage,
                pierceSteel: bulletData.pierceSteel,
                sourceTank:  tank,
            });
        };

        // 死亡钩子 → 调试输出；后续替换为 GameOver/重生逻辑
        this.player.onDead = (tank) =>
        {
            console.log(`玩家 ${tank.playerIndex} 被击毁`);
            this._debugText('你被击毁了！刷新页面重开', GAME_WIDTH / 2, GAME_HEIGHT / 2, true);
        };
    }

    // =============================================================
    // 子构建函数：子弹 ↔ 瓦片 碰撞处理
    // =============================================================
    _buildBulletVsTileCollider ()
    {
        // 把对象池 _used 集合当做动态"组"处理（Arcade 支持传入 Phaser Group 或包含 getChildren 的数组/集合包装）
        // 由于 ObjectPool 用 Set 存储，我们转成一个带 getChildren 的轻量对象：
        const bulletsAsGroup = {
            getChildren: () => Array.from(this.bulletPool._used),
        };

        this.physics.add.collider(bulletsAsGroup, this.tileBulletHitGroup, (bullet, tileSprite) =>
        {
            // 重叠可能被多次触发；同一次只处理一次
            if (!bullet.alive) return;

            const info = tileSprite.getData('tile');
            if (!info) return;

            const type = this.tileGrid[info.row][info.col];
            const handled = this._resolveBulletTileHit(bullet, info.row, info.col, type, tileSprite);
            if (handled) this.bulletPool.despawn(bullet);
        });
    }

    /**
     * 处理子弹命中瓦片：销毁砖 / 被钢墙阻挡 / 摧毁基地
     * @returns {boolean} true 表示"子弹已消耗需销毁"；false 表示子弹继续飞行
     */
    _resolveBulletTileHit (bullet, row, col, type, tileSprite)
    {
        switch (type)
        {
            case TILE.BRICK:
                // 砖墙：被普通/穿甲弹皆可一击摧毁一格
                this._destroyTile(row, col);
                return true;

            case TILE.STEEL:
                // 钢墙：仅 pierceSteel=true 的子弹可摧毁（等级 3 玩家）
                if (bullet.pierceSteel)
                {
                    this._destroyTile(row, col);
                }
                // 无论是否破坏，钢墙始终阻挡子弹
                return true;

            case TILE.BASE:
                // 基地：任一子弹命中 → 判负
                // 同步把 2×2 共 4 个格子全部替换为 BASE_RUINED（移除子弹碰撞，避免重复触发）
                const bt = this.level.baseTile;
                for (let dr = 0; dr < 2; dr++)
                {
                    for (let dc = 0; dc < 2; dc++)
                    {
                        this._destroyTile(bt.row + dr, bt.col + dc, TILE.BASE_RUINED);
                    }
                }
                // 视觉切换为折断旗
                if (this.baseEagle && this.baseEagle.active)
                {
                    this.baseEagle.setTexture('eagle_destroyed');
                }
                console.log('基地被击毁！Game Over');
                this._debugText('基地被击毁！Game Over', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 32, true);
                // 后续可 this.scene.start(SCENE_KEY.GAME_OVER)
                this.physics.pause();  // 暂停物理，子弹/坦克停止运动，画面静止看结果
                return true;

            default:
                // 理论上 EMPTY/WATER/ICE/GRASS 不在 bulletHitGroup 里，不会到这
                return false;
        }
    }

    /** 将某格瓦片清空并销毁图形；可选设置为指定「残留类型」（如 BASE_RUINED） */
    _destroyTile (row, col, remainType = TILE.EMPTY)
    {
        const sprite = this.tileSprites[row][col];
        if (sprite && sprite.active)
        {
            // 从所有可能的静态物理组移除（destroy 会自动 removeFromGroup）
            sprite.destroy();
        }
        this.tileSprites[row][col] = null;
        this.tileGrid[row][col] = remainType;

        // —— 残留类型为 BASE_RUINED：重建一个仅阻挡坦克的透明碰撞体 ——
        //   （避免被毁后坦克能开进废墟格；且不再加入 tileBulletHitGroup，子弹不会重复命中）
        if (remainType === TILE.BASE_RUINED)
        {
            const pos = MAP_UTIL.tileToWorld(col, row);
            const ruin = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, 0x000000, 0);
            this.tileBlockGroup.add(ruin, true);
            ruin.setData('tile', { row, col, value: TILE.BASE_RUINED });
            this.tileSprites[row][col] = ruin;
        }
    }

    // =============================================================
    // 子构建函数：玩家坦克 ↔ 瓦片（阻挡层）碰撞
    // =============================================================
    _buildPlayerVsTileCollider ()
    {
        this.physics.add.collider(this.player, this.tileBlockGroup);
    }

    // =============================================================
    // 子弹出界 → 自动归还池
    // =============================================================
    _bindBulletSelfDespawn ()
    {
        const pool = this.bulletPool;
        // 把 despawn 封装给子弹 onDespawn 回调
        Object.defineProperty(Bullet.prototype, '__poolBound', { value: true, writable: false });
        // 这里在子弹 spawn 时挂载更清晰，但为简化实现直接写一个全局钩子：
        // 在 tickOutOfBounds 中会触发 bullet.onDespawn，因此在 spawn 处统一挂。
        const oldSpawn = Bullet.prototype.spawn;
        const that = this;
        Bullet.prototype.spawn = function (x, y, params)
        {
            oldSpawn.call(this, x, y, params);
            this.onDespawn = (b) => pool.despawn(b);
        };
    }

    // =============================================================
    // 分值飘字：击毁敌军时在残骸位置显示对应分值图标，上浮淡出后销毁
    // =============================================================
    /**
     * @param {number} x     飘字起点中心(世界坐标)
     * @param {number} y     飘字起点中心(世界坐标)
     * @param {number} score 分值,仅支持 100/200/300/400/500(对应 Preloader 已加载的 score_XXX 纹理)
     */
    _showScorePopup (x, y, score)
    {
        const key = `score_${score}`;
        // 防御:未加载的分值纹理直接跳过,避免 MissingTexture 黑框
        if (!this.textures.exists(key)) return;

        // 原图 32×32,缩半显示更贴近经典 Battle City 飘字尺寸
        const popup = this.add.image(x, y, key)
            .setDepth(TANK.DEPTH + 2)   // 高于坦克与瓦片,确保飘字可见
            .setScale(0.5);

        // 上浮 24px + 淡出,完成后自动销毁(避免每帧累积显示对象)
        this.tweens.add({
            targets: popup,
            y: y - 24,
            alpha: 0,
            duration: 600,
            onComplete: () => popup.destroy(),
        });
    }

    // =============================================================
    // 敌军出生动画：在生成点播放 4 帧闪烁特效，完成后回调以生成实际敌军
    // =============================================================
    /**
     * @param {number}   x       出生点中心(世界坐标)
     * @param {number}   y       出生点中心(世界坐标)
     * @param {Function} onDone  动画完成回调(通常在此回调里 new EnemyTank)
     */
    _playEnemySpawnEffect (x, y, onDone)
    {
        // 防御:纹理缺失时直接回调,避免阻塞敌军生成流程
        if (!this.textures.exists('enemy_spawn'))
        {
            if (onDone) onDone();
            return;
        }

        // 经典 Battle City 出生动画:4 帧星形闪烁,每帧 80ms,不循环
        // 若该 anim 尚未注册则先注册(场景内只注册一次)
        if (!this.anims.exists('enemy_spawn_anim'))
        {
            this.anims.create({
                key: 'enemy_spawn_anim',
                frames: this.anims.generateFrameNumbers('enemy_spawn', { start: 0, end: 3 }),
                frameRate: 12,     // 4 帧 / ~333ms,贴近原版节奏
                repeat: 0,
            });
        }

        const fx = this.add.sprite(x, y, 'enemy_spawn')
            .setDepth(TANK.DEPTH + 2);   // 高于坦克与瓦片

        fx.once('animationcomplete', () =>
        {
            fx.destroy();
            if (onDone) onDone();
        });
        fx.play('enemy_spawn_anim');
    }

    // =============================================================
    // 调试/辅助文本
    // =============================================================
    _debugText (msg, x, y, centered = false)
    {
        const t = this.add.text(x, y, msg, {
            font: '16px monospace',
            color: '#ffffff',
            backgroundColor: '#00000080',
            padding: { x: 6, y: 3 },
        });
        if (centered) t.setOrigin(0.5);
        return t;
    }

    // =============================================================
    // 清理：场景切换/重开时归还并销毁池内所有对象（§7 陷阱 1）
    // =============================================================
    _cleanup ()
    {
        if (this.bulletPool) this.bulletPool.shutdown();
    }
}
