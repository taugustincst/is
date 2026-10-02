# itch.io page — Chronicles of Elderon

The free web release. itch.io hosts the game in its own frame, takes a zip
with `index.html` at its root, and asks for the settings below. The zip is
built by `node tools/itch.js` (and attached to every GitHub release as
`chronicles-of-elderon-<version>-itch.zip`); the copy is maintained here.

## Why itch first

The browser build is finished and costs nothing to host. itch.io gives it a
page with analytics (plays, downloads, where people came from), comments and
ratings from the people who actually play tactics games, and a way to take
donations without putting a price in front of a first-time player. Everything
learned there (where players stop, what they ask for, what they praise)
feeds the Steam page, where the same game sells for money.

## Upload

1. https://itch.io/game/new (a free account; verify the email first).
2. **Kind of project:** HTML. Upload `chronicles-of-elderon-<version>-itch.zip`
   and tick **This file will be played in the browser**.
3. **Embed options:** *Click to launch in fullscreen*; viewport **1280 × 800**;
   tick **Mobile friendly**, **Automatically start on page load**, and
   **Fullscreen button**. Orientation: *Default*. SharedArrayBuffer: off (not
   used).
4. **Pricing:** *No payments* at first, or *$0 or donate* with a suggested
   $4. Never *Paid* here while the Steam page is the paid one.
5. **Visibility:** *Draft* until the page below is filled, then *Public*.

Later uploads: `butler push dist/chronicles-of-elderon-itch.zip <user>/chronicles-of-elderon:html5 --userversion <version>`
from the release workflow, once the `BUTLER_API_KEY` secret and the
`ITCH_TARGET` variable (`<user>/chronicles-of-elderon`) are set in the
repository; until then, upload the zip by hand.

## Page

**Title** (the project name)

    Chronicles of Elderon

**Short description or tagline** (the line under the title; 180 max)

    A tactical RPG of tempo turns, jobs, height and facing. Five acts, thirty-five jobs, five endings. Plays in the browser, offline, no ads.

**Classification:** Games · **Genre:** Strategy (also Role Playing)

**Tags** (ten at most; itch's own vocabulary)

    Tactical RPG, Turn-based Strategy, Turn-Based Combat, Pixel Art, Isometric, Fantasy, JRPG, Singleplayer, Story Rich, Offline

**Made with:** JavaScript, HTML5 canvas, Web Audio

**Average session:** About an hour · **Languages:** English, German, French,
Spanish, Portuguese (Brazil), Japanese (the shell; the story is in English)
· **Inputs:** Mouse, Touchscreen, Keyboard

**Accessibility:** Configurable controls (no), subtitles (n/a), high-contrast
(no), interactive tutorial (yes), one-button (no). Reduced motion honoured.

**Links:** source and releases at https://github.com/taugustincst/fftremake ·
play online at https://taugustincst.github.io/fftremake/

**Description** (itch takes Markdown)

    **Two princes. One crown. A squire who knows too much.**

    Chronicles of Elderon is a tactical role-playing game in the tradition of
    the isometric classics. Lead a small company across five acts and
    twenty-four chapters of battles on height-mapped fields, from a border war
    to a haunted winter court to a sea of wrecks to a crown worth five
    different endings. Where you stand and which way you face matter as much
    as what you swing.

    **Tempo turns.** Every unit gains tempo each tick and acts at a hundred.
    Fast units act often; a slow spell may land after the battlefield has
    moved on. The turn order is always shown.

    **Height and facing.** High ground adds to a blow. A strike from the side
    halves evasion; from behind it cannot be dodged. Climb, jump, and turn the
    field to see what a wall is hiding.

    **Thirty-five jobs.** Footmen become knights, archers, monks, thieves,
    clerics, sorcerers, ninja and dragoons; then samurai, summoners,
    geomancers and bards; the Brass Concord's engineers and gunners; the
    Winter Court's frostweavers; the Sunder Sea's corsairs; the crown's
    marshals, inquisitors and duelists. Earn skill points, learn abilities,
    equip a second skillset, and pick your passives. 281 skills in all.

    **Beasts.** Tame a wild creature below half its health and it fights for
    you, with its own skills and a name of its own.

    **Five roads, five endings.** At the capital the road forks five ways,
    and the same company can walk every road from the same save.

    **Ten cities, each with a forge,** that betters gear to +3, makes arms sold
    nowhere else, and breaks spare gear down for materials.

    **No strings.** No ads, no accounts, no purchases, nothing downloaded after
    the page. Save codes carry a game between devices. Works on a phone.

    The whole game is drawn and sounded in code at run time: every sprite,
    every tile, every note of the score. It is open source.

**Screenshots:** `phone-2-spell.jpg`, `phone-4-attack.jpg`, `tablet-1-battle.jpg`,
`tablet-2-realm.jpg`, `phone-7-roads.jpg` from this folder, and the trailer
(`node tools/make-video.js`) uploaded to YouTube and linked under *Video*.

**Cover image:** `feature-graphic-1024x500.jpg` fits itch's 630 × 500 crop
poorly; use `steam-main-1232x706.jpg`, which itch scales down.

## Release post

Publish a short devlog with the first public version: what the game is, that
it is free and finished, and that the Steam version is coming. itch surfaces
projects with a devlog in its *Recent* feeds; a bare page is not shown.
