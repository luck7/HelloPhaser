import type Phaser from 'phaser';
import type { Dir } from './constants';

const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

const SWIPE_MIN = 24; // 判定为滑动的最小像素距离

interface PadRefs {
  up: HTMLElement;
  down: HTMLElement;
  left: HTMLElement;
  right: HTMLElement;
}

/** 绑定键盘、滑动手势与屏幕方向键，全部转为 game.events 上的输入事件 */
export function bindInputs(game: Phaser.Game, boardEl: HTMLElement,
  pad: PadRefs): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    const dir = KEY_TO_DIR[e.code];
    if (dir) {
      e.preventDefault();
      game.events.emit('dir-input', dir);
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      game.events.emit('start-input');
    }
  };

  // 触摸滑动
  let startX = 0;
  let startY = 0;
  let touching = false;

  const onTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    touching = true;
  };

  const onTouchMove = (e: TouchEvent): void => {
    if (!touching) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;

    const dir: Dir =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'right'
          : 'left'
        : dy > 0
          ? 'down'
          : 'up';
    game.events.emit('dir-input', dir);
    startX = t.clientX;
    startY = t.clientY;
  };

  const onTouchEnd = (): void => {
    touching = false;
  };

  const pressDir = (dir: Dir) => (e: Event): void => {
    e.preventDefault();
    game.events.emit('dir-input', dir);
  };

  window.addEventListener('keydown', onKeyDown);
  boardEl.addEventListener('touchstart', onTouchStart, { passive: true });
  boardEl.addEventListener('touchmove', onTouchMove, { passive: true });
  boardEl.addEventListener('touchend', onTouchEnd, { passive: true });

  const padListeners: Array<[HTMLElement, (e: Event) => void]> = [
    [pad.up, pressDir('up')],
    [pad.down, pressDir('down')],
    [pad.left, pressDir('left')],
    [pad.right, pressDir('right')],
  ];
  for (const [el, fn] of padListeners) {
    el.addEventListener('pointerdown', fn);
  }

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    boardEl.removeEventListener('touchstart', onTouchStart);
    boardEl.removeEventListener('touchmove', onTouchMove);
    boardEl.removeEventListener('touchend', onTouchEnd);
    for (const [el, fn] of padListeners) {
      el.removeEventListener('pointerdown', fn);
    }
  };
}
