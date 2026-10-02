/* The desktop wrapper: one window around the single-file build, for Steam
   and for anyone who wants the game as a program rather than a page.

   The game itself is app/index.html, copied in by the release workflow (or
   `npm run prepare-game`) from dist/elderon.html. Nothing is fetched; the
   window has no menu, remembers its size, and goes full screen on F11. */
const { app, BrowserWindow, screen, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const STATE = () => path.join(app.getPath('userData'), 'window.json');
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE(), 'utf8')); } catch (e) { return {}; } };
const writeState = (s) => { try { fs.writeFileSync(STATE(), JSON.stringify(s)); } catch (e) { /* the window simply opens at its default next time */ } };

function create() {
  const saved = readState();
  const area = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: Math.min(saved.width || 1280, area.width),
    height: Math.min(saved.height || 800, area.height),
    minWidth: 640, minHeight: 480,
    backgroundColor: '#0f1020',
    title: 'Chronicles of Elderon',
    icon: path.join(__dirname, 'icon.png'),
    fullscreen: !!saved.fullscreen,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // Any link the game opens (the privacy page, the credits) goes to the browser.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'Escape' && win.isFullScreen()) { win.setFullScreen(false); e.preventDefault(); }
  });
  const remember = () => {
    const b = win.getBounds();
    writeState({ width: b.width, height: b.height, fullscreen: win.isFullScreen() });
  };
  win.on('resize', remember); win.on('enter-full-screen', remember); win.on('leave-full-screen', remember);
}

app.whenReady().then(() => {
  create();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) create(); });
});
app.on('window-all-closed', () => app.quit());
