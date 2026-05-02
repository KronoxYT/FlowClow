# FlowClock

App de gestión de tiempo y tareas. Construida con React + Vite y empaquetada para Android con Capacitor.

## Stack

- **Frontend:** React 18 + Vite 5
- **Mobile:** Capacitor 6 (Android)
- **Fuentes:** DM Sans + Space Mono (Google Fonts)
- **App ID:** `com.flowclock.app`

## Estructura

```
src/
  App.jsx        — Componente principal (clock, tasks, assistant)
  main.jsx       — Entry point React
android/         — Proyecto Android generado por Capacitor
public/
  download.html  — Página de descarga pública (APK)
.github/
  workflows/
    build-apk.yml — GitHub Actions: construye debug + release APK
dist/            — Build de producción (generado por Vite)
```

## Comandos principales

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server en localhost:5000 |
| `npm run build` | Build de producción |
| `npm run build:android` | Build web + sync Capacitor |
| `npm run apk:debug` | Build + APK debug |
| `npm run apk:release` | Build + APK release (unsigned) |
| `npx cap sync android` | Sincroniza web → Android |

## GitHub Actions (build-apk.yml)

Se activa automáticamente en:
- **Push a `main`** → genera APKs como artifacts (30 días)
- **Tag `v*`** (ej: `v1.0.0`) → genera APKs + crea GitHub Release público

### Para publicar una release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Página de descarga

Disponible en `/download.html`. Carga automáticamente la última release de GitHub via API y muestra los APKs para descargar.

## Dev server

- Host: `0.0.0.0`
- Puerto: `5000`
- Workflow: `Start application` (`npm run dev`)

## Deployment

Configurado como sitio estático (`dist/`).
