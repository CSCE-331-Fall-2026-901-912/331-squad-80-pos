const CART_KEY = 'drink-cart-v1';
const ADD_ONS = [
    { id: 'boba', label: 'Boba', priceCents: 50 },
    { id: 'grass-jelly', label: 'Grass jelly', priceCents: 50 },
    { id: 'pudding', label: 'Pudding', priceCents: 50 },
    { id: 'cheese-foam', label: 'Cheese foam', priceCents: 100 }
];
const ADD_ONS_BY_ID = new Map(ADD_ONS.map(addon => [addon.id, addon]));
let cartStorageUnavailable = false;

document.addEventListener('DOMContentLoaded', () => {
    const cart = readCart();

    if (document.body.dataset.page === 'menu') {
        setupMenu(cart);
    }

    if (document.body.dataset.page === 'checkout') {
        renderCheckout(cart);
        updateCartBadge(cart);
    }
});

function readCart() {
    let saved;
    try {
        saved = sessionStorage.getItem(CART_KEY);
        cartStorageUnavailable = false;
    } catch {
        cartStorageUnavailable = true;
        return [];
    }

    if (!saved) return [];

    try {
        const stored = JSON.parse(saved);
        if (!Array.isArray(stored)) return [];

        return stored.filter(line =>
            line &&
            typeof line.id === 'string' &&
            typeof line.name === 'string' &&
            Number.isInteger(line.baseCents) &&
            line.baseCents >= 0 &&
            Number.isInteger(line.quantity) &&
            line.quantity > 0 &&
            typeof line.sugar === 'string' &&
            typeof line.ice === 'string' &&
            Array.isArray(line.addons)
        ).map(line => ({
            ...line,
            addons: line.addons.filter(id => ADD_ONS_BY_ID.has(id))
        }));
    } catch {
        return [];
    }
}

function saveCart(cart) {
    try {
        sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
        cartStorageUnavailable = false;
        return true;
    } catch {
        cartStorageUnavailable = true;
        return false;
    }
}

function formatMoney(cents) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(cents / 100);
}

function addonsTotalCents(addonIds) {
    return addonIds.reduce((sum, id) => sum + (ADD_ONS_BY_ID.get(id)?.priceCents || 0), 0);
}

function configuredPriceCents(line) {
    return line.baseCents + addonsTotalCents(line.addons);
}

function configurationKey(line) {
    return JSON.stringify([
        line.id,
        line.sugar,
        line.ice,
        [...line.addons].sort()
    ]);
}

function setupMenu(cart) {
    const categoryView = document.getElementById('category-view');
    const categoryButtons = Array.from(document.querySelectorAll('.category-card'));
    const menuViews = Array.from(document.querySelectorAll('[data-category-view]'));
    const cartItemsList = document.getElementById('cart-items-list');
    const cartTotal = document.getElementById('cart-total-price');
    const dialog = document.getElementById('customization-dialog');
    const form = document.getElementById('customization-form');
    const storageError = document.getElementById('cart-storage-error');
    let selectedDrink = null;
    let lastCategoryButton = null;

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            const view = menuViews.find(section => section.dataset.categoryView === category);
            if (!view) return;

            lastCategoryButton = button;
            categoryView.hidden = true;
            menuViews.forEach(section => { section.hidden = section !== view; });
            view.querySelector('h1')?.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.back-to-categories').forEach(button => {
        button.addEventListener('click', () => {
            menuViews.forEach(section => { section.hidden = true; });
            categoryView.hidden = false;
            lastCategoryButton?.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedDrink = {
                id: card.dataset.itemId,
                name: card.dataset.itemName,
                baseCents: Number(card.dataset.baseCents) || 0,
                artId: card.dataset.itemArt
            };

            form.reset();
            document.getElementById('dialog-item-name').textContent = selectedDrink.name;
            document.getElementById('dialog-art').setAttribute('aria-label', `${selectedDrink.name} illustration`);
            document.getElementById('dialog-art-use').setAttribute('href', `/images/menu-drinks.svg#${selectedDrink.artId}`);
            document.getElementById('dialog-base-price').textContent = formatMoney(selectedDrink.baseCents);
            updateDialogPrice();
            dialog.showModal();
        });
    });

    document.getElementById('close-customization').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    form.addEventListener('change', updateDialogPrice);

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!selectedDrink) return;

        const line = {
            id: selectedDrink.id,
            name: selectedDrink.name,
            baseCents: selectedDrink.baseCents,
            sugar: document.getElementById('sugar-level').value,
            ice: document.getElementById('ice-level').value,
            addons: Array.from(form.querySelectorAll('input[name="addons"]:checked'), input => input.value).sort(),
            quantity: 1
        };
        const nextCart = cart.map(item => ({ ...item, addons: [...item.addons] }));
        const key = configurationKey(line);
        const existingLine = nextCart.find(item => configurationKey(item) === key);

        if (existingLine) {
            existingLine.quantity += 1;
        } else {
            nextCart.push(line);
        }

        if (!saveCart(nextCart)) {
            storageError.hidden = false;
            return;
        }

        cart.splice(0, cart.length, ...nextCart);
        storageError.hidden = true;
        renderMenuCart(cartItemsList, cartTotal, cart);
        updateCartBadge(cart);
        dialog.close();
    });

    function updateDialogPrice() {
        if (!selectedDrink) return;
        const checkedAddons = Array.from(form.querySelectorAll('input[name="addons"]:checked'), input => input.value);
        document.getElementById('dialog-total-price').textContent = formatMoney(
            selectedDrink.baseCents + addonsTotalCents(checkedAddons)
        );
    }

    renderMenuCart(cartItemsList, cartTotal, cart);
    updateCartBadge(cart);
}

function updateCartBadge(cart) {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    const quantity = cart.reduce((sum, line) => sum + line.quantity, 0);
    badge.textContent = String(quantity);
    badge.setAttribute('aria-label', `${quantity} ${quantity === 1 ? 'item' : 'items'} in order`);
}

function renderMenuCart(list, total, cart) {
    if (!list || !total) return;
    list.replaceChildren();

    if (cart.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty-cart-msg';
        empty.textContent = 'Your order is empty.';
        list.append(empty);
        total.textContent = '$0.00';
        return;
    }

    let totalCents = 0;
    cart.forEach(line => {
        const lineTotal = configuredPriceCents(line) * line.quantity;
        totalCents += lineTotal;

        const row = document.createElement('li');
        row.className = 'cart-item-row';

        const details = document.createElement('span');
        details.className = 'cart-item-name';
        const name = document.createElement('span');
        name.textContent = `${line.name} ×${line.quantity}`;
        details.append(name);

        const customizations = document.createElement('span');
        customizations.className = 'cart-item-customizations';
        const addonLabels = line.addons.map(id => ADD_ONS_BY_ID.get(id)?.label).filter(Boolean);
        customizations.textContent = [line.sugar, line.ice, ...addonLabels].join(' · ');
        details.append(customizations);

        const price = document.createElement('span');
        price.textContent = formatMoney(lineTotal);
        row.append(details, price);
        list.append(row);
    });

    total.textContent = formatMoney(totalCents);
}

function renderCheckout(cart) {
    const itemsContainer = document.getElementById('checkout-items');
    const emptyState = document.getElementById('checkout-empty');
    const totalRow = document.getElementById('checkout-total');
    const totalPrice = document.getElementById('checkout-total-price');
    const storageError = document.getElementById('checkout-storage-error');
    if (!itemsContainer || !emptyState || !totalRow || !totalPrice) return;

    itemsContainer.replaceChildren();
    emptyState.hidden = cart.length > 0;
    itemsContainer.hidden = cart.length === 0;
    totalRow.hidden = false;
    if (storageError) storageError.hidden = !cartStorageUnavailable;

    let orderTotalCents = 0;
    cart.forEach(line => {
        const addonTotal = addonsTotalCents(line.addons);
        const perDrinkTotal = line.baseCents + addonTotal;
        const lineTotal = perDrinkTotal * line.quantity;
        orderTotalCents += lineTotal;

        const article = document.createElement('article');
        article.className = 'checkout-item';

        const details = document.createElement('div');
        const heading = document.createElement('div');
        heading.className = 'checkout-item-heading';
        const name = document.createElement('h2');
        name.textContent = line.name;
        const quantity = document.createElement('span');
        quantity.className = 'checkout-quantity';
        quantity.textContent = `Quantity: ${line.quantity}`;
        heading.append(name, quantity);

        const choices = document.createElement('ul');
        choices.className = 'checkout-customizations';
        appendChoice(choices, `Sugar: ${line.sugar} · Free`);
        appendChoice(choices, `Ice: ${line.ice} · Free`);
        line.addons.forEach(id => {
            const addon = ADD_ONS_BY_ID.get(id);
            if (addon) appendChoice(choices, `${addon.label} · +${formatMoney(addon.priceCents)}`);
        });

        const breakdown = document.createElement('div');
        breakdown.className = 'price-breakdown';
        appendBreakdown(breakdown, 'Base price', formatMoney(line.baseCents));
        appendBreakdown(breakdown, 'Add-ons per drink', formatMoney(addonTotal));
        appendBreakdown(breakdown, 'Price per drink', formatMoney(perDrinkTotal));
        details.append(heading, choices, breakdown);

        const linePrice = document.createElement('div');
        linePrice.className = 'checkout-line-total';
        const linePriceLabel = document.createElement('span');
        linePriceLabel.textContent = 'Line total';
        const linePriceAmount = document.createElement('strong');
        linePriceAmount.textContent = formatMoney(lineTotal);
        linePrice.append(linePriceLabel, linePriceAmount);
        article.append(details, linePrice);
        itemsContainer.append(article);
    });

    totalPrice.textContent = formatMoney(orderTotalCents);
}

function appendChoice(list, text) {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
}

function appendBreakdown(container, label, amount) {
    const row = document.createElement('div');
    row.className = 'price-breakdown-row';
    const name = document.createElement('span');
    name.textContent = label;
    const price = document.createElement('strong');
    price.textContent = amount;
    row.append(name, price);
    container.append(row);
}
