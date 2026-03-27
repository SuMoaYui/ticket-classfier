# 🎫 KIN Smart Ticketing — Monorepo

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white) ![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react&logoColor=1a1a2e) ![Electron](https://img.shields.io/badge/Electron-33.x-2b2e3a?logo=electron&logoColor=9feaf9) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white) ![Anthropic](https://img.shields.io/badge/AI-Claude%203.5-d4a373) ![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?logo=docker&logoColor=white)

**Sistema inteligente de clasificación de tickets con IA** — Una plataforma full-stack que combina un backend robusto con un cliente de escritorio premium, unificados bajo un monorepo con **NPM Workspaces**.

---

## 🏗️ Arquitectura del Monorepo

```text
ticket-classifier/
├── apps/
│   ├── api/          🔧 Backend Express API (DDD + TSyringe + OpenTelemetry)
│   └── desktop/      💻 Electron + React + Vite (KIN Chatbot UI)
├── .github/          🚀 CI/CD Workflows (GitHub Actions)
└── package.json      📦 NPM Workspaces Orchestrator
```

| Componente | Stack | Descripción |
|---|---|---|
| **API** | Express, SQLite, Anthropic Claude, Zod | Motor de clasificación LLM con arquitectura DDD y seguridad Zero-Trust (SHA-256 API Keys) |
| **Desktop** | Electron, React 19, Zustand, Vite | App nativa con Glassmorphism UI, KIN AI Chatbot y cifrado local `safeStorage` |

---

## ⚡ Inicio Rápido

```bash
# 1. Clona el repositorio
git clone https://github.com/SuMoaYui/ticket-classfier.git
cd ticket-classfier

# 2. Instala todas las dependencias (API + Desktop en un solo comando)
npm install

# 3. Configura las variables de entorno del backend
cp apps/api/.env.example apps/api/.env

# 4. Arranca AMBOS proyectos simultáneamente
npm run dev
```

> 💡 También puedes arrancar cada proyecto individualmente:
> - Solo Backend: `npm run dev:api`
> - Solo Desktop: `npm run dev:desktop`

---

## 🐋 Despliegue Docker (Solo API)

```bash
cd apps/api
docker build -t kin-api .
docker run -p 3000:3000 -v $(pwd)/data:/usr/src/app/data kin-api
```

## 📦 Empaquetar Desktop (Linux)

```bash
npm run package:linux
# Output: apps/desktop/release/Ticket Classifier-Linux-1.0.0-x86_64.AppImage
```

---

## 🛡️ Seguridad Implementada

- **Backend:** Helmet, Rate Limiting, SHA-256 hashed API Keys, Timing-Safe comparisons
- **Desktop:** Electron `safeStorage` (OS-level encryption), CSP sin `unsafe-inline`, `contextIsolation: true`
- **Docker:** Multi-stage alpine build con `npm prune --omit=dev`, usuario non-root

## 🤖 KIN — Asistente Inteligente

KIN es un chatbot flotante integrado en el Desktop que detecta la pantalla actual del usuario y ofrece asistencia contextual. Funciona en dos modos:
- **Mock (Simulador):** Respuestas heurísticas locales basadas en keywords — perfecto para demos sin API Key
- **Anthropic Cloud:** Conecta con Claude 3.5 Sonnet para respuestas de IA real

## 📄 Licencia

MIT © Keydiem
