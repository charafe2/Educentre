<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Seeds the global academic-levels catalog from the free-text values already
     * in use on `classes.level` and `students.school_level`, and assigns each
     * resulting level back to every tenant that already had a class or student
     * using that name — so no center loses access to a level it's already using.
     * Neither source column is a FK, so this never touches class/student rows.
     * Idempotent: safe to re-run if it's interrupted partway through.
     */
    public function up(): void
    {
        $now = now();

        $canonicalByKey = [];
        foreach (DB::table('academic_levels')->select('id', 'name')->get() as $existing) {
            $canonicalByKey[mb_strtolower(trim($existing->name))] = $existing->id;
        }

        $classLevels = DB::table('classes')
            ->select('tenant_id', 'level as name')
            ->whereNotNull('level')
            ->where('level', '!=', '');

        $rows = DB::table('students')
            ->select('tenant_id', 'school_level as name')
            ->whereNotNull('school_level')
            ->where('school_level', '!=', '')
            ->unionAll($classLevels)
            ->get();

        $tenantsByKey = [];

        foreach ($rows as $row) {
            $name = trim($row->name);
            if ($name === '') {
                continue;
            }
            $key = mb_strtolower($name);

            if (!isset($canonicalByKey[$key])) {
                $canonicalByKey[$key] = DB::table('academic_levels')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'name' => $name,
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $tenantsByKey[$key][$row->tenant_id] = true;
        }

        foreach ($tenantsByKey as $key => $tenantIds) {
            foreach (array_keys($tenantIds) as $tenantId) {
                DB::table('academic_level_tenant')->insertOrIgnore([
                    'tenant_id' => $tenantId,
                    'academic_level_id' => $canonicalByKey[$key],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('academic_level_tenant')->truncate();
        DB::table('academic_levels')->truncate();
    }
};
