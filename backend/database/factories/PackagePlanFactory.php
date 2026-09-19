<?php

namespace Database\Factories;

use App\Domains\Core\Models\PackagePlan;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PackagePlan> */
class PackagePlanFactory extends Factory
{
    protected $model = PackagePlan::class;

    public function definition(): array
    {
        return [
            'name' => ucfirst($this->faker->unique()->words(2, true)),
            'monthly_price' => $this->faker->randomFloat(2, 50, 2000),
            'users_limit' => $this->faker->numberBetween(1, 100),
            'students_limit' => $this->faker->numberBetween(10, 10000),
            'storage_gb' => $this->faker->numberBetween(1, 500),
            'support_level' => $this->faker->randomElement(['Standard', 'Prioritaire', 'Dédié']),
            'status' => 'active',
            'features' => $this->faker->randomElements(['SLA', 'API', 'Support 24/7', 'Rapports avancés'], 2),
        ];
    }
}
