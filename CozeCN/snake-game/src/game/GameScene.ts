import Phaser from 'phaser';
import {
  BEST_SCORE_KEY,
  BOARD,
  CELL,
  COLORS,
  DIR_VECTORS,
  GRID_SIZE,
  INITIAL_SPEED_MS,
  MIN_SPEED_MS,
  OPPOSITE,
  SCORE_PER_FOOD,
  SPEED_STEP_MS,
  type Dir,
  type Point,
} from './constants';
import { playDeath, playEat, playStart } from './sound';

type GameState = 'ready' | 'running' | 'over';

export class GameScene extends Phaser.Scene {
  private snake: Point[] = [];
  private food: Point = { x: 0, y: 0 };
  private dir: Dir = 'right';
  private pendingDirs: Dir[] = [];
  private state: GameState = 'ready';
  private score = 0;
  private best = 0;
  private speed = INITIAL_SPEED_MS;
  private stepAcc = 0;
  private gfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('game');
  }

  create(): void {
    this.best = this.loadBest();
    this.drawBoard();
    this.gfx = this.add.graphics();
    this.resetGame();

    this.game.events.on('dir-input', (d: Dir) => this.queueDirection(d));
    this.game.events.on('start-input', () => this.handleStartInput());

    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      document.removeEventListener('visibilitychange', this.onVisibility);
    });
  }

  private onVisibility = (): void => {
    if (document.hidden) {
      this.stepAcc = 0;
    }
  };

  update(_time: number, delta: number): void {
    if (this.state === 'running') {
      // 限制单帧跨度，避免切后台后一次性追多个节拍
      this.stepAcc += Math.min(delta, 100);
      while (this.stepAcc >= this.speed && this.state === 'running') {
        this.stepAcc -= this.speed;
        this.step();
      }
    }
    this.drawEntities();
  }

  private handleStartInput(): void {
    if (this.state === 'ready') {
      this.state = 'running';
      playStart();
      this.emitState();
    } else if (this.state === 'over') {
      this.resetGame();
      this.state = 'running';
      playStart();
      this.emitState();
    }
  }

  private resetGame(): void {
    const mid = Math.floor(GRID_SIZE / 2);
    this.snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    this.dir = 'right';
    this.pendingDirs = [];
    this.score = 0;
    this.speed = INITIAL_SPEED_MS;
    this.stepAcc = 0;
    this.food = this.spawnFood();
    this.emitState();
  }

  private queueDirection(next: Dir): void {
    if (this.state !== 'running') return;
    const reference = this.pendingDirs.length
      ? this.pendingDirs[this.pendingDirs.length - 1]
      : this.dir;
    // 忽略同向与直接反向（防止同一节拍内 180° 掉头）
    if (next === reference || next === OPPOSITE[reference]) return;
    if (this.pendingDirs.length < 2) this.pendingDirs.push(next);
  }

  private step(): void {
    if (this.pendingDirs.length > 0) {
      this.dir = this.pendingDirs.shift() as Dir;
    }

    const v = DIR_VECTORS[this.dir];
    const head = this.snake[0];
    const next: Point = { x: head.x + v.x, y: head.y + v.y };

    // 撞墙
    if (
      next.x < 0 ||
      next.x >= GRID_SIZE ||
      next.y < 0 ||
      next.y >= GRID_SIZE
    ) {
      this.die();
      return;
    }

    const willEat = next.x === this.food.x && next.y === this.food.y;

    // 撞身体：未进食时尾巴会移走，所以最后一节不算碰撞
    const bodyToCheck = willEat ? this.snake : this.snake.slice(0, -1);
    if (bodyToCheck.some((p) => p.x === next.x && p.y === next.y)) {
      this.die();
      return;
    }

    this.snake.unshift(next);

    if (willEat) {
      this.score += SCORE_PER_FOOD;
      this.speed = Math.max(MIN_SPEED_MS, this.speed - SPEED_STEP_MS);
      playEat();
      this.food = this.spawnFood();
      this.emitState();
    } else {
      this.snake.pop();
    }
  }

  private die(): void {
    this.state = 'over';
    playDeath();
    if (this.score > this.best) {
      this.best = this.score;
      this.saveBest(this.best);
    }
    this.emitState();
  }

  private spawnFood(): Point {
    const occupied = new Set(this.snake.map((p) => `${p.x},${p.y}`));
    const free: Point[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length === 0) return { x: 0, y: 0 };
    return free[Math.floor(Math.random() * free.length)];
  }

  private loadBest(): number {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  private saveBest(v: number): void {
    localStorage.setItem(BEST_SCORE_KEY, String(v));
  }

  private emitState(): void {
    this.game.events.emit('snake-state', {
      state: this.state,
      score: this.score,
      best: this.best,
    });
  }

  // ---- 渲染 ----

  private drawBoard(): void {
    const bg = this.add.rectangle(0, 0, BOARD, BOARD, COLORS.lcd)
      .setOrigin(0, 0);
    bg.setStrokeStyle(4, COLORS.ink);
  }

  private drawEntities(): void {
    const g = this.gfx;
    g.clear();

    // LCD 点阵（极淡网格）
    g.lineStyle(1, COLORS.grid, 0.55);
    for (let i = 1; i < GRID_SIZE; i++) {
      g.lineBetween(i * CELL, 4, i * CELL, BOARD - 4);
      g.lineBetween(4, i * CELL, BOARD - 4, i * CELL);
    }

    // 食物：呼吸闪烁的像素方块
    const t = this.time.now / 1000;
    const pulse = 0.55 + 0.3 * Math.sin(t * 5);
    const fInset = CELL * (0.5 - pulse * 0.28);
    const fx = this.food.x * CELL + fInset;
    const fy = this.food.y * CELL + fInset;
    const fs = CELL - fInset * 2;
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(fx, fy, fs, fs);

    // 蛇：逐节像素块
    this.snake.forEach((seg, i) => {
      const isHead = i === 0;
      const pad = isHead ? 1.5 : 3;
      const x = seg.x * CELL + pad;
      const y = seg.y * CELL + pad;
      const s = CELL - pad * 2;
      g.fillStyle(COLORS.ink, 1);
      g.fillRoundedRect(x, y, s, s, isHead ? 4 : 3);

      if (isHead) this.drawEyes(g, seg);
    });
  }

  private drawEyes(g: Phaser.GameObjects.Graphics, head: Point): void {
    const v = DIR_VECTORS[this.dir];
    const cx = head.x * CELL + CELL / 2;
    const cy = head.y * CELL + CELL / 2;
    const forward = 4;
    const side = 4.5;

    // 垂直于移动方向的两侧偏移
    const perp = { x: -v.y, y: v.x };
    const eyes = [1, -1].map((s) => ({
      x: cx + v.x * forward + perp.x * side * s,
      y: cy + v.y * forward + perp.y * side * s,
    }));

    g.fillStyle(COLORS.lcd, 1);
    for (const e of eyes) {
      g.fillRect(e.x - 1.6, e.y - 1.6, 3.2, 3.2);
    }
  }
}

export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: BOARD,
    height: BOARD,
    backgroundColor: '#9bbc0f',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene],
  };
}
