# Chronicles of Elderon — Tactics

A browser-based tactical RPG in the spirit of the classic isometric job-system
tactics games. No build step, no dependencies, no network: open `index.html` in
a browser, or serve the folder with any static file server.

> Two princes claim one crown. Rowan Aldric, youngest son of a house that chose
> the wrong side, rides north with the last of his companions.

## Play it

- **In a browser:** https://taugustincst.github.io/fftremake/ — the game as a
  progressive web app, installable from the browser menu and playable offline
  once opened. Published from `main` by `.github/workflows/pages.yml`, which
  writes the site to the `gh-pages` branch; GitHub Pages serves that branch
  (if the site ever needs switching on by hand: Settings → Pages → Source →
  Deploy from a branch → `gh-pages`).
- **On a computer:** the same release carries the game as a program for
  Windows, macOS and Linux (the `-win32-x64`, `-darwin-arm64`, `-darwin-x64`
  and `-linux-x64` zips): one window, no browser, made from the single-file
  build by the wrapper in `desktop/`. This is the build Steam sells;
  `store/STEAM.md` is the path through Steamworks and the store page's copy.
- **On itch.io:** the release's `-itch.zip` is the web build packed the way
  itch's uploader wants it; `store/ITCH.md` has the page settings and copy,
  and the release workflow pushes it with butler once the key is set.
- **On Android:** the [latest release](https://github.com/taugustincst/fftremake/releases/latest)
  carries an `.apk` to sideload (signed with a debug key, so it installs on
  any phone; it is not the Google Play bundle, which needs the upload key
  described in `android/PLAY_STORE.md`). The same release carries the whole
  game as a single `.html` file. Releases are cut by
  `.github/workflows/release.yml`: run it from the Actions tab with a version
  number, or push a tag such as `v1.8.1`.

## The game

**Names of this world.** The game stands in a tradition and borrows none of
its words: the jobs are footmen, apothecaries, clerics, sorcerers and
chronomancers; turns come by tempo, learning costs skill points, the coin
is the mark, and every spell, item, passive and spirit has a name of its
own. The ids under them are unchanged, so an old save loads as it was.


**Battle system**

- **Isometric height maps** drawn on canvas with pixel-art units, camera pan,
  zoom, and animated moves, leaps and spell bursts.
- **Turn the field.** The board rotates a quarter at a time, and turns rather
  than snaps: every angle in between is a real orientation, so you can watch it
  go. Height hides things, and turning is how you see behind a wall or line up
  a shot you could not see. A figure keeps its facing; what moves is the side
  of it you are looking at.
- **Nobody is a copy of anybody.** Hair, skin and a shade of dye come from a
  unit's own id, so a party of five footmen is five people and stays the same
  five across a reload. The team colour and the job's cloth never vary, because
  those are what a player has to read at a glance.
- **A score of its own.** Twelve pieces, composed for the game and played by
  a small synthesised band: a hymn for the title, the road song at camp, a
  theme for each kind of field from the marsh to the capital, a fanfare for a
  field won and a dirge for one lost. Every voice is a wave with a line to
  sing, over a drum line, all of it written as notes in `js/audio.js` and
  sounded by the Web Audio API with nothing recorded.
- **Cliffs with faces.** Every wall of the board is drawn as what it is:
  courses of dressed stone, strata of earth with stones set in it and roots
  through it, pale bands of packed snow and river ice, planks. A face darkens
  under its lip and at its foot, a higher tile throws its shadow onto the
  floor behind it, and the far edges of every tile catch the light.
- **Figures half again as tall,** at three pixels to the cell rather than two,
  with a stride as they walk: one foot lifted, then the other.
- **A frame on every panel** and a display face, Cinzel, carried inside the
  stylesheet, so the camp, the shop, the turn order and a dialog read as one
  object with the title.
- **Every blow has a voice.** Nine weapon swings and five impacts, so a knife
  is heard as a knife and an axe as an axe, and seven elements that sound as
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
- **Every item has a face.** A pixel icon for each kind of thing: fourteen
  weapon types, shields, hats, helms, crowns, armour, robes, cloaks, rings,
  boots, gloves, charms and the rest, the forge's materials, and the apothecary's
  potions. Metal ages with the tier, elemental pieces take their tint, a
  gem shows what a piece is best at, and a forge's +1 to +3 shows as pips.
  They appear in the shop, the baggage, every city's market and forge, the
  gear page, the results and the battle's Items menu.
- **Units wear what you give them.** Weapons, shields, helms, hats and armour
  are drawn on the sprite from the unit's actual equipment. Material shows its
  age through colour — iron, steel, mythril, gold — and elemental gear takes
  its element's tint, so a party's progress is legible across the field. The
  same sprite appears in Formation beside the dropdowns that dress it.
- **Tempo turns.** Every unit gains Tempo equal to its Speed each tick and
  acts at 100. The turn order panel forecasts who is next, including spells
  still charging and fallen units counting down.
- **Move, Act, then face.** Skipping either refunds Tempo toward your next turn.
- **Facing and height matter.** A side attack halves evasion and hits a tenth
  harder; a back attack cannot be dodged and hits a quarter harder; every
  level of high ground adds a twentieth, to a quarter, and every level of low
  ground takes it away. Jump limits what you can climb.
- **Charged abilities** resolve after their charge fills, so targets can walk
  out of the area. Area spells hit friends too.
- **Full prediction** before you commit: hit chance, damage or healing, status
  odds and the angle of attack.
- **A guide on the first field.** The first chapter walks a new player through
  deployment, Move, Act and facing in five short lines, then never returns;
  Skip ends it early, and training battles are never coached.

**Building a party**

- **Every trade has a second study.** Each of the thirty-five player jobs
  teaches six or more skills, the last two or three learned late and dearly:
  a Knight's Cleave and Sunder Armour, a Cleric's Dispel and Renew, a
  Chronomancer's Rewind and Time Theft, a Gunner's Double Tap, a Duelist's
  Flurry, a Hierophant's Benediction. 221 skills across the player jobs, and
  every one of the game's 281 abilities is proven to do something when used.
- **Thirty-five jobs** on an unlock tree — Footman, Apothecary, Knight, Archer,
  Monk, Thief, Cleric, Sorcerer, Chronomancer, Ninja, Dragoon; a second
  tier of Samurai, Summoner, Geomancer and Bard; a third of Paladin, Arcanist,
  Assassin and Sage; the Brass Concord's trades, Engineer, Gunner, Aeronaut
  and Artificer, with guns that ignore height, oil, steam, flares and lightning;
  the north's Frostweaver, Warden and Runeblade, learned back from the Winter
  Court; the sea's Corsair, Tidecaller and Harpooner, with a water element
  the drowned absorb and thunder they fear; the crown's Marshal, Inquisitor
  and Duelist; and at the top, the legendary
  Dragonlord, Hierophant and Fell Knight, whose arms the wagon sells only
  late in the war — plus nineteen creatures with their own skillsets and
  elemental identities (goblin, dire wolf, bomb, skeleton, marsh wisp,
  treant, clockwork sentinel, iron hound, steam colossus, rime wight, ice
  drake, the Nameless Cold, siren, reef crab, leviathan, the drowned, the
  Deep, griffon and golem) and bosses across five acts.
- **Beasts of the company.** A creature can fight on your side. An Archer's
  Tame, used on a wild creature below half its health, wins it over on the
  spot: it turns at once, takes a name of its own, and follows the company
  off a field you win. City kennels sell them outright. A beast keeps its
  kind, wears only a collar, and learns the skills of its kind as its bond
  deepens with every action it takes. Thirteen kinds can be kept, from a
  dire wolf to a griffon, four at a time.
- **A job tree you can read.** Every job on one page, in ranks from the
  roots to the summit, marked current, open, or locked with exactly how far
  off each requirement is — and a button to make the change from there.
- **Cities on the map.** Ten towns along the road, each held by someone who
  should not have it: reavers, holdouts, the Concord's customs men, the
  Court. Fight one open and it stays open: a tavern that hires recruits
  already trained in an advanced trade, and a market with two wares of its
  own the wagon never carries — twenty arms across all ten towns.
- **A forge in every open city.** It betters any weapon, shield, helm or
  armour to +1, +2 and +3 for materials and marks, each step its own item
  that the baggage counts and a save keeps; it makes twenty arms sold
  nowhere else, two to a town, the best guns among them; and it breaks
  spare gear down into materials. Seven materials, from bar iron to
  star-iron, and every won field leaves a few behind.
- **Errands.** Send a unit who is not the leader away from camp for a battle
  or two. They come back with marks, SP in the job they left in, and sometimes
  something found. Fourteen errands, two on the board at a time.
- **SP where you can see it**: the results roll-call shows what each unit
  earned and marks anyone with enough for something new; the camp and
  Formation lists carry the same mark.
- **A record for every soldier**: battles fought and won, enemies felled,
  and how often they have fallen, kept across saves.
- **SP progression.** Acting earns SP in your current job. Spend it on that
  job's abilities, equip any studied job's skillset as your secondary, and
  reach job levels to unlock the advanced classes.
- **Forty-four passive abilities** in three kinds: reaction (Counter, Parry,
  Stopgap Draught, Spellsiphon, Mending Blood, Vengeance, and others learned
  further up each tree), support (Might, Arcane Might, Defend, Unerring, Halve
  MP, Two-Handed, Iron Fists, Armour Training, and the elemental and job-bred
  passives the later acts add) and movement (Move +1/+2, Jump +2, Sure
  Footing, Walking Mend, Treasure Hunter, among them). Learn them in one job,
  equip them in any.
- **207 pieces of equipment** across weapon, offhand, head, body and accessory
  slots, gated by job equip classes. Gear drives weapon power and range,
  evasion and every stat. Ninja can dual wield; Two-Handed trades the offhand
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
- **The company, one swipe at a time.** On the unit page the arrows beside
  the portrait, a swipe across the page on a phone, or the ← → keys step to
  the next unit and the one before, keeping whichever tab is open, so gear
  can be fitted and SP spent across the whole company without going back to
  the list. The company is a ring: the last unit's next is the first.
- **Camp and unit pages in tabs**: the camp is Road, Company, Cities and
  Options; the unit page in Formation is Unit, Gear and Skills, with a mark
  on Skills when there is SP to spend. Nothing is more than a scroll away.
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
- **Seven elements** — fire, ice, thunder, earth, water, holy and dark — that creatures
  and equipment answer. A bomb drinks fire and burns in ice, a dire wolf fears
  fire, a fell knight feeds on dark and dreads holy. Absorbed attacks heal the
  target, and the targeting preview tells you before you commit.
- **Control statuses** alongside the buffs: Silence seals anything that costs
  MP, Blind halves physical accuracy, Berserk takes a unit out of its owner's
  hands for half again the damage. Remedy, Cleanse and the Ribbon answer them.
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

**Your game on another device.** Load Game → Export turns a save slot into a
code beginning `ELDERON1.` — copy it, share it, or save it as a file — and
Import a save code on the other device puts it in a slot there. Nothing leaves
the device unless you send it; there is no account and no cloud.

**Five languages.** The screens, menus, hints, questions and the guide speak
German, French, Spanish, Brazilian Portuguese and Japanese as well as English,
taken from the browser's language until you choose one on the title screen or in
the camp's Options tab. Names, the story, item and ability text and the help's
own paragraphs stay in English. The table is `js/i18n.js`, keyed by the English
text; `tools/validate.js` checks every language has every key.

**One file.** `node tools/bundle.js` writes `dist/elderon.html`: the stylesheet,
all ten scripts and the icons inlined into a single self-contained page with
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
js/i18n.js        the shell in five languages, keyed by the English text
js/audio.js       WebAudio synthesis: the combat sound table and the music sequencer
js/data.js        jobs, abilities, passives, items, statuses, training pools, errands
js/maps.js        every battlefield: heights, terrain, deployment, mood
js/story.js       the campaign's chapters and acts, the epilogue, the cities
js/sprites.js     sprite compositing: body templates, equipment glyphs, lighting
js/fx.js          battle effects: weapon swings, projectiles, elemental impacts, and what each sounds like
js/unit.js        unit model, stats, equipment, leveling, SP
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
tools/itch.js     packs that file as the zip itch.io's uploader takes
tools/make-video.js records the thirty-second trailer from the running game
desktop/          the Electron wrapper: the game as a program, for Steam
tools/make-icons.js draws the app icons from the game's own sprites
manifest.webmanifest  install metadata for the web app
sw.js             offline cache for the installed web app
icons/            generated app icons
android/          Gradle project wrapping the game in an Android WebView
store/            the store pages: Google Play, itch.io and Steam copy, graphics and policy answers
tools/make-store.js renders the listing graphics and Steam's capsules from the running game
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
AI on both sides, carrying levels, SP, marks and purchases forward, and prints the
win rate, length and party level per chapter.

## Notes on balance

Difficulty was tuned against `tools/simulate.js`, which plays the campaign end
to end with both sides driven by the game's own AI, carrying levels, SP, marks and
purchases forward between chapters and retrying a chapter it loses, as a player
would. On the middle setting with one training battle per chapter, every chapter
is cleared, first-attempt win rates run 60–100%, and chapters three, five and
seven take about one retry.

Equipment is the main lever: a party that shops well arrives ready, and one that
does not will grind. Camp says so plainly when the party is behind on levels or
on kit. A human will do better than the AI does with the same party, and losing
costs only time: experience and SP earned in a lost battle are kept and saved,
the chapter simply does not advance. If a chapter is still too steep, the Footman
setting drops the opposition a level and widens the purse.
