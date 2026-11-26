// Board sounds, synthesized with Web Audio (no sound files to download).
import { store } from "./util.js?v=0c23cd7a0c";

let ctx = null;
let enabled = store.get("sound", true);
let noiseBuf = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// browsers only allow audio after a tap/click
["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, () => ac(), { once: true, capture: true }));

function noise() {
  if (noiseBuf) return noiseBuf;
  const c = ac();
  noiseBuf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function knock(at, freq, gain, dur, q = 1.2) {
  const c = ac();
  const src = c.createBufferSource();
  src.buffer = noise();
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(at);
  src.stop(at + dur + 0.02);
}

function tone(at, freq, dur, gain = 0.18, type = "sine") {
  const c = ac();
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

const SFX = {
  move(t) { knock(t, 1500, 0.9, 0.075, 1.1); knock(t, 420, 0.6, 0.06, 0.9); },
  capture(t) { knock(t, 2400, 1, 0.1, 1.5); knock(t + 0.03, 800, 0.8, 0.09, 1); knock(t, 300, 0.5, 0.07, 0.8); },
  castle(t) { SFX.move(t); SFX.move(t + 0.1); },
  check(t) { SFX.move(t); tone(t + 0.02, 880, 0.16, 0.12, "triangle"); },
  promote(t) { SFX.move(t); tone(t + 0.03, 660, 0.12, 0.12); tone(t + 0.11, 990, 0.2, 0.12); },
  start(t) { tone(t, 523, 0.14, 0.13); tone(t + 0.13, 784, 0.25, 0.13); },
  end(t) { tone(t, 784, 0.16, 0.13); tone(t + 0.15, 523, 0.3, 0.13); },
  lowtime(t) { tone(t, 1046, 0.07, 0.12, "square"); tone(t + 0.12, 1046, 0.07, 0.12, "square"); },
  good(t) { tone(t, 660, 0.1, 0.12); tone(t + 0.08, 880, 0.1, 0.12); tone(t + 0.16, 1320, 0.22, 0.12); },
  bad(t) { tone(t, 200, 0.22, 0.14, "sawtooth"); },
  notify(t) { tone(t, 988, 0.12, 0.1); tone(t + 0.1, 1318, 0.18, 0.1); },
  illegal(t) { tone(t, 160, 0.09, 0.12, "square"); },
};

export function play(name) {
  if (!enabled || !SFX[name]) return;
  try { const c = ac(); if (c) SFX[name](c.currentTime + 0.005); } catch { /* audio not available */ }
}

// pick the sound for a move from its SAN (+ check, x capture, O-O castle, = promotion)
export function playMove(san) {
  if (!san) return play("move");
  if (san.includes("#") || san.includes("+")) return play("check");
  if (san.includes("=")) return play("promote");
  if (san.startsWith("O-O")) return play("castle");
  if (san.includes("x")) return play("capture");
  play("move");
}

export function soundOn() { return enabled; }
export function setSound(on) { enabled = !!on; store.set("sound", enabled); if (on) play("move"); }
