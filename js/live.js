// Live things on every page: the owner's event ("admin abuse") banner with its countdown and effects
// (confetti, snow, fireworks…), the Board Designer's newest boards, and the move-dot style.
import * as api from "./api.js?v=0c23cd7a0c";
import { t, fa } from "./i18n.js?v=0c23cd7a0c";
import "./i18n3.js?v=0c23cd7a0c";
import { store, esc, sleep } from "./util.js?v=0c23cd7a0c";

// ───────── move dots (always visible on every board) ─────────
export const DOTS = ["bold", "ring", "glow", "big", "classic"];
export function applyDots(k) { document.documentElement.dataset.dots = DOTS.includes(k) ? k : (store.get("dots") || "bold"); }
export function setDots(k) { store.set("dots", k); applyDots(k); }

// ───────── boards made in the Board Designer (live from the server) ─────────
let liveThemes = null;
export async function loadLiveThemes(force = false) {
  if (liveThemes && !force) return liveThemes;
  try {
    const r = await api.pubGet("themes", {}, 9000);
    if (r && r.themes) { liveThemes = r.themes; injectCss(r.css); }
  } catch { /* offline: the built-in list (data/themes.json) still works */ }
  return liveThemes;
}
export function injectCss(css) {
  let el = document.getElementById("live-themes");
  if (!el) { el = document.createElement("style"); el.id = "live-themes"; document.head.appendChild(el); }
  el.textContent = css || "";
}

// ───────── events ─────────
let ev = null, evV = -1, started = false, fxTimer = null, hidden = false, openOnGame = false;
// on a game screen the banner starts as a small pill (tap to open), so it never covers the players' bars
const onGame = () => ["game", "bot", "review", "lreview", "sprint"].includes(document.body.dataset.page);
const listeners = new Set();
export const currentEvent = () => ev;
export function onEvent(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const fxOn = () => store.get("fx") !== false && !matchMedia("(prefers-reduced-motion: reduce)").matches;
export function setFx(on) { store.set("fx", !!on); startFx(); }

export function startLive() {
  if (started) return;
  started = true;
  applyDots();
  loop();
  setInterval(tick, 1000);
  window.addEventListener("hashchange", () => setTimeout(() => { openOnGame = false; if (ev) renderBar(); }, 60));
}

async function loop() {
  let backoff = 4000;
  for (;;) {
    try {
      const r = await api.get("pub/live", { v: evV, wait: evV >= 0 ? 1 : "", l: fa() ? "fa" : "en" }, 34000);
      backoff = 4000;
      if (r && r.v !== undefined) {
        const changed = r.v !== evV || JSON.stringify(r.event) !== JSON.stringify(ev);
        evV = r.v;
        if (changed) setEvent(r.event);
      }
    } catch {
      await sleep(backoff);
      backoff = Math.min(60000, backoff * 1.6);
    }
  }
}

export function setEvent(e) {
  const fresh = e && (!ev || ev.id !== e.id);
  ev = e ? { ...e, until: Date.now() + (e.left || 0) * 1000 } : null;
  if (fresh) hidden = false;
  renderBar();
  startFx();
  listeners.forEach((f) => { try { f(ev); } catch (x) { console.error(x); } });
}

function left() { return ev ? Math.max(0, Math.round((ev.until - Date.now()) / 1000)) : 0; }
function fmt(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(x).padStart(2, "0")}`;
}

function pills(e) {
  const f = e.effects || {}, out = [];
  if (f.elo_mult && f.elo_mult > 1) out.push(`📈 ${t("ev_x2", { n: f.elo_mult })}`);
  if (f.no_loss) out.push(`🛡️ ${t("ev_noloss")}`);
  if (f.free_themes) out.push(`🎨 ${t("ev_free")}`);
  if (f.puzzle_mult && f.puzzle_mult > 1) out.push(`🧩 ${t("ev_puzzle", { n: f.puzzle_mult })}`);
  if (e.badge) out.push(`${esc(e.badge.emoji)} ${esc(e.badge.name)}`);
  if (e.mode) out.push(`<a href="#/modes?play=${esc(e.mode.key)}">${esc(e.mode.emoji)} ${esc(e.mode.name)}</a>`);
  return out.map((p) => `<span class="evp">${p}</span>`).join("");
}

function renderBar() {
  let bar = document.getElementById("evbar");
  if (!ev || left() <= 0) { if (bar) bar.remove(); document.body.classList.remove("has-ev"); return; }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "evbar";
    document.body.appendChild(bar);
  }
  const game = onGame(), mini = game ? !openOnGame : hidden;
  bar.className = mini ? "mini" : "";
  bar.innerHTML = `<span class="ev-tag">${t("ev_live")}</span><span class="ev-e">${esc(ev.emoji || "🎉")}</span>
    <span class="ev-b"><b dir="auto">${esc(ev.title || "")}</b>${ev.msg ? `<span class="ev-m" dir="auto">${esc(ev.msg)}</span>` : ""}
    <span class="ev-ps">${pills(ev)}</span></span>
    <span class="ev-t" dir="ltr">⏱ <b>${fmt(left())}</b></span><button class="ev-x" aria-label="hide">${mini ? "▾" : "▴"}</button>`;
  const flip = () => { if (game) openOnGame = !openOnGame; else hidden = !hidden; renderBar(); };
  bar.querySelector(".ev-x").onclick = (e) => { e.stopPropagation(); flip(); };
  bar.onclick = mini ? flip : null;   // the whole pill opens it
  document.body.classList.add("has-ev");
}

function tick() {
  if (!ev) return;
  const s = left();
  const el = document.querySelector("#evbar .ev-t b");
  if (el) el.textContent = fmt(s);
  if (s <= 0) { ev = null; renderBar(); startFx(); listeners.forEach((f) => f(null)); }
}

// ───────── effects ─────────
const FX = {
  confetti: ["🎉", "🎊", "✨", "🟨", "🟥", "🟦", "🟩"], snow: ["❄️", "❄", "✻", "❅"], fireworks: ["🎆", "🎇", "✨", "💥"],
  money: ["💸", "💰", "💵", "🪙"], hearts: ["💖", "💗", "❤️", "💕"], disco: ["🪩", "🎶", "✨"], rainbow: ["🌈", "✨"],
  stars: ["⭐", "🌟", "✨"], bubbles: ["🫧", "○", "◦"],
};

function startFx() {
  clearInterval(fxTimer);
  fxTimer = null;
  let layer = document.getElementById("fxl");
  const kind = ev && ev.effects && ev.effects.fx;
  document.body.classList.remove("fx-disco", "fx-rainbow");
  if (!kind || !fxOn()) { if (layer) layer.remove(); return; }
  if (!layer) { layer = document.createElement("div"); layer.id = "fxl"; document.body.appendChild(layer); }
  if (kind === "disco") document.body.classList.add("fx-disco");
  if (kind === "rainbow") document.body.classList.add("fx-rainbow");
  const set = kind === "emoji" ? [ev.effects.fx_emoji || "🎉"] : (FX[kind] || FX.confetti);
  const up = kind === "bubbles";
  const burst = kind === "fireworks";
  fxTimer = setInterval(() => {
    if (document.hidden || layer.childElementCount > 36) return;
    const p = document.createElement("span");
    p.className = "fxp" + (up ? " up" : burst ? " burst" : "");
    p.textContent = set[Math.floor(Math.random() * set.length)];
    p.style.left = Math.random() * 100 + "vw";
    if (burst) p.style.top = 10 + Math.random() * 60 + "vh";
    p.style.fontSize = 14 + Math.random() * 18 + "px";
    p.style.animationDuration = (burst ? 1.4 : 6 + Math.random() * 5) + "s";
    p.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
    layer.appendChild(p);
    setTimeout(() => p.remove(), burst ? 1500 : 11500);
  }, kind === "snow" ? 260 : 420);
}

export const V = "0c23cd7a0c";
