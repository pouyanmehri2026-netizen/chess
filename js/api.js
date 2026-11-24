// Talks to the Chess bot's game server. The website itself can be hosted anywhere (GitHub Pages);
// the server address comes from the link (?s=…), the last one that worked, or server.json in the repo.
import { CONFIG } from "../config.js?v=0a2a0f3abe";
import { store } from "./util.js?v=0a2a0f3abe";

let base = null;
let connecting = null;

const clean = (u) => String(u || "").trim().replace(/\/+$/, "");

export function rememberServer(s) { if (s) store.set("server", clean(s)); }
export function server() { return base; }

async function fetchT(url, opts = {}, ms = 8000) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { cache: "no-store", ...opts, signal: ctl.signal }); } finally { clearTimeout(id); }
}

async function ping(b) {
  try {
    const r = await fetchT(b + "/api/pub/ping", {}, 6000);
    if (!r.ok) return false;
    const j = await r.json();
    return j && j.app === "chess";
  } catch { return false; }
}

function sameOrigin() {
  return location.protocol.startsWith("http") && !/\.github\.io$/i.test(location.hostname) ? location.origin : null;
}

async function published() {
  const repo = CONFIG.repo;
  const tries = [];
  if (repo) {
    tries.push(async () => (await fetchT(`https://api.github.com/repos/${repo}/contents/server.json`,
      { headers: { Accept: "application/vnd.github.raw+json" } }, 7000)).json());
    tries.push(async () => (await fetchT(`https://raw.githubusercontent.com/${repo}/${CONFIG.branch || "main"}/server.json?t=${Date.now()}`, {}, 7000)).json());
  }
  tries.push(async () => (await fetchT(`server.json?t=${Date.now()}`, {}, 7000)).json());
  for (const f of tries) {
    try { const j = await f(); if (j && j.api) return clean(j.api); } catch { /* next */ }
  }
  return null;
}

export function connect(force = false) {
  if (base && !force) return Promise.resolve(base);
  if (connecting) return connecting;
  connecting = (async () => {
    const seen = new Set();
    for (const c of [store.get("server"), sameOrigin()].map(clean).filter(Boolean)) {
      if (seen.has(c)) continue;
      seen.add(c);
      if (await ping(c)) { base = c; rememberServer(c); return c; }
    }
    const p = await published();
    if (p && !seen.has(p) && await ping(p)) { base = p; rememberServer(p); return p; }
    base = null;
    return null;
  })().finally(() => { connecting = null; });
  return connecting;
}

async function call(method, path, params, body, ms, retry) {
  const b = await connect();
  if (!b) throw new Error("offline");
  const qs = params && Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
  try {
    const r = await fetchT(`${b}/api/${path}${qs}`, method === "POST"
      ? { method, body: JSON.stringify(body || {}), headers: { "Content-Type": "text/plain;charset=UTF-8" } } : {}, ms);
    if (r.status >= 500) throw new Error("HTTP " + r.status);
    return await r.json();  // a tunnel's HTML error page also lands in catch -> find the server again
  } catch (e) {
    if (!retry) throw e;
    await connect(true);
    return call(method, path, params, body, ms, false);
  }
}

export const get = (path, params = {}, ms = 15000) => call("GET", path, params, null, ms, true);
export const post = (path, body = {}, ms = 20000) => call("POST", path, null, body, ms, true);
export const botLink = () => (CONFIG.bot ? `https://ble.ir/${CONFIG.bot}` : null);

// Who is using the website: a log-in session (account) or the key from a Bale link. Null = a visitor.
export const auth = () => store.get("sess") || store.get("u") || null;
export const loggedIn = () => !!store.get("sess");
// sign up / log in calls (no token yet)
export const pub = (path, body = {}, ms = 25000) => call("POST", "pub/" + path, null, body, ms, true);
export const pubGet = (path, params = {}, ms = 15000) => call("GET", "pub/" + path, params, null, ms, true);
