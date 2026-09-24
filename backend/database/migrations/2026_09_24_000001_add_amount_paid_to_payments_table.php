<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Needed for the new `partial` payment status: `amount` alone can't
     * distinguish "owed" from "paid so far". Defaults to 0 for every
     * existing row (all of which are fully paid/pending/overdue already,
     * never partial, so no backfill is needed).
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('amount_paid', 10, 2)->default(0)->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('amount_paid');
        });
    }
};
