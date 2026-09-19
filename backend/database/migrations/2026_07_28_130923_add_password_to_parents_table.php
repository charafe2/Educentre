<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parents', function (Blueprint $table) {
            $table->string('password')->nullable()->after('email');
        });

        // Backfill existing demo parent rows (seeded before this column
        // existed) with the same demo password the mobile app's mock data
        // already used, so nothing that previously "worked" via mock data
        // silently breaks once the app switches to hitting this endpoint.
        DB::table('parents')
            ->whereNull('password')
            ->update(['password' => Hash::make('parent2026')]);
    }

    public function down(): void
    {
        Schema::table('parents', function (Blueprint $table) {
            $table->dropColumn('password');
        });
    }
};
