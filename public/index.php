<?php

declare(strict_types=1);

use PDO;
use PDOException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();

$dbPath = __DIR__ . '/../storage/musiclab.sqlite';

$app->get('/', function (ServerRequestInterface $request, ResponseInterface $response): ResponseInterface {
	$response->getBody()->write('<div id="root">React app placeholder</div>');

	return $response->withHeader('Content-Type', 'text/html; charset=utf-8');
});

$app->get('/api/scales', function (ServerRequestInterface $request, ResponseInterface $response) use ($dbPath): ResponseInterface {
	if (!extension_loaded('pdo_sqlite')) {
		$payload = json_encode(['error' => 'Missing pdo_sqlite extension'], JSON_PRETTY_PRINT) ?: '';
		$response->getBody()->write($payload);

		return $response
			->withStatus(500)
			->withHeader('Content-Type', 'application/json; charset=utf-8');
	}

	if (!is_file($dbPath)) {
		$payload = json_encode(['error' => 'Scale catalog database not found', 'hint' => 'Run scripts/import_scales.php to seed data'], JSON_PRETTY_PRINT) ?: '';
		$response->getBody()->write($payload);

		return $response
			->withStatus(503)
			->withHeader('Content-Type', 'application/json; charset=utf-8');
	}

	try {
		$pdo = new PDO('sqlite:' . $dbPath, null, null, [
			PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
			PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
		]);
	} catch (PDOException $exception) {
		$payload = json_encode(['error' => 'Failed to connect to scale catalog', 'details' => $exception->getMessage()], JSON_PRETTY_PRINT) ?: '';
		$response->getBody()->write($payload);

		return $response
			->withStatus(500)
			->withHeader('Content-Type', 'application/json; charset=utf-8');
	}

	$query = <<<'SQL'
		SELECT s.id,
		       s.name,
		       s.size,
		       d.position,
		       d.semitone
		FROM scales s
		LEFT JOIN scale_degrees d ON d.scale_id = s.id
		ORDER BY s.name COLLATE NOCASE, d.position ASC
	SQL;

	$rows = $pdo->query($query)->fetchAll();
	$scales = [];

	foreach ($rows as $row) {
		$scaleId = $row['id'];

		if (!isset($scales[$scaleId])) {
			$scales[$scaleId] = [
				'id' => $scaleId,
				'name' => $row['name'],
				'size' => (int) $row['size'],
				'degrees' => [],
			];
		}

		if ($row['semitone'] !== null) {
			$scales[$scaleId]['degrees'][] = (int) $row['semitone'];
		}
	}

	$payload = json_encode(['scales' => array_values($scales)], JSON_PRETTY_PRINT);

	if ($payload === false) {
		$response->getBody()->write(json_encode(['error' => 'Unable to encode scale data']));

		return $response
			->withStatus(500)
			->withHeader('Content-Type', 'application/json; charset=utf-8');
	}

	$response->getBody()->write($payload);

	return $response->withHeader('Content-Type', 'application/json; charset=utf-8');
});

$app->run();
