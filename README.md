# 📝 Tasker API

API REST profesional para gestor de tareas construida con Node.js, Express, Sequelize y MySQL.

## 🚀 Características

- ✅ Autenticación con JWT
- ✅ CRUD completo de tareas y categorías
- ✅ Sistema de categorías para organizar tareas
- ✅ Estadísticas de tareas por usuario
- ✅ Filtros avanzados por estado y prioridad
- ✅ Validación robusta de datos
- ✅ Manejo de errores centralizado
- ✅ Logging con Winston
- ✅ Rate limiting para proteger la API
- ✅ Seguridad con Helmet y CORS
- ✅ Arquitectura en capas (Controller-Service-Model)
- ✅ Código limpio y bien documentado
- ✅ Migraciones con Sequelize CLI

## 📋 Requisitos Previos

- Node.js >= 18.x
- MySQL >= 5.7 o 8.0
- npm o yarn

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/tasker-api.git
cd tasker-api
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores locales
```

### 4. Crear y migrar base de datos
```bash
npx sequelize-cli db:migrate
```

### 5. Iniciar el servidor
```bash
npm start
```

El servidor estará disponible en `http://localhost:8009`

**Opción B: Manualmente**
```bash
mysql -u root -p
CREATE DATABASE tasker_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

## 🚀 Desarrollo

### Scripts Disponibles

```bash
npm start          # Iniciar servidor en producción
npm run dev        # Iniciar con nodemon (desarrollo - auto reload)
npm run lint       # Ejecutar ESLint
npm run lint:fix   # Corregir problemas de lint
npm run migrate    # Ejecutar migraciones
npm run migrate:undo    # Revertir última migración
npm run migrate:undo:all    # Revertir todas las migraciones
npm run seed       # Ejecutar seeders
```

### Puntos de Acceso

```
http://localhost:8009/                 # Raíz de la API
http://localhost:8009/health           # Health check
http://localhost:8009/api/v1/          # Documentación de endpoints
```

## 📚 Documentación de API

### Autenticación

#### Registrar Usuario
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "123456"
}
```

#### Iniciar Sesión
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "123456"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Tareas

**Nota:** Todas las rutas de tareas requieren autenticación.  Incluye el token en el header: 
```
Authorization: Bearer <tu_token>
```

#### Listar Tareas
```http
GET /api/v1/tasks?status=PENDING&priority=HIGH&page=1&limit=10
```

**Query Parameters:**
- `status`: PENDING | IN_PROGRESS | COMPLETED
- `priority`: LOW | MEDIUM | HIGH
- `categoryId`: UUID de la categoría
- `page`: Número de página (default: 1)
- `limit`: Items por página (default: 10)

#### Crear Tarea
```http
POST /api/v1/tasks
Content-Type: application/json

{
  "title": "Completar proyecto",
  "description": "Finalizar el desarrollo del API",
  "priority": "high",
  "status": "pending",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "categoryId":  "uuid-categoria"
}
```

#### Obtener Tarea
```http
GET /api/v1/tasks/:id
```

#### Actualizar Tarea
```http
PUT /api/v1/tasks/:id
Content-Type: application/json

{
  "title": "Título actualizado",
  "status": "IN_PROGRESS"
}
```

#### Actualizar Estado
```http
PATCH /api/v1/tasks/:id/status
Content-Type: application/json

{
  "status": "COMPLETED"
}
```

#### Eliminar Tarea
```http
DELETE /api/v1/tasks/:id
```

#### Estadísticas
```http
GET /api/v1/tasks/stats
```

### Categorías

#### Listar Categorías
```http
GET /api/v1/categories
```

#### Crear Categoría
```http
POST /api/v1/categories
Content-Type: application/json

{
  "name": "Trabajo",
  "description": "Tareas relacionadas con el trabajo",
  "color": "#3B82F6"
}
```

#### Actualizar Categoría
```http
PUT /api/v1/categories/:id
Content-Type: application/json

{
  "name": "Trabajo Urgente",
  "color": "#EF4444"
}
```

#### Eliminar Categoría
```http
DELETE /api/v1/categories/:id
```

### Usuario

#### Obtener Perfil
```http
GET /api/v1/users/profile
```

#### Actualizar Perfil
```http
PUT /api/v1/users/profile
Content-Type: application/json

{
  "name": "Nuevo Nombre"
}
```

## 🗂️ Estructura del Proyecto

```
tasker-api/
├── src/
│   ├── config/          # Configuraciones
│   ├── controllers/     # Controladores (manejo de requests)
│   ├── database/        # Migraciones y seeders
│   ├── middlewares/     # Middlewares personalizados
│   ├── models/          # Modelos de Sequelize
│   ├── routes/          # Definición de rutas
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades y helpers
│   ├── validators/      # Esquemas de validación
│   ├── app.js           # Configuración de Express
│   └── server.js        # Punto de entrada
├── logs/                # Archivos de log
├── . env                 # Variables de entorno
├── package.json
└── README.md
```

## 🧪 Scripts Disponibles

```bash
npm start          # Iniciar servidor en producción
npm run dev        # Iniciar con nodemon (desarrollo)
npm run lint       # Ejecutar ESLint
npm run lint:fix   # Corregir problemas de lint
npm run migrate    # Ejecutar migraciones
npm run migrate:undo    # Revertir última migración
npm run migrate:undo:all    # Revertir todas las migraciones
npm run seed       # Ejecutar seeders
```

## 🔐 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Autenticación JWT
- ✅ Rate limiting para prevenir ataques de fuerza bruta
- ✅ Helmet para headers de seguridad
- ✅ CORS configurado
- ✅ Validación de inputs
- ✅ Sanitización de datos

## 📝 Convenciones de Código

- Usar `camelCase` para variables y funciones
- Usar `PascalCase` para clases y modelos
- Usar `UPPER_SNAKE_CASE` para constantes
- Comentarios en español
- Mensajes de commit descriptivos

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 👤 Autor

**Tu Nombre**
- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Email: tu-email@example.com

## 🙏 Agradecimientos

- Express. js
- Sequelize
- MySQL
- Y todas las librerías utilizadas

---

⭐ Si te gusta este proyecto, dale una estrella en GitHub! 