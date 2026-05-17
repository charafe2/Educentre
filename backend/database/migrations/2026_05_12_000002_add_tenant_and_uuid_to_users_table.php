<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tenant_id')->after('id')->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->after('id')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('role', 50)->after('email')->default('admin');
            $table->string('status', 50)->after('password')->default('active');
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
            $table->string('avatar_url')->nullable()->after('last_login_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index(['tenant_id', 'email']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'email']);
            $table->dropIndex(['status']);
            $table->dropColumn(['tenant_id', 'uuid', 'role', 'status', 'last_login_at', 'avatar_url']);
        });
    }
};
