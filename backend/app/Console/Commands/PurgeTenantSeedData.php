<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Database\Seeders\SubjectSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Hands a seeded centre back to its owner: removes the demo students
 * (parents, enrollments, payments and attendances cascade), demo classes,
 * rooms, and detaches the seeded subjects and academic levels so the centre
 * configures its own. Teachers are kept. Only rows the seeders tag are
 * touched. Dry run by default.
 */
class PurgeTenantSeedData extends Command
{
    protected $signature = 'tenant:purge-seed-data
        {slug : Slug of the centre to clean (e.g. annour)}
        {--force : Actually delete (otherwise only lists what would be deleted)}';

    protected $description = 'Remove seeded students, subjects and academic levels from a centre';

    public function handle(): int
    {
        $tenant = Tenant::query()->where('slug', $this->argument('slug'))->first();

        if (! $tenant) {
            $this->error(sprintf('Aucun centre avec le slug « %s ».', $this->argument('slug')));

            return self::FAILURE;
        }

        $students = DB::table('students')
            ->where('tenant_id', $tenant->id)
            ->where('student_code', 'like', 'DEMO-%');
        $classes = DB::table('classes')
            ->where('tenant_id', $tenant->id)
            ->where('name', 'like', 'Démo · %');
        $rooms = DB::table('rooms')
            ->where('tenant_id', $tenant->id)
            ->where('name', 'like', 'Démo · %');
        $subjects = DB::table('subject_tenant')
            ->where('tenant_id', $tenant->id)
            ->whereIn('subject_id', DB::table('subjects')
                ->whereIn('name', array_keys(SubjectSeeder::SUBJECTS))
                ->select('id'));
        $levels = DB::table('academic_level_tenant')
            ->where('tenant_id', $tenant->id)
            ->whereIn('academic_level_id', DB::table('academic_levels')
                ->whereIn(DB::raw('lower(trim(name))'), array_map(
                    fn (string $name) => mb_strtolower($name),
                    PurgeSeededAcademicLevels::SEEDED_LEVEL_NAMES,
                ))
                ->select('id'));

        $this->table(['Donnée', 'Lignes'], [
            ['Élèves démo (+ parents, paiements, présences)', $students->count()],
            ['Classes démo (+ séances, groupes)', $classes->count()],
            ['Salles démo', $rooms->count()],
            ['Matières assignées', $subjects->count()],
            ['Niveaux assignés', $levels->count()],
        ]);

        if (! $this->option('force')) {
            $this->warn(sprintf('Simulation pour « %s ». Relancez avec --force pour appliquer.', $tenant->name));

            return self::SUCCESS;
        }

        DB::transaction(function () use ($students, $classes, $rooms, $subjects, $levels) {
            $students->delete();
            $classes->delete();
            $rooms->delete();
            $subjects->delete();
            $levels->delete();
        });

        $this->info(sprintf('Centre « %s » nettoyé : élèves, matières et niveaux retirés.', $tenant->name));

        return self::SUCCESS;
    }
}
