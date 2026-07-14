<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('centre_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('package_plan_id')->nullable()->constrained('package_plans')->nullOnDelete();
            $table->uuid('uuid')->unique();
            $table->string('invoice_number')->unique();
            $table->string('package_name');
            $table->decimal('amount', 10, 2);
            $table->date('issued_at');
            $table->date('due_date');
            $table->date('paid_at')->nullable();
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('centre_invoices');
    }
};
