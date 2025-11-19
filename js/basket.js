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
    // Payment / checkout handling
    const checkoutBtn = document.querySelector('.basket-checkout');
    const paymentArea = document.getElementById('payment-area');

    if (checkoutBtn && paymentArea) {
        checkoutBtn.addEventListener('click', async () => {
            // if cart empty, show message
            if (!basket || basket.length === 0) {
                paymentArea.innerHTML = '<div class="msg">Tu carrito está vacío. Agrega productos antes de pagar.</div>';
                return;
            }
            // show payment UI
            showPaymentUI();
        });
    }

    // Render a simple payment UI: list saved methods + add new method form + confirm button
    async function showPaymentUI() {
        paymentArea.innerHTML = '<div class="msg">Cargando métodos de pago…</div>';
        let methods = [];
        try {
            const res = await fetch('/php/api/payments.php?type=methods');
            methods = await res.json().then(j => j.data || []);
        } catch (e) {
            methods = [];
        }

        const total = basket.reduce((s, it) => s + (Number(it.precio) * Number(it.cantidad)), 0).toFixed(2);

        const html = [];
        html.push(`<div class="payment-panel">`);
        html.push(`<h3>Métodos de pago</h3>`);
        if (methods.length === 0) {
            html.push(`<p class="muted">No se encontraron métodos almacenados. Puedes agregar uno abajo.</p>`);
        } else {
            html.push('<div class="methods-list">');
            methods.forEach(m => {
                html.push(`<label style="display:block;margin-bottom:8px"><input type="radio" name="pay-method" value="${m.id_metodo}"> ${m.tipo_tarjeta || 'Tarjeta'} •••• ${m.ultimos_cuatro} ${m.es_predeterminada ? '(predeterminado)' : ''}</label>`);
            });
            html.push('</div>');
        }

        html.push('<hr/>');
        html.push('<h4>Agregar método de pago</h4>');
        html.push('<form id="new-method-form">');
        html.push('<label>Nombre en la tarjeta<input name="nombre_titular" required></label>');
        html.push('<label>Tipo (VISA/MC/AMEX)<input name="tipo_tarjeta" required></label>');
        html.push('<label>Últimos 4 dígitos<input name="ultimos_cuatro" maxlength="4" required></label>');
        html.push('<label>Expiración (YYYY-MM)<input name="fecha_expiracion" placeholder="2026-08" required></label>');
        html.push('<label><input type="checkbox" name="es_predeterminada"> Usar como predeterminada</label>');
        html.push('<div style="margin-top:12px"><button type="submit" class="btn">Guardar método</button></div>');
        html.push('</form>');

        html.push(`<div style="margin-top:16px"><strong>Total a pagar:</strong> $${total}</div>`);
        html.push('<div style="margin-top:12px"><button id="confirm-pay" class="btn">Pagar ahora</button></div>');
        html.push('</div>');

        paymentArea.innerHTML = html.join('');

        // wire form submission
        const newForm = document.getElementById('new-method-form');
        if (newForm) {
            newForm.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const fd = new FormData(newForm);
                const body = {};
                for (const [k, v] of fd.entries()) body[k] = v;
                // try to detect logged user id
                try {
                    const s = await fetch('/php/api/session.php', { credentials: 'same-origin' });
                    const sj = await s.json().catch(() => null);
                    if (sj && sj.ok && sj.user && sj.user.id_usuario) body.id_usuario = sj.user.id_usuario;
                    else body.id_usuario = 0;
                } catch (e) { body.id_usuario = 0; }

                // POST to payments API
                try {
                    const r = await fetch('/php/api/payments.php?type=methods', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    const jr = await r.json();
                    if (jr && jr.ok) {
                        // re-open payment UI to refresh methods
                        showPaymentUI();
                    } else {
                        const msg = jr && jr.message ? jr.message : 'Error al crear método';
                        paymentArea.insertAdjacentHTML('afterbegin', `<div class="msg" style="background:#f8d7da;color:#842029;padding:8px;border-radius:6px;margin-bottom:8px">${msg}</div>`);
                    }
                } catch (e) {
                    paymentArea.insertAdjacentHTML('afterbegin', `<div class="msg" style="background:#f8d7da;color:#842029;padding:8px;border-radius:6px;margin-bottom:8px">Error de red al crear método</div>`);
                }
            });
        }

        // confirm pay handler: pick selected method and simulate checkout
        const confirmBtn = document.getElementById('confirm-pay');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const sel = paymentArea.querySelector('input[name="pay-method"]:checked');
                const methodId = sel ? sel.value : null;
                // simulate server-side sale creation — here we just clear basket and show success
                localStorage.removeItem('basket');
                basket = [];
                renderBasket();
                paymentArea.innerHTML = `<div class="msg" style="background:#d1e7dd;color:#0f5132;padding:12px;border-radius:8px">Pago simulado realizado ${methodId ? 'usando método #' + methodId : '(sin método seleccionado)'} — ¡Gracias por tu compra!</div>`;
            });
        }
    }
});
