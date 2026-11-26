// Puzzles: 6,600+ rated puzzles (Lichess puzzle database, CC0) solved right in the browser.
// Rated mode keeps a puzzle rating (synced to the Bale profile when opened from Bale);
// Sprint mode = 3 minutes, 3 lives, puzzles get harder as you go.
import { Chess } from "./vendor/chess.js?v=ffa8bb0e87";
import { GameView } from "./gameview.js?v=ffa8bb0e87";
import { t, fa, themeName } from "./i18n.js?v=ffa8bb0e87";
import { store, toast, sleep, esc, fmtClock } from "./util.js?v=ffa8bb0e87";
import { play, playMove } from "./sound.js?v=ffa8bb0e87";
import * as api from "./api.js?v=ffa8bb0e87";

const OK_ICON = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#fff"/></svg>';
const BAD_ICON = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#fff"/></svg>';
const buckets = {};
let index = null;

async function bucket(b) {
  if (!index) index = await (await fetch("data/pz/index.json?v=ffa8bb0e87")).json();
  const keys = Object.keys(index.buckets).map(Number).sort((a, c) => a - c);
  b = keys.reduce((best, k) => (Math.abs(k - b) < Math.abs(best - b) ? k : best), keys[0]);
  if (!buckets[b]) buckets[b] = await (await fetch(`data/pz/${b}.json?v=ffa8bb0e87`)).json();
  return buckets[b];
}

async function pick(rating, seen) {
  const b = Math.round(rating / 100);
  for (const off of [0, 1, -1, 2, -2, 3, -3]) {
    const list = await bucket(b + off);
    const fresh = list.filter((p) => !seen.has(p[0]));
    if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  }
  const list = await bucket(b);
  return list[Math.floor(Math.random() * list.length)];
}

function dests(chess) {
  const d = new Map();
  for (const m of chess.moves({ verbose: true })) { if (!d.has(m.from)) d.set(m.from, []); d.get(m.from).push(m.to); }
  return d;
}

const toObj = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined });

export class Puzzles {
  constructor(root, nav, mode = "rated") {
    this.root = root;
    this.nav = nav;
    this.mode = mode;
    this.alive = true;
    this.rating = store.get("pzRating", 1000);
    this.streak = store.get("pzStreak", 0);
    this.seen = new Set(store.get("pzSeen", []));
    this.view = new GameView(root, {
      mode: "puzzle",
      onMove: (f, to, p, meta) => this.userMove(f, to, p, meta),
      onBack: () => this.nav("#/"),
    });
    this.view.setTitle(`🧩 ${t(mode === "sprint" ? "sprint_title" : "puzzles_title")}`);
    this.view.$(".gv").classList.add("pz");
    this.syncRating();
    if (mode === "sprint") this.sprintIntro(); else this.next();
  }

  async syncRating() {
    const u = api.auth();
    if (!u) return;
    try {
      const me = await api.get("me", { t: u }, 8000);
      if (me && me.puzzle_rating) {
        this.rating = me.puzzle_rating;
        this.streak = me.puzzle_streak || 0;
        store.set("pzRating", this.rating);
        this.renderPanel();
      }
    } catch { /* offline: keep the local rating */ }
  }

  players(color) {
    const me = store.get("me");
    const p = {};
    p[color] = { name: me?.name || t("you"), elo: this.mode === "rated" ? this.rating : "", title: me?.flair?.title,
      title_color: me?.flair?.title_color, tag: me?.flair?.tag, show: me?.flair?.showcase || [], flag: me?.flair?.flag };
    p[color === "w" ? "b" : "w"] = { name: `🧩 ${this.mode === "sprint" ? t("sprint_title") : t("puzzles_title")}`, elo: this.p ? this.p[3] : "", bot: true, color: "#5d9948", initials: "?" };
    return p;
  }

  async next() {
    if (!this.alive) return;
    this.view.hideOver();
    const target = this.mode === "sprint" ? 600 + this.sprint.solved * 75 : this.rating;
    const p = await pick(target, this.seen);
    this.load(p);
  }

  load(p) {
    this.p = p;
    this.state = "intro";
    this.failed = false;
    this.hinted = 0;
    this.statusHtml = "";
    this.statusKind = "";
    this.delta = this.mode === "rated" ? this.delta : 0;
    const [id, fen, moves] = p;
    this.line = moves.split(" ");
    this.step = 0;
    this.chess = new Chess(fen);
    this.me = this.chess.turn() === "w" ? "b" : "w";
    this.view.setOrientation(this.me);
    this.view.setPlayers(this.players(this.me));
    this.view.board.setMarks([]);
    this.view.board.setAutoShapes([]);
    this.view.board.setHint(null);
    this.view.setHistory([fen], [], [], { sound: false, animate: false });
    this.view.setMovable(null);
    this.renderPanel();
    this.seen.add(id);
    store.set("pzSeen", [...this.seen].slice(-3000));
    setTimeout(() => { if (this.p === p && this.alive) { this.opp(); this.state = "solve"; this.renderPanel(); } }, 650);
  }

  opp() {  // the opponent's move from the solution line
    const u = this.line[this.step++];
    const m = this.chess.move(toObj(u));
    this.view.pushMove(this.chess.fen(), m.san, u, { animate: true });
    this.view.setMovable({ color: this.me, dests: dests(this.chess) });
  }

  userMove(from, to, promo, meta) {
    if (this.state !== "solve" || this.chess.turn() !== this.me) return;
    const want = this.line[this.step];
    let m;
    try { m = this.chess.move({ from, to, promotion: promo || "q" }); } catch { this.view.show(false); return; }
    const uci = m.lan;
    const ok = uci === want || this.chess.isCheckmate();
    this.view.pushMove(this.chess.fen(), m.san, uci, { animate: !(meta && meta.drag), sound: false });
    this.view.board.setHint(null);
    this.view.board.setAutoShapes([]);
    if (ok) {
      playMove(m.san);
      this.step++;
      if (this.step >= this.line.length || this.chess.isCheckmate()) { this.solved(to); return; }
      this.view.board.setMarks([{ sq: to, color: "#81b64c", icon: OK_ICON }]);
      this.view.setMovable(null);
      this.status(t("pz_keep"), "good");
      setTimeout(() => { if (this.alive && this.state === "solve") { this.opp(); this.view.board.setMarks([]); this.status(""); } }, 420);
    } else {
      play("bad");
      this.view.board.setMarks([{ sq: to, color: "#d63a32", icon: BAD_ICON, tint: "rgba(214,58,50,.45)" }]);
      this.view.setMovable(null);
      this.fail();
    }
  }

  prompt() { return t(this.me === "w" ? "find_best_w" : "find_best_b"); }

  status(html, kind = "") { this.statusHtml = html; this.statusKind = kind; this.renderPanel(); }

  async solved(to) {
    this.state = "done";
    play("good");
    this.view.board.setMarks([{ sq: to, color: "#81b64c", icon: OK_ICON, tint: "rgba(129,182,76,.45)" }]);
    this.view.setMovable(null);
    if (this.mode === "sprint") { this.sprint.solved++; this.renderPanel(); setTimeout(() => this.next(), 500); return; }
    if (!this.failed) await this.rate(true);
    this.status(`${t("pz_solved")}`, "good");
  }

  async fail() {
    if (this.mode === "sprint") {
      this.sprint.lives--;
      this.renderPanel();
      if (this.sprint.lives <= 0) { this.endSprint(); return; }
      setTimeout(() => this.next(), 700);
      return;
    }
    this.state = "failed";
    if (!this.failed) { this.failed = true; await this.rate(false); }
    this.status(t("pz_wrong"), "warn");
  }

  async rate(solved) {
    const old = this.rating, pr = this.p[3];
    const exp = 1 / (1 + 10 ** ((pr - old) / 400));
    this.rating = Math.max(100, old + Math.round(24 * ((solved ? 1 : 0) - exp)));
    this.streak = solved ? this.streak + 1 : 0;
    this.delta = this.rating - old;
    store.set("pzRating", this.rating);
    store.set("pzStreak", this.streak);
    this.renderPanel();
    this.view.setPlayers(this.players(this.me));
    const u = api.auth();
    if (!u) return;
    try {
      const r = await api.post("puzzle_result", { t: u, id: this.p[0], rating: pr, solved, themes: this.p[4] || "" });
      if (r && r.rating) {
        this.rating = r.rating; this.delta = r.delta; this.streak = r.streak;
        store.set("pzRating", this.rating);
        this.renderPanel();
        this.view.setPlayers(this.players(this.me));
      }
    } catch { /* offline */ }
  }

  retry() {
    // undo the wrong move and try again (the rating already counted the miss)
    this.chess.undo();
    const h = this.view.hist;
    this.view.setHistory(h.fens.slice(0, -1), h.sans.slice(0, -1), h.ucis.slice(0, -1), { sound: false, animate: true });
    this.view.board.setMarks([]);
    this.view.setMovable({ color: this.me, dests: dests(this.chess) });
    this.state = "solve";
    this.status("");
  }

  async solution() {
    if (this.state === "failed") this.retry();
    this.state = "showing";
    this.view.setMovable(null);
    while (this.alive && this.step < this.line.length) {
      const u = this.line[this.step++];
      this.view.board.setAutoShapes([{ from: u.slice(0, 2), to: u.slice(2, 4), color: "best" }]);
      await sleep(550);
      const m = this.chess.move(toObj(u));
      this.view.pushMove(this.chess.fen(), m.san, u, { animate: true });
      await sleep(450);
    }
    this.view.board.setAutoShapes([]);
    this.state = "done";
    this.renderPanel();
  }

  hint() {
    if (this.state !== "solve") return;
    const u = this.line[this.step];
    this.hinted++;
    if (this.hinted === 1) this.view.board.setHint(u.slice(0, 2));
    else this.view.board.setAutoShapes([{ from: u.slice(0, 2), to: u.slice(2, 4), color: "hint" }]);
    if (!this.failed && this.mode === "rated") { this.failed = true; this.rate(false); }
  }

  renderPanel() {
    const v = this.view;
    if (!v) return;
    const box = v.$(".gs-review");
    box.hidden = false;
    const themes = this.state === "done" || this.state === "failed"
      ? (this.p?.[4] || "").split(" ").map(themeName).filter(Boolean).slice(0, 4) : [];
    if (this.mode === "sprint") {
      const s = this.sprint || { solved: 0, lives: 3 };
      box.innerHTML = `<div class="pz-top"><div class="pz-score"><span>${t("score")}</span><b>${s.solved}</b></div>
        <div class="pz-timer" dir="ltr">${s.end ? fmtClock(Math.max(0, (s.end - Date.now()) / 1000)) : "3:00"}</div>
        <div class="pz-lives">${"❤".repeat(Math.max(0, s.lives))}<span class="lost">${"❤".repeat(3 - Math.max(0, s.lives))}</span></div></div>
        <div class="pz-best">${t("best_score")}: ${store.get("sprintBest", 0)}</div>`;
    } else {
      const d = this.delta;
      box.innerHTML = `<div class="pz-top"><div class="pz-rating"><span>${t("puzzle_rating")}</span><b>${this.rating}</b>` +
        `${d ? `<em class="${d > 0 ? "up" : "down"}">${d > 0 ? "+" : ""}${d}</em>` : ""}</div>` +
        `<div class="pz-streak"><span>${t("streak")}</span><b>🔥 ${this.streak}</b></div></div>` +
        `${!api.auth() ? `<div class="pz-note">${t("local_rating_note")}</div>` : ""}`;
    }
    let html = "";
    if (this.p && (this.state === "solve" || this.state === "intro")) {
      html += `<div class="pz-turn ${this.me}"><span class="pc" data-c="${this.me}K"></span>${esc(this.prompt())}</div>`;
    }
    if (this.statusHtml && this.state !== "intro") html += `<div class="pz-msg ${this.statusKind || ""}">${this.statusHtml}</div>`;
    if (this.p && ["done", "failed", "showing"].includes(this.state)) {
      html += `<div class="pz-info">${t("pz_rated_n", { r: this.p[3] })}${themes.length ? " · " + themes.map(esc).join(" · ") : ""}</div>`;
    }
    v.status(html);
    const acts = [];
    if (this.mode === "sprint") {
      if (this.sprint && this.sprint.running) acts.push({ id: "skip", label: t("next"), icon: "»", onClick: () => { this.sprint.lives--; if (this.sprint.lives <= 0) this.endSprint(); else this.next(); } });
    } else if (this.state === "solve" || this.state === "intro") {
      acts.push({ id: "hint", label: t("hint"), icon: "💡", onClick: () => this.hint() });
      acts.push({ id: "sol", label: t("solution"), icon: "👁", onClick: () => { if (!this.failed) { this.failed = true; this.rate(false); } this.solution(); } });
    } else if (this.state === "failed") {
      acts.push({ id: "retry", label: t("try_again"), icon: "↻", onClick: () => this.retry() });
      acts.push({ id: "sol", label: t("solution"), icon: "👁", onClick: () => this.solution() });
      acts.push({ id: "next", label: t("next"), icon: "»", cls: "primary", onClick: () => this.next() });
    } else {
      acts.push({ id: "next", label: t("next"), icon: "»", cls: "primary", onClick: () => this.next() });
    }
    if (this.mode === "rated") acts.push({ id: "sprint", label: t("mode_sprint"), icon: "⚡", cls: "ghost", onClick: () => this.nav("#/sprint") });
    else if (!this.sprint || !this.sprint.running) acts.push({ id: "rated", label: t("mode_rated"), icon: "🧩", cls: "ghost", onClick: () => this.nav("#/puzzles") });
    v.setActions(acts);
  }

  // ───────── Sprint ─────────
  sprintIntro() {
    this.sprint = { solved: 0, lives: 3, running: false };
    this.renderPanel();
    this.view.showOver({
      title: t("sprint_title"), icon: "⚡", sub: t("sprint_rules"),
      lines: [`${t("best_score")}: <b>${store.get("sprintBest", 0)}</b>`],
      buttons: [{ label: t("sprint_go"), cls: "primary big", onClick: () => this.startSprint() }],
    });
  }

  startSprint() {
    this.view.hideOver();
    this.sprint = { solved: 0, lives: 3, running: true, end: Date.now() + 180000 };
    play("start");
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.sprint.running) return;
      if (Date.now() >= this.sprint.end) this.endSprint();
      else { const el = this.view.$(".pz-timer"); if (el) el.textContent = fmtClock((this.sprint.end - Date.now()) / 1000); }
    }, 200);
    this.next();
  }

  async endSprint() {
    if (!this.sprint.running) return;
    this.sprint.running = false;
    clearInterval(this.timer);
    this.state = "done";
    this.view.setMovable(null);
    play("end");
    const score = this.sprint.solved;
    const best = Math.max(score, store.get("sprintBest", 0));
    store.set("sprintBest", best);
    this.renderPanel();
    this.view.showOver({
      title: t("sprint_over"), icon: "⚡", sub: `${t("score")}: ${score}`,
      lines: [`${t("best_score")}: <b>${best}</b>`],
      buttons: [{ label: t("play_again"), cls: "primary big", onClick: () => this.startSprint() },
        { label: t("mode_rated"), cls: "ghost", onClick: () => this.nav("#/puzzles") }],
    });
    const u = api.auth();
    if (u) { try { await api.post("sprint_result", { t: u, score }); } catch { /* offline */ } }
  }

  destroy() { this.alive = false; clearInterval(this.timer); this.view.destroy(); }
}
export const V = "ffa8bb0e87";  // the site version this file belongs to (main.js reloads the page after an update)
