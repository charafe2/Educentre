<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('super_admins', function (Blueprint $table) {
            // Suspension is reversible access removal; deletion is not. Both are
            // needed before the console can manage its own operators.
            $table->boolean('is_active')->default(true)->after('password');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            // Soft deletes keep conversations.agent_id pointing at a real row, so
            // "who handled this ticket" survives removing the operator.
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('super_admins', function (Blueprint $table) {
            $table->dropColumn(['is_active', 'last_login_at', 'deleted_at']);
        });
    }
};
