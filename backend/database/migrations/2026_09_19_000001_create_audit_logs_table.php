<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            // Restricted: an audit trail must never be orphaned by deleting a tenant.
            $table->foreignId('tenant_id')->constrained('tenants')->restrictOnDelete();

            // Nulled, not restricted: deleting the acting user must not be blocked
            // by their own history, and must not erase it either — actor_name
            // keeps the entry readable once the user record is gone.
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_name');

            $table->string('module');
            $table->string('action');
            $table->string('description');

            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'created_at']);
            $table->index('module');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
