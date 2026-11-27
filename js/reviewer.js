// Game Review computed in the browser (same rules as the bot's server-side review):
// Book, Best, Brilliant (sound sacrifice), Great (only good move), Excellent, Good,
// Inaccuracy, Mistake, Miss, Blunder — with accuracy and a "played like" rating.
import { Chess } from "./vendor/chess.js?v=fd61796546";
import { getEngine, MATE } from "./engine.js?v=fd61796546";
import { winPct } from "./util.js?v=fd61796546";

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const CLASSES = ["brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "miss", "blunder"];
let BOOK = null;

async function loadBook() {
  if (BOOK) return BOOK;
  BOOK = new Set();
  try {
    const list = await (await fetch("data/openings.json?v=fd61796546")).json();
    for (const [moves] of list) {
      if (moves.includes("#")) continue;
      const seq = moves.split(" ");
      for (let i = 1; i <= seq.length; i++) BOOK.add(seq.slice(0, i).join(" "));
    }
  } catch { /* no book */ }
  return BOOK;
}

let OPENINGS = null;
export async function openingName(sans, fa) {
  if (!OPENINGS) { try { OPENINGS = await (await fetch("data/openings.json?v=fd61796546")).json(); } catch { OPENINGS = []; } }
  const seq = sans.join(" ");
  let best = null;
  for (const [moves, en, f] of OPENINGS) {
    if ((seq === moves || seq.startsWith(moves + " ")) && (!best || moves.length > best[0].length)) best = [moves, en, f];
  }
  return best ? (fa ? best[2] : best[1]) : null;
}

const toObj = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined });

function isSacrifice(chess, uci) {
  const from = uci.slice(0, 2), to = uci.slice(2, 4);
  const mover = chess.get(from);
  if (!mover || mover.type === "p" || mover.type === "k") return false;
  const cap = chess.get(to);
  const gain = cap ? VAL[cap.type] : 0;
  const after = new Chess(chess.fen());
  after.move(toObj(uci));
  const opp = after.turn();
  const attackers = after.attackers(to, opp);
  if (!attackers.length) return false;
  const cheapest = Math.min(...attackers.map((sq) => VAL[after.get(sq).type]));
  const defended = after.attackers(to, mover.color).length > 0;
  const lost = VAL[mover.type] - (defended ? cheapest : 0);
  return lost - gain >= 2;
}

export function perfRating(acc) {
  const pts = [[0, 100], [50, 400], [70, 900], [80, 1200], [90, 1600], [95, 1950], [100, 2400]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a0, r0] = pts[i], [a1, r1] = pts[i + 1];
    if (acc <= a1) return Math.round((r0 + ((r1 - r0) * (acc - a0)) / (a1 - a0)) / 10) * 10;
  }
  return 2400;
}

export async function reviewGame(startFen, ucis, onProgress) {
  const book = await loadBook();
  const eng = getEngine("analysis");
  const c = new Chess(startFen);
  const pos = [];
  const mates = [];
  const fast = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 110 : 150;
  for (let i = 0; i <= ucis.length; i++) {
    const fen = c.fen();
    let score = 0, best = null, roots = [], mate = null;
    if (c.isGameOver()) {
      score = c.isCheckmate() ? (c.turn() === "w" ? -MATE : MATE) : 0;
      if (c.isCheckmate()) mate = 0;
    } else {
      const res = await eng.search({ fen, movetime: fast, depth: 18, multipv: 2 });
      const sign = c.turn() === "w" ? 1 : -1;
      const top = res.lines[0];
      score = top ? sign * top.cp : 0;
      if (top && top.mate !== null) mate = sign * top.mate;
      best = res.best;
      roots = res.lines.map((l) => l.cp);
    }
    pos.push({ score, best, roots, fen });
    mates.push(mate);
    if (onProgress) onProgress((i + 1) / (ucis.length + 1));
    if (i < ucis.length) c.move(toObj(ucis[i]));
  }
  const b = new Chess(startFen);
  const moves = [];
  const stats = { w: { acc: [], counts: Object.fromEntries(CLASSES.map((k) => [k, 0])) },
    b: { acc: [], counts: Object.fromEntries(CLASSES.map((k) => [k, 0])) } };
  const sans = [];
  let prev = null, inBook = startFen.split(" ")[0] === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
  const matedSoon = MATE - 1000;
  ucis.forEach((uci, i) => {
    const color = b.turn(), sign = color === "w" ? 1 : -1;
    const p = pos[i], n = pos[i + 1];
    const before = winPct(sign * p.score), after = winPct(sign * n.score);
    const loss = Math.max(0, before - after);
    let bestSan = null;
    if (p.best) { try { const t = new Chess(p.fen); bestSan = t.move(toObj(p.best)).san; } catch { /* ignore */ } }
    const sac = p.best === uci ? isSacrifice(b, uci) : false;
    const m = b.move(toObj(uci));
    sans.push(m.san);
    inBook = inBook && book.has(sans.join(" "));
    const r = p.roots;
    const only = r.length >= 2 && winPct(r[0]) - winPct(r[1]) >= 25;
    const sB = sign * p.score, sA = sign * n.score;
    const walksIntoMate = sA <= -matedSoon && -matedSoon < sB;
    const dropsOwnMate = sB >= matedSoon && matedSoon > sA;
    const isBest = p.best && uci === p.best;
    let cls;
    if (inBook && i < 24) cls = "book";
    else if (walksIntoMate && !isBest) cls = "blunder";
    else if (dropsOwnMate && !isBest) cls = "miss";
    else if (isBest) cls = sac && after >= 45 && before < 97 ? "brilliant" : only && after >= 40 ? "great" : "best";
    else if (loss < 2) cls = "excellent";
    else if (loss < 6) cls = "good";
    else if ((prev === "mistake" || prev === "blunder") && loss >= 10) cls = "miss";
    else if (loss < 12) cls = "inaccuracy";
    else if (loss < 22) cls = "mistake";
    else cls = "blunder";
    prev = cls;
    const acc = ["book", "best", "brilliant", "great"].includes(cls) ? 100
      : Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
    stats[color].acc.push(acc);
    stats[color].counts[cls]++;
    moves.push({ san: m.san, uci, cls, color, best: bestSan, best_uci: p.best, loss: Math.round(loss * 10) / 10 });
  });
  const evals = pos.map((p) => (Math.abs(p.score) < MATE - 1000 ? Math.max(-1500, Math.min(1500, p.score)) : p.score > 0 ? 1500 : -1500));
  const accuracy = {}, rating = {};
  for (const k of ["w", "b"]) {
    const a = stats[k].acc;
    accuracy[k] = a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : null;
    rating[k] = accuracy[k] != null ? perfRating(accuracy[k]) : null;
  }
  return { moves, evals, mates, fens: pos.map((p) => p.fen), accuracy, rating,
    counts: { w: stats.w.counts, b: stats.b.counts } };
}
