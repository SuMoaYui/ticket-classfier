# 🎫 KIN Smart Ticketing (Desktop Client)

![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react&logoColor=1a1a2e) ![Electron](https://img.shields.io/badge/Electron-33.x-2b2e3a?logo=electron&logoColor=9feaf9) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white) 

Una aplicación de escritorio nativa de alto rendimiento desarrollada en **Electron, React y Vite** para el ecosistema **KIN Smart Ticketing**. Ofrece una experiencia corporativa fluida, diseño en Neón/Glassmorphism y un Chatbot Asistente con consciencia espacial.

---

## ✨ Características Principales

*   **⚡ Arquitectura Electron-Vite:** Tiempos de compilación relámpago y manejo optimizado de hilos (Main Process vs Renderer Process) aislando módulos críticos con `contextIsolation=true`.
*   **🤖 KIN AI Sim/Cloud Chatbot:** La app integra a *KIN*, un Bot flotante basado en estados de `Zustand` que detecta la página actual (`Dashboard`, `Tickets`, `Settings`) y ofrece sugerencias espaciales utilizando Inteligencia Artificial Remota (Anthropic Claude 3.5 Sonnet) u Offline (Simulador heurístico local).
*   **💅 Experiencia de Alta Gama (UI/UX):**
    *   **Dashboard Fluido:** Tarjetas de analítica con comportamiento elástico, sombras difusas (Glow) y Glassmorphism translúcidos.
    *   **Shimmer Loading:** Esqueletos de carga CSS pulsantes para mitigar el tiempo de espera cognitivo.
    *   **Custom Scrollbars & Spring Physics:** Notificaciones nativas que interactúan con gravedad simulada (Spring-easing).
*   **🔒 Bóveda de Cifrado Host-Native (safeStorage):** A diferencia de otras apps Node, KIN no guarda su JWT ni tokens API clave en `.json`. Las llaves se encriptan interactivamente contra las firmas digitales de la Motherboard usando DPAPI de Windows o el Linux Secret Service (`libsecret`).
*   **🚀 Despliegue Multiplataforma (.AppImage, .Exe):** Compilable dinámicamente usando `electron-builder` optimizado.

## ⚙️ Requisitos y Compilación

Debes poseer **Node 20+**. El servidor Frontend asume que tienes corriendo la API de Express localmente o en un contenedor.

```bash
# 1. Instalar empaquetaduras 
npm install

# 2. Correr modo Vigía (Dev)
npm run dev

# 3. Empaquetar el ejecutable (Linux AppImage / pacman)
npm run build && npm run package -- --linux
```

## 🛡️ Auditoría DevSecOps Interna Implementada
Este frente ha sido auditado estructuralmente bloqueando inyecciones XSS aislando el Content-Security-Policy (CSP) estricto. La autenticación incluye Google OAuth seguro (`OAuth 2.0 PKCE` nativo en ventanas ocultas) y validaciones locales (`sqlite3` / `bcryptjs`).
