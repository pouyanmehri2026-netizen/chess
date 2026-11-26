// #/modes — every game mode (King of the Hill, Atomic, Crazyhouse, Fog of War, Double Move…), the community's
// modes, the Mode Creator, and one Play dialog for all of them: against a bot (any bot, also the Bot Creator's),
// online (an open challenge everyone can join), or a friend (invite link).
import * as api from "./api.js?v=0c23cd7a0c";
import { t, fa, extend } from "./i18n.js?v=0c23cd7a0c";
import "./i18n3.js?v=0c23cd7a0c";
import { esc, toast, store, modal, confirmBox, titleHtml } from "./util.js?v=0c23cd7a0c";
import { loadBots, botName } from "./local.js?v=0c23cd7a0c";

extend({
  modes_title: ["Game modes", "حالت‌های بازی"],
  modes_sub: ["Weird, wild and wonderful ways to play — against bots, online, or with a friend. Make your own!",
    "روش‌های عجیب و باحال بازی — با ربات، آنلاین یا با دوست. حالت خودت را بساز!"],
  create_mode: ["Create a mode", "ساخت حالت"], featured: ["Featured", "ویژه"], all_modes: ["All modes", "همه حالت‌ها"],
  start_positions: ["Starting positions", "وضعیت‌های شروع"], community: ["Community modes", "حالت‌های کاربران"],
  top: ["Top", "برتر"], newest: ["New", "جدید"], my_modes: ["My modes", "حالت‌های من"], plays: ["plays", "بازی"],
  by_x: ["by {name}", "از {name}"], play_mode: ["Play", "بازی"], share: ["Share", "اشتراک"], delete: ["Delete", "حذف"],
  edit: ["Edit", "ویرایش"], nothing_yet: ["Nothing here yet.", "هنوز چیزی نیست."],
  vs_bot: ["vs a bot", "با ربات"], online: ["Online", "آنلاین"], friend: ["Friend", "دوست"],
  pick_bot: ["Bot", "ربات"], color_w: ["White", "سفید"], color_b: ["Black", "سیاه"], color_r: ["Random", "تصادفی"],
  play_now: ["Play now", "بازی کن"], seek_posted: ["Challenge posted — waiting for someone to join…", "چالش ثبت شد — منتظر یک حریف…"],
  login_first: ["Log in (or open the site from Bale) to play.", "برای بازی وارد شو (یا سایت را از بله باز کن)."],
  // creator
  mc_title: ["Mode Creator", "سازنده حالت"], mc_name: ["Name", "نام"], mc_desc: ["Description", "توضیح"],
  mc_core: ["Base rules", "قوانین پایه"], mc_start: ["Start position", "وضعیت شروع"], mc_win: ["Extra ways to win", "راه‌های دیگر برد"],
  mc_other: ["Twists", "پیچش‌ها"], mc_preview: ["Rules", "قوانین"], mc_save: ["Save & share", "ذخیره و اشتراک"],
  mc_public: ["Show it in the community list", "در فهرست کاربران نمایش داده شود"], mc_saved: ["Saved! Link copied.", "ذخیره شد! لینک کپی شد."],
  mc_fen: ["Custom position (FEN)", "وضعیت سفارشی (FEN)"], mc_open_editor: ["Open the Position Editor", "باز کردن ویرایشگر وضعیت"],
  core_classic: ["Classic", "کلاسیک"], core_atomic: ["Atomic 💥", "اتمی 💥"], core_antichess: ["Antichess 🙃", "ضد شطرنج 🙃"],
  core_crazyhouse: ["Crazyhouse 🪂", "خانه دیوانه 🪂"], core_horde: ["Horde 🧟", "هجوم 🧟"], core_racing: ["Racing Kings 🏁", "مسابقه شاه‌ها 🏁"],
  st_standard: ["Normal", "معمولی"], st_960: ["Chess960 🎲", "شطرنج ۹۶۰ 🎲"], st_shuffle: ["Random armies 🔀", "چیدمان تصادفی 🔀"],
  st_fen: ["Custom (FEN) 🧩", "سفارشی (FEN) 🧩"],
  w_hill: ["👑 King of the Hill — reach the center", "👑 شاه تپه — به مرکز برس"], w_checks: ["✚ Checks to win", "✚ تعداد کیش برای برد"],
  w_race: ["🏁 King race — reach the far side", "🏁 مسابقه شاه — به آن طرف برس"], w_wipe: ["🧹 Annihilation — capture everything", "🧹 نابودی — همه را بزن"],
  w_promote: ["⭐ First to promote wins", "⭐ اولین ارتقا برنده است"], o_castling: ["🏰 Castling allowed", "🏰 قلعه مجاز"],
  o_double: ["⚡ Double Move — two moves per turn", "⚡ حرکت دوبل — هر نوبت دو حرکت"], o_fog: ["🌫️ Fog of War — see only what you attack", "🌫️ مه جنگ — فقط چیزی را که تهدید می‌کنی ببین"],
  none_opt: ["Off", "خاموش"],
});

const L = () => (fa() ? "fa" : "en");
const ALLOW = {
  classic: ["start", "hill", "checks", "race", "wipe", "promote", "castling", "double", "fog"],
  atomic: ["start", "hill", "checks", "race", "promote", "castling", "fog"],
  crazyhouse: ["start", "hill", "checks", "race", "promote", "castling", "fog"],
  antichess: ["start"], horde: ["fog", "castling"], racing: [],
};
const TCS = ["none", "1+0", "3+2", "5+0", "10+0", "15+10"];
const ONLINE_TCS = ["1+0", "2+1", "3+0", "3+2", "5+0", "10+0", "15+10", "30+0"];
const EMOJIS = "🧪 🎲 👑 💥 🌫️ ⚡ 🙃 🪂 🧟 🏁 ♞ ♛ 🐉 🦄 🔥 ❄️ 🌀 🎯 🧠 👻 🤡 🍕 🚀 🌈 🧲 🕳️ 🪄 ⚔️ 🛡️ 🏰".split(" ");

let DATA = null;
async function loadModes(kind = "top") {
  const params = { l: L(), kind };
  if (api.auth()) params.t = api.auth();
  DATA = await api.get("pub/modes", params, 15000);
  return DATA;
}

export async function customBots() {
  try {
    const r = await api.get("pub/bots", { l: L(), ...(api.auth() ? { t: api.auth() } : {}) }, 9000);
    return r.bots || [];
  } catch { return []; }
}

function rulesHtml(rules) {
  return `<ul class="mrules">${(rules || []).map((r) => `<li dir="auto">${esc(r)}</li>`).join("")}</ul>`;
}

function modeCard(m, { community = false } = {}) {
  return `<div class="mcard${m.featured ? " feat" : ""}" data-key="${esc(m.key)}">
    <div class="mc-top"><span class="mc-e">${esc(m.emoji || "🎲")}</span><div class="mc-n"><b dir="auto">${esc(m.name)}</b>
      ${community && m.by ? `<span class="muted small">${t("by_x", { name: `${titleHtml(m.by.title, m.by.title_color)}${esc(m.by.name || "?")}` })}</span>` : ""}</div>
      ${community ? `<button class="like${m.liked ? " on" : ""}" data-like="${m.id}" title="♥">♥ <span>${m.likes || 0}</span></button>` : ""}</div>
    ${m.desc ? `<p class="mc-d" dir="auto">${esc(m.desc)}</p>` : ""}${rulesHtml(m.rules)}
    <div class="mc-b"><button class="btn primary sm" data-play="${esc(m.key)}">▶ ${t("play_mode")}</button>
      ${community ? `<span class="muted small">${m.plays || 0} ${t("plays")}</span><button class="btn ghost sm" data-share="${esc(m.key)}">🔗 ${t("share")}</button>` : ""}
      ${m.mine ? `<button class="btn ghost sm" data-edit="${m.id}">✏️</button><button class="btn ghost sm danger" data-del="${m.id}">🗑</button>` : ""}</div></div>`;
}

export async function renderModes(view, nav, params = {}) {
  let alive = true;
  view.innerHTML = `<div class="page modes-page"><div class="spin center"></div></div>`;
  try { await loadModes(params.kind || "top"); } catch { view.innerHTML = `<div class="page"><div class="card">${t("offline")}</div></div>`; return { destroy() {} }; }
  if (!alive) return { destroy() {} };
  let kind = params.kind || "top";
  const draw = () => {
    const d = DATA;
    const feat = d.builtin.filter((m) => m.featured);
    view.innerHTML = `<div class="page modes-page">
      <div class="page-h"><h1>🎲 ${t("modes_title")}</h1><p class="muted">${t("modes_sub")}</p>
        <div class="row-b"><button class="btn primary mk-new">➕ ${t("create_mode")}</button><a class="btn" href="#/editor">🧩 ${t("editor")}</a></div></div>
      ${d.event && d.event.mode ? `<div class="ev-mode card">🎉 <b>${esc(d.event.title || "")}</b> · ${esc(d.event.mode.emoji)} ${esc(d.event.mode.name)}
        <button class="btn primary sm" data-play="${esc(d.event.mode.key)}">▶ ${t("play_mode")}</button></div>` : ""}
      <h2>⭐ ${t("featured")}</h2><div class="mgrid">${feat.map((m) => modeCard(m)).join("")}</div>
      <h2>🎲 ${t("all_modes")}</h2><div class="mgrid">${d.builtin.filter((m) => !m.featured).map((m) => modeCard(m)).join("")}</div>
      <h2>🧩 ${t("start_positions")}</h2><div class="chips presets">${d.presets.map((p) => `<button class="chip" data-preset="${esc(p.key)}">${esc(p.emoji)} ${esc(p.name)}</button>`).join("")}</div>
      <h2>🌍 ${t("community")}</h2><div class="seg ckind">${[["top", t("top")], ["new", t("newest")], ["featured", t("featured")]]
        .map(([k, l]) => `<button data-kind="${k}" class="${kind === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="mgrid">${d.community.map((m) => modeCard(m, { community: true })).join("") || `<p class="muted">${t("nothing_yet")}</p>`}</div>
      <div class="mine-box"></div></div>`;
    wire(view);
    if (api.auth()) drawMine();
  };
  const all = () => [...DATA.builtin, ...DATA.community, ...(DATA.mine || [])];
  const refOf = (key) => {
    const m = all().find((x) => x.key === key);
    return { ref: key, mode: m };
  };
  function wire(root) {
    root.querySelector(".mk-new") && (root.querySelector(".mk-new").onclick = () => creator(nav));
    root.querySelectorAll("[data-play]").forEach((b) => b.onclick = () => { const { ref, mode } = refOf(b.dataset.play); playDialog(nav, ref, mode); });
    root.querySelectorAll("[data-preset]").forEach((b) => b.onclick = () => {
      const p = DATA.presets.find((x) => x.key === b.dataset.preset);
      playDialog(nav, { spec: { core: "classic", start: p.key }, name: p.name, emoji: p.emoji }, { name: p.name, emoji: p.emoji, rules: [] });
    });
    root.querySelectorAll("[data-kind]").forEach((b) => b.onclick = async () => { kind = b.dataset.kind; await loadModes(kind); draw(); });
    root.querySelectorAll("[data-like]").forEach((b) => b.onclick = async () => {
      if (!api.auth()) { toast(t("login_first")); return; }
      const r = await api.post("mode_like", { t: api.auth(), id: +b.dataset.like });
      if (r.ok) { b.classList.toggle("on", r.liked); b.querySelector("span").textContent = r.likes; }
    });
    root.querySelectorAll("[data-share]").forEach((b) => b.onclick = () => shareLink(`#/mode/${b.dataset.share}`));
    root.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!(await confirmBox(t("delete") + "?", t("delete"), t("cancel")))) return;
      const r = await api.post("mode_delete", { t: api.auth(), id: +b.dataset.del });
      if (r.ok) { await loadModes(kind); draw(); }
    });
    root.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => {
      const m = all().find((x) => String(x.id) === b.dataset.edit);
      if (m) creator(nav, m);
    });
  }
  async function drawMine() {
    try {
      const r = await api.get("my_modes", { t: api.auth(), l: L() });
      if (!alive || !r.modes) return;
      DATA.mine = r.modes;
      const box = view.querySelector(".mine-box");
      if (!box || !r.modes.length) return;
      box.innerHTML = `<h2>🛠 ${t("my_modes")}</h2><div class="mgrid">${r.modes.map((m) => modeCard(m, { community: true })).join("")}</div>`;
      wire(box);
    } catch { /* offline */ }
  }
  draw();
  // a shared link: #/mode/m12 — open its card; ?play=koth — the event's mode
  if (params.id) {
    try {
      const r = await api.get("pub/mode", { id: params.id, l: L() });
      if (r.mode) playDialog(nav, r.mode.key, r.mode); else toast(r.error || "?", "bad");
    } catch { toast(t("offline"), "bad"); }
  } else if (params.play) {
    const { ref, mode } = refOf(params.play);
    playDialog(nav, ref, mode);
  } else if (params.create) creator(nav, null, params.fen ? decodeURIComponent(params.fen) : null);
  return { destroy() { alive = false; } };
}

function shareLink(hash) {
  const url = location.href.split("#")[0] + hash;
  navigator.clipboard?.writeText(url).then(() => toast(t("copied"), "good"), () => toast(url));
}

// ───────── one dialog to play any mode ─────────
// ref: a built-in key, "m<id>", or {spec, name, emoji}; mode: what to show (name, emoji, rules)
export async function playDialog(nav, ref, mode = {}, { fen = null } = {}) {
  const u = api.auth();
  const pick = store.get("modePick", { vs: "bot", level: 3, color: "r", tc: "none", otc: "5+0" });
  const builtin = await loadBots().catch(() => []);
  const custom = await customBots();
  const spec = (mode && mode.spec) || (ref && ref.spec) || null;
  const plain = !spec || (spec.core === "classic" && !spec.hill && !spec.checks && !spec.race && !spec.wipe && !spec.promote && !spec.double && !spec.fog);
  const botOpts = [
    [t("club"), builtin.filter((b) => b.group === "club").map((b) => [b.level, `${botName(b)} · ${b.elo}`])],
    [t("engines"), builtin.filter((b) => b.group !== "club").map((b) => [b.level, `${botName(b)} · ${b.elo}`])],
    [t("my_bots"), custom.filter((b) => b.kind !== "ai").map((b) => [b.level, `${b.emoji} ${b.name} · ${b.inf ? "∞" : b.elo}`])],
    ...(plain ? [[t("ai_bots"), custom.filter((b) => b.kind === "ai").map((b) => [b.level, `${b.emoji} ${b.name} · 🧠 ${b.model}`])]] : []),
  ].filter(([, list]) => list.length);
  const box = document.createElement("div");
  box.className = "pdlg";
  box.innerHTML = `<div class="pd-mode"><span class="mc-e">${esc(mode.emoji || "🎲")}</span><b dir="auto">${esc(mode.name || t("standard"))}</b></div>
    ${rulesHtml(mode.rules)}${fen ? `<div class="muted small" dir="ltr">${esc(fen)}</div>` : ""}
    <div class="seg pd-vs">${[["bot", "🤖 " + t("vs_bot")], ["online", "🌍 " + t("online")], ["friend", "🤝 " + t("friend")]]
      .map(([k, l]) => `<button data-vs="${k}">${l}</button>`).join("")}</div>
    <div class="pd-bot"><label class="fl"><span>${t("pick_bot")}</span><select class="pd-level">${botOpts.map(([g, list]) =>
      `<optgroup label="${esc(g)}">${list.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</optgroup>`).join("")}</select></label></div>
    <div class="pd-color"><div class="bs-label">${t("choose_color")}</div><div class="seg">${["w", "r", "b"].map((c) => `<button data-color="${c}">${{ w: "♔", r: "🎲", b: "♚" }[c]} ${t("color_" + c)}</button>`).join("")}</div></div>
    <div class="pd-tc"><div class="bs-label">${t("choose_tc")}</div><div class="seg tcs"></div></div>
    <p class="muted small">ℹ️ ${t("casual_note")}</p>`;
  const set = () => {
    box.querySelectorAll("[data-vs]").forEach((b) => b.classList.toggle("on", b.dataset.vs === pick.vs));
    box.querySelectorAll("[data-color]").forEach((b) => b.classList.toggle("on", b.dataset.color === pick.color));
    box.querySelector(".pd-bot").hidden = pick.vs !== "bot";
    box.querySelector(".pd-color").hidden = pick.vs === "online";
    const list = pick.vs === "bot" ? TCS : ONLINE_TCS;
    const cur = pick.vs === "bot" ? pick.tc : pick.otc;
    box.querySelector(".tcs").innerHTML = list.map((c) => `<button data-tc="${c}" class="${c === cur ? "on" : ""}">${c === "none" ? "♾" : c}</button>`).join("");
    box.querySelectorAll("[data-tc]").forEach((b) => b.onclick = () => { if (pick.vs === "bot") pick.tc = b.dataset.tc; else pick.otc = b.dataset.tc; set(); });
  };
  box.querySelectorAll("[data-vs]").forEach((b) => b.onclick = () => { pick.vs = b.dataset.vs; set(); });
  box.querySelectorAll("[data-color]").forEach((b) => b.onclick = () => { pick.color = b.dataset.color; set(); });
  const sel = box.querySelector(".pd-level");
  if ([...sel.options].some((o) => +o.value === pick.level)) sel.value = pick.level;
  sel.onchange = () => { pick.level = +sel.value; };
  set();
  modal({ title: `▶ ${t("play_mode")}`, body: box, cls: "wide", buttons: [
    { label: t("cancel"), cls: "ghost" },
    { label: t("play_now"), cls: "primary", onClick: async () => {
      if (!u) { toast(t("login_first")); nav("#/login?mode=signup"); return; }
      pick.level = +sel.value;
      store.set("modePick", pick);
      return go();
    } },
  ] });

  async function go() {
    const modeRef = typeof ref === "string" ? ref : JSON.stringify(ref);
    try {
      if (pick.vs === "bot") {
        const r = await api.post("mode_bot", { t: u, mode: modeRef, level: pick.level, color: pick.color === "r" ? "" : pick.color,
          tc: pick.tc, l: L() });
        if (r.t) { nav(`#/game/${r.t}`); return true; }
        toast(r.error || t("offline"), "bad");
        return false;
      }
      if (pick.vs === "online") {
        const r = await api.post("queue", { t: u, tc: pick.otc, mode: modeRef, l: L() });
        if (r.t) { nav(`#/game/${r.t}`); return true; }
        if (r.error) { toast(r.error, "bad"); return false; }
        toast(t("seek_posted"), "good");
        nav("#/play");
        return true;
      }
      const r = await api.post("invite", { t: u, tc: pick.otc, mode: modeRef, color: pick.color, rated: false, l: L() });
      if (!r.code) { toast(r.error || t("offline"), "bad"); return false; }
      inviteModal(r);
      return true;
    } catch { toast(t("offline"), "bad"); return false; }
  }
}

export function inviteModal(r) {
  const links = [r.web && [t("invite_web"), r.web], r.link && [t("invite_bale"), r.link]].filter(Boolean);
  modal({ title: "🤝 " + t("invite_ready"), body: `<p class="muted small">${t("invite_share")}</p>` + links.map(([l, url], i) =>
    `<div class="bs-label">${esc(l)}</div><div class="share"><input readonly value="${esc(url)}" dir="ltr"><button class="btn cp" data-i="${i}">${t("copy")}</button></div>`).join(""),
  buttons: [{ label: "OK", cls: "primary" }] });
  document.querySelectorAll(".share .cp").forEach((b) => b.onclick = () => navigator.clipboard?.writeText(links[+b.dataset.i][1]).then(() => toast(t("copied"), "good")));
}

// ───────── Mode Creator ─────────
export function creator(nav, edit = null, fen = null) {
  const s = edit && edit.spec ? { ...edit.spec } : { core: "classic", start: fen ? "fen" : "standard", fen: fen || "", hill: false, checks: 0,
    race: false, wipe: false, promote: false, castling: true, double: false, fog: false };
  const meta = { name: edit ? edit.name : "", emoji: edit ? edit.emoji : "🧪", desc: edit ? edit.desc || "" : "", public: edit ? edit.public !== false : true };
  const presets = (DATA && DATA.presets) || [];
  const box = document.createElement("div");
  box.className = "mcreator";
  const draw = () => {
    const ok = ALLOW[s.core] || [];
    const has = (k) => ok.includes(k);
    const starts = [["standard", t("st_standard")], ["960", t("st_960")], ["shuffle", t("st_shuffle")],
      ...presets.map((p) => [p.key, `${p.emoji} ${p.name}`]), ["fen", t("st_fen")]];
    box.innerHTML = `
      <div class="row-f"><label class="fl"><span>${t("mc_name")}</span><input class="mc-name" maxlength="32" dir="auto" value="${esc(meta.name)}"></label>
        <label class="fl sm"><span>Emoji</span><input class="mc-emoji" maxlength="8" value="${esc(meta.emoji)}"></label></div>
      <div class="emoji-row">${EMOJIS.map((e) => `<button data-e="${e}">${e}</button>`).join("")}</div>
      <label class="fl"><span>${t("mc_desc")}</span><input class="mc-desc" maxlength="200" dir="auto" value="${esc(meta.desc)}"></label>
      <div class="bs-label">${t("mc_core")}</div>
      <div class="seg wrap cores">${Object.keys(ALLOW).map((c) => `<button data-core="${c}" class="${s.core === c ? "on" : ""}">${t("core_" + c)}</button>`).join("")}</div>
      ${has("start") ? `<div class="bs-label">${t("mc_start")}</div><div class="chips starts">${starts.map(([k, l]) =>
        `<button class="chip${s.start === k ? " on" : ""}" data-start="${esc(k)}">${esc(l)}</button>`).join("")}</div>
        ${s.start === "fen" ? `<div class="row-f"><input class="mc-fen" dir="ltr" placeholder="FEN" value="${esc(s.fen || "")}">
          <button class="btn sm mc-ed">🧩 ${t("mc_open_editor")}</button></div>` : ""}` : ""}
      ${["hill", "checks", "race", "wipe", "promote"].some(has) ? `<div class="bs-label">${t("mc_win")}</div><div class="opts">
        ${has("hill") ? `<label class="ck"><input type="checkbox" data-k="hill" ${s.hill ? "checked" : ""}> ${t("w_hill")}</label>` : ""}
        ${has("checks") ? `<div class="ckrow">${t("w_checks")}: <div class="seg mini">${[0, 1, 2, 3, 5].map((n) =>
          `<button data-checks="${n}" class="${(s.checks || 0) === n ? "on" : ""}">${n === 0 ? t("none_opt") : n}</button>`).join("")}</div></div>` : ""}
        ${has("race") ? `<label class="ck"><input type="checkbox" data-k="race" ${s.race ? "checked" : ""}> ${t("w_race")}</label>` : ""}
        ${has("wipe") ? `<label class="ck"><input type="checkbox" data-k="wipe" ${s.wipe ? "checked" : ""}> ${t("w_wipe")}</label>` : ""}
        ${has("promote") ? `<label class="ck"><input type="checkbox" data-k="promote" ${s.promote ? "checked" : ""}> ${t("w_promote")}</label>` : ""}</div>` : ""}
      ${["castling", "double", "fog"].some(has) ? `<div class="bs-label">${t("mc_other")}</div><div class="opts">
        ${has("castling") ? `<label class="ck"><input type="checkbox" data-k="castling" ${s.castling !== false ? "checked" : ""}> ${t("o_castling")}</label>` : ""}
        ${has("double") ? `<label class="ck"><input type="checkbox" data-k="double" ${s.double ? "checked" : ""}> ${t("o_double")}</label>` : ""}
        ${has("fog") ? `<label class="ck"><input type="checkbox" data-k="fog" ${s.fog ? "checked" : ""}> ${t("o_fog")}</label>` : ""}</div>` : ""}
      <label class="ck"><input type="checkbox" class="mc-pub" ${meta.public ? "checked" : ""}> ${t("mc_public")}</label>`;
    const keep = () => {
      meta.name = box.querySelector(".mc-name").value;
      meta.emoji = box.querySelector(".mc-emoji").value;
      meta.desc = box.querySelector(".mc-desc").value;
      meta.public = box.querySelector(".mc-pub").checked;
      const f = box.querySelector(".mc-fen");
      if (f) s.fen = f.value.trim();
    };
    box.querySelectorAll("[data-e]").forEach((b) => b.onclick = () => { keep(); meta.emoji = b.dataset.e; draw(); });
    box.querySelectorAll("[data-core]").forEach((b) => b.onclick = () => { keep(); s.core = b.dataset.core; draw(); });
    box.querySelectorAll("[data-start]").forEach((b) => b.onclick = () => { keep(); s.start = b.dataset.start; draw(); });
    box.querySelectorAll("[data-checks]").forEach((b) => b.onclick = () => { keep(); s.checks = +b.dataset.checks; draw(); });
    box.querySelectorAll("input[data-k]").forEach((x) => x.onchange = () => { keep(); s[x.dataset.k] = x.checked; draw(); });
    const ed = box.querySelector(".mc-ed");
    if (ed) ed.onclick = () => { keep(); store.set("creatorDraft", { s, meta }); close(); nav(`#/editor?for=creator${s.fen ? "&fen=" + encodeURIComponent(s.fen) : ""}`); };
    box._keep = keep;
  };
  const draft = !edit && !fen && store.get("creatorDraft");
  if (draft && draft.s) { Object.assign(s, draft.s); Object.assign(meta, draft.meta || {}); if (fen) { s.start = "fen"; s.fen = fen; } }
  store.del("creatorDraft");
  draw();
  const spec = () => { box._keep(); const out = { ...s }; if (out.start !== "fen") delete out.fen; return out; };
  const close = modal({ title: `🛠 ${t("mc_title")}`, body: box, cls: "wide", buttons: [
    { label: t("cancel"), cls: "ghost" },
    { label: "▶ " + t("play_now"), onClick: () => { const sp = spec(); playDialog(nav, { spec: sp, name: meta.name || t("create_mode"), emoji: meta.emoji },
      { name: meta.name || t("create_mode"), emoji: meta.emoji, rules: [], spec: sp }); } },
    { label: "💾 " + t("mc_save"), cls: "primary", onClick: async () => {
      if (!api.auth()) { toast(t("login_first")); return false; }
      const sp = spec();
      try {
        const r = await api.post("mode_save", { t: api.auth(), id: edit ? edit.id : undefined, name: meta.name, emoji: meta.emoji,
          desc: meta.desc, spec: sp, public: meta.public, l: L() });
        if (r.error) { toast(r.error, "bad"); return false; }
        shareLink(`#/mode/${r.key}`);
        toast(t("mc_saved"), "good");
        nav(`#/modes?kind=new&t=${Date.now()}`);
        return true;
      } catch { toast(t("offline"), "bad"); return false; }
    } },
  ] });
}

export const V = "0c23cd7a0c";
