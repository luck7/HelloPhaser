// 8-bit 音效：用 WebAudio 方波合成，不加载任何音频文件

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function beep(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType,
  when: number,
): void {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + when;

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, start);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** 吃食物：短促上扬的"嘀" */
export function playEat(): void {
  beep(660, 990, 0.08, 'square', 0);
}

/** 死亡：两音节下降的"嘀—嘟" */
export function playDeath(): void {
  beep(440, 220, 0.16, 'square', 0);
  beep(220, 110, 0.22, 'square', 0.18);
}

/** 开始：一小节轻快提示音 */
export function playStart(): void {
  beep(523, 523, 0.07, 'square', 0);
  beep(784, 784, 0.1, 'square', 0.08);
}

/** 浏览器要求用户交互后才能恢复 AudioContext */
export function unlockAudio(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}
