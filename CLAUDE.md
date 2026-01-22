# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tasker API is a REST API for task management built with Node.js, Express 5, Sequelize ORM, and MySQL. The codebase is written in Spanish (comments, error messages, variable names in some places).

## Commands

```bash
# Development (with hot reload)
npm run dev

# Production
npm start

# Database migrations
npm run migrate                    # Run pending migrations
npx sequelize-cli db:migrate:undo  # Undo last migration
npx sequelize-cli db:migrate:undo:all  # Undo all migrations

# Seeders
npm run seed                       # Run all seeders
npx sequelize-cli db:seed:undo:all # Undo all seeders

# Create new migration/seeder
npx sequelize-cli migration:generate --name migration-name
npx sequelize-cli seed:generate --name seeder-name
```

## Architecture

### Layered Architecture (Controller → Service → Model)

The codebase follows a strict three-layer architecture:

1. **Controllers** (`src/controllers/`) - Handle HTTP request/response, call services
2. **Services** (`src/services/`) - Business logic, call models
3. **Models** (`src/models/`) - Sequelize ORM models, database interactions

### Request Flow

```
Request → Middleware (auth, validator) → Controller → Service → Model → Database
```

### Key Files

- `src/app.js` - Express app configuration (middleware, routes, error handling)
- `src/server.js` - Server startup, database connection
- `src/routes/index.js` - Route aggregation, all routes mounted under `/api/v1`
- `src/models/index.js` - Sequelize initialization and model associations
- `src/config/env.js` - Environment configuration loader
- `src/config/database.js` - Sequelize database config (used by CLI)
- `.sequelizerc` - Sequelize CLI path configuration

### Models & Relationships

- **User** → has many Tasks, has many Categories
- **Category** → belongs to User, has many Tasks
- **Task** → belongs to User, belongs to Category

All models use UUID primary keys and snake_case column names in the database.

### API Routes

- `/api/v1/auth` - Public (register, login)
- `/api/v1/users` - Protected (profile management)
- `/api/v1/tasks` - Protected (CRUD + stats)
- `/api/v1/categories` - Protected (CRUD)

### Middleware Stack

- Helmet (security headers)
- CORS
- Rate limiting (on `/api/` routes)
- Morgan (logging)
- JWT authentication (`src/middlewares/auth.js`)
- Joi validation (`src/middlewares/validator.js`)
- Centralized error handler (`src/middlewares/errorHandler.js`)

## Code Conventions

- Use `camelCase` for variables and functions
- Use `PascalCase` for classes and models
- Use `UPPER_SNAKE_CASE` for constants
- Comments and user-facing messages are in Spanish
- Database columns use snake_case (Sequelize `underscored: true`)

## Configuration

Environment variables are loaded from `.env` (copy from `.env.example`). Key variables:
- `NODE_ENV` - development/production/test
- `DB_*` - Database connection
- `JWT_SECRET`, `JWT_EXPIRE` - Authentication
- `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX` - Rate limiting
