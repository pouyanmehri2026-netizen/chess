// Log in / sign up (e-mail code, password, "log in with Bale", forgot password) and the Settings page
// (board design, title & tag, showcase, bio, flag, account security, linking Bale).
import * as api from "./api.js?v=ffb4d75985";
import { t, fa } from "./i18n.js?v=ffb4d75985";
import { store, esc, toast, sleep, titleHtml, tagHtml, nameHtml, confirmBox } from "./util.js?v=ffb4d75985";
import { loadMe, setSession, logout, applyTheme, current } from "./session.js?v=ffb4d75985";

const L = () => (fa() ? "fa" : "en");
const FLAGS = ["", "🇮🇷", "🇦🇫", "🇹🇯", "🇹🇷", "🇮🇶", "🇦🇪", "🇸🇦", "🇦🇿", "🇦🇲", "🇬🇪", "🇷🇺", "🇩🇪", "🇬🇧", "🇫🇷", "🇮🇹",
  "🇪🇸", "🇳🇱", "🇸🇪", "🇳🇴", "🇺🇸", "🇨🇦", "🇦🇺", "🇮🇳", "🇨🇳", "🇯🇵", "🇰🇷", "🇧🇷", "🇦🇷", "🇺🇦", "🇵🇰", "🇪🇬", "🏳️‍🌈", "🏴‍☠️"];

let themesCache = null;
export async function loadThemes(force = false) {
  if (themesCache && !force) return themesCache;
  try {  // live from the server: includes the Board Designer's newest boards
    const { loadLiveThemes } = await import("./live.js?v=ffb4d75985");
    const live = await loadLiveThemes(force);
    if (live && live.length) { themesCache = live; return themesCache; }
  } catch { /* offline */ }
  try { themesCache = await (await fetch(`data/themes.json?v=ffb4d75985`)).json(); } catch { themesCache = []; }
  return themesCache;
}

// a little board preview with the design's colours, pattern, animation and its (glowing, animated) pieces
export function themePreview(th) {
  return `<span class="th-prev" data-k="${esc(th.key)}" style="--light:${esc(th.light)};--dark:${esc(th.dark)}">` +
    `<span class="pc" data-c="bK"></span><span class="pc" data-c="wQ"></span></span>`;
}

function field(name, label, type = "text", extra = "") {
  return `<label class="fl"><span>${label}</span><input name="${name}" type="${type}" ${extra}></label>`;
}

function errBox(form, msg) {
  const e = form.querySelector(".ferr");
  if (e) { e.textContent = msg || ""; e.hidden = !msg; }
}

async function done(r, nav, next) {
  setSession(r.token, r.account);
  const me = await loadMe();
  toast(t("welcome_user", { name: r.account?.username || me?.name || "" }), "good");
  // came from Bale with a key for another (not yet linked) player? offer to link them
  const u = store.get("u");
  if (u && r.account && !r.account.linked && !r.created_with_key) {
    const yes = await confirmBox(t("link_this_bale", { name: r.account.username }), t("link_yes"), t("not_now"));
    if (yes) {
      try {
        const x = await api.post("link_key", { t: r.token, u, l: L() });
        if (x.error) toast(x.error, "bad"); else { toast(t("linked_ok"), "good"); await loadMe(); }
      } catch { toast(t("offline"), "bad"); }
    }
  }
  if (r.account) store.del("u");  // the session is the identity from now on
  nav(next || "#/play");
}

// ───────── #/login ─────────
export function renderLogin(view, nav, params) {
  let alive = true;
  let mode = params.mode === "signup" ? "signup" : "login";
  const next = params.next ? decodeURIComponent(params.next) : "#/play";
  const fromBale = !!store.get("u") && !store.get("sess");
  let mailOn = true;
  api.pubGet("ping").then((p) => { mailOn = !!p.mail; if (mode === "signup") draw(); }).catch(() => {});

  function draw(extra) {
    if (!alive) return;
    view.innerHTML = `<div class="page auth-page"><div class="auth-card">
      <div class="auth-logo"><span class="pc" data-c="wN"></span><b>Chess</b></div>
      <div class="seg auth-tabs"><button data-m="login" class="${mode === "login" ? "on" : ""}">${t("login")}</button><button data-m="signup" class="${mode === "signup" ? "on" : ""}">${t("signup")}</button></div>
      <div class="auth-body"></div></div></div>`;
    view.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { mode = b.dataset.m; draw(); });
    const body = view.querySelector(".auth-body");
    if (extra) { body.appendChild(extra); return; }
    if (mode === "login") body.innerHTML = loginForm(); else body.innerHTML = signupForm();
    wire(body);
  }

  const baleBtn = () => `<div class="or"><span>${t("or")}</span></div><button type="button" class="btn bale big wide" data-x="bale">${t("with_bale")}</button>`;

  function loginForm() {
    return `<form class="aform" data-f="login"><h1>${t("login_title")}</h1>
      ${field("login", t("login_or_email"), "text", 'autocomplete="username" required dir="auto"')}
      ${field("password", t("password"), "password", 'autocomplete="current-password" required')}
      <div class="ferr" hidden></div>
      <button class="btn primary big wide">${t("login_btn")}</button>
      <div class="alinks"><a href="#" data-x="forgot">${t("forgot")}</a><a href="#" data-x="codelogin">${t("code_login")}</a></div>
      ${baleBtn()}</form>`;
  }

  function signupForm() {
    return `<form class="aform" data-f="signup"><h1>${t("signup_title")}</h1>
      ${fromBale ? `<p class="note small">✅ ${t("signup_bale_note")}</p>` : ""}
      ${field("username", t("username"), "text", `autocomplete="username" required minlength="3" maxlength="20" dir="auto" placeholder="${t("user_hint")}"`)}
      ${field("email", t("email"), "email", `autocomplete="email" dir="ltr" placeholder="${t("email_hint")}" ${mailOn ? "required" : ""}`)}
      ${field("password", t("password"), "password", `autocomplete="new-password" required minlength="6" placeholder="${t("pass_hint")}"`)}
      ${mailOn ? "" : `<p class="muted small">${t("mail_off_note")}</p>`}
      <div class="ferr" hidden></div>
      <button class="btn primary big wide">${t("signup_btn")}</button>
      ${baleBtn()}</form>`;
  }

  function wire(root) {
    const form = root.querySelector("form");
    if (form) form.onsubmit = (e) => { e.preventDefault(); submit(form); };
    root.querySelectorAll("[data-x]").forEach((a) => a.onclick = (e) => {
      e.preventDefault();
      const x = a.dataset.x;
      if (x === "bale") baleLogin();
      if (x === "forgot") codeFlow("reset");
      if (x === "codelogin") codeFlow("login");
    });
  }

  async function submit(form) {
    const btn = form.querySelector("button.primary");
    const data = Object.fromEntries(new FormData(form).entries());
    errBox(form, "");
    btn.disabled = true;
    try {
      if (form.dataset.f === "login") {
        const r = await api.pub("login", { login: data.login, password: data.password, l: L() });
        if (r.error) errBox(form, r.error); else return done(r, nav, next);
      } else {
        const body = { username: data.username, email: data.email, password: data.password, l: L() };
        if (fromBale) body.u = store.get("u");
        const r = await api.pub("signup", body);
        if (r.error) errBox(form, r.error);
        else if (r.token) { r.created_with_key = fromBale; return done(r, nav, next); }
        else if (r.ticket) codeStep(r, async (code) => {
          const x = await api.pub("signup_verify", { ticket: r.ticket, code, l: L() });
          if (x.token) { x.created_with_key = fromBale; done(x, nav, next); }
          return x;
        });
      }
    } catch { errBox(form, t("offline")); }
    btn.disabled = false;
  }

  function codeStep(r, verify, withPassword = false) {
    const box = document.createElement("div");
    box.innerHTML = `<form class="aform"><h1>🔐 ${t("code_label")}</h1>
      <p class="muted">${esc(t("code_sent", { to: r.to || (r.via === "bale" ? "Bale" : "") }))}</p>
      ${r.via === "bale" ? "" : `<p class="spam-hint">📥 ${t("code_spam_hint")}</p>`}
      <input class="code-in" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr" placeholder="••••••" required>
      ${withPassword ? field("password", t("new_password"), "password", 'autocomplete="new-password" minlength="6" required') : ""}
      <div class="ferr" hidden></div>
      <button class="btn primary big wide">${withPassword ? t("reset_btn") : t("verify_btn")}</button>
      <div class="alinks"><a href="#" data-x="back">${t("back_link")}</a></div></form>`;
    draw(box);
    const form = box.querySelector("form");
    const inp = form.querySelector(".code-in");
    setTimeout(() => inp.focus(), 50);
    inp.oninput = () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 6); if (inp.value.length === 6 && !withPassword) form.requestSubmit(); };
    form.querySelector('[data-x="back"]').onclick = (e) => { e.preventDefault(); draw(); };
    form.onsubmit = async (e) => {
      e.preventDefault();
      errBox(form, "");
      const btn = form.querySelector("button.primary");
      btn.disabled = true;
      try {
        const x = await verify(inp.value, form.querySelector('[name="password"]')?.value);
        if (x && x.error) errBox(form, x.error);
      } catch { errBox(form, t("offline")); }
      btn.disabled = false;
    };
  }

  function codeFlow(purpose) {
    const box = document.createElement("div");
    box.innerHTML = `<form class="aform"><h1>${purpose === "reset" ? t("forgot") : t("code_login")}</h1>
      ${field("login", t("login_or_email"), "text", 'required dir="auto" autocomplete="username"')}
      <div class="ferr" hidden></div><button class="btn primary big wide">${t("send_code")}</button>
      <div class="alinks"><a href="#" data-x="back">${t("back_link")}</a></div></form>`;
    draw(box);
    const form = box.querySelector("form");
    form.querySelector('[data-x="back"]').onclick = (e) => { e.preventDefault(); draw(); };
    form.onsubmit = async (e) => {
      e.preventDefault();
      errBox(form, "");
      try {
        const r = await api.pub("code_start", { login: form.login.value, purpose, l: L() });
        if (r.error) { errBox(form, r.error); return; }
        codeStep(r, async (code, password) => {
          const x = await api.pub("code_finish", { ticket: r.ticket, code, password, l: L() });
          if (x.token) done(x, nav, next);
          return x;
        }, purpose === "reset");
      } catch { errBox(form, t("offline")); }
    };
  }

  async function baleLogin() {
    let r;
    try { r = await api.pub("bale_login", { l: L() }); } catch { toast(t("offline"), "bad"); return; }
    if (r.error) { toast(r.error, "bad"); return; }
    const box = document.createElement("div");
    box.innerHTML = `<div class="aform"><h1>${t("with_bale")}</h1><p class="muted">${t("with_bale_sub")}</p>
      <a class="btn bale big wide" href="${esc(r.link)}" target="_blank" rel="noopener">${t("open_in_bale")} ↗</a>
      <div class="bwait"><div class="spin"></div><span>${t("bale_wait")}</span></div>
      <div class="alinks"><a href="#" data-x="back">${t("back_link")}</a></div></div>`;
    draw(box);
    let waiting = true;
    box.querySelector('[data-x="back"]').onclick = (e) => { e.preventDefault(); waiting = false; draw(); };
    const t0 = Date.now();
    while (alive && waiting && Date.now() - t0 < 10 * 60 * 1000) {
      try {
        const x = await api.pubGet("bale_login_poll", { nonce: r.nonce, l: L() }, 26000);
        if (x.token) { done(x, nav, next); return; }
        if (x.error) { toast(x.error, "bad"); draw(); return; }
      } catch { await sleep(1500); }
    }
  }

  draw();
  return { destroy() { alive = false; } };
}

// ───────── #/settings ─────────
export async function renderSettings(view, nav, params) {
  let tab = params.tab || store.get("setTab") || "look";
  const a = api.auth();
  if (!a) { nav("#/login?next=" + encodeURIComponent("#/settings")); return { destroy() {} }; }
  view.innerHTML = `<div class="page set-page"><div class="spin center"></div></div>`;
  let me = await loadMe();
  if (!me) { view.innerHTML = `<div class="page"><div class="card">${t("offline")}</div></div>`; return { destroy() {} }; }
  const themes = await loadThemes();

  function draw() {
    store.set("setTab", tab);
    const acc = me.account;
    view.innerHTML = `<div class="page set-page">
      <div class="page-h"><h1>⚙️ ${t("settings")}</h1></div>
      <div class="seg set-tabs">${[["look", "🎨 " + t("tab_look")], ["profile", "💪 " + t("tab_profile")], ["account", "🔐 " + t("tab_account")]]
        .map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="set-body"></div></div>`;
    view.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.tab; draw(); });
    const body = view.querySelector(".set-body");
    if (tab === "look") look(body);
    else if (tab === "profile") profile(body);
    else account(body, acc);
  }

  function look(body) {
    const unlocked = new Set(me.themes || []);
    const list = themes.filter((th) => !th.secret || unlocked.has(th.key));  // secret boards appear once you have them
    const dots = store.get("dots") || "bold";
    body.innerHTML = `<div class="card"><h2>${t("board_design")}</h2><p class="muted small">${t("board_design_sub")}</p>
      <div class="theme-grid">${list.map((th) => {
        const ok = unlocked.has(th.key);
        return `<button class="th-card${me.theme === th.key ? " on" : ""}${ok ? "" : " lock"}${th.glow ? " glow" : ""}${th.custom ? " special" : ""}" data-k="${th.key}" style="--acc:${th.accent};--fr:${th.frame}">
          <span class="th-mini">${themePreview(th)}</span><span class="th-n">${esc(fa() ? th.fa : th.en)}</span>
          ${th.custom ? `<span class="th-tag sp">✨ ${t("custom_board")}</span>` : th.new ? `<span class="th-tag">${t("new_tag")}</span>` : ""}
          ${ok ? (me.theme === th.key ? `<span class="th-ok">✓</span>` : "") : `<span class="th-lock">🔒 ${esc(fa() ? th.unlock_fa : th.unlock_en)}</span>`}</button>`;
      }).join("")}</div></div>
      <div class="card"><h2>🎯 ${t("dots_style")}</h2><p class="muted small">${t("dots_sub")}</p>
        <div class="dot-pick">${[["bold", t("dots_bold")], ["ring", t("dots_ring")], ["glow", t("dots_glow")], ["big", t("dots_big")], ["classic", t("dots_classic")]]
          .map(([k, l]) => `<button class="dp${dots === k ? " on" : ""}" data-dots="${k}"><span class="dp-demo" data-demo="${k}"><i class="l"><b></b></i><i class="d"><b></b></i><i class="d cap"><b></b><span class="pc" data-c="bN"></span></i><i class="l cap"><b></b><span class="pc" data-c="bP"></span></i></span><span>${l}</span></button>`).join("")}</div>
        <label class="ck"><input type="checkbox" class="fx-on" ${store.get("fx") !== false ? "checked" : ""}> ${t("fx_toggle")}</label></div>`;
    body.querySelectorAll("[data-dots]").forEach((b) => b.onclick = async () => {
      const { setDots } = await import("./live.js?v=ffb4d75985");
      setDots(b.dataset.dots);
      body.querySelectorAll("[data-dots]").forEach((x) => x.classList.toggle("on", x === b));
    });
    body.querySelector(".fx-on").onchange = async (e) => { const { setFx } = await import("./live.js?v=ffb4d75985"); setFx(e.target.checked); };
    body.querySelectorAll(".th-card").forEach((b) => b.onclick = async () => {
      const k = b.dataset.k;
      const th = themes.find((x) => x.key === k);
      if (!unlocked.has(k)) { toast("🔒 " + (fa() ? th.unlock_fa : th.unlock_en)); return; }
      applyTheme(k);
      try {
        const r = await api.post("settings", { t: a, theme: k, l: L() });
        if (r.error) { toast(r.error, "bad"); applyTheme(me.theme); return; }
        me.theme = k;
        toast(t("theme_changed") + " · " + (fa() ? th.fa : th.en), "good");
        look(body);
      } catch { toast(t("offline"), "bad"); }
    });
  }

  function profile(body) {
    const owned = me.titles || [], tags = me.tags || [];
    const showcase = new Set(me.showcase || []);
    body.innerHTML = `<div class="card"><h2>${t("display_title")}</h2>
        <div class="preview-line"></div>
        <div class="seg ttl-pick">${[["auto", t("auto_best")], ["none", t("none")], ...owned.map((c) => [c, c])]
          .map(([v, l]) => `<button data-tt="${esc(v)}" class="${me.show_title === v ? "on" : ""}">${v !== "none" && v !== "auto" ? titleHtml(v, titleColor(v)) : esc(l)}</button>`).join("")}</div>
        ${owned.length ? "" : `<p class="muted small">${t("no_titles_yet")}</p>`}
        <h2>${t("display_tag")}</h2>
        <div class="seg tag-pick">${[[-1, t("auto_best")], [0, t("none")], ...tags.map((g) => [g.id, g])]
          .map(([v, l]) => `<button data-tg="${v}" class="${me.show_tag === v ? "on" : ""}">${typeof l === "string" ? esc(l) : tagHtml(l)}</button>`).join("")}</div>
        ${tags.length ? "" : `<p class="muted small">${t("no_tags_yet")}</p>`}</div>
      <div class="card"><h2>${t("showcase")} <span class="muted small">(${showcase.size}/3)</span></h2><p class="muted small">${t("showcase_sub")}</p>
        <div class="sc-grid"><div class="spin"></div></div></div>
      <div class="card"><h2>${t("bio")}</h2><textarea class="bio-in" maxlength="160" dir="auto" rows="2">${esc(me.bio || "")}</textarea>
        <h2>${t("flag")}</h2><div class="flag-pick">${FLAGS.map((f) => `<button data-fl="${f}" class="${(me.flag || "") === f ? "on" : ""}">${f || "—"}</button>`).join("")}</div>
        <button class="btn primary save-prof">${t("save")}</button></div>`;
    const prev = () => {
      const tt = me.show_title === "none" ? null : me.show_title === "auto" ? bestTitle(owned) : me.show_title;
      const tg = me.show_tag === 0 ? null : me.show_tag === -1 ? tags[0] : tags.find((x) => x.id === me.show_tag);
      body.querySelector(".preview-line").innerHTML = `<div class="pv-bar"><span class="pc" data-c="wK"></span>${nameHtml({ name: me.name, title: tt, title_color: titleColor(tt), tag: tg, flag: me.flag })}<span class="rt">(${me.elo})</span></div>`;
    };
    prev();
    const save = async (patch) => {
      try {
        const r = await api.post("settings", { t: a, ...patch, l: L() });
        if (r.error) { toast(r.error, "bad"); return false; }
        Object.assign(me, patch);
        toast(t("saved_ok"), "good");
        return true;
      } catch { toast(t("offline"), "bad"); return false; }
    };
    body.querySelectorAll("[data-tt]").forEach((b) => b.onclick = async () => { if (await save({ show_title: b.dataset.tt })) { body.querySelectorAll("[data-tt]").forEach((x) => x.classList.toggle("on", x === b)); prev(); } });
    body.querySelectorAll("[data-tg]").forEach((b) => b.onclick = async () => { if (await save({ show_tag: +b.dataset.tg })) { body.querySelectorAll("[data-tg]").forEach((x) => x.classList.toggle("on", x === b)); prev(); } });
    let flag = me.flag || "";
    body.querySelectorAll("[data-fl]").forEach((b) => b.onclick = () => { flag = b.dataset.fl; body.querySelectorAll("[data-fl]").forEach((x) => x.classList.toggle("on", x === b)); });
    body.querySelector(".save-prof").onclick = async () => { if (await save({ bio: body.querySelector(".bio-in").value, flag })) { me.flag = flag; prev(); } };
    // showcase: the player's achievements
    import("./profile.js?v=ffb4d75985").then(async ({ achList }) => {
      const all = await achList();
      const have = all.list.filter((x) => (me.ach_codes || []).includes(x.code));
      const grid = body.querySelector(".sc-grid");
      if (!have.length) { grid.innerHTML = `<p class="muted small">${t("no_ach_yet")}</p>`; return; }
      const drawSc = () => {
        grid.innerHTML = have.map((x) => `<button class="sc-item r-${x.rarity}${showcase.has(x.code) ? " on" : ""}" data-c="${x.code}" title="${esc(x.desc)}"><span class="sc-e">${esc(x.emoji)}</span><span class="sc-n">${esc(x.name)}</span></button>`).join("");
        grid.querySelectorAll(".sc-item").forEach((b) => b.onclick = async () => {
          const c = b.dataset.c;
          if (showcase.has(c)) showcase.delete(c); else { if (showcase.size >= 3) { toast(t("showcase_full")); return; } showcase.add(c); }
          if (await save({ showcase: [...showcase] })) { me.showcase = [...showcase]; drawSc(); body.querySelector(".card h2 .muted").textContent = `(${showcase.size}/3)`; }
        });
      };
      drawSc();
    });
  }

  function account(body, acc) {
    if (!acc) {
      body.innerHTML = `<div class="card"><p>${esc(t("guest_bale", { name: me.name }))}</p><p class="muted">${t("create_or_login")}</p>
        <div class="row-b"><a class="btn primary" href="#/login?mode=signup">${t("signup")}</a><a class="btn" href="#/login">${t("login")}</a></div></div>`;
      return;
    }
    body.innerHTML = `<div class="card acc-card">
        <div class="acc-row"><div><div class="muted small">${t("username")}</div><b dir="auto">${esc(acc.username)}</b> ${acc.role !== "user" ? `<span class="role r-${acc.role}">${t("role_" + acc.role)}</span>` : ""}</div></div>
        <form class="inline-f" data-f="user">${field("username", t("change_username"), "text", `value="${esc(acc.username)}" minlength="3" maxlength="20" dir="auto"`)}<button class="btn">${t("save")}</button></form>
        <div class="acc-row"><div><div class="muted small">${t("email")}</div><b dir="ltr">${esc(acc.email || "—")}</b>
          <span class="pill ${acc.email_ok ? "ok" : "warn"}">${acc.email_ok ? t("email_verified") : t("email_unverified")}</span></div></div>
        <form class="inline-f" data-f="email">${field("email", t("email"), "email", `value="${esc(acc.email || "")}" dir="ltr"`)}<button class="btn">${acc.email_ok ? t("set_email") : t("verify_email")}</button></form>
        <div class="code-slot"></div>
        <form class="inline-f" data-f="pass">${acc.has_password ? field("old", t("current_password"), "password", 'autocomplete="current-password"') : ""}${field("new", t("change_password"), "password", 'autocomplete="new-password" minlength="6"')}<button class="btn">${t("save")}</button></form>
      </div>
      <div class="card"><h2>🔗 Bale</h2>
        ${acc.linked ? `<p class="okline">✅ ${t("bale_linked")}</p>` : `<p>${t("bale_not_linked")}</p><p class="muted small">${t("link_bale_sub")}</p><button class="btn bale link-bale">${t("link_bale_btn")}</button>`}
      </div>
      <div class="card"><div class="row-b"><button class="btn ghost lo-all">${t("logout_all")}</button><button class="btn danger lo">${t("logout")}</button></div></div>`;
    const sess = store.get("sess");
    body.querySelector('[data-f="user"]').onsubmit = async (e) => {
      e.preventDefault();
      const r = await api.post("username", { t: sess, username: e.target.username.value, l: L() }).catch(() => ({ error: t("offline") }));
      if (r.error) toast(r.error, "bad"); else { toast(t("saved_ok"), "good"); me = await loadMe(); draw(); }
    };
    body.querySelector('[data-f="email"]').onsubmit = async (e) => {
      e.preventDefault();
      const r = await api.post("email_start", { t: sess, email: e.target.email.value, l: L() }).catch(() => ({ error: t("offline") }));
      if (r.error) { toast(r.error, r.saved ? "" : "bad"); if (r.saved) { me = await loadMe(); draw(); } return; }
      const slot = body.querySelector(".code-slot");
      slot.innerHTML = `<form class="inline-f"><p class="muted small">${esc(t("code_sent", { to: r.to }))}</p><p class="spam-hint">📥 ${t("code_spam_hint")}</p><input class="code-in sm" inputmode="numeric" maxlength="6" dir="ltr" placeholder="••••••"><button class="btn primary">${t("verify_btn")}</button></form>`;
      slot.querySelector("form").onsubmit = async (ev) => {
        ev.preventDefault();
        const x = await api.post("email_verify", { t: sess, ticket: r.ticket, code: slot.querySelector("input").value, l: L() }).catch(() => ({ error: t("offline") }));
        if (x.error) toast(x.error, "bad"); else { toast(t("saved_ok"), "good"); me = await loadMe(); draw(); }
      };
    };
    body.querySelector('[data-f="pass"]').onsubmit = async (e) => {
      e.preventDefault();
      const r = await api.post("password", { t: sess, old: e.target.old?.value || "", new: e.target.new.value, l: L() }).catch(() => ({ error: t("offline") }));
      if (r.error) toast(r.error, "bad"); else { toast(t("saved_ok"), "good"); e.target.reset(); }
    };
    const lb = body.querySelector(".link-bale");
    if (lb) lb.onclick = async () => {
      const r = await api.post("link_bale", { t: sess, l: L() }).catch(() => ({ error: t("offline") }));
      if (r.error) { toast(r.error, "bad"); return; }
      window.open(r.link, "_blank");
      lb.textContent = t("bale_wait");
      for (let i = 0; i < 60; i++) {
        await sleep(3000);
        const m = await loadMe();
        if (m && m.account && m.account.linked) { me = m; toast(t("linked_ok"), "good"); draw(); return; }
      }
    };
    body.querySelector(".lo-all").onclick = async () => { await logout(true); toast(t("saved_ok"), "good"); };
    body.querySelector(".lo").onclick = async () => { await logout(false); nav("#/play"); };
  }

  draw();
  return { destroy() {} };
}

const PRESTIGE = ["SGM", "GM", "IM", "WGM", "FM", "WIM", "CM", "WFM", "NM", "WCM", "WNM", "AGM", "AIM", "AFM", "ACM", "BOT"];
const COLORS = { SGM: "#f5b700", GM: "#c0392b", IM: "#d35400", WGM: "#c2185b", FM: "#2471a3", WIM: "#ad1457", CM: "#1e8449",
  WFM: "#880e4f", NM: "#7d3c98", WCM: "#6a1b9a", WNM: "#4a148c", AGM: "#0e6655", AIM: "#117a65", AFM: "#138d75", ACM: "#16a085", BOT: "#5b4b8a" };
export const titleColor = (c) => COLORS[c] || "#7c2929";
export function bestTitle(codes) { return PRESTIGE.find((c) => (codes || []).includes(c)) || null; }
export { current };
export const V = "ffb4d75985";  // the site version this file belongs to (main.js reloads the page after an update)
