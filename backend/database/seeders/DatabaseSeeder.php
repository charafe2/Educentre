<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Domains\Core\Models\Centre;
use App\Domains\Teachers\Models\Teacher;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::create([
            'name' => 'Centre Moujtahid',
            'slug' => 'moujtahid',
            'status' => 'active',
        ]);

<<<<<<< HEAD
        User::create([
=======
        Centre::create([
            'tenant_id' => $tenant->id,
            'name' => 'Centre Moujtahid',
            'city' => 'Casablanca',
            'phone' => '0522000000',
            'whatsapp_number' => '0661000000',
            'is_active' => true,
        ]);

        $admin = User::factory()->create([
>>>>>>> 6568720da86eb47ead3cfc5dedc29a94f79c387a
            'tenant_id' => $tenant->id,
            'name' => 'Ahmed Berrada',
            'email' => 'admin@moujtahid.ma',
            'password' => Hash::make('admin123456789'),
            'role' => 'admin',
            'status' => 'active',
        ]);

<<<<<<< HEAD
        User::create([
=======
        $manager = User::factory()->create([
>>>>>>> 6568720da86eb47ead3cfc5dedc29a94f79c387a
            'tenant_id' => $tenant->id,
            'name' => 'Khadija Alami',
            'email' => 'manager@moujtahid.ma',
            'password' => Hash::make('manager1234567'),
            'role' => 'manager',
            'status' => 'active',
        ]);

        Teacher::create(['tenant_id' => $tenant->id, 'user_id' => $admin->id, 'specialty' => 'Mathématiques', 'payment_mode' => 'fixed', 'is_active' => true]);
        Teacher::create(['tenant_id' => $tenant->id, 'user_id' => $manager->id, 'specialty' => 'Physique-Chimie', 'payment_mode' => 'fixed', 'is_active' => true]);
        Teacher::create(['tenant_id' => $tenant->id, 'user_id' => $admin->id, 'specialty' => 'Français', 'payment_mode' => 'fixed', 'is_active' => true]);

        $this->call(PlanningSeeder::class);
    }
}
