// The game screen shared by online games, bot games, spectating and Game Review:
// player bars + clocks, the locked board, move list / history browsing, review panel, end-of-game card.
import { Board, sqXY } from "./board.js?v=5bdc901d4f";
import { Chess } from "./vendor/chess.js?v=5bdc901d4f";
import { t, fa } from "./i18n.js?v=5bdc901d4f";
import { esc, fmtClock, h, initials, winPct, evalText, store, titleHtml, tagHtml, showHtml, nameHtml, profileHref, modal } from "./util.js?v=5bdc901d4f";
import "./i18n3.js?v=5bdc901d4f";
import { play, playMove, soundOn, setSound } from "./sound.js?v=5bdc901d4f";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const P = { // Material Design icon paths (Apache 2.0)
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  thumb: "M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  book: "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
};
const txt = (s, size = 12) => `<svg viewBox="0 0 24 24"><text x="12" y="${12 + size * 0.36}" text-anchor="middle" font-size="${size}" font-weight="900" font-family="Arial,Helvetica,sans-serif" fill="#fff">${s}</text></svg>`;
const ico = (d, s = 0.78) => `<svg viewBox="0 0 24 24"><path transform="translate(${12 - 12 * s} ${12 - 12 * s}) scale(${s})" d="${d}" fill="#fff"/></svg>`;

export const CLS = {
  brilliant: { color: "#1fb7b0", icon: txt("!!", 13) },
  great: { color: "#5f8fbf", icon: txt("!", 15) },
  best: { color: "#81b64c", icon: ico(P.star, 0.8) },
  excellent: { color: "#96bc4b", icon: ico(P.thumb, 0.7) },
  good: { color: "#8ba57b", icon: ico(P.check, 0.85) },
  book: { color: "#a88865", icon: ico(P.book, 0.72) },
  inaccuracy: { color: "#f0b93a", icon: txt("?!", 12) },
  mistake: { color: "#e6892c", icon: txt("?", 15) },
  miss: { color: "#ee6b55", icon: ico(P.close, 0.8) },
  blunder: { color: "#d63a32", icon: txt("??", 13) },
};
export const CLASS_ORDER = ["brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "miss", "blunder"];
const KEY = new Set(["brilliant", "great", "inaccuracy", "mistake", "miss", "blunder"]);

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNT = { q: 1, r: 2, b: 2, n: 2, p: 8 };

export function badgeHtml(cls, size = "") {
  const c = CLS[cls];
  return c ? `<span class="cico ${size}" style="background:${c.color}">${c.icon}</span>` : "";
}

// a FEN chess.js can read: no crazyhouse pockets [..] or promoted marks ~
export function plainFen(fen) {
  const p = String(fen || "").split(" ");
  p[0] = (p[0] || "").replace(/\[.*$/, "").replace(/~/g, "");
  return p.join(" ");
}

function fenInfo(fen) {
  try {
    const c = new Chess(plainFen(fen));
    let check = null;
    if (c.inCheck()) {
      const turn = c.turn();
      for (const row of c.board()) for (const p of row) if (p && p.type === "k" && p.color === turn) check = p.square;
    }
    return { chess: c, check };
  } catch { return { chess: null, check: null }; }
}

function material(fen) {
  const counts = { w: { q: 0, r: 0, b: 0, n: 0, p: 0 }, b: { q: 0, r: 0, b: 0, n: 0, p: 0 } };
  for (const ch of String(fen || "").split(" ")[0].replace(/\[.*$/, "")) {
    const l = ch.toLowerCase();
    if (counts.w[l] === undefined) continue;
    counts[ch === l ? "b" : "w"][l]++;
  }
  const score = (c) => Object.entries(counts[c]).reduce((s, [k, n]) => s + VAL[k] * n, 0);
  return { counts, diff: score("w") - score("b") };
}

export class GameView {
  constructor(container, opts = {}) {
    this.opts = opts;
    this.root = container;
    this.mode = opts.mode || "local";      // online | local | watch | review | puzzle
    this.hist = { fens: [opts.startFen || START_FEN], sans: [], ucis: [] };
    this.ply = 0;
    this.follow = true;
    this.movable = null;
    this.premovable = null;
    this.review = null;
    this.players = { w: { name: t("white") }, b: { name: t("black") } };
    this.clock = null;
    this.actions = [];
    this.render();
    this.board = new Board(this.$(".board"), {
      orient: opts.orient || "w",
      onMove: (f, to, p, meta) => this.opts.onMove && this.opts.onMove(f, to, p, meta),
      onPremove: (pre) => this.opts.onPremove && this.opts.onPremove(pre),
    });
    this.board.set({ fen: this.hist.fens[0], animate: false });
    this.fit = this.fit.bind(this);
    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(document.body);
    this.ro.observe(this.$(".gs-review"));
    this.ro.observe(this.$(".gs-coach"));
    window.addEventListener("resize", this.fit);
    this.keys = (e) => this.onKey(e);
    window.addEventListener("keydown", this.keys);
    this.tick = setInterval(() => this.renderClocks(), 100);
    this.fit();
  }

  $(s) { return this.root.querySelector(s); }

  render() {
    this.root.innerHTML = `
<section class="gv mode-${this.mode}">
  <div class="gv-top">
    <button class="ib back" data-a="back" aria-label="${t("back")}">${fa() ? "→" : "←"}</button>
    <div class="gv-title"></div>
    <div class="gv-live"></div>
  </div>
  <div class="gv-main">
    <div class="pbar" data-pos="top"></div>
    <div class="gv-boardrow">
      <div class="evalbar" hidden><div class="ev-fill"></div><span class="ev-t"></span></div>
      <div class="board-wrap"><div class="board"></div><div class="bubble" data-pos="top"></div><div class="bubble" data-pos="bot"></div><div class="gv-over"></div></div>
    </div>
    <div class="pbar" data-pos="bot"></div>
  </div>
  <aside class="gv-side">
    <div class="gs-head"></div>
    <div class="gs-mode" hidden></div>
    <div class="gs-review" hidden></div>
    <div class="gs-coach" hidden></div>
    <div class="gs-moves"><div class="ml"></div></div>
    <div class="gs-status"></div>
    <div class="gs-nav" dir="ltr">
      <button class="nb" data-a="first" title="⏮"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
      <button class="nb" data-a="prev" title="◀"><svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>
      <button class="nb" data-a="next" title="▶"><svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>
      <button class="nb" data-a="last" title="⏭"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
      <span class="sep"></span>
      <button class="nb" data-a="flip" title="${t("flip")}"><svg viewBox="0 0 24 24"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg></button>
      <button class="nb" data-a="pen" title="${t("draw_tool")}"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
      <button class="nb" data-a="sound" title="${soundOn() ? t("sound_on") : t("sound_off")}">${soundIcon(soundOn())}</button>
    </div>
    <div class="gs-actions"></div>
  </aside>
</section>`;
    this.root.querySelector(".gv").addEventListener("click", (e) => {
      const pn = e.target.closest(".pbar .pn.link");
      if (pn) { this.playerCard(pn.closest(".pbar")); return; }
      const b = e.target.closest("[data-a]");
      if (b) this.onNav(b.dataset.a, b);
      const mv = e.target.closest(".mv[data-ply]");
      if (mv) this.go(+mv.dataset.ply, true);
      const act = e.target.closest("[data-act]");
      if (act) {
        const a = this.actions.find((x) => x.id === act.dataset.act);
        if (a && !a.disabled && a.onClick) a.onClick(act);
      }
    });
  }

  destroy() {
    clearInterval(this.tick);
    this.ro.disconnect();
    window.removeEventListener("resize", this.fit);
    window.removeEventListener("keydown", this.keys);
    document.querySelector(".pcard")?.remove();
    this.board.destroy();
    this.root.innerHTML = "";
  }

  // ───────── chat (a tab next to the moves on computers, a sheet from the bottom on phones) ─────────
  enableChat(ChatClass, { onSend, canChat }) {
    if (this.chat) return;
    const side = this.$(".gv-side");
    const tabs = h(`<div class="gs-tabs"><button data-gt="moves" class="on">${t("moves_tab")}</button><button data-gt="chat">💬 ${t("chat")} <span class="gc-badge" hidden></span></button></div>`);
    side.insertBefore(tabs, this.$(".gs-moves"));
    const box = h(`<div class="gs-chat"><div class="gc-head"><b>💬 ${t("chat")}</b><button class="ib gc-x" aria-label="close">✕</button></div><div class="gc-body"></div></div>`);
    side.insertBefore(box, this.$(".gs-status"));
    this.chat = new ChatClass(box.querySelector(".gc-body"), { onSend, canChat });
    this.unread = 0;
    tabs.onclick = (e) => { const b = e.target.closest("[data-gt]"); if (b) this.showChat(b.dataset.gt === "chat"); };
    box.querySelector(".gc-x").onclick = () => this.showChat(false);
    // phones: a chat button in the top bar (with the unread count)
    const top = h(`<button class="ib chat-ib" aria-label="${t("chat")}">💬<span class="gc-badge" hidden></span></button>`);
    this.$(".gv-top").appendChild(top);
    top.onclick = () => this.showChat(!this.chatOpen);
  }

  showChat(on) {
    const gv = this.$(".gv");
    this.chatOpen = on;
    gv.classList.toggle("tab-chat", on);
    gv.classList.toggle("chat-open", on);
    this.$$(".gs-tabs [data-gt]").forEach((b) => b.classList.toggle("on", (b.dataset.gt === "chat") === on));
    if (on) { this.unread = 0; this.badge(); setTimeout(() => this.$(".gs-chat input")?.focus({ preventScroll: true }), 60); }
    if (this.opts.onChatToggle) this.opts.onChatToggle(on);
  }

  setChat(msgs) {
    if (!this.chat) return;
    const n = this.chat.set(msgs || []);
    if (n && !this.chatOpen) { this.unread += n; this.badge(); play("notify"); }
  }

  badge() {
    for (const b of this.$$(".gc-badge")) { b.hidden = !this.unread; b.textContent = this.unread || ""; }
  }

  $$(s) { return [...this.root.querySelectorAll(s)]; }

  // a small card about a player (tap their name)
  playerCard(bar) {
    document.querySelector(".pcard")?.remove();
    const p = this.players[bar.dataset.color] || {};
    const href = profileHref(p);
    const card = h(`<div class="pcard"><div class="pc-top">${nameHtml(p, { tag: false })}</div>
      ${p.tag ? `<div>${tagHtml(p.tag)}</div>` : ""}${p.show && p.show.length ? `<div class="pc-show">${showHtml(p.show)}</div>` : ""}
      <div class="pc-r">${t("rating")}: <b>${esc(p.elo || "")}</b></div>
      ${href ? `<a class="btn sm" href="${href}" target="_blank" rel="noopener">👤 ${t("profile")} ↗</a>` : ""}</div>`);
    document.body.appendChild(card);
    const r = bar.getBoundingClientRect();
    card.style.left = Math.max(8, Math.min(window.innerWidth - card.offsetWidth - 8, r.left + 40)) + "px";
    card.style.top = (r.top > window.innerHeight / 2 ? r.top - card.offsetHeight - 6 : r.bottom + 6) + "px";
    setTimeout(() => document.addEventListener("pointerdown", function off(e) { if (!card.contains(e.target)) { card.remove(); document.removeEventListener("pointerdown", off); } }), 0);
  }

  // ───────── layout: the board always fills the screen and never moves ─────────
  fit() {
    const gv = this.$(".gv");
    if (!gv) return;
    const W = window.innerWidth, H = window.innerHeight;
    const evalOn = !this.$(".evalbar").hidden;
    let size;
    if (W >= 900) {
      const side = document.getElementById("side");
      const sideW = side && getComputedStyle(side).display !== "none" ? side.offsetWidth : 0;
      const panel = Math.min(400, Math.max(320, W * 0.27));
      gv.style.setProperty("--pw", panel + "px");
      const availW = W - sideW - panel - 64 - (evalOn ? 34 : 0);
      const availH = H - 2 * 56 - 44;
      size = Math.min(availW, availH, 920);
    } else {
      // phone: everything except the board has a fixed height; the board takes what is left
      const hOf = (q) => { const el = this.$(q); return el && !el.hidden ? el.offsetHeight : 0; };
      const fixed = hOf(".gv-top") + 2 * (hOf(".pbar") || 48) + hOf(".gs-review") + hOf(".gs-coach") +
        (hOf(".gs-moves") || 38) + Math.max(hOf(".gs-actions"), 64) + 30;
      size = Math.min(W - (evalOn ? 18 : 0), H - fixed);
    }
    size = Math.max(240, Math.floor(size / 8) * 8);
    gv.style.setProperty("--bs", size + "px");
  }

  // ───────── players & clocks ─────────
  setPlayers(players) {
    this.players = players;
    this.renderBars();
  }

  setTitle(html, live) {
    this.$(".gv-title").innerHTML = html;
    this.$(".gs-head").innerHTML = html + (live ? ` <span class="sp-live">${live}</span>` : "");
    this.$(".gv-live").innerHTML = live || "";
  }

  orient() { return this.board.orient; }

  setOrientation(o) {
    this.board.setOrientation(o);
    this.renderBars();
  }

  renderBars() {
    const top = this.board.orient === "w" ? "b" : "w", bot = top === "w" ? "b" : "w";
    for (const [pos, color] of [["top", top], ["bot", bot]]) {
      const p = this.players[color] || {};
      const el = this.$(`.pbar[data-pos="${pos}"]`);
      el.dataset.color = color;
      const av = p.bot
        ? `<div class="av bot${p.emoji ? " emo" : ""}${p.ai ? " ai" : ""}" style="background:${esc(p.color || "#4a4846")}">${esc(p.emoji || p.initials || initials(p.name))}</div>`
        : `<div class="av ${color}"><span class="pc" data-c="${color}K"></span></div>`;
      const tc = p.title_color || (p.bot ? "#7c2929" : null);
      const elo = p.inf ? "∞" : p.elo;
      el.innerHTML = `${av}<div class="pinfo"><div class="pn${p.pid ? " link" : ""}">${titleHtml(p.title, tc)}` +
        `<span class="nm" dir="auto">${esc(p.name || "")}</span>${elo ? `<span class="rt">(${esc(elo)})</span>` : ""}${p.ai ? `<span class="ai-pill">AI</span>` : ""}` +
        `${p.flag ? `<span class="flag">${esc(p.flag)}</span>` : ""}${tagHtml(p.tag, "sm")}${showHtml(p.show)}</div><div class="caps" dir="ltr"></div></div>` +
        `<div class="react"></div><div class="clock" dir="ltr" hidden><span></span></div>`;
    }
    this.renderCaps();
    this.renderClocks(true);
    if (this._ck) this.setChecks(...this._ck);
    if (this._pk) this.setPockets(...this._pk);
  }

  renderCaps() {
    const fen = this.hist.fens[this.ply];
    const { counts, diff } = material(fen);
    // captured pieces = what each side started with (any setup) minus what's left
    const base = this.hist.fens[0] ? material(this.hist.fens[0]).counts : { w: START_COUNT, b: START_COUNT };
    for (const el of this.root.querySelectorAll(".pbar")) {
      const color = el.dataset.color;
      const opp = color === "w" ? "b" : "w";
      let html = "";
      if (this.noCaps) { const box = el.querySelector(".caps"); if (box) box.innerHTML = ""; continue; }
      for (const k of ["p", "n", "b", "r", "q"]) {
        const n = Math.max(0, (base[opp][k] ?? START_COUNT[k]) - counts[opp][k]);
        if (n) html += `<span class="cg">${Array.from({ length: n }, () => `<span class="pc" data-c="${opp}${k.toUpperCase()}"></span>`).join("")}</span>`;
      }
      const adv = color === "w" ? diff : -diff;
      if (adv > 0) html += `<span class="adv">+${adv}</span>`;
      const box = el.querySelector(".caps");
      if (box) box.innerHTML = html;
    }
  }

  // clocks: {w, b} seconds, running: "w" | "b" | null — counted down locally between server updates
  setClock(c) {
    this.clock = c ? { w: c.w, b: c.b, running: c.running || null, at: performance.now() } : null;
    this.lowPlayed = this.lowPlayed || {};
    this.renderClocks(true);
  }

  clockNow() {
    if (!this.clock) return null;
    const c = { w: this.clock.w, b: this.clock.b };
    if (this.clock.running) c[this.clock.running] = Math.max(0, c[this.clock.running] - (performance.now() - this.clock.at) / 1000);
    return c;
  }

  renderClocks() {
    const now = this.clockNow();
    for (const el of this.root.querySelectorAll(".pbar")) {
      const box = el.querySelector(".clock");
      if (!box) continue;
      if (!now) { box.hidden = true; continue; }
      const color = el.dataset.color;
      box.hidden = false;
      const v = now[color];
      const on = this.clock.running === color;
      box.classList.toggle("on", on);
      box.classList.toggle("low", v < 20 && (on || v < 10));
      box.firstChild.textContent = fmtClock(v);
      if (on && v < 10 && this.opts.me === color && !this.lowPlayed[color]) { this.lowPlayed[color] = true; play("lowtime"); }
      if (on && this.opts.onFlag && v <= 0) this.opts.onFlag(color);
    }
    const turn = this.clock && this.clock.running;
    for (const el of this.root.querySelectorAll(".pbar")) el.classList.toggle("turn", !!turn && el.dataset.color === turn);
  }

  // ───────── history ─────────
  // fens[i] = position after i plies; sans/ucis[i] = the move that leads to fens[i + 1]
  setHistory(fens, sans, ucis, { sound = true, animate = true } = {}) {
    const oldLen = this.hist.fens.length;
    this.hist = { fens, sans, ucis };
    const last = fens.length - 1;
    if (this.follow || this.ply > last) {
      const one = last === this.ply + 1;
      this.ply = last;
      this.show(animate && one);
      if (sound && last > oldLen - 1 && last > 0) playMove(sans[last - 1]);
    } else {
      this.renderMoves();
      this.$(".gs-nav").classList.toggle("behind", this.ply < last);
    }
  }

  pushMove(fen, san, uci, opts = {}) {
    const fens = this.hist.fens.slice(), sans = this.hist.sans.slice(), ucis = this.hist.ucis.slice();
    fens.push(fen); sans.push(san); ucis.push(uci);
    this.setHistory(fens, sans, ucis, opts);
  }

  isLive() { return this.ply === this.hist.fens.length - 1; }

  go(i, user = false) {
    const last = this.hist.fens.length - 1;
    i = Math.max(0, Math.min(last, i));
    if (user && i !== this.ply) {
      const fwd = i === this.ply + 1;
      this.ply = i;
      this.follow = i === last;
      this.show(fwd);
      if (fwd && i > 0) playMove(this.hist.sans[i - 1]);
    } else {
      this.ply = i;
      this.follow = i === last;
      this.show(false);
    }
  }

  show(animate) {
    const i = this.ply;
    const fen = this.hist.fens[i];
    const uci = i > 0 ? this.hist.ucis[i - 1] : null;
    const live = this.isLive();
    // the server knows best whether a king is in check (game modes, illegal AI positions); else chess.js
    const check = live && this.liveCheck !== undefined ? this.liveCheck : fenInfo(fen).check;
    this.board.set({
      fen, animate, check,
      last: lastSquares(uci),
      movable: live ? this.movable : null,
      premovable: live ? this.premovable : null,
    });
    if (!live) { this.board.cancelPremove(); this.board.setDrop(null); }
    if (this.fogLive !== undefined) this.board.setFog(live ? this.fogLive : null);
    this.renderCaps();
    this.renderMoves();
    this.$(".gs-nav").classList.toggle("behind", !live);
    if (this.review) this.showReviewPly();
    if (this.opts.onPly) this.opts.onPly(i, live);
  }

  setMovable(movable, premovable = null) {
    this.movable = movable;
    this.premovable = premovable;
    if (this.isLive()) this.board.set({ movable, premovable });
  }

  renderMoves() {
    const { sans } = this.hist;
    const rv = this.review;
    // real move numbers: a puzzle or a game can start in the middle, even with Black to move
    const parts = (this.hist.fens[0] || "").split(" ");
    const offset = parts[1] === "b" ? 1 : 0;
    const firstNo = parseInt(parts[5], 10) || 1;
    let html = "";
    for (let i = 0; i < sans.length + offset; i += 2) {
      const cell = (slot) => {
        const k = slot - offset;
        if (k < 0) return `<span class="mv empty">…</span>`;
        if (k >= sans.length) return `<span class="mv empty"></span>`;
        const cls = rv && rv.moves[k] ? rv.moves[k].cls : null;
        const wild = this.wildMarks && this.wildMarks[k];
        return `<span class="mv${this.ply === k + 1 ? " cur" : ""}${wild ? " wild" : ""}" data-ply="${k + 1}"${wild ? ` title="${esc(t("wild_" + wild))}"` : ""}>` +
          `${cls ? badgeHtml(cls, "sm") : ""}${wild ? `<i class="wi">${WILD_ICON[wild] || "🚫"}</i>` : ""}${pieceSan(sans[k], slot % 2 === 0 ? "w" : "b")}</span>`;
      };
      html += `<div class="mr"><span class="mn">${firstNo + i / 2}.</span>${cell(i)}${cell(i + 1)}</div>`;
    }
    const ml = this.$(".ml");
    ml.innerHTML = html || `<div class="ml-empty">${t("start_pos")}</div>`;
    const cur = ml.querySelector(".cur");
    const box = this.$(".gs-moves");
    if (cur) {
      const r = cur.getBoundingClientRect(), b = box.getBoundingClientRect();
      if (r.top < b.top || r.bottom > b.bottom) box.scrollTop += r.top - b.top - b.height / 2;
      if (r.left < b.left || r.right > b.right) box.scrollLeft += r.left - b.left - b.width / 2;
    } else if (this.ply === 0) { box.scrollTop = 0; box.scrollLeft = fa() ? box.scrollWidth : 0; }
  }

  onNav(a, btn) {
    const last = this.hist.fens.length - 1;
    if (a === "first") this.go(0, true);
    else if (a === "prev") this.go(this.ply - 1, true);
    else if (a === "next") this.go(this.ply + 1, true);
    else if (a === "last") this.go(last, true);
    else if (a === "flip") { this.setOrientation(this.board.orient === "w" ? "b" : "w"); }
    else if (a === "pen") { this.board.drawMode = !this.board.drawMode; btn.classList.toggle("on", this.board.drawMode); if (!this.board.drawMode) this.board.clearShapes(); }
    else if (a === "sound") { setSound(!soundOn()); btn.innerHTML = soundIcon(soundOn()); }
    else if (a === "back") { if (this.opts.onBack) this.opts.onBack(); else history.back(); }
  }

  onKey(e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === "ArrowLeft") { this.go(this.ply - 1, true); e.preventDefault(); }
    else if (e.key === "ArrowRight") { this.go(this.ply + 1, true); e.preventDefault(); }
    else if (e.key === "ArrowUp" || e.key === "Home") { this.go(0, true); e.preventDefault(); }
    else if (e.key === "ArrowDown" || e.key === "End") { this.go(this.hist.fens.length - 1, true); e.preventDefault(); }
    else if (e.key === "f") this.setOrientation(this.board.orient === "w" ? "b" : "w");
  }

  // ───────── actions, status, bubbles ─────────
  setActions(list) {
    this.actions = list;
    this.$(".gs-actions").innerHTML = list.map((a) =>
      `<button class="act ${a.cls || ""}${a.disabled ? " dis" : ""}" data-act="${a.id}" title="${esc(a.label)}">` +
      `${a.icon ? `<span class="ai">${a.icon}</span>` : ""}<span class="al">${esc(a.label)}</span>${a.badge ? `<span class="ab">${esc(a.badge)}</span>` : ""}</button>`).join("");
  }

  status(html, kind = "") {
    const el = this.$(".gs-status");
    el.className = "gs-status " + kind;
    el.innerHTML = html || "";
  }

  say(color, text, ms = 4500) {
    const pos = this.$(`.pbar[data-color="${color}"]`)?.dataset.pos;
    const el = pos && this.$(`.bubble[data-pos="${pos}"]`);
    if (!el || !text) return;
    el.textContent = text;
    el.classList.add("on");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("on"), ms);
  }

  react(color, text) {
    const el = this.$(`.pbar[data-color="${color}"] .react`);
    if (!el) return;
    el.textContent = text;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  showOver({ title, sub, icon = "", lines = [], buttons = [] }) {
    const el = this.$(".gv-over");
    el.innerHTML = `<div class="ov-card"><button class="ov-x" aria-label="close">✕</button>
      <div class="ov-h">${icon ? `<span class="ov-i">${icon}</span>` : ""}<div><div class="ov-t">${esc(title)}</div><div class="ov-s">${esc(sub || "")}</div></div></div>
      <div class="ov-l">${lines.map((l) => `<div>${l}</div>`).join("")}</div>
      <div class="ov-b"></div></div>`;
    for (const b of buttons) {
      const x = h(`<button class="btn ${b.cls || ""}">${esc(b.label)}</button>`);
      x.onclick = () => b.onClick && b.onClick();
      el.querySelector(".ov-b").appendChild(x);
    }
    el.querySelector(".ov-x").onclick = () => el.classList.remove("on");
    el.classList.add("on");
  }

  hideOver() { this.$(".gv-over").classList.remove("on"); }

  // ───────── game modes ─────────
  // mode: what the server says about the game's rules (modes.public) — a chip with the rules, zones on the board
  setMode(mode) {
    this.gmode = mode || null;
    this.$$(".gv-mode").forEach((c) => c.remove());
    const slot = this.$(".gs-mode");
    slot.hidden = true;
    if (!mode || (mode.standard && !mode.wild)) { this.board.setZones([]); return; }
    // one chip in the phone top bar, one in the side panel on computers (each layout hides the other place)
    const chip = () => {
      const el = h(`<button class="gv-mode${mode.wild ? " wild" : ""}" type="button"><span>${esc(mode.emoji || "🎲")}</span><b dir="auto">${esc(mode.name || "")}</b><i>ⓘ</i></button>`);
      el.onclick = () => this.rulesCard();
      return el;
    };
    this.$(".gv-top").insertBefore(chip(), this.$(".gv-live"));
    const side = chip();
    side.insertAdjacentHTML("beforeend", (mode.rules || []).length ? `<small dir="auto">${esc(mode.rules[0])}</small>` : "");
    slot.appendChild(side);
    slot.hidden = false;
    const zones = [];
    if (mode.hill) for (const sq of ["d4", "e4", "d5", "e5"]) zones.push({ sq, cls: "hill" });
    if (mode.core === "racing") for (const f of "abcdefgh") zones.push({ sq: f + "8", cls: "race" });
    else if (mode.race) for (const f of "abcdefgh") { zones.push({ sq: f + "8", cls: "race" }); zones.push({ sq: f + "1", cls: "race" }); }
    this.board.setZones(zones);
  }

  rulesCard() {
    const m = this.gmode;
    if (!m) return;
    modal({ title: `${esc(m.emoji)} ${esc(m.name)}`, body: `<ul class="rules-list">${(m.rules || []).map((r) => `<li dir="auto">${esc(r)}</li>`).join("")}</ul>`,
      buttons: [{ label: "OK", cls: "primary" }] });
  }

  // checks given so far (3-check, 1-check…): {w, b} and how many win
  setChecks(ck, need) {
    this._ck = ck ? [ck, need] : null;
    for (const el of this.root.querySelectorAll(".pbar")) {
      let box = el.querySelector(".ckc");
      if (!ck) { if (box) box.remove(); continue; }
      if (!box) { box = h(`<span class="ckc"></span>`); el.querySelector(".pn").appendChild(box); }
      const n = ck[el.dataset.color] || 0;
      box.innerHTML = Array.from({ length: need || 3 }, (_, i) => `<i class="${i < n ? "on" : ""}">+</i>`).join("");
    }
  }

  // crazyhouse pockets: {w: "QRP", b: ""}; the player's own pieces can be picked when it's their move
  setPockets(pockets, mine, dropDests) {
    this._pk = pockets ? [pockets, mine, dropDests] : null;
    for (const el of this.root.querySelectorAll(".pbar")) {
      const color = el.dataset.color;
      let box = el.querySelector(".pocket");
      if (!pockets) { if (box) box.remove(); continue; }
      if (!box) { box = h(`<div class="pocket" dir="ltr"></div>`); el.querySelector(".pinfo").appendChild(box); }
      const counts = {};
      for (const ch of (pockets[color] || "").toUpperCase()) counts[ch] = (counts[ch] || 0) + 1;
      const can = mine === color && dropDests;
      box.innerHTML = ["Q", "R", "B", "N", "P"].filter((p) => counts[p]).map((p) =>
        `<button class="pk${can && dropDests.has(p) ? " can" : ""}" data-p="${p}" ${can && dropDests.has(p) ? "" : "disabled"}>` +
        `<span class="pc" data-c="${color}${p}"></span>${counts[p] > 1 ? `<b>${counts[p]}</b>` : ""}</button>`).join("") ||
        `<span class="muted small">${t("pocket_empty")}</span>`;
      const cur = this.board.drop;
      if (cur && cur.piece[0] === color) box.querySelector(`.pk[data-p="${cur.piece[1]}"]`)?.classList.add("on");
      if (can) box.querySelectorAll(".pk.can").forEach((b) => b.onclick = () => {
        const on = b.classList.contains("on");
        box.querySelectorAll(".pk").forEach((x) => x.classList.remove("on"));
        if (on) { this.board.setDrop(null); return; }
        b.classList.add("on");
        this.board.setDrop({ piece: color + b.dataset.p, dests: dropDests.get(b.dataset.p) || [],
          onCancel: () => b.classList.remove("on") });
      });
    }
  }

  // an AI game with illegal moves: which plies were illegal ("spawn", "teleport", "self", "king", "castle")
  setWildMarks(marks) { this.wildMarks = marks || null; this.renderMoves(); }

  // ───────── Game Review ─────────
  setEval(on) {
    this.$(".evalbar").hidden = !on;
    this.fit();
  }

  setReview(review) {
    this.review = review;
    this.root.querySelector(".gv").classList.add("reviewing");
    this.setEval(true);
    this.renderReviewPanel();
    this.renderMoves();
    this.showReviewPly();
  }

  renderReviewPanel() {
    const rv = this.review;
    const box = this.$(".gs-review");
    box.hidden = false;
    const pl = this.players;
    const acc = (c) => rv.accuracy && rv.accuracy[c] != null ? rv.accuracy[c].toFixed(1) : "—";
    const rows = CLASS_ORDER.map((k) => `<div class="rc-row"><span class="rc-n w">${rv.counts?.w?.[k] ?? 0}</span>` +
      `<span class="rc-l">${badgeHtml(k)}<span style="color:${CLS[k].color}">${t("c_" + k)}</span></span>` +
      `<span class="rc-n b">${rv.counts?.b?.[k] ?? 0}</span></div>`).join("");
    box.innerHTML = `
      <div class="rv-graph" dir="ltr">${graphSvg(rv)}</div>
      <div class="rv-players">
        <div class="rv-p"><div class="rv-name" dir="auto">${esc(pl.w.name)}</div><div class="acc w">${acc("w")}</div></div>
        <div class="rv-mid">${t("accuracy")}</div>
        <div class="rv-p"><div class="rv-name" dir="auto">${esc(pl.b.name)}</div><div class="acc b">${acc("b")}</div></div>
      </div>
      <div class="rc">${rows}</div>
      ${rv.rating ? `<div class="rv-rate"><span>${rv.rating.w ?? "—"}</span><span>${t("game_rating")}</span><span>${rv.rating.b ?? "—"}</span></div>` : ""}
      <div class="rv-btns"><button class="btn" data-rv="key">${t("key_moment")}</button>${this.opts.onRetry ? `<button class="btn ghost" data-rv="retry">${t("retry")}</button>` : ""}</div>`;
    box.querySelector(".rv-graph svg")?.addEventListener("click", (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const n = this.hist.fens.length - 1;
      this.go(Math.round(((e.clientX - r.left) / r.width) * n), true);
    });
    box.querySelector('[data-rv="key"]').onclick = () => this.nextKey();
    const retry = box.querySelector('[data-rv="retry"]');
    if (retry) retry.onclick = () => this.opts.onRetry(this.ply);
  }

  nextKey() {
    const mv = this.review.moves;
    for (let k = this.ply; k < mv.length; k++) if (KEY.has(mv[k].cls)) { this.go(k + 1, true); return; }
    for (let k = 0; k < mv.length; k++) if (KEY.has(mv[k].cls)) { this.go(k + 1, true); return; }
  }

  showReviewPly() {
    const rv = this.review;
    const i = this.ply;
    const ev = rv.evals ? rv.evals[i] : null;
    if (ev != null) {
      const p = winPct(ev);
      const flipped = this.board.orient === "b";
      const fill = this.$(".ev-fill");
      fill.style.height = (flipped ? 100 - p : p) + "%";
      this.$(".evalbar").classList.toggle("flip", flipped);
      const tx = this.$(".ev-t");
      tx.textContent = evalLabel(rv, i, ev).replace("-", "");
      tx.classList.toggle("dark", ev < 0);
      tx.classList.toggle("top", (ev < 0) !== flipped);
      graphCursor(this.$(".rv-graph svg"), i, this.hist.fens.length - 1);
    }
    const coach = this.$(".gs-coach");
    const m = i > 0 ? rv.moves[i - 1] : null;
    if (!m) {
      this.board.setMarks([]);
      this.board.setAutoShapes([]);
      coach.hidden = false;
      coach.innerHTML = `<div class="co-t">${t("start_pos")}</div>`;
      return;
    }
    const to = m.uci.slice(2, 4);
    const c = CLS[m.cls];
    this.board.setMarks([{ sq: to, color: c.color, icon: c.icon, tint: hexA(c.color, 0.42) }]);
    const showBest = m.best_uci && m.best_uci !== m.uci && !["best", "book", "brilliant", "great"].includes(m.cls);
    this.board.setAutoShapes(showBest ? [{ from: m.best_uci.slice(0, 2), to: m.best_uci.slice(2, 4), color: "best" }] : []);
    const san = pieceSan(m.san, m.color);
    coach.hidden = false;
    coach.innerHTML = `<div class="co-h">${badgeHtml(m.cls, "lg")}<span style="color:${c.color}">${t("x_" + m.cls, { san })}</span>` +
      `${ev != null ? `<span class="co-ev">${evalLabel(rv, i, ev)}</span>` : ""}</div>` +
      (showBest && m.best ? `<div class="co-b">${t("best_was", { move: pieceSan(m.best, m.color) })}</div>` : "");
  }
}

export const WILD_ICON = { spawn: "👻", teleport: "🌀", self: "🔪", king: "👑", castle: "🏰" };

// the squares to highlight for a move: "e2e4" → e2, e4 · a drop / a piece from nowhere "N@f3" → f3 · hidden "" → none
export function lastSquares(uci) {
  if (!uci || uci === "0000") return null;
  if (uci[1] === "@") return [uci.slice(2, 4)];
  return [uci.slice(0, 2), uci.slice(2, 4)];
}

// "+0.4", "M3" (mate in 3), "1-0" when the position is checkmate
function evalLabel(rv, i, ev) {
  const mate = rv.mates ? rv.mates[i] : null;
  if (mate === 0) return ev > 0 ? "1-0" : "0-1";
  if (mate) return (mate > 0 ? "M" : "-M") + Math.abs(mate);
  if (Math.abs(ev) >= 1500 && i === (rv.evals || []).length - 1) return ev > 0 ? "1-0" : "0-1";
  return evalText(ev);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

function soundIcon(on) {
  return on ? `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05A4.47 4.47 0 0016.5 12zM14 3.23v2.06a7 7 0 010 13.42v2.06A9 9 0 0014 3.23z"/></svg>`
    : `<svg viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0021 12a9 9 0 00-7-8.77v2.06A7 7 0 0119 12zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
}

// SAN with a small piece icon instead of the letter (like the big sites do)
export function pieceSan(san, color) {
  if (!san) return "";
  const m = /^([KQRBN])(.*)$/.exec(san);
  if (!m) return `<span class="san">${esc(san)}</span>`;
  return `<span class="san"><span class="pc fi" data-c="${color}${m[1]}"></span>${esc(m[2])}</span>`;
}

function graphSvg(rv) {
  const ev = rv.evals || [];
  const n = Math.max(1, ev.length - 1);
  const W = 300, H = 70;
  const y = (cp) => H - (winPct(cp) / 100) * H;
  let pts = `0,${H} `;
  ev.forEach((cp, i) => { pts += `${((i / n) * W).toFixed(1)},${y(cp).toFixed(1)} `; });
  pts += `${W},${H}`;
  const dots = (rv.moves || []).map((m, i) => KEY.has(m.cls) && m.cls !== "inaccuracy"
    ? `<circle cx="${(((i + 1) / n) * W).toFixed(1)}" cy="${y(ev[i + 1] ?? 0).toFixed(1)}" r="3.2" fill="${CLS[m.cls].color}" stroke="#fff" stroke-width="1"/>` : "").join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><rect width="${W}" height="${H}" fill="#403d39"/>` +
    `<polygon points="${pts}" fill="#f8f8f8"/><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#888" stroke-width=".6" stroke-dasharray="3 3"/>` +
    `<line class="gc" x1="0" y1="0" x2="0" y2="${H}" stroke="#81b64c" stroke-width="1.6"/>${dots}</svg>`;
}

function graphCursor(svg, i, n) {
  if (!svg) return;
  const x = ((i / Math.max(1, n)) * 300).toFixed(1);
  const l = svg.querySelector(".gc");
  if (l) { l.setAttribute("x1", x); l.setAttribute("x2", x); }
}
