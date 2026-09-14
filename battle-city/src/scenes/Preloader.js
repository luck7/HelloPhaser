// Bulk asset loader. The block between the marker comments below is
// auto-generated from the project's asset list (Code Editor → Assets
// tab). Don't edit between the markers — your changes will be
// overwritten on the next Run. You can still add your own
// `this.load.*` lines anywhere outside the marker block.

class Preloader extends Phaser.Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        this.add.rectangle(cx, cy, 468, 32).setStrokeStyle(1, 0xffffff);
        const bar = this.add.rectangle(cx - 230, cy, 4, 28, 0xffffff);
        this.load.on('progress', (progress) =>
        {
            bar.width = 4 + (460 * progress);
        });
    }

    preload ()
    {
        /* phaser:assets:start */
        this.load.setCORS('anonymous');
        this.load.setPath('');
        /* phaser:assets:end */

        // === 手工资源加载（素材已放大 2x，瓦片/坦克单帧均为 32×32，与 constants.js 的 TILE_SIZE 对齐） ===

        // 坦克精灵图：每张 256×128，含 4 方向 × 2 动画帧 × 4 型号 = 32 帧
        // frameWidth/frameHeight 引用 TILE_SIZE(32)，对应放大后的单帧尺寸（原图 16×16 已统一放大一倍）
        const tankSheets = [
            'player_tank', 'enemy_basic', 'enemy_fast', 'enemy_armor',
            'player_tank_b', 'enemy_basic_b', 'enemy_fast_b', 'enemy_armor_b',
        ];
        tankSheets.forEach((key) =>
        {
            this.load.spritesheet(key, `assets/images/tanks/${key}.png`, {
                frameWidth: TILE_SIZE,
                frameHeight: TILE_SIZE,
            });
        });

        // 瓦片与地形（单图 32×32）
        // 注: tile_water_1/2/3 已合并为 spritesheet 'tile_water' (下方动画 spritesheet 段)
        const tiles = [
            'tile_brick', 'tile_steel', 'tile_grass', 'tile_ice', 'tile_solid',
            // 砖墙/钢墙的 4 种破坏状态：右半 / 下半 / 左半 / 上半
            'tile_brick_right', 'tile_brick_bottom', 'tile_brick_left', 'tile_brick_top',
            'tile_steel_right', 'tile_steel_bottom', 'tile_steel_left', 'tile_steel_top',
            // 老鹰基地：完好（鹰标）/ 被毁（折断旗）
            'eagle_normal', 'eagle_destroyed',
        ];
        tiles.forEach((key) =>
        {
            this.load.image(key, `assets/images/tiles/${key}.png`);
        });

        // 动画 spritesheet
        // 子弹方向帧 (bullets/bullet_spritesheet.png: 128×32, 0=up/1=right/2=down/3=left)
        // —— 水面 3 帧动画 (tiles/tile_water_spritesheet.png: 96×32, 0=wave1/1=wave2/2=wave3)
        // —— 敌军出生 4 帧 (effects/enemy_spawn_spritesheet.png: 128×32)
        // —— 大爆炸 2 帧 (effects/explosion_spritesheet.png: 128×64, 帧64×64, 2×2象限拼成)
        // —— 小爆炸 3 帧 (effects/small_explosion_spritesheet.png: 96×32, 子弹击中火光)
        // —— 防护罩 2 帧 (effects/shield_spritesheet.png: 64×32, 开场保护/盾牌道具闪烁)
        // —— 道具 7 帧 (powerups/powerup_spritesheet.png: 224×32, 0~6 对应各图标)
        this.load.spritesheet('bullet', 'assets/images/bullets/bullet_spritesheet.png', {
            frameWidth: TILE_SIZE,
            frameHeight: TILE_SIZE,
        });
        this.load.spritesheet('tile_water', 'assets/images/tiles/tile_water_spritesheet.png', {
            frameWidth: TILE_SIZE,
            frameHeight: TILE_SIZE,
        });
        this.load.spritesheet('enemy_spawn', 'assets/images/effects/enemy_spawn_spritesheet.png', {
            frameWidth: TILE_SIZE,
            frameHeight: TILE_SIZE,
        });
        // 大爆炸 (effects/explosion_spritesheet.png): frameWidth=64 = TILE_SIZE*2
        //   帧0 TL=8纯[0] TR=8纯[1] BL=8纯[4] BR=8纯[5]; 帧1 TL=8纯[2] TR=8纯[3] BL=8纯[6] BR=8纯[7]
        //   (随后按用户最终调整: small_explosion 不动, shield帧1 与 爆炸帧0左下 精准互换)
        this.load.spritesheet('explosion', 'assets/images/effects/explosion_spritesheet.png', {
            frameWidth: TILE_SIZE * 2,
            frameHeight: TILE_SIZE * 2,
        });
        this.load.spritesheet('powerup', 'assets/images/powerups/powerup_spritesheet.png', {
            frameWidth: TILE_SIZE,
            frameHeight: TILE_SIZE,
        });
        this.load.spritesheet('small_explosion', 'assets/images/effects/small_explosion_spritesheet.png', {
            frameWidth: TILE_SIZE,
            frameHeight: TILE_SIZE,
        });
        this.load.spritesheet('shield', 'assets/images/effects/shield_spritesheet.png', {
            frameWidth: TILE_SIZE,
            frameHeight: TILE_SIZE,
        });

        // 分值图标(击毁敌军时飘出的分数,单图 32×32)
        // score_100 / score_200 / score_300 / score_400 / score_500
        [100, 200, 300, 400, 500].forEach((score) =>
        {
            this.load.image(`score_${score}`, `assets/images/hud/score_${score}.png`);
        });

        // ASCII bitmap font (PNG + XML),覆盖 95 个可打印 ASCII 字符
        // 用于 HUD/分数/菜单等场景的像素风文本
        this.load.bitmapFont('PressStart2P', 'assets/fonts/press_start_2p.png', 'assets/fonts/press_start_2p.xml');

        // HUD 图标 (单图 32×32)
        // 注: font_01~10.png 已移除——ASCII 字符现由 bitmap font 覆盖
        //   (Preloader 上方已加载 PressStart2P 与 PublicPixel, 支持完整 95 个 ASCII 字符)
        // 注: 原 hud_enemy_icon(鹰标) / icon_flag(折断旗) 已移至 tiles/ 目录,
        //     对应键名改为 eagle_normal / eagle_destroyed, 见上方瓦片数组加载段

        // 游戏信息 UI spritesheet (ui/game_info_ui.png: 96×32, 3帧×32×32)
        // 帧0=player1_info(1P图标) 帧1=player2_info(2P图标) 帧2=stage_info(关卡旗帜)
        this.load.spritesheet('game_info_ui', 'assets/images/ui/game_info_ui.png', {
            frameWidth: TILE_SIZE,
            frameHeight: TILE_SIZE,
        });

        // 敌方坦克信息图标 (ui/enemy_info_ui.png: 32×32, 取自 enemy_basic 帧0=朝上)
        this.load.image('enemy_info_ui', 'assets/images/ui/enemy_info_ui.png');
    }

    create ()
    {
        /* phaser:assets:setup:start */
        /* phaser:assets:setup:end */

        console.log('<---preload---')        
        this.scene.start('MainMenu');
        console.log('---preload--->')
    }
}
