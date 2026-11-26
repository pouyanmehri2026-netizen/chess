// Games against the bots. Everything runs in the browser (Stockfish 19 in a Web Worker),
// so the bots answer instantly and keep working even when the game server is offline.
import { Chess } from "./vendor/chess.js?v=5bdc901d4f";
import { GameView, START_FEN } from "./gameview.js?v=5bdc901d4f";
import { getEngine } from "./engine.js?v=5bdc901d4f";
import { t, fa } from "./i18n.js?v=5bdc901d4f";
import { store, toast, confirmBox, initials, sleep, esc } from "./util.js?v=5bdc901d4f";
import { play } from "./sound.js?v=5bdc901d4f";
import * as api from "./api.js?v=5bdc901d4f";

// How each bot chooses its moves (levels match the Bale bot: club 1–11, Stockfish 21–28).
const PLAY = {
  1: { rand: 0.45, depth: 1, skill: 0, multipv: 4 },
  2: { rand: 0.2, depth: 2, skill: 0, multipv: 3 },
  3: { rand: 0.08, depth: 3, skill: 3, multipv: 2 },
  4: { rand: 0.03, depth: 5, skill: 6, multipv: 2 },
  5: { elo: 1400, movetime: 350 }, 6: { elo: 1600, movetime: 400 }, 7: { elo: 1800, movetime: 450 },
  8: { elo: 2000, movetime: 500 }, 9: { elo: 2200, movetime: 600 }, 10: { elo: 2400, movetime: 700 },
  11: { elo: 2650, movetime: 900 },
  21: { skill: 0, depth: 1, movetime: 50 }, 22: { skill: 3, depth: 2, movetime: 80 }, 23: { skill: 6, depth: 3, movetime: 100 },
  24: { skill: 9, depth: 5, movetime: 150 }, 25: { skill: 12, depth: 8, movetime: 250 },
  26: { skill: 15, depth: 12, movetime: 400 }, 27: { skill: 18, depth: 16, movetime: 700 }, 28: { skill: 20, movetime: 1500 },
};

let BOTS = null;
export async function loadBots() {
  if (!BOTS) BOTS = await (await fetch("data/bots.json?v=5bdc901d4f")).json();
  return BOTS;
}
export function botName(b) { return (b.title ? b.title + " " : "") + (fa() ? b.name_fa : b.name); }

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function fallbackMove(chess) {  // if WebAssembly is unavailable: grab material, otherwise random
  const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => (VAL[b.captured] || 0) - (VAL[a.captured] || 0) + (Math.random() - 0.5));
  return moves[0];
}

export async function botMove(chess, level) {
  const cfg = PLAY[level] || PLAY[3];
  const moves = chess.moves({ verbose: true });
  if (moves.length <= 1) return moves[0] || null;
  if (cfg.rand && Math.random() < cfg.rand) {
    const caps = moves.filter((m) => m.captured);
    const pool = caps.length && Math.random() < 0.5 ? caps : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  try {
    const res = await getEngine("play").search({ fen: chess.fen(), depth: cfg.depth, movetime: cfg.movetime,
      multipv: cfg.multipv || 1, skill: cfg.skill ?? 20, elo: cfg.elo });
    let uci = res.best;
    if ((cfg.multipv || 1) > 1 && res.lines.length > 1) {
      const w = [0.55, 0.25, 0.12, 0.08];
      let r = Math.random(), k = 0;
      for (; k < res.lines.length - 1; k++) { if (r < w[k]) break; r -= w[k]; }
      uci = res.lines[k].pv[0] || uci;
    }
    return moves.find((m) => m.lan === uci) || moves.find((m) => m.lan === res.best) || fallbackMove(chess);
  } catch {
    return fallbackMove(chess);
  }
}

function result(chess) {
  if (chess.isCheckmate()) return { winner: chess.turn() === "w" ? "b" : "w", reason: "checkmate" };
  if (chess.isStalemate()) return { winner: null, reason: "stalemate" };
  if (chess.isInsufficientMaterial()) return { winner: null, reason: "insufficient" };
  if (chess.isThreefoldRepetition()) return { winner: null, reason: "threefold" };
  if (chess.isDrawByFiftyMoves()) return { winner: null, reason: "fifty" };
  return null;
}

function uciMove(chess, uci) {
  return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
}

export class LocalGame {
  // settings: { level, color: "w"|"b"|"r", tc: null | [minutes, increment] } or a saved game
  constructor(root, settings, nav) {
    this.root = root;
    this.nav = nav;
    const saved = settings.saved ? settings.saved : null;
    this.s = saved || {
      id: settings.id || Date.now(), level: settings.level, color: settings.color === "r" ? (Math.random() < 0.5 ? "w" : "b") : settings.color,
      tc: settings.tc || null, moves: [], hints: 3, assisted: false, over: null, reported: false,
      clocks: settings.tc ? { w: settings.tc[0] * 60, b: settings.tc[0] * 60 } : null, turnAt: null,
      fen: settings.fen || null,  // a custom start position (Position Editor)
    };
    if (saved && !saved.over) this.s.turnAt = Date.now();  // the clock doesn't run while the page was closed
    this.alive = true;
    this.start();
  }

  async start() {
    const bots = await loadBots();
    this.bot = bots.find((b) => b.level === this.s.level) || bots[0];
    const start = this.s.fen || START_FEN;
    try { this.chess = new Chess(start); } catch { this.s.fen = null; this.chess = new Chess(); }
    const fens = [this.chess.fen()], sans = [], ucis = [];
    for (const u of this.s.moves) {
      const m = uciMove(this.chess, u);
      fens.push(this.chess.fen()); sans.push(m.san); ucis.push(u);
    }
    const me = this.s.color, botColor = me === "w" ? "b" : "w";
    const myName = store.get("me")?.name || t("you");
    this.view = new GameView(this.root, {
      mode: "local", orient: me, me, startFen: fens[0],
      onMove: (f, to, p, meta) => this.userMove(f, to, p, meta),
      onBack: () => this.nav("#/bots"),
      onFlag: (c) => this.flag(c),
    });
    const bot = this.bot;
    const players = {};
    const mf = store.get("me")?.flair || {};
    players[me] = { name: myName, elo: store.get("me")?.elo || "", bot: false, title: mf.title, title_color: mf.title_color,
      tag: mf.tag, show: mf.showcase || [], flag: mf.flag };
    players[botColor] = { name: botName(bot), elo: bot.elo, bot: true, color: bot.color, initials: bot.initials, title: bot.title };
    this.view.setPlayers(players);
    this.view.setTitle(`<span class="gt-ic">🤖</span>${esc(botName(bot))} <span class="muted">· ${esc(this.tcLabel())}</span>`);
    this.view.setHistory(fens, sans, ucis, { sound: false, animate: false });
    this.save();
    if (this.s.over) { this.updateUi(); this.finish(true); return; }
    if (!this.s.moves.length) {
      play("start");
      this.say("start", 1);
      this.view.status(t("first_move_bot", { color: t(me === "w" ? "white" : "black") }));
    }
    this.updateUi();
    if (this.chess.turn() !== me) this.think();
  }

  tcLabel() { return this.s.tc ? `${this.s.tc[0]}+${this.s.tc[1]}` : t("no_timer"); }

  save() { if (!this.s.over || !this.s.reported) store.set("botgame", this.s); }

  say(event, chance = 0.5) {
    const lines = this.bot?.lines?.[event];
    if (!lines || !lines.length || Math.random() > chance) return;
    const [en, fav] = lines[Math.floor(Math.random() * lines.length)];
    this.view.say(this.s.color === "w" ? "b" : "w", fa() ? fav : en);
  }

  myTurn() { return !this.s.over && this.chess.turn() === this.s.color; }

  updateUi() {
    const me = this.s.color;
    if (this.myTurn()) {
      const dests = new Map();
      for (const m of this.chess.moves({ verbose: true })) {
        if (!dests.has(m.from)) dests.set(m.from, []);
        dests.get(m.from).push(m.to);
      }
      this.view.setMovable({ color: me, dests });
    } else this.view.setMovable(null, this.s.over ? null : { color: me, dests: this.premoveDests() });
    this.updateClock();
    const acts = [];
    if (!this.s.over) {
      acts.push({ id: "hint", label: t("hint"), icon: "💡", badge: String(this.s.hints), disabled: !this.myTurn() || this.s.hints <= 0, onClick: () => this.hint() });
      acts.push({ id: "undo", label: t("takeback"), icon: "↶", disabled: this.s.moves.length < 1, onClick: () => this.takeback() });
      acts.push({ id: "draw", label: t("draw"), icon: "½", onClick: () => this.offerDraw() });
      acts.push({ id: "resign", label: t("resign"), icon: "⚑", cls: "warn", onClick: () => this.resign() });
    } else {
      acts.push({ id: "review", label: t("game_review"), icon: "★", cls: "primary", onClick: () => this.openReview() });
      acts.push({ id: "again", label: t("rematch"), icon: "↻", onClick: () => this.rematch() });
      acts.push({ id: "new", label: t("new_game"), icon: "+", onClick: () => this.nav("#/bots") });
    }
    this.view.setActions(acts);
  }

  premoveDests() {
    // moves my pieces could make if it were my turn (good enough for premoves)
    try {
      const parts = this.chess.fen().split(" ");
      parts[1] = this.s.color;
      parts[3] = "-";
      const c = new Chess(parts.join(" "), { skipValidation: true });
      const dests = new Map();
      for (const m of c.moves({ verbose: true })) {
        if (!dests.has(m.from)) dests.set(m.from, []);
        dests.get(m.from).push(m.to);
      }
      return dests;
    } catch { return new Map(); }
  }

  updateClock() {
    if (!this.s.clocks) { this.view.setClock(null); return; }
    const running = !this.s.over && this.s.moves.length > 0 ? this.chess.turn() : null;
    const c = { ...this.s.clocks };
    if (running && this.s.turnAt) c[running] = Math.max(0, c[running] - (Date.now() - this.s.turnAt) / 1000);
    this.view.setClock({ w: c.w, b: c.b, running });
  }

  spendClock() {  // charge the side that is moving now (White's very first move is free: clocks start after it)
    if (!this.s.clocks || !this.s.moves.length || !this.s.turnAt) return;
    const mover = this.chess.turn();
    this.s.clocks[mover] = Math.max(0, this.s.clocks[mover] - (Date.now() - this.s.turnAt) / 1000) + this.s.tc[1];
  }

  apply(uci, { drag = false } = {}) {
    if (this.s.clocks) this.spendClock();
    const m = uciMove(this.chess, uci);
    this.s.moves.push(uci);
    this.s.turnAt = Date.now();
    this.view.pushMove(this.chess.fen(), m.san, uci, { animate: !drag });
    const r = result(this.chess);
    if (r) this.end(r.winner, r.reason);
    this.save();
    return m;
  }

  userMove(from, to, promo, meta) {
    if (!this.myTurn()) return;
    const legal = this.chess.moves({ verbose: true }).find((m) => m.from === from && m.to === to && (!m.promotion || m.promotion === (promo || "q")));
    if (!legal) { this.view.show(false); return; }
    this.view.board.setAutoShapes([]);
    this.view.board.setHint(null);
    this.view.status("");
    const m = this.apply(legal.lan, meta);
    if (m && m.captured && Math.random() < 0.45) this.say("hurt", 1);
    this.updateUi();
    if (!this.s.over) this.think();
  }

  async think() {
    const ply = this.s.moves.length;
    const botColor = this.s.color === "w" ? "b" : "w";
    this.view.status(`<span class="dots">${esc(botName(this.bot))} ${t("bot_thinking")}</span>`);
    const t0 = Date.now();
    const mv = await botMove(this.chess, this.s.level);
    const fast = this.s.tc && this.s.tc[0] <= 3;
    const want = fast ? 250 + Math.random() * 350 : 450 + Math.random() * 700;
    const left = want - (Date.now() - t0);
    if (left > 0) await sleep(left);
    if (!this.alive || this.s.over || this.s.moves.length !== ply || this.chess.turn() !== botColor || !mv) return;
    this.view.status("");
    const m = this.apply(mv.lan);
    if (m && (m.captured || this.chess.inCheck()) && !this.s.over) this.say("taunt", 0.45);
    this.updateUi();
    this.tryPremove();
  }

  tryPremove() {
    const pre = this.view.board.takePremove();
    if (!pre || !this.myTurn()) return;
    const legal = this.chess.moves({ verbose: true }).find((m) => m.from === pre.from && m.to === pre.to);
    if (legal) this.userMove(pre.from, pre.to, legal.promotion ? "q" : undefined, { drag: false });
  }

  flag(color) {
    if (this.s.over || !this.s.clocks) return;
    const other = color === "w" ? "b" : "w";
    const hasMating = (c) => this.chess.board().flat().some((p) => p && p.color === c && p.type !== "k");
    this.s.clocks[color] = 0;
    this.end(hasMating(other) ? other : null, hasMating(other) ? "timeout" : "timeout_insufficient");
    this.updateUi();
  }

  async hint() {
    if (!this.myTurn() || this.s.hints <= 0) { toast(t("no_hints")); return; }
    this.s.hints--;
    this.s.assisted = true;
    this.save();
    this.updateUi();
    try {
      const res = await getEngine("play").search({ fen: this.chess.fen(), movetime: 900, depth: 16, skill: 20 });
      if (res.best && this.myTurn()) {
        this.view.board.setHint(res.best.slice(0, 2));
        this.view.board.setAutoShapes([{ from: res.best.slice(0, 2), to: res.best.slice(2, 4), color: "hint" }]);
      }
    } catch { toast("Engine unavailable"); }
  }

  takeback() {
    if (this.s.over || !this.s.moves.length) return;
    const n = this.chess.turn() === this.s.color ? 2 : 1;
    for (let i = 0; i < n && this.s.moves.length; i++) { this.chess.undo(); this.s.moves.pop(); }
    this.s.assisted = true;
    this.s.turnAt = Date.now();
    this.rebuild();
    this.save();
    this.updateUi();
    if (!this.myTurn() && !this.s.over) this.think();
  }

  rebuild() {
    const c = new Chess(this.s.fen || START_FEN);
    const fens = [c.fen()], sans = [];
    for (const u of this.s.moves) { const m = uciMove(c, u); fens.push(c.fen()); sans.push(m.san); }
    this.view.setHistory(fens, sans, this.s.moves.slice(), { sound: false, animate: true });
  }

  async offerDraw() {
    if (this.s.over) return;
    let botView = 0;
    try {
      const res = await getEngine("play").search({ fen: this.chess.fen(), depth: 10, skill: 20 });
      const cp = res.lines[0] ? res.lines[0].cp : 0;
      botView = this.chess.turn() === this.s.color ? -cp : cp;
    } catch { /* keep 0 */ }
    if (botView < -150 || (this.s.moves.length > 80 && Math.abs(botView) < 40)) {
      toast(fa() ? "ربات تساوی را قبول کرد" : "The bot accepts the draw");
      this.end(null, "agreement");
      this.updateUi();
    } else {
      toast(fa() ? "ربات تساوی را قبول نکرد" : "The bot declines the draw");
      this.say("taunt", 1);
    }
  }

  async resign() {
    if (this.s.over) return;
    if (await confirmBox(t("resign_q"), t("yes_resign"), t("keep_playing"))) {
      this.end(this.s.color === "w" ? "b" : "w", "resignation");
      this.updateUi();
    }
  }

  end(winner, reason) {
    if (this.s.over) return;
    this.s.over = { winner, reason, result: winner === "w" ? "1-0" : winner === "b" ? "0-1" : "½-½" };
    play("end");
    const me = this.s.color;
    this.say(winner === null ? "lose" : winner === me ? "lose" : "win", 1);
    this.save();
    this.finish(false);
    this.report();
  }

  finish(quiet) {
    const o = this.s.over, me = this.s.color;
    const title = o.winner === null ? t("draw_title") : o.winner === me ? t("you_won") : t("you_lost");
    const icon = o.winner === null ? "½" : o.winner === me ? "🏆" : "🏳";
    this.view.setClock(this.s.clocks ? { ...this.s.clocks, running: null } : null);
    const show = () => this.view.showOver({
      title, icon, sub: t("by", { reason: t("r_" + o.reason) }),
      lines: [`${esc(botName(this.bot))} · ${this.bot.elo}`],
      buttons: [
        { label: t("game_review"), cls: "primary big", onClick: () => this.openReview() },
        { label: t("rematch"), onClick: () => this.rematch() },
        { label: t("new_game"), cls: "ghost", onClick: () => this.nav("#/bots") },
      ],
    });
    if (quiet) show(); else setTimeout(show, 600);
  }

  async report() {
    const u = api.auth();
    if (!u || this.s.reported) return;
    try {
      const r = await api.post("bot_result", { t: u, level: this.s.level, color: this.s.color, moves: this.s.moves,
        result: this.s.over.result, reason: this.s.over.reason, tc: this.s.tc ? `${this.s.tc[0]}+${this.s.tc[1]}` : "none",
        assisted: this.s.assisted, fen: this.s.fen || "" });
      if (r && r.ok) {
        this.s.reported = true;
        this.s.review = r.review || null;
        store.set("botgame", this.s);
        toast(t("saved_result"));
      }
    } catch { /* offline: the game still has a local review */ }
  }

  openReview() {
    store.set("lastLocal", { moves: this.s.moves, color: this.s.color, level: this.s.level, over: this.s.over, tc: this.s.tc,
      fen: this.s.fen || null });
    if (this.s.review) this.nav(`#/review/${this.s.review}`);
    else this.nav("#/lreview");
  }

  rematch() {
    store.del("botgame");
    this.nav(`#/bot?level=${this.s.level}&color=${this.s.color}&tc=${this.s.tc ? this.s.tc.join("+") : "none"}&new=${Date.now()}` +
      (this.s.fen ? `&fen=${encodeURIComponent(this.s.fen)}` : ""));
  }

  destroy() { this.alive = false; if (this.view) this.view.destroy(); }
}
export const V = "5bdc901d4f";  // the site version this file belongs to (main.js reloads the page after an update)
