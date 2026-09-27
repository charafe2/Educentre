<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Grouping lives on Tenant (not User): it's "these centres belong to
     * one account," managed by the superadmin console at the centre/tenant
     * level. Every existing tenant gets `null` here forever unless a
     * superadmin explicitly groups it — zero behavior change by default.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignId('account_group_id')->nullable()->after('id')
                ->constrained('account_groups')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_group_id');
        });
    }
};
