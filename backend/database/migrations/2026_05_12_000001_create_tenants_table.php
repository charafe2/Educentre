<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'))->unique();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('domain')->nullable();
            $table->json('settings')->nullable();
            $table->string('status', 50)->default('active');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};

