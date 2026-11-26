import { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog, nativeTheme } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// ─── Dev mode detection ────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' ||
  !app.isPackaged ||
  process.argv.includes('--dev');

// ─── Global windows ───────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// ─── Paths ────────────────────────────────────────────────────────────────────
const ASSETS_DIR = isDev
  ? path.join(__dirname, '..', 'assets')
  : path.join(process.resourcesPath, 'assets');

const FRONTEND_DIR = isDev
  ? null
  : path.join(process.resourcesPath, 'frontend-build');

// ─── Splash Screen ────────────────────────────────────────────────────────────
function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 340,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load inline HTML splash — no file dependency
  const splashHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #06103A 0%, #0F2460 40%, #1E3A8A 70%, #1D4ED8 100%);
      border-radius: 16px;
      overflow: hidden;
      height: 340px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      position: relative;
    }
    .dots-bg {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .logo-ring {
      width: 88px; height: 88px;
      border: 3px solid rgba(255,255,255,.25);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,.1);
      margin-bottom: 20px;
      animation: pulse 2s infinite;
    }
    .logo-ring span { font-size: 36px; font-weight: 900; }
    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    h1 { font-size: 20px; font-weight: 800; letter-spacing: .05em; margin-bottom: 4px; }
    p { font-size: 11px; color: rgba(147,197,253,.8); letter-spacing: .15em; text-transform: uppercase; margin-bottom: 32px; }
    .bar-track {
      width: 280px; height: 4px;
      background: rgba(255,255,255,.12);
      border-radius: 999px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #60A5FA, #34D399);
      border-radius: 999px;
      animation: load 2.4s ease-out forwards;
    }
    @keyframes load { from{width:0%} to{width:100%} }
    .status { font-size: 10px; color: rgba(255,255,255,.45); margin-top: 10px; letter-spacing: .05em; }
    .version { position: absolute; bottom: 14px; font-size: 10px; color: rgba(255,255,255,.25); }
  </style>
</head>
<body>
  <div class="dots-bg"></div>
  <div class="logo-ring"><span>A</span></div>
  <h1>ALBA SERVICE GROUP</h1>
  <p>Platform — Kindu, Maniema</p>
  <div class="bar-track"><div class="bar-fill"></div></div>
  <div class="status" id="st">Initialisation...</div>
  <div class="version">v1.0.0</div>
  <script>
    const msgs = ['Chargement des modules...','Connexion à la base de données...','Vérification des sessions...','Prêt !'];
    let i = 0;
    const st = document.getElementById('st');
    const iv = setInterval(() => {
      if (i < msgs.length) { st.textContent = msgs[i++]; }
      else clearInterval(iv);
    }, 600);
  </script>
</body>
</html>`;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
  splashWindow.once('ready-to-show', () => splashWindow?.show());
}

// ─── Main Window ──────────────────────────────────────────────────────────────
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'ALBA SERVICE GROUP PLATFORM',
    show: false,
    backgroundColor: '#F5F7FA',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
    },
  });

  // Load the React SPA
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    const indexPath = path.join(FRONTEND_DIR!, 'index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:3000');
    }
  }

  mainWindow.webContents.on('did-finish-load', () => {
    // Close splash, show main
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }, 2600); // let splash animation complete
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // External links open in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  buildMenu();
}

// ─── Application Menu ─────────────────────────────────────────────────────────
function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'ALBA Platform',
      submenu: [
        { label: 'À propos', click: showAbout },
        { type: 'separator' },
        { label: 'Tableau de bord', click: () => navigate('/dashboard') },
        { type: 'separator' },
        { label: 'Quitter', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'Modules',
      submenu: [
        { label: 'Clients', accelerator: 'CmdOrCtrl+1', click: () => navigate('/clients') },
        { label: 'Imprimerie', accelerator: 'CmdOrCtrl+2', click: () => navigate('/print/orders') },
        { label: 'Commercial', accelerator: 'CmdOrCtrl+3', click: () => navigate('/commercial/invoices') },
        { label: 'Finance', accelerator: 'CmdOrCtrl+4', click: () => navigate('/finance/cash') },
        { label: 'Stock', accelerator: 'CmdOrCtrl+5', click: () => navigate('/stock') },
        { label: 'Ressources Humaines', accelerator: 'CmdOrCtrl+6', click: () => navigate('/employees') },
        { label: 'Documents', accelerator: 'CmdOrCtrl+7', click: () => navigate('/documents') },
        { label: 'Rapports', accelerator: 'CmdOrCtrl+8', click: () => navigate('/reports') },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forcer le rechargement', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Zoom +', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom −', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Réinitialiser le zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Plein écran', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Thème sombre',
          type: 'checkbox',
          checked: nativeTheme.shouldUseDarkColors,
          click: (item) => {
            nativeTheme.themeSource = item.checked ? 'dark' : 'light';
            mainWindow?.webContents.send('theme-change', item.checked ? 'dark' : 'light');
          },
        },
      ],
    },
    {
      label: 'Synchronisation',
      submenu: [
        { label: 'Synchroniser maintenant', accelerator: 'CmdOrCtrl+Shift+S', click: () => syncNow() },
        { label: 'Statut de synchronisation', click: () => navigate('/settings') },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://alba-service.com/docs') },
        { label: 'Signaler un bug', click: () => shell.openExternal('mailto:support@alba-service.com') },
        { type: 'separator' },
        { label: 'Outils de développement', accelerator: 'F12', role: 'toggleDevTools' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function navigate(route: string): void {
  mainWindow?.webContents.executeJavaScript(
    `(globalThis.__ELECTRON_NAVIGATE__ || window.__ELECTRON_NAVIGATE__) && (window.__ELECTRON_NAVIGATE__ || globalThis.__ELECTRON_NAVIGATE__)('${route}')`
  );
}

function syncNow(): void {
  mainWindow?.webContents.send('sync-now');
}

function showAbout(): void {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'À propos',
    message: 'ALBA SERVICE GROUP PLATFORM',
    detail: `Version : 1.0.0\nPlateforme : ${process.platform}\nElectron : ${process.versions.electron}\nNode.js : ${process.versions.node}\n\n© 2026 ALBA SERVICE GROUP\nKindu – Province du Maniema – R.D. Congo`,
    buttons: ['Fermer'],
    icon: undefined,
  });
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('app:get-info', () => ({
  platform: process.platform,
  arch: process.arch,
  version: app.getVersion(),
  isDev,
  userData: app.getPath('userData'),
  home: app.getPath('home'),
}));

ipcMain.handle('app:open-external', (_event, url: string) => {
  shell.openExternal(url);
});

ipcMain.handle('app:show-save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
  return dialog.showSaveDialog(mainWindow!, options);
});

ipcMain.handle('app:show-open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
  return dialog.showOpenDialog(mainWindow!, options);
});

ipcMain.handle('app:write-file', async (_event, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, 'utf8');
  return { success: true };
});

ipcMain.handle('app:read-file', async (_event, filePath: string) => {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
});

ipcMain.handle('app:get-db-path', () => {
  return path.join(app.getPath('userData'), 'alba-offline.db');
});

ipcMain.on('app:minimize', () => mainWindow?.minimize());
ipcMain.on('app:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.restore();
  else mainWindow?.maximize();
});
ipcMain.on('app:close', () => mainWindow?.close());

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createSplashWindow();
  setTimeout(createMainWindow, 300); // slight delay for splash to appear
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

// Security: prevent new window creation (setWindowOpenHandler handles this in each window)

// Auto-updater (production only)
if (!isDev && app.isPackaged) {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Mise à jour disponible',
        message: 'Une mise à jour a été téléchargée. Elle sera installée au prochain démarrage.',
        buttons: ['Installer maintenant', 'Plus tard'],
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
    });
  } catch {}
}
