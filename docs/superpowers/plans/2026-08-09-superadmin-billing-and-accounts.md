# Superadmin Billing and Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the missing backend for the superadmin invoices, packages and accounts pages, which currently all fail with "Impossible de charger…" because no routes, controllers, models or migrations exist for them.

**Architecture:** Follows the existing SuperAdmin domain layout — models in `app/Domains/Core/Models/`, controllers/requests/resources/services in `app/Domains/SuperAdmin/`, routes appended to `app/Domains/SuperAdmin/routes.php` inside the existing `auth:sanctum` + `superadmin` group. Responses use the `ApiResponse` trait envelope and Resources that emit camelCase matching the TypeScript interfaces exactly.

**Tech Stack:** Laravel 12, PHP 8.4, PostgreSQL (production) / SQLite in-memory (tests), PHPUnit.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-09-superadmin-invoices-design.md`.
- All request payload keys are **camelCase** (the frontend sends camelCase); all response keys are **camelCase**. Database columns stay snake_case.
- Responses use the `ApiResponse` trait: `$this->success(data: …)` / `$this->error(message: …, code: …)`.
- Money fields serialize as **float**, not string — the frontend does `reduce((sum, i) => sum + i.amount, 0)`.
- Invoice `status` stored values are only `pending`, `paid`, `cancelled`. **`late` is never stored** — it is derived on read.
- `GET /superadmins` must keep its existing `{name, email, role}` shape. The tickets assignee dropdown depends on it.
- Every task ends with tests passing and a commit.
- Run tests with: `cd backend && php artisan test --filter=<TestName>`

---

### Task 1: Superadmin test harness

Everything else needs a way to authenticate as a superadmin in tests. `SuperAdmin` uses `HasFactory` but no factory exists. This task also settles the open risk from the spec — whether `actingAs()` works against the `auth:sanctum` + `superadmin` middleware — before any feature code depends on it.

**Files:**
- Create: `backend/database/factories/SuperAdminFactory.php`
- Create: `backend/tests/Feature/SuperAdmin/SuperAdminAuthHarnessTest.php`

**Interfaces:**
- Consumes: nothing.
- Produces: `SuperAdmin::factory()->create()` and the authentication pattern every later task's tests use — `$this->actingAs($superAdmin, 'sanctum')`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\SuperAdmin;

use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminAuthHarnessTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_superadmin_can_reach_a_protected_superadmin_route(): void
    {
        $superAdmin = SuperAdmin::factory()->create();

        $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/v1/superadmin/superadmins')
            ->assertOk();
    }

    public function test_a_tenant_user_is_refused(): void
    {
        $user = \App\Models\User::factory()
            ->for(\App\Models\Tenant::factory())
            ->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/superadmin/superadmins')
            ->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php artisan test --filter=SuperAdminAuthHarnessTest`
Expected: FAIL — no factory is defined for `App\Models\SuperAdmin`.

- [ ] **Step 3: Write the factory**

```php
<?php

namespace Database\Factories;

use App\Models\SuperAdmin;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/** @extends Factory<SuperAdmin> */
class SuperAdminFactory extends Factory
{
    protected $model = SuperAdmin::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'password' => Hash::make('password'),
        ];
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && php artisan test --filter=SuperAdminAuthHarnessTest`
Expected: PASS, both tests.

**If `test_a_superadmin_can_reach_a_protected_superadmin_route` still fails with 401**, Sanctum is rejecting the SuperAdmin model against its configured provider. Fix it by authenticating with a real token instead, and use this pattern in every later test in place of `actingAs`:

```php
$token = $superAdmin->createToken('test')->plainTextToken;
$this->withHeader('Authorization', "Bearer {$token}")
    ->getJson('/api/v1/superadmin/superadmins')
    ->assertOk();
```

- [ ] **Step 5: Commit**

```bash
git add backend/database/factories/SuperAdminFactory.php backend/tests/Feature/SuperAdmin/SuperAdminAuthHarnessTest.php
git commit -m "test: add a SuperAdmin factory and authentication harness"
```

---

### Task 2: Package plans

**Files:**
- Create: `backend/database/migrations/2026_08_09_000001_create_package_plans_table.php`
- Create: `backend/app/Domains/Core/Models/PackagePlan.php`
- Create: `backend/app/Domains/SuperAdmin/Resources/PackagePlanResource.php`
- Create: `backend/app/Domains/SuperAdmin/Requests/StorePackagePlanRequest.php`
- Create: `backend/app/Domains/SuperAdmin/Requests/UpdatePackagePlanRequest.php`
- Create: `backend/app/Domains/SuperAdmin/Controllers/PackagePlanController.php`
- Modify: `backend/app/Domains/SuperAdmin/routes.php`
- Create: `backend/tests/Feature/SuperAdmin/PackagePlanApiTest.php`

**Interfaces:**
- Consumes: `SuperAdmin::factory()` (Task 1).
- Produces: `App\Domains\Core\Models\PackagePlan` with `$fillable` `['uuid','name','monthly_price','users_limit','students_limit','storage_gb','support_level','status','features']`, `features` cast to `array`, `monthly_price` cast to `decimal:2`, soft deletes. Task 3 references `package_plans.id` as a foreign key.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Core\Models\PackagePlan;
use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PackagePlanApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): SuperAdmin
    {
        return SuperAdmin::factory()->create();
    }

    public function test_it_lists_plans_ordered_by_price(): void
    {
        PackagePlan::create([
            'name' => 'Pro', 'monthly_price' => 499, 'users_limit' => 10,
            'students_limit' => 500, 'storage_gb' => 20,
            'support_level' => 'Prioritaire', 'status' => 'active', 'features' => ['A'],
        ]);
        PackagePlan::create([
            'name' => 'Starter', 'monthly_price' => 199, 'users_limit' => 3,
            'students_limit' => 100, 'storage_gb' => 5,
            'support_level' => 'Standard', 'status' => 'active', 'features' => [],
        ]);

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/packages')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Starter')
            ->assertJsonPath('data.1.name', 'Pro');

        // Money must be a number, not a string — the frontend sums these.
        $this->assertIsFloat($response->json('data.0.monthlyPrice'));
    }

    public function test_it_creates_a_plan(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/packages', [
                'name' => 'Entreprise',
                'monthlyPrice' => 1299,
                'usersLimit' => 50,
                'studentsLimit' => 5000,
                'storageGb' => 200,
                'supportLevel' => 'Dédié',
                'status' => 'active',
                'features' => ['SLA', 'API'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Entreprise')
            ->assertJsonPath('data.features.1', 'API');

        $this->assertDatabaseHas('package_plans', ['name' => 'Entreprise']);
    }

    public function test_it_rejects_a_duplicate_name(): void
    {
        PackagePlan::create([
            'name' => 'Pro', 'monthly_price' => 499, 'users_limit' => 10,
            'students_limit' => 500, 'storage_gb' => 20,
            'support_level' => 'Standard', 'status' => 'active', 'features' => [],
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/packages', [
                'name' => 'Pro', 'monthlyPrice' => 100, 'usersLimit' => 1,
                'studentsLimit' => 1, 'storageGb' => 1,
                'supportLevel' => 'Standard', 'status' => 'draft', 'features' => [],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_it_updates_and_deletes_a_plan(): void
    {
        $plan = PackagePlan::create([
            'name' => 'Pro', 'monthly_price' => 499, 'users_limit' => 10,
            'students_limit' => 500, 'storage_gb' => 20,
            'support_level' => 'Standard', 'status' => 'active', 'features' => [],
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->putJson("/api/v1/superadmin/packages/{$plan->id}", [
                'name' => 'Pro Plus', 'monthlyPrice' => 599, 'usersLimit' => 20,
                'studentsLimit' => 800, 'storageGb' => 50,
                'supportLevel' => 'Prioritaire', 'status' => 'active', 'features' => ['X'],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Pro Plus');

        $this->actingAs($this->admin(), 'sanctum')
            ->deleteJson("/api/v1/superadmin/packages/{$plan->id}")
            ->assertOk();

        $this->assertSoftDeleted('package_plans', ['id' => $plan->id]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php artisan test --filter=PackagePlanApiTest`
Expected: FAIL — class `App\Domains\Core\Models\PackagePlan` not found.

- [ ] **Step 3: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('package_plans', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name')->unique();
            $table->decimal('monthly_price', 10, 2)->default(0);
            $table->unsignedInteger('users_limit')->default(0);
            $table->unsignedInteger('students_limit')->default(0);
            $table->unsignedInteger('storage_gb')->default(0);
            $table->string('support_level')->default('Standard');
            $table->string('status')->default('draft');
            $table->json('features')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_plans');
    }
};
```

- [ ] **Step 4: Write the model**

```php
<?php

namespace App\Domains\Core\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PackagePlan extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid', 'name', 'monthly_price', 'users_limit',
        'students_limit', 'storage_gb', 'support_level', 'status', 'features',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
        'features' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $plan) {
            if (empty($plan->uuid)) {
                $plan->uuid = (string) Str::uuid();
            }
        });
    }
}
```

- [ ] **Step 5: Write the resource**

```php
<?php

namespace App\Domains\SuperAdmin\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PackagePlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            // Cast to float: the frontend does arithmetic on this.
            'monthlyPrice' => (float) $this->monthly_price,
            'usersLimit' => (int) $this->users_limit,
            'studentsLimit' => (int) $this->students_limit,
            'storageGb' => (int) $this->storage_gb,
            'supportLevel' => $this->support_level,
            'status' => $this->status,
            'features' => $this->features ?? [],
        ];
    }
}
```

- [ ] **Step 6: Write the two FormRequests**

`StorePackagePlanRequest.php`:

```php
<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePackagePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('package_plans', 'name')->whereNull('deleted_at')],
            'monthlyPrice' => ['required', 'numeric', 'min:0'],
            'usersLimit' => ['required', 'integer', 'min:0'],
            'studentsLimit' => ['required', 'integer', 'min:0'],
            'storageGb' => ['required', 'integer', 'min:0'],
            'supportLevel' => ['required', Rule::in(['Standard', 'Prioritaire', 'Dédié'])],
            'status' => ['required', Rule::in(['active', 'draft', 'archived'])],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:120'],
        ];
    }
}
```

`UpdatePackagePlanRequest.php` — identical, except the `name` rule ignores the record being edited:

```php
<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePackagePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required', 'string', 'max:120',
                Rule::unique('package_plans', 'name')
                    ->ignore($this->route('id'))
                    ->whereNull('deleted_at'),
            ],
            'monthlyPrice' => ['required', 'numeric', 'min:0'],
            'usersLimit' => ['required', 'integer', 'min:0'],
            'studentsLimit' => ['required', 'integer', 'min:0'],
            'storageGb' => ['required', 'integer', 'min:0'],
            'supportLevel' => ['required', Rule::in(['Standard', 'Prioritaire', 'Dédié'])],
            'status' => ['required', Rule::in(['active', 'draft', 'archived'])],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:120'],
        ];
    }
}
```

- [ ] **Step 7: Write the controller**

```php
<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\PackagePlan;
use App\Domains\SuperAdmin\Requests\StorePackagePlanRequest;
use App\Domains\SuperAdmin\Requests\UpdatePackagePlanRequest;
use App\Domains\SuperAdmin\Resources\PackagePlanResource;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class PackagePlanController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $plans = PackagePlan::orderBy('monthly_price')->get();

        return $this->success(data: PackagePlanResource::collection($plans));
    }

    public function store(StorePackagePlanRequest $request): JsonResponse
    {
        $plan = PackagePlan::create($this->attributes($request->validated()));

        return $this->success(
            data: PackagePlanResource::make($plan),
            message: 'Package créé.',
            code: 201,
        );
    }

    public function update(UpdatePackagePlanRequest $request, int $id): JsonResponse
    {
        $plan = PackagePlan::findOrFail($id);
        $plan->update($this->attributes($request->validated()));

        return $this->success(
            data: PackagePlanResource::make($plan->fresh()),
            message: 'Package mis à jour.',
        );
    }

    public function destroy(int $id): JsonResponse
    {
        PackagePlan::findOrFail($id)->delete();

        return $this->success(message: 'Package supprimé.');
    }

    /** Maps the camelCase payload onto snake_case columns. */
    private function attributes(array $validated): array
    {
        return [
            'name' => $validated['name'],
            'monthly_price' => $validated['monthlyPrice'],
            'users_limit' => $validated['usersLimit'],
            'students_limit' => $validated['studentsLimit'],
            'storage_gb' => $validated['storageGb'],
            'support_level' => $validated['supportLevel'],
            'status' => $validated['status'],
            'features' => $validated['features'] ?? [],
        ];
    }
}
```

- [ ] **Step 8: Register the routes**

In `backend/app/Domains/SuperAdmin/routes.php`, add the import at the top alongside the other controller imports:

```php
use App\Domains\SuperAdmin\Controllers\PackagePlanController;
```

Then, inside the `Route::middleware(['auth:sanctum', 'superadmin'])->group(...)` block, immediately after the closing `});` of the `centres` prefix group:

```php
        // Packages
        Route::prefix('packages')->group(function () {
            Route::get('/', [PackagePlanController::class, 'index']);
            Route::post('/', [PackagePlanController::class, 'store']);
            Route::put('/{id}', [PackagePlanController::class, 'update']);
            Route::delete('/{id}', [PackagePlanController::class, 'destroy']);
        });
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd backend && php artisan test --filter=PackagePlanApiTest`
Expected: PASS, all four tests.

- [ ] **Step 10: Commit**

```bash
git add backend/database/migrations backend/app/Domains/Core/Models/PackagePlan.php backend/app/Domains/SuperAdmin backend/tests/Feature/SuperAdmin/PackagePlanApiTest.php
git commit -m "feat: add the superadmin package plans API"
```

---

### Task 3: Invoice model and number generator

The numbering is the only non-obvious logic in this build, so it gets its own task and its own tests before any HTTP layer sits on top of it.

**Files:**
- Create: `backend/database/migrations/2026_08_09_000002_create_centre_invoices_table.php`
- Create: `backend/app/Domains/Core/Models/CentreInvoice.php`
- Create: `backend/app/Domains/SuperAdmin/Services/InvoiceNumberGenerator.php`
- Create: `backend/tests/Feature/SuperAdmin/InvoiceNumberGeneratorTest.php`

**Interfaces:**
- Consumes: `package_plans` table (Task 2), `centres` table (existing, model `App\Domains\Core\Models\Centre`).
- Produces: `App\Domains\Core\Models\CentreInvoice`, and `InvoiceNumberGenerator::nextFor(string $issuedAt): string` returning e.g. `FAC-2026-0001`. Task 4 calls both.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Core\Models\CentreInvoice;
use App\Domains\SuperAdmin\Services\InvoiceNumberGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceNumberGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private function generator(): InvoiceNumberGenerator
    {
        return app(InvoiceNumberGenerator::class);
    }

    private function invoiceNumbered(string $number, string $issuedAt): void
    {
        CentreInvoice::create([
            'invoice_number' => $number,
            'centre_id' => null,
            'package_plan_id' => null,
            'package_name' => 'Pro',
            'amount' => 100,
            'issued_at' => $issuedAt,
            'due_date' => $issuedAt,
            'status' => 'pending',
        ]);
    }

    public function test_the_first_invoice_of_a_year_starts_at_0001(): void
    {
        $this->assertSame('FAC-2026-0001', $this->generator()->nextFor('2026-03-04'));
    }

    public function test_the_sequence_increments_within_a_year(): void
    {
        $this->invoiceNumbered('FAC-2026-0001', '2026-01-10');
        $this->invoiceNumbered('FAC-2026-0002', '2026-02-10');

        $this->assertSame('FAC-2026-0003', $this->generator()->nextFor('2026-03-04'));
    }

    public function test_the_sequence_restarts_in_a_new_year(): void
    {
        $this->invoiceNumbered('FAC-2026-0007', '2026-12-30');

        $this->assertSame('FAC-2027-0001', $this->generator()->nextFor('2027-01-02'));
    }

    public function test_a_deleted_invoice_does_not_free_its_number(): void
    {
        $this->invoiceNumbered('FAC-2026-0001', '2026-01-10');
        CentreInvoice::where('invoice_number', 'FAC-2026-0001')->delete();

        // Reusing an accounting number would be wrong even though the row is gone.
        $this->assertSame('FAC-2026-0002', $this->generator()->nextFor('2026-05-01'));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php artisan test --filter=InvoiceNumberGeneratorTest`
Expected: FAIL — class `App\Domains\Core\Models\CentreInvoice` not found.

- [ ] **Step 3: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('centre_invoices', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('invoice_number')->unique();

            // Restricted: billing records must never be orphaned by deleting a centre.
            $table->foreignId('centre_id')->nullable()->constrained('centres')->restrictOnDelete();
            // Nulled: the plan may go away, but package_name preserves what was billed.
            $table->foreignId('package_plan_id')->nullable()->constrained('package_plans')->nullOnDelete();
            $table->string('package_name');

            $table->decimal('amount', 10, 2)->default(0);
            $table->date('issued_at');
            $table->date('due_date');
            $table->timestamp('paid_at')->nullable();
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('centre_invoices');
    }
};
```

- [ ] **Step 4: Write the model**

```php
<?php

namespace App\Domains\Core\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CentreInvoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid', 'invoice_number', 'centre_id', 'package_plan_id', 'package_name',
        'amount', 'issued_at', 'due_date', 'paid_at', 'status', 'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'issued_at' => 'date',
        'due_date' => 'date',
        'paid_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $invoice) {
            if (empty($invoice->uuid)) {
                $invoice->uuid = (string) Str::uuid();
            }
        });
    }

    public function centre(): BelongsTo
    {
        return $this->belongsTo(Centre::class);
    }

    public function packagePlan(): BelongsTo
    {
        return $this->belongsTo(PackagePlan::class);
    }

    /** True when this invoice is unpaid and its due date has already passed. */
    public function isLate(): bool
    {
        return $this->status === 'pending'
            && $this->due_date !== null
            && $this->due_date->lt(today());
    }
}
```

- [ ] **Step 5: Write the generator**

```php
<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Core\Models\CentreInvoice;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class InvoiceNumberGenerator
{
    /**
     * Next number for the year of $issuedAt, e.g. FAC-2026-0001.
     *
     * Soft-deleted invoices are included: an accounting number must never be
     * handed out twice, even if its row was removed.
     */
    public function nextFor(string $issuedAt): string
    {
        $prefix = 'FAC-'.Carbon::parse($issuedAt)->year.'-';

        return DB::transaction(function () use ($prefix) {
            $last = CentreInvoice::withTrashed()
                ->where('invoice_number', 'like', $prefix.'%')
                ->lockForUpdate()
                ->orderByDesc('invoice_number')
                ->value('invoice_number');

            $next = $last === null
                ? 1
                : ((int) substr($last, strlen($prefix))) + 1;

            return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        });
    }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && php artisan test --filter=InvoiceNumberGeneratorTest`
Expected: PASS, all four tests.

- [ ] **Step 7: Commit**

```bash
git add backend/database/migrations backend/app/Domains/Core/Models/CentreInvoice.php backend/app/Domains/SuperAdmin/Services/InvoiceNumberGenerator.php backend/tests/Feature/SuperAdmin/InvoiceNumberGeneratorTest.php
git commit -m "feat: add the centre invoice model and per-year number generator"
```

---

### Task 4: Invoices API

**Files:**
- Create: `backend/app/Domains/SuperAdmin/Resources/CentreInvoiceResource.php`
- Create: `backend/app/Domains/SuperAdmin/Requests/StoreCentreInvoiceRequest.php`
- Create: `backend/app/Domains/SuperAdmin/Controllers/CentreInvoiceController.php`
- Modify: `backend/app/Domains/SuperAdmin/routes.php`
- Create: `backend/tests/Feature/SuperAdmin/CentreInvoiceApiTest.php`

**Interfaces:**
- Consumes: `CentreInvoice`, `InvoiceNumberGenerator::nextFor()` (Task 3), `PackagePlan` (Task 2), `SuperAdmin::factory()` (Task 1).
- Produces: the four invoice endpoints. Nothing later depends on them.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\CentreInvoice;
use App\Models\SuperAdmin;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CentreInvoiceApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): SuperAdmin
    {
        return SuperAdmin::factory()->create();
    }

    private function centre(): Centre
    {
        return Centre::create([
            'tenant_id' => Tenant::factory()->create()->id,
            'name' => 'Centre Atlas',
            'city' => 'Casablanca',
        ]);
    }

    public function test_it_creates_an_invoice_and_generates_its_number(): void
    {
        $centre = $this->centre();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/invoices', [
                'centreId' => $centre->id,
                'packagePlanId' => null,
                'packageName' => 'Pro',
                'amount' => 499,
                'issuedAt' => '2026-03-01',
                'dueDate' => '2026-03-31',
                'status' => 'pending',
            ])
            ->assertCreated()
            ->assertJsonPath('data.invoiceNumber', 'FAC-2026-0001')
            ->assertJsonPath('data.centreName', 'Centre Atlas')
            ->assertJsonPath('data.city', 'Casablanca');
    }

    public function test_it_rejects_late_as_an_input_status(): void
    {
        $centre = $this->centre();

        // 'late' is derived from the due date, never stored.
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/invoices', [
                'centreId' => $centre->id,
                'packageName' => 'Pro',
                'amount' => 100,
                'issuedAt' => '2026-03-01',
                'dueDate' => '2026-03-31',
                'status' => 'late',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_it_rejects_a_due_date_before_the_issue_date(): void
    {
        $centre = $this->centre();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/invoices', [
                'centreId' => $centre->id,
                'packageName' => 'Pro',
                'amount' => 100,
                'issuedAt' => '2026-03-10',
                'dueDate' => '2026-03-01',
                'status' => 'pending',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('dueDate');
    }

    public function test_an_overdue_pending_invoice_reports_as_late(): void
    {
        $centre = $this->centre();

        CentreInvoice::create([
            'invoice_number' => 'FAC-2026-0001', 'centre_id' => $centre->id,
            'package_name' => 'Pro', 'amount' => 100,
            'issued_at' => today()->subDays(40), 'due_date' => today()->subDay(),
            'status' => 'pending',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/invoices')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'late');
    }

    public function test_an_invoice_due_today_is_still_pending(): void
    {
        $centre = $this->centre();

        CentreInvoice::create([
            'invoice_number' => 'FAC-2026-0001', 'centre_id' => $centre->id,
            'package_name' => 'Pro', 'amount' => 100,
            'issued_at' => today()->subDays(30), 'due_date' => today(),
            'status' => 'pending',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/invoices')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_a_paid_invoice_past_its_due_date_stays_paid(): void
    {
        $centre = $this->centre();

        CentreInvoice::create([
            'invoice_number' => 'FAC-2026-0001', 'centre_id' => $centre->id,
            'package_name' => 'Pro', 'amount' => 100,
            'issued_at' => today()->subDays(40), 'due_date' => today()->subDays(5),
            'paid_at' => now(), 'status' => 'paid',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/invoices')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'paid');
    }

    public function test_it_marks_an_invoice_paid(): void
    {
        $centre = $this->centre();
        $invoice = CentreInvoice::create([
            'invoice_number' => 'FAC-2026-0001', 'centre_id' => $centre->id,
            'package_name' => 'Pro', 'amount' => 100,
            'issued_at' => today(), 'due_date' => today()->addDays(30),
            'status' => 'pending',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/invoices/{$invoice->id}/mark-paid")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $this->assertNotNull($invoice->fresh()->paid_at);
    }

    public function test_a_centre_with_invoices_cannot_be_hard_deleted(): void
    {
        $centre = $this->centre();
        CentreInvoice::create([
            'invoice_number' => 'FAC-2026-0001', 'centre_id' => $centre->id,
            'package_name' => 'Pro', 'amount' => 100,
            'issued_at' => today(), 'due_date' => today()->addDays(30),
            'status' => 'pending',
        ]);

        // Centre uses SoftDeletes, so delete() only stamps deleted_at and never
        // reaches the constraint. forceDelete() is what the FK actually guards.
        $this->expectException(\Illuminate\Database\QueryException::class);
        $centre->forceDelete();
    }

    public function test_soft_deleting_a_centre_leaves_its_invoices_intact(): void
    {
        $centre = $this->centre();
        CentreInvoice::create([
            'invoice_number' => 'FAC-2026-0001', 'centre_id' => $centre->id,
            'package_name' => 'Pro', 'amount' => 100,
            'issued_at' => today(), 'due_date' => today()->addDays(30),
            'status' => 'pending',
        ]);

        $centre->delete();

        $this->assertDatabaseHas('centre_invoices', ['centre_id' => $centre->id]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php artisan test --filter=CentreInvoiceApiTest`
Expected: FAIL — 404, the invoices routes do not exist.

- [ ] **Step 3: Write the resource**

```php
<?php

namespace App\Domains\SuperAdmin\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CentreInvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'invoiceNumber' => $this->invoice_number,
            'centreId' => $this->centre_id,
            'centreName' => $this->centre?->name ?? '—',
            'city' => $this->centre?->city ?? '—',
            'packagePlanId' => $this->package_plan_id,
            'packageName' => $this->package_name,
            'amount' => (float) $this->amount,
            'issuedAt' => $this->issued_at?->toDateString(),
            'dueDate' => $this->due_date?->toDateString(),
            'paidAt' => $this->paid_at?->toIso8601String(),
            // 'late' exists only here — it is never a stored value.
            'status' => $this->isLate() ? 'late' : $this->status,
            'notes' => $this->notes,
        ];
    }
}
```

- [ ] **Step 4: Write the FormRequest**

```php
<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCentreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Centre soft-deletes, so exclude archived ones from the lookup.
            'centreId' => ['required', 'integer', Rule::exists('centres', 'id')->whereNull('deleted_at')],
            'packagePlanId' => ['nullable', 'integer', Rule::exists('package_plans', 'id')->whereNull('deleted_at')],
            'packageName' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0'],
            'issuedAt' => ['required', 'date'],
            'dueDate' => ['required', 'date', 'after_or_equal:issuedAt'],
            // 'late' is deliberately absent — it is derived from dueDate.
            'status' => ['required', Rule::in(['pending', 'paid', 'cancelled'])],
            'paidAt' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
```

- [ ] **Step 5: Write the controller**

```php
<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\CentreInvoice;
use App\Domains\SuperAdmin\Requests\StoreCentreInvoiceRequest;
use App\Domains\SuperAdmin\Resources\CentreInvoiceResource;
use App\Domains\SuperAdmin\Services\InvoiceNumberGenerator;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class CentreInvoiceController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly InvoiceNumberGenerator $numbers) {}

    public function index(): JsonResponse
    {
        $invoices = CentreInvoice::with(['centre', 'packagePlan'])
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->get();

        return $this->success(data: CentreInvoiceResource::collection($invoices));
    }

    public function store(StoreCentreInvoiceRequest $request): JsonResponse
    {
        $data = $request->validated();

        $invoice = CentreInvoice::create([
            'invoice_number' => $this->numbers->nextFor($data['issuedAt']),
            'centre_id' => $data['centreId'],
            'package_plan_id' => $data['packagePlanId'] ?? null,
            'package_name' => $data['packageName'],
            'amount' => $data['amount'],
            'issued_at' => $data['issuedAt'],
            'due_date' => $data['dueDate'],
            'paid_at' => $data['paidAt'] ?? null,
            'status' => $data['status'],
            'notes' => $data['notes'] ?? null,
        ]);

        return $this->success(
            data: CentreInvoiceResource::make($invoice->load(['centre', 'packagePlan'])),
            message: 'Facture créée.',
            code: 201,
        );
    }

    public function markPaid(int $id): JsonResponse
    {
        $invoice = CentreInvoice::findOrFail($id);
        $invoice->update(['status' => 'paid', 'paid_at' => now()]);

        return $this->success(
            data: CentreInvoiceResource::make($invoice->fresh()->load(['centre', 'packagePlan'])),
            message: 'Facture marquée payée.',
        );
    }

    public function destroy(int $id): JsonResponse
    {
        CentreInvoice::findOrFail($id)->delete();

        return $this->success(message: 'Facture supprimée.');
    }
}
```

- [ ] **Step 6: Register the routes**

Add the import at the top of `backend/app/Domains/SuperAdmin/routes.php`:

```php
use App\Domains\SuperAdmin\Controllers\CentreInvoiceController;
```

And inside the protected group, after the `packages` block from Task 2:

```php
        // Invoices
        Route::prefix('invoices')->group(function () {
            Route::get('/', [CentreInvoiceController::class, 'index']);
            Route::post('/', [CentreInvoiceController::class, 'store']);
            Route::post('/{id}/mark-paid', [CentreInvoiceController::class, 'markPaid']);
            Route::delete('/{id}', [CentreInvoiceController::class, 'destroy']);
        });
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && php artisan test --filter=CentreInvoiceApiTest`
Expected: PASS, all nine tests.

- [ ] **Step 8: Commit**

```bash
git add backend/app/Domains/SuperAdmin backend/tests/Feature/SuperAdmin/CentreInvoiceApiTest.php
git commit -m "feat: add the superadmin centre invoices API"
```

---

### Task 5: Remove the `late` option from the invoice create form

The API rejects `late` on input because it is derived. The form currently offers it, so leaving it would 422 anyone who picks it.

**Files:**
- Modify: `src/app/superadmin/pages/invoices/superadmin-invoices.component.html:45`

**Interfaces:**
- Consumes: the validation from Task 4.
- Produces: nothing.

- [ ] **Step 1: Remove the option**

Delete this single line from the status `<select>` in the create form:

```html
              <option value="late">En retard</option>
```

Leave every other use of `late` alone — the status column, the filters and the totals all still display it, because the resource still emits it.

- [ ] **Step 2: Verify the build**

Run: `npm run build -- --configuration production`
Expected: build completes; no new warnings.

- [ ] **Step 3: Commit**

```bash
git add src/app/superadmin/pages/invoices/superadmin-invoices.component.html
git commit -m "fix: drop the late option from the invoice create form

'late' is derived from the due date, so it is not a value anyone can set.
It still appears wherever invoices are displayed."
```

---

### Task 6: Superadmin account status and login stamping

**Files:**
- Create: `backend/database/migrations/2026_08_09_000003_add_status_and_last_login_to_super_admins_table.php`
- Modify: `backend/app/Models/SuperAdmin.php`
- Modify: `backend/app/Domains/SuperAdmin/Services/SuperAdminAuthService.php`
- Create: `backend/tests/Feature/SuperAdmin/SuperAdminLoginStatusTest.php`

**Interfaces:**
- Consumes: `SuperAdmin::factory()` (Task 1).
- Produces: `super_admins.status` and `super_admins.last_login_at`. Task 7 serializes both.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\SuperAdmin;

use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminLoginStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_successful_login_stamps_last_login_at(): void
    {
        $admin = SuperAdmin::factory()->create(['email' => 'boss@moujtahide.ma']);
        $this->assertNull($admin->last_login_at);

        $this->postJson('/api/v1/superadmin/auth/login', [
            'email' => 'boss@moujtahide.ma',
            'password' => 'password',
        ])->assertOk();

        $this->assertNotNull($admin->fresh()->last_login_at);
    }

    public function test_a_suspended_account_cannot_log_in(): void
    {
        SuperAdmin::factory()->create([
            'email' => 'ex@moujtahide.ma',
            'status' => 'suspended',
        ]);

        $this->postJson('/api/v1/superadmin/auth/login', [
            'email' => 'ex@moujtahide.ma',
            'password' => 'password',
        ])->assertStatus(401);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php artisan test --filter=SuperAdminLoginStatusTest`
Expected: FAIL — `last_login_at` column does not exist.

- [ ] **Step 3: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('super_admins', function (Blueprint $table) {
            $table->string('status')->default('active')->after('email');
            $table->timestamp('last_login_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('super_admins', function (Blueprint $table) {
            $table->dropColumn(['status', 'last_login_at']);
        });
    }
};
```

- [ ] **Step 4: Update the model**

In `backend/app/Models/SuperAdmin.php`, extend `$fillable` and the casts:

```php
    protected $fillable = [
        'uuid',
        'name',
        'email',
        'password',
        'status',
        'last_login_at',
    ];
```

```php
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_login_at' => 'datetime',
        ];
    }
```

- [ ] **Step 5: Update the auth service**

In `backend/app/Domains/SuperAdmin/Services/SuperAdminAuthService.php`, inside `login()`, insert the suspension check immediately after the credential check, and the stamp immediately before creating the token:

```php
        if ($superAdmin->status === 'suspended') {
            RateLimiter::hit($throttleKey);
            throw new AuthenticationException('Ce compte est suspendu.');
        }

        RateLimiter::clear($throttleKey);

        $superAdmin->forceFill(['last_login_at' => now()])->save();

        $token = $superAdmin->createToken('superadmin-auth-token', ['*'], now()->addDays(7))->plainTextToken;
```

Note the existing `RateLimiter::clear($throttleKey);` line moves below the suspension check — a suspended account should not clear its own throttle.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && php artisan test --filter=SuperAdminLoginStatusTest`
Expected: PASS, both tests.

- [ ] **Step 7: Run the whole suite to check nothing regressed**

Run: `cd backend && php artisan test`
Expected: no NEW failures. Three pre-existing failures are known and unrelated: `ExampleTest::test_the_application_returns_a_successful_response` (missing `welcome` view) and two in `StudentAttritionRiskApiTest`.

- [ ] **Step 8: Commit**

```bash
git add backend/database/migrations backend/app/Models/SuperAdmin.php backend/app/Domains/SuperAdmin/Services/SuperAdminAuthService.php backend/tests/Feature/SuperAdmin/SuperAdminLoginStatusTest.php
git commit -m "feat: add status and last-login tracking to superadmin accounts"
```

---

### Task 7: Accounts API

**Files:**
- Create: `backend/app/Domains/SuperAdmin/Resources/SuperAdminAccountResource.php`
- Create: `backend/app/Domains/SuperAdmin/Requests/StoreSuperAdminAccountRequest.php`
- Create: `backend/app/Domains/SuperAdmin/Requests/UpdateSuperAdminAccountRequest.php`
- Create: `backend/app/Domains/SuperAdmin/Controllers/SuperAdminAccountController.php`
- Modify: `backend/app/Domains/SuperAdmin/routes.php`
- Create: `backend/tests/Feature/SuperAdmin/SuperAdminAccountApiTest.php`

**Interfaces:**
- Consumes: `super_admins.status` / `last_login_at` (Task 6), `SuperAdmin::factory()` (Task 1).
- Produces: the five account endpoints.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\SuperAdmin;

use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuperAdminAccountApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_accounts_with_the_shape_the_page_reads(): void
    {
        $admin = SuperAdmin::factory()->create(['name' => 'Boss']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/superadmin/accounts')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Boss')
            ->assertJsonPath('data.0.status', 'active')
            ->assertJsonStructure(['data' => [['id', 'uuid', 'name', 'email', 'status', 'lastLoginAt', 'createdAt']]]);
    }

    public function test_it_creates_an_account(): void
    {
        $this->actingAs(SuperAdmin::factory()->create(), 'sanctum')
            ->postJson('/api/v1/superadmin/accounts', [
                'name' => 'Nouvelle Agente',
                'email' => 'agente@moujtahide.ma',
                'password' => 'motdepasse123',
                'status' => 'active',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'agente@moujtahide.ma');

        $this->assertDatabaseHas('super_admins', ['email' => 'agente@moujtahide.ma']);
    }

    public function test_it_updates_without_touching_the_password_when_none_is_sent(): void
    {
        $admin = SuperAdmin::factory()->create();
        $target = SuperAdmin::factory()->create(['password' => Hash::make('original')]);
        $originalHash = $target->password;

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/superadmin/accounts/{$target->id}", [
                'name' => 'Renommée',
                'email' => $target->email,
                'status' => 'active',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renommée');

        $this->assertSame($originalHash, $target->fresh()->password);
    }

    public function test_it_toggles_status(): void
    {
        $admin = SuperAdmin::factory()->create();
        $target = SuperAdmin::factory()->create(['status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/superadmin/accounts/{$target->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');
    }

    public function test_an_account_cannot_suspend_itself(): void
    {
        $admin = SuperAdmin::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/superadmin/accounts/{$admin->id}/toggle-status")
            ->assertUnprocessable();

        $this->assertSame('active', $admin->fresh()->status);
    }

    public function test_an_account_cannot_delete_itself(): void
    {
        $admin = SuperAdmin::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/superadmin/accounts/{$admin->id}")
            ->assertUnprocessable();

        $this->assertDatabaseHas('super_admins', ['id' => $admin->id]);
    }

    public function test_the_tickets_assignee_endpoint_keeps_its_shape(): void
    {
        $admin = SuperAdmin::factory()->create(['name' => 'Boss']);

        // The tickets page reads {name, email, role} from here. Adding the
        // accounts API must not change it.
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/superadmin/superadmins')
            ->assertOk()
            ->assertJsonPath('data.0.role', 'superadmin')
            ->assertJsonPath('data.0.name', 'Boss');
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php artisan test --filter=SuperAdminAccountApiTest`
Expected: FAIL — 404, the accounts routes do not exist.

- [ ] **Step 3: Write the resource**

```php
<?php

namespace App\Domains\SuperAdmin\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Separate from SuperAdminResource on purpose: that one feeds the tickets
 * assignee dropdown and must keep its {name, email, role} shape.
 */
class SuperAdminAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status,
            'lastLoginAt' => $this->last_login_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

- [ ] **Step 4: Write the two FormRequests**

`StoreSuperAdminAccountRequest.php`:

```php
<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSuperAdminAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180', Rule::unique('super_admins', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'status' => ['required', Rule::in(['active', 'suspended'])],
        ];
    }
}
```

`UpdateSuperAdminAccountRequest.php` — password becomes optional:

```php
<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSuperAdminAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180', Rule::unique('super_admins', 'email')->ignore($this->route('id'))],
            'password' => ['nullable', 'string', 'min:8'],
            'status' => ['required', Rule::in(['active', 'suspended'])],
        ];
    }
}
```

- [ ] **Step 5: Write the controller**

```php
<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\Requests\StoreSuperAdminAccountRequest;
use App\Domains\SuperAdmin\Requests\UpdateSuperAdminAccountRequest;
use App\Domains\SuperAdmin\Resources\SuperAdminAccountResource;
use App\Http\Controllers\Controller;
use App\Models\SuperAdmin;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminAccountController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $accounts = SuperAdmin::orderBy('name')->get();

        return $this->success(data: SuperAdminAccountResource::collection($accounts));
    }

    public function store(StoreSuperAdminAccountRequest $request): JsonResponse
    {
        $account = SuperAdmin::create($request->validated());

        return $this->success(
            data: SuperAdminAccountResource::make($account),
            message: 'Compte créé.',
            code: 201,
        );
    }

    public function update(UpdateSuperAdminAccountRequest $request, int $id): JsonResponse
    {
        $account = SuperAdmin::findOrFail($id);
        $data = $request->validated();

        // Only rehash when a new password was actually supplied.
        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $account->update($data);

        return $this->success(
            data: SuperAdminAccountResource::make($account->fresh()),
            message: 'Compte mis à jour.',
        );
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $account = SuperAdmin::findOrFail($id);

        if ($account->id === $request->user()->id) {
            return $this->error(message: 'Vous ne pouvez pas suspendre votre propre compte.', code: 422);
        }

        $account->update([
            'status' => $account->status === 'active' ? 'suspended' : 'active',
        ]);

        return $this->success(
            data: SuperAdminAccountResource::make($account->fresh()),
            message: 'Statut mis à jour.',
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $account = SuperAdmin::findOrFail($id);

        if ($account->id === $request->user()->id) {
            return $this->error(message: 'Vous ne pouvez pas supprimer votre propre compte.', code: 422);
        }

        $account->delete();

        return $this->success(message: 'Compte supprimé.');
    }
}
```

- [ ] **Step 6: Register the routes**

Add the import at the top of `backend/app/Domains/SuperAdmin/routes.php`:

```php
use App\Domains\SuperAdmin\Controllers\SuperAdminAccountController;
```

And inside the protected group, after the `invoices` block from Task 4:

```php
        // Accounts
        Route::prefix('accounts')->group(function () {
            Route::get('/', [SuperAdminAccountController::class, 'index']);
            Route::post('/', [SuperAdminAccountController::class, 'store']);
            Route::put('/{id}', [SuperAdminAccountController::class, 'update']);
            Route::post('/{id}/toggle-status', [SuperAdminAccountController::class, 'toggleStatus']);
            Route::delete('/{id}', [SuperAdminAccountController::class, 'destroy']);
        });
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && php artisan test --filter=SuperAdminAccountApiTest`
Expected: PASS, all seven tests.

- [ ] **Step 8: Run the whole suite**

Run: `cd backend && php artisan test`
Expected: no NEW failures beyond the three known pre-existing ones.

- [ ] **Step 9: Commit**

```bash
git add backend/app/Domains/SuperAdmin backend/tests/Feature/SuperAdmin/SuperAdminAccountApiTest.php
git commit -m "feat: add the superadmin accounts API"
```

---

## Deployment note

The deploy runs `php artisan migrate --force`, so the three new migrations apply automatically. It also runs `route:cache`, which picks up the new routes.

`super_admins.status` defaults to `active`, so every existing account keeps working after the migration. No backfill is needed.
