// #/editor — the Position Editor: set up any position, check it, then play it against any bot (the website's
// own bots, the Bot Creator's, AI models), online, or with a friend — or use it in the Mode Creator.
import * as api from "./api.js?v=1c105c2606";
import { t, fa, extend } from "./i18n.js?v=1c105c2606";
import "./i18n3.js?v=1c105c2606";
import { esc, toast, store } from "./util.js?v=1c105c2606";
import { Board, parseFen } from "./board.js?v=1c105c2606";
import { Chess } from "./vendor/chess.js?v=1c105c2606";

extend({
  ed_title: ["Position Editor", "ویرایشگر وضعیت"],
  ed_sub: ["Pick a piece and tap squares. Then play your position against anyone.", "یک مهره انتخاب کن و روی خانه‌ها بزن. بعد وضعیتت را با هر کسی بازی کن."],
  ed_side: ["To move", "نوبت"], ed_castle: ["Castling", "قلعه"], ed_start: ["Start position", "وضعیت شروع"],
  ed_clear: ["Clear", "پاک کردن"], ed_flip: ["Flip", "چرخاندن"], ed_check: ["Check position", "بررسی وضعیت"],
  ed_ok: ["✓ Valid position", "✓ وضعیت درست است"], ed_nosf: ["Playable on the server (too many pieces for Stockfish).", "روی سرور قابل بازی است (برای استاک‌فیش مهره زیاد است)."],
  ed_play: ["Play this position", "بازی با این وضعیت"], ed_local: ["Play a website bot (instant)", "بازی با ربات سایت (فوری)"],
  ed_eval: ["Evaluate", "ارزیابی"], ed_best: ["Best move: {move}", "بهترین حرکت: {move}"],ed_use: ["Use in Mode Creator", "استفاده در سازنده حالت"], ed_copy: ["Copy FEN", "کپی FEN"],
  ed_apply: ["Load", "بارگذاری"], ed_erase: ["Eraser", "پاک‌کن"], ed_hand: ["Move pieces", "جابه‌جایی"],
  ed_custom: ["Custom position", "وضعیت سفارشی"], ed_back: ["Use this position", "استفاده از این وضعیت"],
  fen_pawn_edge: ["Pawns can't stand on the first or last rank.", "پیاده نمی‌تواند در ردیف اول یا آخر باشد."],
});

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const PIECES = ["K", "Q", "R", "B", "N", "P"];
const L = () => (fa() ? "fa" : "en");

export async function renderEditor(view, nav, params = {}) {
  const forCreator = params.for === "creator";
  let fen0 = params.fen ? decodeURIComponent(params.fen) : (store.get("editorFen") || START);
  let pos = parseFen(fen0);
  const f = fen0.split(" ");
  let side = f[1] === "b" ? "b" : "w";
  let castle = f[2] && f[2] !== "-" ? f[2] : "";
  let tool = "wQ";
  let hand = null;  // the "move pieces" tool: square picked up
  view.innerHTML = `<div class="page editor-page">
    <div class="page-h"><h1>🧩 ${t("ed_title")}</h1><p class="muted">${t("ed_sub")}</p></div>
    <div class="ed-layout">
      <div class="ed-left"><div class="ed-pal top" dir="ltr"></div><div class="ed-board"><div class="board"></div></div><div class="ed-pal bot" dir="ltr"></div></div>
      <div class="ed-side card">
        <div class="bs-label">${t("ed_side")}</div><div class="seg ed-turn"><button data-s="w">♔ ${t("white")}</button><button data-s="b">♚ ${t("black")}</button></div>
        <div class="bs-label">${t("ed_castle")}</div><div class="ed-castle">${["K", "Q", "k", "q"].map((c) =>
          `<label class="ck"><input type="checkbox" data-c="${c}"> ${c === c.toUpperCase() ? "♔" : "♚"} ${c.toLowerCase() === "k" ? "O-O" : "O-O-O"}</label>`).join("")}</div>
        <div class="row-b"><button class="btn sm" data-x="start">♟ ${t("ed_start")}</button><button class="btn sm" data-x="clear">🧹 ${t("ed_clear")}</button>
          <button class="btn sm" data-x="flip">⇅ ${t("ed_flip")}</button></div>
        <div class="bs-label">FEN</div><div class="share"><input class="ed-fen" dir="ltr"><button class="btn sm" data-x="load">${t("ed_apply")}</button></div>
        <div class="row-b"><button class="btn sm" data-x="copy">⧉ ${t("ed_copy")}</button><button class="btn sm" data-x="eval">📊 ${t("ed_eval")}</button>
          <button class="btn sm" data-x="check">✓ ${t("ed_check")}</button></div>
        <div class="ed-msg muted small"></div>
        ${forCreator ? `<button class="btn primary huge" data-x="back">✅ ${t("ed_back")}</button>` :
          `<button class="btn primary huge" data-x="play">▶ ${t("ed_play")}</button>
           <button class="btn" data-x="local">🤖 ${t("ed_local")}</button>
           <button class="btn ghost" data-x="creator">🛠 ${t("ed_use")}</button>`}
      </div></div></div>`;
  const board = new Board(view.querySelector(".board"), { orient: "w" });
  const msg = (html, kind = "") => { const el = view.querySelector(".ed-msg"); el.className = "ed-msg small " + kind; el.innerHTML = html; };
  const palette = () => {
    const pal = (color) => PIECES.map((p) => `<button class="ed-pc${tool === color + p ? " on" : ""}" data-tool="${color}${p}"><span class="pc" data-c="${color}${p}"></span></button>`).join("");
    const extra = `<button class="ed-pc tool${tool === "erase" ? " on" : ""}" data-tool="erase" title="${t("ed_erase")}">🧽</button>` +
      `<button class="ed-pc tool${tool === "hand" ? " on" : ""}" data-tool="hand" title="${t("ed_hand")}">✋</button>`;
    const top = board.orient === "w" ? "b" : "w";
    view.querySelector(".ed-pal.top").innerHTML = pal(top) + extra;
    view.querySelector(".ed-pal.bot").innerHTML = pal(top === "w" ? "b" : "w") + extra;
    view.querySelectorAll("[data-tool]").forEach((b) => b.onclick = () => { tool = b.dataset.tool; hand = null; board.setMarks([]); palette(); });
  };
  const fen = () => {
    let rows = [];
    for (let r = 8; r >= 1; r--) {
      let row = "", empty = 0;
      for (const fl of "abcdefgh") {
        const code = pos.get(fl + r);
        if (!code) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        row += code[0] === "w" ? code[1] : code[1].toLowerCase();
      }
      rows.push(row + (empty ? empty : ""));
    }
    return `${rows.join("/")} ${side} ${castle || "-"} - 0 1`;
  };
  const sync = (keepFenBox = false) => {
    board.set({ fen: fen(), animate: false, last: null, check: null });
    view.querySelectorAll("[data-s]").forEach((b) => b.classList.toggle("on", b.dataset.s === side));
    view.querySelectorAll("[data-c]").forEach((b) => { b.checked = castle.includes(b.dataset.c); });
    if (!keepFenBox) view.querySelector(".ed-fen").value = fen();
    store.set("editorFen", fen());
  };
  // tapping the board: place / erase / move (our own handler — the board itself has no legal moves here)
  view.querySelector(".board").addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const sq = board.squareAt(e);
    if (!sq) return;
    e.stopImmediatePropagation();
    if (tool === "erase") pos.delete(sq);
    else if (tool === "hand") {
      if (!hand) { if (pos.get(sq)) { hand = sq; board.setMarks([{ sq, tint: "rgba(20, 120, 220, .55)" }]); } return; }
      if (hand !== sq) { pos.set(sq, pos.get(hand)); pos.delete(hand); }
      hand = null;
      board.setMarks([]);
    } else if (pos.get(sq) === tool) pos.delete(sq);
    else {
      if (tool[1] === "P" && (sq[1] === "1" || sq[1] === "8")) { toast(t("fen_pawn_edge")); return; }
      if (tool[1] === "K") for (const [k, v] of [...pos]) if (v === tool) pos.delete(k);  // one king per side
      pos.set(sq, tool);
    }
    sync();
  }, true);
  view.querySelectorAll("[data-s]").forEach((b) => b.onclick = () => { side = b.dataset.s; sync(); });
  view.querySelectorAll("[data-c]").forEach((b) => b.onchange = () => {
    castle = ["K", "Q", "k", "q"].filter((c) => (c === b.dataset.c ? b.checked : castle.includes(c))).join("");
    sync();
  });
  const load = (text) => {
    const parts = String(text || "").trim().split(/\s+/);
    if (!parts[0] || parts[0].split("/").length !== 8) { msg("⚠️ FEN?", "bad"); return; }
    pos = parseFen(parts[0]);
    side = parts[1] === "b" ? "b" : "w";
    castle = parts[2] && parts[2] !== "-" ? parts[2].replace(/[^KQkq]/g, "") : "";
    sync();
    msg("");
  };
  const check = async () => {
    try {
      const r = await api.get("pub/fen", { fen: fen(), l: L() }, 9000);
      if (!r.ok) { msg("⚠️ " + esc(r.error), "bad"); return null; }
      if (r.fen && r.fen.split(" ")[2] !== (castle || "-")) { castle = r.fen.split(" ")[2] === "-" ? "" : r.fen.split(" ")[2]; sync(); }
      msg(r.sf ? t("ed_ok") : `${t("ed_ok")} · ${t("ed_nosf")}`, "good");
      return r;
    } catch {  // offline: chess.js can still tell us about a normal position
      try { new Chess(fen()); msg(t("ed_ok"), "good"); return { ok: true, fen: fen(), sf: true, local: true }; }
      catch (x) { msg("⚠️ " + esc(x.message || "FEN"), "bad"); return null; }
    }
  };
  view.querySelector(".ed-side").addEventListener("click", async (e) => {
    const x = e.target.closest("[data-x]");
    if (!x) return;
    const k = x.dataset.x;
    if (k === "start") load(START);
    else if (k === "clear") { pos = new Map(); castle = ""; sync(); }
    else if (k === "flip") { board.flip(); palette(); }
    else if (k === "load") load(view.querySelector(".ed-fen").value);
    else if (k === "copy") navigator.clipboard?.writeText(fen()).then(() => toast(t("copied"), "good"), () => toast(fen()));
    else if (k === "check") check();
    else if (k === "eval") evaluate();
    else if (k === "back" || k === "creator") {
      const r = await check();
      if (r) nav(`#/modes?create=1&fen=${encodeURIComponent(r.fen || fen())}`);
    } else if (k === "play") {
      const r = await check();
      if (!r) return;
      const { playDialog } = await import("./modes.js?v=1c105c2606");
      const spec = { core: "classic", start: "fen", fen: r.fen || fen() };
      playDialog(nav, { spec, name: t("ed_custom"), emoji: "🧩" }, { name: t("ed_custom"), emoji: "🧩", rules: [], spec }, { fen: r.fen || fen() });
    } else if (k === "local") {
      const r = await check();
      if (!r) return;
      if (r.sf === false) { toast(t("ed_nosf")); return; }
      try { new Chess(r.fen || fen()); } catch { toast(t("ed_nosf")); return; }
      const pick = store.get("botPick", { level: 3, color: "w", tc: "none" });
      // the Bot Creator's bots (level 1000+) play on the server — the instant website game uses a built-in bot
      const level = +pick.level >= 1000 ? 3 : (pick.level || 3);
      store.del("botgame");
      const color = (r.fen || fen()).split(" ")[1] === "b" ? "b" : "w";
      nav(`#/bot?level=${level}&color=${color}&tc=none&new=${Date.now()}&fen=${encodeURIComponent(r.fen || fen())}`);
    }
  });
  async function evaluate() {
    let c;
    try { c = new Chess(fen()); } catch (x) { msg("⚠️ " + esc(x.message || "FEN"), "bad"); return; }
    if (c.isGameOver()) { msg(c.isCheckmate() ? "# " + (c.turn() === "w" ? "0-1" : "1-0") : "½-½"); return; }
    msg(`<span class="dots">📊</span>`);
    try {
      const { getEngine } = await import("./engine.js?v=1c105c2606");
      const res = await getEngine("analysis").search({ fen: fen(), depth: 16, movetime: 1500, skill: 20 });
      const line = res.lines && res.lines[0];
      if (!line) { msg("—"); return; }
      const sign = c.turn() === "w" ? 1 : -1;
      const ev = line.mate != null ? `M${line.mate * sign}` : ((line.cp * sign) / 100).toFixed(2);
      let san = res.best;
      try { const m = c.move({ from: res.best.slice(0, 2), to: res.best.slice(2, 4), promotion: res.best[4] }); san = m.san; } catch { /* keep uci */ }
      msg(`📊 <b dir="ltr">${esc(ev)}</b> · ${t("ed_best", { move: esc(san) })}`, "good");
      board.setAutoShapes([{ from: res.best.slice(0, 2), to: res.best.slice(2, 4), color: "best" }]);
    } catch { msg("Engine unavailable", "bad"); }
  }
  palette();
  sync();
  return { destroy() { board.destroy(); } };
}

export const V = "1c105c2606";
