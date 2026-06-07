<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('session_attendances', function (Blueprint $table) {
            $table->dropUnique(['class_session_id', 'student_id']);
            $table->date('attended_on')->nullable()->after('student_id');
        });

        DB::table('session_attendances')->update([
            'attended_on' => DB::raw('DATE(created_at)'),
        ]);

        Schema::table('session_attendances', function (Blueprint $table) {
            $table->date('attended_on')->nullable(false)->change();
            $table->unique(['class_session_id', 'student_id', 'attended_on'], 'session_attendance_student_date_unique');
            $table->index(['tenant_id', 'attended_on']);
        });
    }

    public function down(): void
    {
        Schema::table('session_attendances', function (Blueprint $table) {
            $table->dropUnique('session_attendance_student_date_unique');
            $table->dropIndex(['tenant_id', 'attended_on']);
            $table->dropColumn('attended_on');
            $table->unique(['class_session_id', 'student_id']);
        });
    }
};
