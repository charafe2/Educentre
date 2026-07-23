<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Subjects move from "owned per tenant" to "global catalog, assigned to tenants".
     * `classes.subject` is a plain string with no FK to subjects.id, so consolidating
     * duplicate catalog rows here never touches class data.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('subjects', 'status')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->string('status')->default('active')->after('bg_color');
            });
        }

        $now = now();
        $rows = DB::table('subjects')->select('id', 'tenant_id', 'name', 'deleted_at')->orderBy('id')->get();

        $groups = [];
        foreach ($rows as $row) {
            $groups[mb_strtolower(trim($row->name))][] = $row;
        }

        $idsToDelete = [];

        foreach ($groups as $groupRows) {
            $canonical = null;
            foreach ($groupRows as $row) {
                if ($row->deleted_at === null) {
                    $canonical = $row;
                    break;
                }
            }
            $canonical ??= $groupRows[0];

            $tenantIds = array_unique(array_map(fn ($row) => $row->tenant_id, $groupRows));
            foreach ($tenantIds as $tenantId) {
                DB::table('subject_tenant')->insertOrIgnore([
                    'tenant_id' => $tenantId,
                    'subject_id' => $canonical->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ($groupRows as $row) {
                if ($row->id !== $canonical->id) {
                    $idsToDelete[] = $row->id;
                }
            }
        }

        if (!empty($idsToDelete)) {
            DB::table('subjects')->whereIn('id', $idsToDelete)->delete();
        }

        if (Schema::hasColumn('subjects', 'tenant_id')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->dropForeign(['tenant_id']);
                $table->dropUnique(['tenant_id', 'name']);
                $table->dropColumn('tenant_id');
            });
        }

        if (!$this->hasUnique('subjects', 'subjects_name_unique')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->unique('name');
            });
        }
    }

    private function hasUnique(string $table, string $indexName): bool
    {
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'pgsql') {
            return !empty(DB::select('SELECT 1 FROM pg_indexes WHERE tablename = ? AND indexname = ?', [$table, $indexName]));
        }
        
        if ($driver === 'mysql') {
            return !empty(DB::select('SHOW INDEX FROM `'.$table.'` WHERE Key_name = ?', [$indexName]));
        }
        
        $indexes = DB::select("PRAGMA index_list('{$table}')");
        foreach ($indexes as $index) {
            if ($index->name === $indexName) {
                return true;
            }
        }
        
        return false;
    }

    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
