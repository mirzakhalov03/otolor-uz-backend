# Backend Optimization — Round 1 (Design Spec)

**Date:** 2026-07-02
**Project:** `OtolorUz-backend-simple` (Otolor Appointment Management API)
**Status:** Approved for implementation

---

## 1. Context

The backend is a layered Express v5 + TypeScript + Mongoose REST API for booking doctor
appointments (public booking + admin management). A full read-through surfaced correctness
bugs, an unauthenticated API, a timezone-fragile date model, and duplicated schedule/time
logic. This round fixes the confirmed bugs, adds authentication, hardens the two
deploy-blocking security gaps, and removes the worst duplication. It deliberately leaves a
set of larger items for a later round (see §9).

**Deployment reality:** production, internet-facing. That makes auth and the two security
fixes non-negotiable.

## 2. Goals

1. Lock down every mutation + the admin panel behind real authentication.
2. Fix four correctness bugs that misbehave in normal use.
3. Make all date logic correct regardless of server timezone.
4. Collapse duplicated schedule/time logic into shared utilities.
5. Bring the API docs back in line with reality.

**Non-goals:** rebuilding the domain model, adding roles/multi-user, or the §9 backlog.

## 3. Confirmed decisions

| Decision | Choice |
|---|---|
| Admin model | Single shared admin (credentials in env) |
| Token strategy | Single stateless JWT (Bearer), default 7-day expiry |
| Password storage | Plaintext in env, compared with constant-time `crypto.timingSafeEqual` |
| Missed slots | **Never reopen** — a booked slot stays taken regardless of status |
| Timezone | Anchor all date logic to a configurable clinic timezone (`Asia/Tashkent`) |

## 4. Scope

**In scope:** authentication subsystem; correctness bugs B1–B4; security S1–S2;
DRY refactor D1–D2; docs E1.
**Out of scope (this round):** helmet, Category update/delete + orphan guards, dead
text-index cleanup / `$text` search, Zod env validation, booking transactions/counter
gaps. Tracked in §9.

---

## 5. Design

### 5.1 Authentication (new subsystem)

**Environment (`config/env.ts`)** — new keys, validated at boot:

| Key | Required | Default | Notes |
|---|---|---|---|
| `JWT_SECRET` | **yes** | — | Boot fails fast if missing (security-critical). |
| `JWT_EXPIRES_IN` | no | `7d` | Passed to `jsonwebtoken`. |
| `ADMIN_USERNAME` | **yes** | — | e.g. `otoloruzadmin`. |
| `ADMIN_PASSWORD` | **yes** | — | Plaintext; env is the secret store. |

**New dependency:** `jsonwebtoken` (+ `@types/jsonwebtoken`). No bcrypt — plaintext choice
means a constant-time compare is sufficient and avoids a native dep.

**New files** (existing singular `*.controller.ts` convention is followed):

- `services/auth.service.ts`
  - `verifyCredentials(username, password): boolean` — constant-time compare of both
    fields via `crypto.timingSafeEqual` (guards against timing attacks; length-mismatch
    handled without leaking).
  - `signToken(): string` — signs `{ sub: 'admin', role: 'admin' }` with `JWT_SECRET`,
    `expiresIn: JWT_EXPIRES_IN`.
  - `verifyToken(token): JwtPayload` — verifies + returns payload, throws `AppError(401)`
    on failure.
- `controllers/auth.controller.ts`
  - `login` — validates body, calls `verifyCredentials`; on success returns
    `{ token, expiresIn }`, else `AppError('Invalid credentials', 401)`.
  - `me` — returns the authenticated principal (`{ role: 'admin' }`); used by the frontend
    to check token validity on load.
- `routes/auth.routes.ts`
  - `POST /api/auth/login` (public) → `authValidators.login` → `validate` → `login`.
  - `GET  /api/auth/me` (protected) → `requireAuth` → `me`.
- `middlewares/auth.ts`
  - `requireAuth` — reads `Authorization: Bearer <token>`; missing/malformed → `401`;
    calls `verifyToken`; attaches `req.user`; forwards errors to the global handler.
- `authValidators` added to `validators.ts` — `login` requires non-empty `username` +
  `password`.

**Express typing:** augment `Express.Request` with an optional `user` via a
`src/types/express.d.ts` ambient declaration (kept under the existing `typeRoots`).

**Route protection matrix:**

| Public (no auth) | Protected (`requireAuth`) |
|---|---|
| `GET /health`, `/docs`, `/docs.json` | `POST/PATCH/DELETE /api/doctors*` |
| `GET /api/doctors`, `/api/doctors/:id` | `GET/PATCH/DELETE /api/admin/appointments*` |
| `GET /api/appointments/availability` | `POST /api/categories` |
| `POST /api/appointments` (booking) | `POST/PUT/DELETE /api/services*` |
| `GET /api/categories`, `/api/services*` | `POST /api/uploads/image` |
| `POST /api/auth/login` | `GET /api/auth/me` |

Public reads and public booking stay open; every write and the admin surface are locked.
`requireAuth` is applied at the route-file level (e.g. `router.use(requireAuth)` for admin,
or per-route for mixed public/protected routers like doctors and services).

**Frontend note:** rewiring the SPA to call `/api/auth/login` and send the Bearer token is a
**separate frontend-phase task**. This round only exposes and secures the backend.

### 5.2 Correctness bugs

**B1 — Missed slots must not be advertised as free.**
`appointment.service.ts → getAvailableTimes` currently filters booked slots with
`status: { $ne: 'missed' }`, so a missed slot reappears as available — but the unique index
`{ doctorId, preferredDate, preferredTime }` rejects rebooking it, producing a confusing
409. Per the **never-reopen** decision: remove the status filter so *any* existing
appointment at a slot marks it taken. The existing plain unique index is now consistent with
availability. No index change, no migration.

**B2 — Off-grid bookings.**
`createAppointment` only checks the time is within working hours, so a direct API call can
book `11:45` when the grid only offers `11:30`. Fix: the selected time must be a member of
the generated slot set — `generateSlots(start, end).includes(selectedTime)` (via the new
time util). This subsumes the within-hours check.

**B3 — Timezone-correct dates (see also §5.3).**
Replace all ad-hoc `new Date(...)` date-only logic with clinic-timezone-anchored string
comparisons. Booking-in-the-past, available-dates filtering, and the 7-day schedule window
all use `YYYY-MM-DD` string math against "today in the clinic timezone".

**B4 — Generic duplicate-key message.**
`errorHandler.ts` hardcodes *"This slot is already booked."* for every Mongo 11000. Make it
generic — `A record with this <field(s)> already exists.` — with a friendly special case
(*"This time slot is already booked."*) only when the offending key set is the appointment
slot index (`preferredDate` + `preferredTime` present in `keyValue`).

### 5.3 Timezone model (`utils/date.ts`, new)

Uzbekistan is UTC+5 with no DST, but we implement generally and correctly:

- `CLINIC_TIMEZONE` env, default `Asia/Tashkent`.
- `getClinicToday(): string` — today's date in the clinic timezone as `YYYY-MM-DD`, via a
  single `Intl.DateTimeFormat(undefined, { timeZone, year, month, day })` formatting call.
- `addDays(dateStr, n): string` — pure string→string date arithmetic.
- `isValidDateKey(dateStr): boolean` — format + real-calendar-date check.

**Comparison strategy:** all date-only comparisons are **string comparisons** of zero-padded
ISO dates (lexicographic order == chronological order), so no `Date` object or UTC offset is
ever involved downstream. Examples:
- past check: `selectedDate < getClinicToday()`.
- 7-day window: keys must satisfy `getClinicToday() <= key < addDays(getClinicToday(), 7)`.
- available dates: `key >= getClinicToday()`.

This makes correctness independent of the server's own timezone (UTC on most hosts).

### 5.4 Security (folded in — internet-facing)

**S1 — Regex escaping.** User `search` input flows into `{ $regex, $options:'i' }` in
appointment and doctor search, enabling ReDoS / injection. Add `utils/escapeRegex.ts` and
wrap every user-supplied regex value. (This is itself a bug fix, not just hardening.)

**S2 — `trust proxy`.** `app.set('trust proxy', 1)` in `app.ts` so `express-rate-limit`
keys on the real client IP behind Vercel/nginx instead of the proxy IP.

### 5.5 Refactor — DRY

**D1 — `utils/time.ts` (new).** Single home for HH:MM math currently duplicated across
`appointment.service`, `doctor.service`, and `generateTimeSlots`:
`timeToMinutes`, `minutesToTime`, `parseTimeRange(range) → { start, end, startMin, endMin }`,
`generateSlots(start, end, stepMinutes = 30)`.

**D2 — `utils/schedule.ts` (new).** The date/time regexes + weekly-schedule validation are
copy-pasted in `validators.ts` (create **and** update), the `Doctor` model, and
`doctor.service`. Extract:
- shared `DATE_KEY_REGEX`, `TIME_RANGE_REGEX` constants,
- `assertValidWeeklySchedule(schedule)` (throws with clear messages) for the express-layer,
- `isValidWeeklySchedule(schedule): boolean` for the Mongoose model validator,
- the "within next 7 days" window check (using `utils/date.ts`).

All four call sites import from here; behavior is preserved, definitions deduplicated.

### 5.6 Docs (E1)

- `config/swagger.ts`: fix `Doctor.weeklySchedule` example (currently Monday/Tuesday
  day-names → must be date-keyed `"2026-07-03": "09:00-17:00"`).
- Correct the availability "next 30 days" text to reflect the 7-day-bounded, date-keyed
  reality.
- Add a `bearerAuth` security scheme and document `POST /api/auth/login`; mark protected
  endpoints as secured.

---

## 6. New / changed file map

```
src/
  config/env.ts                 (CHANGED: JWT_*, ADMIN_*, CLINIC_TIMEZONE + fail-fast)
  config/swagger.ts             (CHANGED: doctor schema, auth scheme, docs text)
  app.ts                        (CHANGED: trust proxy, mount /api/auth, apply requireAuth)
  middlewares/auth.ts           (NEW: requireAuth)
  middlewares/validators.ts     (CHANGED: authValidators; schedule blocks → utils/schedule)
  controllers/auth.controller.ts(NEW)
  services/auth.service.ts      (NEW)
  routes/auth.routes.ts         (NEW)
  routes/*.routes.ts            (CHANGED: apply requireAuth to protected routes)
  services/appointment.service.ts (CHANGED: B1, B2, time util, escapeRegex)
  services/doctor.service.ts    (CHANGED: time util, schedule util, escapeRegex, date util)
  models/Doctor.ts              (CHANGED: validator → utils/schedule)
  middlewares/errorHandler.ts   (CHANGED: B4 generic dup-key message)
  utils/time.ts                 (NEW)
  utils/date.ts                 (NEW)
  utils/schedule.ts             (NEW)
  utils/escapeRegex.ts          (NEW)
  types/express.d.ts            (NEW: Request.user augmentation)
tests/
  auth.integration.test.ts      (NEW)
  smoke.integration.test.ts     (CHANGED: admin route now expects 401 without token)
```

## 7. Testing

Existing stack: Vitest + `mongodb-memory-server` + supertest.

- **Update** the smoke test: the admin appointments endpoint must now return **401** without
  a token (the current test asserting "reachable without auth" is inverted).
- **New `auth.integration.test.ts`:** login success returns a token; bad credentials → 401;
  protected route without/with token → 401 / 200.
- **Booking regressions:** off-grid time (`11:45`) → 400 (B2); a slot with only a *missed*
  appointment is **not** offered and cannot be rebooked (B1); past-date booking rejected via
  clinic-timezone logic (B3).
- All tests set `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` in `beforeAll`.

## 8. Rollout notes

- `.env` / `.env.example`: add `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_USERNAME`,
  `ADMIN_PASSWORD`, `CLINIC_TIMEZONE`. Deploy env must set the required ones or the server
  refuses to boot (intended).
- No database migration (never-reopen keeps the existing index).
- Behavioral change for API clients: protected endpoints now require a Bearer token — the
  frontend must be updated in its own phase before the admin panel works against this build.

## 9. Deferred to a later round

helmet / security headers · Category `update`/`delete` + orphan-service guard · slug
auto-generation · dead text-index cleanup or migrate search to `$text` · Zod env schema ·
booking transaction to avoid order-number gaps · production `morgan('combined')` logging.
