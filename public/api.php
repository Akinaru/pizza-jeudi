<?php
header('Content-Type: application/json; charset=utf-8');

$ordersFile = __DIR__ . '/orders.json';
$menu = [
  'focaccia',
  'margherita',
  'napoletana',
  'capricciosa',
  'rucola',
  'vegetariana',
  'parmigiana',
  'regina',
  'salmone',
  'calabrese',
  'inferno',
  'quattroFormaggi',
  'laStoria',
  'campana',
  'genovese',
  'alTonno'
];

if (!file_exists($ordersFile)) {
  file_put_contents($ordersFile, "[]\n");
}

function respond($status, $payload) {
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

function readOrders($ordersFile) {
  $raw = @file_get_contents($ordersFile);
  if ($raw === false || trim($raw) === '') {
    return [];
  }

  $parsed = json_decode($raw, true);
  return is_array($parsed) ? $parsed : [];
}

function nextThursday() {
  $today = new DateTime('today');
  $day = (int)$today->format('w');
  $diff = (4 - $day + 7) % 7;
  if ($diff === 0) {
    $diff = 7;
  }
  $today->modify('+' . $diff . ' day');
  return $today->format('Y-m-d');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
  respond(200, [
    'orders' => readOrders($ordersFile),
    'reservationDate' => nextThursday()
  ]);
}

if ($method !== 'POST') {
  respond(405, ['error' => 'Méthode non autorisée']);
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '{}', true);

if (!is_array($payload)) {
  respond(400, ['error' => 'JSON invalide']);
}

$name = trim((string)($payload['name'] ?? ''));
$pizzas = $payload['pizzas'] ?? [];

if ($name === '') {
  respond(400, ['error' => 'Le nom est obligatoire.']);
}

if (!is_array($pizzas) || count($pizzas) === 0) {
  respond(400, ['error' => 'Choisis au moins une pizza.']);
}

foreach ($pizzas as $pizza) {
  if (!in_array($pizza, $menu, true)) {
    respond(400, ['error' => 'Pizza invalide.']);
  }
}

$fp = fopen($ordersFile, 'c+');
if ($fp === false) {
  respond(500, ['error' => 'Impossible d\'ouvrir le fichier JSON']);
}

if (!flock($fp, LOCK_EX)) {
  fclose($fp);
  respond(500, ['error' => 'Impossible de verrouiller le fichier JSON']);
}

$raw = stream_get_contents($fp);
$current = json_decode($raw ?: '[]', true);
if (!is_array($current)) {
  $current = [];
}

$order = [
  'id' => (int)round(microtime(true) * 1000),
  'name' => $name,
  'pizzas' => array_values($pizzas),
  'createdAt' => gmdate('c'),
  'reservationFor' => nextThursday()
];

$current[] = $order;

rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($current, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fwrite($fp, "\n");
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

respond(201, ['order' => $order]);
