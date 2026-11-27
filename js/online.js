// Online games (play or watch) against people, through the Chess bot's game server,
// and the Game Review page (server review for saved games, in-browser review for bot games).
import { Chess } from "./vendor/chess.js?v=ffb4d75985";
import { GameView, START_FEN, pieceSan, plainFen, WILD_ICON, lastSquares } from "./gameview.js?v=ffb4d75985";
import { t, fa } from "./i18n.js?v=ffb4d75985";
import { store, toast, confirmBox, sleep, esc } from "./util.js?v=ffb4d75985";
import { play } from "./sound.js?v=ffb4d75985";
import * as api from "./api.js?v=ffb4d75985";
import { reviewGame, openingName } from "./reviewer.js?v=ffb4d75985";
import { loadBots, botName } from "./local.js?v=ffb4d75985";
import { GameChat } from "./chat.js?v=ffb4d75985";

const CLIENT = store.get("client") || (() => { const c = Math.random().toString(36).slice(2, 12); store.set("client", c); return c; })();

// can chess.js follow this game in the browser (optimistic moves, premoves)? Only normal rules.
function simpleRules(st) {
  const m = st && st.mode;
  return !m || (m.core === "classic" && !m.fog && !m.double && !m.wild);
}

function premoveDests(fen, color) {
  try {
    const parts = plainFen(fen).split(" ");
    parts[1] = color;
    parts[3] = "-";
    const c = new Chess(parts.join(" "), { skipValidation: true });
    const d = new Map();
    for (const m of c.moves({ verbose: true })) { if (!d.has(m.from)) d.set(m.from, []); d.get(m.from).push(m.to); }
    return d;
  } catch { return new Map(); }
}

export class OnlineGame {
  constructor(root, token, nav, { watch = false } = {}) {
    this.root = root;
    this.token = token;
    this.nav = nav;
    this.watch = watch;
    this.v = -1;
    this.alive = true;
    this.first = true;
    this.seen = { bubble: 0, reaction: 0 };
    this.overShown = false;
    this.start();
  }

  async start() {
    this.view = new GameView(this.root, {
      mode: this.watch ? "watch" : "online",
      onMove: (f, to, p, meta) => this.userMove(f, to, p, meta),
      onBack: () => this.nav(this.watch ? "#/" : "#/play"),
    });
    this.view.status(`<span class="dots">${fa() ? "در حال اتصال" : "Connecting"}</span>`);
    // fair play: leaving the tab while it's your move is noted (once per move)
    this.blurPly = -1;
    this.onBlur = () => {
      const st = this.st;
      if (!st || this.watch || !this.me || st.over || !st.rated || st.turn !== this.me) return;
      const ply = (st.sans || []).length;
      if (ply === this.blurPly || (document.visibilityState === "visible" && document.hasFocus())) return;
      this.blurPly = ply;
      api.post("blur", { t: this.token }).catch(() => {});
    };
    document.addEventListener("visibilitychange", this.onBlur);
    window.addEventListener("blur", this.onBlur);
    this.loop();
  }

  async sendChat(text) {
    try {
      const r = await api.post("game_chat", { t: this.token, text, l: fa() ? "fa" : "en" });
      if (r.error) toast(r.error, "bad");
      if (r.state) this.apply(r.state);
    } catch { toast(t("reconnecting")); }
  }

  async loop() {
    let fails = 0;
    while (this.alive) {
      try {
        const st = await api.get("state", { t: this.token, v: this.v, c: CLIENT, l: fa() ? "fa" : "en" }, 32000);
        if (!this.alive) return;
        fails = 0;
        if (st.error) { this.gone(st.error); return; }
        this.apply(st);
      } catch {
        if (!this.alive) return;
        fails++;
        this.view.status(t("reconnecting"), "warn");
        await sleep(Math.min(5000, 800 * fails));
      }
    }
  }

  gone(msg) {
    this.view.status(esc(msg || t("game_gone")), "warn");
    this.view.setMovable(null);
    this.view.setActions([{ id: "home", label: t("new_game"), icon: "+", cls: "primary", onClick: () => this.nav("#/play") }]);
  }

  apply(st) {
    this.st = st;
    const me = this.watch ? null : st.me;
    if (this.first) {
      this.first = false;
      this.me = me;
      this.view.opts.me = me;
      this.view.setOrientation(me || "w");
      this.view.setPlayers(st.players);
      const live = this.watch ? `<span class="live-pill">● ${t("live")}</span>` : "";
      const ai = st.ai ? ` · <span class="ai-pill">🧠 ${esc(st.ai.model || "AI")}</span>` : "";
      this.view.setTitle(`${esc(st.tc || "")}${st.rated ? ` · <span class="muted">${fa() ? "رسمی" : "Rated"}</span>` : ""}${ai}`, live);
      this.view.setMode(st.mode);
      this.view.noCaps = !!(st.mode && (st.mode.fog || st.mode.core === "crazyhouse"));
      if (!st.over && me) play("start");
      // chat with people — and with an AI bot (it reads what you write with your next move)
      if (st.chat && (!st.vs_bot || st.ai)) this.view.enableChat(GameChat, { onSend: (x) => this.sendChat(x), canChat: !!st.can_chat });
    }
    if (st.chat) this.view.setChat(st.chat);
    this.v = st.v;
    const ucis = st.ucis || [];
    this.view.liveCheck = st.check || null;
    this.view.fogLive = st.fog ? st.fog : null;
    if (st.marks) this.view.wildMarks = st.marks;
    const before = this.view.hist.sans.length;
    this.view.setHistory(st.fens || [st.fen], st.sans || [], ucis, { sound: true, animate: true });
    this.effects(st, before);
    const myTurn = me && !st.over && st.ready && st.turn === me;
    const drops = new Map();
    if (myTurn) {
      const dests = new Map();
      for (const u of st.legal || []) {
        if (u[1] === "@") {  // crazyhouse: put a captured piece back
          if (!drops.has(u[0])) drops.set(u[0], []);
          drops.get(u[0]).push(u.slice(2, 4));
          continue;
        }
        const f = u.slice(0, 2), to = u.slice(2, 4);
        if (!dests.has(f)) dests.set(f, []);
        if (!dests.get(f).includes(to)) dests.get(f).push(to);
      }
      this.view.setMovable({ color: me, dests });
    } else if (me && !st.over && st.ready && simpleRules(st)) {
      this.view.setMovable(null, { color: me, dests: premoveDests(st.fen, me) });
    } else this.view.setMovable(null);
    this.view.setChecks(st.checks || null, st.mode ? st.mode.checks : 0);
    this.view.setPockets(st.pockets || null, myTurn ? me : null, myTurn ? drops : null);
    this.view.setClock(st.clocks ? { w: st.clocks.w, b: st.clocks.b, running: st.clock_running ? st.turn : null } : null);
    if (st.bubble && st.bubble.id !== this.seen.bubble) {
      this.seen.bubble = st.bubble.id;
      const botColor = st.players.w.bot ? "w" : "b";
      this.view.say(botColor, st.bubble.text);
    }
    if (st.reaction && st.reaction.id !== this.seen.reaction) {
      const fresh = this.seen.reaction !== 0 || st.v < 5;
      this.seen.reaction = st.reaction.id;
      if (fresh) this.view.react(st.reaction.color, st.reaction.text);
    }
    this.renderStatus(st, me, myTurn);
    this.renderActions(st, me);
    if (st.over && !this.overShown) { this.overShown = true; this.gameOver(st, me); }
    if (st.next_t && this.rematchAsked) this.nav(`#/game/${st.next_t}`);
    if (myTurn) this.tryPremove();
  }

  // explosions, illegal AI moves, the second move of a Double Move turn
  effects(st, before) {
    const n = (st.sans || []).length;
    if (n <= before || !this.view.isLive()) return;
    const sq = (lastSquares((st.ucis || [])[n - 1]) || []).slice(-1)[0];
    if (st.boom && st.boom.ply === n) this.view.board.flash(st.boom.sq, "💥", "boom");
    const mark = st.marks && st.marks[n - 1];
    if (mark && sq) { this.view.board.flash(sq, WILD_ICON[mark] || "🚫", "wild"); play("bad"); }
  }

  renderStatus(st, me, myTurn) {
    let s = "", kind = "";
    if (st.over) s = esc(st.subtitle || "");
    else if (st.ai && st.ai.thinking && st.turn !== me) s = `<span class="dots">🧠 ${esc(st.ai.model || "AI")} ${t("ai_thinking")}</span>`;
    else if (st.double && st.double.second && myTurn) { s = `⚡ ${t("double_second")}`; kind = "hl"; }
    else if (!st.ready) s = `<span class="dots">${t(this.watch || !me ? "waiting_players" : "waiting_join")}</span>`;
    else if (st.draw_offer && me && st.draw_offer !== me) { s = t("opp_offers_draw"); kind = "hl"; }
    else if (st.abort_in != null && myTurn) s = t("abort_in", { s: st.abort_in });
    else if (st.first_move && me === "w") s = t("first_move");
    else if (this.watch) s = `👁 ${t("watching_n", { n: st.watchers || 0 })}`;
    else if (me) s = myTurn ? t("your_turn") : t("their_turn");
    if (st.opening && !st.over) s += `<div class="op">📖 ${esc(st.opening)}</div>`;
    if (st.ai && st.ai.wild) s += `<div class="op">🤡 ${t("ai_illegal_n", { n: st.ai.illegal || 0 })}</div>`;
    if (st.ai && st.ai.error) s += `<div class="op bad">⚠️ ${esc(st.ai.error)}</div>`;
    this.view.status(s, kind);
  }

  renderActions(st, me) {
    const acts = [];
    if (this.watch) {
      if (st.over) acts.push({ id: "review", label: t("game_review"), icon: "★", cls: "primary", onClick: () => this.nav(`#/review/${this.token}`) });
    } else if (!st.over) {
      if (st.draw_offer && st.draw_offer !== me) {
        acts.push({ id: "acc", label: t("accept"), icon: "½", cls: "primary", onClick: () => this.act("draw") });
        acts.push({ id: "dec", label: t("decline"), icon: "✕", onClick: () => { this.declined = st.v; this.renderActions({ ...st, draw_offer: null }, me); } });
      } else {
        const plies = (st.sans || []).length;
        if (plies < 2) acts.push({ id: "abort", label: t("abort"), icon: "✕", onClick: () => this.resign(true) });
        else acts.push({ id: "draw", label: t("offer_draw"), icon: "½", disabled: st.draw_offer === me, onClick: () => this.act("draw", t("draw_sent")) });
        acts.push({ id: "resign", label: t("resign"), icon: "⚑", cls: "warn", onClick: () => this.resign(false) });
      }
      if (st.reactions && st.reactions.length) acts.push({ id: "emoji", label: "😀", icon: "", onClick: (el) => this.emojiMenu(el) });
    } else {
      acts.push({ id: "review", label: t("game_review"), icon: "★", cls: "primary", onClick: () => this.nav(`#/review/${this.token}`) });
      const opp = me === "w" ? "b" : "w";
      const wants = st.rematch && st.rematch[opp] && !st.players[opp].bot;
      acts.push({ id: "rematch", label: wants ? t("opp_rematch") : this.rematchAsked ? t("rematch_wait") : t("rematch"), icon: "↻",
        cls: wants ? "hl" : "", onClick: () => this.rematch() });
      acts.push({ id: "new", label: t("new_game"), icon: "+", onClick: () => this.nav("#/play") });
    }
    this.view.setActions(acts);
  }

  emojiMenu(anchor) {
    const old = document.querySelector(".emoji-pop");
    if (old) { old.remove(); return; }
    const pop = document.createElement("div");
    pop.className = "emoji-pop";
    pop.innerHTML = this.st.reactions.map((r) => `<button data-r="${esc(r.key)}">${esc(r.label)}</button>`).join("");
    pop.onclick = async (e) => {
      const b = e.target.closest("[data-r]");
      if (!b) return;
      pop.remove();
      try { const r = await api.post("react", { t: this.token, r: b.dataset.r, l: fa() ? "fa" : "en" }); if (r.state) this.apply(r.state); } catch { /* ignore */ }
    };
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(window.innerWidth - 270, r.left + r.width / 2 - 130)) + "px";
    pop.style.top = Math.max(8, r.top - 120) + "px";
    setTimeout(() => document.addEventListener("pointerdown", function off(ev) { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener("pointerdown", off); } }), 0);
  }

  async act(kind, okMsg) {
    try {
      const r = await api.post(kind, { t: this.token, l: fa() ? "fa" : "en" });
      if (r.toast) toast(r.toast); else if (okMsg) toast(okMsg);
      if (r.state) this.apply(r.state);
    } catch { toast(t("reconnecting")); }
  }

  async resign(abort) {
    if (!(await confirmBox(abort ? t("abort") + "?" : t("resign_q"), abort ? t("abort") : t("yes_resign"), t("keep_playing")))) return;
    this.act("resign");
  }

  async rematch() {
    this.rematchAsked = true;
    try {
      const r = await api.post("rematch", { t: this.token });
      if (r.t) { this.nav(`#/game/${r.t}`); return; }
      if (r.error) toast(r.error);
      this.renderActions(this.st, this.me);
    } catch { toast(t("reconnecting")); }
  }

  gameOver(st, me) {
    play("end");
    let title = st.title || t("draw_title");
    let icon = "½";
    if (me && st.winner) { title = st.winner === me ? t("you_won") : t("you_lost"); icon = st.winner === me ? "🏆" : "🏳"; }
    else if (st.winner) icon = "🏆";
    if (st.result === "—") { title = t("aborted"); icon = "✕"; }
    const buttons = [{ label: t("game_review"), cls: "primary big", onClick: () => this.nav(`#/review/${this.token}`) }];
    if (!this.watch) {
      buttons.push({ label: t("rematch"), onClick: () => this.rematch() });
      buttons.push({ label: t("new_game"), cls: "ghost", onClick: () => this.nav("#/play") });
    }
    setTimeout(() => this.view.showOver({ title, icon, sub: st.subtitle || "", lines: st.elo_line ? [esc(st.elo_line)] : [], buttons }), 500);
  }

  async userMove(from, to, promo, meta) {
    const st = this.st;
    if (!st || !this.me || st.over || st.turn !== this.me) return;
    let uci = from + to + (promo || "");
    if (from === "@" && meta && meta.drop) uci = meta.drop[1] + "@" + to;  // a pocket piece dropped on a square
    if (!(st.legal || []).includes(uci)) {
      const alt = from !== "@" && (st.legal || []).find((u) => u.startsWith(from + to));
      if (!alt) { this.view.show(false); return; }
      uci = alt.length === 5 && !promo ? from + to + "q" : alt;
    }
    let optimistic = false;
    if (simpleRules(st) && from !== "@") {
      try {  // show the move at once; the server confirms a moment later
        const c = new Chess(plainFen(st.fen));
        const m = c.move({ from, to, promotion: uci[4] || undefined });
        this.view.pushMove(c.fen(), m.san, uci, { animate: !(meta && meta.drag) });
        optimistic = true;
      } catch { /* Chess960 castling etc.: wait for the server */ }
    }
    this.view.setMovable(null, { color: this.me, dests: new Map() });
    try {
      const r = await api.post("move", { t: this.token, uci, l: fa() ? "fa" : "en" });
      if (r.error && r.error !== "not your turn") toast(r.error);
      if (r.state) this.apply(r.state);
    } catch {
      toast(t("reconnecting"));
      if (optimistic) { this.v = -1; }
    }
  }

  tryPremove() {
    const pre = this.view.board.takePremove();
    if (!pre) return;
    const st = this.st;
    const u = (st.legal || []).find((x) => x.startsWith(pre.from + pre.to));
    if (u) this.userMove(pre.from, pre.to, u[4], { drag: false });
  }

  destroy() {
    this.alive = false;
    document.querySelector(".emoji-pop")?.remove();
    document.removeEventListener("visibilitychange", this.onBlur);
    window.removeEventListener("blur", this.onBlur);
    if (this.view) this.view.destroy();
  }
}

// ───────── Game Review page ─────────
export class ReviewPage {
  constructor(root, token, nav, { local = null } = {}) {
    this.root = root;
    this.token = token;
    this.nav = nav;
    this.local = local;
    this.alive = true;
    this.start();
  }

  async start() {
    this.view = new GameView(this.root, {
      mode: "review",
      onMove: (f, to, p) => this.retryMove(f, to, p),
      onBack: () => history.length > 1 ? history.back() : this.nav("#/"),
      onRetry: (ply) => this.retry(ply),
    });
    this.view.status(`<div class="prog"><div class="prog-b" style="width:0%"></div></div><span class="dots">${t("analysing", { p: 0 })}</span>`);
    try {
      if (this.local) await this.runLocal(); else await this.runServer();
    } catch (e) {
      if (this.alive) this.view.status(esc(e.message === "offline" ? t("offline") : String(e.message || e)), "warn");
    }
  }

  progress(p) {
    const pct = Math.round(p * 100);
    this.view.status(`<div class="prog"><div class="prog-b" style="width:${pct}%"></div></div><span class="dots">${t("analysing", { p: pct })}</span>`);
  }

  async runServer() {
    for (;;) {
      if (!this.alive) return;
      const r = await api.get("review", { t: this.token, l: fa() ? "fa" : "en" }, 20000);
      if (r.error) throw new Error(r.error);
      if (r.status === "done") { this.show(r.review, r.state.players, r.state.me, r.state); return; }
      if (r.status === "replay") { this.replay(r.state); return; }  // game modes / AI games: move by move, no engine
      this.progress(r.progress || 0);
      await sleep(900);
    }
  }

  async runLocal() {
    const g = this.local;
    const bots = await loadBots();
    const bot = bots.find((b) => b.level === g.level) || bots[0];
    const me = store.get("me");
    const players = {};
    const botColor = g.color === "w" ? "b" : "w";
    players[g.color] = { name: me?.name || t("you"), elo: me?.elo || "" };
    players[botColor] = { name: botName(bot), elo: bot.elo, bot: true, color: bot.color, initials: bot.initials, title: bot.title };
    const rv = await reviewGame(g.fen || START_FEN, g.moves, (p) => this.alive && this.progress(p));
    if (!this.alive) return;
    this.show(rv, players, g.color, { title: g.over ? (g.over.winner === null ? t("draw_title") : g.over.winner === g.color ? t("you_won") : t("you_lost")) : "", subtitle: g.over ? t("by", { reason: t("r_" + g.over.reason) }) : "" });
  }

  async show(rv, players, me, st) {
    const fens = rv.fens;
    const sans = rv.moves.map((m) => m.san), ucis = rv.moves.map((m) => m.uci);
    this.rv = rv;
    this.view.setPlayers(players);
    this.view.setOrientation(me || "w");
    const op = await openingName(sans, fa());
    this.view.setTitle(`★ ${t("review")}${op ? ` <span class="muted">· ${esc(op)}</span>` : ""}`);
    this.view.setHistory(fens, sans, ucis, { sound: false, animate: false });
    this.view.go(0);
    this.view.setReview(rv);
    this.view.status(st && st.title ? `<b>${esc(st.title)}</b> ${esc(st.subtitle || "")}` : "");
    this.view.setActions([
      { id: "start", label: t("start_review"), icon: "▶", cls: "primary", onClick: () => this.view.go(1, true) },
      { id: "key", label: t("key_moment"), icon: "!", onClick: () => this.view.nextKey() },
      { id: "pgn", label: t("pgn"), icon: "⧉", onClick: () => this.copyPgn(players, sans) },
    ]);
  }

  // a saved game that Stockfish can't review (a game mode, an AI game with illegal moves): just the moves
  replay(st) {
    const fens = st.fens || [st.fen || START_FEN], sans = st.sans || [], ucis = st.ucis || [];
    this.view.setPlayers(st.players);
    this.view.setOrientation(st.me || "w");
    this.view.setMode(st.mode);
    this.view.noCaps = !!(st.mode && st.mode.core === "crazyhouse");
    if (st.marks) this.view.wildMarks = st.marks;
    this.view.setTitle(`▶ ${t("replay")}${st.mode && !st.mode.standard ? ` <span class="muted">· ${esc(st.mode.emoji)} ${esc(st.mode.name)}</span>` : ""}`);
    this.view.setHistory(fens, sans, ucis, { sound: false, animate: false });
    this.view.go(0);
    this.view.status(`${st.title ? `<b>${esc(st.title)}</b> ` : ""}${esc(st.subtitle || "")}<div class="op muted">${t(st.mode && st.mode.wild ? "replay_note_wild" : "replay_note")}</div>`);
    this.replayActs = () => this.view.setActions([
      this.playing ? { id: "start", label: t("replay_pause"), icon: "⏸", cls: "primary", onClick: () => this.autoplay() }
        : { id: "start", label: t("replay_play"), icon: "▶", cls: "primary", onClick: () => this.autoplay() },
      { id: "pgn", label: t("pgn"), icon: "⧉", onClick: () => this.copyPgn(st.players, sans) },
    ]);
    this.replayActs();
  }

  async autoplay() {
    if (this.playing) { this.playing = false; this.replayActs(); return; }
    this.playing = true;
    this.replayActs();
    if (this.view.ply >= this.view.hist.fens.length - 1) this.view.go(0);
    while (this.alive && this.playing && this.view.ply < this.view.hist.fens.length - 1) {
      await sleep(this.view.ply ? 900 : 300);
      if (!this.alive || !this.playing) break;
      this.view.go(this.view.ply + 1, true);
    }
    this.playing = false;
    if (this.alive) this.replayActs();
  }

  copyPgn(players, sans) {
    let s = `[White "${players.w.name}"]\n[Black "${players.b.name}"]\n\n`;
    sans.forEach((san, i) => { s += (i % 2 === 0 ? `${i / 2 + 1}. ` : "") + san + " "; });
    navigator.clipboard?.writeText(s.trim()).then(() => toast(t("pgn_copied")), () => toast(s.slice(0, 80)));
  }

  retry(ply) {
    const i = Math.max(1, ply);
    const m = this.rv.moves[i - 1];
    if (!m || !m.best_uci || m.best_uci === m.uci) { this.view.nextKey(); return; }
    this.retryPly = i;
    this.view.go(i - 1, true);
    const c = new Chess(this.view.hist.fens[i - 1]);
    const dests = new Map();
    for (const x of c.moves({ verbose: true })) { if (!dests.has(x.from)) dests.set(x.from, []); dests.get(x.from).push(x.to); }
    this.view.board.setMarks([]);
    this.view.board.setAutoShapes([]);
    this.view.board.set({ movable: { color: c.turn(), dests } });
    this.view.status(t("retry_q", { color: t(c.turn() === "w" ? "white" : "black") }), "hl");
  }

  retryMove(from, to, promo) {
    const i = this.retryPly;
    if (!i) return;
    const m = this.rv.moves[i - 1];
    const uci = from + to + (promo || "");
    const c = new Chess(this.view.hist.fens[i - 1]);
    let mv;
    try { mv = c.move({ from, to, promotion: promo || (m.best_uci[4] || undefined) }); } catch { this.view.show(false); return; }
    if (mv.lan === m.best_uci || uci === m.best_uci) {
      play("good");
      this.view.board.set({ fen: c.fen(), last: [from, to], movable: null });
      this.view.board.setMarks([{ sq: to, color: "#81b64c", icon: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#fff"/></svg>' }]);
      this.view.status(t("retry_ok"), "good");
      this.retryPly = null;
    } else {
      play("bad");
      this.view.status(t("retry_bad"), "warn");
      setTimeout(() => { if (this.retryPly === i) this.retry(i); }, 700);
    }
  }

  destroy() { this.alive = false; if (this.view) this.view.destroy(); }
}

export { pieceSan };
export const V = "ffb4d75985";  // the site version this file belongs to (main.js reloads the page after an update)
