# ALBA SERVICE GROUP PLATFORM — Desktop (Electron)

Application Desktop Windows / Linux / macOS de la plateforme ALBA SERVICE GROUP.

## Structure

```
desktop/
├── main.ts          # Process principal Electron (splash, fenêtre, menu, IPC)
├── preload.ts       # Bridge sécurisé contextIsolation (API exposée au renderer)
├── package.json     # Dépendances + scripts de build
├── tsconfig.json    # Configuration TypeScript
├── assets/          # Icônes (icon.ico, icon.png, icon.icns)
└── release/         # Sorties electron-builder (NSIS, AppImage, DMG)
```

## Prérequis

1. **Backend** démarré : `http://localhost:4000/api` (dossier `../backend`)
2. **Frontend** en mode dev : `http://localhost:3000` (dossier `../frontend`)
   OU frontend buildé : `npm run build` dans `../frontend` (produit `../frontend/dist`)

## Développement

```powershell
cd desktop
npm install
npm start        # Compile TS + lance Electron (charge http://localhost:3000)
```

## Production

```powershell
# 1. Builder le frontend
cd ../frontend
npm run build

# 2. Compiler + packager
cd ../desktop
npm run dist:win     # → release/ALBA SERVICE GROUP PLATFORM Setup 1.0.0.exe
npm run dist:linux   # → release/alba-desktop-1.0.0.AppImage
npm run dist:mac     # → release/ALBA SERVICE GROUP PLATFORM-1.0.0.dmg
```

## Fonctionnalités

- **Splash screen** animé aux couleurs ALBA (bleu marine → or)
- **Menu natif** complet : Modules (raccourcis Ctrl+1..8), Affichage, Synchronisation, Aide
- **Barre d'état** : indicateur en ligne / hors ligne + statut de synchronisation
- **Thème clair/sombre** synchronisé avec l'OS (Menu > Affichage > Thème sombre)
- **Navigation Electron** : les éléments de menu appellent le router React en toute sécurité
- **Dialogues natifs** : sauvegarde/ouverture de fichiers, à propos
- **Mises à jour automatiques** via electron-updater (en production)
- **Sécurité** : contextIsolation activé, pas de nodeIntegration, preload minimal
- **Données locales** : SQLite (`alba-offline.db`) dans `app.getPath('userData')`

## IPC exposé (preload)

| Canal | Description |
|---|---|
| `app:get-info` | Plateforme, version, chemins |
| `app:open-external` | Ouvre une URL dans le navigateur |
| `app:show-save-dialog` | Dialogue de sauvegarde natif |
| `app:show-open-dialog` | Dialogue d'ouverture natif |
| `app:write-file` / `app:read-file` | I/O fichiers |
| `app:get-db-path` | Chemin de la base SQLite locale |
| `theme-change` | Changement de thème OS → renderer |
| `sync-now` | Déclenchement manuel de synchronisation (Ctrl+Shift+S) |

© 2026 ALBA SERVICE GROUP — Kindu, Maniema, RDC
