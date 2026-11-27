// Interactive chess board: click or drag to move, premoves, right-click arrows and red squares
// (Shift = green, Ctrl = orange, Alt = blue), review badges, smooth piece animation.
// Purely visual: the game logic lives in the controllers.

const FILES = "abcdefgh";
const MARK_COLORS = {
  red: "rgba(235, 97, 80, .82)", green: "rgba(172, 206, 89, .82)",
  blue: "rgba(82, 176, 220, .82)", orange: "rgba(255, 170, 0, .82)",
};
const ARROW_COLORS = {
  orange: "rgba(255, 170, 0, .82)", green: "rgba(159, 207, 63, .85)", red: "rgba(248, 85, 63, .85)",
  blue: "rgba(72, 193, 249, .85)", best: "rgba(129, 182, 76, .92)", hint: "rgba(72, 193, 249, .92)",
  played: "rgba(255, 170, 0, .75)", threat: "rgba(248, 85, 63, .8)",
};
const PROMO = ["q", "n", "r", "b"];

export function sqXY(sq, orient) {
  const f = sq.charCodeAt(0) - 97, r = sq.charCodeAt(1) - 49;
  return orient === "w" ? [f, 7 - r] : [7 - f, r];
}

function xySq(x, y, orient) {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return orient === "w" ? FILES[x] + (8 - y) : FILES[7 - x] + (y + 1);
}

export function parseFen(fen) {
  const map = new Map();
  // crazyhouse FENs carry the pockets in [...] and mark promoted pieces with ~
  const rows = String(fen || "").split(" ")[0].replace(/\[.*$/, "").replace(/~/g, "").split("/");
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r] || "") {
      if (ch >= "1" && ch <= "8") { f += +ch; continue; }
      const color = ch === ch.toUpperCase() ? "w" : "b";
      map.set(FILES[f] + (8 - r), color + ch.toUpperCase());
      f++;
    }
  }
  return map;
}

function tr(x, y) { return `translate(${x * 100}%,${y * 100}%)`; }

// piece animation style (Settings, like chess.com) and how long a move's glide takes (the looks: css/v3.css)
const ANIM_MS = { none: 0, fast: 130, natural: 250, arcade: 370, slow: 460 };
const animStyle = () => (ANIM_MS[document.documentElement.dataset.anim] !== undefined ? document.documentElement.dataset.anim : "natural");
// move dots are tinted for the square they're on (light/dark), so they show on every board design
const shade = (sq) => ((sq.charCodeAt(0) - 97 + sq.charCodeAt(1) - 49) % 2 ? " on-l" : " on-d");

export class Board {
  constructor(root, opts = {}) {
    this.root = root;
    this.orient = opts.orient || "w";
    this.coords = opts.coords !== false;
    this.onMove = opts.onMove || null;        // (from, to, promo, {drag}) -> void
    this.onPremove = opts.onPremove || null;  // ({from, to} | null) -> void
    this.onDraw = opts.onDraw || null;
    this.movable = null;      // { color: "w"|"b", dests: Map<from, string[]> }
    this.premovable = null;   // { color, dests: Map }
    this.sel = null;
    this.pre = null;
    this.last = null;
    this.checkSq = null;
    this.shapes = [];         // user drawings: {from, to?, color}
    this.autoShapes = [];     // program arrows: {from, to, color} (best move, hint, …)
    this.marks = [];          // review badges: {sq, color, icon, tint}
    this.hintSq = null;
    this.drawMode = false;
    this.zones = [];          // game-mode squares: {sq, cls} (hill, finish line)
    this.fog = null;          // fog of war: Set of the squares you can see (null = no fog)
    this.drop = null;         // crazyhouse: {piece: "wN", dests: [sq…]} while placing a piece from the pocket
    this.pos = new Map();
    this.els = new Map();
    this.promo = null;
    root.classList.add("cb");
    root.innerHTML = '<div class="cb-sq"></div><div class="cb-hl"></div><div class="cb-co"></div>' +
      '<div class="cb-de"></div><div class="cb-pc"></div><svg class="cb-svg" viewBox="0 0 8 8"></svg>' +
      '<div class="cb-mk"></div><div class="cb-promo"></div>';
    [this.lSq, this.lHl, this.lCo, this.lDe, this.lPc, this.lSvg, this.lMk, this.lPromo] = root.children;
    this._down = (e) => this.down(e);
    this._move = (e) => this.pmove(e);
    this._up = (e) => this.up(e);
    root.addEventListener("pointerdown", this._down);
    root.addEventListener("pointermove", this._move);
    root.addEventListener("pointerup", this._up);
    root.addEventListener("pointercancel", this._up);
    root.addEventListener("contextmenu", (e) => e.preventDefault());
    this.renderCoords();
  }

  destroy() { this.root.innerHTML = ""; this.root.classList.remove("cb"); }

  // ───────── position ─────────

  set({ fen, last, check, movable, premovable, animate = true } = {}) {
    if (movable !== undefined) this.movable = movable;
    if (premovable !== undefined) this.premovable = premovable;
    if (last !== undefined) this.last = last;
    if (check !== undefined) this.checkSq = check;
    if (fen) this.setPosition(fen, animate);
    if (this.sel && !this.canPick(this.sel)) this.sel = null;
    this.renderHl();
    this.renderDests();
  }

  setPosition(fen, animate) {
    const style = animStyle();
    if (style === "none") animate = false;
    const ms = ANIM_MS[style];
    const next = parseFen(fen);
    const prev = this.pos;
    const keep = new Map();
    const free = [];
    for (const [sq, el] of this.els) {
      if (next.get(sq) === prev.get(sq)) keep.set(sq, el);
      else free.push({ sq, code: prev.get(sq), el });
    }
    const moved = [];
    for (const [sq, code] of next) {
      if (keep.has(sq)) continue;
      let best = -1, bd = 99;
      free.forEach((f, i) => {
        if (f && f.code === code) {
          const [x1, y1] = sqXY(f.sq, "w"), [x2, y2] = sqXY(sq, "w");
          const d = Math.abs(x1 - x2) + Math.abs(y1 - y2);
          if (d < bd) { bd = d; best = i; }
        }
      });
      if (best >= 0) {
        const f = free[best];
        free[best] = null;
        keep.set(sq, f.el);
        moved.push([f.el, sq]);
      } else {
        const el = document.createElement("div");
        el.className = "pc";
        el.dataset.c = code;
        el.style.transform = tr(...sqXY(sq, this.orient));
        if (animate && prev.size) { el.classList.add("pop"); setTimeout(() => el.classList.remove("pop"), 380); }  // pops in
        this.lPc.appendChild(el);
        keep.set(sq, el);
      }
    }
    for (const f of free) {
      if (!f) continue;
      if (animate) {
        f.el.classList.remove("lift", "anim", "pop");
        f.el.classList.add("gone");  // a taken piece fades away (arcade: knocked flying)
        setTimeout(() => f.el.remove(), style === "arcade" ? 340 : 230);
      } else f.el.remove();
    }
    for (const [el, sq] of moved) {
      el.classList.remove("dragging");
      const t = tr(...sqXY(sq, this.orient));
      if (animate) {
        el.classList.add("anim");  // glides over (lifted, with a shadow) and settles when it lands
        el.style.transform = t;
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove("anim"), ms + 40);
      } else {
        el.classList.remove("anim");
        el.style.transform = t;
      }
    }
    this.els = keep;
    this.pos = next;
  }

  setOrientation(o) {
    if (o === this.orient) return;
    this.orient = o;
    for (const [sq, el] of this.els) { el.classList.remove("anim"); el.style.transform = tr(...sqXY(sq, o)); }
    this.renderCoords();
    this.renderHl();
    this.renderDests();
    this.renderShapes();
    this.renderMarks();
  }

  flip() { this.setOrientation(this.orient === "w" ? "b" : "w"); }

  pieceAt(sq) { return this.pos.get(sq) || null; }

  // ───────── decorations ─────────

  setZones(list) { this.zones = list || []; this.renderHl(); }
  setFog(squares) { this.fog = squares ? new Set(squares) : null; this.renderHl(); }

  // crazyhouse: pick a piece from the pocket, then a square (null = stop)
  setDrop(d) {
    this.drop = d && d.dests && d.dests.length ? d : null;
    if (this.drop) this.sel = null;
    this.renderHl();
    this.renderDests();
  }

  // a short effect on a square: 💥 explosion, 👻 a piece from nowhere, 🌀 teleport, 🔪 own piece taken, 👑 king taken
  flash(sq, icon, cls = "") {
    if (!sq || !/^[a-h][1-8]$/.test(sq)) return;
    const [x, y] = sqXY(sq, this.orient);
    const el = document.createElement("div");
    el.className = "fx-sq " + cls;
    el.style.transform = tr(x, y);
    el.innerHTML = `<span>${icon}</span>`;
    this.lMk.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  setShapes(list) { this.shapes = list || []; this.renderShapes(); this.renderHl(); }
  setAutoShapes(list) { this.autoShapes = list || []; this.renderShapes(); }
  setMarks(list) { this.marks = list || []; this.renderMarks(); this.renderHl(); }
  setHint(sq) { this.hintSq = sq; this.renderHl(); }
  clearShapes() { if (this.shapes.length) { this.shapes = []; this.renderShapes(); this.renderHl(); } }

  cancelPremove() {
    if (this.pre) { this.pre = null; this.renderHl(); if (this.onPremove) this.onPremove(null); }
  }

  takePremove() {
    const p = this.pre;
    this.pre = null;
    this.renderHl();
    return p;
  }

  select(sq) { this.sel = sq; this.renderHl(); this.renderDests(); }

  renderCoords() {
    if (!this.coords) { this.lCo.innerHTML = ""; return; }
    let html = "";
    for (let i = 0; i < 8; i++) {
      const rankSq = xySq(0, i, this.orient), fileSq = xySq(i, 7, this.orient);
      const rankLight = (0 + i) % 2 === 0, fileLight = (i + 7) % 2 === 0;
      html += `<span class="co rk ${rankLight ? "on-l" : "on-d"}" style="top:${i * 12.5}%">${rankSq[1]}</span>`;
      html += `<span class="co fl ${fileLight ? "on-l" : "on-d"}" style="left:${i * 12.5}%">${fileSq[0]}</span>`;
    }
    this.lCo.innerHTML = html;
  }

  renderHl() {
    const o = this.orient;
    const parts = [];
    const add = (sq, cls, style = "") => {
      const [x, y] = sqXY(sq, o);
      parts.push(`<div class="hl ${cls}" style="transform:${tr(x, y)};${style}"></div>`);
    };
    const tinted = new Set(this.marks.filter((m) => m.tint).map((m) => m.sq));
    for (const z of this.zones) add(z.sq, "zone " + (z.cls || ""));
    if (this.fog) {
      for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) {
        const sq = FILES[f] + r;
        if (!this.fog.has(sq)) add(sq, "fog");
      }
    }
    if (this.last) for (const sq of this.last) if (sq && !tinted.has(sq)) add(sq, "last");
    for (const m of this.marks) if (m.tint) add(m.sq, "tint", `background:${m.tint}`);
    if (this.sel) add(this.sel, "sel");
    if (this.pre) { add(this.pre.from, "pre"); add(this.pre.to, "pre"); }
    for (const s of this.shapes) if (!s.to || s.to === s.from) add(s.from, "mark", `background:${MARK_COLORS[s.color] || MARK_COLORS.red}`);
    if (this.checkSq) add(this.checkSq, "check");
    if (this.hintSq) add(this.hintSq, "hint");
    if (this.hover) add(this.hover, "hover");
    this.lHl.innerHTML = parts.join("");
    this.animatePieces();
  }

  // the picked-up piece floats; a king that's just been put in check shakes (the looks: site/css/v3.css)
  animatePieces() {
    for (const [sq, el] of this.els) el.classList.toggle("lift", sq === this.sel);
    if (this.checkSq === this._shook) return;
    this._shook = this.checkSq;
    const k = this.checkSq && this.els.get(this.checkSq);
    if (!k) return;
    k.classList.remove("shake");
    void k.offsetWidth;  // restart the animation
    k.classList.add("shake");
    clearTimeout(k._sh);
    k._sh = setTimeout(() => k.classList.remove("shake"), 650);
  }

  canPick(sq) {
    const code = this.pos.get(sq);
    if (!code) return false;
    if (this.movable && this.movable.color === code[0] && (this.movable.dests.get(sq) || []).length) return true;
    if (this.premovable && this.premovable.color === code[0] && (this.premovable.dests.get(sq) || []).length) return true;
    return false;
  }

  destsOf(sq) {
    const code = this.pos.get(sq);
    if (!code) return { list: [], pre: false };
    if (this.movable && this.movable.color === code[0]) return { list: this.movable.dests.get(sq) || [], pre: false };
    if (this.premovable && this.premovable.color === code[0]) return { list: this.premovable.dests.get(sq) || [], pre: true };
    return { list: [], pre: false };
  }

  renderDests() {
    if (this.drop) {
      this.lDe.innerHTML = this.drop.dests.map((to) => {
        const [x, y] = sqXY(to, this.orient);
        return `<div class="dest drop${shade(to)}" style="transform:${tr(x, y)}"></div>`;
      }).join("");
      return;
    }
    if (!this.sel) { this.lDe.innerHTML = ""; return; }
    const { list, pre } = this.destsOf(this.sel);
    const o = this.orient;
    this.lDe.innerHTML = list.map((to) => {
      const [x, y] = sqXY(to, o);
      const cap = this.pos.has(to) || (this.pos.get(this.sel) || "")[1] === "P" && to[0] !== this.sel[0];
      return `<div class="dest${cap ? " cap" : ""}${pre ? " pre" : ""}${shade(to)}" style="transform:${tr(x, y)}"></div>`;
    }).join("");
  }

  renderShapes() {
    const o = this.orient;
    const svg = [];
    const draw = (s, auto) => {
      if (!s.to || s.to === s.from) return;
      const [x1, y1] = sqXY(s.from, o), [x2, y2] = sqXY(s.to, o);
      const color = ARROW_COLORS[s.color] || ARROW_COLORS.orange;
      svg.push(arrowSvg(x1 + 0.5, y1 + 0.5, x2 + 0.5, y2 + 0.5, color, auto ? s.width : 0));
    };
    for (const s of this.autoShapes) draw(s, true);
    for (const s of this.shapes) draw(s, false);
    if (this.drawing && this.drawing.to && this.drawing.to !== this.drawing.from) {
      draw({ ...this.drawing, color: arrowColor(this.drawColor) }, false);
    }
    this.lSvg.innerHTML = svg.join("");
  }

  renderMarks() {
    const o = this.orient;
    this.lMk.innerHTML = this.marks.filter((m) => m.icon).map((m) => {
      const [x, y] = sqXY(m.sq, o);
      const edgeR = x === 7, edgeT = y === 0;
      return `<div class="mk${edgeR ? " er" : ""}${edgeT ? " et" : ""}" style="transform:${tr(x, y)}">` +
        `<div class="badge" style="background:${m.color}">${m.icon}</div></div>`;
    }).join("");
  }

  // ───────── pointer input ─────────

  squareAt(e) {
    const r = this.root.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * 8);
    const y = Math.floor(((e.clientY - r.top) / r.height) * 8);
    return xySq(x, y, this.orient);
  }

  down(e) {
    if (this.promo) return;
    const sq = this.squareAt(e);
    if (!sq) return;
    if (e.button === 2 || (this.drawMode && e.button === 0)) {
      e.preventDefault();
      // like the big chess sites: plain = red square / orange arrow, Shift = green, Ctrl = orange/red, Alt = blue
      const color = e.shiftKey ? "green" : e.ctrlKey || e.metaKey ? "orange" : e.altKey ? "blue" : "red";
      this.drawing = { from: sq, to: sq, color };
      this.drawColor = color;
      this.root.setPointerCapture(e.pointerId);
      if (this.pre) this.cancelPremove();
      return;
    }
    if (e.button !== 0) return;
    this.clearShapes();
    if (this.drop) {  // placing a pocket piece
      const d = this.drop;
      this.drop = null;
      this.renderDests();
      if (d.dests.includes(sq) && this.onMove) { this.onMove("@", sq, undefined, { drop: d.piece }); return; }
      if (d.onCancel) d.onCancel();
    }
    if (this.sel && this.sel !== sq) {
      const { list, pre } = this.destsOf(this.sel);
      if (list.includes(sq)) {
        const from = this.sel;
        if (pre) this.setPremove(from, sq); else this.userMove(from, sq, false);
        return;
      }
    }
    if (this.canPick(sq)) {
      e.preventDefault();
      const wasSel = this.sel === sq;
      this.sel = sq;
      if (this.pre && this.premovable && !this.movable) { /* keep the queued premove until a new one is set */ }
      this.renderHl();
      this.renderDests();
      const el = this.els.get(sq);
      const r = this.root.getBoundingClientRect();
      this.drag = { from: sq, el, x0: e.clientX, y0: e.clientY, started: false, wasSel, rect: r, id: e.pointerId };
      this.root.setPointerCapture(e.pointerId);
      return;
    }
    if (this.pre) this.cancelPremove();
    if (this.sel) { this.sel = null; this.renderHl(); this.renderDests(); }
  }

  pmove(e) {
    if (this.drawing) {
      const sq = this.squareAt(e);
      if (sq && sq !== this.drawing.to) { this.drawing.to = sq; this.renderShapes(); }
      return;
    }
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < (e.pointerType === "mouse" ? 3 : 6)) return;
      d.started = true;
      if (d.el) { d.el.classList.remove("anim"); d.el.classList.add("dragging"); }
    }
    if (d.el) {
      const size = d.rect.width / 8;
      const x = e.clientX - d.rect.left - size / 2, y = e.clientY - d.rect.top - size / 2;
      d.el.style.transform = `translate(${x}px,${y}px)`;
    }
    const sq = this.squareAt(e);
    if (sq !== this.hover) { this.hover = sq; this.renderHl(); }
  }

  up(e) {
    if (this.drawing) {
      const s = this.drawing;
      this.drawing = null;
      const end = this.squareAt(e) || s.to;
      const shape = { from: s.from, to: end === s.from ? undefined : end, color: end === s.from ? s.color : arrowColor(this.drawColor) };
      const same = (a) => a.from === shape.from && (a.to || null) === (shape.to || null);
      const idx = this.shapes.findIndex(same);
      if (idx >= 0) {
        const old = this.shapes[idx];
        this.shapes.splice(idx, 1);
        if (old.color !== shape.color) this.shapes.push(shape);
      } else this.shapes.push(shape);
      this.renderShapes();
      this.renderHl();
      if (this.onDraw) this.onDraw(this.shapes);
      return;
    }
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (this.hover) { this.hover = null; }
    const to = this.squareAt(e);
    if (d.started) {
      if (d.el) d.el.classList.remove("dragging");
      const { list, pre } = this.destsOf(d.from);
      if (to && to !== d.from && list.includes(to)) {
        if (pre) { this.snapBack(d); this.setPremove(d.from, to); } else this.userMove(d.from, to, true);
        return;
      }
      this.snapBack(d);
      if (to !== d.from) { this.sel = null; this.renderDests(); }
      this.renderHl();
      return;
    }
    if (d.wasSel) { this.sel = null; this.renderDests(); }
    this.renderHl();
  }

  snapBack(d) {
    if (!d.el) return;
    d.el.classList.add("anim");
    d.el.style.transform = tr(...sqXY(d.from, this.orient));
    setTimeout(() => d.el.classList.remove("anim"), ANIM_MS[animStyle()] + 40);
  }

  setPremove(from, to) {
    this.sel = null;
    this.pre = { from, to };
    this.renderHl();
    this.renderDests();
    if (this.onPremove) this.onPremove(this.pre);
  }

  userMove(from, to, drag) {
    const code = this.pos.get(from) || "";
    const lastRank = code[0] === "w" ? "8" : "1";
    this.sel = null;
    this.renderDests();
    if (code[1] === "P" && to[1] === lastRank) {
      this.askPromotion(from, to, code[0], drag);
      return;
    }
    if (drag) { const el = this.els.get(from); if (el) el.style.transform = tr(...sqXY(to, this.orient)); }
    this.renderHl();
    if (this.onMove) this.onMove(from, to, undefined, { drag });
  }

  askPromotion(from, to, color, drag) {
    const [x, y] = sqXY(to, this.orient);
    const down = y === 0;
    const el = this.els.get(from);
    if (drag && el) el.style.transform = tr(x, y);
    this.promo = { from, to };
    const items = PROMO.map((p, i) => {
      const yy = down ? y + i : y - i;
      return `<div class="pr-i" data-p="${p}" style="transform:${tr(x, yy)}"><div class="pc" data-c="${color}${p.toUpperCase()}" style="position:static;width:100%;height:100%"></div></div>`;
    }).join("");
    const cy = down ? y + 4 : y - 4;
    this.lPromo.innerHTML = `<div class="pr-bg"></div>${items}<div class="pr-x" style="transform:${tr(x, cy)}">✕</div>`;
    this.lPromo.classList.add("on");
    const finish = (p) => {
      this.lPromo.classList.remove("on");
      this.lPromo.innerHTML = "";
      this.promo = null;
      if (!p) {
        if (el) { el.classList.add("anim"); el.style.transform = tr(...sqXY(from, this.orient)); setTimeout(() => el.classList.remove("anim"), 230); }
        this.renderHl();
        return;
      }
      this.renderHl();
      if (this.onMove) this.onMove(from, to, p, { drag: true });
    };
    this.lPromo.onpointerdown = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const item = e.target.closest(".pr-i");
      finish(item ? item.dataset.p : null);
    };
  }
}

function arrowColor(mod) {
  return { red: "orange", green: "green", orange: "red", blue: "blue" }[mod] || "orange";
}

function polygon(points, color) {
  return `<polygon points="${points.map((p) => p[0].toFixed(3) + "," + p[1].toFixed(3)).join(" ")}" fill="${color}"/>`;
}

function arrowSvg(x1, y1, x2, y2, color, width) {
  const shaft = (width || 0.2) / 2, head = shaft * 2.4, headLen = 0.42;
  const dx = x2 - x1, dy = y2 - y1;
  const knight = (Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 1);
  let out = "";
  let sx = x1, sy = y1;
  if (knight) {  // L-shaped arrow: the long leg first, like over-the-board analysis
    const cx = Math.abs(dx) === 2 ? x2 : x1, cy = Math.abs(dx) === 2 ? y1 : y2;
    const len = Math.hypot(cx - x1, cy - y1);
    const ux = (cx - x1) / len, uy = (cy - y1) / len, nx = -uy, ny = ux;
    const ex = cx + ux * shaft, ey = cy + uy * shaft;
    out += polygon([[x1 + nx * shaft, y1 + ny * shaft], [ex + nx * shaft, ey + ny * shaft],
      [ex - nx * shaft, ey - ny * shaft], [x1 - nx * shaft, y1 - ny * shaft]], color);
    sx = cx; sy = cy;
  }
  const len = Math.hypot(x2 - sx, y2 - sy);
  const ux = (x2 - sx) / len, uy = (y2 - sy) / len, nx = -uy, ny = ux;
  const tipx = x2 - ux * 0.06, tipy = y2 - uy * 0.06;
  const bx = tipx - ux * headLen, by = tipy - uy * headLen;
  const start = knight ? [sx, sy] : [sx + ux * 0.02, sy + uy * 0.02];
  out += polygon([[start[0] + nx * shaft, start[1] + ny * shaft], [bx + nx * shaft, by + ny * shaft],
    [bx + nx * head, by + ny * head], [tipx, tipy], [bx - nx * head, by - ny * head],
    [bx - nx * shaft, by - ny * shaft], [start[0] - nx * shaft, start[1] - ny * shaft]], color);
  return out;
}
