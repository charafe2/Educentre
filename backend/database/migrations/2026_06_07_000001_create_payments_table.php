<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->uuid('uuid')->unique();
            $table->date('period_month');
            $table->decimal('amount', 10, 2);
            $table->string('status')->default('pending');
            $table->string('method')->nullable();
            $table->date('paid_at')->nullable();
            $table->text('note')->nullable();
            $table->boolean('invoice_generated')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(
                ['tenant_id', 'student_id', 'class_id', 'period_month'],
                'payments_tenant_student_class_period_unique'
            );
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'period_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
