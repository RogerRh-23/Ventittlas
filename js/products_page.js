// products_page.js
// Wait for includes/templates then initialize filter UI and render all products into #all-products

(function () {
    // price formatter (use global if provided)
    const formatPrice = window.formatPrice || function (v) {
        try {
            const n = Number(v) || 0;
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n);
        } catch (e) {
            return '$' + (Number(v) || 0).toFixed(2);
        }
    };
    const urlParams = new URLSearchParams(window.location.search);
    function fetchProducts() {
        // Try multiple possible URLs for the API
        const urls = [
            '/php/api/products.php',
            '../php/api/products.php',
            './php/api/products.php'
        ];
        
        async function tryFetch(url) {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
            return r.json();
        }
        
        return Promise.allSettled(urls.map(tryFetch))
            .then(results => {
                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        const data = result.value;
                        // support { success:true, productos: [...] } or direct array
                        if (data && data.success && Array.isArray(data.productos)) return data.productos;
                        if (Array.isArray(data)) return data;
                    }
                }
                console.error('All product API URLs failed or returned unexpected format');
                return [];
            })
            .catch(err => { 
                console.error('Error fetching products', err); 
                return []; 
            });
    }

    function uniqueValues(arr, key) {
        return Array.from(new Set(arr.map(i => i[key]).filter(Boolean))).sort();
    }

    function renderList(container, list, template) {
        container.innerHTML = '';
        list.forEach(product => {
            const node = template.content.cloneNode(true);
            const img = node.querySelector('.product-img');
            const title = node.querySelector('.product-title');
            const price = node.querySelector('.product-price');
            const link = node.querySelector('.product-link');

            if (img) {
                img.src = product.image || product.imagen_url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
                img.alt = product.title || '';
                img.loading = 'lazy';
                img.onerror = function () {
                    this.onerror = null;
                    this.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
                    this.classList.add('img-missing');
                };
            }
            if (title) title.textContent = product.title || '';
        if (price) price.textContent = formatPrice(product.price || 0);
            if (link) link.href = product.url || `#/product/${product.id}`;

            // stock handling (template has .product-stock)
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

            // wire add-to-cart button BEFORE appending to DOM
            const addBtn = node.querySelector('.btn.add-to-cart');
            if (addBtn) {
                addBtn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    console.log('Add to cart clicked for product:', product);
                    
                    addBtn.disabled = true;
                    const item = {
                        id_producto: product.id ?? product.id_producto ?? null,
                        nombre: product.title || product.nombre || product.raw?.nombre || '',
                        precio: Number(product.price || product.precio || 0),
                        cantidad: 1
                    };
                    
                    console.log('Adding item to cart:', item);
                    
                    try {
                        const key = 'basket';
                        const arr = JSON.parse(localStorage.getItem(key) || '[]');
                        const exist = arr.find(i => (i.id_producto ?? i.id) === item.id_producto);
                        if (exist) {
                            exist.cantidad = (Number(exist.cantidad)||0) + 1;
                            console.log('Updated existing item quantity:', exist);
                        } else {
                            arr.push(item);
                            console.log('Added new item to cart');
                        }
                        localStorage.setItem(key, JSON.stringify(arr));
                        try { 
                            window.dispatchEvent(new CustomEvent('basket:updated', { detail: { basket: arr } })); 
                        } catch (e) {
                            console.warn('Could not dispatch basket update event:', e);
                        }
                        addBtn.textContent = '✓ Agregado';
                        console.log('Cart updated successfully. Total items:', arr.length);
                    } catch (e) {
                        console.error('Error adding to cart:', e);
                        addBtn.textContent = 'Error';
                    }
                    setTimeout(() => { addBtn.disabled = false; addBtn.textContent = 'Agregar'; }, 900);
                });
            } else {
                console.warn('Add to cart button not found for product:', product.title);
            }
            
            // Add node to DOM AFTER wiring events
            container.appendChild(node);
        });
    }

    function applyFilters(products) {
        const deptEl = document.getElementById('filter-department');
        const catEl = document.getElementById('filter-category');
        const minEl = document.getElementById('filter-price-min');
        const maxEl = document.getElementById('filter-price-max');
        const bestEl = document.getElementById('filter-best');
        const availEl = document.getElementById('filter-available');

        const dept = deptEl ? deptEl.value : '';
        const cat = catEl ? catEl.value : '';
        const minRaw = minEl ? minEl.value : '';
        const maxRaw = maxEl ? maxEl.value : '';
        const min = (minRaw === '' || minRaw === undefined) ? null : parseFloat(minRaw);
        const max = (maxRaw === '' || maxRaw === undefined) ? null : parseFloat(maxRaw);
        const onlyBest = bestEl ? bestEl.checked : false;
        const onlyAvail = availEl ? availEl.checked : false;

        return products.filter(p => {
            if (dept && p.department !== dept) return false;
            if (cat && p.category !== cat) return false;
            if (onlyBest && !p.best_seller) return false; // using best_seller for 'oferta'
            // availability field optional in data
            if (onlyAvail && p.available === false) return false;
            if (min !== null && Number(p.price) < min) return false;
            if (max !== null && Number(p.price) > max) return false;
            // apply url params filters (fallback when UI doesn't have a control)
            const qFilter = urlParams.get('filter');
            if (qFilter) {
                if (qFilter === 'best_seller' && !p.best_seller) return false;
                if (qFilter === 'on_sale') {
                    if (p.on_sale !== undefined) {
                        if (!p.on_sale) return false;
                    } else if (p.sale_price !== undefined && p.price !== undefined) {
                        if (!(Number(p.sale_price) < Number(p.price))) return false;
                    }
                }
                if (qFilter === 'new') {
                    if (p.is_new !== undefined) {
                        if (!p.is_new) return false;
                    }
                }
            }
            const qDept = urlParams.get('department');
            if (qDept && p.department !== qDept) return false;
            return true;
        });
    }

    function populateFilters(products) {
        const deps = uniqueValues(products, 'department');
        const cats = uniqueValues(products, 'category');
        const depSel = document.getElementById('filter-department');
        const catSel = document.getElementById('filter-category');
        if (depSel) {
            deps.forEach(d => {
                const opt = document.createElement('option'); opt.value = d; opt.textContent = d; depSel.appendChild(opt);
            });
        }
        if (catSel) {
            cats.forEach(c => {
                const opt = document.createElement('option'); opt.value = c; opt.textContent = c; catSel.appendChild(opt);
            });
        }
    }

    function init(products) {
        const container = document.getElementById('all-products');
        const template = document.querySelector('template#product-card-template');
        if (!container || !template) return;

        // populate filters
        populateFilters(products);

        // apply query params to UI controls if present
        const qDept = urlParams.get('department');
        const qFilter = urlParams.get('filter');
        if (qDept) {
            const depSelect = document.getElementById('filter-department');
            if (depSelect) depSelect.value = qDept;
        }
        if (qFilter) {
            if (qFilter === 'best_seller') {
                const bestChk = document.getElementById('filter-best');
                if (bestChk) bestChk.checked = true;
            }
            // other filters (on_sale, new) are applied in applyFilters via urlParams
        }

        const applyBtn = document.getElementById('apply-filters');
        const clearBtn = document.getElementById('clear-filters');
        const rangeMin = document.getElementById('filter-price-min');
        const rangeMax = document.getElementById('filter-price-max');
        const labelMin = document.getElementById('price-min-label');
        const labelMax = document.getElementById('price-max-label');

        // initialize slider bounds from products
        const prices = products.map(p => Number(p.price)).filter(n => !isNaN(n));
        const dataMin = Math.min(...prices, 0);
        const dataMax = Math.max(...prices, 1000);
        if (rangeMin && rangeMax) {
            rangeMin.min = dataMin;
            rangeMin.max = dataMax;
            rangeMax.min = dataMin;
            rangeMax.max = dataMax;
            rangeMin.value = dataMin;
            rangeMax.value = dataMax;
        }
        if (labelMin) labelMin.textContent = Number(rangeMin.value).toFixed(0);
        if (labelMax) labelMax.textContent = Number(rangeMax.value).toFixed(0);

        // Create (or find) the visual fill bar inside the range-wrap
        const rangeWrap = document.querySelector('.range-wrap');
        let rangeFill = rangeWrap ? rangeWrap.querySelector('.range-fill') : null;
        if (rangeWrap && !rangeFill) {
            rangeFill = document.createElement('div');
            rangeFill.className = 'range-fill';
            rangeWrap.appendChild(rangeFill);
        }

        function updateRangeFill() {
            if (!rangeFill || !rangeMin || !rangeMax) return;
            const min = Number(rangeMin.min);
            const max = Number(rangeMax.max);
            const a = Number(rangeMin.value);
            const b = Number(rangeMax.value);
            // protect against division by zero
            const span = (max - min) || 1;
            const pA = ((a - min) / span) * 100;
            const pB = ((b - min) / span) * 100;
            const left = Math.min(pA, pB);
            const right = Math.max(pA, pB);
            rangeFill.style.left = left + '%';
            rangeFill.style.width = (right - left) + '%';
        }

        function doRender() {
            const filtered = applyFilters(products);
            renderList(container, filtered, template);
        }

        // live render when user moves sliders (immediate feedback)
        if (rangeMin) {
            rangeMin.addEventListener('input', () => {
                // prevent min exceeding max
                if (Number(rangeMin.value) > Number(rangeMax.value)) {
                    rangeMin.value = rangeMax.value;
                }
                if (labelMin) labelMin.textContent = Number(rangeMin.value).toFixed(0);
                updateRangeFill();
                doRender();
            });
        }
        if (rangeMax) {
            rangeMax.addEventListener('input', () => {
                // prevent max going below min
                if (Number(rangeMax.value) < Number(rangeMin.value)) {
                    rangeMax.value = rangeMin.value;
                }
                if (labelMax) labelMax.textContent = Number(rangeMax.value).toFixed(0);
                updateRangeFill();
                doRender();
            });
        }

        applyBtn.addEventListener('click', doRender);
        clearBtn.addEventListener('click', () => {
            document.getElementById('filter-department').value = '';
            document.getElementById('filter-category').value = '';
            // reset slider to dataset bounds
            if (rangeMin && rangeMax) {
                rangeMin.value = rangeMin.min;
                rangeMax.value = rangeMax.max;
                if (labelMin) labelMin.textContent = Number(rangeMin.value).toFixed(0);
                if (labelMax) labelMax.textContent = Number(rangeMax.value).toFixed(0);
                updateRangeFill();
            }
            document.getElementById('filter-best').checked = false;
            document.getElementById('filter-available').checked = false;
            doRender();
        });

        // initial render
        updateRangeFill();
        doRender();
        
        // Debug: Log initialization
        console.log('Products page initialized with', products.length, 'products');
    }

    function afterIncludes(fn) {
        if (document.querySelector('template#product-card-template')) fn();
        else document.addEventListener('includes:loaded', fn, { once: true });
    }

    afterIncludes(async () => {
        let products = await fetchProducts();
        // normalize all products to the shape used by the templates
        products = products.map(p => normalizeProduct(p));
        init(products);
    });

    function normalizeProduct(p) {
        if (!p) return {};
        return {
            id: p.id_producto ?? p.id ?? null,
            title: p.nombre ?? p.title ?? p.name ?? '',
            price: (p.precio ?? p.price ?? 0),
            image: (function () {
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
            stock: (p.stock ?? p.cantidad ?? null) !== null ? Number(p.stock ?? p.cantidad) : null,
            // category field coming from products API (categoria) or other sources
            category: p.categoria ?? p.category ?? null,
            // pass through original properties for compatibility
            id_producto: p.id_producto,
            nombre: p.nombre,
            precio: p.precio,
            imagen_url: p.imagen_url,
            raw: p
        };
    }

    // Debugging helper - expose functions for console testing
    if (typeof window !== 'undefined') {
        window.debugProducts = {
            fetchProducts: fetchProducts,
            normalizeProduct: normalizeProduct,
            testAddToCart: function(productId) {
                const mockProduct = {
                    id: productId,
                    id_producto: productId,
                    title: 'Test Product',
                    nombre: 'Test Product',
                    price: 100,
                    precio: 100
                };
                
                const item = {
                    id_producto: mockProduct.id ?? mockProduct.id_producto ?? null,
                    nombre: mockProduct.title || mockProduct.nombre || '',
                    precio: Number(mockProduct.price || mockProduct.precio || 0),
                    cantidad: 1
                };
                
                try {
                    const key = 'basket';
                    const arr = JSON.parse(localStorage.getItem(key) || '[]');
                    const exist = arr.find(i => (i.id_producto ?? i.id) === item.id_producto);
                    if (exist) exist.cantidad = (Number(exist.cantidad)||0) + 1; 
                    else arr.push(item);
                    localStorage.setItem(key, JSON.stringify(arr));
                    window.dispatchEvent(new CustomEvent('basket:updated', { detail: { basket: arr } }));
                    console.log('Added to cart:', item);
                    console.log('Current cart:', arr);
                    return true;
                } catch (e) {
                    console.error('Error adding to cart:', e);
                    return false;
                }
            }
        };
    }
})();
