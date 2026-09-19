<?php

namespace Database\Factories;

use App\Domains\Core\Models\CentreInvoice;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CentreInvoice> */
class CentreInvoiceFactory extends Factory
{
    protected $model = CentreInvoice::class;

    public function definition(): array
    {
        $issuedAt = $this->faker->dateTimeBetween('-1 year', 'now');
        $dueDate = (clone $issuedAt)->modify('+30 days');

        return [
            'invoice_number' => 'FAC-'.$issuedAt->format('Y').'-'.$this->faker->unique()->numerify('####'),
            'centre_id' => null,
            'package_plan_id' => null,
            'package_name' => $this->faker->randomElement(['Starter', 'Pro', 'Enterprise']),
            'amount' => $this->faker->randomFloat(2, 50, 5000),
            'issued_at' => $issuedAt,
            'due_date' => $dueDate,
            'status' => 'pending',
        ];
    }
}
