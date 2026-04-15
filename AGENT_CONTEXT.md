# Agent Progress Reference — Otolor Appointment API

> This file is for AI coding agents. It documents the technical state, decisions made, known issues,
> and gotchas to avoid redundant work in future sessions.

---

## Project Identity

- **Name:** Otolor Appointment Management API
- **Workspace:** `/Users/mn.afridi/Desktop/Otolor-full/OtolorUz-backend(simple-new)`
- **Stack:** Node.js, Express v5.2.1, TypeScript 5.9.x, Mongoose 8.x, MongoDB (Atlas)
- **Architecture:** Layered (Controller → Service → Model)
- **Port:** 5050 (NOT 5000 — macOS AirPlay occupies 5000)

---

## Build Status

| Check | Status |
|-------|--------|
| `tsc --noEmit` | ✅ Zero errors |
| `npm run dev` | ✅ Runs successfully |
| MongoDB connection | ✅ Connected to Atlas |
| Swagger UI (`/api/docs`) | ✅ Working (manual `swagger-ui-dist` approach) |
| All 9 endpoints | ✅ Registered and documented |

---

## Critical Technical Decisions & Gotchas

### 1. Express v5 (IMPORTANT)
This project uses **Express v5.2.1**, not v4. Key differences:
- `req.params.id` is `string | string[]` — must cast with `as string`
- `swagger-ui-express` does NOT work with Express v5 — returns 403
  - **Solution:** Swagger UI is served manually using `swagger-ui-dist` static files + custom HTML
  - Static assets served at `/api/docs-assets/`, HTML page at `/api/docs`
  - See `src/app.ts` lines 28–76

### 2. TypeScript Configuration
- `tsconfig.json` uses `module: "commonjs"` with NO explicit `moduleResolution`
  - This defaults to `node10` internally but avoids deprecation warnings
  - Do NOT set `moduleResolution: "node10"` explicitly — TS 5.8+ warns about deprecation
  - Do NOT set `moduleResolution: "node16"` — it requires `module: "node16"` which breaks CommonJS imports
  - Previous attempts to set `ignoreDeprecations: "5.0"` and `"6.0"` both failed due to TS version mismatches
  - **Safest approach: just omit moduleResolution entirely**

### 3. Port 5000 Conflict
- macOS AirPlay Receiver (AirTunes) runs on port 5000
- This produces a **403 Forbidden** with `Server: AirTunes/870.14.1` header
- The `.env` is set to `PORT=5050`
- If you see 403s on all routes, check the response headers — it might be AirPlay, not Express

### 4. Order Number Generation
- Uses a `Counter` model with MongoDB `findOneAndUpdate` + `$inc` (atomic)
- Starts at 101 → generates A101, A102, A103...
- Located in `src/models/Counter.ts`
- Cannot produce duplicates even under concurrent requests

### 5. Double-Booking Prevention (Two Layers)
- **Application layer:** `appointment.service.ts` checks for existing appointment before insert
- **Database layer:** Compound unique index `{ doctorId: 1, preferredDate: 1, preferredTime: 1 }`
- Even if the application check is bypassed (race condition), the DB index catches it

### 6. npm Cache Permissions
- The npm cache at `~/.npm` has root-owned files (from a previous npm bug)
- Use `--cache /tmp/.npm-cache` flag when installing packages via agent:
  ```
  npm install --cache /tmp/.npm-cache <package>
  ```
- The user can fix permanently with: `sudo chown -R 501:20 ~/.npm`

### 7. npm/node PATH
- `npm` and `node` are at `/usr/local/bin/` but NOT in the default agent PATH
- Always prefix commands with: `export PATH="/usr/local/bin:$PATH"`

### 8. CORS Security
- CORS is configured via `CORS_ORIGINS` env var (comma-separated list of allowed origins)
- Default whitelist: `http://localhost:3000`, `http://localhost:5173`, `http://localhost:5050`
- Requests without an `Origin` header (Postman, curl, server-to-server) are allowed
- Blocked origins return `403` with message `Origin X not allowed by CORS`
- Config lives in: `src/config/env.ts` (parsing), `src/app.ts` (middleware), `src/middlewares/errorHandler.ts` (clean 403)
- For production: update `CORS_ORIGINS` in `.env` to the actual frontend domain(s)

---

## File Map

```
src/
├── app.ts                          → Express setup, middleware wiring, Swagger UI (manual)
├── server.ts                       → Entry point, DB connect, graceful shutdown
├── config/
│   ├── database.ts                 → Mongoose connection (5s timeout)
│   ├── env.ts                      → Typed env config
│   └── swagger.ts                  → OpenAPI 3.0 spec definition
├── controllers/
│   ├── appointment.controller.ts   → getAvailability, createAppointment, getAppointments, updateStatus, delete
│   └── doctor.controller.ts        → createDoctor, getDoctors, getDoctorById, updateSchedule
├── middlewares/
│   ├── errorHandler.ts             → Global error handler (Mongoose errors, duplicates, AppError)
│   ├── rateLimiter.ts              → express-rate-limit config
│   ├── validate.ts                 → Checks express-validator results
│   └── validators.ts               → All validation chains (appointments, doctors, queries)
├── models/
│   ├── Appointment.ts              → Schema + compound unique index + text search index
│   ├── Counter.ts                  → Atomic order number generator
│   └── Doctor.ts                   → Schema + schedule validation + text index
├── routes/
│   ├── admin.routes.ts             → GET/PATCH/DELETE admin endpoints + Swagger
│   ├── appointment.routes.ts       → GET availability + POST booking + Swagger
│   └── doctor.routes.ts            → Full doctor CRUD + Swagger
├── services/
│   ├── appointment.service.ts      → Booking logic, availability, admin queries, status updates
│   └── doctor.service.ts           → Doctor CRUD, schedule parsing, time slot generation
└── utils/
    ├── apiResponse.ts              → sendResponse() helper
    ├── AppError.ts                 → Custom error class + NotFoundError, BadRequestError, ConflictError
    ├── asyncHandler.ts             → Wraps async handlers to forward errors
    └── logger.ts                   → console wrapper with timestamps
```

---

## API Endpoints

```
POST   /api/doctors                          → Create doctor
GET    /api/doctors                          → List doctors (?search=)
GET    /api/doctors/:id                      → Get single doctor
PATCH  /api/doctors/:id/schedule             → Update schedule

GET    /api/appointments/availability        → Dates (?doctorId) or Times (?doctorId&date)
POST   /api/appointments                     → Book appointment

GET    /api/admin/appointments               → List all (?date&doctorId&status&search&page&limit)
PATCH  /api/admin/appointments/:id/status    → Update status (body: { status: "seen"|"missed" })
DELETE /api/admin/appointments/:id           → Delete

GET    /api/health                           → Health check
GET    /api/docs                             → Swagger UI
GET    /api/docs.json                        → Raw OpenAPI spec
```

---

## What's NOT Implemented

- Authentication / authorization (admin routes are open)
- Unit / integration tests
- Doctor deletion endpoint
- Email / SMS notifications
- Appointment rescheduling
- Docker / CI/CD
- Production-grade logging (Winston / Pino)
- ~~CORS origin whitelist~~ ✅ Implemented (env-configurable whitelist)

---

## Conversation History

- **Conversation c14a1302:** Full backend build from scratch. All 23 source files created. Fixed Express v5 type issues, swagger-ui-express incompatibility, port 5000 AirPlay conflict, tsconfig moduleResolution issues. Merged available-dates + available-times into single /availability endpoint.
