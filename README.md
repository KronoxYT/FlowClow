# ⏳ FlowClock v3 — Guía de instalación con Capacitor

> App móvil personal: Reloj + Tareas + Flow AI

---

## 🛠 Requisitos previos

Antes de empezar, instala estas herramientas:

- **Node.js** (v18 o superior) → https://nodejs.org
- **Android Studio** (para Android) → https://developer.android.com/studio
- **Xcode** (para iOS, solo en Mac) → App Store

---

## 🚀 Paso a paso

### 1. Instalar dependencias

Abre la terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

### 2. Construir la app web

```bash
npm run build
```

Esto genera la carpeta `dist/` con la app compilada.

### 3. Instalar Capacitor CLI

```bash
npm install -g @capacitor/cli
```

### 4. Agregar plataforma Android

```bash
npx cap add android
```

### 5. Sincronizar el código web con Capacitor

```bash
npx cap sync
```

> ⚠️ **Importante:** Ejecuta este comando SIEMPRE después de hacer cambios en el código.

### 6. Abrir en Android Studio

```bash
npx cap open android
```

Se abre Android Studio con tu proyecto listo.

### 7. Ejecutar en tu celular

1. Conecta tu Android por USB
2. Activa **Depuración USB** en Opciones de desarrollador
3. En Android Studio: presiona ▶️ **Run**

---

## 🍎 Para iOS (solo Mac)

```bash
npx cap add ios
npx cap sync
npx cap open ios
```

Luego en Xcode, selecciona tu iPhone y presiona ▶️

---

## 🔑 API Key de Anthropic (Flow AI)

La app usa la API de Anthropic para el asistente.
Necesitas agregar tu API key:

1. Abre `src/App.jsx`
2. Busca la función `send()` en `AssistantTab`
3. Agrega el header de autorización:

```javascript
headers: {
  "Content-Type": "application/json",
  "x-api-key": "TU_API_KEY_AQUI",
  "anthropic-version": "2023-06-01",
},
```

Obtén tu API key en: https://console.anthropic.com

---

## 📁 Estructura del proyecto

```
flowclock/
├── src/
│   ├── App.jsx          ← Toda la lógica de la app
│   └── main.jsx         ← Punto de entrada React
├── index.html           ← HTML principal
├── vite.config.js       ← Configuración del bundler
├── capacitor.config.ts  ← Configuración de Capacitor
└── package.json         ← Dependencias
```

---

## 🔄 Flujo de desarrollo

```
Editar código → npm run build → npx cap sync → Abrir en Android Studio → Correr
```

---

## 📱 Roadmap

| Versión | Estado | Contenido |
|---------|--------|-----------|
| v1 | ✅ | App base: Reloj + Tareas + Flow AI |
| v2 | ✅ | Rebrand FlowClock |
| v3 | ✅ | Capacitor — app instalable en Android/iOS |

---

Hecho con ❤️ — FlowClock Personal Project
