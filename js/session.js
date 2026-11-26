// Who is using the website, their profile, their board design, and pop-ups for new achievements/titles.
import * as api from "./api.js?v=1c105c2606";
import { store, esc, h } from "./util.js?v=1c105c2606";
import { t, fa } from "./i18n.js?v=1c105c2606";
import { play } from "./sound.js?v=1c105c2606";

let me = null;
const listeners = new Set();

export const current = () => me;
export const cached = () => me || store.get("me");
export function onMe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function applyTheme(key) {
  const k = key || store.get("board") || "green";
  document.documentElement.dataset.board = k;
  store.set("board", k);
}

export async function loadMe() {
  const a = api.auth();
  if (!a) { me = null; return null; }
  try {
    const r = await api.get("me", { t: a, l: fa() ? "fa" : "en" }, 9000);
    if (r && !r.error) {
      me = r;
      store.set("me", { name: r.name, elo: r.elo, puzzle_rating: r.puzzle_rating, flair: r.flair, pid: r.pid,
        role: r.role, account: r.account, theme: r.theme });
      store.set("beaten", r.beaten || []);
      if (r.account) store.set("account", r.account);
      applyTheme(r.theme);
      banner(r.banner);
      news(r.news);
      listeners.forEach((f) => { try { f(r); } catch (e) { console.error(e); } });
      return r;
    }
    if (r && r.logout) forget();
  } catch { /* offline */ }
  return null;
}

export function setSession(token, account) {
  store.set("sess", token);
  if (account) store.set("account", account);
}

export function forget() {
  for (const k of ["sess", "u", "me", "account", "beaten"]) store.del(k);
  me = null;
  listeners.forEach((f) => { try { f(null); } catch { /* ignore */ } });
}

export async function logout(all = false) {
  const s = store.get("sess");
  if (s) { try { await api.post(all ? "logout_all" : "logout", { t: s }); } catch { /* offline */ } }
  if (!all) forget();
}

export function isStaff(m = me) { return !!m && ["owner", "admin", "mod"].includes(m.role) && !!store.get("sess"); }

// the owner's announcement at the top of every page
export function banner(text) {
  const el = document.getElementById("banner");
  if (!el) return;
  const seen = store.get("bannerSeen");
  if (!text || seen === text) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span>📣</span><span class="bn-t" dir="auto">${esc(text)}</span><button aria-label="close">✕</button>`;
  el.querySelector("button").onclick = () => { store.set("bannerSeen", text); el.hidden = true; };
}

// "Achievement unlocked!" cards that slide in (one after another)
const queue = [];
let showing = false;
export function news(list) {
  for (const n of list || []) queue.push(n);
  if (!showing) next();
}

function next() {
  const n = queue.shift();
  if (!n) { showing = false; return; }
  showing = true;
  const box = document.getElementById("toasts");
  const rarity = n.rarity || "rare";
  const title = n.kind === "title" ? t("title_new") : t("ach_new");
  const name = n.kind === "title" ? `${n.code} — ${fa() ? n.name_fa : n.name}` : (fa() ? n.name_fa : n.name) || n.code;
  const el = h(`<div class="achpop r-${esc(rarity)}"><div class="ap-e">${esc(n.kind === "title" ? "🎖" : n.emoji || "🏅")}</div>
    <div class="ap-b"><div class="ap-t">${title}</div><div class="ap-n" dir="auto">${esc(name)}</div>
    ${n.kind === "title" ? "" : `<div class="ap-r">${t("r_" + rarity)} · +${n.points || 0}</div>`}</div></div>`);
  box.appendChild(el);
  play(rarity === "legendary" || rarity === "epic" || n.kind === "title" ? "good" : "notify");
  requestAnimationFrame(() => el.classList.add("on"));
  setTimeout(() => { el.classList.remove("on"); setTimeout(() => { el.remove(); next(); }, 350); }, 3600);
}
