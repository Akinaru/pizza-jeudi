const form = document.getElementById('order-form');
const ordersList = document.getElementById('orders-list');
const formMessage = document.getElementById('form-message');
const reservationDate = document.getElementById('reservation-date');

const pizzaNames = {
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

const pizzaIcons = {
  focaccia: '🍞',
  margherita: '🍅',
  napoletana: '🐟',
  capricciosa: '🍄',
  rucola: '🥬',
  vegetariana: '🥕',
  parmigiana: '🧀',
  regina: '👑',
  salmone: '🐠',
  calabrese: '🌶️',
  inferno: '🔥',
  quattroFormaggi: '🧀',
  laStoria: '⭐',
  campana: '🍃',
  genovese: '🌿',
  alTonno: '🐟'
};

const pizzaOrder = Object.keys(pizzaNames);

function formatDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function renderOrders(orders) {
  ordersList.innerHTML = '';
  const grouped = new Map();

  pizzaOrder.forEach((key) => grouped.set(key, { count: 0, names: [] }));

  orders.forEach((order) => {
    if (!Array.isArray(order.pizzas)) return;
    order.pizzas.forEach((pizzaKey) => {
      const bucket = grouped.get(pizzaKey);
      if (!bucket) return;
      bucket.count += 1;
      bucket.names.push(order.name);
    });
  });

  let hasOrder = false;
  pizzaOrder.forEach((pizzaKey) => {
    const bucket = grouped.get(pizzaKey);
    if (!bucket || bucket.count === 0) return;
    hasOrder = true;

    const li = document.createElement('li');
    li.className = 'order-item';

    const uniqueNames = [...new Set(bucket.names)].join(', ');
    li.innerHTML = `
      <div class="order-item-title">${pizzaIcons[pizzaKey] || '🍕'} ${pizzaNames[pizzaKey]} <span class="order-count">x${bucket.count}</span></div>
      <div class="order-item-names">(${uniqueNames})</div>
    `;

    ordersList.appendChild(li);
  });

  if (!hasOrder) {
    const li = document.createElement('li');
    li.textContent = 'Aucune commande pour le moment.';
    ordersList.appendChild(li);
  }
}

async function loadOrders() {
  const res = await fetch('./api.php');
  const data = await res.json();
  renderOrders(data.orders || []);
  if (data.reservationDate) {
    reservationDate.textContent = `Réservations pour ${formatDate(data.reservationDate)}`;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';

  const name = document.getElementById('name').value.trim();
  const pizzas = Array.from(document.querySelectorAll('input[name="pizzas"]:checked')).map((input) => input.value);

  if (!name || pizzas.length === 0) {
    formMessage.textContent = 'Nom + au moins 1 pizza.';
    return;
  }

  const res = await fetch('./api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pizzas })
  });

  if (!res.ok) {
    formMessage.textContent = 'Erreur enregistrement.';
    return;
  }

  form.reset();
  formMessage.textContent = 'Commande enregistrée.';
  await loadOrders();
});

loadOrders().catch(() => {
  formMessage.textContent = 'API indisponible.';
});
