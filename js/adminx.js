// Admin panel, part 2: 🎉 Events ("admin abuse"), 🏅 Badges (every badge, the Exotic category, "how to get it" rules),
// 🎨 Board Designer, 🤖 Bots & AI models (ArvanCloud, OpenAI, Gemini…), 🎁 Give to everyone, 🎲 community modes.
import { t, fa, extend } from "./i18n.js?v=ffa8bb0e87";
import "./i18n3.js?v=ffa8bb0e87";
import { esc, toast, modal, confirmBox, timeAgo } from "./util.js?v=ffa8bb0e87";

extend({
  a_events: ["Events", "رویدادها"], a_badges: ["Badges", "نشان‌ها"], a_boards: ["Boards", "صفحه‌ها"], a_bots: ["Bots & AI", "ربات و هوش مصنوعی"],
  a_giveall: ["Give to all", "هدیه به همه"], a_modes: ["Modes", "حالت‌ها"],
  x_mname: ["Display name", "نام نمایشی"], by_x: ["by {name}", "از {name}"],
  // events
  x_ev_now: ["Running now", "در حال اجرا"], x_ev_none: ["No event is on.", "رویدادی در جریان نیست."], x_ev_stop: ["Stop", "توقف"],
  x_ev_ext: ["+15 min", "+۱۵ دقیقه"], x_ev_presets: ["One-tap events", "رویدادهای آماده"], x_ev_custom: ["Build your own event", "ساخت رویداد دلخواه"],
  x_ev_start: ["Start event", "شروع رویداد"], x_minutes: ["Minutes", "دقیقه"], x_title_en: ["Title (English)", "عنوان (انگلیسی)"],
  x_title_fa: ["Title (Persian)", "عنوان (فارسی)"], x_msg_en: ["Message (English)", "پیام (انگلیسی)"], x_msg_fa: ["Message (Persian)", "پیام (فارسی)"],
  x_elo_mult: ["Rating gains ×", "ضریب امتیاز ×"], x_no_loss: ["Nobody loses rating", "کسی امتیاز از دست ندهد"],
  x_free: ["Every board free for everyone", "همه صفحه‌ها برای همه رایگان"], x_pz_mult: ["Puzzle rating ×", "ضریب امتیاز معما ×"],
  x_badge: ["Badge for everyone who shows up", "نشان برای هر کسی که بیاید"], x_mode: ["Featured game mode", "حالت بازی ویژه"],
  x_fx: ["Screen effect", "افکت صفحه"], x_fx_emoji: ["Effect emoji", "ایموجی افکت"], x_bale: ["Also announce it in Bale (to every player)", "در بله هم اعلام شود (برای همه)"],
  // badges
  x_new_badge: ["New exotic badge", "نشان اگزوتیک جدید"], x_search: ["Search…", "جستجو…"], x_custom: ["Custom", "سفارشی"],
  uk_rating: ["Rating at least", "ریتینگ حداقل"], uk_wins: ["Wins", "تعداد برد"], uk_streak: ["Best win streak", "بهترین برد پشت‌سرهم"],
  uk_ach: ["Badges earned", "تعداد نشان‌ها"], uk_puzzles: ["Puzzles solved", "معمای حل‌شده"], uk_games: ["Games played", "تعداد بازی"],
  uk_modes: ["Different modes played", "حالت‌های مختلفِ بازی‌شده"], uk_modewins: ["Different modes won", "حالت‌های مختلفِ بُرده"],
  uk_badge: ["Has the badge", "داشتن نشان"], uk_title: ["Has a title", "داشتن عنوان"], uk_role: ["Staff role", "نقش کادر"],
  uk_botwins: ["Wins vs bots", "برد مقابل ربات"], uk_aiwins: ["Wins vs AI bots", "برد مقابل ربات هوش مصنوعی"], uk_gift: ["Only as a gift", "فقط هدیه"],
  pat_none: ["none", "هیچ"], pat_grain: ["grain", "دانه‌ای"], pat_grid: ["grid", "شطرنجی"], pat_stars: ["stars", "ستاره"], pat_stripes: ["stripes", "راه‌راه"],
  pat_dots: ["dots", "خال‌خالی"], pat_checks: ["checks", "چهارخانه"], pat_glass: ["glass", "شیشه"], pat_scan: ["scan lines", "خط اسکن"], pat_waves: ["waves", "موج"],
  pat_shine: ["shine", "درخشش"], pat_gradient: ["gradient", "گرادیان"],
  an_none: ["none", "هیچ"], an_hue: ["colour cycle", "چرخش رنگ"], an_hue_fast: ["fast colour cycle", "چرخش رنگ سریع"], an_aurora: ["aurora", "شفق"],
  an_matrix: ["matrix rain", "باران ماتریکس"], an_shine: ["shine sweep", "برق"], an_pulse: ["pulse", "تپش"],
  fx_none: ["none", "هیچ"], fx_glow: ["glow", "درخشش"], fx_neon: ["neon", "نئون"], fx_shadow: ["shadow", "سایه"], fx_rainbow: ["rainbow", "رنگین‌کمان"],
  fx_ghost: ["ghost", "روح"], fx_gold: ["gold", "طلایی"], fx_ice: ["ice", "یخی"],
  x_calls: ["{n} calls", "{n} درخواست"],
  x_no_modes: ["No community modes yet — players make them in Modes → Mode Creator, and they show up here.", "هنوز حالتی ساخته نشده — بازیکن‌ها در «حالت‌ها ← سازنده حالت» می‌سازند و این‌جا نشان داده می‌شود."],
  x_builtin: ["Built-in", "داخلی"],x_off: ["Switched off", "خاموش"], x_holders: ["holders", "دارنده"], x_how: ["How to get it", "روش گرفتن"],
  x_rule: ["Rule (automatic)", "قانون (خودکار)"], x_rule_none: ["No rule — only you give it", "بدون قانون — فقط خودت می‌دهی"],
  x_when_game: ["When a game ends", "وقتی بازی تمام می‌شود"], x_when_stat: ["From the player's numbers", "از آمار بازیکن"],
  x_opp: ["Against", "مقابل"], x_result: ["Result", "نتیجه"], x_times: ["How many times", "چند بار"], x_conds: ["Conditions", "شرط‌ها"],
  x_add_cond: ["+ condition", "+ شرط"], x_secret: ["Secret (???) until earned", "مخفی (???) تا وقتی گرفته شود"],
  x_retired: ["Retired (can't be earned any more)", "بازنشسته (دیگر گرفته نمی‌شود)"], x_cat: ["Category", "دسته"], x_rarity: ["Rarity", "کمیابی"],
  x_name_en: ["Name (English)", "نام (انگلیسی)"], x_name_fa: ["Name (Persian)", "نام (فارسی)"], x_desc_en: ["Description (English) — empty = the rule", "توضیح (انگلیسی) — خالی = از روی قانون"],
  x_desc_fa: ["Description (Persian) — empty = the rule", "توضیح (فارسی) — خالی = از روی قانون"], x_reward: ["Reward board (unlocked by this badge)", "صفحه جایزه (با این نشان باز می‌شود)"],
  x_give_one: ["Give to a player", "دادن به یک بازیکن"], x_give_all: ["Give to everyone", "دادن به همه"], x_take_all: ["Take from everyone", "گرفتن از همه"],
  x_reset: ["Reset to original", "برگشت به حالت اصلی"], x_switch_off: ["Switch off", "خاموش کردن"], x_switch_on: ["Switch on", "روشن کردن"],
  x_del_q: ["Delete this badge? Players lose it.", "این نشان حذف شود؟ بازیکنان آن را از دست می‌دهند."],
  x_off_q: ["Switch it off? (it can't be earned any more)", "خاموش شود؟ (دیگر گرفته نمی‌شود)"], x_take_q: ["Also take it from everyone?", "از همه هم گرفته شود؟"],
  // boards
  x_new_board: ["New board", "صفحه جدید"], x_designer: ["Board Designer", "طراح صفحه"], x_light: ["Light squares", "خانه روشن"],
  x_dark: ["Dark squares", "خانه تیره"], x_accent: ["Accent", "رنگ اصلی"], x_bg: ["Background", "پس‌زمینه"], x_frame: ["Frame", "قاب"],
  x_last: ["Last-move highlight", "رنگ آخرین حرکت"], x_wps: ["White piece glow", "درخشش مهره سفید"], x_bps: ["Black piece glow", "درخشش مهره سیاه"],
  x_pattern: ["Pattern", "طرح"], x_pat_color: ["Pattern colour", "رنگ طرح"], x_anim: ["Animation", "انیمیشن"], x_fx2: ["Piece effect", "افکت مهره‌ها"],
  x_unlock: ["Unlock (all must be true)", "شرط باز شدن (همه باید درست باشند)"], x_free_board: ["Free for everyone", "رایگان برای همه"],
  x_using: ["using it", "در حال استفاده"], x_gifted: ["gifted", "هدیه‌شده"], x_take_back: ["Take back from everyone", "پس گرفتن از همه"],
  // bots
  x_models: ["AI models (APIs)", "مدل‌های هوش مصنوعی (API)"], x_new_model: ["Add an AI model", "افزودن مدل هوش مصنوعی"],
  x_provider: ["Provider", "سرویس"], x_base_url: ["API address (base URL)", "آدرس API"], x_model: ["Model name", "نام مدل"],
  x_key: ["API key", "کلید API"], x_key_keep: ["(saved — leave empty to keep)", "(ذخیره شده — خالی بگذار تا بماند)"],
  x_key_note: ["Stored only on your computer (chess.db). Tip: write env:NAME to read it from bot/.env instead.", "فقط روی کامپیوتر خودت ذخیره می‌شود (chess.db). نکته: env:NAME بنویس تا از فایل bot/.env خوانده شود."],
  x_auth: ["How the key is sent", "نحوه ارسال کلید"], x_temp: ["Temperature (empty = default)", "دما (خالی = پیش‌فرض)"],
  x_maxtok: ["Max tokens (0 = default)", "حداکثر توکن (۰ = پیش‌فرض)"], x_extra: ["Extra JSON (optional)", "JSON اضافه (اختیاری)"],
  x_enabled: ["Enabled", "فعال"], x_test: ["Test", "آزمایش"], x_testing: ["Asking the model…", "در حال پرسیدن از مدل…"],
  x_reply: ["Reply", "پاسخ"], x_move_read: ["Move read", "حرکت خوانده‌شده"], x_bots: ["Bot Creator", "سازنده ربات"],
  x_new_bot: ["New bot", "ربات جدید"], x_kind: ["Kind", "نوع"], x_engine: ["Engine (any rating)", "موتور (هر امتیازی)"], x_ai: ["AI model", "هوش مصنوعی"],
  x_elo: ["Rating", "امتیاز"], x_inf: ["∞ Infinite (full Stockfish, longer thinking)", "∞ بی‌نهایت (استاک‌فیش کامل، فکر طولانی‌تر)"],
  x_blunder: ["Blunder chance %", "احتمال اشتباه ٪"], x_think: ["Thinking time (s, empty = auto)", "زمان فکر (ثانیه، خالی = خودکار)"],
  x_greedy: ["Greedy (blunders grab material)", "حریص (موقع اشتباه مهره می‌زند)"], x_title: ["Title (e.g. GM, ∞)", "عنوان (مثلاً GM)"],
  x_bio_en: ["Bio (English)", "معرفی (انگلیسی)"], x_bio_fa: ["Bio (Persian)", "معرفی (فارسی)"], x_public: ["Public (everyone can play it)", "عمومی (همه بازی کنند)"],
  x_illegal: ["Allow illegal moves (GothamChess style 🤡)", "اجازه حرکت غیرقانونی (سبک گاتام‌چس 🤡)"],
  x_opener: ["First message (empty = “Let's play chess.”)", "اولین پیام (خالی = «Let's play chess.»)"],
  x_lines: ["What it says (one per line: English | Persian)", "حرف‌هایش (هر خط: انگلیسی | فارسی)"],
  x_ev_start_l: ["start", "شروع"], x_ev_win: ["win", "برد"], x_ev_lose: ["lose", "باخت"], x_ev_taunt: ["taunt", "طعنه"], x_ev_hurt: ["hurt", "ناراحتی"],
  x_record: ["Record", "کارنامه"], x_no_models: ["Add an AI model first (ArvanCloud, OpenAI, Gemini…).", "اول یک مدل هوش مصنوعی اضافه کن (ابر آروان، OpenAI، جمنای…)."],
  // give all
  x_ga_what: ["What", "چه چیزی"], x_ga_who: ["Who", "به چه کسانی"], x_who_all: ["Everyone", "همه"], x_who_active: ["Active in the last N days", "فعال در N روز اخیر"],
  x_who_players: ["Everyone who played", "هر کسی که بازی کرده"], x_who_accounts: ["Website accounts", "حساب‌های سایت"], x_who_bale: ["Bale players", "بازیکنان بله"],
  x_who_online: ["Online right now", "الان آنلاین"], x_days: ["Days", "روز"], x_min_elo: ["Min rating", "حداقل امتیاز"], x_max_elo: ["Max rating", "حداکثر امتیاز"],
  x_amount: ["Amount (±)", "مقدار (±)"], x_ga_msg: ["Message in Bale (optional)", "پیام در بله (اختیاری)"], x_ga_go: ["Give!", "بده!"],
  x_given: ["Given to {n} players ({m} matched).", "به {n} بازیکن داده شد ({m} نفر مطابق)."], k_badge: ["Badge", "نشان"], k_theme: ["Board", "صفحه"],
  k_title: ["Title", "عنوان"], k_tag: ["Tag", "تگ"], k_rating: ["Rating", "امتیاز"], k_puzzle: ["Puzzle rating", "امتیاز معما"],
  // modes
  x_feature: ["Feature", "ویژه کن"], x_unfeature: ["Unfeature", "حذف ویژه"], x_restore: ["Restore", "بازگردانی"],
  x_live_time: ["+30s", "+۳۰ث"], x_live_say: ["Say", "پیام"], x_live_draw: ["Draw", "مساوی"], x_lobby_clear: ["Clear the lobby", "پاک کردن صف"],
});

const L = () => (fa() ? "fa" : "en");
const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(label)}</option>`;
const lab = (prefix, k) => { const s = t(prefix + k); return s === prefix + k ? k : s; };  // a readable name for a key (the key itself if none)
const color = (cls, label, v) => `<label class="fl col"><span>${label}</span><span class="colr"><input type="color" class="${cls}" value="${esc(v.slice(0, 7))}"></span></label>`;
const EMO = "🏅 🤡 👻 🧠 ♾️ 🦄 🐉 🔥 💎 👑 ⚡ 🌈 🎯 🧩 🚀 🛸 💀 🥷 🧙 🦖 🍕 🎲 🌀 🪄 ☢️ 🏴‍☠️ ⭐ 🌟 💥 🎉".split(" ");

// ───────────────────────────── 🎉 events ─────────────────────────────
export async function events(el, c) {
  const r = await c.A("adm_events");
  if (r.error) { el.innerHTML = `<div class="card">${esc(r.error)}</div>`; return; }
  const cur = r.current;
  const P = r.presets || {};
  el.innerHTML = `<div class="adm-cols">
    <div class="card"><h2>⏱ ${t("x_ev_now")}</h2>${cur ? `<div class="ev-cur"><span class="ev-e">${esc(cur.emoji)}</span><div><b dir="auto">${esc(cur.title)}</b>
        <div class="muted small" dir="auto">${esc(cur.msg || "")}</div><div class="small">⏳ ${Math.ceil(cur.left / 60)} min</div></div></div>
        ${c.owner ? `<div class="row-b"><button class="btn sm ev-ext">${t("x_ev_ext")}</button><button class="btn sm danger ev-stop">■ ${t("x_ev_stop")}</button></div>` : ""}`
      : `<p class="muted">${t("x_ev_none")}</p>`}</div>
    <div class="card"><h2>⚡ ${t("x_ev_presets")}</h2><div class="ev-presets">${Object.entries(P).map(([k, p]) =>
      `<button class="ev-pre" data-pre="${esc(k)}" ${c.owner ? "" : "disabled"}><span class="e">${esc(p.emoji || "🎉")}</span><b dir="auto">${esc(fa() ? (p.title_fa || p.title) : p.title)}</b>
        <span class="muted small">${p.minutes || 60} min</span></button>`).join("")}</div></div>
    <div class="card ev-build"><h2>🛠 ${t("x_ev_custom")}</h2>
      <div class="row-f"><label class="fl sm"><span>Emoji</span><input class="e-emoji" value="🎉" maxlength="8"></label>
        <label class="fl sm"><span>${t("x_minutes")}</span><input class="e-min" type="number" value="60" min="1" max="10080"></label></div>
      <label class="fl"><span>${t("x_title_en")}</span><input class="e-ten" maxlength="60" value="Party time!"></label>
      <label class="fl"><span>${t("x_title_fa")}</span><input class="e-tfa" maxlength="60" dir="rtl" value="وقت جشن!"></label>
      <label class="fl"><span>${t("x_msg_en")}</span><input class="e-men" maxlength="200"></label>
      <label class="fl"><span>${t("x_msg_fa")}</span><input class="e-mfa" maxlength="200" dir="rtl"></label>
      <div class="row-f"><label class="fl sm"><span>${t("x_elo_mult")}</span><select class="e-elo">${[1, 2, 3, 5, 10].map((n) => opt(n, "×" + n, 2)).join("")}</select></label>
        <label class="fl sm"><span>${t("x_pz_mult")}</span><select class="e-pz">${[1, 2, 3, 5].map((n) => opt(n, "×" + n, 1)).join("")}</select></label></div>
      <label class="ck"><input type="checkbox" class="e-noloss"> 🛡️ ${t("x_no_loss")}</label>
      <label class="ck"><input type="checkbox" class="e-free"> 🎨 ${t("x_free")}</label>
      <label class="fl"><span>${t("x_badge")}</span><select class="e-badge"><option value="">—</option>${(r.badges || []).map((b) => opt(b.code, `${b.emoji} ${b.name}`)).join("")}</select></label>
      <label class="fl"><span>${t("x_mode")}</span><select class="e-mode"><option value="">—</option>${(r.modes || []).map((m) => opt(m.key, `${m.emoji} ${m.name}`)).join("")}</select></label>
      <div class="row-f"><label class="fl"><span>${t("x_fx")}</span><select class="e-fx"><option value="">—</option>${(r.fx || []).map((f) => opt(f, f, "confetti")).join("")}</select></label>
        <label class="fl sm"><span>${t("x_fx_emoji")}</span><input class="e-fxe" maxlength="8" value="🎉"></label></div>
      <label class="ck"><input type="checkbox" class="e-bale"> 📣 ${t("x_bale")}</label>
      <button class="btn primary e-go" ${c.owner ? "" : "disabled"}>🚀 ${t("x_ev_start")}</button></div></div>`;
  const q = (s) => el.querySelector(s);
  const after = async (x) => { if (x.ok) { toast("✓", "good"); const { setEvent } = await import("./live.js?v=ffa8bb0e87"); setEvent(x.event || null); c.go("events"); } };
  q(".ev-stop") && (q(".ev-stop").onclick = async () => after(await c.P("adm_event_stop")));
  q(".ev-ext") && (q(".ev-ext").onclick = async () => after(await c.P("adm_event_extend", { minutes: 15 })));
  el.querySelectorAll("[data-pre]").forEach((b) => b.onclick = async () => after(await c.P("adm_event_start", { preset: b.dataset.pre })));
  q(".e-go").onclick = async () => {
    const effects = { elo_mult: +q(".e-elo").value, puzzle_mult: +q(".e-pz").value, no_loss: q(".e-noloss").checked,
      free_themes: q(".e-free").checked, badge: q(".e-badge").value || undefined, mode: q(".e-mode").value || undefined,
      fx: q(".e-fx").value || undefined, fx_emoji: q(".e-fxe").value || undefined };
    after(await c.P("adm_event_start", { emoji: q(".e-emoji").value, minutes: +q(".e-min").value, title: q(".e-ten").value,
      title_fa: q(".e-tfa").value, msg: q(".e-men").value, msg_fa: q(".e-mfa").value, effects, bale: q(".e-bale").checked }));
  };
}

// ───────────────────────────── 🏅 badges ─────────────────────────────
export async function badges(el, c) {
  const r = await c.A("adm_badgex");
  if (r.error) { el.innerHTML = `<div class="card">${esc(r.error)}</div>`; return; }
  let filter = "custom", q = "";
  const rar = Object.fromEntries(r.rarities.map((x) => [x.key, x]));
  const draw = () => {
    const list = r.badges.filter((b) => (filter === "all" || (filter === "custom" ? b.custom : filter === "off" ? b.off : filter === "builtin" ? !b.custom : b.cat === filter)) &&
      (!q || (b.name + " " + b.name_fa + " " + b.code).toLowerCase().includes(q)));
    el.innerHTML = `<div class="card"><div class="row-f bx-head"><button class="btn primary bx-new" ${c.owner ? "" : "disabled"}>✨ ${t("x_new_badge")}</button>
        <input type="search" class="bx-q" placeholder="${t("x_search")}" value="${esc(q)}" dir="auto"></div>
      <div class="seg wrap bx-f">${[["custom", "✨ " + t("x_custom")], ["exotic", "💠 " + t("exotic")], ["builtin", t("x_builtin")], ["off", t("x_off")], ["all", t("a_all")]]
        .map(([k, l]) => `<button data-f="${k}" class="${filter === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="bx-list">${list.map((b) => `<div class="bx${b.off ? " off" : ""}${b.cat === "exotic" ? " exotic" : ""}">
        <span class="bx-e" style="--rc:${esc((rar[b.rarity] || {}).color || "#999")}">${esc(b.emoji)}</span>
        <div class="bx-m"><b dir="auto">${esc(fa() ? b.name_fa || b.name : b.name)}</b> <span class="pill" style="background:${esc((rar[b.rarity] || {}).color || "#999")}">${esc((rar[b.rarity] || {}).name || b.rarity)}</span>
          <span class="muted small">${(r.cats[b.cat] || b.cat) === ((rar[b.rarity] || {}).name || b.rarity) ? "" : esc(r.cats[b.cat] || b.cat) + " · "}${b.holders} ${t("x_holders")}${b.hidden ? " · 🕵️" : ""}${b.edited ? " · ✏️" : ""}${b.off ? " · ⛔" : ""}</span>
          <div class="small" dir="auto">${esc(b.how || (fa() ? b.desc_fa : b.desc))}</div></div>
        <div class="bx-b">${c.owner ? `<button class="btn sm" data-edit="${esc(b.code)}">✏️</button><button class="btn sm" data-give="${esc(b.code)}" title="${t("x_give_one")}">🎁</button>
          <button class="btn sm" data-gall="${esc(b.code)}" title="${t("x_give_all")}">🌍</button><button class="btn sm danger" data-del="${esc(b.code)}">🗑</button>` : ""}</div></div>`).join("") || `<p class="muted">—</p>`}</div></div>`;
    el.querySelector(".bx-q").oninput = (e) => { q = e.target.value.toLowerCase(); const pos = e.target.selectionStart; draw(); const i = el.querySelector(".bx-q"); i.focus(); i.setSelectionRange(pos, pos); };
    el.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { filter = b.dataset.f; draw(); });
    el.querySelector(".bx-new").onclick = () => editBadge(null);
    el.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => editBadge(r.badges.find((x) => x.code === b.dataset.edit)));
    el.querySelectorAll("[data-give]").forEach((b) => b.onclick = () => c.pickPlayer(async (pid) => { if ((await c.P("adm_achievement", { pid, code: b.dataset.give, give: true })).ok) toast("🏅 ✓", "good"); }));
    el.querySelectorAll("[data-gall]").forEach((b) => b.onclick = () => giveAllDialog(c, { kind: "badge", code: b.dataset.gall }));
    el.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      const x = r.badges.find((y) => y.code === b.dataset.del);
      if (!(await confirmBox(x.custom ? t("x_del_q") : t("x_off_q"), x.custom ? "🗑" : t("x_switch_off"), t("cancel")))) return;
      const take = !x.custom && x.holders && (await confirmBox(t("x_take_q"), t("x_take_all"), t("not_now")));
      if ((await c.P("adm_badgex_delete", { code: x.code, take })).ok) { toast("✓", "good"); c.go("badges"); }
    });
  };
  function editBadge(b) {
    const custom = !b || b.custom;
    const rule = (b && b.rule) || null;
    const st = { rule: rule ? JSON.parse(JSON.stringify(rule)) : null };
    const box = document.createElement("div");
    box.className = "bx-edit";
    const catOpts = Object.entries(r.cats).map(([k, l]) => opt(k, l, b ? b.cat : "exotic")).join("");
    const rarOpts = r.rarities.map((x) => opt(x.key, `${x.name} · ${x.points}`, b ? b.rarity : "exotic")).join("");
    const boardOpts = `<option value="">—</option>` + (r.boards || []).filter((x) => x.key.startsWith("x")).map((x) => opt(x.key, `${x.name} (${x.unlock})`)).join("");
    box.innerHTML = `<div class="row-f"><label class="fl sm"><span>Emoji</span><input class="b-emoji" maxlength="8" value="${esc(b ? b.emoji : "🤡")}"></label>
        <label class="fl"><span>${t("x_name_en")}</span><input class="b-name" maxlength="40" value="${esc(b ? b.name : "")}"></label>
        <label class="fl"><span>${t("x_name_fa")}</span><input class="b-namefa" maxlength="40" dir="rtl" value="${esc(b ? b.name_fa : "")}"></label></div>
      <div class="emoji-row">${EMO.map((e) => `<button data-e="${e}">${e}</button>`).join("")}</div>
      <label class="fl"><span>${t("x_desc_en")}</span><input class="b-desc" maxlength="140" value="${esc(b ? (custom ? b.raw_desc || "" : b.desc) : "")}"></label>
      <label class="fl"><span>${t("x_desc_fa")}</span><input class="b-descfa" maxlength="140" dir="rtl" value="${esc(b ? (custom ? b.raw_desc_fa || "" : b.desc_fa) : "")}"></label>
      <div class="row-f"><label class="fl"><span>${t("x_rarity")}</span><select class="b-rar">${rarOpts}</select></label>
        <label class="fl"><span>${t("x_cat")}</span><select class="b-cat">${catOpts}</select></label></div>
      <label class="ck"><input type="checkbox" class="b-hidden" ${b && b.hidden ? "checked" : ""}> 🕵️ ${t("x_secret")}</label>
      ${custom ? `<label class="ck"><input type="checkbox" class="b-ret" ${b && b.retired ? "checked" : ""}> ${t("x_retired")}</label>
        <div class="rule-box"></div>
        <label class="fl"><span>🎨 ${t("x_reward")}</span><select class="b-reward">${boardOpts}</select></label>`
      : `<label class="ck"><input type="checkbox" class="b-off" ${b && b.off ? "checked" : ""}> ⛔ ${t("x_switch_off")}</label>`}`;
    box.querySelectorAll("[data-e]").forEach((x) => x.onclick = () => { box.querySelector(".b-emoji").value = x.dataset.e; });
    if (custom) ruleBuilder(box.querySelector(".rule-box"), st, r.catalogue);
    const v = (s) => box.querySelector(s).value;
    const buttons = [{ label: t("cancel"), cls: "ghost" }];
    if (b && !custom && b.edited) buttons.push({ label: "↺ " + t("x_reset"), onClick: async () => { if ((await c.P("adm_ach_reset", { code: b.code })).ok) c.go("badges"); } });
    buttons.push({ label: "💾 " + t("save"), cls: "primary", onClick: async () => {
      if (custom) {
        const x = await c.P("adm_badgex_save", { id: b ? b.id : undefined, emoji: v(".b-emoji"), name: v(".b-name"), name_fa: v(".b-namefa"),
          descr: v(".b-desc"), descr_fa: v(".b-descfa"), rarity: v(".b-rar"), cat: v(".b-cat"), hidden: box.querySelector(".b-hidden").checked,
          retired: box.querySelector(".b-ret").checked, rule: st.rule, reward_board: v(".b-reward") });
        if (!x.ok) return false;
      } else {
        const x = await c.P("adm_ach_edit", { code: b.code, emoji: v(".b-emoji"), name: v(".b-name"), name_fa: v(".b-namefa"), desc: v(".b-desc"),
          desc_fa: v(".b-descfa"), rarity: v(".b-rar"), cat: v(".b-cat"), hidden: box.querySelector(".b-hidden").checked, off: box.querySelector(".b-off").checked });
        if (!x.ok) return false;
      }
      toast("🏅 ✓", "good");
      c.go("badges");
      return true;
    } });
    modal({ title: b ? `✏️ ${esc(b.emoji)} ${esc(b.name)}` : `✨ ${t("x_new_badge")}`, body: box, cls: "wide", buttons });
  }
  draw();
}

// "how to get it": when (game / numbers) · against · result · times · conditions
function ruleBuilder(box, st, cat) {
  const draw = () => {
    const ru = st.rule;
    const conds = ru ? ru.conds : [];
    const list = ru && ru.when === "stat" ? cat.stat : cat.game;
    const condRow = (cd, i) => {
      const spec = list.find((x) => x.k === cd.k) || list[0];
      let val;
      if (spec.type === "bool") val = `<select data-cv="${i}">${opt("true", "✓", String(cd.v))}${opt("false", "✕", String(cd.v))}</select>`;
      else if (spec.type === "choice") val = `<select data-cv="${i}">${(spec.choices || []).map((ch) => opt(ch.v, ch.label, cd.v)).join("")}</select>`;
      else val = `<input type="number" data-cv="${i}" value="${esc(cd.v ?? 1)}">`;
      const ops = spec.type === "num" ? cat.ops : ["==", "!="];
      return `<div class="cond"><select data-ck="${i}">${list.map((x) => opt(x.k, x.label, cd.k)).join("")}</select>
        <select data-co="${i}">${ops.map((o) => opt(o, o, cd.op)).join("")}</select>${val}<button class="btn sm ghost" data-cx="${i}">✕</button></div>`;
    };
    box.innerHTML = `<div class="bs-label">⚙️ ${t("x_rule")}</div>
      <div class="seg wrap">${[["none", t("x_rule_none")], ["game", t("x_when_game")], ["stat", t("x_when_stat")]].map(([k, l]) =>
        `<button data-when="${k}" class="${(ru ? ru.when : "none") === k ? "on" : ""}">${l}</button>`).join("")}</div>
      ${ru && ru.when === "game" ? `<div class="row-f"><label class="fl"><span>${t("x_opp")}</span><select class="r-opp">${cat.opps.map((o) => opt(o.v, o.label, ru.opp)).join("")}</select></label>
        <label class="fl"><span>${t("x_result")}</span><select class="r-res">${cat.results.map((o) => opt(o.v, o.label, ru.result)).join("")}</select></label>
        <label class="fl sm"><span>${t("x_times")}</span><input type="number" class="r-times" min="1" max="1000" value="${ru.times || 1}"></label></div>` : ""}
      ${ru ? `<div class="bs-label">${t("x_conds")}</div><div class="conds">${conds.map(condRow).join("")}</div><button class="btn sm r-add">${t("x_add_cond")}</button>` : ""}`;
    box.querySelectorAll("[data-when]").forEach((b) => b.onclick = () => {
      const w = b.dataset.when;
      st.rule = w === "none" ? null : { when: w, opp: "human", result: "win", times: 1, conds: [] };
      if (w === "game") st.rule.opp = "ai";
      draw();
    });
    if (!ru) return;
    const opp = box.querySelector(".r-opp"), res = box.querySelector(".r-res"), times = box.querySelector(".r-times");
    if (opp) opp.onchange = () => { ru.opp = opp.value; };
    if (res) res.onchange = () => { ru.result = res.value; };
    if (times) times.oninput = () => { ru.times = Math.max(1, +times.value || 1); };
    box.querySelector(".r-add").onclick = () => {
      const first = list[0];
      ru.conds.push({ k: first.k, op: first.type === "num" ? ">=" : "==", v: first.type === "bool" ? true : first.type === "choice" ? (first.choices[0] || {}).v : 1 });
      draw();
    };
    box.querySelectorAll("[data-ck]").forEach((s) => s.onchange = () => {
      const i = +s.dataset.ck, spec = list.find((x) => x.k === s.value);
      ru.conds[i] = { k: s.value, op: spec.type === "num" ? ">=" : "==", v: spec.type === "bool" ? true : spec.type === "choice" ? ((spec.choices || [])[0] || {}).v : 1 };
      draw();
    });
    box.querySelectorAll("[data-co]").forEach((s) => s.onchange = () => { ru.conds[+s.dataset.co].op = s.value; });
    box.querySelectorAll("[data-cv]").forEach((s) => s.oninput = s.onchange = () => {
      const cd = ru.conds[+s.dataset.cv], spec = list.find((x) => x.k === cd.k) || {};
      cd.v = spec.type === "bool" ? s.value === "true" : spec.type === "num" ? +s.value : s.value;
    });
    box.querySelectorAll("[data-cx]").forEach((b) => b.onclick = () => { ru.conds.splice(+b.dataset.cx, 1); draw(); });
  };
  draw();
}

// ───────────────────────────── 🎨 Board Designer ─────────────────────────────
const PATS = {
  none: () => null, grain: () => "repeating-linear-gradient(83deg, rgba(0,0,0,.07) 0 2px, transparent 2px 9px, rgba(255,255,255,.05) 9px 11px, transparent 11px 17px) 0 0/100% 100%",
  grid: (c) => `linear-gradient(${c} 1px, transparent 1px) 0 0/12.5% 12.5%, linear-gradient(90deg, ${c} 1px, transparent 1px) 0 0/12.5% 12.5%`,
  stars: () => "radial-gradient(1.2px 1.2px at 12% 18%, #fff 50%, transparent 51%) 0 0/37% 41%, radial-gradient(1px 1px at 70% 60%, #fff 50%, transparent 51%) 0 0/29% 31%",
  stripes: (c) => `repeating-linear-gradient(45deg, ${c} 0 6px, transparent 6px 18px) 0 0/100% 100%`,
  dots: (c) => `radial-gradient(${c} 18%, transparent 20%) 0 0/6.25% 6.25%`,
  checks: (c) => `repeating-conic-gradient(${c} 0% 25%, transparent 0% 50%) 0 0/6.25% 6.25%`,
  glass: () => "linear-gradient(135deg, rgba(255,255,255,.28), transparent 45%, rgba(255,255,255,.12) 70%, transparent) 0 0/100% 100%",
  scan: (c) => `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px 4px) 0 0/100% 100%`,
  waves: (c) => `radial-gradient(circle at 50% 120%, transparent 38%, ${c} 40%, transparent 44%) 0 0/12.5% 12.5%`,
  shine: () => "linear-gradient(115deg, transparent 40%, rgba(255,255,255,.35) 50%, transparent 60%) 0 0/300% 100%",
  gradient: (c) => `linear-gradient(135deg, ${c}, transparent 70%) 0 0/100% 100%`,
};
const ANIMS = { none: "", hue: "hue 9s linear infinite", hue_fast: "hue 3s linear infinite", aurora: "aurora 12s ease-in-out infinite alternate",
  matrix: "matrix 6s linear infinite", shine: "shine 5s linear infinite", pulse: "boardpulse 3s ease-in-out infinite" };
const PFX = { none: "", glow: "", neon: "", shadow: "drop-shadow(0 3px 2px rgba(0,0,0,.55))", rainbow: "", ghost: "", gold: "sepia(.9) saturate(2.6) hue-rotate(-12deg) brightness(1.05)",
  ice: "saturate(.5) hue-rotate(175deg) brightness(1.12)" };
const hexRgba = (h) => { const x = h.replace("#", ""); const a = x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1; return `rgba(${parseInt(x.slice(0, 2), 16)},${parseInt(x.slice(2, 4), 16)},${parseInt(x.slice(4, 6), 16)},${a.toFixed(2)})`; };

function previewHtml(d) {
  const pat = (PATS[d.pat] || PATS.none)(hexRgba(d.pat_color || "#00000022"));
  const checker = "repeating-conic-gradient(var(--dark) 0% 25%, var(--light) 0% 50%) 0 0/25% 25%";
  const pcs = [["bR", 0, 0], ["bK", 4, 0], ["bP", 5, 1], ["bN", 2, 2], ["wP", 4, 4], ["wQ", 3, 5], ["wB", 6, 5], ["wK", 6, 7], ["wR", 5, 7]];
  const glow = (c) => d.fx === "glow" || d.fx === "neon" ? `drop-shadow(0 0 3px ${c}) drop-shadow(0 0 ${d.fx === "neon" ? 9 : 6}px ${c})` : PFX[d.fx] || "";
  return `<div class="cb static dz-prev" style="--light:${esc(d.light)};--dark:${esc(d.dark)};--last:${esc(hexRgba(d.last) + "")};border:6px solid ${esc(d.frame)};background:${esc(d.bg)}">
    <div class="cb-sq" style="background:${pat ? esc(pat) + "," : ""}${checker};${ANIMS[d.anim] ? `animation:${ANIMS[d.anim]}` : ""}"></div>
    <div class="cb-hl"><div class="hl last" style="transform:translate(400%,600%);background:${esc(hexRgba(d.last))};opacity:${d.last_alpha || .55}"></div><div class="hl last" style="transform:translate(400%,400%);background:${esc(hexRgba(d.last))};opacity:${d.last_alpha || .55}"></div></div>
    <div class="cb-pc">${pcs.map(([p, x, y]) => `<span class="pc" data-c="${p}" style="transform:translate(${x * 100}%,${y * 100}%);filter:${glow(p[0] === "w" ? d.wps : d.bps)};${d.fx === "rainbow" ? "animation:hue 6s linear infinite;" : ""}${d.fx === "ghost" ? "opacity:.78;" : ""}"></span>`).join("")}</div></div>`;
}

export async function boards(el, c) {
  const r = await c.A("adm_boards");
  if (r.error) { el.innerHTML = `<div class="card">${esc(r.error)}</div>`; return; }
  el.innerHTML = `<div class="card"><div class="row-f"><button class="btn primary bd-new" ${c.owner ? "" : "disabled"}>🎨 ${t("x_new_board")}</button></div>
    <div class="bd-grid">${r.boards.map((b) => `<div class="bd"><div class="bd-p">${previewHtml(b.data)}</div>
      <b dir="auto">${esc(fa() ? b.data.fa : b.data.en)}</b><span class="muted small">🔓 ${esc(b.unlock_text || t("x_free_board"))}</span>
      <span class="muted small">${b.using} ${t("x_using")} · ${b.gifted} ${t("x_gifted")}${b.data.secret ? " · 🕵️" : ""}</span>
      ${c.owner ? `<div class="row-b"><button class="btn sm" data-ed="${b.id}">✏️</button><button class="btn sm" data-g1="${esc(b.key)}" title="${t("x_give_one")}">🎁</button>
        <button class="btn sm" data-ga="${esc(b.key)}" title="${t("x_give_all")}">🌍</button><button class="btn sm" data-tb="${esc(b.key)}" title="${t("x_take_back")}">↩</button>
        <button class="btn sm danger" data-del="${b.id}">🗑</button></div>` : ""}</div>`).join("") || `<p class="muted">—</p>`}</div></div>
    <div class="card"><h2>🎁 ${t("a_give_theme")}</h2><div class="row-f"><select class="bd-any">${r.all.map((x) => opt(x.key, `${x.name}${x.custom ? " ✨" : ""} — ${x.unlock || t("x_free_board")}`)).join("")}</select>
      <button class="btn sm bd-any1">🎁 ${t("x_give_one")}</button><button class="btn sm bd-anyall">🌍 ${t("x_give_all")}</button><button class="btn sm bd-anytake">↩ ${t("x_take_back")}</button></div></div>`;
  el.querySelector(".bd-new").onclick = () => designer(null);
  el.querySelectorAll("[data-ed]").forEach((b) => b.onclick = () => designer(r.boards.find((x) => String(x.id) === b.dataset.ed)));
  const give1 = (key) => c.pickPlayer(async (pid) => { if ((await c.P("adm_theme", { pid, theme: key })).ok) toast("🎨 ✓", "good"); });
  const takeAll = async (key) => { if (await confirmBox(t("x_take_back") + "?", "↩", t("cancel"))) { const x = await c.P("adm_theme_take", { theme: key, all: true }); if (x.ok) toast(`↩ ${x.taken}`, "good"); } };
  el.querySelectorAll("[data-g1]").forEach((b) => b.onclick = () => give1(b.dataset.g1));
  el.querySelectorAll("[data-ga]").forEach((b) => b.onclick = () => giveAllDialog(c, { kind: "theme", theme: b.dataset.ga }));
  el.querySelectorAll("[data-tb]").forEach((b) => b.onclick = () => takeAll(b.dataset.tb));
  el.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
    if (!(await confirmBox("🗑?", "🗑", t("cancel")))) return;
    if ((await c.P("adm_board_delete", { id: +b.dataset.del })).ok) c.go("boards");
  });
  el.querySelector(".bd-any1").onclick = () => give1(el.querySelector(".bd-any").value);
  el.querySelector(".bd-anyall").onclick = () => giveAllDialog(c, { kind: "theme", theme: el.querySelector(".bd-any").value });
  el.querySelector(".bd-anytake").onclick = () => takeAll(el.querySelector(".bd-any").value);

  function designer(b) {
    const d = b ? { ...b.data, unlock: (b.data.unlock || []).map((x) => ({ ...x })) } : { en: "", fa: "", light: "#f0e6d2", dark: "#8a5a44", accent: "#ff9f43",
      bg: "#161210", frame: "#5a3d26", last: "#f5f682", last_alpha: 0.55, wps: "#ffffff", bps: "#222222", pat: "none", pat_color: "#ffffff33",
      anim: "none", fx: "none", secret: false, unlock: [] };
    const box = document.createElement("div");
    box.className = "designer";
    const draw = () => {
      box.innerHTML = `<div class="dz"><div class="dz-l">${previewHtml(d)}</div><div class="dz-r">
        <div class="row-f"><label class="fl"><span>${t("x_name_en")}</span><input class="d-en" maxlength="24" value="${esc(d.en)}"></label>
          <label class="fl"><span>${t("x_name_fa")}</span><input class="d-fa" maxlength="24" dir="rtl" value="${esc(d.fa)}"></label></div>
        <div class="colors">${color("d-light", t("x_light"), d.light)}${color("d-dark", t("x_dark"), d.dark)}${color("d-frame", t("x_frame"), d.frame)}
          ${color("d-bg", t("x_bg"), d.bg)}${color("d-accent", t("x_accent"), d.accent)}${color("d-last", t("x_last"), d.last)}
          ${color("d-wps", t("x_wps"), d.wps)}${color("d-bps", t("x_bps"), d.bps)}${color("d-patc", t("x_pat_color"), d.pat_color)}</div>
        <div class="row-f"><label class="fl"><span>${t("x_pattern")}</span><select class="d-pat">${Object.keys(PATS).map((k) => opt(k, lab("pat_", k), d.pat)).join("")}</select></label>
          <label class="fl"><span>${t("x_anim")}</span><select class="d-anim">${Object.keys(ANIMS).map((k) => opt(k, lab("an_", k), d.anim)).join("")}</select></label>
          <label class="fl"><span>${t("x_fx2")}</span><select class="d-fx">${Object.keys(PFX).map((k) => opt(k, lab("fx_", k), d.fx)).join("")}</select></label></div>
        <label class="ck"><input type="checkbox" class="d-secret" ${d.secret ? "checked" : ""}> 🕵️ ${t("secret_board")}</label>
        <div class="bs-label">🔓 ${t("x_unlock")}</div><div class="unl">${d.unlock.map((u, i) => `<div class="cond"><select data-uk="${i}">${r.kinds.map((k) => opt(k, lab("uk_", k), u.k)).join("")}</select>
          ${u.k === "badge" ? `<select data-uv="${i}">${r.badges.map((x) => opt(x.code, `${x.emoji} ${x.name}`, u.v)).join("")}</select>`
          : u.k === "title" ? `<select data-uv="${i}">${opt("any", "any", u.v)}${(r.titles || []).map((x) => opt(x.code, x.code, u.v)).join("")}</select>`
          : u.k === "role" ? `<select data-uv="${i}">${opt("staff", "staff", u.v)}${opt("owner", "owner", u.v)}</select>`
          : u.k === "gift" ? `<span class="muted small">🎁</span>` : `<input type="number" data-uv="${i}" value="${esc(u.v ?? 1)}" min="0">`}
          <button class="btn sm ghost" data-ux="${i}">✕</button></div>`).join("") || `<span class="muted small">${t("x_free_board")}</span>`}</div>
        <button class="btn sm d-uadd">${t("x_add_cond")}</button></div></div>`;
      const pick = (s, k) => { const x = box.querySelector(s); if (x) x.oninput = x.onchange = () => { d[k] = x.value; refresh(); }; };
      [["d-light", "light"], ["d-dark", "dark"], ["d-frame", "frame"], ["d-bg", "bg"], ["d-accent", "accent"], ["d-last", "last"], ["d-wps", "wps"], ["d-bps", "bps"],
        ["d-pat", "pat"], ["d-anim", "anim"], ["d-fx", "fx"]].forEach(([s, k]) => pick("." + s, k));
      const pc = box.querySelector(".d-patc");
      pc.oninput = () => { d.pat_color = pc.value + "55"; refresh(); };
      box.querySelector(".d-en").oninput = (e) => { d.en = e.target.value; };
      box.querySelector(".d-fa").oninput = (e) => { d.fa = e.target.value; };
      box.querySelector(".d-secret").onchange = (e) => { d.secret = e.target.checked; };
      box.querySelector(".d-uadd").onclick = () => { d.unlock.push({ k: "badge", v: (r.badges[0] || {}).code }); draw(); };
      box.querySelectorAll("[data-uk]").forEach((s) => s.onchange = () => {
        const k = s.value;
        d.unlock[+s.dataset.uk] = { k, v: k === "badge" ? (r.badges[0] || {}).code : k === "title" ? "any" : k === "role" ? "staff" : k === "gift" ? "" : 100 };
        draw();
      });
      box.querySelectorAll("[data-uv]").forEach((s) => s.oninput = s.onchange = () => { const u = d.unlock[+s.dataset.uv]; u.v = s.type === "number" ? +s.value : s.value; });
      box.querySelectorAll("[data-ux]").forEach((x) => x.onclick = () => { d.unlock.splice(+x.dataset.ux, 1); draw(); });
    };
    const refresh = () => { box.querySelector(".dz-l").innerHTML = previewHtml(d); };
    draw();
    modal({ title: `🎨 ${t("x_designer")}`, body: box, cls: "wide", buttons: [{ label: t("cancel"), cls: "ghost" }, { label: "💾 " + t("save"), cls: "primary", onClick: async () => {
      if (!d.en.trim()) { toast(t("x_name_en") + "?", "bad"); return false; }
      const x = await c.P("adm_board_save", { ...d, id: b ? b.id : undefined });
      if (!x.ok) return false;
      const { injectCss } = await import("./live.js?v=ffa8bb0e87");
      injectCss(x.css);
      toast("🎨 ✓", "good");
      c.go("boards");
      return true;
    } }] });
  }
}

// ───────────────────────────── 🤖 bots & AI models ─────────────────────────────
export async function bots(el, c) {
  const r = await c.A("adm_bots");
  if (r.error) { el.innerHTML = `<div class="card">${esc(r.error)}</div>`; return; }
  el.innerHTML = `<div class="adm-cols">
    <div class="card"><h2>🧠 ${t("x_models")}</h2><button class="btn primary sm m-new" ${c.owner ? "" : "disabled"}>➕ ${t("x_new_model")}</button>
      <div class="mlist">${r.models.map((m) => `<div class="mrow${m.enabled ? "" : " off"}"><div><b dir="auto">${esc(m.name)}</b> <span class="muted small" dir="ltr">${esc(m.model)} · ${esc(m.provider)}</span>
        <div class="muted small" dir="ltr">${esc(m.base_url)}</div><div class="small">🔑 <span dir="ltr">${esc(m.key_hint)}</span> · ${esc(m.auth)} · ${t("x_calls", { n: m.calls })} · ${m.fails} ✕ · 🤖 ${m.bots}
        ${m.last_error ? `<div class="bad small" dir="ltr">⚠️ ${esc(m.last_error)}</div>` : m.last_ok ? `<span class="good"> · ✓ ${timeAgo(m.last_ok, fa())}</span>` : ""}</div></div>
        ${c.owner ? `<div class="row-b"><button class="btn sm" data-test="${m.id}">🧪 ${t("x_test")}</button><button class="btn sm" data-medit="${m.id}">✏️</button>
          <button class="btn sm danger" data-mdel="${m.id}">🗑</button></div>` : ""}</div>`).join("") || `<p class="muted small">${t("x_no_models")}</p>`}</div></div>
    <div class="card"><h2>🛠 ${t("x_bots")}</h2><button class="btn primary sm b-new" ${c.owner ? "" : "disabled"}>➕ ${t("x_new_bot")}</button>
      <div class="blist">${r.bots.map((b) => `<div class="brow"><span class="av bot emo" style="background:${esc(b.color)}">${esc(b.emoji)}</span>
        <div><b dir="auto">${esc(b.name)}</b> ${b.title ? `<span class="ttl">${esc(b.title)}</span>` : ""} <span class="muted small">${b.kind === "ai" ? `🧠 ${esc(b.model)}${b.illegal ? " 🤡" : ""}` : b.inf ? "∞" : b.elo}${b.public ? "" : " · 🔒"}</span>
          <div class="muted small">${t("x_record")}: ${b.wins}–${b.losses}–${b.draws} (${b.games})</div></div>
        ${c.owner ? `<div class="row-b"><button class="btn sm" data-bedit="${b.id}">✏️</button><button class="btn sm danger" data-bdel="${b.id}">🗑</button></div>` : ""}</div>`).join("")}</div></div></div>`;
  el.querySelector(".m-new").onclick = () => modelForm(null);
  el.querySelectorAll("[data-medit]").forEach((b) => b.onclick = () => modelForm(r.models.find((m) => String(m.id) === b.dataset.medit)));
  el.querySelectorAll("[data-mdel]").forEach((b) => b.onclick = async () => { if (await confirmBox("🗑?", "🗑", t("cancel"))) { if ((await c.P("adm_ai_delete", { id: +b.dataset.mdel })).ok) c.go("bots"); } });
  el.querySelectorAll("[data-test]").forEach((b) => b.onclick = () => testModel(+b.dataset.test));
  el.querySelector(".b-new").onclick = () => botForm(null);
  el.querySelectorAll("[data-bedit]").forEach((b) => b.onclick = () => botForm(r.bots.find((x) => String(x.id) === b.dataset.bedit)));
  el.querySelectorAll("[data-bdel]").forEach((b) => b.onclick = async () => { if (await confirmBox("🗑?", "🗑", t("cancel"))) { if ((await c.P("adm_bot_delete", { id: +b.dataset.bdel })).ok) c.go("bots"); } });

  async function testModel(id) {
    const close = modal({ title: `🧪 ${t("x_test")}`, body: `<div class="spin center"></div><p class="muted center">${t("x_testing")}</p>`, buttons: [] });
    const x = await c.P("adm_ai_test", { id });
    close();
    modal({ title: `🧪 ${t("x_test")}`, body: x.ok ? `<div class="small muted">⏱ ${x.ms} ms</div><div class="bs-label">${t("x_reply")}</div><pre class="ai-reply" dir="auto">${esc(x.reply)}</pre>
      <div class="bs-label">${t("x_move_read")}</div><b dir="ltr">${esc(x.move || "—")}</b>` : `<p class="bad" dir="ltr">⚠️ ${esc(x.error || "?")}</p><div class="small muted">⏱ ${x.ms || 0} ms</div>`,
    buttons: [{ label: "OK", cls: "primary", onClick: () => c.go("bots") }] });
  }

  function modelForm(m) {
    const box = document.createElement("div");
    const P = r.providers;
    let prov = m ? m.provider : "arvan";
    // a provider's address with blanks to fill (ArvanCloud: …/models/MODEL/ENDPOINT-ID/v1) is only a hint, never a value
    const ready = (u) => (u && !/MODEL|ENDPOINT/.test(u) ? u : "");
    const draw = () => {
      const p = P[prov] || P.custom;
      box.innerHTML = `<label class="fl"><span>${t("x_provider")}</span><select class="m-prov">${Object.entries(P).map(([k, v]) => opt(k, v.name, prov)).join("")}</select></label>
        <p class="note small" dir="auto">💡 ${esc(p.hint)}</p>
        <label class="fl"><span>${t("x_mname")}</span><input class="m-name" maxlength="40" value="${esc(m ? m.name : "")}" placeholder="GPT-4o (Arvan)"></label>
        <label class="fl"><span>${t("x_base_url")}</span><input class="m-url" dir="ltr" value="${esc(m ? m.base_url : ready(p.url))}" placeholder="${esc(p.url || "https://…/v1")}"></label>
        <label class="fl"><span>${t("x_model")}</span><input class="m-model" dir="ltr" value="${esc(m ? m.model : "")}" placeholder="gpt-4o-mini · gemini-2.0-flash · gpt-3.5-turbo"></label>
        <label class="fl"><span>${t("x_key")} ${m ? `<span class="muted small">${t("x_key_keep")} 🔑 ${esc(m.key_hint)}</span>` : ""}</span><input class="m-key" type="password" dir="ltr" autocomplete="off"></label>
        <p class="muted small">${t("x_key_note")}</p>
        <div class="row-f"><label class="fl"><span>${t("x_auth")}</span><select class="m-auth">${r.auths.map((a) => opt(a, a, m ? m.auth : p.auth)).join("")}</select></label>
          <label class="fl sm"><span>${t("x_temp")}</span><input class="m-temp" type="number" step="0.1" min="0" max="2" value="${m && m.temperature != null ? m.temperature : ""}"></label>
          <label class="fl sm"><span>${t("x_maxtok")}</span><input class="m-max" type="number" min="0" max="16000" value="${m ? m.max_tokens || 0 : 0}"></label></div>
        <label class="fl"><span>${t("x_extra")}</span><input class="m-extra" dir="ltr" value="${esc(m ? m.extra : "")}" placeholder='{"top_p": 1}'></label>
        <label class="ck"><input type="checkbox" class="m-on" ${!m || m.enabled ? "checked" : ""}> ${t("x_enabled")}</label>`;
      box.querySelector(".m-prov").onchange = (e) => {
        const old = P[prov];
        prov = e.target.value;
        const url = box.querySelector(".m-url");
        if (!url.value || (old && url.value === old.url)) { draw(); box.querySelector(".m-url").value = ready(P[prov].url); }
        else { const keep = url.value; draw(); box.querySelector(".m-url").value = keep; }
      };
    };
    draw();
    modal({ title: m ? `✏️ ${esc(m.name)}` : `➕ ${t("x_new_model")}`, body: box, cls: "wide", buttons: [{ label: t("cancel"), cls: "ghost" }, { label: "💾 " + t("save"), cls: "primary", onClick: async () => {
      const v = (s) => box.querySelector(s).value;
      const x = await c.P("adm_ai_save", { id: m ? m.id : undefined, provider: prov, name: v(".m-name"), base_url: v(".m-url"), model: v(".m-model"),
        api_key: v(".m-key"), auth: v(".m-auth"), temperature: v(".m-temp"), max_tokens: +v(".m-max") || 0, extra: v(".m-extra"), enabled: box.querySelector(".m-on").checked });
      if (!x.ok) return false;
      toast("🧠 ✓", "good");
      setTimeout(() => testModel(x.id), 250);
      return true;
    } }] });
  }

  function botForm(b) {
    const box = document.createElement("div");
    const st = { kind: b ? b.kind : "engine", inf: b ? b.inf : false };
    const lines = (ev) => ((b && b.lines && b.lines[ev]) || []).map((x) => `${x[0]}${x[1] ? " | " + x[1] : ""}`).join("\n");
    const draw = () => {
      const ai = st.kind === "ai";
      box.innerHTML = `<div class="seg"><button data-kind="engine" class="${!ai ? "on" : ""}">♟ ${t("x_engine")}</button><button data-kind="ai" class="${ai ? "on" : ""}">🧠 ${t("x_ai")}</button></div>
        <div class="row-f"><label class="fl sm"><span>Emoji</span><input class="f-emoji" maxlength="8" value="${esc(b ? b.emoji : ai ? "🤡" : "🤖")}"></label>
          <label class="fl"><span>${t("x_name_en")}</span><input class="f-name" maxlength="30" value="${esc(b ? b.name_en : "")}"></label>
          <label class="fl"><span>${t("x_name_fa")}</span><input class="f-namefa" maxlength="30" dir="rtl" value="${esc(b ? b.name_fa : "")}"></label>
          ${color("f-color", t("a_color"), b ? b.color : "#607d8b")}</div>
        ${ai ? (r.models.length ? `<label class="fl"><span>🧠 ${t("x_model")}</span><select class="f-model">${r.models.map((m) => opt(m.id, `${m.name} · ${m.model}`, b ? b.model_id : "")).join("")}</select></label>
          <label class="ck"><input type="checkbox" class="f-illegal" ${!b || b.illegal ? "checked" : ""}> ${t("x_illegal")}</label>
          <label class="fl"><span>${t("x_opener")}</span><input class="f-opener" maxlength="400" value="${esc(b ? b.opener : "")}" placeholder="Let's play chess."></label>`
          : `<p class="bad">${t("x_no_models")}</p>`) : `
          <label class="ck"><input type="checkbox" class="f-inf" ${st.inf ? "checked" : ""}> ${t("x_inf")}</label>
          ${st.inf ? "" : `<label class="fl"><span>${t("x_elo")}: <b class="f-elo-v">${b ? b.raw_elo : 800}</b></span><input type="range" class="f-elo" min="0" max="3500" step="25" value="${b ? b.raw_elo : 800}"></label>`}
          <div class="row-f"><label class="fl sm"><span>${t("x_blunder")}</span><input type="number" class="f-blunder" min="0" max="100" value="${b && b.style ? b.style.blunder || 0 : 0}"></label>
            <label class="fl sm"><span>${t("x_think")}</span><input type="number" class="f-think" step="0.1" min="0" max="10" value="${b && b.style && b.style.think ? b.style.think : ""}"></label></div>
          <label class="ck"><input type="checkbox" class="f-greedy" ${b && b.style && b.style.greedy ? "checked" : ""}> ${t("x_greedy")}</label>`}
        <label class="fl sm"><span>${t("x_title")}</span><input class="f-title" maxlength="4" value="${esc(b && b.style ? b.style.title || "" : "")}"></label>
        <label class="fl"><span>${t("x_bio_en")}</span><input class="f-bio" maxlength="200" value="${esc(b ? b.bio_en : "")}"></label>
        <label class="fl"><span>${t("x_bio_fa")}</span><input class="f-biofa" maxlength="200" dir="rtl" value="${esc(b ? b.bio_fa : "")}"></label>
        ${ai ? "" : `<div class="bs-label">${t("x_lines")}</div><div class="lines">${[["start", t("x_ev_start_l")], ["win", t("x_ev_win")], ["lose", t("x_ev_lose")], ["taunt", t("x_ev_taunt")], ["hurt", t("x_ev_hurt")]]
          .map(([k, l]) => `<label class="fl"><span>${l}</span><textarea rows="2" data-line="${k}" dir="auto">${esc(lines(k))}</textarea></label>`).join("")}</div>`}
        <label class="ck"><input type="checkbox" class="f-pub" ${!b || b.public ? "checked" : ""}> ${t("x_public")}</label>`;
      box.querySelectorAll("[data-kind]").forEach((x) => x.onclick = () => { st.kind = x.dataset.kind; draw(); });
      const inf = box.querySelector(".f-inf");
      if (inf) inf.onchange = () => { st.inf = inf.checked; draw(); };
      const elo = box.querySelector(".f-elo");
      if (elo) elo.oninput = () => { box.querySelector(".f-elo-v").textContent = elo.value; };
    };
    draw();
    modal({ title: b ? `✏️ ${esc(b.emoji)} ${esc(b.name)}` : `➕ ${t("x_new_bot")}`, body: box, cls: "wide", buttons: [{ label: t("cancel"), cls: "ghost" }, { label: "💾 " + t("save"), cls: "primary", onClick: async () => {
      const q = (s) => box.querySelector(s);
      const v = (s) => (q(s) ? q(s).value : "");
      const lineData = {};
      box.querySelectorAll("[data-line]").forEach((x) => {
        lineData[x.dataset.line] = x.value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("|").map((y) => y.trim()));
      });
      const x = await c.P("adm_bot_save", { id: b ? b.id : undefined, kind: st.kind, emoji: v(".f-emoji"), name: v(".f-name"), name_fa: v(".f-namefa"),
        color: v(".f-color"), elo: +v(".f-elo") || 0, inf: st.inf, model_id: v(".f-model"), illegal: q(".f-illegal") ? q(".f-illegal").checked : true,
        opener: v(".f-opener"), bio: v(".f-bio"), bio_fa: v(".f-biofa"), public: q(".f-pub").checked, lines: lineData,
        style: { blunder: +v(".f-blunder") || 0, think: +v(".f-think") || 0, title: v(".f-title"), greedy: q(".f-greedy") ? q(".f-greedy").checked : false } });
      if (!x.ok) return false;
      toast("🤖 ✓", "good");
      c.go("bots");
      return true;
    } }] });
  }
}

// ───────────────────────────── 🎁 give to everyone ─────────────────────────────
export function giveAllDialog(c, preset = {}) {
  c.go("giveall", preset);
}

export async function giveall(el, c, preset = {}) {
  const [bx, tags] = await Promise.all([c.A("adm_badgex"), c.A("adm_tags")]);
  if (bx.error) { el.innerHTML = `<div class="card">${esc(bx.error)}</div>`; return; }
  const boards = await c.A("adm_boards");
  let kind = preset.kind || "badge";
  const draw = () => {
    el.innerHTML = `<div class="card ga"><h2>🎁 ${t("a_giveall")}</h2>
      <div class="bs-label">${t("x_ga_what")}</div><div class="seg wrap">${["badge", "theme", "title", "tag", "rating", "puzzle"].map((k) => `<button data-k="${k}" class="${kind === k ? "on" : ""}">${t("k_" + k)}</button>`).join("")}</div>
      <div class="ga-what">${kind === "badge" ? `<select class="g-code">${bx.badges.map((b) => opt(b.code, `${b.emoji} ${fa() ? b.name_fa || b.name : b.name}${b.custom ? " ✨" : ""}`, preset.code)).join("")}</select>`
        : kind === "theme" ? `<select class="g-theme">${(boards.all || []).map((b) => opt(b.key, `${b.name}${b.custom ? " ✨" : ""}`, preset.theme)).join("")}</select>`
        : kind === "title" ? `<select class="g-title">${(tags.titles || []).map((x) => opt(x.code, `${x.code} — ${x.name}`)).join("")}</select>`
        : kind === "tag" ? `<select class="g-tag">${(tags.tags || []).map((x) => opt(x.id, `${x.emoji || ""} ${x.text || ""}`)).join("")}</select>`
        : `<label class="fl sm"><span>${t("x_amount")}</span><input type="number" class="g-amount" value="50" min="-500" max="500"></label>`}</div>
      <div class="bs-label">${t("x_ga_who")}</div><select class="g-who">${[["all", t("x_who_all")], ["active", t("x_who_active")], ["players", t("x_who_players")],
        ["accounts", t("x_who_accounts")], ["bale", t("x_who_bale")], ["online", t("x_who_online")]].map(([k, l]) => opt(k, l, "all")).join("")}</select>
      <div class="row-f"><label class="fl sm"><span>${t("x_days")}</span><input type="number" class="g-days" value="7" min="1"></label>
        <label class="fl sm"><span>${t("x_min_elo")}</span><input type="number" class="g-min"></label><label class="fl sm"><span>${t("x_max_elo")}</span><input type="number" class="g-max"></label></div>
      <label class="fl"><span>📣 ${t("x_ga_msg")}</span><input class="g-msg" maxlength="500" dir="auto"></label>
      <div class="row-b"><button class="btn primary g-go" ${c.owner ? "" : "disabled"}>🎁 ${t("x_ga_go")}</button>
        ${kind === "badge" ? `<button class="btn danger g-take" ${c.owner ? "" : "disabled"}>${t("x_take_all")}</button>` : ""}</div>
      <div class="g-res"></div></div>`;
    el.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => { kind = b.dataset.k; draw(); });
    const q = (s) => el.querySelector(s);
    q(".g-go").onclick = async () => {
      const body = { kind, who: q(".g-who").value, days: +q(".g-days").value || 7, min_elo: q(".g-min").value, max_elo: q(".g-max").value,
        bale: !!q(".g-msg").value.trim(), text: q(".g-msg").value };
      if (kind === "badge") body.code = q(".g-code").value;
      if (kind === "theme") body.theme = q(".g-theme").value;
      if (kind === "title") body.code = q(".g-title").value;
      if (kind === "tag") body.tag = +q(".g-tag").value;
      if (kind === "rating" || kind === "puzzle") body.amount = +q(".g-amount").value;
      if (!(await confirmBox(`${t("x_ga_go")} → ${q(".g-who").selectedOptions[0].textContent}?`, t("x_ga_go"), t("cancel")))) return;
      const x = await c.P("adm_give_all", body);
      if (x.ok) { q(".g-res").innerHTML = `<p class="good">✓ ${t("x_given", { n: x.given, m: x.matched })}</p>`; toast("🎁 ✓", "good"); }
    };
    const take = q(".g-take");
    if (take) take.onclick = async () => {
      if (!(await confirmBox(t("x_take_all") + "?", t("x_take_all"), t("cancel")))) return;
      const x = await c.P("adm_take_all", { code: q(".g-code").value });
      if (x.ok) q(".g-res").innerHTML = `<p class="good">✓ −${x.taken}</p>`;
    };
  };
  draw();
}

// ───────────────────────────── 🎲 community modes ─────────────────────────────
export async function modes(el, c) {
  const r = await c.A("adm_modes");
  if (r.error) { el.innerHTML = `<div class="card">${esc(r.error)}</div>`; return; }
  el.innerHTML = `<div class="card"><div class="mlist">${r.modes.map((m) => `<div class="mrow${m.deleted ? " off" : ""}">
    <div><b dir="auto">${esc(m.emoji)} ${esc(m.name)}</b>${m.featured ? " ⭐" : ""}${m.public ? "" : " 🔒"} <span class="muted small">${t("by_x", { name: esc(m.by || "?") })} · ▶ ${m.plays} · ♥ ${m.likes}</span>
      <div class="small muted" dir="auto">${esc((m.rules || []).join(" · "))}</div>${m.descr ? `<div class="small" dir="auto">${esc(m.descr)}</div>` : ""}</div>
    <div class="row-b"><a class="btn sm" href="#/mode/m${m.id}" target="_blank">▶</a>
      <button class="btn sm" data-act="${m.featured ? "unfeature" : "feature"}" data-id="${m.id}">${m.featured ? t("x_unfeature") : "⭐ " + t("x_feature")}</button>
      <button class="btn sm ${m.deleted ? "" : "danger"}" data-act="${m.deleted ? "restore" : "delete"}" data-id="${m.id}">${m.deleted ? t("x_restore") : "🗑"}</button></div></div>`).join("") || `<p class="muted" dir="auto">🎲 ${t("x_no_modes")}</p>`}</div></div>`;
  el.querySelectorAll("[data-act]").forEach((b) => b.onclick = async () => { if ((await c.P("adm_mode", { id: +b.dataset.id, action: b.dataset.act })).ok) c.go("modes"); });
}

export const V = "ffa8bb0e87";
