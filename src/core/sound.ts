// ─────────────────────────────────────────────────────────
// Sound Manager (Web Audio API)
// Procedurally generated sound effects — no external files
// ─────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled = true;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function getOutput(): GainNode {
  getContext();
  return masterGain!;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** Resume audio context after user gesture (required by browsers) */
export function resumeAudio(): void {
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume();
  }
}

// ── Procedural Sound Effects ─────────────────────────────

/** Shot fired — short percussive snap */
export function playShot(): void {
  if (!enabled) return;
  const ctx = getContext();
  const out = getOutput();
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
  gain.gain.setValueAtTime(0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain);
  gain.connect(out);
  osc.start(t);
  osc.stop(t + 0.1);

  // Noise burst
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  const noise = ctx.createBufferSource();
  const ng = ctx.createGain();
  noise.buffer = buf;
  ng.gain.setValueAtTime(0.4, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  noise.connect(ng);
  ng.connect(out);
  noise.start(t);
}

/** Explosion (hit) — low boom + crackle */
export function playHit(): void {
  if (!enabled) return;
  const ctx = getContext();
  const out = getOutput();
  const t = ctx.currentTime;

  // Low boom
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
  gain.gain.setValueAtTime(0.8, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(gain);
  gain.connect(out);
  osc.start(t);
  osc.stop(t + 0.4);

  // Crackle noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() > 0.9 ? (Math.random() * 2 - 1) * 0.5 : 0;
  }
  const noise = ctx.createBufferSource();
  const ng = ctx.createGain();
  noise.buffer = buf;
  ng.gain.setValueAtTime(0.3, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  noise.connect(ng);
  ng.connect(out);
  noise.start(t);
}

/** Splash (miss) — filtered noise */
export function playMiss(): void {
  if (!enabled) return;
  const ctx = getContext();
  const out = getOutput();
  const t = ctx.currentTime;

  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.exp(-i / (ctx.sampleRate * 0.1));
    data[i] = (Math.random() * 2 - 1) * env * 0.3;
  }
  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  noise.buffer = buf;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, t);
  filter.Q.value = 1;
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  noise.start(t);
}

/** Ship sunk — deep explosion + descending tone */
export function playSunk(): void {
  if (!enabled) return;
  const ctx = getContext();
  const out = getOutput();
  const t = ctx.currentTime;

  // Deep explosion
  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(100, t);
  osc1.frequency.exponentialRampToValueAtTime(20, t + 0.6);
  g1.gain.setValueAtTime(1, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  osc1.connect(g1);
  g1.connect(out);
  osc1.start(t);
  osc1.stop(t + 0.7);

  // Descending whistle
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1200, t + 0.1);
  osc2.frequency.exponentialRampToValueAtTime(100, t + 0.8);
  g2.gain.setValueAtTime(0.3, t + 0.1);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  osc2.connect(g2);
  g2.connect(out);
  osc2.start(t + 0.1);
  osc2.stop(t + 0.9);
}

/** Victory fanfare — ascending arpeggio */
export function playVictory(): void {
  if (!enabled) return;
  const ctx = getContext();
  const out = getOutput();
  const t = ctx.currentTime;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + i * 0.15);
    gain.gain.linearRampToValueAtTime(0.4, t + i * 0.15 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.5);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t + i * 0.15);
    osc.stop(t + i * 0.15 + 0.5);
  });
}

/** Defeat — descending sad tones */
export function playDefeat(): void {
  if (!enabled) return;
  const ctx = getContext();
  const out = getOutput();
  const t = ctx.currentTime;
  const notes = [440, 392, 349, 262]; // A4, G4, F4, C4

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + i * 0.3);
    gain.gain.linearRampToValueAtTime(0.3, t + i * 0.3 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.6);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t + i * 0.3);
    osc.stop(t + i * 0.3 + 0.6);
  });
}

/** UI click — subtle tick */
export function playClick(): void {
  if (!enabled) return;
  const ctx = getContext();
  const out = getOutput();
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 600;
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(gain);
  gain.connect(out);
  osc.start(t);
  osc.stop(t + 0.05);
}

/** Ship placed — soft thud */
export function playPlace(): void {
  if (!enabled) return;
  const ctx = getContext();
  const out = getOutput();
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(out);
  osc.start(t);
  osc.stop(t + 0.15);
}
