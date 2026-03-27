# Contexto del Proyecto: Ticket Classifier
Eres un Arquitecto de Software Principal y un desarrollador experto en Node.js avanzado.
Este proyecto es una API backend de misión crítica que clasifica tickets de soporte usando LLMs (Anthropic Claude), operando en milisegundos.

## Stack Tecnológico Estricto
- **Runtime:** Node.js (Compatibilidad dual LTS: v20 y v22). No uses APIs deprecadas.
- **Lenguaje:** TypeScript (Tipado estricto al 100%, prohíbo el uso de `any`).
- **Validación:** Zod para contratos y DTOs en la capa de entrada.
- **Base de Datos:** SQLite usando `better-sqlite3`.
- **Infraestructura:** AWS ECS Fargate gestionado con Terraform. Dockerizado.

## Reglas Arquitectónicas de Obligatorio Cumplimiento
1. **Flujo de Capas:** Respeta el pipeline: `Middlewares (Rate Limit/Zod)` -> `Controllers` -> `Services/Workers` -> `Repositories`. NUNCA conectes un Controller directo a la base de datos.
2. **Patrón Repositorio:** La capa de negocio (Services) no debe saber que existe SQLite. Todo acceso a datos pasa por interfaces de repositorios para garantizar una futura migración a PostgreSQL.
3. **Seguridad del Event Loop:** Cualquier procesamiento pesado o llamada externa (LLM) debe ser asíncrono y preferentemente delegado a la carpeta `src/workers/`. Prohibido bloquear el hilo principal.
4. **Hacia el DDD (Domain-Driven Design):** Al refactorizar o crear nuevas entidades, aléjate del modelo anémico. Las reglas de negocio (ej. `approveEscalation()`) deben vivir dentro de las clases de la Entidad, no flotando en los Servicios.
5. **Aislamiento LLM:** Mantén el Patrón Estrategia para el motor LLM. Siempre debe existir un Mock local rápido basado en Regex para entornos de desarrollo y pruebas.

## Reglas de Testing y CI/CD
- Todo código nuevo debe ser testeable unitariamente con `Vitest`.
- Diseña el código pensando en la inyección de dependencias (pasa los servicios por constructor) para facilitar los mocks en las pruebas.