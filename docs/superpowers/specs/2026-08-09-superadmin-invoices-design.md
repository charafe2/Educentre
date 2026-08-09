# Superadmin centre invoices and package plans

**Date:** 2026-08-09
**Status:** approved, not yet implemented

## Problem

The superadmin invoices page fails to load with *"Impossible de charger les factures
centres."* The cause is not a regression: the backend for it was never written.

`superadmin-invoices.component.ts` loads three endpoints in a `Promise.all`:

| Endpoint | Backend |
|---|---|
| `GET /v1/superadmin/invoices` | missing |
| `GET /v1/superadmin/centres` | exists |
| `GET /v1/superadmin/packages` | missing |

`Promise.all` rejects on the first 404, so all three results are discarded and the
component's `catch` — which takes no error binding — replaces the real status code
with a generic sentence. There are no invoice or package routes, controllers,
models, or migrations anywhere in the backend.

A wider audit found `/overview`, `/accounts` (and its CRUD), and centre
create/update/delete/toggle-status are also unimplemented. **Those are out of scope
here** and need their own specs; this document covers only what the invoices page
requires to work.

## Scope

In scope: `package_plans` and `centre_invoices` — schema, models, controllers,
routes, validation, serialization, tests. Plus one frontend change: removing the
`late` option from the invoice create form (see below).

Out of scope: the superadmin overview and accounts APIs, centre write endpoints,
Stripe/payment collection, PDF generation, emailing invoices to centres, and any
change to the existing `subscriptions` table.

## Placement

Follows the existing convention rather than introducing a new domain:

- Models → `app/Domains/Core/Models/` (beside `Centre` and `Subscription`)
- Controllers → `app/Domains/SuperAdmin/Controllers/` (beside `CentreController`)
- Requests → `app/Domains/SuperAdmin/Requests/`
- Resources → `app/Domains/SuperAdmin/Resources/`
- Routes → appended to `app/Domains/SuperAdmin/routes.php`

A separate `Billing` domain was considered and rejected: the routes must live under
the `superadmin` prefix regardless, which would split ownership of two models across
two domains for no gain. Extending `Finance` was also rejected — it is tenant-scoped
*student* payments, a different concept for a different audience, and it currently
holds uncommitted Stripe work.

## Data model

### `package_plans`

A catalogue of sellable plans. Global, not tenant-scoped.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint pk | |
| `uuid` | uuid unique | generated on create |
| `name` | string unique | |
| `monthly_price` | decimal(10,2) | |
| `users_limit` | unsigned int | |
| `students_limit` | unsigned int | |
| `storage_gb` | unsigned int | |
| `support_level` | string | `Standard` \| `Prioritaire` \| `Dédié` |
| `status` | string | `active` \| `draft` \| `archived` |
| `features` | json | array of strings |
| timestamps, soft deletes | | |

### `centre_invoices`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint pk | |
| `uuid` | uuid unique | generated on create |
| `invoice_number` | string unique | generated, see below |
| `centre_id` | fk → `centres` | restrict on delete |
| `package_plan_id` | fk → `package_plans` nullable | **null on delete** |
| `package_name` | string | snapshot, see below |
| `amount` | decimal(10,2) | |
| `issued_at` | date | |
| `due_date` | date | |
| `paid_at` | datetime nullable | |
| `status` | string | `pending` \| `paid` \| `cancelled` — never `late` |
| `notes` | text nullable | |
| timestamps, soft deletes | | |

**Why `package_name` is stored next to the foreign key.** The frontend contract
carries both `packagePlanId` and `packageName`. That is deliberate and is preserved:
the invoice records the plan's name *as it was when issued*, so renaming or deleting
a plan never rewrites accounting history. The foreign key is for linking; the string
is the record.

## Derived `late` status

`late` is never stored. `CentreInvoiceResource` reports it when an invoice is
`pending` and `due_date` is before today; otherwise it emits the stored value.

Chosen over a scheduled job because it cannot go stale and needs no cron. The
project's `bootstrap/app.php` schedule block is documented as only firing if
`artisan schedule:run` is wired into cron on the server, which it is not.

Consequence to accept: `late` cannot be filtered in SQL by status alone. A query for
late invoices must express `status = 'pending' AND due_date < today`. Given the
frontend filters client-side over the full list, this costs nothing today.

## Invoice numbering

Format `FAC-{YYYY}-{NNNN}`, e.g. `FAC-2026-0001`. The sequence restarts each
calendar year, based on `issued_at`.

Generated inside a transaction that locks the year's existing rows before taking
`max(sequence) + 1`. The unique index on `invoice_number` is the real guarantee —
the lock avoids collisions, the index makes them impossible.

## API

All routes join the existing `auth:sanctum` + `superadmin` group in
`SuperAdmin/routes.php`. Paths match what the frontend already calls.

| Method | Path | Purpose |
|---|---|---|
| GET | `/packages` | list, ordered by `monthly_price` |
| POST | `/packages` | create |
| PUT | `/packages/{id}` | update |
| DELETE | `/packages/{id}` | soft delete |
| GET | `/invoices` | list, newest first, centre + plan eager-loaded |
| POST | `/invoices` | create; number generated server-side |
| POST | `/invoices/{id}/mark-paid` | sets `status=paid`, `paid_at=now()` |
| DELETE | `/invoices/{id}` | soft delete |

Responses use the existing `ApiResponse` trait envelope (`{success, data}`).

### Serialization

`PackagePlanResource` and `CentreInvoiceResource` emit camelCase matching the
TypeScript interfaces exactly — `invoiceNumber`, `centreId`, `centreName`, `city`,
`packagePlanId`, `packageName`, `issuedAt`, `dueDate`, `paidAt`. `centreName` and
`city` come from the related `Centre`; `amount` and `monthlyPrice` are cast to float
so the frontend's arithmetic (`reduce((sum, i) => sum + i.amount, 0)`) works without
string coercion.

### Validation

FormRequests following the Finance domain's convention:

- `StorePackagePlanRequest` / `UpdatePackagePlanRequest` — `name` required and
  unique (ignoring self on update), limits are integers ≥ 0, `support_level` and
  `status` constrained to their enumerations, `features` an array of strings.
- `StoreCentreInvoiceRequest` — `centreId` must exist, `packagePlanId` nullable and
  must exist when present, `amount` numeric ≥ 0, `dueDate` on or after `issuedAt`,
  `status` one of `pending|paid|cancelled` (**`late` is rejected**, since it is
  derived).

### The `late` option must leave the create form

`superadmin-invoices.component.html:45` currently offers `<option value="late">En
retard</option>`. With `late` derived, it is not a value anyone can choose — an
invoice is late because its due date passed, not because someone said so. Sending it
would 422 against the validation above.

That option is removed from the create form as part of this work. `late` continues to
appear everywhere invoices are *displayed* — the status column, the filters, the
totals — because the resource still emits it. Only the input is constrained.

This is the one frontend change in scope. It is required for the API and the UI to
agree, so it is not deferred.

## Testing

Feature tests per endpoint: list, create, update, delete, mark-paid, plus
authorization (a tenant user must not reach these routes).

Unit-level coverage for the two pieces of real logic:

1. **Numbering** — sequence increments within a year and restarts at `0001` when
   `issued_at` crosses into a new year.
2. **Derived status** — a `pending` invoice due yesterday serializes as `late`; one
   due today or tomorrow stays `pending`; a `paid` invoice past its due date stays
   `paid`.

Requires a new `SuperAdminFactory` (the model uses `HasFactory` but no factory
exists).

**Known risk.** Sanctum's fallback guard is `web`, backed by the users provider, so
`actingAs($superAdmin)` may not authenticate in tests. If it fails, tests will
authenticate with a real issued token instead. This is a testing-mechanics problem,
not a design one, but it may cost time.

## Out of scope, worth doing separately

`superadmin-invoices.component.ts:42` catches with no error binding, so a 404, a 500
and an expired session all render the same sentence. That is why this failure looked
mysterious. Capturing and logging the error is a small change that would have made
this diagnosable in seconds, and the same pattern likely exists on the other
superadmin pages.
