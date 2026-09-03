# Chronicles of Elderon — Tactics

A browser-based tactical RPG in the spirit of classic isometric job-system tactics games.
No build step, no dependencies: open `index.html` in a browser (or serve the folder with any static server).

## Features

- **Isometric height maps** rendered on canvas with pixel-art units, camera panning and animated moves, jumps and spell bursts.
- **Charge Time turn system**: every unit accumulates CT by its Speed each tick and acts at 100. The turn order panel forecasts upcoming turns, including charging spells.
- **Move / Act / Wait turns** with a facing choice at the end. Skipping Move or Act refunds CT.
- **Facing and height matter**: side attacks halve evasion, back attacks can't be dodged, high ground boosts physical damage.
- **Charged abilities**: magic and Aim shots resolve after their charge fills; targets can move out of the area. Friendly fire applies to area spells.
- **Damage prediction** before you confirm any action (hit %, damage/heal, status chances, attack angle).
- **11 jobs** with an unlock tree (Squire, Chemist, Knight, Archer, Monk, Thief, White Mage, Black Mage, Time Mage, Ninja, Dragoon) plus monsters and a boss job.
- **JP progression**: earn JP by acting, learn abilities in the Formation screen, equip a secondary skillset from any job you've trained.
- **Statuses**: Poison, Regen, Haste, Slow, Stop, Protect, Shell. Stat breaks and buffs that last the battle.
- **Enemy AI** that evaluates every reachable tile × ability × target for damage, kills, healing and buffs.
- **Seven-chapter campaign** with story beats and recruits, plus repeatable training battles and a tavern for hiring.
- **Save/Continue** via localStorage.

## Controls

- Click a tile or button to act. Right-click / Esc cancels.
- Drag the map or use the arrow keys to pan.
- `?` in battle opens the rules summary.

## Project layout

```
index.html        screens and markup
css/style.css     styling
js/data.js        jobs, abilities, statuses, maps, campaign script
js/sprites.js     pixel sprite templates and palette rendering
js/unit.js        unit model, stats, leveling, JP
js/map.js         grid, pathfinding, range/area queries
js/battle.js      charge-time loop, actions, damage, statuses, AI
js/render.js      isometric canvas renderer and animations
js/ui.js          battle UI state machine (menus, targeting, prediction)
js/game.js        campaign flow, formation screen, saving
```
