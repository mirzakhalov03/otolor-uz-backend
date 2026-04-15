# Otolor Appointment Management API

A production-ready REST API for managing doctor appointments. Built with Node.js, Express v5, TypeScript, and MongoDB.

---

## Features

- 🏥 **Doctor Management** — Create doctors, define weekly schedules, search by name/specialization
- 📅 **Smart Availability** — Single endpoint returns available dates OR time slots based on query params
- 📝 **Appointment Booking** — Full validation, double-booking prevention, auto-generated order numbers (A101, A102…)
- 👨‍💼 **Admin Panel API** — List/filter/search/paginate appointments, update status, delete
- 📚 **Swagger Docs** — Interactive API documentation at `/api/docs`
- 🛡️ **Input Validation** — express-validator on every endpoint
- ⚡ **Rate Limiting** — Configurable request throttling
- 🔒 **Error Handling** — Centralized handler for all error types

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥ 18 | Runtime |
| Express | 5.2.x | Web framework |
| TypeScript | 5.9.x | Type safety |
| Mongoose | 8.x | MongoDB ODM |
| express-validator | 7.x | Request validation |
| swagger-jsdoc | 6.x | API spec generation |
| swagger-ui-dist | — | API docs UI |

---

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd OtolorUz-backend(simple-new)
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI

# Run development server
npm run dev
```

The server starts at **http://localhost:5050**

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot-reload (nodemon + ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | Type-check without emitting files |

---

## API Overview

### Doctors
```
POST   /api/doctors                    Create a doctor
GET    /api/doctors                    List all doctors (?search=)
GET    /api/doctors/:id                Get doctor by ID
PATCH  /api/doctors/:id/schedule       Update weekly schedule
```

### Appointments (Public)
```
GET    /api/appointments/availability  Get dates (?doctorId) or times (?doctorId&date)
POST   /api/appointments              Book an appointment
```

### Appointments (Admin)
```
GET    /api/admin/appointments         List all (?date&doctorId&status&search&page&limit)
PATCH  /api/admin/appointments/:id/status   Update status → "seen" or "missed"
DELETE /api/admin/appointments/:id     Delete appointment
```

### Other
```
GET    /api/health                     Health check
GET    /api/docs                       Swagger UI
GET    /api/docs.json                  OpenAPI spec (JSON)
```

📚 **Full interactive docs:** http://localhost:5050/api/docs

---

## Project Structure

```
src/
├── config/          Environment, database, swagger config
├── controllers/     Thin request handlers
├── services/        Business logic (booking validation, availability, etc.)
├── models/          Mongoose schemas + indexes
├── routes/          Route definitions + Swagger annotations
├── middlewares/     Error handler, rate limiter, validators
├── utils/           Response helper, error class, async wrapper, logger
├── app.ts           Express app setup
└── server.ts        Entry point
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5050 | Server port |
| `NODE_ENV` | development | Environment |
| `MONGO_URI` | mongodb://localhost:27017/otolor-appointments | MongoDB connection string |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |
| `LOG_LEVEL` | dev | Morgan log format |

---

## Booking Flow

```
1. GET  /api/doctors                              → User picks a doctor
2. GET  /api/appointments/availability?doctorId=X  → See available dates
3. GET  /api/appointments/availability?doctorId=X&date=2026-04-15  → See time slots
4. POST /api/appointments                          → Book with personal details
```

---

## License

ISC
