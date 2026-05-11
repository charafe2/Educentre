# 🚀 `RULES.md` — Modern SaaS ERP Architecture Guide (2026 Edition)

# 🏫 Project Overview

Build a production-grade multi-tenant SaaS ERP for tutoring centers and schools.

Platform goals:

* Massive scalability
* Strong tenant isolation
* Modular architecture
* Enterprise-grade maintainability
* Real-time operations
* High performance under concurrent usage
* Clean developer experience

---

# 🧠 Core Architecture Philosophy

## 1. Tenant-First Architecture

Every request, query, websocket event, cache entry, notification, and file must belong to a tenant.

A tenant = one tutoring center/school.

Cross-tenant leakage is a CRITICAL FAILURE.

---

## 2. Domain-Driven Modular Structure

The application is split into business domains.

Each domain owns:

* Controllers
* Services
* Repositories
* DTOs
* Requests
* Policies
* Events
* Notifications
* Routes
* Tests

Example:

```txt
app/
 ├── Domains/
 │    ├── Students/
 │    ├── Finance/
 │    ├── Planning/
 │    ├── Communication/
 │    ├── Auth/
 │    ├── Notifications/
 │    ├── Academic/
```

---

# 🧱 Modern Tech Stack (2026)

## Frontend

* Angular 19+
* Angular Signals
* Angular Material 3
* RxJS
* NgRx Signal Store
* Standalone Components
* TanStack Query (Angular Query)
* ngx-translate
* Full lazy loading
* PWA enabled

---

## Backend

* Laravel 12+
* PHP 8.4+
* PostgreSQL 16+
* Redis
* Laravel Horizon
* Laravel Reverb (WebSockets)
* Laravel Sanctum
* Laravel Pulse
* Laravel Pennant (Feature flags)
* Laravel Scout (optional search)
* Spatie Permission
* Spatie Media Library
* Laravel Precognition

---

## Infrastructure

* Docker
* Nginx
* PostgreSQL
* Redis
* MinIO / S3
* Queue workers
* Supervisor
* CI/CD (GitHub Actions)

---

# 🏗️ Backend Folder Architecture

```txt
app/
 ├── Domains/
 │    ├── Students/
 │    │    ├── Actions/
 │    │    ├── DTOs/
 │    │    ├── Events/
 │    │    ├── Exceptions/
 │    │    ├── Models/
 │    │    ├── Notifications/
 │    │    ├── Policies/
 │    │    ├── Repositories/
 │    │    ├── Requests/
 │    │    ├── Resources/
 │    │    ├── Services/
 │    │    ├── Traits/
 │    │    └── routes.php
```

---

# 🛡️ Multi-Tenancy Implementation Guide

# 1. Database Strategy

Use:

## Shared Database + tenant_id

Every business table MUST contain:

```sql
tenant_id BIGINT NOT NULL
```

Example:

```sql
students
teachers
payments
sessions
notifications
```

---

# 2. Tenant Resolution

Tenant extracted from:

```txt
/:tenant/dashboard
```

Example:

```txt
/minassa/students
```

Laravel Middleware:

```php
ResolveTenantMiddleware
```

Responsibilities:

* Validate tenant exists
* Store tenant in container
* Attach tenant globally
* Prevent spoofing

---

# 3. Global Tenant Scope

Every tenant-aware model MUST use:

```php
TenantScope
```

Example:

```php
protected static function booted()
{
    static::addGlobalScope(new TenantScope);
}
```

---

# 4. Auto tenant_id Injection

During creation:

```php
$model->tenant_id = tenant()->id;
```

NEVER trust frontend tenant_id.

---

# 🧬 Database Architecture Guide

# Core Rules

## IDs

Use:

```sql
BIGINT GENERATED ALWAYS AS IDENTITY
```

Avoid SERIAL in modern PostgreSQL.

---

# Timestamp Convention

Every table:

```sql
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
deleted_at TIMESTAMPTZ NULL
```

Use soft deletes for recoverability.

---

# UUID Public IDs

Expose UUIDs publicly.

Internal DB:

```sql
id BIGINT
```

Public:

```sql
uuid UUID UNIQUE
```

Avoid exposing sequential IDs.

---

# Recommended PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

---

# 📚 Schema-by-Schema Backend Guide

# 👥 USERS

## Tables

```txt
users
user_profiles
user_preferences
user_sessions
user_2fa
user_privacy_settings
```

---

# Users Table

Purpose:

Authentication identity.

Rules:

* Email unique globally
* tenant_id mandatory
* Passwords hashed using Argon2id

Recommended additions:

```sql
last_login_at
avatar_url
status
email_verified_at
```

Indexes:

```sql
INDEX(tenant_id, email)
INDEX(status)
```

---

# 👨‍🎓 STUDENTS DOMAIN

## Tables

```txt
students
parents
enrollments
attendance
grades
```

---

# Students Rules

Use:

```sql
current_school
school_level
birth_date
status
medical_notes
emergency_contact
```

Soft delete students instead of hard delete.

---

# Enrollments

This table is critical.

Acts as pivot between:

```txt
students <-> classes
```

Add constraints:

```sql
UNIQUE(student_id, class_id)
```

Prevent duplicates.

---

# Attendance Rules

## Recommended Status Enum

```txt
present
absent
late
excused
```

---

# Prevent Duplicate Attendance

```sql
UNIQUE(session_id, student_id)
```

---

# 👨‍🏫 TEACHERS DOMAIN

## Teacher Payroll Logic

Current schema is good.

Recommended improvements:

### Add payroll_snapshots

Never recalculate old payroll dynamically.

Store immutable monthly payroll snapshots.

---

# Suggested Payroll Flow

```txt
sessions completed
→ student count computed
→ bonuses computed
→ payroll snapshot generated
→ invoice generated
→ payment processed
```

---

# 📅 PLANNING DOMAIN

## Tables

```txt
rooms
classes
sessions
```

---

# CRITICAL RULE

Prevent overlapping sessions.

Use PostgreSQL exclusion constraints.

Example:

```sql
EXCLUDE USING gist (
    teacher_id WITH =,
    tstzrange(start_at, end_at) WITH &&
)
```

Same for rooms.

---

# Sessions

Recommended columns:

```sql
start_at
end_at
status
meeting_url
is_online
```

---

# 💳 FINANCE DOMAIN

## Tables

```txt
student_payments
teacher_payroll
invoices
subscriptions
expenses
```

---

# Financial Rules

## NEVER MODIFY PAID RECORDS

Instead:

* Create adjustment rows
* Use audit logs

---

# Payment Status Enum

```txt
pending
paid
failed
overdue
cancelled
refunded
```

---

# Recommended Additions

## expenses

```txt
rent
utilities
marketing
teacher_salary
equipment
```

---

# Audit Trail

Every finance mutation MUST be logged.

Table:

```txt
audit_logs
```

---

# 📩 NOTIFICATIONS DOMAIN

## Architecture

Use event-driven notifications.

Example:

```txt
PaymentReceived
StudentEnrolled
SessionCancelled
SubscriptionExpiring
```

---

# Queue EVERYTHING

Notifications MUST implement:

```php
ShouldQueue
```

---

# Channels

```txt
email
sms
whatsapp
push
in_app
```

---

# Recommended Tables

```txt
notifications
notification_logs
notification_templates
```

---

# 🔌 WEBHOOKS DOMAIN

## Required Table

```txt
webhook_logs
```

Columns:

```txt
provider
event_type
payload
signature
status
processed_at
```

---

# Security Rules

## MUST HAVE

* Signature verification
* Replay attack protection
* Idempotency keys
* Rate limiting

---

# ⚡ Real-Time Architecture

Use:

```txt
Laravel Reverb
Laravel Echo
Redis
```

Events:

```txt
NewPaymentReceived
NewStudentEnrollment
TeacherAssigned
SessionStarted
```

---

# 📊 Analytics & Reporting

Recommended:

## Materialized Views

For heavy dashboards.

Example:

```txt
monthly_revenue
attendance_rates
teacher_profitability
student_retention
```

Refresh asynchronously.

---

# 🧠 Caching Strategy

Use Redis aggressively.

Cache:

* Dashboard stats
* Tenant config
* Permissions
* Feature flags

---

# Cache Keys

Always tenant scoped.

Example:

```txt
tenant:5:dashboard:stats
```

---

# 🔐 Security Rules

# Authentication

Use:

```txt
Laravel Sanctum
```

---

# Password Rules

Mandatory:

* Minimum 12 chars
* Password breach detection
* MFA support

---

# Authorization

Backend ALWAYS validates RBAC.

Never trust frontend.

Use:

```txt
Policies
Gates
Spatie Permissions
```

---

# API Architecture

# Versioning

```txt
/api/v1/
```

---

# Standard Response

```json
{
  "success": true,
  "data": {},
  "message": "",
  "errors": null
}
```

---

# Example Controller

Controllers MUST remain thin.

```php
public function store(StoreStudentRequest $request)
{
    return StudentResource::make(
        $this->studentService->create($request->validated())
    );
}
```

---

# NEVER DO

```php
DB::table(...)
```

inside controllers.

---

# 🧪 Testing Requirements

# Mandatory Tests

## Feature Tests

* Auth
* RBAC
* Tenant isolation
* API validation

---

## Unit Tests

* Services
* Payroll calculations
* Planning conflict detection

---

## Browser/E2E

Use:

```txt
Playwright
```

---

# 🚀 Performance Rules

# MUST

## Backend

* Eager loading
* Queue heavy jobs
* Use chunking
* Use cursor pagination

---

## Frontend

* Lazy loading
* OnPush
* Signals
* Virtual scrolling

---

# 🧩 Angular Architecture Rules

# Feature Structure

```txt
features/
 ├── students/
 │    ├── pages/
 │    ├── components/
 │    ├── services/
 │    ├── store/
 │    ├── resolvers/
 │    ├── guards/
 │    ├── models/
```

---

# State Management

Use:

```txt
Signals + Signal Store
```

Avoid bloated NgRx reducers.

---

# Smart vs Dumb Components

## Smart

* Fetch data
* Interact with services

## Dumb

* Pure presentation
* Inputs/Outputs only

---

# 🎨 UI/UX Standards

# Design Principles

* Dense dashboards
* Minimal clicks
* Fast workflows
* Keyboard friendly
* Responsive

---

# Mandatory UX

* Skeleton loaders
* Optimistic updates
* Snackbar feedback
* Empty states
* Error boundaries

---

# 🌍 Internationalization

Mandatory:

```txt
Arabic
French
English
```

Use:

```txt
ngx-translate
```

RTL support mandatory.

---

# 📦 DevOps Standards

# Dockerized Services

```txt
nginx
php-fpm
postgres
redis
queue-worker
reverb
```

---

# CI/CD

GitHub Actions:

* Tests
* Lint
* Static analysis
* Security scanning
* Build pipeline

---

# 📈 Observability

Use:

```txt
Laravel Pulse
Sentry
OpenTelemetry
```

---

# Monitor

* Slow queries
* Queue failures
* Tenant errors
* Webhook failures
* API latency

---

# ❌ Forbidden Anti-Patterns

## Backend

❌ Fat controllers
❌ Missing tenant scope
❌ Business logic in models
❌ Raw SQL everywhere
❌ Synchronous notifications
❌ Shared mutable financial records

---

## Frontend

❌ Business logic in components
❌ Hardcoded routes
❌ Eager-loaded modules
❌ Direct HTTP calls in components
❌ any in TypeScript

---

# ✅ Definition of Done

A feature is COMPLETE only if:

## Backend

* Validation implemented
* RBAC enforced
* Tenant isolation verified
* Tests written
* Queues used
* Logs added

---

## Frontend

* Lazy loaded
* Responsive
* Accessible
* Uses Angular Material
* Uses guards/resolvers
* Handles loading/errors

---

## Infrastructure

* Metrics exposed
* Queue monitored
* Errors observable
* Cache strategy applied

