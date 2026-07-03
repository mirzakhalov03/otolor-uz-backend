# Backend Optimization Round 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JWT auth, fix four correctness bugs, make dates timezone-correct, escape regex search, fix rate-limiting behind a proxy, and de-duplicate schedule/time logic in the Otolor Appointment API.

**Architecture:** Layered Express v5 + Mongoose. New pure utilities (`time`, `date`, `schedule`, `escapeRegex`) centralize logic currently copy-pasted across validators, models, and services. A single-admin stateless-JWT auth subsystem (`auth.service` → `auth.controller` → `auth.routes` + `requireAuth` middleware) gates every mutation and the admin panel. All date-only logic uses `YYYY-MM-DD` string comparison anchored to a clinic timezone, avoiding `Date`/UTC pitfalls.

**Tech Stack:** Node.js, Express 5, TypeScript, Mongoose 8, express-validator, jsonwebtoken, Vitest + mongodb-memory-server + supertest.

## Global Constraints

- Language/build: TypeScript, `strict: true`. `npm run lint` = `tsc --noEmit` must pass with zero errors.
- File naming: existing singular convention — `*.controller.ts`, `*.service.ts`, `*.routes.ts`.
- Response shape: always via `sendResponse` (`{ success, message, data?, pagination? }`).
- Errors: throw `AppError` / factories (`NotFoundError`, `BadRequestError`, `ConflictError`); never `res.status().json()` directly in services.
- Tests: Vitest globals enabled (no import of `describe/it/expect`). Test files must match `tests/**/*.test.ts`. Run all: `npm test`. Run one file: `npx vitest run <path>`.
- Timezone: all date-only logic compares `YYYY-MM-DD` strings anchored to `env.clinicTimezone` (default `Asia/Tashkent`). Never `new Date('YYYY-MM-DD')` for comparisons.
- Missed slots **never reopen**: a booked slot at (doctor, date, time) stays taken regardless of status.
- Commit after every task with the exact message shown.

---

## File Structure

```
src/
  utils/time.ts          (NEW)  HH:MM math + slot generation
  utils/date.ts          (NEW)  clinic-tz "today", date-string arithmetic/validation
  utils/escapeRegex.ts   (NEW)  escape user input for $regex
  utils/schedule.ts      (NEW)  schedule regexes + validation (shared)
  types/express.d.ts     (NEW)  Request.user augmentation
  config/env.ts          (MOD)  JWT_*, ADMIN_*, CLINIC_TIMEZONE, fail-fast
  services/auth.service.ts     (NEW)
  controllers/auth.controller.ts (NEW)
  routes/auth.routes.ts        (NEW)
  middlewares/auth.ts          (NEW)  requireAuth
  middlewares/validators.ts    (MOD)  authValidators; schedule blocks → utils/schedule; date check → utils/date
  middlewares/errorHandler.ts  (MOD)  generic dup-key message
  app.ts                       (MOD)  trust proxy, mount /api/auth
  routes/{admin,doctor,category,service,upload}.routes.ts (MOD) apply requireAuth
  services/appointment.service.ts (MOD)  B1, B2, time util, escapeRegex, clinic-tz
  services/doctor.service.ts   (MOD)  schedule util, time util, clinic-tz, escapeRegex
  models/Doctor.ts             (MOD)  validator → utils/schedule
  config/swagger.ts            (MOD)  date-keyed schema + bearerAuth + /auth/login
tests/
  unit/time.test.ts            (NEW)
  unit/date.test.ts            (NEW)
  unit/escapeRegex.test.ts     (NEW)
  unit/schedule.test.ts        (NEW)
  auth.integration.test.ts     (NEW)
  booking.integration.test.ts  (NEW)  B1/B2/B3 regressions
  smoke.integration.test.ts    (MOD)  env setup + admin route now 401
```

---

## Task 1: `utils/time.ts` — HH:MM math + slots

**Files:**
- Create: `src/utils/time.ts`
- Test: `tests/unit/time.test.ts`

**Interfaces:**
- Produces: `timeToMinutes(hhmm: string): number`, `minutesToTime(total: number): string`, `parseTimeRange(range: string): { start: string; end: string; startMin: number; endMin: number }`, `generateSlots(start: string, end: string, stepMinutes?: number): string[]`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/time.test.ts
import { timeToMinutes, minutesToTime, parseTimeRange, generateSlots } from '../../src/utils/time';

describe('utils/time', () => {
  it('converts HH:MM to minutes and back', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(600)).toBe('10:00');
  });

  it('parses a time range', () => {
    expect(parseTimeRange('09:00-12:00')).toEqual({
      start: '09:00', end: '12:00', startMin: 540, endMin: 720,
    });
  });

  it('generates 30-min slots, end-exclusive', () => {
    expect(generateSlots('09:00', '11:00')).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('honors a custom step', () => {
    expect(generateSlots('09:00', '10:00', 15)).toEqual(['09:00', '09:15', '09:30', '09:45']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/time.test.ts`
Expected: FAIL — cannot find module `../../src/utils/time`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/utils/time.ts
export const timeToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (total: number): string => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export interface TimeRange {
  start: string;
  end: string;
  startMin: number;
  endMin: number;
}

export const parseTimeRange = (range: string): TimeRange => {
  const [start, end] = range.split('-');
  return { start, end, startMin: timeToMinutes(start), endMin: timeToMinutes(end) };
};

export const generateSlots = (start: string, end: string, stepMinutes = 30): string[] => {
  const slots: string[] = [];
  const endMin = timeToMinutes(end);
  for (let cur = timeToMinutes(start); cur < endMin; cur += stepMinutes) {
    slots.push(minutesToTime(cur));
  }
  return slots;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/time.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/time.ts tests/unit/time.test.ts
git commit -m "feat: add shared time utilities (HH:MM math, slot generation)"
```

---

## Task 2: `utils/date.ts` — clinic-timezone date logic

**Files:**
- Create: `src/utils/date.ts`
- Test: `tests/unit/date.test.ts`

**Interfaces:**
- Produces: `DEFAULT_CLINIC_TIMEZONE: string`, `getClinicToday(timeZone?: string): string` (YYYY-MM-DD), `addDays(dateStr: string, n: number): string`, `isValidDateKey(dateStr: string): boolean`
- Note: does NOT import `env` — keeps it unit-testable without environment setup. Callers pass `env.clinicTimezone`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/date.test.ts
import { getClinicToday, addDays, isValidDateKey, DEFAULT_CLINIC_TIMEZONE } from '../../src/utils/date';

describe('utils/date', () => {
  it('adds days across month/year boundaries as strings', () => {
    expect(addDays('2026-07-02', 7)).toBe('2026-07-09');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('validates real calendar dates', () => {
    expect(isValidDateKey('2026-07-02')).toBe(true);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-7-2')).toBe(false);
  });

  it('returns today in the clinic timezone as YYYY-MM-DD', () => {
    const today = getClinicToday(DEFAULT_CLINIC_TIMEZONE);
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Asia/Tashkent (UTC+5) is never behind UTC, so its date is >= the UTC date.
    const utcDate = new Date().toISOString().slice(0, 10);
    expect(today >= utcDate).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/date.test.ts`
Expected: FAIL — cannot find module `../../src/utils/date`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/utils/date.ts

export const DEFAULT_CLINIC_TIMEZONE = 'Asia/Tashkent';

/** Today's date in the given timezone, formatted YYYY-MM-DD (en-CA yields ISO order). */
export const getClinicToday = (timeZone: string = DEFAULT_CLINIC_TIMEZONE): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

/** Adds n days to a YYYY-MM-DD string. UTC math is used purely to derive the calendar date. */
export const addDays = (dateStr: string, n: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};

/** True only for a well-formed YYYY-MM-DD that is also a real calendar date. */
export const isValidDateKey = (dateStr: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/date.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/date.ts tests/unit/date.test.ts
git commit -m "feat: add clinic-timezone date utilities (string-based, tz-safe)"
```

---

## Task 3: `utils/escapeRegex.ts`

**Files:**
- Create: `src/utils/escapeRegex.ts`
- Test: `tests/unit/escapeRegex.test.ts`

**Interfaces:**
- Produces: `escapeRegex(input: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/escapeRegex.test.ts
import { escapeRegex } from '../../src/utils/escapeRegex';

describe('utils/escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
    expect(escapeRegex('(a+)+$')).toBe('\\(a\\+\\)\\+\\$');
  });

  it('leaves plain text untouched', () => {
    expect(escapeRegex('Aziz Rahmatullayev')).toBe('Aziz Rahmatullayev');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/escapeRegex.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/utils/escapeRegex.ts
/** Escapes regex metacharacters so user input is matched literally in $regex queries. */
export const escapeRegex = (input: string): string =>
  input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/escapeRegex.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/escapeRegex.ts tests/unit/escapeRegex.test.ts
git commit -m "feat: add escapeRegex utility to sanitize search input"
```

---

## Task 4: `utils/schedule.ts` — shared schedule validation

**Files:**
- Create: `src/utils/schedule.ts`
- Test: `tests/unit/schedule.test.ts`

**Interfaces:**
- Consumes: `isValidDateKey`, `addDays` from `utils/date`; `AppError` from `utils/AppError`.
- Produces: `DATE_KEY_REGEX`, `TIME_RANGE_REGEX`, `WeeklySchedule` type, `isValidWeeklySchedule(schedule: unknown): boolean`, `assertValidWeeklySchedule(schedule: Record<string,string>): true`, `assertScheduleWithinWindow(schedule: WeeklySchedule, today: string): void`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/schedule.test.ts
import {
  isValidWeeklySchedule,
  assertValidWeeklySchedule,
  assertScheduleWithinWindow,
} from '../../src/utils/schedule';

describe('utils/schedule', () => {
  it('accepts a valid date-keyed schedule', () => {
    expect(isValidWeeklySchedule({ '2026-07-03': '09:00-17:00' })).toBe(true);
  });

  it('rejects empty, non-object, and malformed schedules', () => {
    expect(isValidWeeklySchedule({})).toBe(false);
    expect(isValidWeeklySchedule(null)).toBe(false);
    expect(isValidWeeklySchedule({ Monday: '09:00-17:00' })).toBe(false);
    expect(isValidWeeklySchedule({ '2026-07-03': '9-5' })).toBe(false);
  });

  it('assertValidWeeklySchedule throws on bad time range', () => {
    expect(() => assertValidWeeklySchedule({ '2026-07-03': '25:00-26:00' })).toThrow();
  });

  it('assertScheduleWithinWindow rejects past and too-far dates relative to given today', () => {
    const today = '2026-07-02';
    expect(() => assertScheduleWithinWindow({ '2026-07-03': '09:00-17:00' }, today)).not.toThrow();
    expect(() => assertScheduleWithinWindow({ '2026-07-01': '09:00-17:00' }, today)).toThrow(/past/);
    expect(() => assertScheduleWithinWindow({ '2026-07-09': '09:00-17:00' }, today)).toThrow(/too far/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/schedule.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/utils/schedule.ts
import { isValidDateKey, addDays } from './date';
import { AppError } from './AppError';

export const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RANGE_REGEX = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

export interface WeeklySchedule {
  [date: string]: string;
}

/** Pure structural check for the Mongoose model validator. */
export const isValidWeeklySchedule = (schedule: unknown): boolean => {
  if (!schedule || typeof schedule !== 'object') return false;
  const entries = Object.entries(schedule as Record<string, unknown>);
  if (entries.length === 0) return false;
  for (const [key, time] of entries) {
    if (!DATE_KEY_REGEX.test(key)) return false;
    if (typeof time !== 'string' || !TIME_RANGE_REGEX.test(time)) return false;
  }
  return true;
};

/** Throwing validator for the express-validator layer (messages surface to the client). */
export const assertValidWeeklySchedule = (schedule: Record<string, string>): true => {
  for (const [dateKey, time] of Object.entries(schedule)) {
    if (!DATE_KEY_REGEX.test(dateKey)) {
      throw new Error(`Invalid date key: ${dateKey}. Use YYYY-MM-DD format.`);
    }
    if (!TIME_RANGE_REGEX.test(time)) {
      throw new Error(`Invalid time range for ${dateKey}. Use "HH:MM-HH:MM" format.`);
    }
  }
  return true;
};

/** Ensures every key is a real date within [today, today+7) — caller supplies clinic-tz today. */
export const assertScheduleWithinWindow = (schedule: WeeklySchedule, today: string): void => {
  const maxDate = addDays(today, 7);
  for (const dateKey of Object.keys(schedule)) {
    if (!isValidDateKey(dateKey)) {
      throw new AppError(`Invalid date: ${dateKey}. Use YYYY-MM-DD format.`, 400);
    }
    if (dateKey < today) {
      throw new AppError(`Date ${dateKey} is in the past. Only future dates are allowed.`, 400);
    }
    if (dateKey >= maxDate) {
      throw new AppError(
        `Date ${dateKey} is too far ahead. You can only set availability for the next 7 days.`,
        400
      );
    }
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/schedule.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/schedule.ts tests/unit/schedule.test.ts
git commit -m "feat: add shared weekly-schedule validation utilities"
```

---

## Task 5: Environment config — JWT, admin, timezone (fail-fast)

**Files:**
- Modify: `src/config/env.ts`
- Modify: `.env.example` (document new keys)
- Modify: `tests/smoke.integration.test.ts` (set the new required vars so the suite still boots)

**Interfaces:**
- Produces on `env`: `jwtSecret: string`, `jwtExpiresIn: string`, `adminUsername: string`, `adminPassword: string`, `clinicTimezone: string`

**Why the smoke-test edit:** making `JWT_SECRET`/`ADMIN_USERNAME`/`ADMIN_PASSWORD` required means any test that imports the app now needs them set before import, or boot throws. Setting them in the smoke test's `beforeAll` here keeps `npm test` green through Tasks 5–7. The admin route still returns 200 (its guard arrives in Task 8), so the existing assertion is untouched in this task.

- [ ] **Step 1: Add a `requireEnv` helper and the new keys**

Replace the `export const env = { ... }` block in `src/config/env.ts` with the version below (keep the existing `dotenv.config` and `NODE_ENV` validation above it unchanged):

```ts
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  port: parseInt(process.env.PORT || '5050', 10),
  nodeEnv,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/otolor-appointments',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim()),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  logLevel: process.env.LOG_LEVEL || 'dev',
  clinicTimezone: process.env.CLINIC_TIMEZONE || 'Asia/Tashkent',
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminUsername: requireEnv('ADMIN_USERNAME'),
  adminPassword: requireEnv('ADMIN_PASSWORD'),
  awsRegion: process.env.AWS_REGION || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsS3BucketName: process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || '',
  awsS3Folder: process.env.AWS_S3_FOLDER || '',
  awsS3PublicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL || '',
};
```

- [ ] **Step 2: Document the new keys in `.env.example`**

Append to `.env.example`:

```bash

# Auth (single shared admin)
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=otoloruzadmin
ADMIN_PASSWORD=change-me

# Clinic timezone (used for all date logic)
CLINIC_TIMEZONE=Asia/Tashkent
```

Also add the same keys to your local `.env` so the dev server boots.

- [ ] **Step 3: Keep the smoke suite bootable**

In `tests/smoke.integration.test.ts`, inside the `beforeAll` block, immediately after the existing `process.env.CORS_ORIGINS = ...` line, add:

```ts
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'pw';
```

Do NOT change any assertion in this file — the admin-route test still expects 200 in this task (its guard is added in Task 8).

- [ ] **Step 4: Verify types + full suite**

Run: `npm run lint`
Expected: PASS (exit 0).
Run: `npm test`
Expected: PASS — all existing tests still green (the app boots because the required vars are now set in every test that imports it).

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts .env.example tests/smoke.integration.test.ts
git commit -m "feat: add JWT/admin/timezone env config with fail-fast validation"
```

---

## Task 6: Auth service + Request typing

**Files:**
- Create: `src/services/auth.service.ts`
- Create: `src/types/express.d.ts`
- Test: `tests/unit/auth.service.test.ts`
- Add dependency: `jsonwebtoken`

**Interfaces:**
- Consumes: `env` (jwt/admin), `AppError`.
- Produces: `authService.verifyCredentials(username, password): boolean`, `authService.signToken(): string`, `authService.verifyToken(token: string): AuthTokenPayload`; type `AuthTokenPayload = { sub: string; role: 'admin' }`.

- [ ] **Step 1: Install jsonwebtoken**

```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/auth.service.test.ts
describe('auth.service', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'pw';
  });

  it('verifies correct credentials and rejects wrong ones', async () => {
    const { authService } = await import('../../src/services/auth.service');
    expect(authService.verifyCredentials('admin', 'pw')).toBe(true);
    expect(authService.verifyCredentials('admin', 'nope')).toBe(false);
    expect(authService.verifyCredentials('nope', 'pw')).toBe(false);
  });

  it('signs a token that it can verify back to the admin payload', async () => {
    const { authService } = await import('../../src/services/auth.service');
    const token = authService.signToken();
    const payload = authService.verifyToken(token);
    expect(payload.role).toBe('admin');
    expect(payload.sub).toBe('admin');
  });

  it('throws 401 on an invalid token', async () => {
    const { authService } = await import('../../src/services/auth.service');
    expect(() => authService.verifyToken('garbage')).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/auth.service.test.ts`
Expected: FAIL — cannot find module `auth.service`.

- [ ] **Step 4: Write the implementation**

```ts
// src/services/auth.service.ts
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface AuthTokenPayload {
  sub: string;
  role: 'admin';
}

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
};

class AuthService {
  /** Constant-time comparison of both fields (no short-circuit timing leak). */
  verifyCredentials(username: string, password: string): boolean {
    const okUser = safeEqual(username, env.adminUsername);
    const okPass = safeEqual(password, env.adminPassword);
    return okUser && okPass;
  }

  signToken(): string {
    const payload: AuthTokenPayload = { sub: 'admin', role: 'admin' };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}

export const authService = new AuthService();
```

```ts
// src/types/express.d.ts
import 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { role: 'admin' };
    }
  }
}
```

- [ ] **Step 5: Run test + lint**

Run: `npx vitest run tests/unit/auth.service.test.ts`
Expected: PASS (3 tests).
Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/services/auth.service.ts src/types/express.d.ts tests/unit/auth.service.test.ts
git commit -m "feat: add auth service (credential check, JWT sign/verify) and Request.user typing"
```

---

## Task 7: `requireAuth` middleware + auth controller + routes + validators + mount

**Files:**
- Create: `src/middlewares/auth.ts`
- Create: `src/controllers/auth.controller.ts`
- Create: `src/routes/auth.routes.ts`
- Modify: `src/middlewares/validators.ts` (add `authValidators`)
- Modify: `src/app.ts` (mount `/api/auth`)
- Test: `tests/auth.integration.test.ts`

**Interfaces:**
- Consumes: `authService`, `sendResponse`, `asyncHandler`, `AppError`, `validate`.
- Produces: `requireAuth` middleware; `login`/`me` controllers; `authValidators.login`; route `POST /api/auth/login`, `GET /api/auth/me`.

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/auth.integration.test.ts
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';

describe('Auth integration', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'pw';

    const { connectDatabase } = await import('../src/config/database');
    await connectDatabase();
    const appModule = await import('../src/app');
    app = appModule.default;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('rejects bad credentials with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns a token for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('blocks /api/auth/me without a token and allows it with one', async () => {
    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);

    const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'pw' });
    const withToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);
    expect(withToken.status).toBe(200);
    expect(withToken.body.data.role).toBe('admin');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth.integration.test.ts`
Expected: FAIL — route `/api/auth/login` returns 404.

- [ ] **Step 3: Create the middleware**

```ts
// src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../utils/AppError';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }
    const token = header.slice(7).trim();
    const payload = authService.verifyToken(token);
    req.user = { role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 4: Create the controller**

```ts
// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!authService.verifyCredentials(username, password)) {
    throw new AppError('Invalid username or password', 401);
  }

  const token = authService.signToken();
  sendResponse({
    res,
    message: 'Logged in successfully',
    data: { token, expiresIn: env.jwtExpiresIn },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendResponse({
    res,
    message: 'Authenticated',
    data: { role: req.user?.role },
  });
});
```

- [ ] **Step 5: Add `authValidators` to `src/middlewares/validators.ts`**

Append this export to `src/middlewares/validators.ts`:

```ts
/**
 * Validation rules for authentication requests.
 */
export const authValidators = {
  login: [
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isString(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isString(),
  ],
};
```

- [ ] **Step 6: Create the routes**

```ts
// src/routes/auth.routes.ts
import { Router } from 'express';
import { login, me } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';
import { authValidators } from '../middlewares/validators';
import { validate } from '../middlewares/validate';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: otoloruzadmin }
 *               password: { type: string, example: your-password }
 *     responses:
 *       200: { description: Returns a JWT access token }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authValidators.login, validate, login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the authenticated principal
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Token is valid }
 *       401: { description: Missing or invalid token }
 */
router.get('/me', requireAuth, me);

export default router;
```

- [ ] **Step 7: Mount in `src/app.ts`**

Add the import alongside the other route imports:

```ts
import authRoutes from './routes/auth.routes';
```

Add the mount in the `─── API Routes ───` block, before the other `/api/*` routes:

```ts
app.use('/api/auth', authRoutes);
```

- [ ] **Step 8: Run test + lint**

Run: `npx vitest run tests/auth.integration.test.ts`
Expected: PASS (3 tests).
Run: `npm run lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/middlewares/auth.ts src/controllers/auth.controller.ts src/routes/auth.routes.ts src/middlewares/validators.ts src/app.ts tests/auth.integration.test.ts
git commit -m "feat: add /api/auth login + me endpoints and requireAuth middleware"
```

---

## Task 8: Lock down mutations + admin routes with `requireAuth`

**Files:**
- Modify: `src/routes/admin.routes.ts`
- Modify: `src/routes/doctor.routes.ts`
- Modify: `src/routes/category.routes.ts`
- Modify: `src/routes/service.routes.ts`
- Modify: `src/routes/upload.routes.ts`
- Modify: `tests/smoke.integration.test.ts` (admin route now 401 — the auth env vars were already added in Task 5)

**Interfaces:**
- Consumes: `requireAuth` from `../middlewares/auth`.

- [ ] **Step 1: Flip the smoke test's admin assertion to the new auth reality**

The auth env vars (`JWT_SECRET`/`ADMIN_USERNAME`/`ADMIN_PASSWORD`) are already set in this file's `beforeAll` (added in Task 5) — do not add them again. Just replace the last test (`'admin appointments endpoint is reachable without auth (current behavior)'`) with:

```ts
  it('admin appointments endpoint requires auth', async () => {
    const noAuth = await request(app).get('/api/admin/appointments');
    expect(noAuth.status).toBe(401);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'pw' });
    const withAuth = await request(app)
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${login.body.data.token}`);
    expect(withAuth.status).toBe(200);
    expect(withAuth.body.success).toBe(true);
  });
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `npx vitest run tests/smoke.integration.test.ts`
Expected: FAIL — admin endpoint still returns 200 without auth.

- [ ] **Step 3: Protect the admin router**

In `src/routes/admin.routes.ts`, add the import and guard the whole router. After `const router = Router();` insert:

```ts
import { requireAuth } from '../middlewares/auth';
// ...
router.use(requireAuth);
```

(Place the `import` at the top with the other imports; place `router.use(requireAuth);` immediately after `const router = Router();`.)

- [ ] **Step 4: Protect doctor mutations**

In `src/routes/doctor.routes.ts`, add at the top:

```ts
import { requireAuth } from '../middlewares/auth';
```

Add `requireAuth` as the first handler on the three mutation routes (leave the two `GET` routes public):

```ts
router.post('/', requireAuth, doctorValidators.create, validate, createDoctor);
router.patch('/:id', requireAuth, doctorValidators.update, validate, updateDoctor);
router.delete('/:id', requireAuth, doctorValidators.delete, validate, deleteDoctor);
```

- [ ] **Step 5: Protect category create**

In `src/routes/category.routes.ts`, add the import and guard the POST (leave GET public):

```ts
import { requireAuth } from '../middlewares/auth';
// ...
router.post('/', requireAuth, categoryValidators.create, validate, createCategory);
```

- [ ] **Step 6: Protect service mutations**

In `src/routes/service.routes.ts`, add the import and guard POST/PUT/DELETE (leave the two GET routes public):

```ts
import { requireAuth } from '../middlewares/auth';
// ...
router.post('/', requireAuth, serviceValidators.create, validate, createService);
router.put('/:id', requireAuth, serviceValidators.update, validate, updateService);
router.delete('/:id', requireAuth, serviceValidators.delete, validate, deleteService);
```

- [ ] **Step 7: Protect uploads**

In `src/routes/upload.routes.ts`, add the import and guard the POST:

```ts
import { requireAuth } from '../middlewares/auth';
// ...
router.post('/image', requireAuth, uploadSingleImage.single('file'), uploadImage);
```

- [ ] **Step 8: Run smoke + full suite + lint**

Run: `npx vitest run tests/smoke.integration.test.ts`
Expected: PASS.
Run: `npm test`
Expected: PASS (all suites).
Run: `npm run lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/routes/admin.routes.ts src/routes/doctor.routes.ts src/routes/category.routes.ts src/routes/service.routes.ts src/routes/upload.routes.ts tests/smoke.integration.test.ts
git commit -m "feat: require auth on all mutations, admin, and upload routes"
```

---

## Task 9: Security hardening — trust proxy + regex escaping

**Files:**
- Modify: `src/app.ts` (trust proxy)
- Modify: `src/services/appointment.service.ts` (escape search)
- Modify: `src/services/doctor.service.ts` (escape search)

**Interfaces:**
- Consumes: `escapeRegex` from `../utils/escapeRegex`.

- [ ] **Step 1: Set trust proxy in `src/app.ts`**

Immediately after `const app = express();` add:

```ts
// Behind Vercel/nginx: trust the first proxy so req.ip is the real client IP
// (required for correct per-client rate limiting).
app.set('trust proxy', 1);
```

- [ ] **Step 2: Escape search in `appointment.service.ts`**

Add the import at the top of `src/services/appointment.service.ts`:

```ts
import { escapeRegex } from '../utils/escapeRegex';
```

In `getAppointments`, replace the `if (search) { ... }` block with:

```ts
    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { fullName: { $regex: safe, $options: 'i' } },
        { phoneNumber: { $regex: safe, $options: 'i' } },
        { orderNumber: { $regex: safe, $options: 'i' } },
      ];
    }
```

- [ ] **Step 3: Escape search in `doctor.service.ts`**

Add the import at the top of `src/services/doctor.service.ts`:

```ts
import { escapeRegex } from '../utils/escapeRegex';
```

In `getAllDoctors`, replace the `if (search) { ... }` block with:

```ts
    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { specialization: { $regex: safe, $options: 'i' } },
      ];
    }
```

- [ ] **Step 4: Verify nothing regressed**

Run: `npm test`
Expected: PASS.
Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app.ts src/services/appointment.service.ts src/services/doctor.service.ts
git commit -m "fix: trust proxy for rate limiting and escape user input in $regex search"
```

---

## Task 10: Booking correctness — B1 (no missed reopen) + B2 (on-grid only), via time util

**Files:**
- Modify: `src/services/appointment.service.ts`
- Test: `tests/booking.integration.test.ts`

**Interfaces:**
- Consumes: `generateSlots` from `../utils/time`; `doctorService.getScheduleForDate`.

- [ ] **Step 1: Write the failing regression test**

```ts
// tests/booking.integration.test.ts
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';

describe('Booking correctness', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;
  let token: string;

  const tomorrow = (): string => {
    // Clinic tz (UTC+5) date; UTC+1 day is safely within the 7-day window.
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'pw';
    process.env.CLINIC_TIMEZONE = 'Asia/Tashkent';

    const { connectDatabase } = await import('../src/config/database');
    await connectDatabase();
    app = (await import('../src/app')).default;

    const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'pw' });
    token = login.body.data.token;
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const createDoctor = async (date: string) => {
    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dr. Grid', specialization: 'General', weeklySchedule: { [date]: '09:00-12:00' } });
    return res.body.data._id as string;
  };

  it('rejects an off-grid time (11:45) with 400', async () => {
    const date = tomorrow();
    const doctorId = await createDoctor(date);
    const res = await request(app).post('/api/appointments').send({
      doctorId, fullName: 'Off Grid', age: 30, phoneNumber: '+998901112233',
      selectedDate: date, selectedTime: '11:45',
    });
    expect(res.status).toBe(400);
  });

  it('does not reopen a missed slot and cannot rebook it', async () => {
    const date = tomorrow();
    const doctorId = await createDoctor(date);

    const booking = await request(app).post('/api/appointments').send({
      doctorId, fullName: 'First', age: 30, phoneNumber: '+998901112233',
      selectedDate: date, selectedTime: '09:30',
    });
    expect(booking.status).toBe(201);

    // Mark it missed.
    await request(app)
      .patch(`/api/admin/appointments/${booking.body.data._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'missed' });

    // Availability must NOT offer 09:30 anymore.
    const avail = await request(app).get('/api/appointments/availability').query({ doctorId, date });
    expect(avail.body.data).not.toContain('09:30');

    // Rebooking 09:30 must fail (409), not silently double-book.
    const rebook = await request(app).post('/api/appointments').send({
      doctorId, fullName: 'Second', age: 40, phoneNumber: '+998907776655',
      selectedDate: date, selectedTime: '09:30',
    });
    expect(rebook.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/booking.integration.test.ts`
Expected: FAIL — off-grid `11:45` currently returns 201; missed slot reappears in availability.

- [ ] **Step 3: Fix `getAvailableTimes` (B1) and `createAppointment` (B2)**

In `src/services/appointment.service.ts`, add the time-util import at the top:

```ts
import { generateSlots } from '../utils/time';
```

Replace the `getAvailableTimes` method body's slot/booking logic with (note: **no** status filter — every existing appointment at a slot marks it taken):

```ts
  async getAvailableTimes(doctorId: string, date: string): Promise<string[]> {
    const doctor = await doctorService.getDoctorById(doctorId);

    const daySchedule = doctorService.getScheduleForDate(doctor, date);
    if (!daySchedule) {
      return [];
    }

    const allSlots = generateSlots(daySchedule.start, daySchedule.end);

    const bookedAppointments = await Appointment.find({
      doctorId,
      preferredDate: date,
    }).select('preferredTime');

    const bookedTimes = new Set(bookedAppointments.map((a) => a.preferredTime));

    return allSlots.filter((slot) => !bookedTimes.has(slot));
  }
```

In `createAppointment`, delete the entire "3. Check if time falls within working hours" block — from `const [selectedH, selectedM] = selectedTime.split(':').map(Number);` through the closing `}` of the `if (selectedMinutes < startMinutes || selectedMinutes >= endMinutes) { throw ... }` statement — and replace it with this on-grid membership check:

```ts
    // 3. The selected time must be one of the generated 30-min slots
    const availableSlots = generateSlots(daySchedule.start, daySchedule.end);
    if (!availableSlots.includes(selectedTime)) {
      throw BadRequestError(
        `Selected time ${selectedTime} is not an available slot for Dr. ${doctor.name} ` +
          `(working hours ${daySchedule.start}-${daySchedule.end}, 30-minute slots)`
      );
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/booking.integration.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run full suite + lint**

Run: `npm test`
Expected: PASS.
Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/appointment.service.ts tests/booking.integration.test.ts
git commit -m "fix: missed slots never reopen and bookings must land on a 30-min grid slot"
```

---

## Task 11: Clinic-timezone date logic across validators + services

**Files:**
- Modify: `src/middlewares/validators.ts` (appointment `selectedDate` custom check)
- Modify: `src/services/appointment.service.ts` (`getAvailableDates`)
- Modify: `src/services/doctor.service.ts` (`validateDateKeysWithin7Days`, `validateScheduleChange`)
- Modify: `src/models/Doctor.ts` (validator → shared util)
- Test: `tests/booking.integration.test.ts` (add a past-date case)

**Interfaces:**
- Consumes: `getClinicToday` from `../utils/date`; `assertScheduleWithinWindow`, `isValidWeeklySchedule` from `../utils/schedule`; `env.clinicTimezone`.

- [ ] **Step 1: Add a failing past-date test**

Append this test inside the `describe('Booking correctness', ...)` block in `tests/booking.integration.test.ts`:

```ts
  it('rejects booking a past date', async () => {
    const date = tomorrow();
    const doctorId = await createDoctor(date);
    const res = await request(app).post('/api/appointments').send({
      doctorId, fullName: 'Past', age: 30, phoneNumber: '+998901112233',
      selectedDate: '2000-01-01', selectedTime: '09:30',
    });
    expect(res.status).toBe(400);
  });
```

- [ ] **Step 2: Run it (expect it already passes for the wrong reason — then we harden the source)**

Run: `npx vitest run tests/booking.integration.test.ts -t "past date"`
Expected: PASS (old `new Date` check happens to reject 2000-01-01). We still refactor the source to be timezone-correct and consistent.

- [ ] **Step 3: Fix the appointment `selectedDate` validator**

In `src/middlewares/validators.ts`, add imports at the top:

```ts
import { getClinicToday } from '../utils/date';
import { env } from '../config/env';
import { assertValidWeeklySchedule } from '../utils/schedule';
```

Replace the `selectedDate` `.custom(...)` block in `appointmentValidators.create` with:

```ts
      .custom((value: string) => {
        if (value < getClinicToday(env.clinicTimezone)) {
          throw new Error('Cannot book appointments in the past');
        }
        return true;
      }),
```

- [ ] **Step 4: De-duplicate the doctor schedule validators (D2)**

In `src/middlewares/validators.ts`, replace **both** `weeklySchedule` `.custom((schedule) => { ... })` inline blocks (in `doctorValidators.create` and `doctorValidators.update`) with:

```ts
      .custom(assertValidWeeklySchedule),
```

- [ ] **Step 5: Fix `getAvailableDates` in `appointment.service.ts`**

Add imports at the top of `src/services/appointment.service.ts`:

```ts
import { getClinicToday } from '../utils/date';
import { env } from '../config/env';
```

Replace the `getAvailableDates` body with a string-comparison filter:

```ts
  async getAvailableDates(doctorId: string): Promise<string[]> {
    const doctor = await doctorService.getDoctorById(doctorId);
    const today = getClinicToday(env.clinicTimezone);

    return Object.keys(doctor.weeklySchedule)
      .filter((dateStr) => dateStr >= today)
      .sort();
  }
```

- [ ] **Step 6: Fix `doctor.service.ts` date logic**

Add imports at the top of `src/services/doctor.service.ts`:

```ts
import { getClinicToday } from '../utils/date';
import { assertScheduleWithinWindow } from '../utils/schedule';
import { env } from '../config/env';
```

Replace the private `validateDateKeysWithin7Days(schedule)` method entirely with a thin delegate (keep the same call sites `this.validateDateKeysWithin7Days(...)`):

```ts
  private validateDateKeysWithin7Days(schedule: IWeeklySchedule): void {
    assertScheduleWithinWindow(schedule, getClinicToday(env.clinicTimezone));
  }
```

In `validateScheduleChange`, replace the "date removed" past-check block:

```ts
      if (!timeRange) {
        if (dateStr >= getClinicToday(env.clinicTimezone)) {
          conflicts.push(`${dateStr} at ${appt.preferredTime} — date removed from schedule`);
        }
        continue;
      }
```

(This removes the local `new Date(dateStr + 'T00:00:00')` / `today.setHours` lines in that branch.)

- [ ] **Step 7: Point the Doctor model validator at the shared util (D2)**

In `src/models/Doctor.ts`, replace the inline `weeklySchedule.validate.validator` function with the shared checker. Add the import at the top:

```ts
import { isValidWeeklySchedule } from '../utils/schedule';
```

Replace the `validate: { validator: function (schedule) { ... }, message: ... }` with:

```ts
      validate: {
        validator: (schedule: IWeeklySchedule): boolean => isValidWeeklySchedule(schedule),
        message:
          'Invalid schedule format. Use date strings (YYYY-MM-DD) as keys and "HH:MM-HH:MM" as values.',
      },
```

(The now-unused `dateKeyRegex`/`timeRangeRegex` consts at the top of `Doctor.ts` can be deleted.)

- [ ] **Step 8: Run full suite + lint**

Run: `npm test`
Expected: PASS (all suites, including the past-date test).
Run: `npm run lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/middlewares/validators.ts src/services/appointment.service.ts src/services/doctor.service.ts src/models/Doctor.ts tests/booking.integration.test.ts
git commit -m "refactor: use clinic-timezone date logic and shared schedule validation everywhere"
```

---

## Task 12: De-duplicate time math in `doctor.service` (D1)

**Files:**
- Modify: `src/services/doctor.service.ts`

**Interfaces:**
- Consumes: `timeToMinutes` from `../utils/time`.
- Note: after Task 10, `getAvailableTimes` calls the `generateSlots` util directly, so `doctorService.generateTimeSlots` is no longer referenced anywhere (verified: only `doctor.service.ts` defines it and nothing calls it). This task removes it as dead code.

- [ ] **Step 1: Import the time utility**

At the top of `src/services/doctor.service.ts` add:

```ts
import { timeToMinutes } from '../utils/time';
```

- [ ] **Step 2: Replace the manual minute math in `validateScheduleChange`**

Replace the block that computes `apptMinutes/startMinutes/endMinutes` with `timeToMinutes`:

```ts
      const [startTime, endTime] = timeRange.split('-');
      const apptMinutes = timeToMinutes(appt.preferredTime);
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      if (apptMinutes < startMinutes || apptMinutes >= endMinutes) {
        conflicts.push(
          `${dateStr} at ${appt.preferredTime} — outside new hours ${timeRange}`
        );
      }
```

- [ ] **Step 3: Delete the orphaned `generateTimeSlots` method**

Delete the entire `generateTimeSlots(startTime: string, endTime: string): string[] { ... }` method from `src/services/doctor.service.ts` — after Task 10 nothing calls it (the slot generation now lives in the `generateSlots` util, used directly by `appointment.service`). `getScheduleForDate` stays as-is.

Confirm there are no remaining references before finishing:

Run: `grep -rn "generateTimeSlots" src tests`
Expected: no matches.

- [ ] **Step 4: Run full suite + lint**

Run: `npm test`
Expected: PASS.
Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/doctor.service.ts
git commit -m "refactor: reuse shared time utilities in doctor.service"
```

---

## Task 13: Generic duplicate-key error message (B4)

**Files:**
- Modify: `src/middlewares/errorHandler.ts`

- [ ] **Step 1: Replace the hardcoded 11000 branch**

In `src/middlewares/errorHandler.ts`, replace the `if ((err as any).code === 11000) { ... }` block with:

```ts
  // Handle MongoDB duplicate key errors
  if ((err as any).code === 11000) {
    statusCode = 409;
    const keyValue = (err as any).keyValue || {};
    const fields = Object.keys(keyValue);
    const isSlotClash = fields.includes('preferredDate') && fields.includes('preferredTime');
    message = isSlotClash
      ? 'This time slot is already booked.'
      : `A record with this ${fields.join(', ') || 'value'} already exists.`;
  }
```

- [ ] **Step 2: Verify behavior with a quick test**

Add to `tests/booking.integration.test.ts` inside the `describe` block:

```ts
  it('returns a slot-specific message when double-booking the same slot', async () => {
    const date = tomorrow();
    const doctorId = await createDoctor(date);
    const payload = {
      doctorId, fullName: 'Dup', age: 30, phoneNumber: '+998901112233',
      selectedDate: date, selectedTime: '09:30',
    };
    await request(app).post('/api/appointments').send(payload);
    const second = await request(app).post('/api/appointments').send(payload);
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already booked/i);
  });
```

- [ ] **Step 3: Run tests + lint**

Run: `npx vitest run tests/booking.integration.test.ts`
Expected: PASS.
Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/middlewares/errorHandler.ts tests/booking.integration.test.ts
git commit -m "fix: generic duplicate-key error message with slot-specific special case"
```

---

## Task 14: Fix Swagger docs (E1)

**Files:**
- Modify: `src/config/swagger.ts`
- Modify: `src/routes/appointment.routes.ts` (availability text)

- [ ] **Step 1: Correct the Doctor `weeklySchedule` schema**

In `src/config/swagger.ts`, replace the `weeklySchedule` property of the `Doctor` schema (currently Monday/Tuesday day-name keys) with a date-keyed example:

```ts
            weeklySchedule: {
              type: 'object',
              additionalProperties: { type: 'string', example: '09:00-17:00' },
              description:
                'Date-keyed availability for the next 7 days: { "YYYY-MM-DD": "HH:MM-HH:MM" }.',
              example: {
                '2026-07-03': '09:00-17:00',
                '2026-07-04': '09:00-14:00',
              },
            },
```

- [ ] **Step 2: Add the `bearerAuth` security scheme**

In `src/config/swagger.ts`, inside `components`, add a `securitySchemes` block alongside `schemas`:

```ts
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
```

Add an `Auth` tag to the `tags` array:

```ts
      { name: 'Auth', description: 'Admin authentication' },
```

- [ ] **Step 3: Correct the availability "next 30 days" text**

In `src/routes/appointment.routes.ts`, find the availability route's Swagger `description` (and any code comment) that says "next 30 days" and change it to:

```
Returns available dates (schedule is date-keyed for the next 7 days) when only doctorId is given, or 30-minute time slots when a date is also provided.
```

Also update the same wording in the `getAvailability` JSDoc comment in `src/controllers/appointment.controller.ts` (it currently says "next 30 days").

- [ ] **Step 4: Verify docs build**

Run: `npm run lint`
Expected: PASS.
Run (manual, optional): `npm run dev`, open `http://localhost:5050/api/docs`, confirm the Doctor schema shows date keys, the `Auth` tag and `/api/auth/login` appear, and an "Authorize" (bearer) button is present. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/config/swagger.ts src/routes/appointment.routes.ts src/controllers/appointment.controller.ts
git commit -m "docs: fix Swagger doctor schema, add bearer auth scheme, correct availability text"
```

---

## Task 15: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full suite + type check**

Run: `npm test`
Expected: PASS — unit (time, date, escapeRegex, schedule, auth.service) + integration (auth, booking, smoke).
Run: `npm run lint`
Expected: PASS (exit 0).

- [ ] **Step 2: Manual boot sanity check**

Ensure `.env` has `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` set. Run `npm run dev`.
Expected: server boots on :5050. Then temporarily unset `JWT_SECRET` and rerun.
Expected: process exits with `Missing required environment variable: JWT_SECRET`. Restore `.env`.

- [ ] **Step 3: Final commit (if any stragglers)**

```bash
git status
# if clean, nothing to do
```

---

## Self-Review (completed during authoring)

**Spec coverage:**
- Auth subsystem (§5.1) → Tasks 5–8. ✔
- B1 missed no-reopen (§5.2) → Task 10. ✔
- B2 off-grid (§5.2) → Task 10. ✔
- B3 timezone dates (§5.2/5.3) → Tasks 2, 11. ✔
- B4 dup-key message (§5.2) → Task 13. ✔
- S1 regex escaping (§5.4) → Tasks 3, 9. ✔
- S2 trust proxy (§5.4) → Task 9. ✔
- D1 time util (§5.5) → Tasks 1, 10, 12. ✔
- D2 schedule util (§5.5) → Tasks 4, 11. ✔
- E1 docs (§5.6) → Task 14. ✔
- Tests (§7) → Tasks 6, 7, 8, 10, 11, 13. ✔
- Env/rollout (§8) → Task 5. ✔

**Type consistency:** `generateSlots(start, end, stepMinutes?)`, `getClinicToday(timeZone?)`, `assertScheduleWithinWindow(schedule, today)`, `assertValidWeeklySchedule(schedule)`, `isValidWeeklySchedule(schedule)`, `authService.{verifyCredentials,signToken,verifyToken}`, `requireAuth`, `AuthTokenPayload` — names/signatures match across tasks. ✔

**Placeholders:** none (Task 10 Step 3 shows the exact replacement block; the transient "placeholder removed below" line is explicitly superseded by the "use this exact replacement" block). ✔
