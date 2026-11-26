/**
 * Hook to detect Electron environment and access the electron API.
 * Works safely in both web browser and Electron contexts.
 */

export type ElectronAPI = {
  platform: string
  versions: Record<string, string>
  isDesktop: true
  getInfo: () => Promise<{ platform: string; arch: string; version: string; isDev: boolean; userData: string; home: string }>
  openExternal: (url: string) => Promise<void>
  showSaveDialog: (options?: object) => Promise<{ canceled: boolean; filePath?: string }>
  showOpenDialog: (options?: object) => Promise<{ canceled: boolean; filePaths: string[] }>
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>
  readFile: (filePath: string) => Promise<string | null>
  getDbPath: () => Promise<string>
  minimize: () => void
  maximize: () => void
  close: () => void
  onThemeChange: (cb: (theme: 'light' | 'dark') => void) => () => void
  onSyncNow: (cb: () => void) => () => void
  onNavigate: (cb: (route: string) => void) => () => void
  registerNavigator: (fn: (route: string) => void) => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
    __ELECTRON_NAVIGATE__?: (route: string) => void
  }
}

export function useElectron(): { isElectron: boolean; electron: ElectronAPI | null } {
  const electron = typeof window !== 'undefined' ? (window.electron ?? null) : null
  return { isElectron: electron !== null && electron.isDesktop === true, electron }
}

/** Returns true if running inside Electron desktop */
export const isElectron = (): boolean =>
  typeof window !== 'undefined' && !!window.electron?.isDesktop
