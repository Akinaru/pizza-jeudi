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

  if (!orders.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Aucune commande pour le moment.';
    ordersList.appendChild(empty);
    return;
  }

  const grouped = new Map();
  pizzaOrder.forEach((pizzaKey) => {
    grouped.set(pizzaKey, { count: 0, names: [] });
  });

  orders.forEach((order) => {
    if (!Array.isArray(order.pizzas)) return;

    order.pizzas.forEach((pizzaKey) => {
      const group = grouped.get(pizzaKey);
      if (!group) return;
      group.count += 1;
      group.names.push(order.name);
    });
  });

  let hasAtLeastOneOrder = false;

  pizzaOrder.forEach((pizzaKey) => {
    const group = grouped.get(pizzaKey);
    if (!group.count) {
      return;
    }

    hasAtLeastOneOrder = true;
    const li = document.createElement('li');
    li.className = 'order-item';
    const pizzaLabel = pizzaNames[pizzaKey];
    const icon = pizzaIcons[pizzaKey] || '🍕';
    const uniqueNames = [...new Set(group.names)];
    li.innerHTML = `
      <div class="order-item-title">${icon} ${pizzaLabel} <span class="order-count">x${group.count}</span></div>
      <div class="order-item-names">(${uniqueNames.join(', ')})</div>
    `;
    ordersList.appendChild(li);
  });

  if (!hasAtLeastOneOrder) {
    const empty = document.createElement('li');
    empty.textContent = 'Aucune commande pour le moment.';
    ordersList.appendChild(empty);
  }
}

async function loadOrders() {
  try {
    const response = await fetch('./api.php');
    const data = await response.json();
    renderOrders(data.orders || []);

    if (data.reservationDate) {
      reservationDate.textContent = `Réservations pour ${formatDate(data.reservationDate)}`;
    }
  } catch {
    reservationDate.textContent = '';
    formMessage.textContent = '';
    renderOrders([]);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';

  const name = document.getElementById('name').value.trim();
  const pizzas = Array.from(document.querySelectorAll('input[name="pizzas"]:checked')).map((input) => input.value);

  try {
    const response = await fetch('./api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pizzas })
    });

    const data = await response.json();

    if (!response.ok) {
      formMessage.textContent = data.error || 'Erreur lors de la commande.';
      return;
    }

    form.reset();
    formMessage.textContent = 'Commande enregistrée dans orders.json.';
    await loadOrders();
  } catch {
    formMessage.textContent = 'Impossible d\'enregistrer. Vérifie que PHP est actif.';
  }
});

loadOrders();
