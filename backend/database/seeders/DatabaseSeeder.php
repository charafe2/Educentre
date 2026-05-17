<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Domains\Core\Models\Centre;
use App\Domains\Teachers\Models\Teacher;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::create([
            'name' => 'Centre Moujtahid',
            'slug' => 'moujtahid',
            'status' => 'active',
        ]);

        Centre::create([
            'tenant_id' => $tenant->id,
            'name' => 'Centre Moujtahid',
            'city' => 'Casablanca',
            'phone' => '0522000000',
            'whatsapp_number' => '0661000000',
            'is_active' => true,
        ]);

        $admin = User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Ahmed Berrada',
            'email' => 'admin@moujtahid.ma',
            'password' => 'admin123456789',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $manager = User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Khadija Alami',
            'email' => 'manager@moujtahid.ma',
            'password' => 'manager1234567',
            'role' => 'manager',
            'status' => 'active',
        ]);

        Teacher::create(['tenant_id' => $tenant->id, 'user_id' => $admin->id, 'specialty' => 'Mathématiques', 'payment_mode' => 'fixed', 'is_active' => true]);
        Teacher::create(['tenant_id' => $tenant->id, 'user_id' => $manager->id, 'specialty' => 'Physique-Chimie', 'payment_mode' => 'fixed', 'is_active' => true]);
        Teacher::create(['tenant_id' => $tenant->id, 'user_id' => $admin->id, 'specialty' => 'Français', 'payment_mode' => 'fixed', 'is_active' => true]);

        $this->call(PlanningSeeder::class);
    }
}
