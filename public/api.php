<?php
header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

set_error_handler(static function (int $severity, string $message, string $file, int $line): void {
  throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
  $file = __DIR__ . '/orders.json';
  if (!file_exists($file)) {
    file_put_contents($file, "[]\n");
  }

  $allowedPizzas = [
    'focaccia', 'margherita', 'napoletana', 'capricciosa', 'rucola', 'vegetariana', 'parmigiana',
    'regina', 'salmone', 'calabrese', 'inferno', 'quattroFormaggi', 'laStoria', 'campana', 'genovese', 'alTonno'
  ];

  $allowedSupplements = ['bufala', 'bresaola', 'jambonParme', 'saumon', 'jambonBlanc', 'anchois', 'bufalanBresaola'];

  $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

  if ($method === 'GET') {
    $orders = json_decode(file_get_contents($file) ?: '[]', true);
    if (!is_array($orders)) {
      $orders = [];
    }

    $today = new DateTime('today');
    $day = (int)$today->format('w');
    $diff = (4 - $day + 7) % 7;
    if ($diff === 0) {
      $diff = 7;
    }
    $today->modify('+' . $diff . ' day');

    respond(200, [
      'orders' => $orders,
      'reservationDate' => $today->format('Y-m-d')
    ]);
  }

  if ($method !== 'POST') {
    respond(405, ['error' => 'Method not allowed']);
  }

  $rawBody = file_get_contents('php://input') ?: '{}';
  $payload = json_decode($rawBody, true);
  if (!is_array($payload)) {
    respond(400, ['error' => 'JSON invalide']);
  }

  $name = trim((string)($payload['name'] ?? ''));
  $items = $payload['items'] ?? null;

  if ($name === '' || !is_array($items) || count($items) === 0) {
    respond(400, ['error' => 'Données invalides']);
  }

  $normalizedItems = [];
  foreach ($items as $item) {
    if (!is_array($item)) {
      respond(400, ['error' => 'Item invalide']);
    }

    $key = (string)($item['key'] ?? '');
    if (!in_array($key, $allowedPizzas, true)) {
      respond(400, ['error' => 'Pizza invalide']);
    }

    $calzone = !empty($item['calzone']);
    $supplements = $item['supplements'] ?? [];
    if (!is_array($supplements)) {
      $supplements = [];
    }

    $cleanSupp = [];
    foreach ($supplements as $supp) {
      if (in_array($supp, $allowedSupplements, true)) {
        $cleanSupp[] = $supp;
      }
    }

    $normalizedItems[] = [
      'key' => $key,
      'calzone' => $calzone,
      'supplements' => array_values(array_unique($cleanSupp))
    ];
  }

  $fp = fopen($file, 'c+');
  if (!$fp) {
    throw new RuntimeException('Impossible d\'ouvrir orders.json');
  }

  if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    throw new RuntimeException('Impossible de verrouiller orders.json');
  }

  $raw = stream_get_contents($fp);
  $orders = json_decode($raw ?: '[]', true);
  if (!is_array($orders)) {
    $orders = [];
  }

  $orders[] = [
    'id' => (int)round(microtime(true) * 1000),
    'name' => $name,
    'items' => $normalizedItems,
    'createdAt' => gmdate('c')
  ];

  rewind($fp);
  ftruncate($fp, 0);
  fwrite($fp, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  fwrite($fp, "\n");
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);

  respond(200, ['ok' => true]);
} catch (Throwable $e) {
  respond(500, ['error' => $e->getMessage()]);
}
