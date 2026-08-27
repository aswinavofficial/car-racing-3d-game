# Turbo Drift 3D — Car Racing PWA

Mobile-native 3D racing game built with Three.js + Vite. Installable PWA with offline support.

### Features
- 🏎️ 3D chase-cam racing on a procedural circuit track
- 📱 Native mobile controls: touch steering, gas/brake, drag + tilt steering
- ⌨️ Desktop: WASD / Arrow keys + Space
- 🔄 Drift physics, lap system (3 laps), rival AI, best-time persistence
- 📲 PWA: installable, offline via Workbox, 60 FPS

### Dev
```bash
npm install
npm run dev      # http://localhost:5173/car-racing-3d-game/
npm run build    # → dist/
npm run preview
```

### Deploy — GitHub Pages (CI/CD)
Push to `main` → GitHub Actions builds and deploys to `gh-pages`.

**One-time repo setup:**
1. GitHub → Settings → Pages → Source: **GitHub Actions**
2. Push to `main` — workflow at `.github/workflows/deploy.yml` handles the rest
3. Game will be live at `https://<user>.github.io/car-racing-3d-game/`

Vite `base` is set to `/car-racing-3d-game/` for Pages. For custom domain, set `base: '/'` in `vite.config.ts`.

### Tech
Three.js, TypeScript, Vite, vite-plugin-pwa (Workbox).
