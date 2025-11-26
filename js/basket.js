// basket.js
// Renderiza los productos agregados al carrito y permite eliminar o modificar cantidades

document.addEventListener('DOMContentLoaded', () => {
    console.log('Basket page loaded');
    const basketContainer = document.getElementById('basket-items');
    const totalContainer = document.getElementById('basket-total');
    let basket = JSON.parse(localStorage.getItem('basket') || '[]');
    
    console.log('Initial basket content:', basket);
    console.log('Basket container found:', !!basketContainer);
    console.log('Total container found:', !!totalContainer);

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
            // format prices using Intl (use global if available)
            const formatPrice = window.formatPrice || function (v) {
                try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(Number(v) || 0); }
                catch (e) { return '$' + (Number(v) || 0).toFixed(2); }
            };
            row.innerHTML = `
                <div class="basket-product">${item.nombre}</div>
                <div class="basket-price">${formatPrice(item.precio)}</div>
                <div class="basket-qty">
                    <input type="number" min="1" value="${item.cantidad}" data-idx="${idx}" class="basket-qty-input" />
                </div>
                <div class="basket-subtotal">${formatPrice(Number(item.precio) * Number(item.cantidad))}</div>
                <button class="basket-remove" data-idx="${idx}">Eliminar</button>
            `;
            basketContainer.appendChild(row);
            total += item.precio * item.cantidad;
        });
        // Use formatter for total
        const totalFmt = (window.formatPrice || (v => { try { return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2}).format(Number(v)||0);}catch(e){return '$'+(Number(v)||0).toFixed(2);} }))(total);
        totalContainer.textContent = totalFmt;
    }

    // expose a small API and dispatch event when basket changes
    function dispatchBasketUpdated() {
        try {
            window.dispatchEvent(new CustomEvent('basket:updated', { detail: { basket: basket } }));
        } catch (e) { /* ignore */ }
    }

    // expose helper API
    window.basketApi = {
        get: () => JSON.parse(JSON.stringify(basket)),
        set: (newBasket) => { basket = Array.isArray(newBasket) ? newBasket : []; localStorage.setItem('basket', JSON.stringify(basket)); renderBasket(); dispatchBasketUpdated(); },
        refresh: () => { renderBasket(); dispatchBasketUpdated(); }
    };

    basketContainer.addEventListener('click', e => {
        if (e.target.classList.contains('basket-remove')) {
            const idx = Number(e.target.getAttribute('data-idx'));
            basket.splice(idx, 1);
            localStorage.setItem('basket', JSON.stringify(basket));
            renderBasket();
            dispatchBasketUpdated();
        }
    });

    basketContainer.addEventListener('change', e => {
        if (e.target.classList.contains('basket-qty-input')) {
            const idx = Number(e.target.getAttribute('data-idx'));
            const qty = Math.max(1, Number(e.target.value));
            basket[idx].cantidad = qty;
            localStorage.setItem('basket', JSON.stringify(basket));
            renderBasket();
            dispatchBasketUpdated();
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

                // Require user to be logged in before showing payment UI
                try {
                    const sres = await fetch('/php/api/session.php', { credentials: 'same-origin' });
                    const sj = await sres.json().catch(() => null);
                    if (!sres.ok || !sj || !sj.ok || !sj.user) {
                        // redirect to login and preserve return URL
                        const next = encodeURIComponent('/pages/basket.html');
                        window.location.href = '/pages/login.html?next=' + next;
                        return;
                    }
                } catch (err) {
                    // On network error, also require login
                    const next = encodeURIComponent('/pages/basket.html');
                    window.location.href = '/pages/login.html?next=' + next;
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
        let userSession = null;
        
        // Get current user session
        try {
            const sessionRes = await fetch('/php/api/session.php', { credentials: 'same-origin' });
            const sessionData = await sessionRes.json();
            if (sessionData && sessionData.ok && sessionData.user) {
                userSession = sessionData.user;
            }
        } catch (e) {
            console.error('Error getting session:', e);
        }
        
        // Try to load payment methods if user is logged in
        if (userSession) {
            try {
                const res = await fetch(`/php/api/payments.php?type=methods&id_usuario=${userSession.id}`);
                if (res.ok) {
                    const data = await res.json();
                    methods = data.ok ? (data.data || []) : [];
                }
            } catch (e) {
                console.error('Error loading payment methods:', e);
                methods = [];
            }
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

    // format total for display
    const totalDisplay = (window.formatPrice || (v => { try { return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2}).format(Number(v)||0);}catch(e){return '$'+(Number(v)||0).toFixed(2);} }))(total);
    html.push(`<div style="margin-top:16px"><strong>Total a pagar:</strong> ${totalDisplay}</div>`);
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
                    if (!userSession || !userSession.id) {
                        throw new Error('Usuario no autenticado');
                    }
                    
                    body.id_usuario = userSession.id;
                    
                    const r = await fetch('/php/api/payments.php?type=methods', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify(body)
                    });
                    
                    if (!r.ok) {
                        const errorText = await r.text();
                        throw new Error(`HTTP ${r.status}: ${errorText}`);
                    }
                    
                    const jr = await r.json();
                    if (jr && jr.ok) {
                        // re-open payment UI to refresh methods
                        showPaymentUI();
                    } else {
                        const msg = jr && jr.message ? jr.message : 'Error al crear método';
                        paymentArea.insertAdjacentHTML('afterbegin', `<div class="msg" style="background:#f8d7da;color:#842029;padding:8px;border-radius:6px;margin-bottom:8px">${msg}</div>`);
                    }
                } catch (e) {
                    console.error('Error creating payment method:', e);
                    paymentArea.insertAdjacentHTML('afterbegin', `<div class="msg" style="background:#f8d7da;color:#842029;padding:8px;border-radius:6px;margin-bottom:8px">Error: ${e.message}</div>`);
                }
            });
        }

        // confirm pay handler: pick selected method and create real sale (with confirmation modal)
        const confirmBtn = document.getElementById('confirm-pay');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const sel = paymentArea.querySelector('input[name="pay-method"]:checked');
                const methodId = sel ? sel.value : null;
                const total = basket.reduce((s, it) => s + (Number(it.precio) * Number(it.cantidad)), 0).toFixed(2);
                const totalDisplay = (window.formatPrice || (v => { try { return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2}).format(Number(v)||0);}catch(e){return '$'+(Number(v)||0).toFixed(2);} }))(total);

                // Build confirmation modal
                const modal = document.createElement('div');
                modal.className = 'confirm-overlay';
                modal.style = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:11000;padding:20px;';
                modal.innerHTML = `
                    <div style="background:#fff;padding:20px;border-radius:8px;max-width:420px;width:100%">
                        <h3>Confirmar pago</h3>
                        <p>Total a pagar: <strong>${totalDisplay}</strong></p>
                        <p>Método: <strong>${methodId ? 'ID ' + methodId : 'Sin método seleccionado'}</strong></p>
                        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
                            <button id="confirm-cancel" class="btn">Cancelar</button>
                            <button id="confirm-ok" class="btn primary">Confirmar y pagar</button>
                        </div>
                        <div id="confirm-msg" style="margin-top:12px"></div>
                    </div>
                `;
                document.body.appendChild(modal);

                const btnCancel = modal.querySelector('#confirm-cancel');
                const btnOk = modal.querySelector('#confirm-ok');
                const msgBox = modal.querySelector('#confirm-msg');

                btnCancel.addEventListener('click', () => { modal.remove(); });

                btnOk.addEventListener('click', async () => {
                    btnOk.disabled = true; btnCancel.disabled = true; btnOk.textContent = 'Procesando...';
                    
                    try {
                        // Prepare payload with proper product IDs
                        const items = basket.map(item => {
                            const productId = item.id_producto || item.id || item.productId;
                            if (!productId) {
                                throw new Error('ID de producto no encontrado en el carrito');
                            }
                            return {
                                id_producto: parseInt(productId),
                                cantidad: parseInt(item.cantidad),
                                precio: parseFloat(item.precio)
                            };
                        });
                        
                        const payload = {
                            items: items,
                            metodo_pago_id: methodId || 'tarjeta'
                        };
                        
                        console.log('Sending payment payload:', payload);
                        
                        const res = await fetch('/php/api/create_sale.php', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            credentials: 'same-origin',
                            body: JSON.stringify(payload)
                        });
                        
                        if (!res.ok) {
                            const errorText = await res.text();
                            console.error('Sale creation failed:', res.status, errorText);
                            throw new Error(`Error del servidor (${res.status}): ${errorText}`);
                        }
                        
                        const jr = await res.json();
                        console.log('Sale creation response:', jr);
                        
                        if (!jr || !jr.ok) {
                            throw new Error(jr && jr.message ? jr.message : 'Error creando venta');
                        }

                        // success: clear basket, update UI
                        localStorage.removeItem('basket');
                        basket = [];
                        renderBasket();
                        dispatchBasketUpdated();
                        
                        const successMsg = `
                            <div class="msg" style="background:#d1e7dd;color:#0f5132;padding:12px;border-radius:8px;text-align:center">
                                <h3>¡Pago exitoso!</h3>
                                <p>Venta creada con ID: <strong>#${jr.id_venta}</strong></p>
                                <p>Monto total: <strong>${totalDisplay}</strong></p>
                                <p>¡Gracias por tu compra!</p>
                            </div>
                        `;
                        
                        paymentArea.innerHTML = successMsg;
                        modal.remove();
                        
                    } catch (err) {
                        console.error('Payment error:', err);
                        msgBox.innerHTML = `<div class="msg" style="background:#f8d7da;color:#842029;padding:8px;border-radius:6px"><strong>Error:</strong> ${err.message || 'Error procesando pago'}</div>`;
                        btnOk.disabled = false; btnCancel.disabled = false; btnOk.textContent = 'Confirmar y pagar';
                    }
                });
            });
        }
    }
});
