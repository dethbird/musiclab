<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();

// Basic seed data that will be replaced once the real source of truth is wired up.
$scaleCatalog = [
	[
		'id' => 'major',
		'name' => 'Major',
		'size' => 7,
		'degrees' => [0, 2, 4, 5, 7, 9, 11],
	],
	[
		'id' => 'minor',
		'name' => 'Natural Minor',
		'size' => 7,
		'degrees' => [0, 2, 3, 5, 7, 8, 10],
	],
	[
		'id' => 'dorian',
		'name' => 'Dorian',
		'size' => 7,
		'degrees' => [0, 2, 3, 5, 7, 9, 10],
	],
];

$app->get('/', function (ServerRequestInterface $request, ResponseInterface $response): ResponseInterface {
	$response->getBody()->write('<div id="root">React app placeholder</div>');

	return $response->withHeader('Content-Type', 'text/html; charset=utf-8');
});

$app->get('/api/scales', function (ServerRequestInterface $request, ResponseInterface $response) use ($scaleCatalog): ResponseInterface {
	$payload = json_encode(['scales' => $scaleCatalog], JSON_PRETTY_PRINT);

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
