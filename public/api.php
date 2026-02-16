<?php
header('Content-Type: application/json; charset=utf-8');

$file = __DIR__ . '/orders.json';
if (!file_exists($file)) {
  file_put_contents($file, "[]\n");
}

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

  echo json_encode([
    'orders' => $orders,
    'reservationDate' => $today->format('Y-m-d')
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

if ($method !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

$payload = json_decode(file_get_contents('php://input') ?: '{}', true);
$name = trim((string)($payload['name'] ?? ''));
$pizzas = $payload['pizzas'] ?? [];

if ($name === '' || !is_array($pizzas) || count($pizzas) === 0) {
  http_response_code(400);
  echo json_encode(['error' => 'Données invalides']);
  exit;
}

$fp = fopen($file, 'c+');
if (!$fp) {
  http_response_code(500);
  echo json_encode(['error' => 'Impossible d\'ouvrir orders.json']);
  exit;
}

flock($fp, LOCK_EX);
$raw = stream_get_contents($fp);
$orders = json_decode($raw ?: '[]', true);
if (!is_array($orders)) {
  $orders = [];
}

$order = [
  'id' => (int)round(microtime(true) * 1000),
  'name' => $name,
  'pizzas' => array_values($pizzas),
  'createdAt' => gmdate('c')
];

$orders[] = $order;

rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fwrite($fp, "\n");
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
