<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            // Per-student, per-class price override — null means "inherit
            // the group's (or class's) own price", same override convention
            // as Group.monthly_price over Class.monthly_price.
            $table->decimal('custom_price', 10, 2)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropColumn('custom_price');
        });
    }
};
