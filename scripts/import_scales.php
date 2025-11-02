<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from the command line.\n");
    exit(1);
}

require __DIR__ . '/../vendor/autoload.php';

$defaultSource = __DIR__ . '/index.html';
$defaultDb = __DIR__ . '/../storage/musiclab.sqlite';

$sourceFile = $defaultSource;
$dbFile = $defaultDb;

foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--help' || $arg === '-h') {
        fwrite(STDERR, "Usage: php scripts/import_scales.php [source.html] [database.sqlite]\n");
        fwrite(STDERR, "       php scripts/import_scales.php --source=path/index.html --db=path/musiclab.sqlite\n");
        exit(0);
    }

    if (strpos($arg, '--source=') === 0) {
        $sourceFile = substr($arg, 9);
        continue;
    }

    if (strpos($arg, '--db=') === 0) {
        $dbFile = substr($arg, 6);
        continue;
    }

    if ($sourceFile === $defaultSource) {
        $sourceFile = $arg;
        continue;
    }

    if ($dbFile === $defaultDb) {
        $dbFile = $arg;
        continue;
    }

    fwrite(STDERR, "Unrecognized argument: {$arg}\n");
    exit(1);
}

if (!is_readable($sourceFile)) {
    fwrite(STDERR, "Unable to read source file: {$sourceFile}\n");
    exit(1);
}

$html = file_get_contents($sourceFile);
if ($html === false) {
    fwrite(STDERR, "Failed to load source file: {$sourceFile}\n");
    exit(1);
}

if (!preg_match('/const\s+scaleMap\s*=\s*(\{.*?\});/s', $html, $matches)) {
    fwrite(STDERR, "Could not locate a scaleMap object literal in the provided file.\n");
    exit(1);
}

$objectLiteral = trim($matches[1]);
$objectLiteral = preg_replace('/\/{2}.*$/m', '', $objectLiteral) ?? $objectLiteral;
$objectLiteral = rtrim($objectLiteral, ';');
$objectLiteral = preg_replace_callback(
    '/([,{]\s*)([A-Za-z0-9_]+)\s*:/',
    static fn(array $m): string => $m[1] . '"' . $m[2] . '":',
    $objectLiteral
) ?? $objectLiteral;
$objectLiteral = preg_replace('/,(\s*[}\]])/', '$1', $objectLiteral) ?? $objectLiteral;

$data = json_decode($objectLiteral, true);
if ($data === null) {
    fwrite(STDERR, 'JSON decode error: ' . json_last_error_msg() . "\n");
    exit(1);
}

$dbDirectory = dirname($dbFile);
if (!is_dir($dbDirectory) && !mkdir($dbDirectory, 0777, true) && !is_dir($dbDirectory)) {
    fwrite(STDERR, "Failed to create database directory: {$dbDirectory}\n");
    exit(1);
}

try {
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    fwrite(STDERR, 'Failed to open SQLite database: ' . $e->getMessage() . "\n");
    exit(1);
}

$schemaPath = __DIR__ . '/../database/schema.sql';
if (!is_readable($schemaPath)) {
    fwrite(STDERR, "Unable to read schema definition at {$schemaPath}\n");
    exit(1);
}

$schemaSql = file_get_contents($schemaPath);
if ($schemaSql === false) {
    fwrite(STDERR, 'Failed to load schema SQL.' . "\n");
    exit(1);
}

$pdo->exec($schemaSql);

$pdo->beginTransaction();
$pdo->exec('DELETE FROM scale_degrees');
$pdo->exec('DELETE FROM scales');

$insertScale = $pdo->prepare('INSERT INTO scales (id, name, size) VALUES (:id, :name, :size)');
$insertDegree = $pdo->prepare('INSERT INTO scale_degrees (scale_id, position, semitone) VALUES (:scale_id, :position, :semitone)');

$count = 0;

foreach ($data as $scaleId => $scale) {
    if (!is_array($scale)) {
        continue;
    }

    $name = isset($scale['name']) ? (string) $scale['name'] : $scaleId;
    $size = isset($scale['size']) ? (int) $scale['size'] : (is_array($scale['degrees'] ?? null) ? count($scale['degrees']) : 0);
    $degrees = array_values(array_map('intval', $scale['degrees'] ?? []));

    $insertScale->execute([
        ':id' => $scaleId,
        ':name' => $name,
        ':size' => $size,
    ]);

    foreach ($degrees as $index => $degree) {
        $insertDegree->execute([
            ':scale_id' => $scaleId,
            ':position' => $index,
            ':semitone' => $degree,
        ]);
    }

    $count++;
}

$pdo->commit();

echo "Imported {$count} scales into {$dbFile}.\n";
