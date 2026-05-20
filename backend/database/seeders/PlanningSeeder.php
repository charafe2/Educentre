<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Domains\Planning\Models\Room;
use App\Domains\Planning\Models\CourseClass;
use App\Domains\Teachers\Models\Teacher;
use Illuminate\Database\Seeder;

class PlanningSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::first();

        $room1 = Room::create(['tenant_id' => $tenant->id, 'name' => 'Salle 1', 'capacity' => 20, 'is_active' => true]);
        $room2 = Room::create(['tenant_id' => $tenant->id, 'name' => 'Salle 2', 'capacity' => 15, 'is_active' => true]);
        $room3 = Room::create(['tenant_id' => $tenant->id, 'name' => 'Salle 3', 'capacity' => 18, 'is_active' => true]);
        $room4 = Room::create(['tenant_id' => $tenant->id, 'name' => 'Salle 4', 'capacity' => 12, 'is_active' => true]);

        $teachers = Teacher::all();
        if ($teachers->isEmpty()) {
            $user1 = \App\Models\User::where('email', 'admin@moujtahid.ma')->first();
            $user2 = \App\Models\User::where('email', 'manager@moujtahid.ma')->first();
            $teacher1 = Teacher::create(['tenant_id' => $tenant->id, 'user_id' => $user1->id, 'specialty' => 'Mathématiques', 'payment_mode' => 'fixed', 'is_active' => true]);
            $teacher2 = Teacher::create(['tenant_id' => $tenant->id, 'user_id' => $user2->id, 'specialty' => 'Physique-Chimie', 'payment_mode' => 'fixed', 'is_active' => true]);
            $teacher3 = Teacher::create(['tenant_id' => $tenant->id, 'user_id' => $user1->id, 'specialty' => 'Français', 'payment_mode' => 'fixed', 'is_active' => true]);
            $teachers = collect([$teacher1, $teacher2, $teacher3]);
        }

        $classes = [
            ['name' => 'Maths 2Bac A', 'subject' => 'Mathématiques', 'level' => '2ème Bac', 'teacher' => $teachers[0], 'room' => $room1, 'price' => 350, 'capacity' => 15],
            ['name' => 'Physique 2Bac', 'subject' => 'Physique-Chimie', 'level' => '2ème Bac', 'teacher' => $teachers[1], 'room' => $room2, 'price' => 320, 'capacity' => 12],
            ['name' => 'Français 3ème', 'subject' => 'Français', 'level' => '3ème Collège', 'teacher' => $teachers[2], 'room' => $room3, 'price' => 280, 'capacity' => 18],
            ['name' => 'Arabe TC', 'subject' => 'Arabe', 'level' => 'Tronc Commun', 'teacher' => $teachers[0], 'room' => $room1, 'price' => 300, 'capacity' => 20],
            ['name' => 'Anglais 1Bac', 'subject' => 'Anglais', 'level' => '1ère Bac', 'teacher' => $teachers[1], 'room' => $room4, 'price' => 310, 'capacity' => 15],
            ['name' => 'SVT 1Bac', 'subject' => 'SVT', 'level' => '1ère Bac', 'teacher' => $teachers[2], 'room' => $room3, 'price' => 290, 'capacity' => 10],
        ];

        foreach ($classes as $c) {
            CourseClass::create([
                'tenant_id' => $tenant->id,
                'teacher_id' => $c['teacher']->id,
                'room_id' => $c['room']->id,
                'name' => $c['name'],
                'subject' => $c['subject'],
                'level' => $c['level'],
                'monthly_price' => $c['price'],
                'max_capacity' => $c['capacity'],
                'is_active' => true,
            ]);
        }
    }
}
