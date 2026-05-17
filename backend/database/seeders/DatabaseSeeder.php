<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
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

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Ahmed Berrada',
            'email' => 'admin@moujtahid.ma',
            'password' => 'admin123456789',
            'role' => 'admin',
            'status' => 'active',
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Khadija Alami',
            'email' => 'manager@moujtahid.ma',
            'password' => 'manager1234567',
            'role' => 'manager',
            'status' => 'active',
        ]);
    }
}
