# Otolor Appointment API — Frontend Integration Guide

> **For:** Frontend AI agent or developer integrating with this backend
> **Base URL:** `http://localhost:5050`
> **Content-Type:** All requests use `application/json`
> **Auth:** None — no authentication is implemented. All routes are open.
> **CORS:** Only whitelisted origins are allowed. Default: `localhost:3000`, `localhost:5173`, `localhost:5050`
> **Swagger Docs:** http://localhost:5050/api/docs

---

## CRITICAL: Response Format

**Every single response** from this API follows this exact shape:

### Success Response
```json
{
  "success": true,
  "message": "Human-readable success message",
  "data": { ... }
}
```

### Success Response with Pagination (admin appointment list only)
```json
{
  "success": true,
  "message": "Appointments retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "total": 47,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

### Validation Error Response (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "fullName", "message": "Full name is required" },
    { "field": "age", "message": "Age must be a number between 0 and 150" }
  ]
}
```

> **IMPORTANT:** In development mode, error responses also include a `stack` field with the stack trace. In production, this field is absent. Don't rely on it.

---

## DATA MODELS

### Doctor Object
```typescript
{
  _id: string;             // MongoDB ObjectId
  id: string;              // Same as _id (virtual)
  name: string;            // "Dr. Sardor Karimov"
  specialization?: string; // "Stomatolog" — can be null/undefined
  weeklySchedule: {        // Only includes working days
    Monday?: string;       // "09:00-16:00"
    Tuesday?: string;      // "09:00-17:00"
    // ... only days the doctor works
  };
  createdAt: string;       // ISO datetime
  updatedAt: string;       // ISO datetime
}
```

### Appointment Object
```typescript
{
  _id: string;
  id: string;
  doctorId: {              // Populated — NOT just a string ID
    _id: string;
    name: string;
    specialization?: string;
  };
  fullName: string;        // Patient name
  age: number;
  phoneNumber: string;
  preferredDate: string;   // "2026-04-15" (YYYY-MM-DD)
  preferredTime: string;   // "10:00" (HH:MM, 24-hour)
  orderNumber: string;     // "A101", "A102", etc. (unique)
  status: "pending" | "seen" | "missed";
  createdAt: string;       // ISO datetime
}
```

> **NOTE:** `doctorId` in appointment responses is ALWAYS populated as an object `{ _id, name, specialization }`, never a raw string ID. When SENDING a request to create an appointment, you send `doctorId` as a plain string ID.

---

## ENDPOINTS

---

### 1. `GET /api/doctors` — List All Doctors

**Query params (all optional):**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name or specialization (case-insensitive) |

**Response:** `{ success, message, data: Doctor[] }`

**Sorted:** Alphabetically by name.

```bash
GET /api/doctors
GET /api/doctors?search=sardor
```

**Possible errors:** None — returns empty array if no doctors exist.

---

### 2. `GET /api/doctors/:id` — Get Single Doctor

**Response:** `{ success, message, data: Doctor }`

**Possible errors:**
| Status | When | Message |
|--------|------|---------|
| 400 | ID is not valid MongoDB ObjectId format | `"Invalid ID format"` |
| 404 | Doctor doesn't exist | `"Doctor not found"` |

---

### 3. `POST /api/doctors` — Create Doctor

**Request body:**
```json
{
  "name": "Dr. Sardor Karimov",
  "specialization": "Stomatolog",
  "weeklySchedule": {
    "Monday": "09:00-16:00",
    "Tuesday": "09:00-17:00",
    "Wednesday": "09:00-16:00",
    "Thursday": "09:00-14:00"
  }
}
```

**Field rules:**
| Field | Required | Rules |
|-------|----------|-------|
| `name` | ✅ Yes | 2–100 characters |
| `specialization` | ❌ No | Max 100 characters |
| `weeklySchedule` | ✅ Yes | Object. Keys must be day names (Monday–Sunday). Values must be `"HH:MM-HH:MM"` format. At least one day required. |

**Valid day names:** `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`, `Sunday` — case-sensitive, capitalized.

**Response (201):** `{ success, message, data: Doctor }`

**Possible errors:**
| Status | When | Message |
|--------|------|---------|
| 400 | Any field fails validation | Validation error with `errors` array |
| 400 | Invalid day name in schedule | `"Invalid day: Munday"` |
| 400 | Invalid time format in schedule | `"Invalid time range for Monday. Use \"HH:MM-HH:MM\" format."` |

---

### 4. `PATCH /api/doctors/:id` — Update Doctor

**Request body (all fields optional):**
```json
{
  "name": "Dr. Sardor Karimov Updated",
  "specialization": "Ortodont",
  "weeklySchedule": {
    "Monday": "10:00-18:00",
    "Friday": "09:00-13:00"
  }
}
```

Only include fields you want to change. Omitted fields stay unchanged.

**⚠️ IMPORTANT: `weeklySchedule` replaces the ENTIRE schedule, not individual days.** If doctor currently works Mon–Thu and you send `{ "weeklySchedule": { "Monday": "09:00-16:00" } }`, the doctor will ONLY work Mondays.

**Response:** `{ success, message, data: Doctor }`

**Possible errors:**
| Status | When | Message example |
|--------|------|---------|
| 400 | Validation failure | Validation error with `errors` array |
| 400 | Schedule change conflicts with pending appointments | `"Cannot update schedule for Dr. Sardor — 2 pending appointment(s) would conflict: ..."` |
| 404 | Doctor doesn't exist | `"Doctor not found"` |

**The schedule conflict error** lists every affected appointment:
```json
{
  "success": false,
  "message": "Cannot update schedule for Dr. Sardor Karimov — 2 pending appointment(s) would conflict:\n  • 2026-04-14 (Monday) at 10:00 — day removed\n  • 2026-04-15 (Tuesday) at 16:30 — outside new hours 09:00-15:00\n\nReschedule or cancel these appointments first."
}
```

---

### 5. `DELETE /api/doctors/:id` — Delete Doctor

**Response:** `{ success, message }`

**Possible errors:**
| Status | When | Message example |
|--------|------|---------|
| 400 | Doctor has pending appointments | `"Cannot delete Dr. Sardor Karimov — they have 3 pending appointment(s). Update or cancel them first."` |
| 404 | Doctor doesn't exist | `"Doctor not found"` |

---

### 6. `GET /api/appointments/availability` — Get Available Dates OR Times

This is a **smart endpoint** — its behavior changes based on which query params you provide:

#### Mode 1: Get Available Dates (only `doctorId`)
```
GET /api/appointments/availability?doctorId=661f1a2b3c4d5e6f7a8b9c0d
```

**Response:**
```json
{
  "success": true,
  "message": "Available dates retrieved successfully",
  "data": ["2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17"]
}
```

Returns the next **30 days** where the doctor has working hours. Dates are in `YYYY-MM-DD` format.

#### Mode 2: Get Available Time Slots (`doctorId` + `date`)
```
GET /api/appointments/availability?doctorId=661f1a2b3c4d5e6f7a8b9c0d&date=2026-04-15
```

**Response:**
```json
{
  "success": true,
  "message": "Available time slots retrieved successfully",
  "data": ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
}
```

Returns **30-minute time slots** within the doctor's working hours, with already-booked slots removed. If the doctor doesn't work on that day, returns empty array `[]`.

**Note:** Slots with status `"missed"` are freed up and appear as available again.

**Possible errors (both modes):**
| Status | When | Message |
|--------|------|---------|
| 400 | Missing `doctorId` | `"Doctor ID is required"` |
| 400 | Invalid `doctorId` format | `"Invalid doctor ID format"` |
| 400 | Invalid `date` format | `"Date must be in YYYY-MM-DD format"` |
| 404 | Doctor doesn't exist | `"Doctor not found"` |

---

### 7. `POST /api/appointments` — Book Appointment

**Request body:**
```json
{
  "doctorId": "661f1a2b3c4d5e6f7a8b9c0d",
  "fullName": "Aziz Rahmatullayev",
  "age": 28,
  "phoneNumber": "+998901234567",
  "selectedDate": "2026-04-15",
  "selectedTime": "10:00"
}
```

**Field rules:**
| Field | Required | Rules |
|-------|----------|-------|
| `doctorId` | ✅ Yes | Valid MongoDB ObjectId |
| `fullName` | ✅ Yes | 2–100 characters |
| `age` | ✅ Yes | Integer, 0–150 |
| `phoneNumber` | ✅ Yes | Matches `^\+?[\d\s-]{7,15}$` |
| `selectedDate` | ✅ Yes | `YYYY-MM-DD` format, cannot be in the past |
| `selectedTime` | ✅ Yes | `HH:MM` 24-hour format (e.g. `"09:00"`, `"14:30"`) |

**Response (201):** `{ success, message, data: Appointment }`

The response `data` includes the auto-generated `orderNumber` (e.g. `"A101"`) and `doctorId` is populated as an object.

**Possible errors:**
| Status | When | Message example |
|--------|------|---------|
| 400 | Any field fails validation | Validation error with `errors` array |
| 400 | Date is in the past | `"Cannot book appointments in the past"` |
| 400 | Doctor doesn't work on that day | `"Dr. Sardor Karimov does not work on Sundays"` |
| 400 | Time is outside working hours | `"Selected time 18:00 is outside Dr. Sardor Karimov's working hours (09:00-16:00)"` |
| 404 | Doctor doesn't exist | `"Doctor not found"` |
| 409 | Double-booking (slot already taken) | `"Time slot 10:00 on 2026-04-15 is already booked for Dr. Sardor Karimov"` |

---

### 8. `GET /api/admin/appointments` — List All Appointments (Admin)

**Query params (all optional):**
| Param | Type | Description |
|-------|------|-------------|
| `date` | string | Filter by date (`YYYY-MM-DD`) |
| `doctorId` | string | Filter by doctor ID |
| `status` | string | `"pending"`, `"seen"`, or `"missed"` |
| `search` | string | Search by patient name, phone number, or order number |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |

**Response:** `{ success, message, data: Appointment[], pagination }`

**Sorted:** Most recent first (`createdAt` descending).

```bash
# All appointments, page 1
GET /api/admin/appointments

# Filter by status + pagination
GET /api/admin/appointments?status=pending&page=1&limit=20

# Search by patient name
GET /api/admin/appointments?search=Aziz

# Filter by doctor and date
GET /api/admin/appointments?doctorId=661f1a...&date=2026-04-15
```

**Possible errors:** None — returns empty array with pagination if no results.

---

### 9. `PATCH /api/admin/appointments/:id/status` — Update Appointment Status

**Request body:**
```json
{
  "status": "seen"
}
```

**Allowed values:** `"seen"` or `"missed"` only.

**Response:** `{ success, message, data: Appointment }`

**Possible errors:**
| Status | When | Message |
|--------|------|---------|
| 400 | Status value is not "seen" or "missed" | `"Status must be either \"seen\" or \"missed\""` |
| 400 | Appointment is not "pending" | `"Cannot update status. Appointment is already \"seen\""` |
| 404 | Appointment doesn't exist | `"Appointment not found"` |

**⚠️ Status transitions are ONE-WAY:**
```
pending → seen    ✅
pending → missed  ✅
seen → anything   ❌ BLOCKED
missed → anything ❌ BLOCKED
```

---

### 10. `DELETE /api/admin/appointments/:id` — Delete Appointment

**Response:** `{ success, message }`

**Possible errors:**
| Status | When | Message |
|--------|------|---------|
| 404 | Appointment doesn't exist | `"Appointment not found"` |

---

### 11. `GET /api/health` — Health Check

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-04-12T17:00:00.000Z",
  "environment": "development"
}
```

---

## USER BOOKING FLOW (Step by Step)

This is the exact flow the frontend should implement:

```
Step 1: GET /api/doctors
        → Show doctor cards/list for user to select
        
Step 2: GET /api/appointments/availability?doctorId=SELECTED_ID
        → Show available dates in a calendar/date picker
        
Step 3: GET /api/appointments/availability?doctorId=SELECTED_ID&date=SELECTED_DATE
        → Show available time slots as buttons/chips
        
Step 4: POST /api/appointments
        → Collect personal info (name, age, phone) and submit
        → Show confirmation with orderNumber from response
```

---

## ADMIN FLOW

```
- GET /api/admin/appointments → Table with filters and pagination
- PATCH /:id/status          → Button to mark as "seen" or "missed"
- DELETE /:id                → Delete button with confirmation
- GET/POST/PATCH/DELETE /api/doctors → Full doctor CRUD panel
```

---

## ALL POSSIBLE HTTP STATUS CODES

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | GET, PATCH, DELETE success |
| 201 | Created | POST success (new doctor/appointment) |
| 400 | Bad Request | Validation error, business logic error, invalid ID |
| 403 | Forbidden | CORS blocked (origin not whitelisted) |
| 404 | Not Found | Resource doesn't exist, or route doesn't exist |
| 409 | Conflict | Double-booking (same doctor/date/time) |
| 429 | Too Many Requests | Rate limit exceeded (100 req/15 min) |
| 500 | Server Error | Unexpected server error |

---

## EDGE CASES & GOTCHAS FOR FRONTEND

### 1. Time slot format
All times are in **24-hour `HH:MM` format** (e.g. `"09:00"`, `"14:30"`). Never send `"2:30 PM"`.

### 2. Date format
All dates are **`YYYY-MM-DD`** (e.g. `"2026-04-15"`). Never send `"04/15/2026"` or `"15-04-2026"`.

### 3. Past dates are rejected
The backend validates that `selectedDate` is today or in the future. Submitting a past date returns 400.

### 4. Phone number format
Regex: `^\+?[\d\s-]{7,15}$`. Examples that work: `"+998901234567"`, `"901234567"`, `"+998 90 123-4567"`. Letters are NOT allowed.

### 5. Doctor schedule replaces entirely
When updating a doctor's schedule via PATCH, the new `weeklySchedule` **fully replaces** the old one. If you want to change only Monday, you must re-send all other days too.

### 6. `doctorId` in responses is an OBJECT, not a string
In appointment responses, `doctorId` is populated: `{ _id: "...", name: "...", specialization: "..." }`. When creating, send it as a plain string.

### 7. Rate limiting
100 requests per 15 minutes per IP. When exceeded, response is:
```json
{ "success": false, "message": "Too many requests. Please try again later." }
```
Status code: 429. The `Retry-After` header is included.

### 8. CORS
Your frontend origin MUST be in the backend's `CORS_ORIGINS` env var, or all requests from the browser will fail. Postman/curl bypass CORS.

### 9. Missed appointments free up time slots
When an appointment status is changed to `"missed"`, that time slot becomes available again for rebooking.

### 10. Order numbers are auto-generated
Don't send `orderNumber` when creating — it's auto-generated sequentially (`A101`, `A102`...). It's returned in the response.

### 11. Empty availability
- If a doctor has no schedule or doesn't work on the selected date, time slots return `[]` (empty array, not an error).
- If all slots are booked, same thing — empty array.

### 12. Can't delete doctor with pending appointments
The DELETE will return 400 with a clear message. Admin must first mark appointments as seen/missed or delete them.

### 13. Can't shrink schedule if appointments conflict
PATCH on doctor with a tighter schedule will return 400 listing every conflicting appointment.

### 14. Status updates are irreversible
Once marked `"seen"` or `"missed"`, you **cannot** change it back to pending or to the other status. The only option is to delete and rebook.

### 15. Validation errors have field-level detail
Use the `errors` array to show inline validation messages per field:
```json
{
  "errors": [
    { "field": "fullName", "message": "Full name is required" },
    { "field": "selectedDate", "message": "Cannot book appointments in the past" }
  ]
}
```

### 16. Search is case-insensitive
Admin search searches across `fullName`, `phoneNumber`, and `orderNumber` simultaneously. It's a partial match (contains), not exact.

### 17. MongoDB ObjectId format
All IDs are 24-character hex strings like `"661f1a2b3c4d5e6f7a8b9c0d"`. Sending anything else (e.g. a number) returns 400 `"Invalid ID format"`.
