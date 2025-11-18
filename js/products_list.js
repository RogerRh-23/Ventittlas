// products_list.js
// Fetches /assets/data/products.json and renders product cards into containers marked with [data-products]

(async function () {
    async function fetchProducts() {
        const url = '/php/api/products.php';
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Support two response shapes: { success: true, productos: [...] } or [...]
            if (data && data.success && Array.isArray(data.productos)) {
                return data.productos;
            }
            if (Array.isArray(data)) {
                return data;
            }
            console.error('API error:', data && data.error ? data.error : 'Formato de respuesta inesperado');
            return [];
        } catch (err) {
            console.error('Error fetching products.php', err);
            return [];
        }
    }

    function renderProduct(container, product, template) {
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
        if (price) price.textContent = `$${Number(product.price || 0).toFixed(2)}`;
        if (link) link.href = product.url || `#/product/${product.id}`;

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
        const products = await fetchProducts();
        const template = document.querySelector('template#product-card-template');
        if (!template) {
            console.warn('product-card-template not found in DOM. Did you include components/products.html?');
            return;
        }

        const containers = document.querySelectorAll('[data-products]');
        containers.forEach(container => {
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
        });
    });

    // Normalize fields coming from DB to the properties used by templates
    function normalizeProduct(p) {
        if (!p) return {};
        return {
            id: p.id_producto ?? p.id ?? null,
            title: p.nombre ?? p.title ?? p.name ?? '',
            price: (p.precio ?? p.price ?? 0),
            // prefer explicit imagen_url / image fields, else try imagen or build from name heuristics
            image: p.imagen_url ?? p.imagen ?? p.image ?? null,
            url: p.url ?? null,
            // some APIs use 'stock', others 'cantidad'
            stock: (p.stock ?? p.cantidad ?? null) !== null ? Number(p.stock ?? p.cantidad) : null,
            raw: p
        };
    }
})();
