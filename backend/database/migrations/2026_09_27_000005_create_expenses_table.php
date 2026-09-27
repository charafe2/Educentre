<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique();
            $table->string('category');
            $table->string('label');
            $table->decimal('amount', 10, 2);
            $table->string('method')->nullable();
            $table->date('expense_date');
            $table->date('period_month');
            $table->boolean('is_recurring')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'period_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
