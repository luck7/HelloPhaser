// 贪吃蛇游戏全局常量：网格、配色、节拍

export const GRID_SIZE = 21; // 21 x 21 格棋盘
export const CELL = 22; // 每格 22px -> 462 x 462 游戏区
export const BOARD = GRID_SIZE * CELL;

export const COLORS = {
  lcd: 0x9bbc0f,
  grid: 0x8cab0e,
  ink: 0x0f380f,
  mid: 0x306230,
} as const;

export const INITIAL_SPEED_MS = 150;
export const MIN_SPEED_MS = 70;
export const SPEED_STEP_MS = 3;
export const SCORE_PER_FOOD = 10;

export const BEST_SCORE_KEY = 'snake-best-score';

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export const DIR_VECTORS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};
