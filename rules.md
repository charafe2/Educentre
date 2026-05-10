🚀 Project Rules – SaaS ERP (Angular + Laravel)
🧠 General Principles

Build a multi-tenant SaaS ERP for Tutoring Centers.

Code-First Architecture: Clean, scalable, production-ready.
Strict Isolation: School A must NEVER access School B data.
High Performance: Optimize for concurrency (peak: registrations, payments).
Modular Design: Each feature is isolated (frontend + backend).
🧱 Tech Stack
Frontend: Angular (latest), Angular Material, RxJS, Lodash
Backend: Laravel (latest), PHP 8.x, Sanctum (Auth), Redis (Queues & Cache)
Infrastructure: PostgreSQL, Laravel Queues
UI Assets: Roboto Font, Google Material Icons
📁 Frontend Architecture
src/app/
 ├── core/          (auth, interceptors, guards, tenant context)
 ├── shared/        (UI components, pipes, services)
 ├── features/
 │    ├── public/         (landing, marketing)
 │    ├── dashboard/
 │    ├── students/
 │    ├── planning/
 │    ├── finance/
 │    ├── communication/
 │    ├── settings/
 │    ├── layout/         (main shell)
🚦 Routing System (CRITICAL)
🧠 Principles
Tenant-first routing: URL defines tenant context
Lazy loading ONLY: Every feature module must be lazy-loaded
Guard everything: Auth + Tenant + Role
No logic in components: Routing handles access control
Scalable URL structure
🌍 Global Routing Structure
/                  → Public pages
/auth              → Authentication
/:tenant/...       → SaaS App (tenant scoped)

Example:

/minassa/dashboard
/minassa/students
📌 App Routing Rules
1. Public Routes
No authentication required
Marketing pages, landing pages
2. Auth Routes
Login, Register, Password reset
Must NOT be accessible if already authenticated
3. Tenant Routes (MAIN APP)

All business features MUST be under:

/:tenant/

✔ Enforced via TenantGuard
✔ Prevents cross-tenant access
✔ Sets tenant context globally

🏫 Tenant Context Handling
Extract tenant from URL (:tenant)
Store it in a TenantService
Attach tenant to:
All API requests (headers or subdomain logic)
WebSocket connections
Reject invalid tenants immediately
🛡️ Route Guards (MANDATORY)
🔐 AuthGuard
Blocks unauthenticated users
Redirect → /auth/login
🏫 TenantGuard (CRITICAL)

Responsibilities:

Validate tenant existence
Set tenant context
Prevent URL tampering
👤 RoleGuard (RBAC)

Roles:

SuperAdmin
SchoolAdmin
Teacher
Parent

Rules:

Access defined via route metadata
Unauthorized → redirect to dashboard
🧩 Layout Routing (Shell Architecture)
Use a MainLayoutComponent
Contains:
Sidebar
Navbar
Router outlet

All protected routes live inside this layout.

📦 Feature Module Routing

Each feature must:

Have its own routing module
Be lazy-loaded
Define child routes internally

Example structure:

students/
 ├── students.module.ts
 ├── students-routing.module.ts
🔄 Route Resolvers (REQUIRED for heavy pages)

Use resolvers to:

Preload critical data before rendering
Avoid empty UI states

Examples:

Student Profile
Dashboard stats
Session details
⚡ Performance Rules
Lazy load ALL modules
Use PreloadAllModules strategy
Use ChangeDetectionStrategy.OnPush
Avoid unnecessary route re-renders
🔁 Navigation Rules
Always include tenant in navigation:
this.router.navigate([tenant, 'students']);
NEVER hardcode routes without tenant
❌ Routing Anti-Patterns (FORBIDDEN)
❌ Accessing routes without tenant context
❌ Hardcoded URLs (/students instead of /:tenant/students)
❌ Role logic inside components
❌ Eager-loaded feature modules
❌ Fetching critical data inside ngOnInit instead of resolvers
🔔 Communication & Notifications
Use a centralized NotificationService (Angular)
Backend:
ALL notifications MUST be queued (ShouldQueue)
Channels:
SMS
Email
WhatsApp
⚡ Real-Time
Use Laravel Echo + WebSockets (Pusher/Reverb)
Example:
"New student enrolled"
"Payment received"
🔌 Webhooks Handling
Incoming Webhooks
Use WebhookController
Requirements:
✅ Idempotency keys (avoid duplicates)
✅ Signature verification (security)
✅ Validation before processing
✅ Store logs in webhook_logs
📅 Academic & School Logic
Planning & Sessions
Prevent overlapping sessions (teacher/room)
Attendance:
One-click check-in/out
Auto "Absent" if not checked in
💳 Subscriptions
Tier: 399 MAD/month
Lifecycle:
Auto reminder (3 days before expiry)
Grace period handling
🎨 UI & UX
Design System

Colors:

#546B41
#99AD7A
#DCCCAC
#FFF8EC
High data density (tables)
Clean dashboards
Components
Advanced Data Tables (filters, search)
Interactive Calendar (planning)
Centralized Toast/Snackbar system
🛡️ Security & Multi-Tenancy
Every model MUST include:
tenant_id
Apply Global Scope (TenantScope)
Backend Rules
Use FormRequest validation
No direct DB queries in controllers
Use Services/Repositories
API Protection
Rate limiting (anti-bruteforce)
Secure endpoints (Sanctum)
RBAC Enforcement
Backend MUST validate roles (not only frontend)
🔌 API Rules
Standard Response Format
{
  "success": true,
  "data": {},
  "message": "",
  "errors": null
}
Standard Endpoints
/api/v1/attendance
/api/v1/sessions
/api/v1/notifications
/api/v1/webhooks/{provider}
🧪 Code Quality & Performance
No any in TypeScript
Use Interfaces everywhere
Lazy loading mandatory
Use OnPush strategy
Documentation
Maintain README for:
Webhooks payloads
API contracts
⚠️ Anti-Patterns (FORBIDDEN)
❌ Business logic in Angular components
❌ Direct DB queries in controllers
❌ Missing tenant_id
❌ Blocking operations
❌ Hardcoded translations (use i18n)
✅ Definition of Done

A feature is complete ONLY if:

Frontend
Angular Material used
Responsive UI
Routing + Guards applied
Backend
Validation implemented
Tenant scope enforced
Communication
Notifications queued
Webhooks tested (if applicable)
Observability
Errors logged
User feedback handled (toasts)