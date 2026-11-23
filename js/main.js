// Chess — the website: online games, bots, puzzles, accounts, profiles, chat and the admin panel.
import { setLang, t, LANG, fa } from "./i18n.js?v=22a5e8314e";
import { store, toast, esc, titleHtml } from "./util.js?v=22a5e8314e";
import * as api from "./api.js?v=22a5e8314e";
import { soundOn, setSound } from "./sound.js?v=22a5e8314e";
import { loadMe, applyTheme, onMe, isStaff, setSession, banner } from "./session.js?v=22a5e8314e";

const view = document.getElementById("view");
const V = "22a5e8314e";

// Pages load on demand. If the site was updated since this page opened, the new files don't fit the old
// ones (two copies of the language and log-in state) — so reload once and everything is the new version.
async function lazy(path) {
  const m = await import(path);
  let again = true;
  try { again = !sessionStorage.getItem("chess.reloaded." + m.V); } catch { again = false; }
  if (m.V && m.V !== V && again) {
    try { sessionStorage.setItem("chess.reloaded." + m.V, "1"); } catch { /* ignore */ }
    location.reload();
    await new Promise(() => {});  // stop here; the page is reloading
  }
  return m;
}
let current = null;
let routing = 0;

const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M19 22H5v-2h14v2M17.16 8.26A4.96 4.96 0 0018 5.5C18 3 16 1 13.5 1S9 3 9 5.5c0 1 .31 1.94.84 2.76A5.45 5.45 0 007 13c0 1.82.88 3.42 2.25 4.43L8 20h8l-1.25-2.57A5.47 5.47 0 0017 13c0-1.96-1.04-3.68-2.6-4.66z"/></svg>',
  puzzles: '<svg viewBox="0 0 24 24"><path d="M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.7 2.7 0 010 5.4H2V20a2 2 0 002 2h3.8v-1.5a2.7 2.7 0 015.4 0V22H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 000-5z"/></svg>',
  bots: '<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A2.5 2.5 0 005 15.5 2.5 2.5 0 007.5 18a2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13m9 0a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5 2.5 2.5 0 00-2.5-2.5z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>',
  leaderboard: '<svg viewBox="0 0 24 24"><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>',
  me: '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/></svg>',
  admin: '<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M19.14 12.94a7.07 7.07 0 000-1.88l2.03-1.58a.48.48 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.03 7.03 0 00-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84a.48.48 0 00-.48.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.71 8.87a.48.48 0 00.12.61l2.03 1.58a7.07 7.07 0 000 1.88l-2.03 1.58a.48.48 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 00-.12-.61l-2.03-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z"/></svg>',
  lang: '<svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05A4.47 4.47 0 0016.5 12z"/></svg>',
  bale: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.66 15L2 22l5.13-1.32A10 10 0 1012 2zm5 13.5l-1.4 1.4L12 13.3l-3.6 3.6L7 15.5l3.6-3.6L7 8.3l1.4-1.4 3.6 3.6 3.6-3.6L17 8.3l-3.6 3.6 3.6 3.6z"/></svg>',
};

function meLink() {
  const me = store.get("me");
  if (!api.auth() || !me) return null;
  return me.account ? `#/u/${encodeURIComponent(me.account.username)}` : `#/p/${me.pid}`;
}

function chrome(active) {
  const me = store.get("me");
  const logged = !!api.auth();
  const staff = !!store.get("sess") && me && ["owner", "admin", "mod"].includes(me.role);
  const items = [["play", "#/play"], ["puzzles", "#/puzzles"], ["bots", "#/bots"], ["chat", "#/chat"], ["leaderboard", "#/leaderboard"]];
  const bot = api.botLink();
  const f = (me && me.flair) || {};
  const meBox = logged && me
    ? `<a class="sme" href="${meLink()}"><span class="sme-av"><span class="pc" data-c="wK"></span></span><span class="sme-n">${titleHtml(f.title, f.title_color)}<b dir="auto">${esc(me.name)}</b><small>${me.elo}</small></span></a>`
    : `<div class="sauth"><a class="btn primary" href="#/login?mode=signup">${t("signup")}</a><a class="btn" href="#/login">${t("login")}</a></div>`;
  document.getElementById("side").innerHTML = `
    <a class="logo" href="#/play"><span class="pc" data-c="wN"></span><span>Chess</span></a>
    ${meBox}
    <nav class="snav">${items.map(([k, href]) => `<a href="${href}" class="${active === k ? "on" : ""}">${ICONS[k]}<span>${t(k)}</span></a>`).join("")}
      ${logged ? `<a href="#/settings" class="${active === "settings" ? "on" : ""}">${ICONS.settings}<span>${t("settings")}</span></a>` : ""}
      ${staff ? `<a href="#/admin" class="${active === "admin" ? "on" : ""} adm">${ICONS.admin}<span>${t("admin")}</span></a>` : ""}</nav>
    <div class="sfoot">
      <button class="sl" data-x="lang">${ICONS.lang}<span>${t("lang_other")}</span></button>
      <button class="sl" data-x="sound">${ICONS.sound}<span>${soundOn() ? t("sound_on") : t("sound_off")}</span></button>
      ${bot ? `<a class="sl" href="${bot}" target="_blank" rel="noopener">${ICONS.bale}<span>${t("open_bale")}</span></a>` : ""}
    </div>`;
  const tabs = [["play", "#/play"], ["puzzles", "#/puzzles"], ["bots", "#/bots"], ["chat", "#/chat"],
    ["me", logged ? (meLink() || "#/settings") : "#/login"]];
  document.getElementById("tabbar").innerHTML = tabs.map(([k, href]) =>
    `<a href="${href}" class="${active === k || (k === "me" && ["me", "settings", "admin", "login", "leaderboard"].includes(active)) ? "on" : ""}">${ICONS[k]}<span>${k === "me" ? (logged ? t("me_tab") : t("login")) : t(k)}</span></a>`).join("");
}

document.addEventListener("click", (e) => {
  const x = e.target.closest("[data-x]");
  if (!x || x.closest(".aform") || x.closest(".auth-card")) return;
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
  let tidy = false, newKey = null;
  if (params.u) { store.set("u", params.u); newKey = params.u; delete params.u; tidy = true; }
  if (params.s) { api.rememberServer(params.s); delete params.s; tidy = true; }
  if (params.l) { setLang(params.l); delete params.l; tidy = true; }
  const ot = params.ot;
  if (ot) { delete params.ot; tidy = true; }
  if (tidy) {
    const q = new URLSearchParams(params).toString();
    history.replaceState(null, "", `${location.pathname}#/${parts.join("/")}${q ? "?" + q : ""}`);
  }
  if (ot) {  // a one-time log-in link (the owner's admin link)
    try {
      const r = await api.pub("onetime", { ot, l: fa() ? "fa" : "en" });
      if (r.token) { setSession(r.token, r.account); await loadMe(); toast(t("welcome_user", { name: r.account.username }), "good"); }
      else if (r.error) toast(r.error, "bad");
    } catch { toast(t("offline"), "bad"); }
    if (my !== routing) return;
  }
  const acc = store.get("account");
  if (newKey && store.get("sess") && acc && !acc.linked) offerLink(newKey, acc);
  if (current && current.destroy) current.destroy();
  current = null;
  document.querySelector(".emoji-pop")?.remove();
  document.querySelector(".pcard")?.remove();
  const page = parts[0] || "play";
  const locked = ["bot", "puzzles", "sprint", "game", "watch", "review", "lreview"].includes(page);
  document.body.classList.toggle("locked", locked);
  document.body.classList.toggle("chatpage", page === "chat");
  document.body.dataset.page = page;
  const activeOf = { sprint: "puzzles", bot: "bots", lreview: "bots", game: "play", u: "me", p: "me" };
  chrome(activeOf[page] || page);
  view.innerHTML = "";
  window.scrollTo(0, 0);
  try {
    if (page === "bots") {
      const { renderBots } = await lazy("./pages.js?v=22a5e8314e");
      if (my === routing) current = await renderBots(view, nav);
    } else if (page === "bot") {
      const { LocalGame } = await lazy("./local.js?v=22a5e8314e");
      const saved = store.get("botgame");
      if (params.level && params.new && (!saved || String(saved.id) !== params.new)) {
        const tc = params.tc && params.tc !== "none" ? params.tc.split("+").map(Number) : null;
        current = new LocalGame(view, { level: +params.level, color: params.color || "w", tc, id: +params.new }, nav);
      } else if (saved) current = new LocalGame(view, { saved }, nav);
      else nav("#/bots");
    } else if (page === "puzzles" || page === "sprint") {
      const { Puzzles } = await lazy("./puzzles.js?v=22a5e8314e");
      current = new Puzzles(view, nav, page === "sprint" ? "sprint" : "rated");
    } else if (page === "game" && parts[1]) {
      const { OnlineGame } = await lazy("./online.js?v=22a5e8314e");
      current = new OnlineGame(view, parts[1], nav);
    } else if (page === "watch" && parts[1]) {
      const { OnlineGame } = await lazy("./online.js?v=22a5e8314e");
      let tok = null;
      try { const r = await api.get("pub/watch", { id: parts[1] }); tok = r.t; if (!tok) toast(r.error || t("game_gone")); } catch { toast(t("offline")); }
      if (my !== routing) return;
      if (tok) current = new OnlineGame(view, tok, nav, { watch: true }); else nav("#/play");
    } else if (page === "review" && parts[1]) {
      const { ReviewPage } = await lazy("./online.js?v=22a5e8314e");
      current = new ReviewPage(view, parts[1], nav);
    } else if (page === "lreview") {
      const { ReviewPage } = await lazy("./online.js?v=22a5e8314e");
      const g = store.get("lastLocal");
      if (g && g.moves && g.moves.length) current = new ReviewPage(view, null, nav, { local: g }); else nav("#/bots");
    } else if (page === "login") {
      const { renderLogin } = await lazy("./account.js?v=22a5e8314e");
      if (store.get("sess") && !params.mode) { nav(params.next ? decodeURIComponent(params.next) : "#/settings"); return; }
      current = renderLogin(view, nav, params);
    } else if (page === "settings") {
      const { renderSettings } = await lazy("./account.js?v=22a5e8314e");
      current = await renderSettings(view, nav, params);
    } else if ((page === "u" || page === "p") && parts[1]) {
      const { renderProfile } = await lazy("./profile.js?v=22a5e8314e");
      current = await renderProfile(view, nav, page === "u" ? { user: decodeURIComponent(parts[1]) } : { pid: parts[1] });
    } else if (page === "me") {
      const link = meLink();
      nav(link || "#/login");
      return;
    } else if (page === "leaderboard") {
      const { renderLeaderboard } = await lazy("./profile.js?v=22a5e8314e");
      current = await renderLeaderboard(view, nav, params);
    } else if (page === "chat") {
      const { renderChat } = await lazy("./chat.js?v=22a5e8314e");
      current = await renderChat(view, nav);
    } else if (page === "admin") {
      const { renderAdmin } = await lazy("./admin.js?v=22a5e8314e");
      current = await renderAdmin(view, nav, params);
    } else {
      const { renderPlay } = await lazy("./pages.js?v=22a5e8314e");
      current = renderPlay(view, nav);
    }
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="page"><div class="card"><b>Something went wrong.</b><p class="muted">${esc(String(e && e.message || e))}</p><a class="btn primary" href="#/play">OK</a></div></div>`;
  }
}

// logged in to a website-only account and just came from a Bale link: offer to make them one player
async function offerLink(key, acc) {
  const { confirmBox } = await lazy("./util.js?v=22a5e8314e");
  if (!(await confirmBox(t("link_this_bale", { name: acc.username }), t("link_yes"), t("not_now")))) return;
  try {
    const r = await api.post("link_key", { t: store.get("sess"), u: key, l: fa() ? "fa" : "en" });
    if (r.error) toast(r.error, "bad"); else { toast(t("linked_ok"), "good"); store.set("account", r.account); loadMe(); }
  } catch { toast(t("offline"), "bad"); }
}

setLang(new URLSearchParams(location.hash.split("?")[1] || "").get("l") || store.get("lang") ||
  ((navigator.language || "").startsWith("fa") ? "fa" : "en"));
applyTheme(store.get("board"));
window.addEventListener("hashchange", route);
window.chessApp = { get page() { return current; } };  // handy for debugging in the browser console
let lastRole = null;
onMe((m) => {  // the side menu shows your name, title and the admin entry once we know who you are
  const key = m ? `${m.name}|${m.elo}|${m.role}|${m.flair?.title}` : null;
  if (key !== lastRole) { lastRole = key; const { parts } = parse(); const page = parts[0] || "play"; chrome({ sprint: "puzzles", bot: "bots", lreview: "bots", game: "play", u: "me", p: "me" }[page] || page); }
});
route();
api.connect().then(() => {
  if (api.auth()) loadMe();
  else api.pubGet("ping").then((p) => banner(p.banner)).catch(() => {});
}).catch(() => {});
setInterval(() => { if (api.auth() && !document.hidden) loadMe(); }, 60000);  // new achievements, titles, bans
void isStaff;
