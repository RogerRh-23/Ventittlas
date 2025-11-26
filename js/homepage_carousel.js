// homepage_carousel.js
// Maneja la navegación por flechas en las secciones de productos del homepage

(function () {
    'use strict';
    
    // Configuración de secciones con sus datos de productos (basado en la tabla de categorías)
    const sectionsConfig = {
        ofertas: { 
            container: 'ofertas-grid', 
            filter: 'on_sale', 
            itemsPerPage: 5,
            currentPage: 0 
        },
        nuevas: { 
            container: 'nuevas-grid', 
            filter: 'new', 
            itemsPerPage: 5,
            currentPage: 0 
        },
        hogar: { 
            container: 'hogar-grid', 
            category: 'Ropa', // ID 11 en la tabla
            itemsPerPage: 5,
            currentPage: 0 
        },
        cuidado: { 
            container: 'cuidado-grid', 
            category: 'Cuidado Personal', // ID 18 en la tabla
            itemsPerPage: 5,
            currentPage: 0 
        },
        electronica: { 
            container: 'electronica-grid', 
            category: 'Electronica', // ID 8 en la tabla
            itemsPerPage: 5,
            currentPage: 0 
        },
        vehiculos: { 
            container: 'vehiculos-grid', 
            category: 'Vehiculos Personales', // ID 14 en la tabla
            itemsPerPage: 5,
            currentPage: 0 
        }
    };

    let allProducts = [];
    let filteredProductsBySection = {};

    async function fetchAllProducts() {
        try {
            const response = await fetch('/php/api/products.php');
            const data = await response.json();
            
            if (data && data.success && Array.isArray(data.productos)) {
                return data.productos.map(p => normalizeProduct(p));
            }
            return [];
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

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
                if (/^https?:\\/\\//i.test(img) || img.startsWith('/')) return img;
                if (img.startsWith('assets/')) return '/' + img;
                return '/assets/img/products/' + img;
            })(),
            category: p.categoria ?? p.category ?? null,
            stock: (p.stock ?? p.cantidad ?? null) !== null ? Number(p.stock ?? p.cantidad) : null,
            porcentaje_descuento: parseFloat(p.porcentaje_descuento || p.descuento || 0),
            // Para "nuevas llegadas" usaremos el ID como indicador de reciente
            id_producto: p.id_producto,
            raw: p
        };
    }

    function filterProductsForSection(sectionKey, config) {
        let filtered = [];

        if (config.filter === 'on_sale') {
            // Productos en oferta (con descuento)
            filtered = allProducts.filter(p => p.porcentaje_descuento > 0);
        } else if (config.filter === 'new') {
            // Nuevas llegadas: productos con los IDs más altos (más recientes)
            const sortedByDate = [...allProducts].sort((a, b) => b.id - a.id);
            filtered = sortedByDate.slice(0, 30); // Tomar los 30 más recientes para paginar
        } else if (config.category) {
            // Filtrar por categoría (buscar coincidencias parciales para mayor flexibilidad)
            filtered = allProducts.filter(p => {
                if (!p.category) return false;
                const productCategory = p.category.toLowerCase();
                const targetCategory = config.category.toLowerCase();
                
                // Buscar coincidencias exactas o parciales
                return productCategory === targetCategory || 
                       productCategory.includes(targetCategory) ||
                       targetCategory.includes(productCategory);
            });
            
            // Si no encuentra productos, intentar con categorías alternativas
            if (filtered.length === 0) {
                const alternativeCategories = {
                    'ropa': ['clothing', 'vestimenta', 'textiles'],
                    'cuidado personal': ['higiene', 'belleza', 'cosmeticos', 'personal care'],
                    'electronica': ['electronics', 'tecnologia', 'gadgets', 'dispositivos'],
                    'vehiculos personales': ['vehiculos', 'transporte', 'autos', 'motos']
                };
                
                const alternatives = alternativeCategories[config.category.toLowerCase()] || [];
                filtered = allProducts.filter(p => {
                    if (!p.category) return false;
                    const productCategory = p.category.toLowerCase();
                    return alternatives.some(alt => 
                        productCategory.includes(alt) || alt.includes(productCategory)
                    );
                });
            }
        }

        // Si aún no hay productos, tomar una muestra aleatoria como fallback
        if (filtered.length === 0) {
            console.warn(`No products found for section ${sectionKey}, using random sample`);
            const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
            filtered = shuffled.slice(0, 15);
        }

        console.log(`Section ${sectionKey}: ${filtered.length} products filtered`);
        return filtered;
    }

    function renderProductsForPage(sectionKey, pageIndex = 0) {
        const config = sectionsConfig[sectionKey];
        if (!config) return;

        const container = document.getElementById(config.container);
        if (!container) return;

        const filteredProducts = filteredProductsBySection[sectionKey] || [];
        const startIndex = pageIndex * config.itemsPerPage;
        const endIndex = startIndex + config.itemsPerPage;
        const pageProducts = filteredProducts.slice(startIndex, endIndex);

        // Limpiar contenedor
        container.innerHTML = '';

        if (pageProducts.length === 0) {
            container.innerHTML = '<p class="no-products">No hay productos disponibles</p>';
            return;
        }

        // Buscar template
        const template = document.querySelector('template#product-card-template');
        if (!template) {
            console.warn('Product card template not found');
            return;
        }

        // Renderizar productos
        pageProducts.forEach(product => {
            renderProductCard(container, product, template);
        });

        // Actualizar estado de botones
        updateNavigationButtons(sectionKey);
    }

    function renderProductCard(container, product, template) {
        const node = template.content.cloneNode(true);
        const img = node.querySelector('.product-img');
        const title = node.querySelector('.product-title');
        const price = node.querySelector('.product-price');
        const link = node.querySelector('.product-link');

        if (img) {
            img.src = product.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
            img.alt = product.title || '';
            img.loading = 'lazy';
            img.onerror = function () {
                this.onerror = null;
                this.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
                this.classList.add('img-missing');
            };
        }
        if (title) title.textContent = product.title || '';
        if (price) {
            const formatPrice = window.formatPrice || function (v) {
                try {
                    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(Number(v) || 0);
                } catch (e) {
                    return '$' + (Number(v) || 0).toFixed(2);
                }
            };
            price.textContent = formatPrice(product.price || 0);
        }
        if (link) link.href = product.url || `#/product/${product.id}`;

        // Stock handling
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

        // Add to cart button
        const addBtn = node.querySelector('.btn.add-to-cart');
        if (addBtn) {
            addBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                addBtn.disabled = true;
                console.log('Adding product to basket:', product);
                
                const item = {
                    id_producto: product.id ?? product.id_producto ?? null,
                    nombre: product.title || product.nombre || '',
                    precio: Number(product.price || product.precio || 0),
                    cantidad: 1
                };
                
                try {
                    const key = 'basket';
                    const arr = JSON.parse(localStorage.getItem(key) || '[]');
                    const exist = arr.find(i => (i.id_producto ?? i.id) === item.id_producto);
                    if (exist) {
                        exist.cantidad = (Number(exist.cantidad) || 0) + 1;
                    } else {
                        arr.push(item);
                    }
                    localStorage.setItem(key, JSON.stringify(arr));
                    window.dispatchEvent(new CustomEvent('basket:updated', { detail: { basket: arr } }));
                    addBtn.textContent = '✓ Agregado';
                } catch (e) {
                    addBtn.textContent = 'Error';
                }
                setTimeout(() => { addBtn.disabled = false; addBtn.textContent = 'Agregar'; }, 900);
            });
        }

        container.appendChild(node);
    }

    function updateNavigationButtons(sectionKey) {
        const config = sectionsConfig[sectionKey];
        const filteredProducts = filteredProductsBySection[sectionKey] || [];
        const totalPages = Math.ceil(filteredProducts.length / config.itemsPerPage);
        
        const prevBtn = document.querySelector(`button[data-section="${sectionKey}"].nav-prev`);
        const nextBtn = document.querySelector(`button[data-section="${sectionKey}"].nav-next`);
        
        if (prevBtn) {
            prevBtn.disabled = config.currentPage === 0;
            prevBtn.style.opacity = config.currentPage === 0 ? '0.3' : '1';
        }
        
        if (nextBtn) {
            nextBtn.disabled = config.currentPage >= totalPages - 1;
            nextBtn.style.opacity = config.currentPage >= totalPages - 1 ? '0.3' : '1';
        }
    }

    function setupNavigationHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-btn')) {
                const sectionKey = e.target.getAttribute('data-section');
                const config = sectionsConfig[sectionKey];
                
                if (!config) return;
                
                if (e.target.classList.contains('nav-prev') && config.currentPage > 0) {
                    config.currentPage--;
                    renderProductsForPage(sectionKey, config.currentPage);
                } else if (e.target.classList.contains('nav-next')) {
                    const filteredProducts = filteredProductsBySection[sectionKey] || [];
                    const totalPages = Math.ceil(filteredProducts.length / config.itemsPerPage);
                    
                    if (config.currentPage < totalPages - 1) {
                        config.currentPage++;
                        renderProductsForPage(sectionKey, config.currentPage);
                    }
                }
            }
        });
    }

    async function initialize() {
        console.log('Initializing homepage carousel...');
        
        // Obtener todos los productos
        allProducts = await fetchAllProducts();
        console.log('Total products loaded:', allProducts.length);
        
        // Filtrar productos por sección
        Object.keys(sectionsConfig).forEach(sectionKey => {
            const config = sectionsConfig[sectionKey];
            filteredProductsBySection[sectionKey] = filterProductsForSection(sectionKey, config);
            console.log(`Section ${sectionKey}: ${filteredProductsBySection[sectionKey].length} products`);
        });
        
        // Renderizar página inicial de cada sección
        Object.keys(sectionsConfig).forEach(sectionKey => {
            renderProductsForPage(sectionKey, 0);
        });
        
        // Configurar navegación
        setupNavigationHandlers();
        
        console.log('Homepage carousel initialized');
    }

    // Esperar a que se carguen los includes
    function afterIncludes(fn) {
        if (document.querySelector('template#product-card-template')) {
            fn();
        } else {
            document.addEventListener('includes:loaded', fn, { once: true });
        }
    }

    afterIncludes(initialize);

    // Debug helper
    window.homepageDebug = {
        sectionsConfig: sectionsConfig,
        filteredProductsBySection: filteredProductsBySection,
        allProducts: () => allProducts,
        refreshSection: (sectionKey) => {
            if (sectionsConfig[sectionKey]) {
                sectionsConfig[sectionKey].currentPage = 0;
                renderProductsForPage(sectionKey, 0);
            }
        },
        logSectionStats: () => {
            Object.keys(sectionsConfig).forEach(key => {
                const filtered = filteredProductsBySection[key] || [];
                console.log(`${key}: ${filtered.length} products, page ${sectionsConfig[key].currentPage}`);
            });
        }
    };
})();