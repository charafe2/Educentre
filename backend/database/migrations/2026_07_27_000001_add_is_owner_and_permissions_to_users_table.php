<?php

use App\Domains\Settings\Support\TenantPermissions;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_owner')->default(false)->after('role');
            $table->json('permissions')->nullable()->after('is_owner');
        });

        // Backfill: the first user created for each tenant (lowest id) becomes
        // the owner. This mirrors the convention already used elsewhere in the
        // app (SuperAdmin\Controllers\CentreController derives the "owner" the
        // same way) so existing tenants get a sensible owner with no manual step.
        DB::table('users')
            ->select('tenant_id', DB::raw('MIN(id) as owner_id'))
            ->groupBy('tenant_id')
            ->get()
            ->each(function (object $row): void {
                DB::table('users')->where('id', $row->owner_id)->update(['is_owner' => true]);
            });

        // Every OTHER pre-existing user had unrestricted access before this
        // permissions system existed. Grant them all permission keys so this
        // migration never silently locks an existing account out of pages it
        // could already reach — the new restrictive default only applies to
        // users created from now on via "Paramètres > Utilisateurs".
        DB::table('users')
            ->where('is_owner', false)
            ->update(['permissions' => json_encode(TenantPermissions::KEYS)]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_owner', 'permissions']);
        });
    }
};
