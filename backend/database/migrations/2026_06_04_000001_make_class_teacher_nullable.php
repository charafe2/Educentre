<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->dropForeign(['teacher_id']);
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->foreignId('teacher_id')->nullable()->change();
            $table->foreign('teacher_id')->references('id')->on('teachers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->dropForeign(['teacher_id']);
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->foreignId('teacher_id')->nullable(false)->change();
            $table->foreign('teacher_id')->references('id')->on('teachers')->cascadeOnDelete();
        });
    }
};
