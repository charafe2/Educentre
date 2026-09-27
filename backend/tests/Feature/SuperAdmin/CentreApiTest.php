<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\PackagePlan;
use App\Domains\Core\Models\Subscription;
use App\Models\SuperAdmin;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CentreApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): SuperAdmin
    {
        return SuperAdmin::factory()->create();
    }

    private function plan(string $name = 'Pro', float $price = 250): PackagePlan
    {
        return PackagePlan::create([
            'name' => $name, 'monthly_price' => $price, 'users_limit' => 15,
            'students_limit' => 1000, 'storage_gb' => 50,
            'support_level' => 'Prioritaire', 'status' => 'active', 'features' => [],
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'centreName' => 'Centre Al Manar',
            'centreType' => 'Soutien scolaire',
            'city' => 'Casablanca',
            'ownerName' => 'Youssef Idrissi',
            'email' => 'youssef@almanar.ma',
            'phone' => '0522334455',
            'password' => 'motdepasse123',
            'plan' => 'Pro',
        ], $overrides);
    }

    public function test_it_creates_centre_with_tenant_owner_and_subscription(): void
    {
        $this->plan('Pro', 250);

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/centres', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.centreName', 'Centre Al Manar')
            ->assertJsonPath('data.ownerName', 'Youssef Idrissi')
            ->assertJsonPath('data.email', 'youssef@almanar.ma')
            ->assertJsonPath('data.plan', 'Pro')
            ->assertJsonPath('data.status', 'active');

        $centreId = $response->json('data.id');
        $centre = Centre::findOrFail($centreId);

        // The tenant, owner user and subscription must all exist and agree.
        $this->assertNotNull($centre->tenant_id);
        $tenant = Tenant::findOrFail($centre->tenant_id);
        $this->assertSame('active', $tenant->status);

        $owner = User::where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame('youssef@almanar.ma', $owner->email);
        $this->assertSame('admin', $owner->role);
        $this->assertTrue((bool) $owner->is_owner);
        $this->assertTrue(Hash::check('motdepasse123', $owner->password));

        $subscription = Subscription::where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame('Pro', $subscription->plan);
        // Price is copied from the package catalogue, not sent by the client.
        $this->assertEquals(250, (float) $subscription->monthly_price);
    }

    public function test_it_rejects_a_duplicate_owner_email(): void
    {
        $this->plan();
        $tenant = Tenant::create(['name' => 'X', 'slug' => 'x', 'status' => 'active']);
        User::factory()->create(['tenant_id' => $tenant->id, 'email' => 'taken@almanar.ma']);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/centres', $this->payload(['email' => 'taken@almanar.ma']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_it_rejects_an_unknown_plan(): void
    {
        $this->plan();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/centres', $this->payload(['plan' => 'Inexistant']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('plan');
    }

    public function test_it_generates_a_unique_slug_for_duplicate_centre_names(): void
    {
        $this->plan();

        $a = $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/centres', $this->payload())
            ->assertCreated();
        $b = $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/centres', $this->payload(['email' => 'autre@almanar.ma']))
            ->assertCreated();

        $slugA = Tenant::findOrFail(Centre::findOrFail($a->json('data.id'))->tenant_id)->slug;
        $slugB = Tenant::findOrFail(Centre::findOrFail($b->json('data.id'))->tenant_id)->slug;

        $this->assertNotSame($slugA, $slugB);
    }

    public function test_it_updates_a_centre_and_its_owner(): void
    {
        $this->plan();
        $created = $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/centres', $this->payload())
            ->assertCreated();
        $id = $created->json('data.id');

        $this->actingAs($this->admin(), 'sanctum')
            ->putJson("/api/v1/superadmin/centres/{$id}", $this->payload([
                'centreName' => 'Centre Renommé',
                'ownerName' => 'Nouveau Proprio',
                'password' => null,
            ]))
            ->assertOk()
            ->assertJsonPath('data.centreName', 'Centre Renommé')
            ->assertJsonPath('data.ownerName', 'Nouveau Proprio');

        $this->assertSame('Centre Renommé', Centre::findOrFail($id)->name);
    }

    public function test_it_toggles_centre_status(): void
    {
        $this->plan();
        $id = $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/centres', $this->payload())
            ->json('data.id');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/centres/{$id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/centres/{$id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');
    }

    public function test_it_soft_deletes_a_centre(): void
    {
        $this->plan();
        $id = $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/centres', $this->payload())
            ->json('data.id');

        $this->actingAs($this->admin(), 'sanctum')
            ->deleteJson("/api/v1/superadmin/centres/{$id}")
            ->assertOk();

        $this->assertNull(Centre::find($id));
        $this->assertNotNull(Centre::withTrashed()->find($id));
    }
}
