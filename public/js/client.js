document.addEventListener('DOMContentLoaded', () => {
    // 1. Category Filtering Logic
    const categoryButtons = document.querySelectorAll('.cat-btn');
    const itemCards = document.querySelectorAll('.item-card');

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedCategory = button.getAttribute('data-category');

            // Update active state on buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Filter menu items
            itemCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                
                if (selectedCategory === 'all' || cardCategory === selectedCategory) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 2. Interactive Cart Logic
    const cart = [];
    const cartCountEl = document.getElementById('cart-count');
    const cartItemsListEl = document.getElementById('cart-items-list');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    const addButtons = document.querySelectorAll('.add-btn');

    addButtons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            const price = parseFloat(button.getAttribute('data-price')) || 0;

            // Check if item already exists in cart
            const existingItem = cart.find(item => item.id === id);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({ id, name, price, quantity: 1 });
            }

            updateCartUI();
        });
    });

    function updateCartUI() {
        // Clear current list view
        cartItemsListEl.innerHTML = '';

        if (cart.length === 0) {
            cartItemsListEl.innerHTML = '<li class="empty-cart-msg">Your cart is empty</li>';
            cartCountEl.textContent = '0';
            cartTotalPriceEl.textContent = '$0.00';
            return;
        }

        let totalCount = 0;
        let totalPrice = 0;

        cart.forEach(item => {
            totalCount += item.quantity;
            totalPrice += item.price * item.quantity;

            const li = document.createElement('li');
            li.className = 'cart-item-row';
            li.innerHTML = `
                <span>${nameEllipsis(item.name)} (x${item.quantity})</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            `;
            cartItemsListEl.appendChild(li);
        });

        cartCountEl.textContent = totalCount;
        cartTotalPriceEl.textContent = `$${totalPrice.toFixed(2)}`;
    }

    function nameEllipsis(name) {
        return name.length > 18 ? name.substring(0, 15) + '...' : name;
    }
});