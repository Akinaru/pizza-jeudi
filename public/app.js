const form = document.getElementById('order-form');
const ordersList = document.getElementById('orders-list');
const formMessage = document.getElementById('form-message');
const reservationDate = document.getElementById('reservation-date');
const selectedItemsBox = document.getElementById('selected-items');

const openBuilderBtn = document.getElementById('open-builder-btn');
const builderModal = document.getElementById('builder-modal');
const builderTitle = document.getElementById('builder-title');
const builderStep1 = document.getElementById('builder-step-1');
const builderStep2 = document.getElementById('builder-step-2');
const builderPicked = document.getElementById('builder-picked');
const builderCalzone = document.getElementById('builder-calzone');
const builderSupplements = document.getElementById('builder-supplements');
const builderBackBtn = document.getElementById('builder-back');
const builderAddBtn = document.getElementById('builder-add');
const builderCloseBtn = document.getElementById('builder-close');

const successModal = document.getElementById('success-modal');
const successModalText = document.getElementById('success-modal-text');
const closeModalBtn = document.getElementById('close-modal-btn');

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

const supplementsMap = {
  bufala: 'Bufala',
  bresaola: 'Brésaola',
  jambonParme: 'Jambon de parme',
  saumon: 'Saumon',
  jambonBlanc: 'Jambon blanc',
  anchois: 'Anchois',
  bufalanBresaola: 'Bufala + Brésaola'
};

const pizzaOrder = Object.keys(pizzaNames);
const supplementsOrder = ['bufala', 'bresaola', 'jambonParme', 'saumon', 'jambonBlanc', 'anchois'];

let stagedItems = [];
let builderSelectedPizza = null;

async function requestApi(options = {}) {
  const apiUrl = new URL('./api.php', window.location.href).toString();
  let response;

  try {
    response = await fetch(apiUrl, options);
  } catch (error) {
    const details = [
      `Réseau: impossible d'appeler l'API.`,
      `URL: ${apiUrl}`,
      `Page: ${window.location.href}`,
      `Protocole: ${window.location.protocol}`,
      `En ligne: ${navigator.onLine ? 'oui' : 'non'}`,
      `Erreur navigateur: ${error?.message || 'inconnue'}`,
      `Vérifie PHP actif, HTTPS/HTTP cohérent, et que api.php est accessible.`
    ].join(' ');
    throw new Error(details);
  }

  const rawText = await response.text();
  let data;

  try {
    data = JSON.parse(rawText);
  } catch {
    const preview = rawText.trim().slice(0, 140).replace(/\s+/g, ' ');
    throw new Error(`Réponse API non JSON (${response.status})${preview ? `: ${preview}` : ''}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Erreur API (${response.status})`);
  }

  return data;
}

function formatDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function createSupplementsHtml() {
  return supplementsOrder
    .map(
      (suppKey) => `
        <label class="supp-pill">
          <input type="checkbox" value="${suppKey}" />
          ${supplementsMap[suppKey]}
        </label>
      `
    )
    .join('');
}

function openBuilderStep1() {
  builderTitle.textContent = 'Choisis une pizza';
  builderStep1.innerHTML = pizzaOrder
    .map(
      (pizzaKey) => `
        <button type="button" class="pizza-pick" data-pizza="${pizzaKey}">
          <span>${pizzaIcons[pizzaKey] || '🍕'} ${pizzaNames[pizzaKey]}</span>
        </button>
      `
    )
    .join('');

  builderStep1.classList.remove('hidden');
  builderStep2.classList.add('hidden');
  builderBackBtn.classList.add('hidden');
  builderAddBtn.classList.add('hidden');
  builderSelectedPizza = null;
}

function openBuilderStep2(pizzaKey) {
  builderSelectedPizza = pizzaKey;
  builderTitle.textContent = 'Calzone et suppléments';
  builderPicked.textContent = `${pizzaIcons[pizzaKey] || '🍕'} ${pizzaNames[pizzaKey]}`;

  builderCalzone.checked = false;
  builderSupplements.innerHTML = createSupplementsHtml();

  builderStep1.classList.add('hidden');
  builderStep2.classList.remove('hidden');
  builderBackBtn.classList.remove('hidden');
  builderAddBtn.classList.remove('hidden');
}

function renderStagedItems() {
  selectedItemsBox.innerHTML = '';

  if (!stagedItems.length) {
    selectedItemsBox.innerHTML = '<p class="empty-selected">Aucune pizza ajoutée pour le moment.</p>';
    return;
  }

  stagedItems.forEach((item, index) => {
    const node = document.createElement('div');
    node.className = 'selected-item';
    const suppText = item.supplements.length
      ? item.supplements.map((supp) => supplementsMap[supp]).join(', ')
      : 'Sans supplément';

    node.innerHTML = `
      <div class="selected-item-main">${pizzaIcons[item.key] || '🍕'} ${pizzaNames[item.key]}${item.calzone ? ' (Calzone)' : ''}</div>
      <div class="selected-item-sub">+ ${suppText}</div>
      <button type="button" class="remove-item" data-index="${index}">Retirer</button>
    `;

    selectedItemsBox.appendChild(node);
  });
}

function collectBuilderItem() {
  const supplements = Array.from(builderSupplements.querySelectorAll('input:checked')).map((el) => el.value);
  return {
    key: builderSelectedPizza,
    calzone: builderCalzone.checked,
    supplements
  };
}

function renderOrders(orders) {
  ordersList.innerHTML = '';
  const grouped = new Map();

  orders.forEach((order) => {
    const items = Array.isArray(order.items)
      ? order.items
      : Array.isArray(order.pizzas)
        ? order.pizzas.map((key) => ({ key, calzone: false, supplements: [] }))
        : [];

    items.forEach((item) => {
      if (!item || !item.key || !pizzaNames[item.key]) return;

      const supplements = Array.isArray(item.supplements)
        ? item.supplements.filter((supp) => supplementsMap[supp]).sort()
        : [];

      const groupKey = `${item.key}|${item.calzone ? '1' : '0'}|${supplements.join(',')}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          key: item.key,
          calzone: Boolean(item.calzone),
          supplements,
          count: 0,
          names: []
        });
      }

      const bucket = grouped.get(groupKey);
      bucket.count += 1;
      bucket.names.push(order.name);
    });
  });

  const sortedGroups = Array.from(grouped.values()).sort((a, b) => {
    return pizzaOrder.indexOf(a.key) - pizzaOrder.indexOf(b.key);
  });

  if (!sortedGroups.length) {
    const li = document.createElement('li');
    li.textContent = 'Aucune commande pour le moment.';
    ordersList.appendChild(li);
    return;
  }

  sortedGroups.forEach((group) => {
    const li = document.createElement('li');
    li.className = 'order-item';
    const supplementsText = group.supplements.length
      ? group.supplements.map((supp) => supplementsMap[supp]).join(', ')
      : 'Sans supplément';

    li.innerHTML = `
      <div class="order-item-title">
        ${pizzaIcons[group.key] || '🍕'} ${pizzaNames[group.key]}${group.calzone ? ' (Calzone)' : ''}
        <span class="order-count">x${group.count}</span>
      </div>
      <div class="order-item-supp">+ ${supplementsText}</div>
      <div class="order-item-names">(${[...new Set(group.names)].join(', ')})</div>
    `;

    ordersList.appendChild(li);
  });
}

function showSuccessModal(name, count) {
  successModalText.textContent = `${name}, ${count} pizza(s) ajoutée(s).`;
  successModal.showModal();
}

async function loadOrders() {
  try {
    const data = await requestApi();
    renderOrders(data.orders || []);
    if (data.reservationDate) {
      reservationDate.textContent = `Réservations pour ${formatDate(data.reservationDate)}`;
    }
  } catch (error) {
    renderOrders([]);
    formMessage.textContent = error.message;
  }
}

openBuilderBtn.addEventListener('click', () => {
  openBuilderStep1();
  builderModal.showModal();
});

builderStep1.addEventListener('click', (event) => {
  const button = event.target.closest('.pizza-pick');
  if (!button) return;
  openBuilderStep2(button.dataset.pizza);
});

builderBackBtn.addEventListener('click', openBuilderStep1);

builderAddBtn.addEventListener('click', () => {
  if (!builderSelectedPizza) return;
  stagedItems.push(collectBuilderItem());
  renderStagedItems();
  builderModal.close();
});

builderCloseBtn.addEventListener('click', () => builderModal.close());

selectedItemsBox.addEventListener('click', (event) => {
  const btn = event.target.closest('.remove-item');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  stagedItems = stagedItems.filter((_, i) => i !== index);
  renderStagedItems();
});

closeModalBtn.addEventListener('click', () => successModal.close());

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';

  const name = document.getElementById('name').value.trim();
  if (!name || stagedItems.length === 0) {
    formMessage.textContent = 'Nom + au moins 1 pizza.';
    return;
  }

  try {
    await requestApi({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, items: stagedItems })
    });

    document.getElementById('name').value = '';
    const count = stagedItems.length;
    stagedItems = [];
    renderStagedItems();
    formMessage.textContent = 'Commande enregistrée.';
    showSuccessModal(name, count);
    await loadOrders();
  } catch (error) {
    formMessage.textContent = error.message;
  }
});

renderStagedItems();
loadOrders();
