<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_session_id')->constrained('class_sessions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique()->default(DB::raw('(UUID())'));
            $table->string('status', 20)->default('present');
            $table->string('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['class_session_id', 'student_id']);
            $table->index(['tenant_id', 'student_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_attendances');
    }
};
