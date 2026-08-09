<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('package_plans', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name')->unique();
            $table->decimal('monthly_price', 10, 2)->default(0);
            $table->unsignedInteger('users_limit')->default(0);
            $table->unsignedInteger('students_limit')->default(0);
            $table->unsignedInteger('storage_gb')->default(0);
            $table->string('support_level')->default('Standard');
            $table->string('status')->default('draft');
            $table->json('features')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_plans');
    }
};
