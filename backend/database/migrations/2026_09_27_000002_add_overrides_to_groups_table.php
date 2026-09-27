<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-group overrides of its class's teacher/room/price — null means
     * "inherits from the class" (every existing group keeps working
     * unchanged). Lets two groups of the same class have their own teacher,
     * room and price, matching the redesigned Groupes page.
     */
    public function up(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->foreignId('teacher_id')->nullable()->after('class_id')->constrained()->nullOnDelete();
            $table->foreignId('room_id')->nullable()->after('teacher_id')->constrained()->nullOnDelete();
            $table->decimal('monthly_price', 10, 2)->nullable()->after('room_id');
        });
    }

    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropConstrainedForeignId('teacher_id');
            $table->dropConstrainedForeignId('room_id');
            $table->dropColumn('monthly_price');
        });
    }
};
