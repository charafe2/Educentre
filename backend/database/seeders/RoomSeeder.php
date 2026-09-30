<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RoomSeeder extends Seeder
{
    public const ROOM_COUNT = 20;

    /**
     * Idempotent: gives every tenant (or only $tenantSlug when given) rooms
     * "Salle 01" to "Salle 20". Existing rooms with the same name are kept
     * (soft-deleted ones are restored), so nothing the centre created is touched.
     */
    public function run(?string $tenantSlug = null): void
    {
        $tenants = Tenant::query()
            ->when($tenantSlug, fn ($query) => $query->where('slug', $tenantSlug))
            ->get();

        $created = 0;
        $now = now();

        foreach ($tenants as $tenant) {
            foreach (range(1, self::ROOM_COUNT) as $number) {
                $name = sprintf('Salle %02d', $number);

                $existing = DB::table('rooms')
                    ->where('tenant_id', $tenant->id)
                    ->where('name', $name)
                    ->first();

                if ($existing) {
                    if ($existing->deleted_at !== null) {
                        DB::table('rooms')->where('id', $existing->id)->update([
                            'deleted_at' => null,
                            'is_active' => true,
                            'updated_at' => $now,
                        ]);
                    }

                    continue;
                }

                DB::table('rooms')->insert([
                    'tenant_id' => $tenant->id,
                    'uuid' => (string) Str::uuid(),
                    'name' => $name,
                    'capacity' => 30,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $created++;
            }
        }

        $this->command?->info(sprintf(
            '%d salle(s) créée(s) sur %d centre(s).',
            $created,
            $tenants->count(),
        ));
    }
}
