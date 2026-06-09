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
            $table->dropForeign(['class_session_id']);
            $table->dropForeign(['student_id']);
            $table->dropUnique(['class_session_id', 'student_id']);
            $table->date('attended_on')->nullable()->after('student_id');
        });

        DB::table('session_attendances')->update([
            'attended_on' => DB::raw('DATE(created_at)'),
        ]);

        Schema::table('session_attendances', function (Blueprint $table) {
            $table->date('attended_on')->nullable(false)->change();
            $table->foreign('class_session_id')->references('id')->on('class_sessions')->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->unique(['class_session_id', 'student_id', 'attended_on'], 'session_attendance_student_date_unique');
            $table->index(['tenant_id', 'attended_on']);
        });
    }

    public function down(): void
    {
        Schema::table('session_attendances', function (Blueprint $table) {
            $table->dropForeign(['class_session_id']);
            $table->dropForeign(['student_id']);
            $table->dropUnique('session_attendance_student_date_unique');
            $table->dropIndex(['tenant_id', 'attended_on']);
            $table->dropColumn('attended_on');
            $table->unique(['class_session_id', 'student_id']);
            $table->foreign('class_session_id')->references('id')->on('class_sessions')->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
        });
    }
};
