const form = document.getElementById('order-form');
const ordersList = document.getElementById('orders-list');
const ordersSummary = document.getElementById('orders-summary');
const formMessage = document.getElementById('form-message');
const reservationDate = document.getElementById('reservation-date');
const selectedItemsBox = document.getElementById('selected-items');
const validationSummary = document.getElementById('validation-summary');
const reviewSummary = document.getElementById('review-summary');
const submitButton = document.getElementById('submit-order-btn');

const wizardStepItems = Array.from(document.querySelectorAll('.wizard-step-item'));
const wizardPanels = Array.from(document.querySelectorAll('.wizard-panel'));
const wizardNext1 = document.getElementById('wizard-next-1');
const wizardNext2 = document.getElementById('wizard-next-2');
const wizardBack2 = document.getElementById('wizard-back-2');
const wizardBack3 = document.getElementById('wizard-back-3');

const openBuilderBtn = document.getElementById('open-builder-btn');
const builderModal = document.getElementById('builder-modal');
const builderTitle = document.getElementById('builder-title');
const builderStep1 = document.getElementById('builder-step-1');
const builderStep2 = document.getElementById('builder-step-2');
const builderPicked = document.getElementById('builder-picked');
const builderCalzone = document.getElementById('builder-calzone');
const builderSupplements = document.getElementById('builder-supplements');
const builderBackInlineBtn = document.getElementById('builder-back-inline');
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
let isLoadingOrders = false;
let currentWizardStep = 1;

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

function normalizeSupplements(input) {
  if (!Array.isArray(input)) return [];

  const expanded = [];
  input.forEach((supp) => {
    if (supp === 'bufalanBresaola') {
      expanded.push('bufala', 'bresaola');
      return;
    }
    if (supplementsMap[supp]) {
      expanded.push(supp);
    }
  });

  return Array.from(new Set(expanded)).sort();
}

function itemGroupKey(item) {
  const supplements = normalizeSupplements(item.supplements);
  return `${item.key}|${item.calzone ? '1' : '0'}|${supplements.join(',')}`;
}

function supplementLabel(supplements) {
  const normalized = normalizeSupplements(supplements);
  if (!normalized.length) return 'Sans supplément';
  return normalized.map((supp) => supplementsMap[supp]).join(', ');
}

function groupItems(items, withNames = false) {
  const grouped = new Map();

  items.forEach((entry) => {
    const item = withNames ? entry.item : entry;
    if (!item || !item.key || !pizzaNames[item.key]) return;

    const normalizedItem = {
      key: item.key,
      calzone: Boolean(item.calzone),
      supplements: normalizeSupplements(item.supplements)
    };

    const key = itemGroupKey(normalizedItem);
    if (!grouped.has(key)) {
      grouped.set(key, {
        ...normalizedItem,
        count: 0,
        names: []
      });
    }

    const bucket = grouped.get(key);
    bucket.count += 1;
    if (withNames && entry.name) {
      bucket.names.push(entry.name);
    }
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const pizzaSort = pizzaOrder.indexOf(a.key) - pizzaOrder.indexOf(b.key);
    if (pizzaSort !== 0) return pizzaSort;
    if (a.calzone !== b.calzone) return a.calzone ? 1 : -1;
    return a.supplements.join(',').localeCompare(b.supplements.join(','));
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
  builderAddBtn.classList.remove('hidden');
}

function renderValidationSummary() {
  const total = stagedItems.length;
  const withSupp = stagedItems.filter((item) => normalizeSupplements(item.supplements).length > 0).length;
  const calzones = stagedItems.filter((item) => item.calzone).length;
  const groups = groupItems(stagedItems).length;

  validationSummary.innerHTML = `
    <span class="summary-chip"><strong>${total}</strong> pizza(s)</span>
    <span class="summary-chip"><strong>${groups}</strong> variante(s)</span>
    <span class="summary-chip"><strong>${withSupp}</strong> avec suppléments</span>
    <span class="summary-chip"><strong>${calzones}</strong> calzone</span>
  `;
}

function renderReviewSummary() {
  const name = document.getElementById('name').value.trim();
  const grouped = groupItems(stagedItems);

  if (!grouped.length) {
    reviewSummary.innerHTML = '<p class="review-empty">Aucune pizza dans la commande.</p>';
    submitButton.textContent = 'Confirmer la commande';
    return;
  }

  const rows = grouped
    .map(
      (item) => `
        <li>
          <span>${pizzaIcons[item.key] || '🍕'} ${pizzaNames[item.key]}${item.calzone ? ' (Calzone)' : ''}</span>
          <span class="review-count">x${item.count}</span>
          <small>${supplementLabel(item.supplements)}</small>
        </li>
      `
    )
    .join('');

  reviewSummary.innerHTML = `
    <p class="review-name">Commande pour <strong>${name || '...'}</strong></p>
    <ul class="review-list">${rows}</ul>
  `;

  submitButton.textContent = `Confirmer la commande (${stagedItems.length})`;
}

function renderStagedItems() {
  selectedItemsBox.innerHTML = '';

  if (!stagedItems.length) {
    selectedItemsBox.innerHTML = '<p class="empty-selected">Aucune pizza ajoutée pour le moment.</p>';
    renderValidationSummary();
    renderReviewSummary();
    return;
  }

  const grouped = groupItems(stagedItems);

  grouped.forEach((item) => {
    const node = document.createElement('div');
    node.className = 'selected-item';

    node.innerHTML = `
      <div class="selected-item-main">
        ${pizzaIcons[item.key] || '🍕'} ${pizzaNames[item.key]}${item.calzone ? ' (Calzone)' : ''}
        <span class="selected-item-count">x${item.count}</span>
      </div>
      <div class="selected-item-sub">+ ${supplementLabel(item.supplements)}</div>
      <button type="button" class="remove-item-icon" data-group="${itemGroupKey(item)}" aria-label="Retirer une pizza">×</button>
    `;

    selectedItemsBox.appendChild(node);
  });

  renderValidationSummary();
  renderReviewSummary();
}

function collectBuilderItem() {
  const supplements = Array.from(builderSupplements.querySelectorAll('input:checked')).map((el) => el.value);
  return {
    key: builderSelectedPizza,
    calzone: builderCalzone.checked,
    supplements: normalizeSupplements(supplements)
  };
}

function normalizeOrderItems(order) {
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(order.pizzas)) {
    return order.pizzas.map((key) => ({ key, calzone: false, supplements: [] }));
  }
  return [];
}

function renderOrders(orders) {
  ordersList.innerHTML = '';

  const allEntries = [];
  orders.forEach((order) => {
    normalizeOrderItems(order).forEach((item) => {
      allEntries.push({ item, name: order.name || 'Inconnu' });
    });
  });

  const grouped = groupItems(allEntries, true);
  const totalPizzas = grouped.reduce((sum, item) => sum + item.count, 0);
  const withSupp = grouped.reduce((sum, item) => sum + (item.supplements.length ? item.count : 0), 0);

  ordersSummary.textContent = `${totalPizzas} pizza(s) au total, dont ${withSupp} avec suppléments.`;

  if (!grouped.length) {
    const li = document.createElement('li');
    li.textContent = 'Aucune commande pour le moment.';
    ordersList.appendChild(li);
    return;
  }

  grouped.forEach((group) => {
    const li = document.createElement('li');
    li.className = 'order-item';

    const uniqueNames = [...new Set(group.names)].join(', ');
    const suppText = supplementLabel(group.supplements);
    const hasSupp = group.supplements.length > 0;

    li.innerHTML = `
      <div class="order-item-title">
        ${pizzaIcons[group.key] || '🍕'} ${pizzaNames[group.key]}${group.calzone ? ' (Calzone)' : ''}
        <span class="order-count">x${group.count}</span>
      </div>
      <div class="order-item-supp ${hasSupp ? 'has-supp' : ''}">${hasSupp ? 'Suppléments:' : ''} ${suppText}</div>
      <div class="order-item-names">(${uniqueNames})</div>
    `;

    ordersList.appendChild(li);
  });
}

function showSuccessModal(name, count) {
  successModalText.textContent = `${name}, ${count} pizza(s) ajoutée(s).`;
  successModal.showModal();
}

function setWizardStep(step) {
  currentWizardStep = step;

  wizardStepItems.forEach((item) => {
    item.classList.toggle('is-active', Number(item.dataset.step) === step);
  });

  wizardPanels.forEach((panel) => {
    panel.classList.toggle('hidden', Number(panel.dataset.panel) !== step);
  });

  if (step === 3) {
    renderReviewSummary();
  }

  formMessage.textContent = '';
}

async function loadOrders() {
  if (isLoadingOrders) return;
  isLoadingOrders = true;

  try {
    const data = await requestApi();
    renderOrders(data.orders || []);
    if (data.reservationDate) {
      reservationDate.textContent = `Réservations pour ${formatDate(data.reservationDate)}`;
    }
  } catch (error) {
    ordersSummary.textContent = '';
    renderOrders([]);
    formMessage.textContent = error.message;
  } finally {
    isLoadingOrders = false;
  }
}

wizardNext1.addEventListener('click', () => {
  const name = document.getElementById('name').value.trim();
  if (!name) {
    formMessage.textContent = 'Renseigne ton nom pour continuer.';
    return;
  }
  setWizardStep(2);
});

wizardBack2.addEventListener('click', () => setWizardStep(1));

wizardNext2.addEventListener('click', () => {
  if (stagedItems.length === 0) {
    formMessage.textContent = 'Ajoute au moins une pizza pour continuer.';
    return;
  }
  setWizardStep(3);
});

wizardBack3.addEventListener('click', () => setWizardStep(2));

openBuilderBtn.addEventListener('click', () => {
  openBuilderStep1();
  builderModal.showModal();
});

builderStep1.addEventListener('click', (event) => {
  const button = event.target.closest('.pizza-pick');
  if (!button) return;
  openBuilderStep2(button.dataset.pizza);
});

builderBackInlineBtn.addEventListener('click', openBuilderStep1);

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

  const group = btn.dataset.group;
  const index = stagedItems.findIndex((item) => itemGroupKey(item) === group);
  if (index >= 0) {
    stagedItems.splice(index, 1);
    renderStagedItems();
  }
});

closeModalBtn.addEventListener('click', () => successModal.close());

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';

  if (currentWizardStep !== 3) {
    formMessage.textContent = 'Termine les étapes avant de confirmer.';
    return;
  }

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
    setWizardStep(1);
    showSuccessModal(name, count);
    await loadOrders();
  } catch (error) {
    formMessage.textContent = error.message;
  }
});

renderStagedItems();
setWizardStep(1);
loadOrders();
setInterval(loadOrders, 3000);
