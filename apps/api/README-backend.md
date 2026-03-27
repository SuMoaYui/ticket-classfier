# 🎫 KIN Smart Ticketing (Backend API Core)

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white) ![Anthropic](https://img.shields.io/badge/AI-Claude%203.5-d4a373)

Núcleo de Inteligencia Artificial y Organización Operativa para clasificación de tickets, construido bajo los más altos estándares de arquitectura limpia (**Domain-Driven Design**) sobre TypeScript/ExpressJS.

Este motor no solo soporta las transacciones concurrentes ACID usando un motor en-memoria impulsado a disco (`better-sqlite3`), sino que se acopla dinámicamente a **Clústeres Estáticos Locales** o al **Cloud de Anthropic** para inyección de razonamiento LLM a los tickets entrantes (Sentimiento, Urgencia, Departamento).

---

## 🏗️ Arquitectura y Seguridad (DevSecOps)

*   **Diseño Dirigido por Dominio (DDD) & TSyringe:** Modelos ricos sin dependencias circulares y constructores sellados que soportan 100% inyección de dependencias automáticas IoC.
*   **Zero-Trust API Key Shield:** Los tokens y accesos privados de los usuarios jamás se guardan legibles. El sistema obliga hashes criptográficos **SHA-256** unidireccionales desde la capa `Middleware` antes de golpear el disco SQLite retroactivamente.
*   **OpenTelemetry & Trazabilidad:** Monitoreo y perfiles de embudo precisos para saber exactamente en qué milisegundo el modelo Claude responde o un Job queda relegado.
*   **Smart Rate Limiting y Helmet:** Blindaje de cabeceras HTTP restrictivas por API en un factor 30 req/min (anti-DDoS).
*   **Contenedorizado Eficiente (`Omit-Dev` Docker):** Compilaciones Multistage alpinas ultradelgadas preparadas para empujar directamente a `ghcr.io` y `AWS ECS` eliminando miles de dependencias pesadas mediante `prune`. 

## 🚀 Despliegue Local e Inicialización

```bash
# 1. Instalar dependencias puras 
npm install

# 2. Configurar Variables de Entorno y Modelo
# (Ajusta LLM_MODE=anthropic dentro de tu nuevo .env, usa API real)
cp .env.example .env

# 3. Arrancar a través de Watcher en Caliente (DDD / TSX)
npm run dev
```

## 🐋 Despliegue Docker (Producción)

Dado que las capas de software son construidas eficientemente (Ignorando tipos o testing suites en la capa 2):

```bash
docker build -t ticket-classifier-api .
docker run -p 3000:3000 -v $(pwd)/data:/usr/src/app/data ticket-classifier-api
```

## 🧠 Flujo de Soporte Cognitivo (KIN)
Dependiendo del tipo de *Client-Target* usando esta API, los Modos LLM (`Mock/Anthropic`) simulan un asistente heurístico pre-cargado que instruye al usuario al vuelo durante latencias en redes lentas hasta que el conector de AI responde íntegro.
