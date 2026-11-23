// The two menu pages: Play (online matchmaking, friend invites, resume) and Bots (pick an opponent).
import { t, fa } from "./i18n.js?v=ffe5d1f900";
import { store, esc, toast, sleep, confirmBox, titleHtml } from "./util.js?v=ffe5d1f900";
import * as api from "./api.js?v=ffe5d1f900";
import { loadBots, botName } from "./local.js?v=ffe5d1f900";
import { play } from "./sound.js?v=ffe5d1f900";
import { loadMe as sessionMe } from "./session.js?v=ffe5d1f900";

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
    </div></div>`;
  miniBoard(view.querySelector(".mini-board"));
  const playBtn = view.querySelector(".play-btn");
  if (!u) playBtn.classList.add("dis");
  view.querySelectorAll(".tc").forEach((b) => b.onclick = () => {
    tc = b.dataset.tc;
    store.set("tc", tc);
    view.querySelectorAll(".tc").forEach((x) => x.classList.toggle("on", x === b));
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
      const r = await api.post("queue", { t: u, tc });
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
    try {
      const r = await api.post("invite", { t: u, tc, rated: true });
      if (!r.link) { toast(r.error || t("offline")); return; }
      const { modal } = await import("./util.js?v=ffe5d1f900");
      modal({ title: t("invite_ready"), body: `<p class="muted small">${t("play_friend_sub")}</p><div class="share"><input readonly value="${esc(r.link)}" dir="ltr"><button class="btn cp">${t("copy")}</button></div>`, buttons: [] });
      document.querySelector(".share .cp").onclick = () => navigator.clipboard?.writeText(r.link).then(() => toast(t("copied")));
    } catch { toast(t("offline")); }
  }

  refresh();
  return { destroy() { alive = false; searching = false; } };
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
  view.innerHTML = `<div class="page bots-page">
    <div class="page-h"><h1>🤖 ${t("bots_title")}</h1><p class="muted">${t("bots_sub")}</p></div>
    ${saved && !saved.over ? `<a class="resume-card" href="#/bot"><span class="dot-live"></span><b>${esc(t("resume_bot", { name: botName(bots.find((b) => b.level === saved.level) || bots[0]) }))}</b></a>` : ""}
    <div class="bots-layout">
      <div class="bots-list"><h2>${t("club")}</h2><div class="bot-grid">${club.map(card).join("")}</div>
        <h2>${t("engines")}</h2><div class="bot-grid">${eng.map(card).join("")}</div></div>
      <div class="bot-setup"></div>
    </div></div>`;
  const setup = view.querySelector(".bot-setup");
  let sel = pick;
  const show = (level, scroll) => {
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
export const V = "ffe5d1f900";  // the site version this file belongs to (main.js reloads the page after an update)
