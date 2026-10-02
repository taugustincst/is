# The desktop build

One window around the single-file web build, made with Electron: the game as
a program for Windows, macOS and Linux, which is what Steam sells. The game
inside the window is exactly the browser game; nothing is fetched and no
service worker runs.

## Run it from here

    cd desktop
    npm install
    npm start

`npm start` rebuilds `dist/elderon.html` from the sources, copies it to
`desktop/app/index.html` with the icon, and opens the window. F11 toggles
full screen; the window size and the full-screen state are remembered.

## Package it

    npm run package                       # this machine's platform
    npx electron-packager . "Chronicles of Elderon" --platform=win32 --arch=x64 --out=out --overwrite --asar
    npx electron-packager . "Chronicles of Elderon" --platform=darwin --arch=arm64 --out=out --overwrite --asar

Each lands in `desktop/out/<name>-<platform>-<arch>/`. The release workflow
(`.github/workflows/release.yml`, the `desktop` job) packages Windows, macOS
(Intel and Apple silicon) and Linux on every release and attaches a zip of
each. None is code-signed: Windows shows its SmartScreen notice and macOS its
Gatekeeper one on first launch. Steam's own installer does not care; a
direct download outside Steam will want a signing certificate for each,
which only the owner can hold (see `store/STEAM.md`).

## What is in the window

- `main.js` makes the window and nothing else: no menu, no Node access from
  the page, links opened in the system browser.
- `app/index.html` is the game, copied in by `prepare-game`; it is not kept in
  the repository.
- `icon.png` is the 512 px app icon, copied from `icons/`.
