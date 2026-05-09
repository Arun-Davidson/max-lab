# HIRION  Backend

A complete,  backend API for a HIRION built with **Node.js**, **Express**, **TypeScript**, and **PostgreSQL**.

## 🚀 Features

- **Full REST API** with JWT authentication (RS256)
- **PostgreSQL** database with Sequelize ORM

- **Security**: Helmet, CORS, rate limiting, input validation
- **Docker** support for local development
- **API Documentation** with Swagger/OpenAPI
- **Structured logging** with Winston
- **Background jobs** with BullMQ (Redis)

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** & **Docker Compose** (for local development)
- **PostgreSQL** 16+ (if running without Docker)
- **Redis** 7+ (for caching and queues)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd HIRIONClone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Generate JWT keys

```bash
npm run keygen
```

This will create RSA key pairs in the `keys/` directory for signing and verifying JWT tokens.

### 4. Configure environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and update the values as needed, especially:
- Database credentials
- Admin user credentials
- SMTP settings (for email notifications)
- OAuth credentials (if using Google login)

### 5. Start services with Docker

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache/queue
- API server (in development mode)

### 6. Run database migrations

```bash
npm run db:migrate
```

### 7. Seed initial data

```bash
npm run db:seed
```

This will create:
- Admin user (credentials from `.env`)
- Default roles and permissions
- Sample trackers, statuses, and priorities
- Example project

## 🏃 Running the Application

### Development mode

```bash
npm run start:dev
```

The API will be available at `http://localhost:4000`

### Production mode

```bash
npm run build
npm start
```

### View API documentation

Visit `http://localhost:4000/api-docs` (when running in development mode)

## 📝 Available Scripts

- `npm start` - Start production server
- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run test` - Run tests
- `npm run lint` - Lint code with ESLint
- `npm run format` - Format code with Prettier
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run keygen` - Generate JWT RSA keys

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

#Run Pg admin
docker run -d --name pgadmin4 -e PGADMIN_DEFAULT_EMAIL="admin@example.com" -e PGADMIN_DEFAULT_PASSWORD="securepassword" -p 80:80 --restart=always dpage/pgadmin4


# Stop all services
docker-compose down

# View logs
docker-compose logs -f api

# Rebuild and restart
docker-compose up -d --build

# Reset database
docker-compose down -v
docker-compose up -d
npm run db:migrate
npm run db:seed
```

## 🗄️ Database Schema



## 🔐 Authentication

The API uses **JWT with RS256** (asymmetric encryption):

1. **Access tokens** (short-lived, 15 minutes)
2. **Refresh tokens** (long-lived, 30 days)


## 📚 API Overview

see Postman collection

