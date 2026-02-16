const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'orders.json');

const MENU = {
  focaccia: 'Focaccia',
  margherita: 'Margherita',
  napoletana: 'Napoletana',
  capricciosa: 'Capricciosa',
  rucola: 'Rucola',
  vegetariana: 'Vegetariana',
  parmigiana: 'Parmigiana',
  regina: 'Regina',
  salmone: 'Salmone',
  calabrese: 'Calabrese',
  inferno: 'Inferno',
  quattroFormaggi: '4 Formaggi',
  laStoria: 'La Storia',
  campana: 'Campana',
  genovese: 'Genovese',
  alTonno: 'Al Tonno'
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

async function ensureDataFile() {
  try {
    await fsp.access(DATA_FILE);
  } catch {
    await fsp.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fsp.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readOrders() {
  await ensureDataFile();
  const raw = await fsp.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOrders(orders) {
  await fsp.writeFile(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function getNextThursdayDateString() {
  const today = new Date();
  const day = today.getDay(); // 0 dimanche, 4 jeudi
  const diff = (4 - day + 7) % 7 || 7;
  const nextThursday = new Date(today);
  nextThursday.setDate(today.getDate() + diff);
  return nextThursday.toISOString().slice(0, 10);
}

async function handleApi(req, res) {
  if (req.method === 'GET' && req.url === '/api/orders') {
    const orders = await readOrders();
    sendJson(res, 200, { orders, reservationDate: getNextThursdayDateString() });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/orders') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.socket.destroy();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const name = String(payload.name || '').trim();
        const pizzas = Array.isArray(payload.pizzas) ? payload.pizzas.filter(Boolean) : [];

        if (!name) {
          sendJson(res, 400, { error: 'Le nom est obligatoire.' });
          return;
        }

        if (pizzas.length === 0) {
          sendJson(res, 400, { error: 'Choisis au moins une pizza.' });
          return;
        }

        const invalidPizza = pizzas.find((pizza) => !MENU[pizza]);
        if (invalidPizza) {
          sendJson(res, 400, { error: 'Pizza invalide.' });
          return;
        }

        const orders = await readOrders();
        const newOrder = {
          id: Date.now(),
          name,
          pizzas,
          createdAt: new Date().toISOString(),
          reservationFor: getNextThursdayDateString()
        };

        orders.push(newOrder);
        await writeOrders(orders);
        sendJson(res, 201, { order: newOrder });
      } catch {
        sendJson(res, 400, { error: 'JSON invalide.' });
      }
    });

    return;
  }

  sendJson(res, 404, { error: 'Route API introuvable.' });
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end();
    return;
  }

  if (req.url.startsWith('/api/')) {
    await handleApi(req, res);
    return;
  }

  const cleanPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(PUBLIC_DIR, cleanPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
