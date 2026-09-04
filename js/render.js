/* ==========================================================================
   Isometric canvas renderer + animation helpers.
   ========================================================================== */

const TILE_W = 64, TILE_H = 32, HZ = 10;
const TERRAIN = {
  g: { top: '#5f9e4a', l: '#4a7d3a', r: '#3c6630' },
  d: { top: '#a9825a', l: '#8a6a48', r: '#6f5439' },
  s: { top: '#9a9aa8', l: '#7a7a88', r: '#606070' },
  b: { top: '#b08a52', l: '#8f6d40', r: '#6e5330' },
  w: { top: '#3f6fb0', l: '#365f98', r: '#2c4f80' },
  t: { top: '#5f9e4a', l: '#4a7d3a', r: '#3c6630' },
};

function tween(ms, fn) {
  return new Promise(res => {
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      fn(k);
      if (k < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}
const lerp = (a, b, k) => a + (b - a) * k;

class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0 };
    this.battle = null;
    this.hl = { move: new Set(), target: new Set(), area: new Set(), cursor: null };
    this.floats = [];
    this.bursts = [];
    this.running = false;
    this.time = 0;
  }

  setBattle(b) {
    this.battle = b;
    this.floats = []; this.bursts = [];
    this.clearHighlights();
    this.centerCamera();
  }

  clearHighlights() { this.hl.move.clear(); this.hl.target.clear(); this.hl.area.clear(); this.hl.cursor = null; }

  // The part of the canvas the panels are not sitting on. The board is framed
  // inside this rather than the whole screen, so on a phone it lands in the
  // free band between the turn strip and the command panel.
  viewCentre() {
    const i = this.insets || { top: 0, bottom: 0, left: 0, right: 0 };
    const w = this.cv.width, h = this.cv.height;
    const left = Math.min(i.left, w * 0.4), right = Math.min(i.right, w * 0.4);
    const top = Math.min(i.top, h * 0.4), bottom = Math.min(i.bottom, h * 0.5);
    return {
      cx: left + (w - left - right) / 2,
      cy: top + (h - top - bottom) / 2,
      w: Math.max(120, w - left - right),
      h: Math.max(120, h - top - bottom),
    };
  }

  centerCamera() {
    // Centre the on-screen bounding box of the map (tops and walls included).
    const g = this.battle.grid;
    this.cam.x = 0; this.cam.y = 0;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const row of g.tiles) for (const t of row) {
      if (t.t === 'x') continue;
      const { sx, sy } = this.toScreen(t.x, t.y, t.h);
      minX = Math.min(minX, sx - 32); maxX = Math.max(maxX, sx + 32);
      minY = Math.min(minY, sy - 16 - 40); maxY = Math.max(maxY, sy + 16 + t.h * HZ);
    }
    const view = this.viewCentre();
    this.cam.x = -(minX + maxX) / 2 + view.cx;
    this.cam.y = -(minY + maxY) / 2 + view.cy;
    // Frame the board, but never shrink it past the point where a unit is too
    // small to read or tap. On a narrow screen the board is allowed to run off
    // the edges and the player pans instead.
    const fitX = (view.w * 0.96) / Math.max(1, maxX - minX);
    const fitY = (view.h * 0.92) / Math.max(1, maxY - minY);
    const floor = Math.min(this.cv.width, this.cv.height) < 520 ? 0.9 : 0.55;
    this.zoom = Math.max(floor, Math.min(1.35, Math.min(fitX, fitY)));
  }

  // Keep a point of interest on screen when the board is larger than the view.
  clampCamera() {
    if (!this.battle) return;
    const g = this.battle.grid, z = this.zoom || 1;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const row of g.tiles) for (const t of row) {
      if (t.t === 'x') continue;
      const { sx, sy } = this.toScreen(t.x, t.y, t.h);
      minX = Math.min(minX, sx - 32); maxX = Math.max(maxX, sx + 32);
      minY = Math.min(minY, sy - 56); maxY = Math.max(maxY, sy + 16 + t.h * HZ);
    }
    // Allow the board's edge to reach the middle of the view, no further.
    const halfW = this.cv.width / (2 * z), halfH = this.cv.height / (2 * z);
    const cx = this.cv.width / 2, cy = this.cv.height / 2;
    if (minX > cx + halfW) this.cam.x -= minX - (cx + halfW);
    if (maxX < cx - halfW) this.cam.x += (cx - halfW) - maxX;
    if (minY > cy + halfH) this.cam.y -= minY - (cy + halfH);
    if (maxY < cy - halfH) this.cam.y += (cy - halfH) - maxY;
  }

  // World (unzoomed canvas) coordinates of a tile centre.
  toScreen(x, y, h) {
    return {
      sx: this.cv.width / 2 + this.cam.x + (x - y) * TILE_W / 2,
      sy: this.cv.height / 2 + this.cam.y + (x + y) * TILE_H / 2 - h * HZ,
    };
  }

  // Convert a canvas pixel position to world coordinates (undo the zoom).
  toWorld(mx, my) {
    const z = this.zoom || 1, W = this.cv.width, H = this.cv.height;
    return { x: (mx - W / 2) / z + W / 2, y: (my - H / 2) / z + H / 2 };
  }

  setZoom(z) { this.zoom = Math.max(0.6, Math.min(2.5, z)); this.clampCamera(); }

  unitScreenPos(u) {
    const p = u.anim || { x: u.x, y: u.y, h: this.battle.grid.height(u.x, u.y), z: 0 };
    const s = this.toScreen(p.x, p.y, p.h);
    let z = p.z || 0;
    if (u.airborne && !u.anim) z = 150 + Math.sin(this.time / 200) * 6;
    return { sx: s.sx, sy: s.sy - z };
  }

  // Pan the camera so a grid position sits near the centre.
  async focus(u, ms = 300) {
    const g = this.battle.grid;
    const off = this.viewCentre();
    const tx = -(u.x - u.y) * TILE_W / 2 + (off.cx - this.cv.width / 2);
    const ty = -(u.x + u.y) * TILE_H / 2 + g.height(u.x, u.y) * HZ + (off.cy - this.cv.height / 2);
    const fx = this.cam.x, fy = this.cam.y;
    // Only pan when the unit would otherwise sit outside the comfortable centre zone.
    const z = this.zoom || 1;
    const view = this.viewCentre();
    const cur = this.toScreen(u.x, u.y, g.height(u.x, u.y));
    const dx = (cur.sx - view.cx) * z, dy = (cur.sy - view.cy) * z;
    if (Math.abs(dx) < view.w * 0.3 && Math.abs(dy) < view.h * 0.3) return;
    await tween(ms, k => { this.cam.x = lerp(fx, tx, k); this.cam.y = lerp(fy, ty, k); });
  }

  // ---- picking -----------------------------------------------------------------
  pointInPoly(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  pickTile(px, py) {
    if (!this.battle) return null;
    const { x: mx, y: my } = this.toWorld(px, py);
    const g = this.battle.grid;
    // Units first (sprites stand above their tile).
    const units = this.battle.units.filter(u => u.alive && !u.airborne && u.x >= 0).sort((a, b) => (b.x + b.y) - (a.x + a.y));
    for (const u of units) {
      const { sx, sy } = this.unitScreenPos(u);
      if (mx >= sx - 13 && mx <= sx + 13 && my >= sy - 32 && my <= sy + 8) return g.tile(u.x, u.y);
    }
    const order = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.tiles[y][x].t !== 'x') order.push(g.tiles[y][x]);
    order.sort((a, b) => (b.x + b.y) - (a.x + a.y) || b.h - a.h);
    for (const t of order) {
      const { sx, sy } = this.toScreen(t.x, t.y, t.h);
      const top = [[sx, sy - 16], [sx + 32, sy], [sx, sy + 16], [sx - 32, sy]];
      if (this.pointInPoly(mx, my, top)) return t;
      const wh = t.h * HZ;
      const lw = [[sx - 32, sy], [sx, sy + 16], [sx, sy + 16 + wh], [sx - 32, sy + wh]];
      const rw = [[sx + 32, sy], [sx, sy + 16], [sx, sy + 16 + wh], [sx + 32, sy + wh]];
      if (this.pointInPoly(mx, my, lw) || this.pointInPoly(mx, my, rw)) return t;
    }
    return null;
  }

  // ---- drawing ------------------------------------------------------------------
  // Match the canvas backing store to its on-screen size so pixels stay square.
  fit() {
    const w = Math.max(320, Math.floor(this.cv.clientWidth)), h = Math.max(240, Math.floor(this.cv.clientHeight));
    if (this.cv.width !== w || this.cv.height !== h) {
      this.cv.width = w; this.cv.height = h;
      // Re-frame the board rather than keeping an offset that no longer fits.
      if (this.battle) this.centerCamera();
    }
  }

  start() {
    this.running = true;
    this.fit();
    if (!this._resize) { this._resize = () => this.fit(); window.addEventListener('resize', this._resize); }
    const loop = (t) => { if (!this.running) return; this.time = t; this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  stop() { this.running = false; }

  diamond(sx, sy) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(sx, sy - 16); c.lineTo(sx + 32, sy); c.lineTo(sx, sy + 16); c.lineTo(sx - 32, sy); c.closePath();
  }

  draw() {
    const c = this.ctx, W = this.cv.width, H = this.cv.height;
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a1c2c'); bg.addColorStop(1, '#0d0e18');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    if (!this.battle) return;
    const z = this.zoom || 1;
    c.save();
    c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    c.imageSmoothingEnabled = false;
    const g = this.battle.grid;
    const items = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const t = g.tiles[y][x];
      if (t.t === 'x') continue;
      items.push({ d: x + y, kind: 'tile', t });
    }
    for (const u of this.battle.units) {
      if (u.x < 0) continue; // in reserve, not on the field
      const p = u.anim || { x: u.x, y: u.y };
      items.push({ d: p.x + p.y + 0.5 + (u.alive ? 0 : -0.2), kind: 'unit', u });
    }
    items.sort((a, b) => a.d - b.d);
    for (const it of items) it.kind === 'tile' ? this.drawTile(it.t) : this.drawUnit(it.u);
    this.drawBursts();
    this.drawFloats();
    c.restore();
  }

  drawTile(t) {
    const c = this.ctx;
    const { sx, sy } = this.toScreen(t.x, t.y, t.h);
    const col = TERRAIN[t.t] || TERRAIN.g;
    const wh = t.h * HZ;
    // Walls
    if (wh > 0) {
      c.fillStyle = col.l;
      c.beginPath(); c.moveTo(sx - 32, sy); c.lineTo(sx, sy + 16); c.lineTo(sx, sy + 16 + wh); c.lineTo(sx - 32, sy + wh); c.closePath(); c.fill();
      c.fillStyle = col.r;
      c.beginPath(); c.moveTo(sx + 32, sy); c.lineTo(sx, sy + 16); c.lineTo(sx, sy + 16 + wh); c.lineTo(sx + 32, sy + wh); c.closePath(); c.fill();
      // Strata lines
      c.strokeStyle = 'rgba(0,0,0,0.18)';
      for (let k = 1; k < t.h; k++) {
        c.beginPath(); c.moveTo(sx - 32, sy + k * HZ); c.lineTo(sx, sy + 16 + k * HZ); c.lineTo(sx + 32, sy + k * HZ); c.stroke();
      }
    }
    // Top
    this.diamond(sx, sy);
    c.fillStyle = col.top; c.fill();
    // Subtle height tint
    c.fillStyle = `rgba(255,255,230,${Math.min(0.25, t.h * 0.035)})`; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.stroke();
    if (t.t === 'w') {
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      const ph = Math.sin(this.time / 500 + t.x + t.y) * 3;
      c.beginPath(); c.moveTo(sx - 14, sy + ph); c.lineTo(sx - 4, sy - 3 + ph); c.lineTo(sx + 6, sy + ph); c.lineTo(sx + 14, sy - 2 + ph); c.stroke();
    }
    // Highlights
    const key = `${t.x},${t.y}`;
    if (this.hl.move.has(key)) { this.diamond(sx, sy); c.fillStyle = 'rgba(70,130,255,0.45)'; c.fill(); }
    if (this.hl.target.has(key)) { this.diamond(sx, sy); c.fillStyle = 'rgba(255,80,60,0.42)'; c.fill(); }
    if (this.hl.area.has(key)) { this.diamond(sx, sy); c.fillStyle = 'rgba(255,220,60,0.55)'; c.fill(); }
    if (this.battle.active && this.battle.active.alive && this.battle.active.x === t.x && this.battle.active.y === t.y && !this.battle.active.anim) {
      const a = 0.5 + 0.4 * Math.sin(this.time / 180);
      this.diamond(sx, sy); c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
    }
    if (this.hl.cursor && this.hl.cursor.x === t.x && this.hl.cursor.y === t.y) {
      this.diamond(sx, sy); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
    }
    if (this.battle.showDeploy && this.battle.deployKeys && this.battle.deployKeys.has(key)) {
      const taken = !!this.battle.occupantAt(t.x, t.y);
      const pulse = 0.30 + 0.10 * Math.sin(this.time / 350 + (t.x + t.y) * 0.5);
      this.diamond(sx, sy);
      c.fillStyle = taken ? 'rgba(40,180,90,0.22)' : `rgba(60,240,140,${pulse})`;
      c.fill();
      c.strokeStyle = taken ? 'rgba(120,255,170,0.55)' : 'rgba(190,255,215,0.95)';
      c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
      // A caret on free tiles reads as "you may stand here".
      if (!taken) {
        c.fillStyle = 'rgba(225,255,235,0.9)';
        c.beginPath();
        c.moveTo(sx, sy - 7); c.lineTo(sx + 6, sy + 1); c.lineTo(sx + 2, sy + 1);
        c.lineTo(sx + 2, sy + 6); c.lineTo(sx - 2, sy + 6); c.lineTo(sx - 2, sy + 1);
        c.lineTo(sx - 6, sy + 1); c.closePath(); c.fill();
      }
    }
    // Tree / pillar
    if (t.t === 't') {
      c.fillStyle = '#5a3a20'; c.fillRect(sx - 3, sy - 22, 6, 24);
      c.fillStyle = '#2f6b2a';
      c.beginPath(); c.moveTo(sx, sy - 52); c.lineTo(sx + 16, sy - 20); c.lineTo(sx - 16, sy - 20); c.closePath(); c.fill();
      c.fillStyle = '#3d8a36';
      c.beginPath(); c.moveTo(sx, sy - 44); c.lineTo(sx + 12, sy - 26); c.lineTo(sx - 12, sy - 26); c.closePath(); c.fill();
    }
  }

  drawUnit(u) {
    const c = this.ctx;
    const { sx, sy } = this.unitScreenPos(u);
    const job = u.jobData;
    const view = (u.facing === 'N' || u.facing === 'W') ? 'back' : 'front';
    const flip = (u.facing === 'S' || u.facing === 'W');
    const spr = getSprite(job, u.team, view, flip);
    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.35)';
    const groundY = u.airborne ? this.toScreen(u.x, u.y, this.battle.grid.height(u.x, u.y)).sy : sy;
    c.beginPath(); c.ellipse(sx, groundY + 6, 12, 5, 0, 0, Math.PI * 2); c.fill();
    // Facing marker
    if (u.alive) {
      const dir = { E: [22, 11], S: [-22, 11], W: [-22, -11], N: [22, -11] }[u.facing];
      c.fillStyle = TEAM_COLORS[u.team];
      c.beginPath(); c.arc(sx + dir[0], groundY + dir[1], 3, 0, Math.PI * 2); c.fill();
    }
    if (!u.alive) {
      c.save(); c.globalAlpha = 0.6; c.translate(sx, sy + 8); c.scale(1, 0.35); c.filter = 'grayscale(1)';
      c.drawImage(spr, -13, -38); c.restore();
      if (u.koCount > 0) {
        c.font = 'bold 15px monospace'; c.textAlign = 'center';
        c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.85)';
        c.strokeText(`${u.koCount}`, sx, sy - 6);
        c.fillStyle = '#ff6a5a'; c.fillText(`${u.koCount}`, sx, sy - 6);
      }
      return;
    }
    c.drawImage(spr, sx - 13, sy + 8 - 38);
    // HP bar
    const w = 24, hpk = u.hp / u.maxHp;
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(sx - w / 2 - 1, sy - 36, w + 2, 4);
    c.fillStyle = hpk > 0.5 ? '#5ad35a' : hpk > 0.25 ? '#e8c840' : '#e85040';
    c.fillRect(sx - w / 2, sy - 35, Math.max(0, Math.round(w * hpk)), 2);
    // Status dots
    let i = 0;
    for (const s of Object.keys(u.statuses)) {
      c.fillStyle = STATUSES[s].color; c.fillRect(sx - w / 2 + i * 5, sy - 41, 4, 4); i++;
    }
    if (u.airborne) { c.fillStyle = '#fff'; c.font = '10px monospace'; c.textAlign = 'center'; c.fillText('JUMP', sx, sy - 44); }
    if (u.boss) { c.fillStyle = '#ffd040'; c.font = 'bold 10px monospace'; c.textAlign = 'center'; c.fillText('★', sx, sy - 44); }
  }

  drawBursts() {
    const c = this.ctx, now = this.time;
    this.bursts = this.bursts.filter(b => now - b.t0 < b.dur);
    for (const b of this.bursts) {
      const k = (now - b.t0) / b.dur;
      for (const t of b.tiles) {
        const { sx, sy } = this.toScreen(t.x, t.y, t.h);
        c.save(); c.globalAlpha = (1 - k) * 0.8;
        this.diamond(sx, sy); c.fillStyle = b.color; c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
        // Rising sparks
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + k * 3;
          c.fillStyle = '#fff'; c.fillRect(sx + Math.cos(a) * 14, sy - k * 40 + Math.sin(a) * 6, 3, 3);
        }
        c.restore();
      }
    }
  }

  drawFloats() {
    const c = this.ctx, now = this.time;
    this.floats = this.floats.filter(f => now - f.t0 < 1100);
    c.font = 'bold 16px "Segoe UI", sans-serif'; c.textAlign = 'center';
    for (const f of this.floats) {
      const k = (now - f.t0) / 1100;
      const { sx, sy } = this.toScreen(f.x, f.y, f.h);
      const y = sy - 46 - k * 34 - f.slot * 14;
      c.save(); c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(f.text, sx, y);
      c.fillStyle = f.color; c.fillText(f.text, sx, y);
      c.restore();
    }
  }

  // ---- hooks used by the battle engine --------------------------------------------
  showFloat(u, text, color) {
    const slot = this.floats.filter(f => f.x === u.x && f.y === u.y && this.time - f.t0 < 400).length;
    this.floats.push({ x: u.x, y: u.y, h: this.battle.grid.height(u.x, u.y), text, color, t0: performance.now(), slot });
  }

  burst(tiles, color, dur = 500) { this.bursts.push({ tiles, color, dur, t0: performance.now() }); }

  async animateMove(u, path) {
    const g = this.battle.grid;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const h0 = g.height(a.x, a.y), h1 = g.height(b.x, b.y);
      u.facing = facingFromDelta(b.x - a.x, b.y - a.y);
      await tween(150, k => {
        u.anim = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), h: lerp(h0, h1, k), z: Math.sin(k * Math.PI) * (4 + Math.abs(h1 - h0) * 5) };
      });
    }
    u.anim = null;
  }

  async animateAction(u, ab, tx, ty) {
    const g = this.battle.grid;
    const tiles = g.areaTiles(tx, ty, ab.aoe);
    const color = ab.kind === 'magic' ? (ab.element === 'fire' ? '#ff7a30' : ab.element === 'thunder' ? '#ffe040' : '#b080ff')
      : ab.kind === 'physical' ? '#ffffff' : '#70ff90';
    const melee = ab.kind === 'physical' && this.abilityRangeOf(u, ab) <= 1 && !ab.self;
    if (melee && (tx !== u.x || ty !== u.y)) {
      const h = g.height(u.x, u.y), dx = tx - u.x, dy = ty - u.y;
      await tween(220, k => { const s = Math.sin(k * Math.PI) * 0.35; u.anim = { x: u.x + dx * s, y: u.y + dy * s, h, z: 0 }; });
      u.anim = null;
    } else if (ab.kind !== 'support' && ab.kind !== 'item') {
      const h = g.height(u.x, u.y);
      await tween(200, k => { u.anim = { x: u.x, y: u.y, h, z: Math.sin(k * Math.PI) * 6 }; });
      u.anim = null;
    }
    this.burst(tiles, color);
    await sleep(260);
  }

  abilityRangeOf(u, ab) { return ab.range === 'weapon' ? u.weapon.range : ab.range; }

  async onJump(u) {
    const h = this.battle.grid.height(u.x, u.y);
    await tween(350, k => { u.anim = { x: u.x, y: u.y, h, z: k * k * 150 }; });
    u.anim = null;
  }

  async onLand(u, tx, ty) {
    const h = this.battle.grid.height(u.x, u.y);
    await tween(250, k => { u.anim = { x: u.x, y: u.y, h, z: (1 - k) * (1 - k) * 150 }; });
    u.anim = null;
  }

  async onDeath(u) {
    const h = this.battle.grid.height(u.x, u.y);
    await tween(300, k => { u.anim = { x: u.x, y: u.y, h, z: Math.sin(k * Math.PI * 3) * 3 }; });
    u.anim = null;
  }
}
