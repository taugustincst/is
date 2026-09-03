/* ==========================================================================
   Battle grid: tiles, heights, passability, pathfinding and range queries.
   ========================================================================== */

const IMPASSABLE = new Set(['w', 't', 'x']);

class Grid {
  constructor(mapDef) {
    this.def = mapDef;
    this.w = mapDef.w; this.h = mapDef.h;
    this.tiles = [];
    for (let y = 0; y < this.h; y++) {
      const row = [];
      for (let x = 0; x < this.w; x++) {
        row.push({ x, y, h: parseInt(mapDef.heights[y][x], 10), t: mapDef.terrain[y][x] });
      }
      this.tiles.push(row);
    }
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  tile(x, y) { return this.inBounds(x, y) ? this.tiles[y][x] : null; }
  height(x, y) { const t = this.tile(x, y); return t ? t.h : 0; }
  passable(x, y) { const t = this.tile(x, y); return !!t && !IMPASSABLE.has(t.t); }

  static dist(ax, ay, bx, by) { return Math.abs(ax - bx) + Math.abs(ay - by); }

  // BFS movement: returns Map "x,y" -> {x,y,cost,prev}
  reachable(unit, units) {
    const occupied = new Map();
    for (const u of units) if (u.alive && u !== unit && !u.airborne) occupied.set(`${u.x},${u.y}`, u);
    const start = { x: unit.x, y: unit.y, cost: 0, prev: null };
    const seen = new Map([[`${unit.x},${unit.y}`, start]]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift();
      if (cur.cost >= unit.move) continue;
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (!this.passable(nx, ny)) continue;
        const key = `${nx},${ny}`;
        if (seen.has(key)) continue;
        if (Math.abs(this.height(nx, ny) - this.height(cur.x, cur.y)) > unit.jump) continue;
        const occ = occupied.get(key);
        if (occ && occ.team !== unit.team) continue; // cannot pass through enemies
        const node = { x: nx, y: ny, cost: cur.cost + 1, prev: cur, blocked: !!occ };
        seen.set(key, node);
        queue.push(node);
      }
    }
    // Remove tiles occupied by allies (can pass, cannot stop).
    const result = new Map();
    for (const [k, n] of seen) if (!n.blocked) result.set(k, n);
    return result;
  }

  pathTo(reach, x, y) {
    let n = reach.get(`${x},${y}`);
    if (!n) return null;
    const path = [];
    while (n) { path.unshift({ x: n.x, y: n.y }); n = n.prev; }
    return path;
  }

  // Tiles targetable by an ability from (fx,fy) at height fh.
  targetTiles(fx, fy, range, vert, allowSelf) {
    const out = [];
    const fh = this.height(fx, fy);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const d = Grid.dist(fx, fy, x, y);
      if (d > range) continue;
      if (d === 0 && !allowSelf) continue;
      if (!this.passable(x, y)) continue;
      if (Math.abs(this.height(x, y) - fh) > vert) continue;
      out.push(this.tile(x, y));
    }
    return out;
  }

  // Tiles hit by an area effect centred on (cx,cy).
  areaTiles(cx, cy, aoe) {
    const out = [];
    const ch = this.height(cx, cy);
    for (let y = cy - aoe; y <= cy + aoe; y++) for (let x = cx - aoe; x <= cx + aoe; x++) {
      if (!this.inBounds(x, y)) continue;
      if (Grid.dist(cx, cy, x, y) > aoe) continue;
      if (Math.abs(this.height(x, y) - ch) > 2) continue;
      out.push(this.tile(x, y));
    }
    return out;
  }
}
