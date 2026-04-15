# Otolor Appointment API — Project Status

> **Last updated:** April 11, 2026
> **Status:** ✅ Backend Complete — Ready for testing & deployment

---

## Where Are We?

The entire backend is **built and running**. All the core features from the requirements are implemented.
If you're coming back to this after a break, here's everything you need to know.

---

## What's Done

### ✅ Doctor Management
- Create doctors with name, specialization, and weekly schedule
- List all doctors (with search by name/specialization)
- Get a single doctor by ID
- Update a doctor's weekly schedule

### ✅ Appointment Booking (Public)
- **Single smart endpoint:** `GET /api/appointments/availability`
  - Pass only `doctorId` → get available dates (next 30 days)
  - Pass `doctorId` + `date` → get available time slots (30-min intervals)
- **Book appointment:** `POST /api/appointments`
  - Validates doctor exists, works that day, time is within hours
  - Prevents double-booking (same doctor/date/time)
  - Auto-generates order number (A101, A102, A103…)
  - Default status: `pending`

### ✅ Admin Management
- List all appointments with filters (date, doctor, status) + search + pagination
- Update status: `pending` → `seen` or `missed`
- Delete appointments

### ✅ Infrastructure
- TypeScript with strict mode
- Express v5 + Mongoose (MongoDB)
- Input validation on every endpoint (express-validator)
- Centralized error handling (Mongoose errors, duplicates, 404s)
- Rate limiting
- Swagger API docs at `/api/docs`
- Consistent response format: `{ success, data, message, pagination }`

---

## API Endpoints (9 total)

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `POST` | `/api/doctors` | Create a doctor |
| `GET` | `/api/doctors` | List all doctors |
| `GET` | `/api/doctors/:id` | Get one doctor |
| `PATCH` | `/api/doctors/:id/schedule` | Update schedule |
| `GET` | `/api/appointments/availability` | Get dates or time slots |
| `POST` | `/api/appointments` | Book appointment |
| `GET` | `/api/admin/appointments` | List all (admin) |
| `PATCH` | `/api/admin/appointments/:id/status` | Update status |
| `DELETE` | `/api/admin/appointments/:id` | Delete appointment |

Plus: `GET /api/health` (health check) and `GET /api/docs` (Swagger UI)

---

## How to Run

```bash
# Install dependencies
npm install

# Start dev server (hot-reload)
npm run dev

# Server runs at http://localhost:5050
# Swagger docs at http://localhost:5050/api/docs
```

> **Important:** Port 5000 is used by macOS AirPlay. We use port **5050** instead.

---

## Project Structure (at a glance)

```
src/
├── config/        → env vars, database connection, swagger spec
├── controllers/   → thin request handlers (no business logic here)
├── services/      → ALL business logic lives here
├── models/        → Mongoose schemas (Doctor, Appointment, Counter)
├── routes/        → route definitions + Swagger JSDoc annotations
├── middlewares/    → error handler, rate limiter, validators
├── utils/         → response helper, error class, async wrapper, logger
├── app.ts         → Express app setup
└── server.ts      → Entry point
```

---

## What's NOT Done (potential future work)

- [ ] Authentication (admin login, JWT/sessions)
- [ ] Unit/integration tests
- [ ] Email/SMS notifications on booking
- [ ] Doctor deletion
- [ ] Appointment rescheduling
- [ ] Deployment config (Docker, CI/CD)
- [ ] Production logging (Winston/Pino instead of console)
- [x] ~~CORS origin whitelist~~ ✅ Done — configurable via `CORS_ORIGINS` in `.env`

---

## Quick Reminders

- **MongoDB:** Using Atlas cluster (configured in `.env`). Change `MONGO_URI` if needed.
- **Order numbers:** Atomic counter in the `counters` collection. Starts at A101.
- **Double-booking:** Protected at BOTH application level (check before insert) AND database level (compound unique index).
- **Express v5:** We're using Express 5 which is newer — `swagger-ui-express` doesn't work with it, so Swagger UI is served manually using `swagger-ui-dist`.
