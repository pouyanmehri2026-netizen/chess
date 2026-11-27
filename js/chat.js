// The community chat (#/chat) and the small chat box inside online games.
import * as api from "./api.js?v=ffb4d75985";
import { t, fa } from "./i18n.js?v=ffb4d75985";
import { esc, toast, sleep, nameHtml, profileHref, store, confirmBox } from "./util.js?v=ffb4d75985";
import { current, isStaff, loadMe } from "./session.js?v=ffb4d75985";
import { play } from "./sound.js?v=ffb4d75985";

const L = () => (fa() ? "fa" : "en");
const hhmm = (ts) => { const d = new Date(ts * 1000); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

function msgHtml(m, staff) {
  const href = profileHref(m);
  const who = { name: m.name, title: m.title, title_color: m.title_color, tag: m.tag };
  return `<div class="cm${m.mine ? " mine" : ""}" data-id="${m.id}">
    <div class="cm-h">${href ? `<a href="${href}">${nameHtml(who)}</a>` : nameHtml(who)}${m.show && m.show.length ? `<span class="showc">${m.show.map((e) => `<i>${esc(e)}</i>`).join("")}</span>` : ""}
      <span class="cm-t">${hhmm(m.ts)}</span>
      <span class="cm-act">${m.mine ? "" : `<button data-r="${m.id}" title="${t("report")}">⚑</button>`}${staff ? `<button data-d="${m.id}" title="delete">🗑</button>` : ""}</span></div>
    <div class="cm-b" dir="auto">${esc(m.text)}</div></div>`;
}

export async function renderChat(view, nav) {
  let alive = true, last = 0;
  const me = current() || await loadMe();
  const can = !!api.auth();
  const staff = isStaff(me);
  view.innerHTML = `<div class="page chat-page"><div class="chat-wrap">
      <div class="chat-h"><h1>💬 ${t("chat_title")}</h1><span class="muted small">${t("chat_rules")}</span></div>
      <div class="chat-list"><div class="spin center"></div></div>
      ${can ? `<form class="chat-in"><textarea rows="1" maxlength="300" dir="auto" placeholder="${t("chat_ph")}"></textarea><button class="btn primary" aria-label="${t("chat_send")}">➤</button></form>`
        : `<div class="chat-login">${t("chat_login")} <a class="btn primary" href="#/login?next=${encodeURIComponent("#/chat")}">${t("login")}</a><a class="btn" href="#/login?mode=signup">${t("signup")}</a></div>`}
    </div></div>`;
  const list = view.querySelector(".chat-list");
  const atBottom = () => list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  function add(msgs, first) {
    if (first) list.innerHTML = "";
    const stick = first || atBottom();
    for (const m of msgs) {
      if (m.id <= last) continue;
      last = m.id;
      list.insertAdjacentHTML("beforeend", msgHtml(m, staff));
    }
    if (!list.children.length) list.innerHTML = `<div class="muted center-t">👋</div>`;
    if (stick) list.scrollTop = list.scrollHeight;
  }
  list.addEventListener("click", async (e) => {
    const r = e.target.closest("[data-r]"), d = e.target.closest("[data-d]");
    if (r) {
      if (!(await confirmBox(t("report") + "?", t("report"), t("cancel")))) return;
      try { await api.post("chat_report", { t: api.auth(), id: +r.dataset.r }); toast(t("report_sent"), "good"); } catch { toast(t("offline"), "bad"); }
    }
    if (d) {
      try { const x = await api.post("adm_chat_delete", { t: store.get("sess"), id: +d.dataset.d }); if (x.error) toast(x.error, "bad"); else d.closest(".cm").remove(); }
      catch { toast(t("offline"), "bad"); }
    }
  });
  const form = view.querySelector(".chat-in");
  if (form) {
    const ta = form.querySelector("textarea");
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(110, ta.scrollHeight) + "px"; });
    form.onsubmit = async (e) => {
      e.preventDefault();
      const text = ta.value.trim();
      if (!text) return;
      ta.value = ""; ta.style.height = "auto";
      try {
        const r = await api.post("chat", { t: api.auth(), text, l: L() });
        if (r.error) { toast(r.error, "bad"); ta.value = text; return; }
        add(r.messages || []);
        list.scrollTop = list.scrollHeight;
      } catch { toast(t("offline"), "bad"); ta.value = text; }
    };
  }
  (async () => {
    let first = true;
    while (alive) {
      try {
        const q = { after: last, l: L() };
        if (!first) q.wait = 1;
        const r = can ? await api.get("chat", { t: api.auth(), ...q }, 30000) : await api.pubGet("chat", q, 30000);
        if (!alive) return;
        if (r.off && first) list.insertAdjacentHTML("afterbegin", `<div class="note">${t("chat_closed")}</div>`);
        const fresh = (r.messages || []).filter((m) => m.id > last && !m.mine);
        add(r.messages || [], first);
        if (!first && fresh.length && document.hidden) play("notify");
        first = false;
      } catch { await sleep(2500); }
    }
  })();
  return { destroy() { alive = false; } };
}

// ───────── the chat inside a game ─────────
export class GameChat {
  constructor(box, { onSend, canChat }) {
    this.box = box;
    this.onSend = onSend;
    this.seen = 0;
    this.unread = 0;
    this.open = false;
    box.innerHTML = `<div class="gc-list"></div>${canChat ? `<form class="gc-in"><input maxlength="300" dir="auto" placeholder="${t("chat_ph")}"><button class="btn primary" aria-label="${t("chat_send")}">➤</button></form>` : ""}
      <div class="gc-quick">${canChat ? ["👋", "GG", "👍", "😅", "🔥", "Good luck!"].map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("") : ""}</div>`;
    this.list = box.querySelector(".gc-list");
    const form = box.querySelector(".gc-in");
    if (form) {
      form.onsubmit = (e) => { e.preventDefault(); const i = form.querySelector("input"); const v = i.value.trim(); if (v) { i.value = ""; this.onSend(v); } };
      box.querySelectorAll("[data-q]").forEach((b) => b.onclick = () => this.onSend(b.dataset.q));
    }
    this.set([]);
  }

  set(msgs, players = {}) {
    if (!msgs.length) { this.list.innerHTML = `<div class="gc-empty muted small">${t("chat_game_empty")}</div>`; return 0; }
    const fresh = msgs.filter((m) => m.id > this.seen);
    if (!fresh.length) return 0;
    if (this.list.querySelector(".gc-empty")) this.list.innerHTML = "";
    for (const m of fresh) {
      this.list.insertAdjacentHTML("beforeend", `<div class="gcm c-${esc(m.color)}${m.src ? " s-" + esc(m.src) : ""}"><b><bdi>${m.src === "ai" ? "🧠 " : ""}${esc(m.name)}</bdi>:</b> <bdi>${esc(m.text)}</bdi></div>`);
    }
    this.seen = msgs[msgs.length - 1].id;
    this.list.scrollTop = this.list.scrollHeight;
    return fresh.length;
  }
}
export const V = "ffb4d75985";  // the site version this file belongs to (main.js reloads the page after an update)
