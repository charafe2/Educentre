<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('color')->default('#1d4ed8');
            $table->string('bg_color')->default('#dbeafe');
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tenant_id', 'name']);
        });

        // Backfill the catalog from subjects already typed freehand on existing classes,
        // so centres with data don't start with an empty library.
        $now = now();
        DB::table('classes')
            ->select('tenant_id', 'subject')
            ->whereNotNull('subject')
            ->where('subject', '!=', '')
            ->distinct()
            ->orderBy('tenant_id')
            ->get()
            ->each(function ($row) use ($now) {
                DB::table('subjects')->insertOrIgnore([
                    'tenant_id' => $row->tenant_id,
                    'uuid' => (string) Str::uuid(),
                    'name' => $row->subject,
                    'color' => '#1d4ed8',
                    'bg_color' => '#dbeafe',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('subjects');
    }
};
