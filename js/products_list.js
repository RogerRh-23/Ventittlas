// products_list.js
// Fetches /assets/data/products.json and renders product cards into containers marked with [data-products]

(async function () {
    // price formatter (use global if provided)
    const formatPrice = window.formatPrice || function (v) {
        try {
            const n = Number(v) || 0;
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n);
        } catch (e) {
            return '$' + (Number(v) || 0).toFixed(2);
        }
    };
    async function fetchProducts() {
        const url = '/php/api/products.php';
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            debugLog(`fetchProducts: received response, ok=${res.ok}`);
            // Support two response shapes: { success: true, productos: [...] } or [...]
            if (data && data.success && Array.isArray(data.productos)) {
                debugLog(`fetchProducts: normalized to data.productos length=${data.productos.length}`);
                return data.productos;
            }
            if (Array.isArray(data)) {
                debugLog(`fetchProducts: received array length=${data.length}`);
                return data;
            }
            console.error('API error:', data && data.error ? data.error : 'Formato de respuesta inesperado');
            debugLog('fetchProducts: unexpected response format');
            return [];
        } catch (err) {
            console.error('Error fetching products.php', err);
            debugLog('fetchProducts error: ' + (err && err.message ? err.message : String(err)), 'error');
            return [];
        }
    }

    function renderProduct(container, product, template) {
        debugLog(`renderProduct: id=${product.id} title=${product.title}`);
        const node = template.content.cloneNode(true);
        const img = node.querySelector('.product-img');
        const title = node.querySelector('.product-title');
        const price = node.querySelector('.product-price');
        const link = node.querySelector('.product-link');

        if (img) {
            // prefer database-provided image paths; fall back to a tiny transparent placeholder
            img.src = product.image || product.imagen_url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
            img.alt = product.title || '';
            img.loading = 'lazy';
            img.onerror = function () {
                this.onerror = null;
                // use small data-URI so no extra network request is made
                this.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
                this.classList.add('img-missing');
            };
        }
        if (title) title.textContent = product.title || '';
    if (price) price.textContent = formatPrice(product.price || 0);
        if (link) link.href = product.url || `#/product/${product.id}`;

        // wire add-to-cart button if present: store product info in data-* attrs
        const addBtn = node.querySelector('.btn.add-to-cart');
        if (addBtn) {
            // store minimal data so a delegated listener can use it reliably
            try {
                addBtn.dataset.id = String(product.id ?? '');
                addBtn.dataset.title = String(product.title ?? product.raw?.nombre ?? '');
                addBtn.dataset.price = String(product.price ?? '0');
                debugLog(`renderProduct: addBtn dataset set id=${addBtn.dataset.id}`);
            } catch (e) {
                debugLog('renderProduct: failed to set addBtn dataset ' + e, 'error');
            }
        }

        // stock element (if present in template)
        const stockEl = node.querySelector('.product-stock');
        if (stockEl) {
            if (product.stock === null || product.stock === undefined) {
                stockEl.textContent = '—';
                stockEl.classList.remove('out');
            } else if (Number(product.stock) <= 0) {
                stockEl.textContent = 'Sin existencia';
                stockEl.classList.add('out');
            } else {
                stockEl.textContent = String(product.stock);
                stockEl.classList.remove('out');
            }
        }

        container.appendChild(node);
    }

    function addToBasket(product) {
        debugLog(`addToBasket: called id=${product.id} title=${product.title}`);
        try {
            const key = 'basket';
            const raw = localStorage.getItem(key) || '[]';
            const arr = JSON.parse(raw);
            // item shape: { id_producto, nombre, precio, cantidad }
            const item = {
                id_producto: product.id ?? null,
                nombre: product.title || product.raw?.nombre || '',
                precio: Number(product.price || 0),
                cantidad: 1
            };
            // if exists, increment cantidad
            const exist = arr.find(i => (i.id_producto ?? i.id) === item.id_producto);
            if (exist) {
                exist.cantidad = (Number(exist.cantidad) || 0) + 1;
            } else {
                arr.push(item);
            }
            localStorage.setItem(key, JSON.stringify(arr));
            debugLog(`addToBasket: stored basket length=${arr.length}`);
            // dispatch update event for other parts of the app
            try { window.dispatchEvent(new CustomEvent('basket:updated', { detail: { basket: arr } })); } catch (e) { }
            return true;
        } catch (e) { return false; }
    }

    function matchesFilter(product, attrs) {
        // attrs may have data-filter="best_seller" or data-department / data-category
        if (attrs.filter) {
            const f = attrs.filter;
            // common boolean flags mapping (try several possible property names)
            const boolMap = {
                best_seller: ['best_seller', 'bestSeller', 'best_seller_flag'],
                on_sale: ['on_sale', 'onSale', 'is_on_sale', 'onSaleFlag'],
                new: ['is_new', 'isNew', 'new', 'latest']
            };

            if (boolMap[f]) {
                for (const key of boolMap[f]) {
                    if (product[key] !== undefined) return !!product[key];
                }
                // fallback heuristics
                if (f === 'on_sale' && product.sale_price !== undefined && product.price !== undefined) {
                    return Number(product.sale_price) < Number(product.price);
                }
            }

            // generic check (if product has a property named as the filter)
            if (product[f] !== undefined) return !!product[f];
            return false;
        }
        if (attrs.department) {
            return product.department === attrs.department;
        }
        if (attrs.category) {
            return product.category === attrs.category;
        }
        return true;
    }

    function gatherAttrs(el) {
        return {
            filter: el.getAttribute('data-filter'),
            department: el.getAttribute('data-department'),
            category: el.getAttribute('data-category'),
            limit: parseInt(el.getAttribute('data-limit')) || null,
        };
    }

    // Wait for includes to be loaded (so component templates are available)
    function afterIncludes(fn) {
        if (document.querySelector('template#product-card-template')) {
            fn();
        } else {
            document.addEventListener('includes:loaded', fn, { once: true });
        }
    }

    afterIncludes(async () => {
        debugLog('afterIncludes: templates ready, starting fetch');
        const products = await fetchProducts();
        const template = document.querySelector('template#product-card-template');
        if (!template) {
            console.warn('product-card-template not found in DOM. Did you include components/products.html?');
            return;
        }

        const containers = document.querySelectorAll('[data-products]');
        if (!containers || containers.length === 0) return;
        containers.forEach(container => {
            try {
                const attrs = gatherAttrs(container);
                let list = products.filter(p => matchesFilter(p, attrs));
                if (attrs.limit) list = list.slice(0, attrs.limit);
                // clear container
                container.innerHTML = '';
                // normalize fields coming from DB before rendering
                list.forEach(p => {
                    const np = normalizeProduct(p);
                    renderProduct(container, np, template);
                });
                // add a "Ver todo" CTA under the section (link to products listing with query params)
                try {
                    const section = container.closest('section') || container.parentElement;
                    if (section) {
                        // remove existing CTA if any
                        const existing = section.querySelector('.section-cta');
                        if (existing) existing.remove();

                        const cta = document.createElement('div');
                        cta.className = 'section-cta';
                        cta.style.marginTop = '16px';
                        const a = document.createElement('a');
                        a.className = 'btn btn-outline';
                        // build href with params
                        const params = new URLSearchParams();
                        if (attrs.filter) params.set('filter', attrs.filter);
                        if (attrs.department) params.set('department', attrs.department);
                        const href = '/pages/products.html' + (params.toString() ? ('?' + params.toString()) : '');
                        a.href = href;
                        a.textContent = 'Ver todo';
                        cta.appendChild(a);
                        section.appendChild(cta);
                    }
                } catch (e) {
                    console.warn('Could not append Ver todo CTA', e);
                }
            } catch (err) {
                console.error('Error rendering products for a container', err);
            }
        });
    });

    // Delegated click handler for add-to-cart buttons. Using delegation ensures
    // buttons added from templates or later DOM updates still work.
    document.addEventListener('click', function (ev) {
        const btn = ev.target.closest ? ev.target.closest('.btn.add-to-cart') : null;
        if (!btn) return;
        ev.preventDefault();
        try {
            btn.disabled = true;
            const id = btn.dataset.id ?? null;
            const title = btn.dataset.title ?? '';
            const price = Number(btn.dataset.price ?? 0);
            debugLog(`delegate: click id=${id} title=${title} price=${price}`);
            const product = { id: id, title: title, price: price };
            const ok = addToBasket(product);
            debugLog(`delegate: addToBasket result=${ok}`);
            btn.textContent = ok ? '✓ Agregado' : 'Error';
        } catch (e) {
            console.error('add-to-cart delegate error', e);
            debugLog('delegate error: ' + e, 'error');
            btn.textContent = 'Error';
        } finally {
            setTimeout(() => { btn.disabled = false; btn.textContent = 'Agregar'; }, 900);
        }
    });

    // in-page debug logger: writes to console and to a floating panel on the page
    function debugLog(msg, level = 'log') {
        try {
            if (level === 'error') console.error('[debug]', msg);
            else if (level === 'warn') console.warn('[debug]', msg);
            else console.log('[debug]', msg);
        } catch (e) { }
        try {
            let panel = document.getElementById('debug-log');
            if (!panel) {
                panel = document.createElement('div');
                panel.id = 'debug-log';
                panel.style.cssText = 'position:fixed;right:12px;bottom:12px;max-height:40vh;overflow:auto;background:rgba(0,0,0,0.75);color:#fff;padding:8px;font-size:12px;z-index:99999;border-radius:6px;min-width:200px;';
                document.body.appendChild(panel);
            }
            const line = document.createElement('div');
            line.textContent = new Date().toLocaleTimeString() + ' ' + String(msg);
            panel.appendChild(line);
            if (panel.childNodes.length > 200) panel.removeChild(panel.firstChild);
        } catch (e) { }
    }

    // Normalize fields coming from DB to the properties used by templates
    function normalizeProduct(p) {
        if (!p) return {};
        return {
            id: p.id_producto ?? p.id ?? null,
            title: p.nombre ?? p.title ?? p.name ?? '',
            price: (p.precio ?? p.price ?? 0),
            // prefer explicit imagen_url / image fields, else try imagen or build from name heuristics
            // Normalize image path: DB may store either a full URL, a web path (/assets/...), or just a filename.
            // Ensure we return a proper web path so <img> requests don't become relative filenames (which caused 404s).
            image: (function(){
                let img = p.imagen_url ?? p.imagen ?? p.image ?? null;
                if (!img) return null;
                img = String(img).trim();
                if (img === '') return null;
                // If it's already an absolute URL or starts with a slash, leave as-is
                if (/^https?:\/\//i.test(img) || img.startsWith('/')) return img;
                // If it starts with 'assets/' (missing leading slash), add it
                if (img.startsWith('assets/')) return '/' + img;
                // Otherwise assume it's a filename stored in the DB and prepend the products folder
                return '/assets/img/products/' + img;
            })(),
            url: p.url ?? null,
            // some APIs use 'stock', others 'cantidad'
            stock: (p.stock ?? p.cantidad ?? null) !== null ? Number(p.stock ?? p.cantidad) : null,
            // category (from joined Categorias.nombre or other sources)
            category: p.categoria ?? p.category ?? null,
            raw: p
        };
    }
})();
