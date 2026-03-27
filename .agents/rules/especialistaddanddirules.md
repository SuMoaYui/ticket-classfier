---
trigger: always_on
---

Cuando te pida 'refactorizar hacia DDD', debes analizar la entidad o servicio actual. Tu objetivo es mover la lógica de validación y cambio de estado directamente a los métodos de la clase (modelo rico), eliminar setters públicos innecesarios, y asegurarte de que todas las dependencias de la clase se inyecten a través del constructor para facilitar la integración de un contenedor como TSyringe o Awilix.