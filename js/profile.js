// Player profiles (#/u/<username>, #/p/<id>), the leaderboard (#/leaderboard) and the achievements list.
import * as api from "./api.js?v=5bdc901d4f";
import { t, fa } from "./i18n.js?v=5bdc901d4f";
import "./i18n3.js?v=5bdc901d4f";
import { esc, toast, modal, titleHtml, tagHtml, nameHtml, profileHref, dateText, timeAgo } from "./util.js?v=5bdc901d4f";
import { current } from "./session.js?v=5bdc901d4f";

const L = () => (fa() ? "fa" : "en");
const cache = {};
export async function achList() {
  const k = L();
  if (!cache[k]) cache[k] = api.pubGet("achievements", { l: k }).catch(() => { delete cache[k]; return { list: [], rarity: {}, cats: {}, titles: [] }; });
  return cache[k];
}

const RAR = { common: "#9e9e9e", uncommon: "#4caf50", rare: "#2196f3", epic: "#9c27b0", legendary: "#ff9800", exotic: "#ff2bd6" };

function graph(hist) {
  if (!hist || hist.length < 2) return `<div class="muted small">—</div>`;
  const W = 600, H = 140, P = 8;
  const ys = hist.map((p) => p.elo);
  const lo = Math.min(...ys) - 10, hi = Math.max(...ys) + 10;
  const x = (i) => P + (i / (hist.length - 1)) * (W - 2 * P);
  const y = (v) => H - P - ((v - lo) / Math.max(1, hi - lo)) * (H - 2 * P);
  const pts = hist.map((p, i) => `${x(i).toFixed(1)},${y(p.elo).toFixed(1)}`).join(" ");
  return `<svg class="rgraph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <polygon points="${P},${H - P} ${pts} ${W - P},${H - P}" fill="var(--green)" opacity=".14"/>
    <polyline points="${pts}" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linejoin="round"/>
    <text x="${W - P}" y="14" text-anchor="end" fill="#aaa" font-size="12">${hi - 10}</text>
    <text x="${W - P}" y="${H - 12}" text-anchor="end" fill="#aaa" font-size="12">${lo + 10}</text></svg>`;
}

export async function renderProfile(view, nav, { user, pid }) {
  view.innerHTML = `<div class="page prof-page"><div class="spin center"></div></div>`;
  let r;
  try { r = await api.pubGet("profile", { u: user || "", p: pid || "", l: L(), t: api.auth() || "" }); }
  catch { view.innerHTML = `<div class="page"><div class="card">${t("offline")}</div></div>`; return { destroy() {} }; }
  if (!r.profile) { view.innerHTML = `<div class="page"><div class="card">${esc(r.error || "?")}</div></div>`; return { destroy() {} }; }
  const p = r.profile;
  const all = await achList();
  const byCode = Object.fromEntries(all.list.map((a) => [a.code, a]));
  const have = p.ach.have || {};
  let filter = "all";
  const wr = p.games ? Math.round((100 * p.wins) / p.games) : 0;
  const nextTitle = (all.titles || []).filter((x) => x.rating && !(p.titles || []).includes(x.code)).sort((a, b) => a.rating - b.rating)[0];
  const share = location.href.split("#")[0] + (p.username ? `#/u/${encodeURIComponent(p.username)}` : `#/p/${p.pid}`);
  const showcase = (p.showcase && p.showcase.length ? p.showcase : (p.ach.rarest || [])).slice(0, 3);

  view.innerHTML = `<div class="page prof-page">
    ${p.closed ? `<div class="closed-bar">⛔ ${t("closed_fp")}</div>` : ""}
    <div class="card prof-head">
      <div class="ph-av ${p.role === "owner" ? "owner" : ""}"><span class="pc" data-c="wK"></span></div>
      <div class="ph-main">
        <div class="ph-name">${nameHtml(p, { tag: false })}${p.role && p.role !== "user" ? `<span class="role r-${p.role}">${t("role_" + p.role)}</span>` : ""}</div>
        ${p.tag ? `<div class="ph-tag">${tagHtml(p.tag, "lg")}</div>` : ""}
        <div class="ph-sub"><span class="tierp" style="background:${esc(p.tier.color)}">${esc(p.tier.name)}</span>
          ${p.rank ? `<span>${t("rank_n", { n: p.rank })}</span>` : ""}<span>${t("joined", { d: dateText(p.created, fa()) })}</span>
          ${p.linked ? `<span class="muted">· ${t("bale_player")}</span>` : ""}</div>
        ${p.bio ? `<p class="ph-bio" dir="auto">${esc(p.bio)}</p>` : ""}
      </div>
      <div class="ph-btns">
        <button class="btn" data-x="share">🔗 ${t("share_profile")}</button>
        ${p.me ? `<a class="btn" href="#/settings?tab=profile">✏️ ${t("edit_profile")}</a>${api.botLink() ? `<a class="btn bale" href="${api.botLink()}?start=flex" target="_blank" rel="noopener">💪 ${t("flex_bale")}</a>` : ""}`
          : (api.auth() ? `<button class="btn ghost" data-x="report">⚑ ${t("report")}</button>` : "")}
      </div>
    </div>
    <div class="showcase-row">${[0, 1, 2].map((i) => {
      const a = byCode[showcase[i]];
      return a ? `<div class="sc-big r-${a.rarity}"><span class="e">${esc(a.emoji)}</span><b dir="auto">${esc(a.name)}</b><span class="r" style="color:${RAR[a.rarity]}">${t("r_" + a.rarity)} · ${t("players_have", { p: p.rarity?.[a.code] ?? a.pct })}</span></div>`
        : `<div class="sc-big empty"><span class="e">✦</span><b>${t("showcase")}</b></div>`;
    }).join("")}</div>
    <div class="stat-grid">
      <div class="stat big"><span class="v">${p.elo}</span><span class="l">${t("rating")}</span><span class="s">${t("peak")} ${p.peak}</span></div>
      <div class="stat"><span class="v">${p.puzzle_rating}</span><span class="l">${t("puzzle_rating")}</span><span class="s">🧩 ${p.puzzles}</span></div>
      <div class="stat"><span class="v">${p.wins}<small>/${p.losses}/${p.draws}</small></span><span class="l">${t("record")}</span><span class="s">${t("win_rate")} ${wr}%</span></div>
      <div class="stat"><span class="v">${p.best_streak}</span><span class="l">${t("best_streak")}</span><span class="s">${p.games} ${t("games_n")}</span></div>
      <div class="stat gold"><span class="v">${p.ach.score}</span><span class="l">${t("ach_score")}</span><span class="s">${Object.keys(have).length}/${p.ach.total}</span></div>
      <div class="stat"><span class="v">${p.bot_wins || 0}<small>/${p.bot_games || 0}</small></span><span class="l">🤖 ${t("vs_bots")}</span><span class="s">✓ ${p.bots_beaten || 0}</span></div>
      ${p.ai_games ? `<div class="stat ai"><span class="v">${p.ai_wins || 0}<small>/${p.ai_games}</small></span><span class="l">🧠 ${t("vs_ai")}</span><span class="s">🤡</span></div>` : ""}
    </div>
    ${(p.modes && p.modes.length) || (p.made && p.made.length) ? `<div class="card modes-strip">
      ${p.modes && p.modes.length ? `<h2>🎲 ${t("modes_played")}</h2><div class="chips">${p.modes.map((m) => `<span class="chip">${esc(m.emoji)} ${esc(m.name)}${m.wins ? ` · ${t("wins_in", { n: m.wins })}` : ""}</span>`).join("")}</div>` : ""}
      ${p.made && p.made.length ? `<h2>🛠 ${t("modes_made")}</h2><div class="chips">${p.made.map((m) => `<a class="chip" href="#/mode/m${m.id}">${esc(m.emoji)} ${esc(m.name)} · ♥ ${m.likes} · ▶ ${m.plays}</a>`).join("")}</div>` : ""}</div>` : ""}
    <div class="prof-cols">
      <div class="card"><h2>📈 ${t("rating_history")}</h2>${graph(p.history)}
        <h2>🎖 ${t("titles")}</h2><div class="ttl-row">${(p.titles || []).map((c) => { const x = (all.titles || []).find((y) => y.code === c); return `<span class="ttl-big" title="${esc(x ? x.name : c)}">${titleHtml(c, x ? x.color : null)} <span class="muted small">${esc(x ? x.name : "")}</span></span>`; }).join("") || `<span class="muted small">—</span>`}</div>
        ${nextTitle ? `<div class="next-t"><div class="small muted">${t("next_title", { code: nextTitle.code, r: nextTitle.rating })}</div><div class="bar"><i style="width:${Math.min(100, Math.round((100 * p.peak) / nextTitle.rating))}%"></i></div></div>` : ""}
        <h2>♟ ${t("recent_games")}</h2><div class="glist">${(p.recent || []).map((g) => `<a class="grow ${g.outcome}" href="#/review/${esc(g.review)}">
            <span class="gi">${{ win: "🏆", loss: "✕", draw: "½", aborted: "—" }[g.outcome] || ""}</span>
            <span class="go" dir="auto">${g.mode ? `<span title="${esc(g.mode.name)}">${esc(g.mode.emoji)}</span> ` : ""}${t("vs")} ${esc(g.opp)}</span><span class="gt">${esc(g.tc === "none" ? "♾" : g.tc || "")}${g.rated ? " · ★" : ""}</span>
            <span class="gd ${g.delta > 0 ? "up" : g.delta < 0 ? "down" : ""}">${g.rated && g.delta ? (g.delta > 0 ? "+" : "") + g.delta : ""}</span>
            <span class="ga muted small">${timeAgo(g.ts, fa())}</span></a>`).join("") || `<div class="muted small">${t("no_games")}</div>`}</div>
      </div>
      <div class="card ach-card"><h2>🏅 ${t("badges")} <span class="muted small">${Object.keys(have).length}/${p.ach.total} · ⭐ ${p.ach.score}</span></h2>
        <div class="seg ach-f"></div><div class="ach-grid"></div></div>
    </div></div>`;

  const cats = [["all", t("all")], ["have", t("unlocked")], ...Object.entries(all.cats || {})];
  const fbox = view.querySelector(".ach-f");
  fbox.innerHTML = cats.map(([k, l]) => `<button data-f="${k}" class="${k === filter ? "on" : ""}">${esc(l)}</button>`).join("");
  const prog = (p.me && current() && current().progress) || {};
  const drawAch = () => {
    // retired / switched-off badges only show for the players who have them
    const list = all.list.filter((a) => (!a.retired || have[a.code]) &&
      (filter === "all" || (filter === "have" ? have[a.code] : a.cat === filter)));
    list.sort((a, b) => (!!have[b.code] - !!have[a.code]) || ((b.cat === "exotic") - (a.cat === "exotic")) || (b.points - a.points));
    view.querySelector(".ach-grid").innerHTML = list.map((a) => {
      const got = !!have[a.code];
      const secret = a.hidden && !got;
      const pr = !got && prog[a.code] ? ` · ${t("progress")} ${prog[a.code]}` : "";
      return `<div class="ach ${got ? "got" : "lock"} r-${a.rarity}${a.cat === "exotic" ? " exotic" : ""}" title="${esc(secret ? t("hidden_ach") : a.desc)}">
        <span class="e">${secret ? "❔" : esc(a.emoji)}</span><span class="n" dir="auto">${esc(secret ? "???" : a.name)}</span>
        <span class="d" dir="auto">${esc(secret ? t("hidden_ach") : a.desc)}</span>
        <span class="r" style="color:${RAR[a.rarity] || "#999"}">${t("r_" + a.rarity)} · ${a.points} · ${a.pct}%${a.retired ? " · " + t("retired") : ""}${pr}</span></div>`;
    }).join("");
  };
  fbox.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { filter = b.dataset.f; fbox.querySelectorAll("[data-f]").forEach((x) => x.classList.toggle("on", x === b)); drawAch(); });
  drawAch();
  view.querySelector('[data-x="share"]').onclick = () => navigator.clipboard?.writeText(share).then(() => toast(t("copied")), () => toast(share));
  const rep = view.querySelector('[data-x="report"]');
  if (rep) rep.onclick = () => reportDialog(p);
  return { destroy() {} };
}

export function reportDialog(p) {
  const kinds = [["cheat", t("report_cheat")], ["abuse", t("report_abuse")], ["name", t("report_name")], ["other", t("report_other")]];
  let kind = "cheat";
  const body = document.createElement("div");
  body.innerHTML = `<p class="muted">${t("report_why")}</p><div class="seg rep-k">${kinds.map(([k, l]) => `<button data-k="${k}" class="${k === kind ? "on" : ""}">${esc(l)}</button>`).join("")}</div>
    <textarea class="rep-t" rows="3" maxlength="300" dir="auto"></textarea>`;
  body.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => { kind = b.dataset.k; body.querySelectorAll("[data-k]").forEach((x) => x.classList.toggle("on", x === b)); });
  modal({ title: `⚑ ${t("report")}: ${esc(p.name)}`, body, buttons: [
    { label: t("cancel"), cls: "ghost" },
    { label: t("report"), cls: "danger", onClick: async () => {
      try { await api.post("report_player", { t: api.auth(), pid: p.pid, kind, reason: body.querySelector(".rep-t").value }); toast(t("report_sent"), "good"); }
      catch { toast(t("offline"), "bad"); }
    } },
  ] });
}

// ───────── #/leaderboard ─────────
export async function renderLeaderboard(view, nav, params) {
  let by = params.by || "elo";
  const me = current();
  async function draw() {
    view.innerHTML = `<div class="page lb-page"><div class="page-h"><h1>🏆 ${t("leaderboard")}</h1></div>
      <div class="seg lb-tabs">${[["elo", t("lb_rating")], ["puzzle", t("lb_puzzles")], ["wins", t("lb_wins")], ["ach", t("lb_ach")]]
        .map(([k, l]) => `<button data-by="${k}" class="${by === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="card lb-list"><div class="spin center"></div></div></div>`;
    view.querySelectorAll("[data-by]").forEach((b) => b.onclick = () => { by = b.dataset.by; draw(); });
    let r;
    try { r = await api.pubGet("leaderboard", { by, l: L() }); } catch { view.querySelector(".lb-list").innerHTML = t("offline"); return; }
    const box = view.querySelector(".lb-list");
    if (!r.players.length) { box.innerHTML = `<div class="muted">${t("lb_empty")}</div>`; return; }
    box.innerHTML = r.players.map((p, i) => {
      const val = by === "puzzle" ? p.puzzle : by === "wins" ? p.wins : by === "ach" ? p.score : p.elo;
      const sub = by === "puzzle" ? `🧩 ${p.puzzles}` : by === "ach" ? "" : `${p.wins}/${p.losses}/${p.draws}`;
      const mine = me && me.pid === p.pid;
      return `<a class="lb-row${mine ? " me" : ""}${i < 3 ? " top" + (i + 1) : ""}" href="${profileHref(p)}">
        <span class="lb-n">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
        <span class="lb-name">${nameHtml(p)}${p.show && p.show.length ? `<span class="showc">${p.show.map((e) => `<i>${esc(e)}</i>`).join("")}</span>` : ""}</span>
        <span class="tierp sm" style="background:${esc(p.tier.color)}">${esc(p.tier.name)}</span>
        <span class="lb-sub muted small">${sub}</span><span class="lb-v">${val}</span></a>`;
    }).join("");
  }
  draw();
  return { destroy() {} };
}
export const V = "5bdc901d4f";  // the site version this file belongs to (main.js reloads the page after an update)
