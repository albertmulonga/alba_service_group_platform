import { contextBridge, ipcRenderer } from 'electron';

// ─── Type definitions exposed to the renderer ─────────────────────────────────
export interface ElectronAPI {
  platform: NodeJS.Platform;
  versions: NodeJS.ProcessVersions;
  isDesktop: true;
  getInfo: () => Promise<{
    platform: string; arch: string; version: string; isDev: boolean;
    userData: string; home: string;
  }>;
  openExternal: (url: string) => Promise<void>;
  showSaveDialog: (options?: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
  showOpenDialog: (options?: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>;
  readFile: (filePath: string) => Promise<string | null>;
  getDbPath: () => Promise<string>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  onThemeChange: (cb: (theme: 'light' | 'dark') => void) => () => void;
  onSyncNow: (cb: () => void) => () => void;
  onNavigate: (cb: (route: string) => void) => () => void;
  registerNavigator: (fn: (route: string) => void) => void;
}

const api: ElectronAPI = {
  platform: process.platform,
  versions: process.versions,
  isDesktop: true,

  getInfo: () => ipcRenderer.invoke('app:get-info'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  showSaveDialog: (opts = {}) => ipcRenderer.invoke('app:show-save-dialog', opts),
  showOpenDialog: (opts = {}) => ipcRenderer.invoke('app:show-open-dialog', opts),
  writeFile: (fp, content) => ipcRenderer.invoke('app:write-file', fp, content),
  readFile: (fp) => ipcRenderer.invoke('app:read-file', fp),
  getDbPath: () => ipcRenderer.invoke('app:get-db-path'),

  minimize: () => ipcRenderer.send('app:minimize'),
  maximize: () => ipcRenderer.send('app:maximize'),
  close: () => ipcRenderer.send('app:close'),

  onThemeChange: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, theme: 'light' | 'dark') => cb(theme);
    ipcRenderer.on('theme-change', handler);
    return () => ipcRenderer.removeListener('theme-change', handler);
  },

  onSyncNow: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('sync-now', handler);
    return () => ipcRenderer.removeListener('sync-now', handler);
  },

  onNavigate: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, route: string) => cb(route);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },

  // Registers a navigation function callable from main process
  registerNavigator: (fn) => {
    (globalThis as any).__ELECTRON_NAVIGATE__ = fn;
  },
};

contextBridge.exposeInMainWorld('electron', api);
