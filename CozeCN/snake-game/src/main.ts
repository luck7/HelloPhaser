import Phaser from 'phaser';
import { createGameConfig } from './game/GameScene';
import { bindInputs } from './game/input';
import { unlockAudio } from './game/sound';

interface SnakeStatePayload {
  state: 'ready' | 'running' | 'over';
  score: number;
  best: number;
}

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} not found`);
  return node;
}

export function initApp(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App element not found');
    return;
  }

  app.innerHTML = `
    <div class="device-shell">
      <div class="device-top">
        <span class="device-dot"></span>
        <span class="device-label">SNAKE&nbsp;·&nbsp;LCD-21</span>
      </div>

      <div class="lcd">
        <div class="hud">
          <div class="hud-item">
            <span class="hud-label">SCORE</span>
            <span class="hud-value" id="score">0</span>
          </div>
          <div class="hud-item hud-item-right">
            <span class="hud-label">BEST</span>
            <span class="hud-value" id="best">0</span>
          </div>
        </div>

        <div class="board" id="board">
          <div class="overlay" id="overlay">
            <h1 class="overlay-title" id="overlay-title">SNAKE</h1>
            <p class="overlay-sub" id="overlay-sub">准备就绪</p>
            <p class="overlay-hint" id="overlay-hint">按 空格 / 回车 开始</p>
          </div>
        </div>
      </div>

      <div class="dpad" id="dpad" aria-label="方向键">
        <span class="dpad-cell"></span>
        <button class="dpad-btn" id="pad-up" aria-label="上">&#9650;</button>
        <span class="dpad-cell"></span>
        <button class="dpad-btn" id="pad-left" aria-label="左">&#9664;</button>
        <button class="dpad-btn dpad-center" id="pad-action" aria-label="开始"></button>
        <button class="dpad-btn" id="pad-right" aria-label="右">&#9654;</button>
        <span class="dpad-cell"></span>
        <button class="dpad-btn" id="pad-down" aria-label="下">&#9660;</button>
        <span class="dpad-cell"></span>
      </div>

      <p class="tips">方向键 / WASD 转向 &nbsp;·&nbsp; 空格 开始 &nbsp;·&nbsp; 手机可滑动或点按方向键</p>
    </div>
  `;

  const boardEl = el('board');
  const game = new Phaser.Game(createGameConfig(boardEl));

  const scoreEl = el('score');
  const bestEl = el('best');
  const overlayEl = el('overlay');
  const overlayTitleEl = el('overlay-title');
  const overlaySubEl = el('overlay-sub');
  const overlayHintEl = el('overlay-hint');

  game.events.on('snake-state', (s: SnakeStatePayload) => {
    scoreEl.textContent = String(s.score);
    bestEl.textContent = String(s.best);

    if (s.state === 'ready') {
      overlayEl.classList.remove('overlay-hidden', 'overlay-over');
      overlayTitleEl.textContent = 'SNAKE';
      overlaySubEl.textContent = '准备就绪';
      overlayHintEl.textContent = '按 空格 / 回车 开始';
    } else if (s.state === 'running') {
      overlayEl.classList.add('overlay-hidden');
    } else {
      overlayEl.classList.remove('overlay-hidden');
      overlayEl.classList.add('overlay-over');
      overlayTitleEl.textContent = 'GAME OVER';
      overlaySubEl.textContent =
        s.score >= s.best && s.score > 0
          ? `本局 ${s.score} 分 · 新纪录!`
          : `本局 ${s.score} 分 · 最高 ${s.best} 分`;
      overlayHintEl.textContent = '按 空格 / 回车 重新开始';
    }
  });

  bindInputs(game, boardEl, {
    up: el('pad-up'),
    down: el('pad-down'),
    left: el('pad-left'),
    right: el('pad-right'),
  });

  const actionEl = el('pad-action');
  actionEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    unlockAudio();
    game.events.emit('start-input');
  });

  // 任意一次按键 / 点击即解锁音频（浏览器自动播放限制）
  window.addEventListener('keydown', () => unlockAudio(), { once: true });
  boardEl.addEventListener('pointerdown', () => unlockAudio(), { once: true });
}
