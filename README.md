# 🎫 Sistema Inteligente de Clasificación de Tickets y Soporte

![CI](https://github.com/SuMoaYui/ticket-classfier/actions/workflows/ci.yml/badge.svg)
![CD](https://github.com/SuMoaYui/ticket-classfier/actions/workflows/cd.yml/badge.svg)

API backend corporativa que recibe solicitudes de clientes, las clasifica automáticamente mediante un LLM (urgencia, sentimiento, departamento) y las asigna al equipo correcto.

## 🏗️ Arquitectura

```
Cliente HTTP → [Auth Middleware] → [Validation] → Controller → Service
                                                        ↓
                                              ┌─────────┴──────────┐
                                              │   LLM Classifier   │
                                              │  (Mock / Anthropic) │
                                              └─────────┬──────────┘
                                                        ↓
                                              ┌─────────┴──────────┐
                                              │   Rules Engine     │
                                              │ (Escalation, SLA)  │
                                              └─────────┬──────────┘
                                                        ↓
                                              ┌─────────┴──────────┐
                                              │   SQLite DB        │
                                              │ (Ticket Storage)   │
                                              └────────────────────┘
```

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Copiar configuración de entorno
cp .env.example .env

# Iniciar el servidor (modo mock, sin API keys necesarias)
npm start

# O con auto-reload en desarrollo
npm run dev
```

El servidor arranca en `http://localhost:3000`.

## 📖 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Health check (sin auth) |
| `POST` | `/api/v1/tickets` | Crear y clasificar ticket |
| `GET` | `/api/v1/tickets` | Listar tickets (filtros) |
| `GET` | `/api/v1/tickets/:id` | Detalle de ticket |
| `GET` | `/api/v1/tickets/stats/summary` | Métricas agregadas |

## 🔑 Autenticación

Todas las rutas excepto `/health` requieren el header `X-API-Key`:

```bash
curl http://localhost:3000/api/v1/tickets \
  -H "X-API-Key: dev-api-key-123"
```

## 📝 Ejemplo: Crear un Ticket

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-123" \
  -d '{
    "subject": "URGENTE: Sistema de facturación caído",
    "body": "El sistema está completamente caído desde hace 2 horas. Estoy furioso, necesitamos esto resuelto YA. El cobro a los clientes está bloqueado.",
    "customer_email": "cliente@empresa.com"
  }'
```

**Respuesta clasificada:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-generado",
    "subject": "URGENTE: Sistema de facturación caído",
    "urgency": "critical",
    "sentiment": "angry",
    "department": "billing",
    "status": "escalated",
    "confidence": 0.78,
    "reasoning": "Urgency set to \"critical\" based on keywords: urgente, caído, bloqueado | Sentiment detected as \"angry\" from: furioso | Routed to \"billing\" department based on: factura, cobro",
    "metadata": {
      "classifiedBy": "mock",
      "priorityScore": 5,
      "escalated": true,
      "appliedRules": ["critical-angry-escalation", "billing-angry-escalation"]
    }
  }
}
```

## 🔧 Modo LLM

| Modo | Variable `.env` | Descripción |
|------|-----------------|-------------|
| `mock` | `LLM_MODE=mock` | Clasificador local basado en keywords (default) |
| `anthropic` | `LLM_MODE=anthropic` | API real de Anthropic Claude |

Para usar Anthropic, configura en `.env`:
```
LLM_MODE=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

## 🧪 Tests

```bash
npm test
```

## ☁️ Despliegue e Infraestructura como Código (IaC)

El proyecto incluye configuración de Terraform para desplegar la aplicación en **AWS ECS Fargate** usando **EFS** como almacenamiento persistente (para la base de datos SQLite).

```bash
cd terraform
# Inicializar Terraform
terraform init

# Ver el plan de ejecución
terraform plan

# Desplegar la infraestructura
terraform apply
```

Puedes personalizar las variables creando un archivo `terraform.tfvars`:
```hcl
aws_region        = "us-east-1"
llm_mode          = "mock"
container_image   = "tu-repositorio-ecr/ticket-classifier:latest"
```

## 🔄 CI/CD

El proyecto usa **GitHub Actions** con dos pipelines:

| Pipeline | Trigger | Qué hace |
|----------|---------|----------|
| **CI** (`ci.yml`) | Push / PR a cualquier branch | Tests (Node 20 & 22) + Lint del Dockerfile |
| **CD** (`cd.yml`) | Push a `main` | Tests → Build Docker → Push a `ghcr.io` → Trivy scan |

La imagen se publica automáticamente en GitHub Container Registry (`ghcr.io`) con tags `latest` y el SHA del commit.

## 📁 Estructura del Proyecto
```
src/
├── config/           # Variables de entorno
├── db/               # SQLite + migraciones
├── middleware/        # Auth, validación, errores
├── modules/tickets/  # Controller, service, repository, schema
├── services/
│   ├── llm/          # Clasificadores (mock + Anthropic)
│   └── rules/        # Motor de reglas de negocio
├── utils/            # Logger (Winston)
└── app.ts            # Bootstrap Express
```
