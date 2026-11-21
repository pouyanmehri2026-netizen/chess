// Chess — the website: online games, bots and puzzles. Everything else lives in the Bale bot.
import { setLang, t, LANG } from "./i18n.js?v=a08ceb19c1";
import { store, toast } from "./util.js?v=a08ceb19c1";
import * as api from "./api.js?v=a08ceb19c1";
import { soundOn, setSound } from "./sound.js?v=a08ceb19c1";

const view = document.getElementById("view");
let current = null;
let routing = 0;

const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M19 22H5v-2h14v2M17.16 8.26A4.96 4.96 0 0018 5.5C18 3 16 1 13.5 1S9 3 9 5.5c0 1 .31 1.94.84 2.76A5.45 5.45 0 007 13c0 1.82.88 3.42 2.25 4.43L8 20h8l-1.25-2.57A5.47 5.47 0 0017 13c0-1.96-1.04-3.68-2.6-4.66z"/></svg>',
  puzzles: '<svg viewBox="0 0 24 24"><path d="M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.7 2.7 0 010 5.4H2V20a2 2 0 002 2h3.8v-1.5a2.7 2.7 0 015.4 0V22H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 000-5z"/></svg>',
  bots: '<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A2.5 2.5 0 005 15.5 2.5 2.5 0 007.5 18a2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13m9 0a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5 2.5 2.5 0 00-2.5-2.5z"/></svg>',
  lang: '<svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05A4.47 4.47 0 0016.5 12z"/></svg>',
  bale: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.66 15L2 22l5.13-1.32A10 10 0 1012 2zm5 13.5l-1.4 1.4L12 13.3l-3.6 3.6L7 15.5l3.6-3.6L7 8.3l1.4-1.4 3.6 3.6 3.6-3.6L17 8.3l-3.6 3.6 3.6 3.6z"/></svg>',
};

function chrome(active) {
  const items = [["play", "#/play"], ["puzzles", "#/puzzles"], ["bots", "#/bots"]];
  const bot = api.botLink();
  document.getElementById("side").innerHTML = `
    <a class="logo" href="#/play"><span class="pc" data-c="wN"></span><span>Chess</span></a>
    <nav class="snav">${items.map(([k, href]) => `<a href="${href}" class="${active === k ? "on" : ""}">${ICONS[k]}<span>${t(k)}</span></a>`).join("")}</nav>
    <div class="sfoot">
      <button class="sl" data-x="lang">${ICONS.lang}<span>${t("lang_other")}</span></button>
      <button class="sl" data-x="sound">${ICONS.sound}<span>${soundOn() ? t("sound_on") : t("sound_off")}</span></button>
      ${bot ? `<a class="sl" href="${bot}" target="_blank" rel="noopener">${ICONS.bale}<span>${t("open_bale")}</span></a>` : ""}
    </div>`;
  document.getElementById("tabbar").innerHTML = items.map(([k, href]) =>
    `<a href="${href}" class="${active === k ? "on" : ""}">${ICONS[k]}<span>${t(k)}</span></a>`).join("") +
    `<button data-x="lang">${ICONS.lang}<span>${t("lang_other")}</span></button>`;
}

document.addEventListener("click", (e) => {
  const x = e.target.closest("[data-x]");
  if (!x) return;
  if (x.dataset.x === "lang") { setLang(LANG === "fa" ? "en" : "fa"); route(); }
  if (x.dataset.x === "sound") { setSound(!soundOn()); route(); }
});

function parse() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  return { parts: (path || "").split("/").filter(Boolean), params: Object.fromEntries(new URLSearchParams(query || "")) };
}

export function nav(hash) {
  if (location.hash === hash) route(); else location.hash = hash;
}

async function route() {
  const my = ++routing;
  const { parts, params } = parse();
  // links from Bale carry the player's key (u), the server (s) and the language (l): keep them, then tidy the address bar
  let tidy = false;
  if (params.u) { store.set("u", params.u); delete params.u; tidy = true; }
  if (params.s) { api.rememberServer(params.s); delete params.s; tidy = true; }
  if (params.l) { setLang(params.l); delete params.l; tidy = true; }
  if (tidy) {
    const q = new URLSearchParams(params).toString();
    history.replaceState(null, "", `${location.pathname}#/${parts.join("/")}${q ? "?" + q : ""}`);
  }
  if (current && current.destroy) current.destroy();
  current = null;
  document.querySelector(".emoji-pop")?.remove();
  const page = parts[0] || "play";
  const locked = ["bot", "puzzles", "sprint", "game", "watch", "review", "lreview"].includes(page);
  document.body.classList.toggle("locked", locked);
  document.body.dataset.page = page;
  chrome(page === "sprint" ? "puzzles" : ["bot", "lreview"].includes(page) ? "bots" : page === "game" ? "play" : page);
  view.innerHTML = "";
  window.scrollTo(0, 0);
  try {
    if (page === "bots") {
      const { renderBots } = await import("./pages.js?v=a08ceb19c1");
      if (my === routing) current = await renderBots(view, nav);
    } else if (page === "bot") {
      const { LocalGame } = await import("./local.js?v=a08ceb19c1");
      const saved = store.get("botgame");
      if (params.level && params.new && (!saved || String(saved.id) !== params.new)) {
        const tc = params.tc && params.tc !== "none" ? params.tc.split("+").map(Number) : null;
        current = new LocalGame(view, { level: +params.level, color: params.color || "w", tc, id: +params.new }, nav);
      } else if (saved) current = new LocalGame(view, { saved }, nav);
      else nav("#/bots");
    } else if (page === "puzzles" || page === "sprint") {
      const { Puzzles } = await import("./puzzles.js?v=a08ceb19c1");
      current = new Puzzles(view, nav, page === "sprint" ? "sprint" : "rated");
    } else if (page === "game" && parts[1]) {
      const { OnlineGame } = await import("./online.js?v=a08ceb19c1");
      current = new OnlineGame(view, parts[1], nav);
    } else if (page === "watch" && parts[1]) {
      const { OnlineGame } = await import("./online.js?v=a08ceb19c1");
      let tok = null;
      try { const r = await api.get("pub/watch", { id: parts[1] }); tok = r.t; if (!tok) toast(r.error || t("game_gone")); } catch { toast(t("offline")); }
      if (my !== routing) return;
      if (tok) current = new OnlineGame(view, tok, nav, { watch: true }); else nav("#/play");
    } else if (page === "review" && parts[1]) {
      const { ReviewPage } = await import("./online.js?v=a08ceb19c1");
      current = new ReviewPage(view, parts[1], nav);
    } else if (page === "lreview") {
      const { ReviewPage } = await import("./online.js?v=a08ceb19c1");
      const g = store.get("lastLocal");
      if (g && g.moves && g.moves.length) current = new ReviewPage(view, null, nav, { local: g }); else nav("#/bots");
    } else {
      const { renderPlay } = await import("./pages.js?v=a08ceb19c1");
      current = renderPlay(view, nav);
    }
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="page"><div class="card"><b>Something went wrong.</b><p class="muted">${String(e && e.message || e)}</p><a class="btn primary" href="#/play">OK</a></div></div>`;
  }
}

setLang(new URLSearchParams(location.hash.split("?")[1] || "").get("l") || store.get("lang") ||
  ((navigator.language || "").startsWith("fa") ? "fa" : "en"));
window.addEventListener("hashchange", route);
window.chessApp = { get page() { return current; } };  // handy for debugging in the browser console
route();
api.connect().catch(() => {});
