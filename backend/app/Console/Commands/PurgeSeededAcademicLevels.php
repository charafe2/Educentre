<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-off cleanup: academic levels are now created by hand, per centre. The
 * ones already in the catalog were backfilled from the `level` /
 * `school_level` strings the demo seeders wrote (current and earlier
 * versions of MoroccanDemoSeeder, and PlanningSeeder). Dry run by default.
 */
class PurgeSeededAcademicLevels extends Command
{
    protected $signature = 'academic-levels:purge-seeded
        {--force : Actually delete (otherwise only lists what would be deleted)}
        {--include-used : Also delete levels still used by real (non-demo) classes or students}';

    protected $description = 'Delete the academic levels that were generated from demo seed data';

    public const SEEDED_LEVEL_NAMES = [
        // MoroccanDemoSeeder (current)
        '6ème Année Primaire',
        '3ème Année Collège',
        'Tronc Commun Sciences',
        '1ère Année Bac Sciences Expérimentales',
        '2ème Année Bac Sciences Mathématiques',
        '2ème Année Bac Sciences Économiques',
        'Initiation Informatique',
        'Classes Préparatoires Post-Bac',
        // MoroccanDemoSeeder (before ef38a47) and PlanningSeeder
        '3ème Collège',
        'Tronc Commun',
        '1ère Bac',
        '2ème Bac',
        '2ème Bac Sciences',
        '2ème Bac Gestion',
        'Initiation',
        'Collège',
        'Primaire',
        'Post-Bac',
    ];

    public function handle(): int
    {
        $keys = array_map(fn (string $name) => mb_strtolower($name), self::SEEDED_LEVEL_NAMES);

        $levels = DB::table('academic_levels')
            ->whereNull('deleted_at')
            ->get(['id', 'name'])
            ->filter(fn ($level) => in_array(mb_strtolower(trim($level->name)), $keys, true));

        if ($levels->isEmpty()) {
            $this->info('Aucun niveau issu du seed à supprimer.');

            return self::SUCCESS;
        }

        $toDelete = [];
        $rows = [];

        foreach ($levels as $level) {
            $realUsage = $this->realUsage($level->name);
            $centres = DB::table('academic_level_tenant')->where('academic_level_id', $level->id)->count();
            $delete = $realUsage === 0 || $this->option('include-used');

            if ($delete) {
                $toDelete[] = $level->id;
            }

            $rows[] = [$level->id, $level->name, $centres, $realUsage, $delete ? 'supprimé' : 'conservé (utilisé)'];
        }

        $this->table(['id', 'Niveau', 'Centres', 'Classes/élèves réels', 'Action'], $rows);

        if (! $this->option('force')) {
            $this->warn(sprintf('Simulation : %d niveau(x) seraient supprimés. Relancez avec --force pour appliquer.', count($toDelete)));

            return self::SUCCESS;
        }

        DB::transaction(function () use ($toDelete) {
            DB::table('academic_level_tenant')->whereIn('academic_level_id', $toDelete)->delete();
            // Soft delete: a centre re-creating the same name later gets it
            // restored by AcademicLevelService::addForTenant().
            DB::table('academic_levels')->whereIn('id', $toDelete)->update(['deleted_at' => now()]);
        });

        $this->info(sprintf('%d niveau(x) supprimé(s).', count($toDelete)));

        return self::SUCCESS;
    }

    /**
     * Classes and students outside the demo data set that still use this
     * level name. Demo rows are the ones MoroccanDemoSeeder tags.
     */
    private function realUsage(string $name): int
    {
        $classes = DB::table('classes')
            ->whereNull('deleted_at')
            ->whereRaw('lower(trim(level)) = ?', [mb_strtolower(trim($name))])
            ->where('name', 'not like', 'Démo · %')
            ->count();

        $students = DB::table('students')
            ->whereNull('deleted_at')
            ->whereRaw('lower(trim(school_level)) = ?', [mb_strtolower(trim($name))])
            ->where('student_code', 'not like', 'DEMO-%')
            ->count();

        return $classes + $students;
    }
}
