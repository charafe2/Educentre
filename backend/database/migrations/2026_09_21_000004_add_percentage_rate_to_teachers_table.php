<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Third payment mode: `percentage` earns the teacher a share of what
     * each assigned student actually pays for their class (percentage_rate
     * × the class's monthly_price), as opposed to `per_student`'s flat rate
     * regardless of what the student pays. `payment_mode` is a plain string
     * column (no DB-level enum), so only the new numeric column is needed
     * here — validation is what actually restricts the allowed values.
     */
    public function up(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->decimal('percentage_rate', 5, 2)->nullable()->after('rate_per_student');
        });
    }

    public function down(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn('percentage_rate');
        });
    }
};
