<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-off repair for the duplicate "G2" bug (fixed in 659a865): renumbers
 * the groups of every class that has two groups sharing a number to
 * 1..n, oldest group first. Classes without duplicates are left alone.
 * Dry run by default.
 */
class RenumberDuplicateGroups extends Command
{
    protected $signature = 'groups:renumber-duplicates
        {--force : Actually renumber (otherwise only lists what would change)}';

    protected $description = 'Renumber the groups of classes that have duplicate group numbers';

    public function handle(): int
    {
        $classIds = DB::table('groups')
            ->whereNull('deleted_at')
            ->select('class_id')
            ->groupBy('class_id', 'group_number')
            ->havingRaw('count(*) > 1')
            ->pluck('class_id')
            ->unique()
            ->values();

        if ($classIds->isEmpty()) {
            $this->info('Aucune classe avec des numéros de groupe en double.');

            return self::SUCCESS;
        }

        $changes = [];
        $rows = [];

        foreach ($classIds as $classId) {
            $groups = DB::table('groups')
                ->whereNull('deleted_at')
                ->where('class_id', $classId)
                ->orderBy('group_number')
                ->orderBy('id')
                ->get(['id', 'group_number']);

            $className = DB::table('classes')->where('id', $classId)->value('name');
            $before = $groups->map(fn ($group) => 'G'.$group->group_number)->implode(', ');
            $after = $groups->keys()->map(fn ($index) => 'G'.($index + 1))->implode(', ');

            foreach ($groups->values() as $index => $group) {
                if ($group->group_number !== $index + 1) {
                    $changes[$group->id] = $index + 1;
                }
            }

            $rows[] = [$classId, $className, $before, $after];
        }

        $this->table(['Classe', 'Nom', 'Avant', 'Après'], $rows);

        if (! $this->option('force')) {
            $this->warn(sprintf('Simulation : %d groupe(s) seraient renumérotés. Relancez avec --force pour appliquer.', count($changes)));

            return self::SUCCESS;
        }

        DB::transaction(function () use ($changes) {
            foreach ($changes as $groupId => $number) {
                DB::table('groups')->where('id', $groupId)->update(['group_number' => $number, 'updated_at' => now()]);
            }
        });

        $this->info(sprintf('%d groupe(s) renuméroté(s).', count($changes)));

        return self::SUCCESS;
    }
}
