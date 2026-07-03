# Category CRUD — Update + Delete (Backend) — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Complete the `category` domain by adding Update (`PATCH /api/categories/:id`) and Delete (`DELETE /api/categories/:id`). Delete is blocked with `409` when the category is referenced by any Service.

**Scope:** Backend only. Frontend (edit modal, delete action, i18n) is a separate follow-up.

## Design decisions (already settled)

- **Delete is guarded, not cascading.** If any `Service` references the category, throw `ConflictError` → `409`. Otherwise delete.
- **Update keeps `name`/`slug` independent** — no slug auto-generation. Both optional on update.
- **No dup-key handling in services** — the global `errorHandler` already maps Mongo `E11000` → `409` and `CastError` → `400`. Don't duplicate it.
- **No get-by-id endpoint** (YAGNI — list covers the frontend).
- `update`/`delete` use `requireAuth`, matching `create`.

## Global constraints

- TypeScript `strict`; `npm run lint` (`tsc --noEmit`) must pass with zero errors.
- Naming: `*.controller.ts`, `*.service.ts`, `*.routes.ts` (existing singular convention).
- Responses via `sendResponse`; errors via `AppError` factories (`NotFoundError`, `ConflictError`) — never `res.status().json()` in services.
- Read env through the `env` object, never `process.env`.

---

## Task 1 — Service methods

`src/services/category.service.ts`

- [ ] Import `Service` from `../models/Service` and `NotFoundError`, `ConflictError` from `../utils/AppError`.
- [ ] `updateCategory(id: string, data: { name?: string; slug?: string }): Promise<ICategory>`
  - `Category.findByIdAndUpdate(id, data, { new: true, runValidators: true })`
  - throw `NotFoundError('Category not found')` if result is null.
- [ ] `deleteCategory(id: string): Promise<void>`
  - `if (await Service.exists({ category: id }))` → throw `ConflictError('Cannot delete: category is in use by one or more services')`.
  - else `const deleted = await Category.findByIdAndDelete(id)`; throw `NotFoundError('Category not found')` if null.

Commit: `feat(category): add update and delete service methods with referential guard`

## Task 2 — Controllers

`src/controllers/category.controller.ts`

- [ ] `updateCategory` (asyncHandler): `id` from `req.params`, `{ name, slug }` from body → `categoryService.updateCategory` → `sendResponse` (200, `'Category updated successfully'`).
- [ ] `deleteCategory` (asyncHandler): `id` from `req.params` → `categoryService.deleteCategory` → `sendResponse` (200, `'Category deleted successfully'`).

Commit: `feat(category): add update and delete controllers`

## Task 3 — Validators

`src/middlewares/validators.ts`

- [ ] Add `categoryValidators.update`: `name` optional (2–120), `slug` optional (length + existing slug pattern) — same rules as `create` but nothing required.
- [ ] Add an `:id` param check — `param('id').isMongoId().withMessage('Invalid category ID format')` (inline in routes, or a small shared `mongoIdParam` helper if one doesn't already exist). Belt-and-suspenders over the global `CastError` handling.

Commit: `feat(category): add update + id-param validators`

## Task 4 — Routes + Swagger

`src/routes/category.routes.ts`

- [ ] `PATCH /:id` → `requireAuth`, id-param check, `categoryValidators.update`, `validate`, `updateCategory`.
- [ ] `DELETE /:id` → `requireAuth`, id-param check, `validate`, `deleteCategory`.
- [ ] Inline Swagger JSDoc for both, mirroring existing blocks. Document `404` (not found) and, for delete, `409` (in use).

Commit: `feat(category): wire update + delete routes with swagger docs`

## Task 5 — Verify

- [ ] `npm run lint` passes clean.
- [ ] Manual/smoke check the flow: create → update (200) → delete non-referenced (200). Create a category, attach a service, attempt delete → expect `409`. Update/delete a bad id → `404`.

---

**Out of scope:** get-by-id, soft-delete, cascade, slug auto-generation, all frontend work.
