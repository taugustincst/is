# Chronicles of Elderon — Tactics

A browser-based tactical RPG in the spirit of the classic isometric job-system
tactics games. No build step, no dependencies, no network: open `index.html` in
a browser, or serve the folder with any static file server.

> Two princes claim one crown. Rowan Aldric, youngest son of a house that chose
> the wrong side, rides north with the last of his companions.

## The game

**Battle system**

- **Isometric height maps** drawn on canvas with pixel-art units, camera pan,
  zoom, and animated moves, leaps and spell bursts.
- **Charge Time turns.** Every unit gains CT equal to its Speed each tick and
  acts at 100. The turn order panel forecasts who is next, including spells
  still charging and fallen units counting down.
- **Move, Act, then face.** Skipping either refunds CT toward your next turn.
- **Facing and height matter.** Side attacks halve evasion, back attacks cannot
  be dodged, high ground adds damage, and Jump limits what you can climb.
- **Charged abilities** resolve after their charge fills, so targets can walk
  out of the area. Area spells hit friends too.
- **Full prediction** before you commit: hit chance, damage or healing, status
  odds and the angle of attack.

**Building a party**

- **Eleven jobs** on an unlock tree — Squire, Chemist, Knight, Archer, Monk,
  Thief, White Mage, Black Mage, Time Mage, Ninja, Dragoon — plus monsters and
  a boss job for the other side.
- **JP progression.** Acting earns JP in your current job. Spend it on that
  job's abilities, equip any studied job's skillset as your secondary, and
  reach job levels to unlock the advanced classes.
- **Twenty passive abilities** in three kinds: reaction (Counter, Parry,
  Auto-Potion, Absorb MP, Regenerator, Vengeance), support (Attack Up, Magick
  Up, Defend, Concentrate, Halve MP, Two Hands, Martial Arts, Equip Armor) and
  movement (Move +1/+2, Jump +2, Sure Footing, Move-HP-Up, Treasure Hunter).
  Learn them in one job, equip them in any.
- **52 pieces of equipment** across weapon, offhand, head, body and accessory
  slots, gated by job equip classes. Gear drives weapon power and range,
  evasion and every stat. Ninja can dual wield; Two Hands trades the offhand
  for half again the weapon power.
- **A shop** whose stock widens as the campaign advances, with selling,
  battlefield loot and an Optimize button.

**Battles and campaign**

- **Deployment phase.** Choose who fights and where they stand before the first
  tick, with the enemy roster laid out in front of you.
- **Objectives** beyond routing the field: defeat the commander, or hold out a
  set number of turns. Campaign battles are lost if the party leader is lost.
- **Fallen units** keep their place in the turn order and count down three
  turns before they are carried off. Revive them in time and they stay.
- **Seven chapters** with story beats and recruits, repeatable training
  battles, and a tavern for hiring.
- **Procedural audio**: sound effects and three looping pieces synthesised at
  runtime with WebAudio, with sound and music toggles.
- **Save and continue** through localStorage.

## Controls

| Action | Mouse | Touch | Keyboard |
| --- | --- | --- | --- |
| Select a tile or command | Click | Tap | `1`–`9` for menu entries |
| Cancel | Right-click | Cancel button | `Esc` |
| Pan the camera | Drag | Drag | Arrow keys |
| Zoom | Wheel | Pinch | `+` / `-`, `0` to reframe |

The `?` button in battle opens a rules summary.

## Project layout

```
index.html        screens and markup
css/style.css     styling, including the small-screen layout
js/audio.js       WebAudio synthesis: effects and the music sequencer
js/data.js        jobs, abilities, passives, items, statuses, maps, campaign
js/sprites.js     pixel sprite templates and palette rendering
js/unit.js        unit model, stats, equipment, leveling, JP
js/map.js         grid, pathfinding, range and area queries
js/battle.js      charge time loop, actions, damage, statuses, objectives, AI
js/render.js      isometric canvas renderer and animations
js/ui.js          battle UI: deployment, menus, targeting, prediction, input
js/game.js        campaign flow, formation, shop, saving
```

## Notes on balance

Difficulty was tuned against a simulator that plays the campaign end to end
with both sides driven by the game's own AI, carrying levels, JP, gil and
purchases forward between chapters. With one training battle per chapter, a
party that learns abilities and shops clears each chapter roughly 55–100% of
the time, with the middle chapters the hardest. A human will do better than the
AI does with the same party, and losing a battle costs only time: the party
keeps the experience and JP it earned and can try again.
