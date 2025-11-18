// basket.js
// Renderiza los productos agregados al carrito y permite eliminar o modificar cantidades

document.addEventListener('DOMContentLoaded', () => {
    const basketContainer = document.getElementById('basket-items');
    const totalContainer = document.getElementById('basket-total');
    let basket = JSON.parse(localStorage.getItem('basket') || '[]');

    function renderBasket() {
        basketContainer.innerHTML = '';
        let total = 0;
        if (basket.length === 0) {
            basketContainer.innerHTML = '<p class="basket-empty">Tu carrito está vacío.</p>';
            totalContainer.textContent = '$0.00';
            return;
        }
        basket.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'basket-row';
            row.innerHTML = `
                <div class="basket-product">${item.nombre}</div>
                <div class="basket-price">$${Number(item.precio).toFixed(2)}</div>
                <div class="basket-qty">
                    <input type="number" min="1" value="${item.cantidad}" data-idx="${idx}" class="basket-qty-input" />
                </div>
                <div class="basket-subtotal">$${(item.precio * item.cantidad).toFixed(2)}</div>
                <button class="basket-remove" data-idx="${idx}">Eliminar</button>
            `;
            basketContainer.appendChild(row);
            total += item.precio * item.cantidad;
        });
        totalContainer.textContent = `$${total.toFixed(2)}`;
    }

    basketContainer.addEventListener('click', e => {
        if (e.target.classList.contains('basket-remove')) {
            const idx = Number(e.target.getAttribute('data-idx'));
            basket.splice(idx, 1);
            localStorage.setItem('basket', JSON.stringify(basket));
            renderBasket();
        }
    });

    basketContainer.addEventListener('change', e => {
        if (e.target.classList.contains('basket-qty-input')) {
            const idx = Number(e.target.getAttribute('data-idx'));
            const qty = Math.max(1, Number(e.target.value));
            basket[idx].cantidad = qty;
            localStorage.setItem('basket', JSON.stringify(basket));
            renderBasket();
        }
    });

    renderBasket();
});
