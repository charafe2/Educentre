<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A group of centres (tenants) that share one login — the "Netflix
     * profile picker" account. `is_multitenant` is superadmin-controlled
     * and gates only the ability to add more centres to the group; it is
     * not consulted at login (see AuthService::login) so toggling it off
     * never breaks an already-grouped account.
     */
    public function up(): void
    {
        Schema::create('account_groups', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('label')->nullable(); // falls back to the first centre's name in the UI
            $table->boolean('is_multitenant')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_groups');
    }
};
