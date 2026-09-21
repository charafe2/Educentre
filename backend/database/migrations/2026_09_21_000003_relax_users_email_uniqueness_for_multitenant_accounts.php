<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A multitenant account has several owner `users` rows (one per centre)
     * that deliberately share one login email + password hash, so email can
     * no longer be unique across the whole table — only within a tenant.
     * No backfill needed: every existing row keeps a distinct email, so
     * this is a no-op for every current account.
     *
     * The pre-existing non-unique `(tenant_id, email)` index is left in
     * place (not dropped): MySQL refuses to drop it because it backs the
     * `tenant_id` foreign key, and it's harmless to keep alongside the new
     * unique index below (some redundancy, no correctness or real
     * performance cost at this table's size).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_email_unique');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique(['tenant_id', 'email']);
            // Login still looks up by email alone, before any tenant is known.
            $table->index('email');
        });
    }

    /**
     * One-way in practice once any account is grouped: two owner rows will
     * then legitimately share an email, and re-adding a global unique(email)
     * fails loudly. Do not run this down() against a database that has real
     * multitenant accounts.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_email_index');
            $table->dropUnique(['tenant_id', 'email']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('email');
        });
    }
};
