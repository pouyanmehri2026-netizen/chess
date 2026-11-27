// Stockfish 19 (lite, single-threaded WebAssembly) running in a Web Worker, right in the browser.
const JS = new URL("../engine/stockfish-19-lite-single.js?v=fd61796546", import.meta.url).href;
const WASM = new URL("../engine/stockfish-19-lite-single.wasm?v=fd61796546", import.meta.url).href;
export const MATE = 100000;

export class Engine {
  constructor() {
    this.listeners = new Set();
    this.queue = Promise.resolve();
    this.failed = false;
    try {
      this.w = new Worker(JS + "#" + encodeURIComponent(WASM));
      this.w.onmessage = (e) => { if (typeof e.data === "string") for (const f of [...this.listeners]) f(e.data); };
      this.w.onerror = () => { this.failed = true; };
    } catch { this.failed = true; }
    this.ready = this.failed ? Promise.reject(new Error("no engine"))
      : this.ask("uci", (l) => l === "uciok", 30000).then(() => {
        this.send("setoption name Hash value 16");
        return this.ask("isready", (l) => l === "readyok", 30000);
      });
    this.ready.catch(() => { this.failed = true; });
  }

  send(cmd) { if (this.w) this.w.postMessage(cmd); }

  waitFor(pred, ms) {
    return new Promise((resolve, reject) => {
      const f = (l) => { if (pred(l)) { clearTimeout(timer); this.listeners.delete(f); resolve(l); } };
      const timer = setTimeout(() => { this.listeners.delete(f); reject(new Error("engine timeout")); }, ms);
      this.listeners.add(f);
    });
  }

  ask(cmd, pred, ms) { const p = this.waitFor(pred, ms); this.send(cmd); return p; }

  // Search one position. Returns { best, lines: [{ pv, cp, mate, depth }] } — scores from the side to move.
  search(opts) {
    const job = this.queue.then(() => this._search(opts));
    this.queue = job.catch(() => {});
    return job;
  }

  async _search({ fen, depth, movetime, nodes, multipv = 1, skill = 20, elo = null }) {
    await this.ready;
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send(`setoption name UCI_LimitStrength value ${elo ? "true" : "false"}`);
    if (elo) this.send(`setoption name UCI_Elo value ${Math.max(1320, Math.min(3190, elo))}`);
    this.send(`setoption name Skill Level value ${skill}`);
    this.send("position fen " + fen);
    const lines = {};
    const onInfo = (l) => {
      if (!l.startsWith("info ") || !l.includes(" pv ")) return;
      const m = /multipv (\d+)/.exec(l), d = /depth (\d+)/.exec(l);
      const cp = /score cp (-?\d+)/.exec(l), mt = /score mate (-?\d+)/.exec(l);
      if (/ (lower|upper)bound/.test(l)) return;
      const k = m ? +m[1] : 1;
      const mate = mt ? +mt[1] : null;
      lines[k] = {
        pv: l.split(" pv ")[1].trim().split(" "), depth: d ? +d[1] : 0, mate,
        cp: mate !== null ? (mate > 0 ? MATE - mate : -MATE - mate) : cp ? +cp[1] : 0,
      };
    };
    this.listeners.add(onInfo);
    let go = "go";
    if (depth) go += " depth " + depth;
    if (movetime) go += " movetime " + movetime;
    if (nodes) go += " nodes " + nodes;
    if (go === "go") go += " depth 12";
    try {
      const line = await this.ask(go, (l) => l.startsWith("bestmove"), (movetime || 0) + 60000);
      const best = line.split(" ")[1];
      const out = Object.keys(lines).map(Number).sort((a, b) => a - b).map((k) => lines[k]);
      return { best: best && best !== "(none)" ? best : null, lines: out };
    } finally {
      this.listeners.delete(onInfo);
    }
  }

  stop() { this.send("stop"); }
  newGame() { this.send("ucinewgame"); }
  terminate() { if (this.w) this.w.terminate(); this.failed = true; }
}

const pool = {};
export function getEngine(name = "play") {
  if (!pool[name] || pool[name].failed) pool[name] = new Engine();
  return pool[name];
}
