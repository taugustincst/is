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
  Thief, White Mage, Black Mage, Time Mage, Ninja, Dragoon — plus six creatures
  with their own skillsets and elemental identities (goblin, dire wolf, bomb,
  skeleton, marsh wisp, treant) and two shapes of boss.
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
- **Three difficulty settings** that shift the opposition rather than the party,
  so your own numbers always mean the same thing: enemy level, equipment tier
  and the size of the purse. Changeable at any time from camp.
- **Six elements** — fire, ice, thunder, earth, holy and dark — that creatures
  and equipment answer. A bomb drinks fire and burns in ice, a dire wolf fears
  fire, a fell knight feeds on dark and dreads holy. Absorbed attacks heal the
  target, and the targeting preview tells you before you commit.
- **Control statuses** alongside the buffs: Silence seals anything that costs
  MP, Blind halves physical accuracy, Berserk takes a unit out of its owner's
  hands for half again the damage. Remedy, Esuna and the Ribbon answer them.
- **A two-shape final battle.** At about a third of his health the man goes
  down and something else stands up in his armour.
- **Procedural audio**: sound effects and three looping pieces synthesised at
  runtime with WebAudio, with sound and music toggles.
- **Save and continue** through localStorage.

## Playing on a phone

The game is built for touch as well as mouse, in either orientation, and there
are two ways to get it onto an Android device.

**Install the web version.** It is a progressive web app: serve the repository
over HTTPS, open it in Chrome and choose "Install app". It lands on the home
screen with its own icon, launches fullscreen and runs offline, with no
toolchain involved.

**Build the Android app.** `android/` holds a Gradle project that wraps the game
in a WebView and bundles it into an APK with no permissions at all — it cannot
reach the network. `cd android && ./gradlew assembleDebug`. See
[android/README.md](android/README.md), which is honest about the fact that the
project has never been compiled: the Android SDK was not reachable from the
environment it was written in.

On a phone the layout changes shape: portrait turns the turn order into a strip
across the top and gives the command panel the full width, landscape puts
columns down each side. The board is framed in whatever the panels are not
covering, and never shrinks below a legible size — it runs off the edges and you
pan instead. The back button steps back through the game rather than closing it.

## Controls

| Action | Mouse | Touch | Keyboard |
| --- | --- | --- | --- |
| Select a tile or command | Click | Tap | `1`–`9` for menu entries |
| Cancel | Right-click | Cancel button | `Esc` |
| Pan the camera | Drag | Drag | Arrow keys |
| Zoom | Wheel | Pinch | `+` / `-`, `0` to reframe |
| Back / cancel | Right-click | Android back button | `Esc` |

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
tools/load.js     loads the game scripts into a Node sandbox
tools/validate.js content consistency checks
tools/regress.js  engine regression checks
tools/test-*.js   feature tests for elements, statuses and the boss
tools/simulate.js campaign balance simulator
tools/make-icons.js draws the app icons from the game's own sprites
manifest.webmanifest  install metadata for the web app
sw.js             offline cache for the installed web app
icons/            generated app icons
android/          Gradle project wrapping the game in an Android WebView
```

## Tools

The engine and its data are plain scripts, so they can be exercised from Node
without a browser:

```
node tools/validate.js          # check maps, jobs, items, passives and chapters
node tools/regress.js           # replay the engine bugs a review once found
node tools/test-elements.js     # elemental affinities, absorption, prediction, AI
node tools/test-statuses.js     # Silence, Blind, Berserk and what answers them
node tools/test-boss.js         # the final battle's second shape
node tools/simulate.js 20 1 3   # 20 campaigns, 1 training battle per chapter, 3 retries
```

`validate.js` catches content mistakes: a map row of the wrong width, a unit
placed on water or stranded where nothing can walk to it, an ability a job
refers to but that does not exist, a starter item with a sell value.
`regress.js` replays each engine bug an adversarial review once found, so a
change that brings one back fails there rather than in a player's battle. `simulate.js` runs whole campaigns with the game's own
AI on both sides, carrying levels, JP, gil and purchases forward, and prints the
win rate, length and party level per chapter.

## Notes on balance

Difficulty was tuned against `tools/simulate.js`, which plays the campaign end
to end with both sides driven by the game's own AI, carrying levels, JP, gil and
purchases forward between chapters and retrying a chapter it loses, as a player
would. On the middle setting with one training battle per chapter, every chapter
is cleared, first-attempt win rates run 60–100%, and chapters three, five and
seven take about one retry.

Equipment is the main lever: a party that shops well arrives ready, and one that
does not will grind. Camp says so plainly when the party is behind on levels or
on kit. A human will do better than the AI does with the same party, and losing
costs only time: experience and JP earned in a lost battle are kept and saved,
the chapter simply does not advance. If a chapter is still too steep, the Squire
setting drops the opposition a level and widens the purse.
