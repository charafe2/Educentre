<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\SuperAdmin\Models\PackagePlan;
use Illuminate\Database\Eloquent\Collection;

class PackagePlanService
{
    public function all(): Collection
    {
        $this->ensureDefaultsExist();

        return PackagePlan::query()
            ->orderByRaw("case status when 'active' then 1 when 'draft' then 2 else 3 end")
            ->orderBy('monthly_price')
            ->get();
    }

    public function create(array $data): PackagePlan
    {
        return PackagePlan::create($this->attributes($data));
    }

    public function update(PackagePlan $packagePlan, array $data): PackagePlan
    {
        $packagePlan->update($this->attributes($data));

        return $packagePlan->refresh();
    }

    public function delete(PackagePlan $packagePlan): void
    {
        $packagePlan->delete();
    }

    public function ensureDefaultsExist(): void
    {
        if (PackagePlan::query()->exists()) {
            return;
        }

        foreach ($this->defaultPlans() as $plan) {
            PackagePlan::create($this->attributes($plan));
        }
    }

    private function attributes(array $data): array
    {
        return [
            'name' => $data['name'],
            'monthly_price' => $data['monthlyPrice'],
            'users_limit' => $data['usersLimit'],
            'students_limit' => $data['studentsLimit'],
            'storage_gb' => $data['storageGb'],
            'support_level' => $data['supportLevel'],
            'status' => $data['status'],
            'features' => array_values($data['features'] ?? []),
        ];
    }

    private function defaultPlans(): array
    {
        return [
            [
                'name' => 'Basique',
                'monthlyPrice' => 690,
                'usersLimit' => 3,
                'studentsLimit' => 120,
                'storageGb' => 5,
                'supportLevel' => 'Standard',
                'status' => 'active',
                'features' => ['Gestion étudiants', 'Paiements parents', 'Planning simple'],
            ],
            [
                'name' => 'Pro',
                'monthlyPrice' => 1490,
                'usersLimit' => 12,
                'studentsLimit' => 600,
                'storageGb' => 25,
                'supportLevel' => 'Prioritaire',
                'status' => 'active',
                'features' => ['Analytiques avancées', 'Documents', 'Présence détaillée', 'Portail parents'],
            ],
            [
                'name' => 'Enterprise',
                'monthlyPrice' => 2990,
                'usersLimit' => 40,
                'studentsLimit' => 2500,
                'storageGb' => 100,
                'supportLevel' => 'Dédié',
                'status' => 'active',
                'features' => ['Multi-sites', 'Exports avancés', 'Accompagnement dédié', 'Contrôles d’accès'],
            ],
        ];
    }
}
