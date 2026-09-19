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
            $table->uuid('uuid')->unique();
            $table->string('invoice_number')->unique();

            // Restricted: billing records must never be orphaned by deleting a centre.
            $table->foreignId('centre_id')->nullable()->constrained('centres')->restrictOnDelete();
            // Nulled: the plan may go away, but package_name preserves what was billed.
            $table->foreignId('package_plan_id')->nullable()->constrained('package_plans')->nullOnDelete();
            $table->string('package_name');

            $table->decimal('amount', 10, 2)->default(0);
            $table->date('issued_at');
            $table->date('due_date');
            $table->timestamp('paid_at')->nullable();
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('centre_invoices');
    }
};
