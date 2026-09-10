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
    this.fx = [];
    this.shake = null;
    // How many camera moves are in flight. A tile's screen position is only
    // stable at zero, which matters to anything translating a tap.
    this.camAnim = 0;
    this.running = false;
    this.time = 0;
  }

  setBattle(b) {
    this.battle = b;
    this.floats = []; this.bursts = []; this.fx = []; this.shake = null;
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

  // Pan so a set of tiles sits in the free part of the view. Used when the game
  // offers the player a choice: on a phone the board is often larger than the
  // screen, and an option that cannot be seen cannot be tapped.
  frameTiles(tiles, ms = 220) {
    if (!this.battle || !tiles || !tiles.length) return Promise.resolve();
    const g = this.battle.grid;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const t of tiles) {
      const { sx, sy } = this.toScreen(t.x, t.y, g.height(t.x, t.y));
      minX = Math.min(minX, sx - 32); maxX = Math.max(maxX, sx + 32);
      minY = Math.min(minY, sy - 40); maxY = Math.max(maxY, sy + 20);
    }
    const view = this.viewCentre(), z = this.zoom || 1;
    const halfW = view.w / (2 * z), halfH = view.h / (2 * z);
    const left = view.cx - halfW, right = view.cx + halfW;
    const top = view.cy - halfH, bottom = view.cy + halfH;
    // Nudge by the least that brings the set inside, rather than centring on
    // it: yanking the board across the screen every time a menu opens is more
    // disorienting than the scroll it saves. A set too big to fit is centred.
    let dx = 0, dy = 0;
    if (maxX - minX > right - left) dx = view.cx - (minX + maxX) / 2;
    else if (minX < left) dx = left - minX;
    else if (maxX > right) dx = right - maxX;
    if (maxY - minY > bottom - top) dy = view.cy - (minY + maxY) / 2;
    else if (minY < top) dy = top - minY;
    else if (maxY > bottom) dy = bottom - maxY;
    if (!dx && !dy) return Promise.resolve();
    const fx = this.cam.x, fy = this.cam.y;
    const tx = this.cam.x + dx;
    const ty = this.cam.y + dy;
    this.camAnim++;
    return tween(ms, k => {
      this.cam.x = lerp(fx, tx, k);
      this.cam.y = lerp(fy, ty, k);
    }).then(() => { this.clampCamera(); this.camAnim--; });
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
    // Keep a slice of the board inside the view. These are world coordinates,
    // so the visible span is the canvas divided by the zoom, centred on the
    // canvas middle; a quarter of it is the margin the board may not leave.
    const view = this.viewCentre();
    const halfW = this.cv.width / (2 * z), halfH = this.cv.height / (2 * z);
    const keepX = halfW * 0.5, keepY = halfH * 0.5;
    const left = view.cx - halfW, right = view.cx + halfW;
    const top = view.cy - halfH, bottom = view.cy + halfH;
    if (minX > right - keepX) this.cam.x -= minX - (right - keepX);
    if (maxX < left + keepX) this.cam.x += (left + keepX) - maxX;
    if (minY > bottom - keepY) this.cam.y -= minY - (bottom - keepY);
    if (maxY < top + keepY) this.cam.y += (top + keepY) - maxY;
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

  /* Zooming in magnifies the board around the middle of the view, which can
     carry a legal destination out under one of the panels, where nobody can
     tap it. So whenever the zoom changes while options are on offer, nudge
     them back into the free part of the view -- the same nudge that put them
     there when the menu opened. */
  setZoom(z) {
    this.zoom = Math.max(0.6, Math.min(2.5, z));
    this.clampCamera();
    const keys = this.hl.move.size ? this.hl.move : this.hl.target;
    if (!keys.size || !this.battle) return;
    const g = this.battle.grid, tiles = [];
    for (const k of keys) {
      const [x, y] = k.split(',').map(Number);
      const t = g.tile(x, y);
      if (t) tiles.push(t);
    }
    this.frameTiles(tiles, 120);
  }

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
    this.camAnim++;
    try { await tween(ms, k => { this.cam.x = lerp(fx, tx, k); this.cam.y = lerp(fy, ty, k); }); }
    finally { this.camAnim--; }
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
    // A figure standing in front of a tile answers for it, since that is what
    // the player is looking at.
    let onUnit = null;
    const units = this.battle.units.filter(u => u.alive && !u.airborne && u.x >= 0).sort((a, b) => (b.x + b.y) - (a.x + a.y));
    for (const u of units) {
      const { sx, sy } = this.unitScreenPos(u);
      if (mx >= sx - 13 && mx <= sx + 13 && my >= sy - 32 && my <= sy + 8) { onUnit = g.tile(u.x, u.y); break; }
    }
    let onGround = null;
    const order = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.tiles[y][x].t !== 'x') order.push(g.tiles[y][x]);
    order.sort((a, b) => (b.x + b.y) - (a.x + a.y) || b.h - a.h);
    for (const t of order) {
      const { sx, sy } = this.toScreen(t.x, t.y, t.h);
      const top = [[sx, sy - 16], [sx + 32, sy], [sx, sy + 16], [sx - 32, sy]];
      if (this.pointInPoly(mx, my, top)) { onGround = t; break; }
      const wh = t.h * HZ;
      const lw = [[sx - 32, sy], [sx, sy + 16], [sx, sy + 16 + wh], [sx - 32, sy + wh]];
      const rw = [[sx + 32, sy], [sx, sy + 16], [sx, sy + 16 + wh], [sx + 32, sy + wh]];
      if (this.pointInPoly(mx, my, lw) || this.pointInPoly(mx, my, rw)) { onGround = t; break; }
    }
    /* While the game is offering a choice, whichever of the two is on offer
       wins. A figure is drawn a good half-tile taller than the square it
       stands on, so it covers the tiles behind it; without this, a legal
       destination standing behind an ally simply cannot be tapped. */
    if (this.hl.move.size || this.hl.target.size) {
      const offered = (t) => !!t && (this.hl.move.has(`${t.x},${t.y}`) || this.hl.target.has(`${t.x},${t.y}`));
      if (offered(onUnit)) return onUnit;
      if (offered(onGround)) return onGround;
    }
    return onUnit || onGround;
  }

  // ---- drawing ------------------------------------------------------------------
  // Match the canvas backing store to its on-screen size so pixels stay square.
  fit() {
    const w = Math.max(320, Math.floor(this.cv.clientWidth)), h = Math.max(240, Math.floor(this.cv.clientHeight));
    if (this.cv.width === w && this.cv.height === h) return;
    const wasW = this.cv.width, wasH = this.cv.height;
    this.cv.width = w; this.cv.height = h;
    if (!this.battle) return;
    // A browser's address bar sliding away resizes the canvas by a little. That
    // should not throw away where the player had panned to; only a real change
    // of shape, such as turning the phone, is worth re-framing for.
    const small = wasW && wasH &&
      Math.abs(w - wasW) < wasW * 0.15 && Math.abs(h - wasH) < wasH * 0.25;
    if (small) {
      this.cam.x += (w - wasW) / 2;
      this.cam.y += (h - wasH) / 2;
      this.clampCamera();
    } else {
      this.centerCamera();
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
    // A blow that lands hard shoves the whole view, briefly.
    if (this.shake) {
      const k = (this.time - this.shake.t0) / this.shake.dur;
      if (k >= 1) this.shake = null;
      else {
        const m = this.shake.mag * (1 - k);
        c.translate(Math.sin(k * 46) * m, Math.cos(k * 39) * m * 0.6);
      }
    }
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
    // Ground effects sit under the figures standing in them; everything else
    // is the flourish and belongs on top of its own tile's depth.
    this.fx = this.fx.filter(f => this.time - f.t0 < f.dur);
    for (const f of this.fx) {
      if (f.ground) items.push({ d: f.x + f.y - 0.5, kind: 'fx', f });
      else items.push({ d: (f.d !== undefined ? f.d : f.x + f.y) + 0.9, kind: 'fx', f });
    }
    items.sort((a, b) => a.d - b.d);
    for (const it of items) {
      if (it.kind === 'tile') this.drawTile(it.t);
      else if (it.kind === 'unit') this.drawUnit(it.u);
      else this.drawFx(it.f);
    }
    this.drawCharges();
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
    const spr = getSprite(job, u.team, view, flip, spriteGear(u));
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
      c.drawImage(spr, SPRITE_DX, SPRITE_DY - 8); c.restore();
      if (u.koCount > 0) {
        c.font = 'bold 15px monospace'; c.textAlign = 'center';
        c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.85)';
        c.strokeText(`${u.koCount}`, sx, sy - 6);
        c.fillStyle = '#ff6a5a'; c.fillText(`${u.koCount}`, sx, sy - 6);
      }
      return;
    }
    let rx = 0, ry = 0;
    if (u.recoil) {
      const k = (this.time - u.recoil.t0) / u.recoil.dur;
      if (k >= 1) u.recoil = null;
      else {
        // Shoved back, then pulled home.
        const push = Math.sin(k * Math.PI) * u.recoil.mag;
        rx = Math.cos(u.recoil.a) * push; ry = Math.sin(u.recoil.a) * push * 0.6;
      }
    }
    c.drawImage(spr, sx + SPRITE_DX + rx, sy + SPRITE_DY + ry);
    // A struck figure flares white, so a blow reads even off-centre.
    if (u.hitAt) {
      const k = (this.time - u.hitAt) / 200;
      if (k >= 1) u.hitAt = null;
      else {
        c.save();
        c.globalAlpha = (1 - k) * 0.85;
        c.globalCompositeOperation = 'lighter';
        c.drawImage(spr, sx + SPRITE_DX + rx, sy + SPRITE_DY + ry);
        c.restore();
      }
    }
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
        c.save(); c.globalAlpha = (1 - k) * 0.3;
        this.diamond(sx, sy); c.fillStyle = b.color; c.fill();
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

  // ---- effects ----------------------------------------------------------------------------------
  spawn(kind, opts) {
    const f = Object.assign({ kind, t0: performance.now(), dur: 400 }, opts);
    this.fx.push(f);
    return f;
  }

  drawFx(f) {
    const draw = FX_DRAW[f.kind];
    if (!draw) return;
    const k = Math.min(1, Math.max(0, (this.time - f.t0) / f.dur));
    draw(this.ctx, this, f, k);
  }

  shakeScreen(mag, dur = 220) {
    if (reducedMotion()) return;
    // A bigger blow landing mid-shake replaces a smaller one rather than
    // stacking, so a wide spell does not rattle the board apart.
    if (this.shake && this.shake.mag > mag && this.time - this.shake.t0 < this.shake.dur * 0.5) return;
    this.shake = { mag, dur, t0: this.time || performance.now() };
  }

  // Where an ability lands, in the element's own language.
  landFx(ab, tiles) {
    const spec = abilityFx(ab);
    if (!spec) return 0;
    // One sound for the ability, however many tiles it covers.
    if (spec.sound) audio.sfx(spec.sound);
    const g = this.battle.grid;
    for (const t of tiles) {
      this.spawn(spec.kind, {
        x: t.x, y: t.y, h: g.height(t.x, t.y),
        dur: spec.dur, color: spec.color, second: spec.second,
        ground: spec.kind === 'ring',
      });
    }
    return spec.dur;
  }

  // The mark a landed blow leaves on whoever took it.
  onImpact(t, ab, amount, user) {
    if (!this.battle || t.x < 0) return;
    const sound = impactSound(user || this.battle.active, ab);
    if (sound) audio.sfx(sound);
    const g = this.battle.grid;
    const share = Math.min(1, amount / Math.max(1, t.maxHp));
    t.hitAt = performance.now();
    if (!reducedMotion()) {
      const dir = t._fromAngle === undefined ? -0.6 : t._fromAngle;
      t.recoil = { a: dir, t0: performance.now(), dur: 260, mag: 3 + share * 7 };
      this.shakeScreen(2 + share * 9);
    }
    this.spawn('impact', {
      x: t.x, y: t.y, h: g.height(t.x, t.y), dur: 260,
      color: ab && ab.element ? ELEMENTS[ab.element].color : '#ffffff',
      size: 12 + share * 22, angle: t._fromAngle || 0,
    });
  }

  // A blow that was turned aside: the target slips out of the way.
  onEvade(t) {
    if (!this.battle || t.x < 0 || reducedMotion()) return;
    t.recoil = { a: (t._fromAngle || 0) + Math.PI / 2, t0: performance.now(), dur: 240, mag: 6 };
  }

  /* A charging spell is public information: the caster glows and the ground it
     is aimed at is ringed, so a player can see what is coming and move. */
  drawCharges() {
    const b = this.battle;
    if (!b || !b.pending || !b.pending.length) return;
    const c = this.ctx, g = b.grid;
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 160);
    for (const p of b.pending) {
      const col = p.ability.element ? ELEMENTS[p.ability.element].color : '#c8b0ff';
      if (p.unit.x >= 0) {
        const { sx, sy } = this.unitScreenPos(p.unit);
        c.strokeStyle = rgba(col, 0.35 + pulse * 0.5);
        c.lineWidth = 2;
        c.beginPath(); c.ellipse(sx, sy + 5, 15, 7, 0, 0, Math.PI * 2); c.stroke();
      }
      for (const t of g.areaTiles(p.tx, p.ty, p.ability.aoe)) {
        const { sx, sy } = this.toScreen(t.x, t.y, t.h);
        c.strokeStyle = rgba(col, 0.25 + pulse * 0.35);
        c.lineWidth = 2;
        c.setLineDash([5, 4]);
        this.diamond(sx, sy); c.stroke();
        c.setLineDash([]);
      }
    }
  }

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

  /* The shape of a blow, from wind-up to arrival.

     A turn is a conversation, so this stays short: the whole sequence is
     budgeted at roughly a third of a second for a sword and half for a spell,
     and every wait is awaited so the engine prints damage only once the blow
     has visibly landed. */
  async animateAction(u, ab, tx, ty) {
    const g = this.battle.grid;
    const tiles = g.areaTiles(tx, ty, ab.aoe);
    const h = g.height(u.x, u.y);
    const dx = tx - u.x, dy = ty - u.y;
    // Screen-space direction of the blow: the board is isometric, so the
    // angle a player sees is not the angle on the grid.
    const from = this.toScreen(u.x, u.y, h), to = this.toScreen(tx, ty, g.height(tx, ty));
    const angle = (dx || dy) ? Math.atan2(to.sy - from.sy, to.sx - from.sx) : -Math.PI / 2;
    // Every target remembers where the blow came from, for its recoil.
    for (const t of tiles) {
      const hit = this.battle.unitAt ? this.battle.unitAt(t.x, t.y) : null;
      if (hit) hit._fromAngle = angle;
    }
    for (const t of this.battle.units) if (t.x === tx && t.y === ty) t._fromAngle = angle;

    const wfx = weaponFx(u, ab);
    const dist = Math.abs(dx) + Math.abs(dy);
    /* How the blow gets there. A weapon swung at its own reach swings — a
       spear's two tiles are still a thrust, not a throw. Something that
       reaches further by a means of its own is projected, unless what it
       projects is an element, which arrives as the element. */
    const shoots = !!(wfx && wfx.shot && ab.range === 'weapon');
    const thrown = isThrown(ab);
    const reduced = reducedMotion();

    if (reduced) {
      // The flourish goes; the sound is not motion, so it stays.
      if (wfx && wfx.sound) audio.sfx(wfx.sound);
      this.landFx(ab, tiles);
      if (wfx) for (const t of tiles) this.spawn('impact', { x: t.x, y: t.y, h: g.height(t.x, t.y), dur: 180, color: wfx.color, size: 14, angle });
      await sleep(140);
      return;
    }

    if (shoots) {
      // A bow is drawn, then the arrow has to get there.
      await tween(wfx.wind, k => { u.anim = { x: u.x - dx * 0.12 * k / Math.max(1, dist), y: u.y - dy * 0.12 * k / Math.max(1, dist), h, z: 0 }; });
      u.anim = null;
      audio.sfx(wfx.sound);
      await this.travel(u.x, u.y, h, tx, ty, g.height(tx, ty), wfx.shot, 26);
    } else if (thrown) {
      await tween(150, k => { u.anim = { x: u.x, y: u.y, h, z: Math.sin(k * Math.PI) * 5 }; });
      u.anim = null;
      audio.sfx('throw');
      await this.travel(u.x, u.y, h, tx, ty, g.height(tx, ty), throwShape(u, ab), 34);
    } else if (wfx) {
      // A weapon blow. Within a weapon's reach the attacker leans into it and
      // the swing is drawn over whoever it lands on; beyond that it is a
      // flourish at the attacker and the ability carries the rest.
      const near = dist > 0 && dist <= 2;
      const lunge = near ? wfx.reach / dist : 0;
      await tween(wfx.wind, k => {
        const sw = Math.sin(k * Math.PI) * lunge;
        u.anim = { x: u.x + dx * sw, y: u.y + dy * sw, h, z: lunge ? 0 : Math.sin(k * Math.PI) * 6 };
      });
      u.anim = null;
      const where = near ? tiles : [g.tile(u.x, u.y)];
      for (let i = 0; i < wfx.hits; i++) {
        audio.sfx(wfx.sound);
        for (const t of where) {
          if (!t) continue;
          this.spawn(wfx.swing, { x: t.x, y: t.y, h: g.height(t.x, t.y), dur: 240, color: wfx.color, angle });
        }
        if (i < wfx.hits - 1) await sleep(90);
      }
    } else if (ab.kind === 'magic') {
      // A spell: the caster gathers it before it arrives.
      const col = ab.element ? ELEMENTS[ab.element].color : '#c8b0ff';
      const cast = this.spawn('ring', { x: u.x, y: u.y, h, dur: 260, color: col, ground: true });
      audio.sfx('cast');
      await tween(240, k => { u.anim = { x: u.x, y: u.y, h, z: Math.sin(k * Math.PI) * 8 }; });
      u.anim = null;
      cast.dur = 1;   // the gather is done; let the arrival own the screen
    } else {
      await tween(180, k => { u.anim = { x: u.x, y: u.y, h, z: Math.sin(k * Math.PI) * 6 }; });
      u.anim = null;
    }

    const landed = this.landFx(ab, tiles);
    // The tile highlight still reads the area at a glance; keep it, quietly.
    this.burst(tiles, ab.kind === 'magic' ? (ab.element ? ELEMENTS[ab.element].color : '#b080ff')
      : ab.kind === 'physical' ? '#ffffff' : '#70ff90', 320);
    await sleep(Math.max(120, Math.min(landed || 0, 300)));
  }

  /* Send something across the board and wait for it to arrive. Returns once
     the projectile is on the target, so damage lands with the hit. */
  travel(x0, y0, h0, x1, y1, h1, shape, arc) {
    const dist = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    const dur = Math.min(420, 120 + dist * 45);
    const f = this.spawn('shot', { x0, y0, h0, x: x1, y: y1, h: h1, shape, arc, dur, d: Math.max(x0 + y0, x1 + y1) });
    return sleep(dur).then(() => { f.dur = 1; });
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
