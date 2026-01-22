# Tasker API - Documentación para Cliente

**Base URL:** `http://localhost:3000/api/v1`

---

## Autenticación

Todas las rutas (excepto register y login) requieren el header:
```
Authorization: Bearer <token>
```

---

## 1. Auth - Registro y Login

### Registrar Usuario

```
POST /auth/register
```

**Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@email.com",
  "password": "123456"
}
```

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| name | string | Sí | 2-100 caracteres |
| email | string | Sí | Email válido, único |
| password | string | Sí | Mínimo 6 caracteres |

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Juan Pérez",
      "email": "juan@email.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Iniciar Sesión

```
POST /auth/login
```

**Body:**
```json
{
  "email": "juan@email.com",
  "password": "123456"
}
```

| Campo | Tipo | Requerido |
|-------|------|-----------|
| email | string | Sí |
| password | string | Sí |

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Juan Pérez",
      "email": "juan@email.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 2. Tareas

### Listar Tareas

```
GET /tasks
```

**Query Parameters (opcionales):**

| Parámetro | Tipo | Valores | Default |
|-----------|------|---------|---------|
| status | string | `pending`, `in_progress`, `completed` | - |
| priority | string | `low`, `medium`, `high` | - |
| categoryId | uuid | UUID de categoría | - |
| search | string | Texto a buscar en título/descripción | - |
| page | number | Número de página | 1 |
| limit | number | Items por página (máx 100) | 10 |

**Ejemplo:**
```
GET /tasks?status=pending&priority=high&page=1&limit=20
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Tareas obtenidas exitosamente",
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Mi tarea",
        "description": "Descripción",
        "status": "pending",
        "priority": "high",
        "dueDate": "2024-12-31T23:59:59.000Z",
        "completedAt": null,
        "userId": "uuid",
        "categoryId": "uuid",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "category": {
          "id": "uuid",
          "name": "Trabajo",
          "color": "#3B82F6"
        }
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

### Crear Tarea

```
POST /tasks
```

**Body:**
```json
{
  "title": "Completar proyecto",
  "description": "Finalizar el desarrollo del API",
  "priority": "high",
  "status": "pending",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "categoryId": "uuid-de-categoria"
}
```

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| title | string | Sí | 3-255 caracteres |
| description | string | No | Máx 1000 caracteres |
| status | string | No | `pending`, `in_progress`, `completed`. Default: `pending` |
| priority | string | No | `low`, `medium`, `high`. Default: `medium` |
| dueDate | ISO date | No | Fecha futura en formato ISO |
| categoryId | uuid | No | UUID de una categoría existente |

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Tarea creada exitosamente",
  "data": {
    "id": "uuid",
    "title": "Completar proyecto",
    "description": "Finalizar el desarrollo del API",
    "status": "pending",
    "priority": "high",
    "dueDate": "2024-12-31T23:59:59.000Z",
    "completedAt": null,
    "userId": "uuid",
    "categoryId": "uuid",
    "createdAt": "...",
    "updatedAt": "...",
    "category": {
      "id": "uuid",
      "name": "Trabajo",
      "color": "#3B82F6"
    }
  }
}
```

---

### Obtener Tarea por ID

```
GET /tasks/:id
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Tarea obtenida exitosamente",
  "data": {
    "id": "uuid",
    "title": "...",
    "description": "...",
    "status": "pending",
    "priority": "medium",
    "dueDate": null,
    "completedAt": null,
    "category": { ... }
  }
}
```

---

### Actualizar Tarea

```
PUT /tasks/:id
```

**Body (todos los campos son opcionales, mínimo 1):**
```json
{
  "title": "Nuevo título",
  "description": "Nueva descripción",
  "status": "in_progress",
  "priority": "low",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "categoryId": "uuid"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Tarea actualizada exitosamente",
  "data": { ... }
}
```

---

### Actualizar Solo Estado

```
PATCH /tasks/:id/status
```

**Body:**
```json
{
  "status": "completed"
}
```

| Campo | Tipo | Requerido | Valores |
|-------|------|-----------|---------|
| status | string | Sí | `pending`, `in_progress`, `completed` |

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Estado actualizado exitosamente",
  "data": { ... }
}
```

---

### Eliminar Tarea

```
DELETE /tasks/:id
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Tarea eliminada exitosamente",
  "data": null
}
```

---

### Estadísticas de Tareas

```
GET /tasks/stats
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "total": 25,
    "byStatus": {
      "pending": 10,
      "in_progress": 5,
      "completed": 10
    },
    "byPriority": {
      "low": 8,
      "medium": 12,
      "high": 5
    }
  }
}
```

---

## 3. Categorías

### Listar Categorías

```
GET /categories
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Categorías obtenidas exitosamente",
  "data": [
    {
      "id": "uuid",
      "name": "Trabajo",
      "description": "Tareas del trabajo",
      "color": "#3B82F6",
      "userId": "uuid",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### Crear Categoría

```
POST /categories
```

**Body:**
```json
{
  "name": "Personal",
  "description": "Tareas personales",
  "color": "#10B981"
}
```

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| name | string | Sí | 2-100 caracteres, único por usuario |
| description | string | No | Máx 255 caracteres |
| color | string | No | Hexadecimal (#RRGGBB). Default: `#3B82F6` |

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Categoría creada exitosamente",
  "data": {
    "id": "uuid",
    "name": "Personal",
    "description": "Tareas personales",
    "color": "#10B981",
    "userId": "uuid"
  }
}
```

---

### Obtener Categoría por ID

```
GET /categories/:id
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Categoría obtenida exitosamente",
  "data": { ... }
}
```

---

### Actualizar Categoría

```
PUT /categories/:id
```

**Body:**
```json
{
  "name": "Trabajo Urgente",
  "description": "Tareas urgentes del trabajo",
  "color": "#EF4444"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Categoría actualizada exitosamente",
  "data": { ... }
}
```

---

### Eliminar Categoría

```
DELETE /categories/:id
```

> Las tareas asociadas NO se eliminan, solo se desvinculan (categoryId = null)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Categoría eliminada exitosamente",
  "data": null
}
```

---

## 4. Usuario

### Obtener Perfil

```
GET /users/profile
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Perfil obtenido exitosamente",
  "data": {
    "id": "uuid",
    "name": "Juan Pérez",
    "email": "juan@email.com",
    "role": "user",
    "isActive": true,
    "lastLogin": "2024-01-15T10:30:00.000Z",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### Actualizar Perfil

```
PUT /users/profile
```

**Body:**
```json
{
  "name": "Juan Carlos Pérez"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Perfil actualizado exitosamente",
  "data": { ... }
}
```

---

### Desactivar Cuenta

```
DELETE /users/profile
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Cuenta desactivada exitosamente",
  "data": null
}
```

---

## Errores Comunes

Todas las respuestas de error tienen el formato:

```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": []
}
```

| Código | Descripción |
|--------|-------------|
| 400 | Error de validación |
| 401 | No autorizado (token inválido o faltante) |
| 403 | Prohibido (sin permiso para el recurso) |
| 404 | Recurso no encontrado |
| 429 | Demasiadas peticiones (rate limit) |
| 500 | Error interno del servidor |

**Ejemplo error de validación (400):**
```json
{
  "success": false,
  "message": "Error de validación",
  "errors": [
    "El título debe tener al menos 3 caracteres",
    "El estado debe ser: pending, in_progress, completed"
  ]
}
```

**Ejemplo no autorizado (401):**
```json
{
  "success": false,
  "message": "Token no proporcionado"
}
```

---

## Rate Limiting

- **Ventana:** 15 minutos
- **Máximo requests:** 100 por IP

Al exceder el límite:
```json
{
  "success": false,
  "message": "Demasiadas peticiones desde esta IP, intenta de nuevo más tarde"
}
```
