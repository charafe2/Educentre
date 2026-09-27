<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique();
            $table->date('period_month');
            $table->decimal('amount', 10, 2);
            $table->string('method')->nullable();
            $table->date('paid_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'teacher_id', 'period_month'], 'teacher_payments_tenant_teacher_period_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_payments');
    }
};
