// The two menu pages: Play (online matchmaking, friend invites, resume) and Bots (pick an opponent).
import { t, fa } from "./i18n.js?v=ffb4d75985";
import "./i18n3.js?v=ffb4d75985";
import { store, esc, toast, sleep, confirmBox, titleHtml, nameHtml, modal } from "./util.js?v=ffb4d75985";
import * as api from "./api.js?v=ffb4d75985";
import { loadBots, botName } from "./local.js?v=ffb4d75985";
import { play } from "./sound.js?v=ffb4d75985";
import { loadMe as sessionMe } from "./session.js?v=ffb4d75985";

// the game modes offered right on the Play page (all of them are on #/modes)
const QUICK_MODES = [["standard", "♟️"], ["960", "🎲"], ["koth", "👑"], ["3check", "✚"], ["atomic", "💥"], ["crazyhouse", "🪂"],
  ["fog", "🌫️"], ["double", "⚡"], ["antichess", "🙃"]];
const MODE_NAMES = {
  standard: ["Standard", "استاندارد"], 960: ["Chess960", "شطرنج ۹۶۰"], koth: ["King of the Hill", "شاه تپه"], "3check": ["Three-check", "سه کیش"],
  atomic: ["Atomic", "اتمی"], crazyhouse: ["Crazyhouse", "خانه دیوانه"], fog: ["Fog of War", "مه جنگ"], double: ["Double Move", "حرکت دوبل"],
  antichess: ["Antichess", "ضد شطرنج"],
};
const modeName = (k) => (MODE_NAMES[k] ? MODE_NAMES[k][fa() ? 1 : 0] : k);

const ONLINE_TC = [
  ["bullet", ["1+0", "2+1"]], ["blitz", ["3+0", "3+2", "5+0"]], ["rapid", ["10+0", "15+10", "30+0"]],
];
const BOT_TC = ["none", "1+0", "3+2", "5+0", "10+0", "15+10", "30+0"];
const TC_ICON = { bullet: "💨", blitz: "⚡", rapid: "🕐", classical: "🏛" };

export const loadMe = () => sessionMe();

// ───────── Play ─────────
export function renderPlay(view, nav) {
  let alive = true, searching = false;
  const u = api.auth();
  let tc = store.get("tc", "5+0");
  let mode = store.get("playMode", "standard");
  const cached = store.get("me");
  view.innerHTML = `<div class="page play-page">
    <div class="hero">
      <div class="hero-board"><div class="mini-board"></div></div>
      <div class="hero-side">
        <h1>${t("play_online")}</h1>
        <p class="muted hello">${cached ? esc(t("hello", { name: cached.name })) + ` · ${t("your_rating")}: <b>${cached.elo}</b>` : t("play_online_sub")}</p>
        <div class="resume" hidden></div>
        <div class="tc-groups">${ONLINE_TC.map(([cat, list]) => `<div class="tc-group"><div class="tc-cat">${TC_ICON[cat]} ${t(cat)}</div>
          <div class="tc-row">${list.map((c) => `<button class="tc${c === tc ? " on" : ""}" data-tc="${c}">${c}</button>`).join("")}</div></div>`).join("")}</div>
        <p class="muted small">ℹ️ ${t("tc_help")}</p>
        <div class="tc-cat">🎲 ${t("mode_label")}</div>
        <div class="mode-chips">${QUICK_MODES.map(([k, e]) => `<button class="mchip${k === mode ? " on" : ""}" data-mode="${k}">${e} ${esc(modeName(k))}</button>`).join("")}
          <a class="mchip more" href="#/modes">${t("more_modes")}</a></div>
        <p class="muted small casual" ${mode === "standard" || mode === "960" ? "hidden" : ""}>🎈 ${t("casual_note")}</p>
        <button class="btn primary huge play-btn">${t("play_btn")}</button>
        <div class="note" ${u ? "hidden" : ""}>${t("need_login2")}<div class="note-b"><a class="btn primary" href="#/login?mode=signup">${t("signup")}</a><a class="btn" href="#/login">${t("login")}</a>${api.botLink() ? `<a class="btn ghost" href="${api.botLink()}" target="_blank" rel="noopener">${t("open_bale")} ↗</a>` : ""}</div></div>
        <div class="search" hidden><div class="spin"></div><div><b>${t("searching")}</b><div class="muted small">${t("searching_sub")}</div></div><span class="s-time" dir="ltr">0:00</span><button class="btn ghost s-cancel">${t("cancel")}</button></div>
        <div class="cards">
          <a class="qcard" href="#/bots"><span class="qi">🤖</span><b>${t("quick_bots")}</b><span class="muted">${t("quick_bots_sub")}</span></a>
          <a class="qcard" href="#/puzzles"><span class="qi">🧩</span><b>${t("quick_puzzles")}</b><span class="muted">${t("quick_puzzles_sub")}</span></a>
          <button class="qcard friend" ${u ? "" : "hidden"}><span class="qi">🤝</span><b>${t("play_friend")}</b><span class="muted">${t("play_friend_sub")}</span></button>
        </div>
        <div class="online muted small"></div>
      </div>
    </div>
    <div class="lobby-wrap"><div class="card lobby-card"><h2>🏟️ ${t("lobby")}</h2><div class="lobby-list"><div class="muted small">…</div></div></div>
      <div class="card live-card"><h2>📺 ${t("live_games")}</h2><div class="live-list"><div class="muted small">…</div></div></div></div></div>`;
  miniBoard(view.querySelector(".mini-board"));
  const playBtn = view.querySelector(".play-btn");
  if (!u) playBtn.classList.add("dis");
  view.querySelectorAll(".tc").forEach((b) => b.onclick = () => {
    tc = b.dataset.tc;
    store.set("tc", tc);
    view.querySelectorAll(".tc").forEach((x) => x.classList.toggle("on", x === b));
  });
  view.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => {
    mode = b.dataset.mode;
    store.set("playMode", mode);
    view.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b));
    view.querySelector(".casual").hidden = mode === "standard" || mode === "960";
  });
  playBtn.onclick = () => (u ? search() : toast(t("need_login")));
  view.querySelector(".s-cancel").onclick = () => cancel();
  view.querySelector(".friend").onclick = () => invite();

  async function refresh() {
    const me = await loadMe();
    if (!alive || !me) return;
    if (me.ban) {
      view.querySelector(".hello").innerHTML = `<span class="ban-line">⛔ ${esc(t("ban_title"))}</span>`;
      playBtn.classList.add("dis");
    } else {
      const f = me.flair || {};
      view.querySelector(".hello").innerHTML = `${t("hello", { name: `<a class="me-link" href="#/${me.account ? "u/" + encodeURIComponent(me.account.username) : "p/" + me.pid}">${titleHtml(f.title, f.title_color)}${esc(me.name)}</a>` })} · ${t("your_rating")}: <b>${me.elo}</b>`;
    }
    const r = view.querySelector(".resume");
    if (me.active) {
      r.hidden = false;
      r.innerHTML = `<a class="resume-card" href="#/game/${me.active.t}"><span class="dot-live"></span><b>${t("resume_game")}</b> <span class="muted">${t("vs")} ${esc(me.active.opponent)} · ${esc(me.active.tc)}</span></a>`;
    }
    if (me.online) view.querySelector(".online").textContent = t("online_now", { n: me.online.live * 2 + me.online.searching });
    if (me.queue && !searching) waitLoop(me.queue.waited || 0);
  }

  async function search() {
    if (searching) return;
    try {
      const r = await api.post("queue", { t: u, tc, mode, l: fa() ? "fa" : "en" });
      if (r.t) { nav(`#/game/${r.t}`); return; }
      if (r.error) { toast(r.error); return; }
      waitLoop(0);
    } catch { toast(t("offline")); }
  }

  async function waitLoop(start) {
    searching = true;
    const box = view.querySelector(".search");
    box.hidden = false;
    playBtn.hidden = true;
    const t0 = Date.now() - start * 1000;
    const timer = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      const el = view.querySelector(".s-time");
      if (el) el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }, 500);
    while (alive && searching) {
      try {
        const r = await api.get("wait", { t: u }, 30000);
        if (r.t) { clearInterval(timer); play("notify"); nav(`#/game/${r.t}`); return; }
        if (!r.queue) break;
      } catch { await sleep(1500); }
    }
    clearInterval(timer);
    searching = false;
    if (alive) { box.hidden = true; playBtn.hidden = false; }
  }

  async function cancel() {
    searching = false;
    try { await api.post("queue_cancel", { t: u }); } catch { /* ignore */ }
    view.querySelector(".search").hidden = true;
    playBtn.hidden = false;
  }

  async function invite() {
    let color = "r";
    const box = document.createElement("div");
    const draw = () => {
      box.innerHTML = `<p class="muted small">${esc(modeName(mode))} · ${esc(tc)}</p>
        <div class="bs-label">${t("invite_color")}</div><div class="seg">${[["w", "♔ " + t("white")], ["r", "🎲 " + t("random")], ["b", "♚ " + t("black")]]
          .map(([c, l]) => `<button data-c="${c}" class="${c === color ? "on" : ""}">${l}</button>`).join("")}</div>`;
      box.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => { color = b.dataset.c; draw(); });
    };
    draw();
    modal({ title: "🤝 " + t("invite_title"), body: box, buttons: [{ label: t("cancel"), cls: "ghost" },
      { label: t("invite_make"), cls: "primary", onClick: async () => {
        try {
          const r = await api.post("invite", { t: u, tc, rated: mode === "standard" || mode === "960", mode, color, l: fa() ? "fa" : "en" });
          if (!r.code) { toast(r.error || t("offline")); return false; }
          const { inviteModal } = await import("./modes.js?v=ffb4d75985");
          inviteModal(r);
          return true;
        } catch { toast(t("offline")); return false; }
      } }] });
  }

  // ── the lobby: everyone waiting for a game (join with one tap) + live games to watch ──
  async function lobbyLoop() {
    while (alive) {
      try {
        const r = await api.get("pub/lobby", { l: fa() ? "fa" : "en", ...(u ? { t: u } : {}) }, 12000);
        if (!alive) return;
        drawLobby(r);
      } catch { /* offline */ }
      await sleep(4000);
    }
  }
  function drawLobby(r) {
    const box = view.querySelector(".lobby-list"), live = view.querySelector(".live-list");
    if (!box) return;
    box.innerHTML = (r.seeks || []).map((s) => `<div class="seek${s.mine ? " mine" : ""}">
        <span class="sk-m" title="${esc((s.mode.rules || []).join(" · "))}">${esc(s.mode.emoji)}</span>
        <span class="sk-n">${nameHtml({ name: s.name, title: s.title, title_color: s.title_color, tag: s.tag })} <span class="muted small">(${s.elo})</span></span>
        <span class="sk-i muted small">${esc(s.mode.name)} · ${esc(s.tc)}${s.rated ? " ★" : ""}</span>
        ${s.mine ? `<span class="muted small">${t("your_seek")}</span>` : `<button class="btn sm primary" data-sid="${s.sid}">${t("join")}</button>`}</div>`).join("") ||
      `<div class="muted small">${t("lobby_empty")}</div>`;
    box.querySelectorAll("[data-sid]").forEach((b) => b.onclick = async () => {
      if (!u) { toast(t("need_login")); return; }
      try {
        const x = await api.post("seek_join", { t: u, sid: +b.dataset.sid, l: fa() ? "fa" : "en" });
        if (x.t) nav(`#/game/${x.t}`); else toast(x.error || t("offline"), "bad");
      } catch { toast(t("offline"), "bad"); }
    });
    live.innerHTML = (r.live || []).map((g) => `<a class="lv" href="#/watch/${g.gid}"><span>${esc(g.mode.emoji)}</span>
      <span class="lv-n" dir="auto">${esc(g.w)} – ${esc(g.b)}</span><span class="muted small">${esc(g.tc)} · ${Math.ceil(g.plies / 2)}</span>
      <span class="btn sm ghost">👁 ${t("watch")}</span></a>`).join("") || `<div class="muted small">—</div>`;
  }

  refresh();
  lobbyLoop();
  return { destroy() { alive = false; searching = false; } };
}

// ───────── #/join/<code>: a friend's invite opened on the website ─────────
export async function renderJoin(view, nav, code) {
  view.innerHTML = `<div class="page"><div class="spin center"></div></div>`;
  let r;
  try { r = await api.get("pub/invite", { c: code, l: fa() ? "fa" : "en" }); } catch { r = { error: t("offline") }; }
  if (!r.invite) {
    view.innerHTML = `<div class="page"><div class="card join-card"><h1>😕</h1><p>${esc(r.error || "?")}</p><a class="btn primary" href="#/play">${t("play")}</a></div></div>`;
    return { destroy() {} };
  }
  const i = r.invite;
  const u = api.auth();
  const colorTxt = { w: t("black"), b: t("white"), r: t("random") }[i.color || "r"];
  view.innerHTML = `<div class="page"><div class="card join-card">
    <div class="jc-e">${esc(i.mode.emoji || "♟️")}</div><h1>${t("join_title")}</h1>
    <p class="jc-who">${nameHtml({ name: i.name, title: i.title, title_color: i.title_color })} <span class="muted">(${i.elo})</span></p>
    <div class="kv"><div><span>${t("mode_label")}</span><b>${esc(i.mode.emoji)} ${esc(i.mode.name)}</b></div>
      <div><span>${t("choose_tc")}</span><b dir="ltr">${esc(i.tc)}</b></div><div><span>${t("invite_color")}</span><b>${esc(colorTxt)}</b></div>
      <div><span>★</span><b>${i.rated ? (fa() ? "رسمی" : "Rated") : (fa() ? "دوستانه" : "Casual")}</b></div></div>
    <ul class="mrules">${(i.mode.rules || []).map((x) => `<li dir="auto">${esc(x)}</li>`).join("")}</ul>
    ${u ? `<button class="btn primary huge jc-go">✅ ${t("join_btn")}</button>` :
      `<p class="muted">${t("join_login")}</p><div class="row-b"><a class="btn primary" href="#/login?mode=signup&next=${encodeURIComponent("#/join/" + code)}">${t("signup")}</a>
        <a class="btn" href="#/login?next=${encodeURIComponent("#/join/" + code)}">${t("login")}</a></div>`}</div></div>`;
  const go = view.querySelector(".jc-go");
  if (go) go.onclick = async () => {
    try {
      const x = await api.post("invite_join", { t: u, c: +code, l: fa() ? "fa" : "en" });
      if (x.t) nav(`#/game/${x.t}`); else toast(x.error || t("offline"), "bad");
    } catch { toast(t("offline"), "bad"); }
  };
  return { destroy() {} };
}

// a small decorative board with a famous position
function miniBoard(el) {
  const fen = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR";
  let html = "";
  const rows = fen.split("/");
  rows.forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += +ch; continue; }
      const c = ch === ch.toUpperCase() ? "w" : "b";
      html += `<span class="pc" data-c="${c}${ch.toUpperCase()}" style="transform:translate(${f * 100}%,${r * 100}%)"></span>`;
      f++;
    }
  });
  el.innerHTML = `<div class="cb static"><div class="cb-sq"></div><div class="cb-hl"><div class="hl last" style="transform:translate(700%,300%)"></div><div class="hl last" style="transform:translate(300%,700%)"></div></div><div class="cb-pc">${html}</div></div>`;
}

// ───────── Bots ─────────
export async function renderBots(view, nav) {
  const bots = await loadBots();
  const beaten = new Set(store.get("beaten", []));
  const saved = store.get("botgame");
  const pick = store.get("botPick", { level: 3, color: "w", tc: "none" });
  const card = (b) => `<button class="bot-card${beaten.has(b.level) ? " beat" : ""}" data-l="${b.level}">
    <div class="av bot lg" style="background:${esc(b.color)}">${esc(b.initials)}</div>
    <div class="bc-n" dir="auto">${b.title ? `<span class="ttl">${esc(b.title)}</span>` : ""}${esc(fa() ? b.name_fa : b.name)}</div>
    <div class="bc-r">${b.elo}</div>${beaten.has(b.level) ? `<span class="bc-ok" title="${t("beaten")}">✓</span>` : ""}</button>`;
  const club = bots.filter((b) => b.group === "club"), eng = bots.filter((b) => b.group !== "club");
  let extra = [];  // the Bot Creator's bots and AI models (they play on the game server)
  view.innerHTML = `<div class="page bots-page">
    <div class="page-h"><h1>🤖 ${t("bots_title")}</h1><p class="muted">${t("bots_sub")}</p>
      <p class="muted small">🎲 <a href="#/modes">${fa() ? "هر رباتی را در هر حالت بازی یا از هر وضعیتی بازی کن →" : "Play any bot in any game mode or from any position →"}</a></p></div>
    ${saved && !saved.over ? `<a class="resume-card" href="#/bot"><span class="dot-live"></span><b>${esc(t("resume_bot", { name: botName(bots.find((b) => b.level === saved.level) || bots[0]) }))}</b></a>` : ""}
    <div class="bots-layout">
      <div class="bots-list"><div class="xbots"></div><h2>${t("club")}</h2><div class="bot-grid">${club.map(card).join("")}</div>
        <h2>${t("engines")}</h2><div class="bot-grid">${eng.map(card).join("")}</div></div>
      <div class="bot-setup"></div>
    </div></div>`;
  const setup = view.querySelector(".bot-setup");
  let sel = pick;
  const xcard = (b) => `<button class="bot-card x${b.kind === "ai" ? " ai" : ""}${b.inf ? " inf" : ""}" data-l="${b.level}">
    <div class="av bot lg emo" style="background:${esc(b.color)}">${esc(b.emoji)}</div>
    <div class="bc-n" dir="auto">${b.title ? `<span class="ttl">${esc(b.title)}</span>` : ""}${esc(b.name)}</div>
    <div class="bc-r">${b.inf ? "∞" : b.kind === "ai" ? (b.elo ? b.elo + " · " : "") + `🧠 ${esc(b.model)}` : b.elo}</div>${b.kind === "ai" && b.illegal ? `<span class="bc-wild">🤡</span>` : ""}</button>`;
  const showX = (b, scroll) => {
    sel.level = b.level;
    view.querySelectorAll(".bot-card").forEach((c) => c.classList.toggle("sel", +c.dataset.l === b.level));
    const ai = b.kind === "ai";
    const efen = store.get("editorFen");
    const hasPos = efen && efen.split(" ")[0] !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    if (!sel.start || (sel.start === "editor" && !hasPos)) sel.start = "normal";
    setup.innerHTML = `<div class="bs-card">
      <div class="bs-top"><div class="av bot xl emo" style="background:${esc(b.color)}">${esc(b.emoji)}</div>
        <div><div class="bs-name" dir="auto">${b.title ? `<span class="ttl">${esc(b.title)}</span>` : ""}${esc(b.name)}</div>
        <div class="bs-meta">${ai ? `${b.inf ? `${t("rating")} <b>∞</b> · ` : ""}🧠 ${esc(b.model)}` : `${t("rating")} <b>${b.inf ? "∞ · " + t("inf_rating") : b.elo}</b>`}</div></div></div>
      ${b.bio ? `<p class="bs-bio" dir="auto">${esc(b.bio)}</p>` : ""}
      ${ai ? `<p class="note small">${b.illegal ? t("ai_bot_note") : t("ai_legal_note")}</p>` : ""}
      <p class="muted small">📊 ${t("bot_record")}: ${b.wins}–${b.losses}–${b.draws} · ${t("server_game")}</p>
      <div class="bs-label">${t("choose_color")}</div>
      <div class="seg colors">${[["w", "♔ " + t("white")], ["r", "🎲 " + t("random")], ["b", "♚ " + t("black")]].map(([c, l]) =>
        `<button data-c="${c}" class="${sel.color === c ? "on" : ""}">${l}</button>`).join("")}</div>
      ${ai ? "" : `<div class="bs-label">${t("choose_tc")}</div><div class="seg tcs">${BOT_TC.map((c) => `<button data-t="${c}" class="${sel.tc === c ? "on" : ""}">${c === "none" ? "♾ " + t("no_timer") : c}</button>`).join("")}</div>`}
      <div class="bs-label">${t("play_from")}</div>
      <div class="seg">${[["normal", "♟ " + t("normal_start")], ...(hasPos ? [["editor", "🧩 " + t("editor")]] : [])].map(([k, l]) =>
        `<button data-st="${k}" class="${sel.start === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <button class="btn primary huge bs-go">${t("start")}</button></div>`;
    setup.querySelectorAll("[data-c]").forEach((x) => x.onclick = () => { sel.color = x.dataset.c; showX(b); });
    setup.querySelectorAll("[data-t]").forEach((x) => x.onclick = () => { sel.tc = x.dataset.t; showX(b); });
    setup.querySelectorAll("[data-st]").forEach((x) => x.onclick = () => { sel.start = x.dataset.st; showX(b); });
    setup.querySelector(".bs-go").onclick = async () => {
      const u = api.auth();
      if (!u) { toast(t("login_for_bot")); nav("#/login?mode=signup"); return; }
      store.set("botPick", sel);
      const mode = sel.start === "editor" && hasPos ? JSON.stringify({ spec: { core: "classic", start: "fen", fen: efen }, name: t("editor"), emoji: "🧩" }) : "standard";
      try {
        const r = await api.post("mode_bot", { t: u, level: b.level, color: sel.color === "r" ? "" : sel.color,
          tc: ai ? "none" : sel.tc, mode, l: fa() ? "fa" : "en" });
        if (r.t) nav(`#/game/${r.t}`); else toast(r.error || t("offline"), "bad");
      } catch { toast(t("offline"), "bad"); }
    };
    setup.classList.add("open");
    if (scroll && window.innerWidth < 900) setup.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  import("./modes.js?v=ffb4d75985").then(({ customBots }) => customBots()).then((list) => {
    extra = list || [];
    const box = view.querySelector(".xbots");
    if (!box || !extra.length) return;
    const eng2 = extra.filter((b) => b.kind !== "ai"), ais = extra.filter((b) => b.kind === "ai");
    box.innerHTML = (ais.length ? `<h2>🧠 ${t("ai_bots")}</h2><div class="bot-grid">${ais.map(xcard).join("")}</div>` : "") +
      (eng2.length ? `<h2>🛠 ${t("my_bots")}</h2><div class="bot-grid">${eng2.map(xcard).join("")}</div>` : "");
    box.querySelectorAll(".bot-card").forEach((c) => c.onclick = () => showX(extra.find((x) => x.level === +c.dataset.l), true));
    const cur = extra.find((x) => x.level === sel.level);
    if (cur) showX(cur, false);
  });
  const show = (level, scroll) => {
    const xb = extra.find((x) => x.level === level);
    if (xb) { showX(xb, scroll); return; }
    const b = bots.find((x) => x.level === level) || bots[0];
    sel.level = b.level;
    view.querySelectorAll(".bot-card").forEach((c) => c.classList.toggle("sel", +c.dataset.l === b.level));
    setup.innerHTML = `<div class="bs-card">
      <div class="bs-top"><div class="av bot xl" style="background:${esc(b.color)}">${esc(b.initials)}</div>
        <div><div class="bs-name" dir="auto">${b.title ? `<span class="ttl">${esc(b.title)}</span>` : ""}${esc(fa() ? b.name_fa : b.name)}</div>
        <div class="bs-meta">${t("rating")} <b>${b.elo}</b> · ${esc(fa() ? b.city_fa : b.city)}</div></div></div>
      <p class="bs-bio" dir="auto">${esc(fa() ? b.bio_fa : b.bio)}</p>
      <div class="bs-label">${t("choose_color")}</div>
      <div class="seg colors">${[["w", "♔ " + t("white")], ["r", "🎲 " + t("random")], ["b", "♚ " + t("black")]].map(([c, l]) =>
        `<button data-c="${c}" class="${sel.color === c ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="bs-label">${t("choose_tc")}</div>
      <div class="seg tcs">${BOT_TC.map((c) => `<button data-t="${c}" class="${sel.tc === c ? "on" : ""}">${c === "none" ? "♾ " + t("no_timer") : c}</button>`).join("")}</div>
      <button class="btn primary huge bs-go">${t("start")}</button></div>`;
    setup.querySelectorAll("[data-c]").forEach((x) => x.onclick = () => { sel.color = x.dataset.c; show(sel.level); });
    setup.querySelectorAll("[data-t]").forEach((x) => x.onclick = () => { sel.tc = x.dataset.t; show(sel.level); });
    setup.querySelector(".bs-go").onclick = async () => {
      const cur = store.get("botgame");
      if (cur && !cur.over && cur.moves.length > 1 && !(await confirmBox(t("confirm_leave"), t("new_game"), t("cancel")))) return;
      store.set("botPick", sel);
      store.del("botgame");
      nav(`#/bot?level=${sel.level}&color=${sel.color}&tc=${encodeURIComponent(sel.tc)}&new=${Date.now()}`);
    };
    setup.classList.add("open");
    if (scroll && window.innerWidth < 900) setup.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  view.querySelectorAll(".bot-card").forEach((c) => c.onclick = () => show(+c.dataset.l, true));
  show(sel.level, false);
  loadMe().then((me) => {
    if (!me) return;
    const nb = new Set(me.beaten || []);
    view.querySelectorAll(".bot-card").forEach((c) => {
      const lv = +c.dataset.l;
      if (nb.has(lv) && !c.classList.contains("beat")) { c.classList.add("beat"); c.insertAdjacentHTML("beforeend", `<span class="bc-ok">✓</span>`); }
    });
  });
  return { destroy() {} };
}
export const V = "ffb4d75985";  // the site version this file belongs to (main.js reloads the page after an update)
