// The admin panel (#/admin): dashboard, players, titles & tags, fair play, reports, chat, games,
// broadcast, settings and the log. Only for accounts with a role (owner / admin / mod).
import * as api from "./api.js?v=ffa8bb0e87";
import { t, fa, extend } from "./i18n.js?v=ffa8bb0e87";
import { esc, toast, store, modal, confirmBox, titleHtml, tagHtml, nameHtml, timeAgo, dateText, profileHref } from "./util.js?v=ffa8bb0e87";
import { loadMe, isStaff } from "./session.js?v=ffa8bb0e87";

extend({
  a_dash: ["Dashboard", "داشبورد"], a_players: ["Players", "بازیکنان"], a_tags: ["Titles & tags", "عنوان و تگ"],
  a_fair: ["Fair play", "ضد تقلب"], a_reports: ["Reports", "گزارش‌ها"], a_chat: ["Chat", "چت"], a_games: ["Games", "بازی‌ها"],
  a_broadcast: ["Broadcast", "اعلان"], a_settings: ["Settings", "تنظیمات"], a_log: ["Log", "گزارش کارها"],
  a_title: ["Admin panel", "پنل مدیریت"], a_search: ["Search name, username, e-mail or id…", "جستجوی نام، نام کاربری، ایمیل یا شناسه…"],
  a_ban: ["Ban", "محروم کردن"], a_unban: ["Unban", "رفع محرومیت"], a_mute: ["Mute", "ساکت کردن"], a_unmute: ["Unmute", "رفع سکوت"],
  a_reason: ["Reason", "دلیل"], a_refund: ["Give their recent opponents their rating back", "امتیاز حریف‌های اخیرش برگردد"],
  a_rating: ["Rating", "امتیاز"], a_puzzle: ["Puzzle rating", "امتیاز معما"], a_set: ["Set", "ثبت"], a_trusted: ["Trusted (never auto-banned)", "مورد اعتماد (هرگز خودکار محروم نشود)"],
  a_role: ["Role", "نقش"], a_give_title: ["Titles (tap to give / take)", "عنوان‌ها (بزن تا بدهی / بگیری)"],
  a_give_tag: ["Tags (tap to give / take)", "تگ‌ها (بزن تا بدهی / بگیری)"], a_give_theme: ["Give a board design", "دادن طرح صفحه"],
  a_give_ach: ["Give / take an achievement", "دادن / گرفتن دستاورد"], a_give: ["Give", "بده"], a_take: ["Take", "بگیر"],
  a_message: ["Message in Bale", "پیام در بله"], a_send: ["Send", "ارسال"], a_delete_acc: ["Delete website account", "حذف حساب سایت"],
  a_games_list: ["Recent games", "بازی‌های اخیر"], a_fair_rows: ["Fair-play checks", "بررسی‌های ضد تقلب"], a_bans: ["Ban history", "سابقه محرومیت"],
  a_msgs: ["Chat messages", "پیام‌های چت"], a_new_tag: ["Create a tag", "ساخت تگ"], a_edit_tag: ["Edit tag", "ویرایش تگ"],
  a_emoji: ["Emoji", "ایموجی"], a_text: ["Text", "متن"], a_color: ["Colour", "رنگ"], a_color2: ["2nd colour", "رنگ دوم"], a_style: ["Style", "سبک"],
  a_preview: ["Preview", "پیش‌نمایش"], a_save_tag: ["Save tag", "ذخیره تگ"], a_holders: ["holders", "دارنده"], a_give_to: ["Give to a player…", "دادن به بازیکن…"],
  a_thresholds: ["Rating titles — earned automatically at this rating (0 = off)", "عنوان‌های امتیازی — با رسیدن به این امتیاز خودکار داده می‌شوند (۰ = خاموش)"],
  a_save: ["Save", "ذخیره"], a_live: ["Live games", "بازی‌های زنده"], a_abort: ["Abort", "لغو"], a_watch: ["Watch", "تماشا"], a_review: ["Review", "مرور"],
  a_clear: ["Clear", "پاک کردن"], a_recheck: ["Check again", "بررسی دوباره"], a_cheat_ban: ["Fair-play ban (3d → 14d → forever)", "محرومیت تقلب (۳ روز ← ۱۴ روز ← همیشه)"],
  a_close: ["Close", "بستن"], a_open: ["Open", "باز"], a_closed: ["Closed", "بسته"], a_all: ["All", "همه"],
  a_bc_sub: ["Sends your message to every Bale player (slowly, in the background) and/or shows it at the top of the website.", "پیامت را برای همه بازیکنان بله می‌فرستد (آرام و در پس‌زمینه) و/یا بالای سایت نشان می‌دهد."],
  a_bc_bale: ["Bale", "بله"], a_bc_site: ["Website banner", "بنر سایت"], a_bc_both: ["Both", "هر دو"], a_bc_sent: ["Sending to {n} players…", "در حال ارسال به {n} بازیکن…"],
  a_banner: ["Website banner (empty = none)", "بنر سایت (خالی = هیچ)"], a_chat_off: ["Close the community chat (staff can still write)", "بستن چت عمومی (ناظرها می‌توانند بنویسند)"],
  a_signups: ["Close sign-ups", "بستن ثبت‌نام"], a_fair_mode: ["Fair-play sensitivity", "حساسیت ضد تقلب"], a_autoban: ["Automatic bans", "محرومیت خودکار"],
  a_off: ["Off", "خاموش"], a_low: ["Low", "کم"], a_normal: ["Normal", "معمولی"], a_high: ["High", "زیاد"],
  a_new_link: ["New admin link (for another device)", "لینک مدیریت جدید (برای دستگاه دیگر)"], a_copied: ["Link copied — it works once, for 15 minutes.", "لینک کپی شد — یک بار و تا ۱۵ دقیقه کار می‌کند."],
  a_server: ["Server", "سرور"], a_mail_on: ["E-mail codes: on", "ایمیل: روشن"], a_mail_off: ["E-mail codes: off — run “Setup email.bat”", "ایمیل: خاموش — «Setup email.bat» را اجرا کن"],
  a_sf: ["Stockfish", "استاک‌فیش"], a_online: ["online now", "آنلاین"], a_flagged: ["flagged for fair play", "مشکوک به تقلب"],
  a_score: ["score", "امتیاز"], a_t1: ["engine match", "تطابق با موتور"], a_acc: ["accuracy", "دقت"], a_blur: ["left tab", "خروج از صفحه"],
  a_nobody: ["Nothing here 🎉", "چیزی نیست 🎉"], a_denied: ["This page is for the owner and staff.", "این صفحه مخصوص مالک و ناظرهاست."],
  a_minutes: ["Duration", "مدت"], a_perm: ["Forever", "همیشه"], a_owner_only: ["Owner only", "فقط مالک"],
});

const DUR = [["10", "10m"], ["60", "1h"], ["1440", "1d"], ["4320", "3d"], ["10080", "7d"], ["43200", "30d"], ["perm", "∞"]];
const EMOJI = ("👑 💎 🔥 ⭐ 🌟 ✨ ⚡ 💥 🏆 🥇 🥈 🥉 🏅 🎖️ 🎗️ 🛡️ ⚔️ 🗡️ 🔨 🪄 🧠 💡 🎯 🧩 ♟️ ♛ ♚ ♜ ♝ ♞ 🐎 🦄 🐉 🦅 🦁 🐺 🦊 🐯 🐍 🦈 🐙 🦋 🐝 " +
  "😎 🤓 😈 👻 💀 🤖 👽 🥷 🧙 🧛 🦸 🤴 👸 🧑‍🚀 🧑‍💻 🎮 🎲 🎨 🎵 🎧 📸 🍀 🌈 ☀️ 🌙 🌌 🪐 🌍 ❄️ 🌊 🌋 🌸 🌹 🍉 🍕 ☕ 🍩 " +
  "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💖 ✅ ❌ ⛔ ⚠️ 🔞 💯 🆕 🆒 🆙 ♾️ ☢️ ☣️ 🔱 ⚜️ 🔰 🧪 🧬 🩸 💣 🚀 🛸 🏁 🚩 🏴‍☠️ 🇮🇷 🇦🇫 🇹🇷 🇬🇧 🇺🇸").split(" ");
const STYLES = ["solid", "gradient", "outline", "glow", "shine", "rainbow", "pulse"];

const L = () => (fa() ? "fa" : "en");
const S = () => store.get("sess");
async function A(path, params = {}) { return api.get(path, { t: S(), l: L(), ...params }, 20000); }
async function P(path, body = {}) {
  try {
    const r = await api.post(path, { t: S(), l: L(), ...body }, 20000);
    if (r.error) toast(r.error, "bad");
    return r;
  } catch { toast(t("offline"), "bad"); return { error: "offline" }; }
}
const pills = (p) => `${p.banned ? `<span class="pill bad">⛔ ${esc(p.ban_reason || "")}</span>` : ""}${p.muted ? `<span class="pill warn">🔇</span>` : ""}` +
  `${p.trusted ? `<span class="pill ok">✓</span>` : ""}${p.role && p.role !== "user" ? `<span class="role r-${p.role}">${t("role_" + p.role)}</span>` : ""}`;
const pname = (p) => nameHtml({ name: p.name, title: p.title, title_color: p.title_color, tag: p.tag });

export async function renderAdmin(view, nav, params) {
  view.innerHTML = `<div class="page"><div class="spin center"></div></div>`;
  const me = await loadMe();
  if (!me || !isStaff(me)) {
    view.innerHTML = `<div class="page"><div class="card">${t("a_denied")} <a class="btn" href="#/login?next=${encodeURIComponent("#/admin")}">${t("login")}</a></div></div>`;
    return { destroy() {} };
  }
  const owner = me.role === "owner", admin = owner || me.role === "admin";
  let tab = params.tab || store.get("admTab") || "dash";
  const X = await import("./adminx.js?v=ffa8bb0e87");
  const tabs = [["dash", "📊"], ["players", "👥"], ...(admin ? [["events", "🎉"], ["badges", "🏅"], ["boards", "🎨"], ["bots", "🤖"], ["giveall", "🎁"]] : []),
    ["tags", "🏷️"], ["modes", "🎲"], ["fair", "⚖️"], ["reports", "⚑"], ["chat", "💬"], ["games", "♟"],
    ...(owner ? [["broadcast", "📣"]] : []), ...(admin ? [["settings", "⚙️"], ["log", "📜"]] : [])];
  view.innerHTML = `<div class="page adm-page"><div class="adm-head"><h1>🛠 ${t("a_title")}</h1><span class="role r-${me.role}">${t("role_" + me.role)}</span></div>
    <div class="adm-tabs">${tabs.map(([k, i]) => `<button data-t="${k}">${i} <span>${t("a_" + (k === "dash" ? "dash" : k))}</span></button>`).join("")}</div>
    <div class="adm-body"></div></div>`;
  const body = view.querySelector(".adm-body");
  // the new tabs live in adminx.js; they get what they need from here
  const ctx = { A, P, owner, admin, pickPlayer: (cb) => pickPlayer(cb), go: (k, extra) => go(k, extra) };
  const xtab = (name) => (el, extra) => X[name](el, ctx, extra);
  const go = (k, extra) => {
    tab = k; store.set("admTab", k);
    view.querySelectorAll("[data-t]").forEach((b) => b.classList.toggle("on", b.dataset.t === k));
    body.innerHTML = `<div class="spin center"></div>`;
    ({ dash, players, tags, fair, reports, chat, games, broadcast, settings, log, events: xtab("events"), badges: xtab("badges"),
      boards: xtab("boards"), bots: xtab("bots"), giveall: xtab("giveall"), modes: xtab("modes") }[k] || dash)(body, extra)
      .catch((e) => { console.error(e); body.innerHTML = `<div class="card">${t("offline")}</div>`; });
  };
  view.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => go(b.dataset.t));

  // ───────── dashboard ─────────
  async function dash(el) {
    const r = await A("adm_overview");
    if (r.error) { el.innerHTML = `<div class="card">${esc(r.error)}</div>`; return; }
    const s = r.stats, sv = r.server;
    const tile = (v, l, c = "") => `<div class="atile ${c}"><b>${v}</b><span>${l}</span></div>`;
    el.innerHTML = `<div class="atiles">
        ${tile(r.online, t("a_online"), "g")}${tile(s.players, fa() ? "بازیکن" : "players")}${tile(s.accounts, fa() ? "حساب سایت" : "accounts")}
        ${tile(s.games_today, fa() ? "بازی امروز" : "games today")}${tile(s.games, fa() ? "کل بازی‌ها" : "games")}${tile(r.live.length, fa() ? "بازی زنده" : "live")}
        ${tile(r.searching, fa() ? "در صف" : "searching")}${tile(s.new_today, fa() ? "جدید امروز" : "new today")}${tile(s.chat_today, fa() ? "پیام امروز" : "messages today")}
        ${tile(r.flagged, t("a_flagged"), r.flagged ? "r" : "")}${tile(s.open_reports, t("a_reports"), s.open_reports ? "r" : "")}${tile(s.banned, fa() ? "محروم" : "banned")}
        ${tile(s.analysed, fa() ? "بازی بررسی‌شده" : "games checked")}${tile(s.queue, fa() ? "در صف بررسی" : "to check")}${tile(s.puzzles_solved, fa() ? "معمای حل‌شده" : "puzzles solved")}</div>
      <div class="adm-cols">
        <div class="card"><h2>${t("a_server")}</h2><div class="kv">
          <div><span>Bale</span><b>@${esc(sv.bot || "?")}</b></div><div><span>GitHub Pages</span><b dir="ltr">${esc(sv.pages || "—")}</b></div>
          <div><span>Tunnel</span><b dir="ltr">${esc(sv.public || "—")}</b></div><div><span>📧</span><b>${sv.mail ? t("a_mail_on") + " · " + esc(sv.mail_from) : t("a_mail_off")}</b></div>
          <div><span>${t("a_sf")}</span><b>${sv.stockfish ? "✓" : "✕"}</b></div><div><span>${t("a_fair")}</span><b>${esc(sv.fair_mode)} · ${sv.autoban ? "auto-ban on" : "auto-ban off"}</b></div>
          <div><span>v</span><b>${esc(sv.version)}</b></div></div>
          ${owner ? `<button class="btn sm new-link">🔑 ${t("a_new_link")}</button>` : ""}</div>
        <div class="card"><h2>${t("a_live")}</h2>${liveList(r.live)}</div>
        <div class="card"><h2>${fa() ? "تازه‌ها" : "Recently active"}</h2><div class="plist">${r.recent.map(prow).join("")}</div></div>
      </div>`;
    wirePlayers(el);
    wireLive(el);
    const nl = el.querySelector(".new-link");
    if (nl) nl.onclick = async () => {
      const x = await P("adm_owner_link");
      if (x.ot) { const link = location.href.split("#")[0] + "#/admin?ot=" + x.ot; navigator.clipboard?.writeText(link).then(() => toast(t("a_copied"), "good"), () => modal({ body: `<input class="cp-in" readonly value="${esc(link)}">` })); }
    };
  }

  function liveList(live) {
    if (!live.length) return `<div class="muted small">${t("a_nobody")}</div>`;
    return `<div class="glist">${live.map((g) => `<div class="grow wrap"><span class="gi">●</span><span class="go" dir="auto">${esc(g.mode || "")} ${esc(g.white)} – ${esc(g.black)}</span>
      <span class="gt">${esc(g.tc)}${g.rated ? " ★" : ""} · ${Math.ceil(g.plies / 2)}</span>
      <a class="btn sm" href="#/game/${esc(g.t)}" target="_blank">${t("a_watch")}</a>
      ${admin ? `${g.clock ? `<button class="btn sm" data-lv="time" data-g="${g.gid}" title="+30s">⏱+30</button>` : ""}
        <button class="btn sm" data-lv="say" data-g="${g.gid}" title="${t("x_live_say")}">📢</button>` : ""}
      ${owner ? `<button class="btn sm" data-lv="draw" data-g="${g.gid}" title="½">½</button><button class="btn sm" data-lv="white" data-g="${g.gid}" title="1-0">1-0</button>
        <button class="btn sm" data-lv="black" data-g="${g.gid}" title="0-1">0-1</button>` : ""}
      ${admin ? `<button class="btn sm danger" data-abort="${g.gid}">${t("a_abort")}</button>` : ""}</div>`).join("")}</div>
      ${admin ? `<button class="btn sm ghost lobby-clear">🧹 ${t("x_lobby_clear")}</button>` : ""}`;
  }
  function wireLive(el) {
    el.querySelectorAll("[data-abort]").forEach((b) => b.onclick = async () => {
      if (!(await confirmBox(t("a_abort") + "?", t("a_abort"), t("cancel")))) return;
      const r = await P("adm_abort", { gid: +b.dataset.abort });
      if (r.ok) { toast("✓", "good"); go(tab); }
    });
    // the owner's powers over a live game: more time, a message in its chat, end it as a draw or a win
    el.querySelectorAll("[data-lv]").forEach((b) => b.onclick = async () => {
      const act = b.dataset.lv, gid = +b.dataset.g;
      let extra = {};
      if (act === "say") { const text = prompt("📢"); if (!text) return; extra = { text }; }
      if (act === "time") extra = { seconds: 30 };
      if (["draw", "white", "black"].includes(act) && !(await confirmBox(`${b.title}?`, b.title, t("cancel")))) return;
      const r = await P("adm_live", { gid, action: act, ...extra });
      if (r.ok) toast("✓", "good");
    });
    const lc = el.querySelector(".lobby-clear");
    if (lc) lc.onclick = async () => { const r = await P("adm_lobby_clear"); if (r.ok) toast(`🧹 ${r.cleared}`, "good"); };
  }

  // ───────── players ─────────
  function prow(p) {
    return `<button class="prow" data-pid="${esc(p.pid)}"><span class="pr-n">${pname(p)}</span>
      <span class="pr-u muted small" dir="ltr">${esc(p.username ? "@" + p.username : p.bale ? "Bale" : "")}${p.email ? " · " + esc(p.email) : ""}</span>
      <span class="pr-s">${pills(p)}</span><span class="pr-e">${p.elo}</span></button>`;
  }
  function wirePlayers(el) { el.querySelectorAll(".prow").forEach((b) => b.onclick = () => openPlayer(b.dataset.pid)); }

  async function players(el) {
    el.innerHTML = `<div class="card"><div class="asearch"><input type="search" placeholder="${t("a_search")}" dir="auto"><select><option value="">${t("a_all")}</option><option value="banned">⛔</option></select></div>
      <div class="plist"></div></div>`;
    const inp = el.querySelector("input"), sel = el.querySelector("select"), list = el.querySelector(".plist");
    let timer;
    const run = async () => {
      const r = await A("adm_players", { q: inp.value, sort: sel.value });
      list.innerHTML = (r.players || []).map(prow).join("") || `<div class="muted">${t("a_nobody")}</div>`;
      wirePlayers(list);
    };
    inp.oninput = () => { clearTimeout(timer); timer = setTimeout(run, 250); };
    sel.onchange = run;
    run();
    if (params.pid) openPlayer(params.pid);
  }

  async function openPlayer(pid) {
    const r = await A("adm_player", { pid });
    if (r.error) { toast(r.error, "bad"); return; }
    const p = r.player;
    const tagsInfo = owner ? await A("adm_tags") : null;
    const box = document.createElement("div");
    box.className = "pdrawer";
    const titles = tagsInfo ? tagsInfo.titles : [];
    box.innerHTML = `<div class="pd-h">${pname(p)} ${pills(p)}</div>
      <div class="kv small"><div><span>uid</span><b dir="ltr">${p.uid}</b></div><div><span>id</span><b dir="ltr">${esc(p.pid)}</b></div>
        <div><span>${t("username")}</span><b dir="ltr">${esc(p.username || "—")}</b></div><div><span>${t("email")}</span><b dir="ltr">${esc(p.email || "—")} ${p.email ? (p.email_ok ? "✅" : "⚠️") : ""}</b></div>
        <div><span>${t("rating")}</span><b>${p.elo} (${t("peak")} ${p.peak}) · 🧩 ${p.puzzle_rating}</b></div><div><span>${t("record")}</span><b>${p.wins}/${p.losses}/${p.draws} · ${p.rated} rated</b></div>
        <div><span>⭐</span><b>${r.ach_score} · ${r.achievements.length} 🏅</b></div><div><span>⏱</span><b>${p.last_seen ? timeAgo(p.last_seen, fa()) : "—"} · ${dateText(p.created, fa())}</b></div>
        ${p.banned ? `<div><span>⛔</span><b>${esc(p.ban_reason || "")} · ${p.ban_until > 4e9 ? t("a_perm") : new Date(p.ban_until * 1000).toLocaleString()}</b></div>` : ""}
        <div><span>⚖️</span><b>${p.cheat_bans} fair-play bans</b></div></div>
      <a class="btn sm" href="${profileHref({ username: p.username, pid: p.pid })}" target="_blank">👤 ${t("profile")} ↗</a>
      ${admin ? `<div class="pd-sec"><h3>⛔ ${t("a_ban")}</h3><div class="row-f"><select class="d-ban">${DUR.map(([v, l]) => `<option value="${v}" ${v === "1440" ? "selected" : ""}>${l}</option>`).join("")}</select>
          <input class="r-ban" placeholder="${t("a_reason")}" dir="auto"><button class="btn danger sm do-ban">${t("a_ban")}</button>${p.banned ? `<button class="btn sm do-unban">${t("a_unban")}</button>` : ""}</div>
          <label class="ck"><input type="checkbox" class="ref-ban"> ${t("a_refund")}</label></div>` : ""}
      <div class="pd-sec"><h3>🔇 ${t("a_mute")}</h3><div class="row-f"><select class="d-mute">${DUR.slice(0, 6).map(([v, l]) => `<option value="${v}" ${v === "60" ? "selected" : ""}>${l}</option>`).join("")}</select>
          <input class="r-mute" placeholder="${t("a_reason")}" dir="auto"><button class="btn sm do-mute">${t("a_mute")}</button>${p.muted ? `<button class="btn sm do-unmute">${t("a_unmute")}</button>` : ""}</div></div>
      ${admin ? `<div class="pd-sec"><h3>📈 ${t("a_rating")}</h3><div class="row-f"><input class="n-elo" type="number" value="${p.elo}" min="100" max="4000"><input class="n-pz" type="number" value="${p.puzzle_rating}" min="100" max="4000"><button class="btn sm do-rating">${t("a_set")}</button></div>
          <label class="ck"><input type="checkbox" class="trust" ${p.trusted ? "checked" : ""}> ${t("a_trusted")}</label></div>` : ""}
      ${owner ? `<div class="pd-sec"><h3>👤 ${t("a_role")}</h3><div class="seg roles">${["user", "mod", "admin"].map((x) => `<button data-role="${x}" class="${p.role === x ? "on" : ""}">${x}</button>`).join("")}</div></div>
        <div class="pd-sec"><h3>🎖 ${t("a_give_title")}</h3><div class="chips">${titles.map((x) => `<button class="chip ${r.titles.includes(x.code) ? "on" : ""}" data-title="${x.code}">${titleHtml(x.code, x.color)}</button>`).join("")}</div></div>
        <div class="pd-sec"><h3>🏷 ${t("a_give_tag")}</h3><div class="chips">${tagsInfo.tags.map((x) => `<button class="chip ${r.tags.some((y) => y.id === x.id) ? "on" : ""}" data-tag="${x.id}">${tagHtml(x)}</button>`).join("") || "—"}</div></div>
        <div class="pd-sec"><h3>🎨 ${t("a_give_theme")}</h3><div class="row-f"><select class="th-sel">${tagsInfo.themes.map((x) => `<option value="${x.key}">${esc(x.name)}${r.themes.includes(x.key) ? " ✓" : ""}</option>`).join("")}</select><button class="btn sm do-theme">${t("a_give")}</button><button class="btn sm ghost do-theme-take">${t("a_take")}</button></div></div>
        <div class="pd-sec"><h3>🏅 ${t("a_give_ach")}</h3><div class="row-f"><select class="ach-sel">${tagsInfo.achievements.map((x) => `<option value="${x.code}">${esc(x.emoji)} ${esc(x.name)}${r.achievements.includes(x.code) ? " ✓" : ""}</option>`).join("")}</select>
          <button class="btn sm do-ach" data-g="1">${t("a_give")}</button><button class="btn sm ghost do-ach" data-g="0">${t("a_take")}</button></div></div>` : ""}
      ${admin && p.bale ? `<div class="pd-sec"><h3>📣 ${t("a_message")}</h3><div class="row-f"><input class="msg-in" dir="auto"><button class="btn sm do-msg">${t("a_send")}</button></div></div>` : ""}
      <div class="pd-sec"><h3>♟ ${t("a_games_list")}</h3><div class="glist">${r.games.slice(0, 12).map((g) => `<a class="grow" href="#/review/${esc(g.review)}" target="_blank"><span class="go" dir="auto">${esc(g.white_name)} – ${esc(g.black_name)}</span><span class="gt">${esc(g.result)} · ${esc(g.tc || "")}${g.rated ? " ★" : ""}</span><span class="ga muted small">${timeAgo(g.ts, fa())}</span></a>`).join("") || "—"}</div></div>
      <div class="pd-sec"><h3>⚖️ ${t("a_fair_rows")}</h3>${fairTable(r.fair)}</div>
      <div class="pd-sec"><h3>📜 ${t("a_bans")}</h3><div class="small">${r.bans.map((b) => `<div>${b.kind} · ${esc(b.reason || "")} · ${dateText(b.ts, fa())}${b.lifted ? " (lifted)" : ""}</div>`).join("") || "—"}</div></div>
      <div class="pd-sec"><h3>💬 ${t("a_msgs")}</h3><div class="small">${r.chat.map((m) => `<div class="${m.deleted ? "del" : ""}"><span class="muted">${esc(m.room)}</span> ${esc(m.text)}</div>`).join("") || "—"}</div></div>
      ${owner && p.username ? `<button class="btn sm danger do-delacc">${t("a_delete_acc")}</button>` : ""}`;
    const close = modal({ body: box, cls: "wide", buttons: [{ label: t("a_close"), cls: "ghost" }] });
    const reopen = () => { close(); setTimeout(() => openPlayer(pid), 200); };
    const q = (s) => box.querySelector(s);
    const dur = (v) => (v === "perm" ? { permanent: true } : { minutes: +v });
    q(".do-ban") && (q(".do-ban").onclick = async () => { if ((await P("adm_ban", { pid, ...dur(q(".d-ban").value), reason: q(".r-ban").value, refund: q(".ref-ban").checked })).ok) { toast("⛔", "good"); reopen(); } });
    q(".do-unban") && (q(".do-unban").onclick = async () => { if ((await P("adm_unban", { pid })).ok) reopen(); });
    q(".do-mute").onclick = async () => { if ((await P("adm_mute", { pid, ...dur(q(".d-mute").value), reason: q(".r-mute").value })).ok) { toast("🔇", "good"); reopen(); } };
    q(".do-unmute") && (q(".do-unmute").onclick = async () => { if ((await P("adm_unmute", { pid })).ok) reopen(); });
    q(".do-rating") && (q(".do-rating").onclick = async () => { if ((await P("adm_rating", { pid, elo: q(".n-elo").value, puzzle_rating: q(".n-pz").value })).ok) { toast("✓", "good"); reopen(); } });
    q(".trust") && (q(".trust").onchange = async (e) => { await P("adm_trust", { pid, trusted: e.target.checked }); });
    box.querySelectorAll("[data-role]").forEach((b) => b.onclick = async () => { if ((await P("adm_role", { pid, role: b.dataset.role })).ok) reopen(); });
    box.querySelectorAll("[data-title]").forEach((b) => b.onclick = async () => { const give = !b.classList.contains("on"); if ((await P("adm_title", { pid, code: b.dataset.title, give })).ok) b.classList.toggle("on", give); });
    box.querySelectorAll("[data-tag]").forEach((b) => b.onclick = async () => { const give = !b.classList.contains("on"); if ((await P("adm_tag_give", { pid, tag: +b.dataset.tag, give })).ok) b.classList.toggle("on", give); });
    q(".do-theme") && (q(".do-theme").onclick = async () => { if ((await P("adm_theme", { pid, theme: q(".th-sel").value })).ok) toast("🎨 ✓", "good"); });
    q(".do-theme-take") && (q(".do-theme-take").onclick = async () => { if ((await P("adm_theme_take", { pid, theme: q(".th-sel").value })).ok) toast("🎨 ↩", "good"); });
    box.querySelectorAll(".do-ach").forEach((b) => b.onclick = async () => { if ((await P("adm_achievement", { pid, code: q(".ach-sel").value, give: b.dataset.g === "1" })).ok) toast("🏅 ✓", "good"); });
    q(".do-msg") && (q(".do-msg").onclick = async () => { const x = await P("adm_message", { pid, text: q(".msg-in").value }); if (x.ok) { toast("✓", "good"); q(".msg-in").value = ""; } });
    q(".do-delacc") && (q(".do-delacc").onclick = async () => { if (await confirmBox(t("a_delete_acc") + "?", t("a_delete_acc"), t("cancel"))) { if ((await P("adm_delete_account", { pid })).ok) reopen(); } });
  }

  function fairTable(rows) {
    if (!rows || !rows.length) return `<div class="muted small">—</div>`;
    return `<table class="ftab"><tr><th>#</th><th>${t("a_score")}</th><th>${t("a_t1")}</th><th>${t("a_acc")}</th><th>loss</th><th>${t("a_blur")}</th><th>n</th><th></th></tr>
      ${rows.map((g) => `<tr class="${g.score >= 70 ? "hot" : g.score >= 45 ? "warm" : ""}"><td>${g.game_id}</td><td><b>${Math.round(g.score)}</b></td><td>${Math.round(g.t1 * 100)}%</td>
        <td>${g.acc != null ? Math.round(g.acc) : "—"}</td><td>${g.loss}</td><td>${g.blur || 0}</td><td>${g.n}</td><td><a href="#/review/${esc(g.review)}" target="_blank">${t("a_review")}</a></td></tr>`).join("")}</table>`;
  }

  // ───────── titles & tags ─────────
  async function tags(el) {
    const r = await A("adm_tags");
    if (r.error) { el.innerHTML = `<div class="card">${esc(r.error)}</div>`; return; }
    const tg = { emoji: "👑", text: "Legend", color: "#ffd700", color2: "#ff8f00", style: "shine" };
    let editing = null;
    el.innerHTML = `<div class="adm-cols">
      <div class="card tagmaker">${owner ? "" : `<div class="note">${t("a_owner_only")}</div>`}<h2 class="tm-h">✨ ${t("a_new_tag")}</h2>
        <div class="tm-prev"><div class="pv-bar"><span class="pc" data-c="wK"></span><span class="tm-line"></span><span class="rt">(1337)</span></div>
          <div class="pv-chat"><b>Pouyan</b> <span class="tm-chip"></span> <span>GG! 😄</span></div></div>
        <label class="fl"><span>${t("a_emoji")}</span><input class="tm-emoji" maxlength="16" value="${tg.emoji}"></label>
        <div class="emoji-grid">${EMOJI.map((e) => `<button data-e="${esc(e)}">${esc(e)}</button>`).join("")}</div>
        <label class="fl"><span>${t("a_text")}</span><input class="tm-text" maxlength="24" dir="auto" value="${tg.text}"></label>
        <div class="row-f"><label class="fl"><span>${t("a_color")}</span><span class="colr"><input type="color" class="tm-c1" value="${tg.color}"><input class="tm-c1h" value="${tg.color}" dir="ltr" maxlength="7"></span></label>
          <label class="fl"><span>${t("a_color2")}</span><span class="colr"><input type="color" class="tm-c2" value="${tg.color2}"><input class="tm-c2h" value="${tg.color2}" dir="ltr" maxlength="7"></span></label></div>
        <div class="fl"><span>${t("a_style")}</span><div class="seg tm-styles">${STYLES.map((s) => `<button data-s="${s}" class="${s === tg.style ? "on" : ""}">${s}</button>`).join("")}</div></div>
        <div class="row-b"><button class="btn primary tm-save" ${owner ? "" : "disabled"}>${t("a_save_tag")}</button><button class="btn ghost tm-new">+ ${t("a_new_tag")}</button></div>
      </div>
      <div class="card"><h2>🏷 Tags</h2><div class="taglist">${r.tags.map((x) => `<div class="tagrow" data-id="${x.id}">${tagHtml(x)}<span class="muted small">${x.holders.length} ${t("a_holders")}</span>
          ${owner ? `<button class="btn sm" data-edit="${x.id}">✏️</button><button class="btn sm" data-give="${x.id}">➕ ${t("a_give_to")}</button><button class="btn sm danger" data-del="${x.id}">🗑</button>` : ""}
          <div class="holders small">${x.holders.slice(0, 12).map((h) => `<a href="#/admin?tab=players&pid=${esc(h.pid)}" data-open="${esc(h.pid)}">${esc(h.name)}</a>`).join(" · ")}</div></div>`).join("") || "—"}</div></div>
      <div class="card"><h2>🎖 ${t("titles")}</h2><p class="muted small">${t("a_thresholds")}</p>
        <div class="title-list">${r.titles.map((x) => `<div class="trow">${titleHtml(x.code, x.color)}<span class="small" dir="auto">${esc(x.name)}</span>
          ${["CM", "FM", "IM", "GM", "SGM"].includes(x.code) ? `<input type="number" class="th-in" data-code="${x.code}" value="${r.thresholds[x.code] || 0}" min="0" max="4000" ${owner ? "" : "disabled"}>` : `<span></span>`}
          ${owner ? `<button class="btn sm" data-gt="${x.code}">➕</button>` : ""}<span class="holders small">${(r.title_holders[x.code] || []).slice(0, 10).map((h) => `<a data-open="${esc(h.pid)}" href="#">${esc(h.name)}</a>`).join(" · ")}</span></div>`).join("")}</div>
        ${owner ? `<button class="btn primary sm th-save">${t("a_save")}</button>` : ""}</div></div>`;
    const q = (s) => el.querySelector(s);
    const read = () => ({ emoji: q(".tm-emoji").value.trim(), text: q(".tm-text").value, color: q(".tm-c1h").value, color2: q(".tm-c2h").value, style: tg.style });
    const prev = () => {
      Object.assign(tg, read());
      q(".tm-line").innerHTML = nameHtml({ name: "Pouyan", title: "GM", title_color: "#c0392b", tag: tg, flag: "🇮🇷" });
      q(".tm-chip").innerHTML = tagHtml(tg, "sm");
    };
    const sync = (a, b) => { q(a).oninput = () => { q(b).value = q(a).value; prev(); }; q(b).oninput = () => { if (/^#[0-9a-fA-F]{6}$/.test(q(b).value)) q(a).value = q(b).value; prev(); }; };
    sync(".tm-c1", ".tm-c1h"); sync(".tm-c2", ".tm-c2h");
    q(".tm-emoji").oninput = prev; q(".tm-text").oninput = prev;
    el.querySelectorAll("[data-e]").forEach((b) => b.onclick = () => { q(".tm-emoji").value = b.dataset.e; prev(); });
    el.querySelectorAll("[data-s]").forEach((b) => b.onclick = () => { tg.style = b.dataset.s; el.querySelectorAll("[data-s]").forEach((x) => x.classList.toggle("on", x === b)); prev(); });
    const load = (x) => {
      editing = x ? x.id : null;
      q(".tm-h").textContent = (x ? "✏️ " + t("a_edit_tag") : "✨ " + t("a_new_tag"));
      const v = x || { emoji: "", text: "", color: "#ffd700", color2: "#ff8f00", style: "solid" };
      q(".tm-emoji").value = v.emoji; q(".tm-text").value = v.text; q(".tm-c1").value = q(".tm-c1h").value = v.color; q(".tm-c2").value = q(".tm-c2h").value = v.color2;
      tg.style = v.style; el.querySelectorAll("[data-s]").forEach((b) => b.classList.toggle("on", b.dataset.s === v.style)); prev();
      el.querySelector(".tagmaker").scrollIntoView({ behavior: "smooth", block: "start" });
    };
    prev();
    q(".tm-new").onclick = () => load(null);
    q(".tm-save").onclick = async () => { const x = await P("adm_tag_save", { ...read(), id: editing }); if (x.ok) { toast("🏷 ✓", "good"); go("tags"); } };
    el.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => load(r.tags.find((x) => x.id === +b.dataset.edit)));
    el.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (await confirmBox("🗑?", "🗑", t("cancel"))) { if ((await P("adm_tag_delete", { id: +b.dataset.del })).ok) go("tags"); } });
    el.querySelectorAll("[data-give]").forEach((b) => b.onclick = () => pickPlayer(async (pid) => { if ((await P("adm_tag_give", { pid, tag: +b.dataset.give, give: true })).ok) { toast("🏷 ✓", "good"); go("tags"); } }));
    el.querySelectorAll("[data-gt]").forEach((b) => b.onclick = () => pickPlayer(async (pid) => { if ((await P("adm_title", { pid, code: b.dataset.gt, give: true })).ok) { toast("🎖 ✓", "good"); go("tags"); } }));
    el.querySelectorAll("[data-open]").forEach((a) => a.onclick = (e) => { e.preventDefault(); openPlayer(a.dataset.open); });
    const ts = q(".th-save");
    if (ts) ts.onclick = async () => {
      const th = {};
      el.querySelectorAll(".th-in").forEach((i) => { th[i.dataset.code] = +i.value || 0; });
      if ((await P("adm_settings", { settings: { thresholds: th } })).ok) toast(t("saved_ok"), "good");
    };
  }

  function pickPlayer(cb) {
    const box = document.createElement("div");
    box.innerHTML = `<input type="search" class="pp-in" placeholder="${t("a_search")}" dir="auto"><div class="plist pp-list"></div>`;
    const close = modal({ title: t("a_give_to"), body: box, buttons: [{ label: t("cancel"), cls: "ghost" }] });
    const inp = box.querySelector("input"), list = box.querySelector(".pp-list");
    let timer;
    const run = async () => {
      const r = await A("adm_players", { q: inp.value });
      list.innerHTML = (r.players || []).map(prow).join("");
      list.querySelectorAll(".prow").forEach((b) => b.onclick = () => { close(); cb(b.dataset.pid); });
    };
    inp.oninput = () => { clearTimeout(timer); timer = setTimeout(run, 250); };
    run();
    setTimeout(() => inp.focus(), 60);
  }

  // ───────── fair play ─────────
  async function fair(el) {
    const r = await A("adm_fair");
    if (r.error) { el.innerHTML = `<div class="card">${esc(r.error)}</div>`; return; }
    el.innerHTML = `<div class="card"><p class="muted small">⚖️ ${esc(r.mode)} · ${r.autoban ? "auto-ban on" : "auto-ban off"} · suspicious ≥ ${Math.round(r.sus * r.factor)} · strong ≥ ${Math.round(r.strong * r.factor)}</p></div>
      ${r.players.map((x) => `<div class="card fp" data-pid="${esc(x.player.pid)}"><div class="fp-h"><button class="prow-l" data-open="${esc(x.player.pid)}">${pname(x.player)}</button>${pills(x.player)}
          <span class="muted small">${x.sus} ⚠ · max ${Math.round(x.top)} · ${t("a_t1")} ${Math.round((x.t1 || 0) * 100)}%</span></div>
        ${fairTable(x.games)}
        ${admin ? `<div class="row-b"><button class="btn sm" data-fa="clear">${t("a_clear")}</button><button class="btn sm" data-fa="recheck">${t("a_recheck")}</button>
          <button class="btn sm" data-fa="refund">♻️ refund</button><button class="btn sm danger" data-fa="ban">${t("a_cheat_ban")}</button></div>` : ""}</div>`).join("") || `<div class="card muted">${t("a_nobody")}</div>`}`;
    el.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => openPlayer(b.dataset.open));
    el.querySelectorAll("[data-fa]").forEach((b) => b.onclick = async () => {
      const pid = b.closest(".fp").dataset.pid;
      if (b.dataset.fa === "ban" && !(await confirmBox(t("a_cheat_ban") + "?", t("a_ban"), t("cancel")))) return;
      const x = await P("adm_fair", { pid, action: b.dataset.fa });
      if (x.ok) { toast("✓" + (x.refunded != null ? ` (${x.refunded})` : ""), "good"); go("fair"); }
    });
  }

  // ───────── reports ─────────
  async function reports(el, status = "open") {
    const r = await A("adm_reports", { status });
    el.innerHTML = `<div class="seg rep-s">${[["open", t("a_open")], ["closed", t("a_closed")], ["all", t("a_all")]].map(([k, l]) => `<button data-s="${k}" class="${k === status ? "on" : ""}">${l}</button>`).join("")}</div>
      ${(r.reports || []).map((x) => `<div class="card rep" data-id="${x.id}"><div class="rep-h"><span class="pill">${esc(x.kind)}</span>${x.target ? `<button class="prow-l" data-open="${esc(x.target.pid)}">${pname(x.target)}</button>${pills(x.target)}` : ""}
          <span class="muted small">${esc(x.by_name)} · ${timeAgo(x.ts, fa())}</span></div>
        ${x.reason ? `<div class="rep-r" dir="auto">${esc(x.reason)}</div>` : ""}${x.message ? `<div class="rep-m ${x.message.deleted ? "del" : ""}" dir="auto">💬 ${esc(x.message.text)}</div>` : ""}
        ${x.note ? `<div class="muted small">${esc(x.note)}</div>` : ""}
        <div class="row-b">${x.status === "open" ? `<button class="btn sm" data-st="closed">${t("a_close")}</button>` : `<button class="btn sm" data-st="open">${t("a_open")}</button>`}
          ${x.message && !x.message.deleted ? `<button class="btn sm danger" data-delm="${x.message.id}">🗑</button>` : ""}</div></div>`).join("") || `<div class="card muted">${t("a_nobody")}</div>`}`;
    el.querySelectorAll("[data-s]").forEach((b) => b.onclick = () => reports(el, b.dataset.s));
    el.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => openPlayer(b.dataset.open));
    el.querySelectorAll("[data-st]").forEach((b) => b.onclick = async () => { if ((await P("adm_report", { id: +b.closest(".rep").dataset.id, status: b.dataset.st })).ok) reports(el, status); });
    el.querySelectorAll("[data-delm]").forEach((b) => b.onclick = async () => { if ((await P("adm_chat_delete", { id: +b.dataset.delm })).ok) reports(el, status); });
  }

  // ───────── chat ─────────
  async function chat(el, room = "") {
    const r = await A("adm_chat", room ? { room } : {});
    el.innerHTML = `<div class="seg"><button data-room="" class="${room ? "" : "on"}">${t("a_all")}</button><button data-room="lobby" class="${room === "lobby" ? "on" : ""}">lobby</button></div>
      <div class="card"><div class="amsgs">${(r.messages || []).map((m) => `<div class="am ${m.deleted ? "del" : ""}"><span class="muted small">${esc(m.room)} · ${timeAgo(m.ts, fa())}</span>
        <button class="prow-l" data-open="${esc(m.pid)}"><b dir="auto">${esc(m.name)}</b></button><span dir="auto">${esc(m.text)}</span>
        ${m.deleted ? "" : `<button class="btn sm" data-del="${m.id}">🗑</button>`}</div>`).join("") || t("a_nobody")}</div></div>`;
    el.querySelectorAll("[data-room]").forEach((b) => b.onclick = () => chat(el, b.dataset.room));
    el.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => openPlayer(b.dataset.open));
    el.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if ((await P("adm_chat_delete", { id: +b.dataset.del })).ok) b.closest(".am").classList.add("del"); });
  }

  // ───────── games ─────────
  async function games(el) {
    const r = await A("adm_games");
    el.innerHTML = `<div class="adm-cols"><div class="card"><h2>${t("a_live")}</h2>${liveList(r.live)}</div>
      <div class="card"><h2>${t("a_games_list")}</h2><div class="glist">${r.recent.map((g) => `<a class="grow" href="#/review/${esc(g.review)}" target="_blank"><span class="gi">#${g.id}</span>
        <span class="go" dir="auto">${esc(g.white)} – ${esc(g.black)}</span><span class="gt">${esc(g.result)} · ${esc(g.reason || "")} · ${esc(g.tc || "")}${g.rated ? " ★" : ""}</span>
        <span class="ga muted small">${timeAgo(g.ts, fa())}</span></a>`).join("")}</div></div></div>`;
    wireLive(el);
  }

  // ───────── broadcast ─────────
  async function broadcast(el) {
    let where = "bale";
    el.innerHTML = `<div class="card"><h2>📣 ${t("a_broadcast")}</h2><p class="muted small">${t("a_bc_sub")}</p>
      <textarea class="bc-t" rows="5" maxlength="2000" dir="auto"></textarea>
      <div class="seg bc-w">${[["bale", t("a_bc_bale")], ["site", t("a_bc_site")], ["both", t("a_bc_both")]].map(([k, l]) => `<button data-w="${k}" class="${k === where ? "on" : ""}">${l}</button>`).join("")}</div>
      <button class="btn primary bc-go">${t("a_send")}</button></div>`;
    el.querySelectorAll("[data-w]").forEach((b) => b.onclick = () => { where = b.dataset.w; el.querySelectorAll("[data-w]").forEach((x) => x.classList.toggle("on", x === b)); });
    el.querySelector(".bc-go").onclick = async () => {
      const text = el.querySelector(".bc-t").value.trim();
      if (!text || !(await confirmBox(t("a_send") + "?", t("a_send"), t("cancel")))) return;
      const x = await P("adm_broadcast", { text, where });
      if (x.ok) toast(where === "site" ? t("saved_ok") : t("a_bc_sent", { n: x.queued }), "good");
    };
  }

  // ───────── settings ─────────
  async function settings(el) {
    const r = await A("adm_settings");
    if (r.error) { el.innerHTML = `<div class="card">${esc(r.error)}</div>`; return; }
    const s = r.settings;
    el.innerHTML = `<div class="card set-adm">${owner ? "" : `<div class="note">${t("a_owner_only")}</div>`}
      <label class="fl"><span>${t("a_banner")}</span><input class="s-banner" value="${esc(s.banner || "")}" dir="auto" maxlength="300"></label>
      <label class="ck"><input type="checkbox" class="s-chat" ${s.chat_off ? "checked" : ""}> ${t("a_chat_off")}</label>
      <label class="ck"><input type="checkbox" class="s-sign" ${s.signups_closed ? "checked" : ""}> ${t("a_signups")}</label>
      <div class="fl"><span>${t("a_fair_mode")}</span><div class="seg s-mode">${["off", "low", "normal", "high"].map((m) => `<button data-m="${m}" class="${s.fair_mode === m ? "on" : ""}">${t("a_" + m)}</button>`).join("")}</div></div>
      <label class="ck"><input type="checkbox" class="s-auto" ${s.fair_autoban ? "checked" : ""}> ${t("a_autoban")}</label>
      <p class="small">${r.mail ? t("a_mail_on") : t("a_mail_off")}</p>
      <button class="btn primary s-save" ${owner ? "" : "disabled"}>${t("a_save")}</button></div>`;
    let mode = s.fair_mode;
    el.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { mode = b.dataset.m; el.querySelectorAll("[data-m]").forEach((x) => x.classList.toggle("on", x === b)); });
    el.querySelector(".s-save").onclick = async () => {
      const x = await P("adm_settings", { settings: { banner: el.querySelector(".s-banner").value, chat_off: el.querySelector(".s-chat").checked,
        signups_closed: el.querySelector(".s-sign").checked, fair_mode: mode, fair_autoban: el.querySelector(".s-auto").checked } });
      if (x.ok) toast(t("saved_ok"), "good");
    };
  }

  // ───────── log ─────────
  async function log(el) {
    const r = await A("adm_audit");
    el.innerHTML = `<div class="card"><table class="ftab log">${(r.audit || []).map((a) => `<tr><td class="muted small">${timeAgo(a.ts, fa())}</td><td><b>${esc(a.by)}</b></td><td>${esc(a.action)}</td><td dir="auto">${esc(a.target)}</td><td class="small" dir="auto">${esc(a.detail)}</td></tr>`).join("") || `<tr><td>${t("a_nobody")}</td></tr>`}</table></div>`;
  }

  go(tab);
  return { destroy() {} };
}
export const V = "ffa8bb0e87";  // the site version this file belongs to (main.js reloads the page after an update)
