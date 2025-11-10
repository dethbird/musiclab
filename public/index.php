<?php

declare(strict_types=1);

use PDO;
use PDOException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();

$assetBaseUri = '/assets';
$manifestPath = __DIR__ . '/assets/manifest.json';
$spaEntry = 'src/main.jsx';

/**
 * Resolve the built SPA asset URLs from the Vite manifest.
 *
 * @return array{scripts: string[], styles: string[], preloads: string[], hasManifest: bool}
 */
function resolveSpaAssets(string $manifestPath, string $entryKey, string $assetBaseUri): array
{
	$normalize = static fn(string $path): string => rtrim($assetBaseUri, '/') . '/' . ltrim($path, '/');

	if (!is_file($manifestPath)) {
		return [
			'scripts' => [],
			'styles' => [],
			'preloads' => [],
			'hasManifest' => false,
		];
	}

	$manifestJson = file_get_contents($manifestPath);
	$manifest = $manifestJson !== false ? json_decode($manifestJson, true) : null;

	if (!is_array($manifest) || !isset($manifest[$entryKey])) {
		return [
			'scripts' => [],
			'styles' => [],
			'preloads' => [],
			'hasManifest' => true,
		];
	}

	$entry = $manifest[$entryKey];
	$scripts = [];
	$styles = [];
	$preloads = [];

	if (isset($entry['file'])) {
		$scripts[] = $normalize((string) $entry['file']);
	}

	foreach ($entry['css'] ?? [] as $css) {
		$styles[] = $normalize((string) $css);
	}

	foreach ($entry['imports'] ?? [] as $importKey) {
		if (!isset($manifest[$importKey])) {
			continue;
		}

		$importEntry = $manifest[$importKey];

		if (isset($importEntry['file'])) {
			$preloads[] = $normalize((string) $importEntry['file']);
		}

		foreach ($importEntry['css'] ?? [] as $css) {
			$styles[] = $normalize((string) $css);
		}
	}

	return [
		'scripts' => array_values(array_unique($scripts)),
		'styles' => array_values(array_unique($styles)),
		'preloads' => array_values(array_unique($preloads)),
		'hasManifest' => true,
	];
}

$dbPath = __DIR__ . '/../storage/musiclab.sqlite';

$app->get('/', function (ServerRequestInterface $request, ResponseInterface $response) use ($manifestPath, $spaEntry, $assetBaseUri): ResponseInterface {
	$assets = resolveSpaAssets($manifestPath, $spaEntry, $assetBaseUri);

	$preloadTags = '';
	foreach ($assets['preloads'] as $href) {
		$preloadTags .= '<link rel="modulepreload" href="' . htmlspecialchars($href, ENT_QUOTES) . '">';
	}

	// Favicon links (only emit if files exist in the public assets folder)
	$faviconTags = '';
	$faviconFiles = [
		['path' => __DIR__ . '/assets/favicon.ico', 'tag' => '<link rel="icon" href="%s">'],
		['path' => __DIR__ . '/assets/favicon-192.png', 'tag' => '<link rel="icon" type="image/png" sizes="192x192" href="%s">'],
		['path' => __DIR__ . '/assets/favicon.png', 'tag' => '<link rel="icon" type="image/png" href="%s">'],
		['path' => __DIR__ . '/assets/apple-touch-icon.png', 'tag' => '<link rel="apple-touch-icon" href="%s">'],
	];
	foreach ($faviconFiles as $f) {
		if (is_file($f['path'])) {
			$href = rtrim($assetBaseUri, '/') . '/' . basename($f['path']);
			$faviconTags .= sprintf($f['tag'], htmlspecialchars($href, ENT_QUOTES));
		}
	}

	$styleTags = '';
	foreach ($assets['styles'] as $href) {
		$styleTags .= '<link rel="stylesheet" href="' . htmlspecialchars($href, ENT_QUOTES) . '">';
	}

	$scriptTags = '';
	foreach ($assets['scripts'] as $src) {
		$scriptTags .= '<script type="module" src="' . htmlspecialchars($src, ENT_QUOTES) . '"></script>';
	}

	$bodyFallback = '';
	if ($scriptTags === '') {
		$message = $assets['hasManifest']
			? 'Unable to locate the SPA entry in the manifest. Verify your Vite build configuration.'
			: 'Frontend assets are not built yet. Run <code>npm install</code> and <code>npm run build</code> in the <code>frontend</code> directory.';
		$bodyFallback = '<div class="spa-fallback"><h1>MusicLab</h1><p>' . $message . '</p></div>';
	}

	$html = '<!doctype html>'
		. '<html lang="en">'
		. '<head>'
		. '<meta charset="utf-8">'
		. '<meta name="viewport" content="width=device-width, initial-scale=1">'
		. '<title>MusicLab</title>'
		. $faviconTags
		. $preloadTags
		. $styleTags
		. '</head>'
		. '<body>'
		. '<div id="root">' . $bodyFallback . '</div>'
		. $scriptTags
		. '</body>'
		. '</html>';

	$response->getBody()->write($html);

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
