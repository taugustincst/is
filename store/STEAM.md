# Steam — Chronicles of Elderon

The paid release. Steam sells programs, so the game ships there as the
desktop build in `desktop/` (one window around the single-file web build),
packaged for Windows, macOS and Linux by the release workflow. This file is
the path through Steamworks and the copy for the store page; the images are
rendered into this folder by `node tools/make-store.js`.

## The order of things

1. **Steamworks account.** https://partner.steamgames.com — the one-time
   app fee (US$100, recouped once the game earns US$1,000), tax and bank
   details, identity verification. Allow a week or two for the paperwork.
2. **Store page first, build later.** A page can go up as *Coming Soon* long
   before the game is on sale, and every day it is up collects wishlists.
   Valve reviews a page in two to five working days; a *Coming Soon* page must
   be public for at least two weeks before release.
3. **Wishlists.** The store's launch-week visibility is ranked by wishlists.
   Seven thousand before launch is the figure usually quoted for a place in
   *Popular Upcoming*; a solo game without marketing gathers hundreds to a
   few thousand in a year. Open the page early, link it from the itch.io
   page and the web game's title screen, and put a demo in the next
   **Steam Next Fest** (one appearance per game, before release).
4. **Builds.** SteamPipe takes a depot per platform. The release workflow
   produces `chronicles-of-elderon-<version>-win32-x64.zip`,
   `-darwin-x64.zip`, `-darwin-arm64.zip` and `-linux-x64.zip`; unzip each
   into its depot's content folder and run the content builder (below).
5. **Launch options.** One per platform, pointing at the executable:
   `Chronicles of Elderon.exe` (Windows), `Chronicles of Elderon.app`
   (macOS), `Chronicles of Elderon` (Linux). No arguments.
6. **Steam Deck.** The Linux build runs natively; mark the game *Playable* on
   Deck in the questionnaire after trying it (the game is touch- and
   gamepad-less: it needs the trackpad or a mouse, so *Playable*, not
   *Verified*, unless controller support is added).
7. **Price.** US$4.99, with the standard regional pricing Steam suggests and
   a 10% launch discount for the first week. The game has no purchases,
   no accounts and no telemetry, which the store page should say plainly.
8. **Release.** Set the date at least two weeks out, press the button on the
   day. Steam's *Daily Deal* and seasonal sales come later and bring more than
   the launch does for most small games.

## Store page

**Name:** Chronicles of Elderon

**Short description** (300 max, 255 used)

    A tactical RPG of tempo turns, jobs, height and facing. Lead a small company through five acts and twenty-four chapters to a crown worth five endings. Thirty-five jobs, 281 skills, beasts to tame, forges in ten cities. No accounts, no purchases.

**About this game** (Steam's editor; headings are its own markup)

    [h2]Two princes. One crown. A squire who knows too much.[/h2]
    Chronicles of Elderon is a tactical role-playing game in the tradition of the isometric classics. Lead a small company across five acts and twenty-four chapters of battles on height-mapped fields, from a border war to a haunted winter court to a sea of wrecks to a crown worth five different endings. Where you stand and which way you face matter as much as what you swing.

    [h2]Tempo turns[/h2]
    Every unit gains tempo each tick and acts at a hundred. Fast units act often; a slow spell may land after the battlefield has moved on. The turn order is always shown, so you can plan around it.

    [h2]Height and facing[/h2]
    Every level of high ground adds to a blow, to a quarter more. A strike from the side halves evasion and lands a tenth harder; from behind it cannot be dodged and lands a quarter harder. Climb, jump, and turn the field to see what a wall is hiding.

    [h2]Thirty-five jobs[/h2]
    Footmen become knights, archers, monks, thieves, clerics, sorcerers, chronomancers, ninja and dragoons; then samurai, summoners, geomancers and bards; then paladins, arcanists, assassins and sages; the Brass Concord's engineers, gunners, aeronauts and artificers; the Winter Court's frostweavers, wardens and runeblades; the Sunder Sea's corsairs, tidecallers and harpooners; the crown's marshals, inquisitors and duelists; and the legendary Dragonlord, Hierophant and Fell Knight above them all. Earn skill points in battle, learn abilities, equip a second skillset from any job you have studied, and pick your reaction, support and movement passives. 281 skills across the game, every one of them proven to do something.

    [h2]Beasts of the company[/h2]
    An archer's Tame wins over a wild creature below half its health. It turns at once, takes a name of its own, and learns the skills of its kind as its bond deepens. Thirteen kinds can be kept, from a dire wolf to a griffon.

    [h2]Five roads, five endings[/h2]
    At the capital the company's road forks five ways: take the crown, break it for a council of the cities, run the blockade and sail away, lay down the sword and go home, or seize the throne by force and pay the price for it. Every ending is recorded, and the same company can walk every road from the same save.

    [h2]A kingdom to cross[/h2]
    Ten cities across five acts, each fought open, each with its own wares and a forge that betters gear to +3, makes arms sold nowhere else and breaks spare gear down for materials. Errands for the units you leave behind. A record for every soldier.

    [h2]No strings[/h2]
    No accounts. No purchases. No telemetry. The whole game is on your machine. Save codes carry a game between the desktop and the free browser version.

**Genres:** Strategy, RPG · **Sub-genres:** Tactical RPG, Turn-Based Tactics

**Tags** (up to twenty; the first five weigh most)

    Tactical RPG, Turn-Based Tactics, Turn-Based Strategy, Pixel Art, Isometric,
    Party-Based RPG, Fantasy, Story Rich, Multiple Endings, Singleplayer,
    Class-Based, Character Customization, Strategy RPG, JRPG, Grid-Based Movement,
    Tactical, Medieval, Choices Matter, Indie, 2D

**Features:** Single-player, Family Sharing. (No achievements, cloud saves or
controller support at launch; add Steam Cloud once the Steamworks SDK is
wired into the desktop build.)

**Languages:** Interface: English, German, French, Spanish (Spain),
Portuguese (Brazil), Japanese. Full audio: n/a (no voices). Subtitles:
English. Say in the description that the story is in English in every
language, or the Japanese reviews will say it for you.

**Mature content:** none to declare. Fantasy violence, no blood.

**System requirements** (the desktop build is Electron: a browser engine)

| | Minimum |
|---|---|
| OS | Windows 10 64-bit · macOS 11 · Ubuntu 20.04 or equivalent |
| Processor | Any 64-bit dual core |
| Memory | 4 GB |
| Graphics | Anything from the last ten years |
| Storage | 300 MB |

## Images

All rendered by `node tools/make-store.js`; the sizes are Steam's.

| Steam asset | File |
|---|---|
| Header capsule 920×430 | `steam-header-920x430.jpg` |
| Small capsule 462×174 | `steam-small-462x174.jpg` |
| Main capsule 1232×706 | `steam-main-1232x706.jpg` |
| Vertical capsule 748×896 | `steam-vertical-748x896.jpg` |
| Library capsule 600×900 | `steam-library-600x900.jpg` |
| Library header 920×430 | `steam-library-header-920x430.jpg` |
| Library hero 3840×1240 | `steam-hero-3840x1240.jpg` |
| Library logo 1280×720 (transparent) | `steam-logo-1280x720.png` |
| Community icon 184×184 | `steam-community-184x184.jpg` |
| Client icon 32×32 .ico | make from `icon-512.png` with any converter |
| Screenshots (at least five, 1920×1080 or 16:10) | `tablet-1-battle.jpg`, `tablet-2-realm.jpg` (2560×1600), plus three more from a 1920×1080 run of the game |
| Trailer | `trailer.webm` from `node tools/make-video.js`, converted to H.264 .mp4 (Steam requires it): `ffmpeg -i store/trailer.webm -c:v libx264 -crf 20 -pix_fmt yuv420p store/trailer.mp4` |

## Content builder

With the Steamworks SDK unpacked and the depots created in the app admin:

    "AppBuild" {
      "AppID" "<appid>"  "Desc" "<version>"
      "ContentRoot" "content/"  "BuildOutput" "output/"
      "Depots" {
        "<win-depot>"   { "FileMapping" { "LocalPath" "win32-x64/*"   "DepotPath" "." "Recursive" "1" } }
        "<mac-depot>"   { "FileMapping" { "LocalPath" "darwin-arm64/*" "DepotPath" "." "Recursive" "1" } }
        "<linux-depot>" { "FileMapping" { "LocalPath" "linux-x64/*"   "DepotPath" "." "Recursive" "1" } }
      }
    }

    steamcmd +login <account> +run_app_build app_build.vdf +quit

Set the build live on the `default` branch in the app admin. macOS: ship the
arm64 build for Apple silicon and an x64 depot for Intel, or one universal
build later.

## Signing

Steam does not require signed executables. A build downloaded outside Steam
does: Windows (an EV or OV code-signing certificate, US$200–400 a year) and
macOS (an Apple Developer account, US$99 a year, with notarization). Neither
is needed for the Steam release itself.
