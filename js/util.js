// Small helpers shared by every page.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const store = {
  get(k, d = null) {
    try { const v = localStorage.getItem("chess." + k); return v === null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) { try { localStorage.setItem("chess." + k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem("chess." + k); } catch { /* ignore */ } },
};

export function fmtClock(secs) {
  secs = Math.max(0, secs);
  if (secs < 10) return "0:" + secs.toFixed(1).padStart(4, "0");
  const s = Math.ceil(secs - 1e-6);
  const m = Math.floor(s / 60), r = s % 60;
  if (s >= 3600) return `${Math.floor(s / 3600)}:${String(m % 60).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export function initials(name) {
  const parts = String(name || "?").replace(/^(GM|IM|FM|CM|WGM|WIM)\s+/, "").split(/\s+/).filter(Boolean);
  return (parts.map((p) => [...p][0]).join("").slice(0, 2) || "?").toUpperCase();
}

let toastBox = null;
export function toast(msg, kind = "") {
  toastBox = toastBox || document.getElementById("toasts");
  if (!toastBox) return;
  const el = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
  toastBox.appendChild(el);
  requestAnimationFrame(() => el.classList.add("on"));
  setTimeout(() => { el.classList.remove("on"); setTimeout(() => el.remove(), 300); }, 2600);
}

// A centered dialog. buttons: [{label, cls, onClick -> false keeps it open}]
export function modal({ title = "", body = "", buttons = [], dismiss = true, cls = "" } = {}) {
  const root = document.getElementById("modal-root");
  const el = h(`<div class="mod-wrap"><div class="mod ${cls}" role="dialog">
    ${title ? `<div class="mod-t">${title}</div>` : ""}<div class="mod-b"></div><div class="mod-f"></div></div></div>`);
  const b = el.querySelector(".mod-b");
  if (typeof body === "string") b.innerHTML = body; else if (body) b.appendChild(body);
  const close = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 180); };
  for (const btn of buttons) {
    const x = h(`<button class="btn ${btn.cls || ""}">${btn.label}</button>`);
    x.onclick = async () => { const keep = btn.onClick ? await btn.onClick() : undefined; if (keep !== false) close(); };
    el.querySelector(".mod-f").appendChild(x);
  }
  if (!buttons.length) el.querySelector(".mod-f").remove();
  if (dismiss) el.addEventListener("pointerdown", (e) => { if (e.target === el) close(); });
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("on"));
  return close;
}

export function confirmBox(text, yes, no) {
  return new Promise((resolve) => {
    modal({ body: `<p class="mod-q">${esc(text)}</p>`, buttons: [
      { label: no, cls: "ghost", onClick: () => resolve(false) },
      { label: yes, cls: "danger", onClick: () => resolve(true) },
    ], dismiss: true });
  });
}

export function timeAgo(ts, fa) {
  const d = Math.max(0, Date.now() / 1000 - ts);
  const units = fa ? ["ثانیه", "دقیقه", "ساعت", "روز"] : ["s", "m", "h", "d"];
  const v = d < 60 ? [Math.floor(d), 0] : d < 3600 ? [Math.floor(d / 60), 1] : d < 86400 ? [Math.floor(d / 3600), 2] : [Math.floor(d / 86400), 3];
  return fa ? `${v[0]} ${units[v[1]]} پیش` : `${v[0]}${units[v[1]]} ago`;
}

// ───────── titles, tags, flair (how a player's name is shown everywhere) ─────────
function lum(hex) {
  const n = parseInt(String(hex || "#888888").slice(1), 16);
  return 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255);
}
const HEX = /^#[0-9a-fA-F]{6}$/;
const col = (c, d) => (HEX.test(c || "") ? c : d);

export function titleHtml(code, color) {
  if (!code) return "";
  const bg = col(color, "#7c2929");
  return `<span class="ttl" style="background:${bg};color:${lum(bg) > 170 ? "#151515" : "#fff"}">${esc(code)}</span>`;
}

export function tagHtml(tag, cls = "") {
  if (!tag || (!tag.emoji && !tag.text)) return "";
  const c1 = col(tag.color, "#888888"), c2 = col(tag.color2, c1);
  const fg = (tag.style === "outline") ? c1 : (lum(c1) > 165 ? "#151515" : "#fff");
  return `<span class="tagp st-${esc(tag.style || "solid")} ${cls}" style="--c1:${c1};--c2:${c2};--fg:${fg}">` +
    `${tag.emoji ? `<i>${esc(tag.emoji)}</i>` : ""}${tag.text ? `<b dir="auto">${esc(tag.text)}</b>` : ""}</span>`;
}

export function showHtml(list) {
  return list && list.length ? `<span class="showc">${list.map((e) => `<i>${esc(e)}</i>`).join("")}</span>` : "";
}

// "GM  Sara  🇮🇷  [👑 Owner]" — p: {name, title, title_color, tag, flag, show}
export function nameHtml(p, { tag = true, show = false, flag = true } = {}) {
  if (!p) return "";
  return `${titleHtml(p.title, p.title_color)}<span class="nm" dir="auto">${esc(p.name || "")}</span>` +
    `${flag && p.flag ? `<span class="flag">${esc(p.flag)}</span>` : ""}${tag ? tagHtml(p.tag, "sm") : ""}${show ? showHtml(p.show) : ""}`;
}

export function profileHref(p) {
  if (!p) return null;
  if (p.user || p.username) return `#/u/${encodeURIComponent(p.user || p.username)}`;
  if (p.pid) return `#/p/${encodeURIComponent(p.pid)}`;
  return null;
}

export function dateText(ts, fa) {
  if (!ts) return "";
  try { return new Date(ts * 1000).toLocaleDateString(fa ? "fa-IR" : "en-GB", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return ""; }
}

// Win chance (0..100) for White from a centipawn score — the same curve the bot uses.
export function winPct(cp) {
  cp = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function evalText(cp, mateIn) {
  if (mateIn) return (mateIn > 0 ? "M" : "-M") + Math.abs(mateIn);
  const v = cp / 100;
  return (v > 0 ? "+" : "") + v.toFixed(1);
}
