# News API – Eskalate Backend Assessment

A production-ready RESTful News API built with **Node.js + TypeScript**, featuring JWT authentication, RBAC, analytics engine with job queues, soft deletion, and Swagger documentation.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js + TypeScript | Type safety, modern async patterns |
| Framework | Express.js | Minimal, flexible, production-proven |
| ORM | Prisma | Type-safe DB access, migrations |
| Database | PostgreSQL (Docker) | Robust SQL, ACID compliance |
| Auth | JWT (jsonwebtoken) | Stateless, scalable |
| Password | Argon2 | State-of-art hashing (better than bcrypt) |
| Validation | Zod | Schema-first, composable validators |
| Queue | BullMQ + Redis | Reliable job processing for analytics |
| Docs | Swagger (OpenAPI 3.0) | Self-documenting API |
| Tests | Jest + Supertest | HTTP-level unit tests with mocked DB |
| Rate Limiting | express-rate-limit | Prevent ReadLog flooding |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd <your-repo-name>
cp .env.example .env
cd backend && npm install
```

### 2. Start Infrastructure (PostgreSQL + Redis)

```bash
cd .. && docker-compose up -d
```

### 3. Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start the Server

```bash
npm run dev       # development
npm run build && npm start  # production
```

### 5. Access the API

- **API Base URL**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api-docs

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `24h`) |
| `PORT` | Server port (default: `3000`) |

---

## Bonus: Preventing ReadLog Spam

Per-article + per-IP rate limit (max 1 read log per 30 seconds) using Redis-backed `express-rate-limit`.

---

## Running Tests

```bash
cd backend && npm test
```