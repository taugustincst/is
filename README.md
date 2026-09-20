# Chronicles of Elderon — Tactics

A browser-based tactical RPG in the spirit of the classic isometric job-system
tactics games. No build step, no dependencies, no network: open `index.html` in
a browser, or serve the folder with any static file server.

> Two princes claim one crown. Rowan Aldric, youngest son of a house that chose
> the wrong side, rides north with the last of his companions.

> **Also in this repository:** [`pantry/`](pantry/README.md) is Pantry Scan, a
> separate progressive web app for home cooks. Photograph a receipt or your
> groceries, it reads the text on the phone and turns it into a pantry, then
> ranks fifty recipes by what you can cook right now. Same rules as the game:
> no build step, no dependencies, no backend, and its own Android wrapper in
> [`pantry/android/`](pantry/android/README.md).

## The game

**Battle system**

- **Isometric height maps** drawn on canvas with pixel-art units, camera pan,
  zoom, and animated moves, leaps and spell bursts.
- **Turn the field.** The board rotates a quarter at a time, and turns rather
  than snaps: every angle in between is a real orientation, so you can watch it
  go. Height hides things, and turning is how you see behind a wall or line up
  a shot you could not see. A figure keeps its facing; what moves is the side
  of it you are looking at.
- **Nobody is a copy of anybody.** Hair, skin and a shade of dye come from a
  unit's own id, so a party of five squires is five people and stays the same
  five across a reload. The team colour and the job's cloth never vary, because
  those are what a player has to read at a glance.
- **Every blow has a voice.** Nine weapon swings and five impacts, so a knife
  is heard as a knife and an axe as an axe, and six elements that sound as
  different as they look. A bowstring twangs, an arrow thuds, a thrown stone
  lands as a stone whatever the thrower is holding, and a spell is heard being
  gathered before it arrives. Twenty-eight sounds, all synthesised at runtime,
  none downloaded.
- **Every blow has a shape.** A sword sweeps an arc, a spear drives a thrust,
  an axe falls, a bow puts an arrow in the air that takes time to arrive.
  Elements answer differently where they land: fire climbs, ice spikes and
  shatters, thunder falls, earth erupts, holy rises, dark contracts. A landed
  hit flashes its target, shoves them back and shakes the view by how hard it
  was, and a charging spell rings both its caster and the ground it is aimed
  at, so you can see what is coming and move. All of it stands down for
  anyone whose system asks for reduced motion — the flourishes, the shake,
  the knockback and the camera pans alike, while the information they carry
  stays.
- **Units wear what you give them.** Weapons, shields, helms, hats and armour
  are drawn on the sprite from the unit's actual equipment. Material shows its
  age through colour — iron, steel, mythril, gold — and elemental gear takes
  its element's tint, so a party's progress is legible across the field. The
  same sprite appears in Formation beside the dropdowns that dress it.
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

- **Thirty-five jobs** on an unlock tree — Squire, Chemist, Knight, Archer,
  Monk, Thief, White Mage, Black Mage, Time Mage, Ninja, Dragoon; a second
  tier of Samurai, Summoner, Geomancer and Bard; a third of Paladin, Arcanist,
  Assassin and Sage; the Brass Concord's trades, Engineer, Gunner, Aeronaut
  and Artificer, with guns that ignore height, oil, steam, flares and lightning;
  the north's Frostweaver, Warden and Runeblade, learned back from the Winter
  Court; the sea's Corsair, Tidecaller and Harpooner, with a water element
  the drowned absorb and thunder they fear; the crown's Marshal, Inquisitor
  and Duelist; and at the top, the legendary
  Dragonlord, Hierophant and Fell Knight, whose arms the wagon sells only
  late in the war — plus seventeen creatures with their own skillsets and
  elemental identities (goblin, dire wolf, bomb, skeleton, marsh wisp,
  treant, clockwork sentinel, iron hound, steam colossus, rime wight, ice
  drake, the Nameless Cold, siren, reef crab, leviathan, the drowned, the
  Deep, griffon and golem) and bosses across five acts.
- **A job tree you can read.** Every job on one page, in ranks from the
  roots to the summit, marked current, open, or locked with exactly how far
  off each requirement is — and a button to make the change from there.
- **Cities on the map.** Ten towns along the road, each held by someone who
  should not have it: reavers, holdouts, the Concord's customs men, the
  Court. Fight one open and it stays open: a tavern that hires recruits
  already trained in an advanced trade, and a market that sells twelve arms
  the wagon never carries.
- **Errands.** Send a unit who is not the leader away from camp for a battle
  or two. They come back with gil, JP in the job they left in, and sometimes
  something found. Ten errands, two on the board at a time.
- **JP where you can see it**: the results roll-call shows what each unit
  earned and marks anyone with enough for something new; the camp and
  Formation lists carry the same mark.
- **A record for every soldier**: battles fought and won, enemies felled,
  and how often they have fallen, kept across saves.
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
- **A baggage screen** with everything spare shelved by category and kind,
  swords with swords and robes with robes; hand a piece to anyone who can
  wear it from the shelf, sell it there, or take a piece off someone in the
  worn-by-the-party table. The shop and the Formation dropdowns shelve the
  same way.
- **A shop** whose stock widens as the campaign advances, with selling,
  battlefield loot and an Optimize button.

**Battles and campaign**

- **Three save slots**, each listed with where the game stands, the company's
  size and level, playtime and when it was saved. New Game takes an empty
  slot or asks which to write over; Continue takes the latest.
- **Skip** on any story page, **Try again** on a lost battle without the story
  before it, **Undo Move** until a unit acts, and any flagged stop on the map
  can be fought again for half the pay. Statuses on the unit card say what
  they do.
- **Camp and unit pages in tabs**: the camp is Road, Company, Cities and
  Options; the unit page in Formation is Unit, Gear and Skills, with a mark
  on Skills when there is JP to spend. Nothing is more than a scroll away.
- **Deployment phase.** Choose who fights and where they stand before the first
  tick, with the enemy roster laid out in front of you.
- **Objectives** beyond routing the field: defeat the commander, or hold out a
  set number of turns. Campaign battles are lost if the party leader is lost.
- **Crystals of the fallen.** Where a unit is carried off, a crystal remains;
  end a move on it and that unit is restored in full. The enemy goes for one
  when badly hurt, and so should you.
- **Fallen units** keep their place in the turn order and count down three
  turns before they are carried off. Revive them in time and they stay.
- **Five endings.** The fifth act, The Crown of Elderon, runs two chapters to
  the capital and then forks: the Crown, the Free Cities, the Long Road, the
  Quiet and the Iron Crown, each two chapters and an ending of its own, with
  the party changed by the road it takes. A finished road can be walked back
  to the capital to take another, and a save remembers every ending seen.
- **Twenty-four common chapters in five acts** with story beats and recruits: the war
  of the princes; the Brass Concord that sold it to both sides, from the coast
  road to Brassgate; the Winter Court north of the ice, over a frozen
  river, through a thralled village and up a glacier to the crater at
  Starfall where the thing behind both wars fell from the sky; and the
  Sunder Sea, where what went out of the crater found a drowned city, a
  priory that sings to a star, and a queen who has knelt for four hundred
  years; and the capital, where the king is dead and every claimant waits to
  see what the company will do. A night around the fire before every chapter,
  and an epilogue of its own after every ending. Repeatable
  training
  battles across ten fields, and a tavern for hiring.
- **Know your enemy.** An enemy's card lists the skills it has, so a Coven
  Mage's Fire or a priest's Raise is never a surprise.
- **Threat range on a tap.** Tap an enemy while choosing an action, or during
  deployment, and every tile it could strike next turn turns violet.
- **Auto-battle** from the bar or the A key hands your turns to the computer
  until you take them back: for training fights, not the hard ones.
- **Battle speed** of 1×, 2× or 3× from the bar or the F key, for once you
  have watched enough enemy turns; nothing is skipped, it just goes faster.
- **Every field has a mood**: its own sky and light, snow and aurora in the
  north, mist over the ruins,
  embers on the ridge, rain at the gate, fireflies in the marsh, and one of
  three battle themes chosen to match.
- **A map of the realm** at camp: every chapter as a stop along a road, with five spurs out of the capital,
  coloured by the mood of each field, with your leader standing where the
  story has reached. Tap the next stop to march.
- **Trials after the war**: once the campaign is won the road keeps going,
  with numbered battles that climb a level or two above the party each time.
  Losing one costs nothing.
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
- **Every field has a voice** under the music: rain on the marsh road, wind
  over the ridge, frogs in the marsh, crackle in the embers, crickets at
  night, all synthesised, and muted with the music.
- **Procedural audio**: sound effects and three looping pieces synthesised at
  runtime with WebAudio, with sound and music toggles.
- **Save and continue** through localStorage.

## Playing on a phone

The game is built for touch as well as mouse, in either orientation. There are
three ways to get it onto a phone, in order of how little work they take.

**One file.** `node tools/bundle.js` writes `dist/elderon.html`: the stylesheet,
all nine scripts and the icons inlined into a single self-contained page with
nothing else to fetch. Send it to the phone however you like — a download, a
message, a memory stick — and open it. It plays straight off the filesystem with
no server, and saves persist. Host that one file anywhere and it is also a
complete web build.

**Install the web version.** Served over HTTPS, the game is a progressive web
app: open it in Chrome and choose "Install app". It lands on the home screen
with its own icon, launches fullscreen and runs offline. The single-file build
builds its own manifest at runtime, so it offers to install too.

**Build the Android app.** `android/` holds a Gradle project that wraps the game
in a WebView and bundles it into an app with no permissions at all — it cannot
reach the network. `cd android && ./gradlew assembleDebug` for a debug APK,
`./gradlew bundleRelease` for the bundle Google Play takes. See
[android/README.md](android/README.md) for how the shell works and
[android/PLAY_STORE.md](android/PLAY_STORE.md) for the path through the Play
Console; the listing copy, policy answers and graphics are in
[store/](store/LISTING.md). The project targets Android 16 as Play requires,
but it was written without access to the Android SDK, so the first real build
is yours.

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
| Turn the field | ↺ ↻ buttons | ↺ ↻ buttons | `Q` / `E` |
| Battle speed | 1× button | 1× button | `F` |

The `?` button in battle opens a rules summary.

## Project layout

```
index.html        screens and markup
css/style.css     styling, including the small-screen layout
js/audio.js       WebAudio synthesis: the combat sound table and the music sequencer
js/data.js        jobs, abilities, passives, items, statuses, training pools, errands
js/maps.js        every battlefield: heights, terrain, deployment, mood
js/story.js       the campaign's chapters and acts, the epilogue, the cities
js/sprites.js     sprite compositing: body templates, equipment glyphs, lighting
js/fx.js          battle effects: weapon swings, projectiles, elemental impacts, and what each sounds like
js/unit.js        unit model, stats, equipment, leveling, JP
js/map.js         grid, pathfinding, range and area queries
js/battle.js      charge time loop, actions, damage, statuses, objectives, AI
js/render.js      isometric canvas renderer and animations
js/ui.js          battle UI: deployment, menus, targeting, prediction, input
js/game.js        campaign flow, formation, shop, saving
tools/load.js     loads the game scripts into a Node sandbox
tools/validate.js content consistency checks
tools/regress.js  engine regression checks
tools/soak.js     randomised battles checked against the engine's invariants
tools/test-*.js   feature tests for elements, statuses and the boss
tools/simulate.js campaign balance simulator
tools/bundle.js   packs the whole game into one self-contained HTML file
tools/make-icons.js draws the app icons from the game's own sprites
manifest.webmanifest  install metadata for the web app
sw.js             offline cache for the installed web app
icons/            generated app icons
android/          Gradle project wrapping the game in an Android WebView
store/            Google Play listing: graphics, copy and policy answers
tools/make-store.js renders the listing graphics from the running game
PRIVACY.md        the privacy policy Play asks for (privacy.html is the same, as a page)
```

## Tools

The engine and its data are plain scripts, so they can be exercised from Node
without a browser:

```
node tools/validate.js          # check maps, jobs, items, passives and chapters
node tools/regress.js           # replay the engine bugs a review once found
node tools/soak.js 60           # randomised battles, checked against the invariants
node tools/test-elements.js     # elemental affinities, absorption, prediction, AI
node tools/test-statuses.js     # Silence, Blind, Berserk and what answers them
node tools/test-boss.js         # the final battle's second shape
node tools/simulate.js 20 1 3   # 20 campaigns, 1 training battle per chapter, 3 retries
npm run test:browser            # the Playwright suite in tests/browser (needs playwright-core and a Chromium)
bash tests/browser/run.sh t-qol # one test, by name
```

[tools/README.md](tools/README.md) describes each of them.

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
