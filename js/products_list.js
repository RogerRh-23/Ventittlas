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
        // Use discount rendering if available
        if (window.renderProductWithDiscount) {
            const node = window.renderProductWithDiscount(product, template);
            if (node) {
                container.appendChild(node);
                return;
            }
        }

        // Fallback rendering without discounts
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

        // wire add-to-cart button if present (BEFORE appending to DOM)
        const addBtn = node.querySelector('.btn.add-to-cart');
        if (addBtn) {
            addBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                addBtn.disabled = true;
                console.log('Adding product to basket:', product);
                const ok = addToBasket(product);
                // simple feedback
                addBtn.textContent = ok ? '✓ Agregado' : 'Error';
                setTimeout(() => { addBtn.disabled = false; addBtn.textContent = 'Agregar'; }, 900);
            });
        }

        container.appendChild(node);
    }

    function addToBasket(product) {
        try {
            console.log('addToBasket called with product:', product);
            const key = 'basket';
            const raw = localStorage.getItem(key) || '[]';
            const arr = JSON.parse(raw);
            // item shape: { id_producto, nombre, precio, cantidad }
            const item = {
                id_producto: product.id ?? product.id_producto ?? null,
                nombre: product.title || product.nombre || product.raw?.nombre || '',
                precio: Number(product.price || product.precio || 0),
                cantidad: 1
            };
            
            console.log('Creating basket item:', item);
            
            // if exists, increment cantidad
            const exist = arr.find(i => (i.id_producto ?? i.id) === item.id_producto);
            if (exist) {
                exist.cantidad = (Number(exist.cantidad) || 0) + 1;
                console.log('Updated existing item:', exist);
            } else {
                arr.push(item);
                console.log('Added new item to basket');
            }
            localStorage.setItem(key, JSON.stringify(arr));
            console.log('Basket updated. Total items:', arr.length);
            
            // dispatch update event for other parts of the app
            try { 
                window.dispatchEvent(new CustomEvent('basket:updated', { detail: { basket: arr } })); 
                console.log('Dispatched basket:updated event');
            } catch (e) { 
                console.warn('Could not dispatch basket update event:', e);
            }
            return true;
        } catch (e) { 
            console.error('Error in addToBasket:', e);
            return false; 
        }
    }

    function matchesFilter(product, attrs) {
        // attrs may have data-filter="best_seller" or data-department / data-category
        if (attrs.filter) {
            const f = attrs.filter;
            
            if (f === 'on_sale') {
                // Check if product has discount percentage
                const descuento = parseFloat(product.porcentaje_descuento || product.descuento || 0);
                if (descuento > 0) return true;
                
                // Check sale_price vs regular price
                if (product.sale_price !== undefined && product.price !== undefined) {
                    return Number(product.sale_price) < Number(product.price);
                }
                return false;
            }
            
            if (f === 'new') {
                // For "new" products, check if it's among the most recent (highest IDs)
                return true; // Will be handled by sorting in the calling function
            }
            
            // Check for other boolean flags
            const boolMap = {
                best_seller: ['best_seller', 'bestSeller', 'best_seller_flag'],
                featured: ['featured', 'destacado']
            };

            if (boolMap[f]) {
                for (const key of boolMap[f]) {
                    if (product[key] !== undefined) return !!product[key];
                }
            }

            // generic check (if product has a property named as the filter)
            if (product[f] !== undefined) return !!product[f];
            return false;
        }
        
        if (attrs.department) {
            const productDept = (product.department || product.categoria || '').toLowerCase();
            const targetDept = attrs.department.toLowerCase();
            return productDept === targetDept || productDept.includes(targetDept);
        }
        
        if (attrs.category) {
            const productCat = (product.categoria || product.category || '').toLowerCase();
            
            // Dividir las categorías del filtro por comas (para múltiples categorías)
            const targetCategories = attrs.category.split(',').map(cat => cat.trim().toLowerCase());
            
            // Verificar si el producto coincide con alguna de las categorías
            return targetCategories.some(targetCat => {
                // Exact match first
                if (productCat === targetCat) return true;
                
                // Partial matches
                if (productCat.includes(targetCat) || targetCat.includes(productCat)) return true;
                
                return false;
            });
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

    // Normalize fields coming from DB to the properties used by templates
    function normalizeProduct(p) {
        if (!p) return {};
        return {
            id: p.id_producto ?? p.id ?? null,
            title: p.nombre ?? p.title ?? p.name ?? '',
            price: (p.precio ?? p.price ?? 0),
            // Normalize image path
            image: (function () {
                let img = p.imagen_url ?? p.imagen ?? p.image ?? null;
                if (!img) return null;
                img = String(img).trim();
                if (img === '') return null;
                // If it's already an absolute URL or starts with a slash, leave as-is
                if (/^https?:\/\//.test(img) || img.startsWith('/')) return img;
                // If it starts with 'assets/' (missing leading slash), add it
                if (img.startsWith('assets/')) return '/' + img;
                // Otherwise assume it's a filename stored in the DB and prepend the products folder
                return '/assets/img/products/' + img;
            })(),
            url: p.url ?? null,
            stock: (p.stock ?? p.cantidad ?? null) !== null ? Number(p.stock ?? p.cantidad) : null,
            // category handling - use 'categoria' from DB as primary
            category: p.categoria ?? p.category ?? null,
            categoria: p.categoria ?? p.category ?? null, // Keep both for compatibility
            // discount information
            porcentaje_descuento: parseFloat(p.porcentaje_descuento || p.descuento || 0),
            // pass through raw product data
            nombre: p.nombre,
            precio: p.precio,
            imagen_url: p.imagen_url,
            raw: p
        };
    }
})();
