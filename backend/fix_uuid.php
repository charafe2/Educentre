<?php
$files = glob(__DIR__ . '/database/migrations/*.php');
foreach ($files as $file) {
    $content = file_get_contents($file);
    $newContent = str_replace(
        "->uuid('uuid')",
        "->uuid('uuid')->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'))",
        $content
    );
    if ($newContent !== $content) {
        file_put_contents($file, $newContent);
        echo "Updated $file\n";
    }
}
echo "Done.\n";
