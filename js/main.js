// Búsqueda dinámica en la tienda
// Intercepta el submit del formulario de búsqueda y muestra los resultados en la página principal

document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.querySelector('.nav-search');
    const searchInput = document.querySelector('#nav-search-input');
    if (!searchForm || !searchInput) return;

    searchForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            searchInput.focus();
            return;
        }

        // Mostrar resultados en la página principal
        const productsGrid = document.createElement('div');
        productsGrid.className = 'products-grid search-results-grid';
        productsGrid.innerHTML = '<p>Buscando productos...</p>';

        // Insertar resultados arriba del main
        let resultsSection = document.getElementById('search-results-section');
        if (!resultsSection) {
            resultsSection = document.createElement('section');
            resultsSection.id = 'search-results-section';
            resultsSection.className = 'featured-products';
            resultsSection.innerHTML = '<h2>Resultados de búsqueda</h2>';
            document.querySelector('main.site-main').prepend(resultsSection);
        }
        resultsSection.innerHTML = '<h2>Resultados de búsqueda</h2>';
        resultsSection.appendChild(productsGrid);

        // Obtener productos
        let products = [];
        try {
            const res = await fetch('/php/api/products.php');
            if (res.ok) {
                products = await res.json();
            }
        } catch (err) {
            productsGrid.innerHTML = '<p>Error al buscar productos.</p>';
            return;
        }

        // Filtrar productos por nombre o descripción
        const filtered = products.filter(p => {
            const nombre = (p.nombre || p.title || '').toLowerCase();
            const descripcion = (p.descripcion || p.description || '').toLowerCase();
            return nombre.includes(query) || descripcion.includes(query);
        });

        // Mostrar resultados
        productsGrid.innerHTML = '';
        if (filtered.length === 0) {
            productsGrid.innerHTML = '<p>No se encontraron productos para "' + query + '".</p>';
            return;
        }

        // Usar el template de producto si existe
        const template = document.querySelector('template#product-card-template');
        filtered.forEach(product => {
            if (template && window.renderProductWithDiscount) {
                const node = window.renderProductWithDiscount(product, template);
                if (node) productsGrid.appendChild(node);
            } else if (template) {
                // Fallback sin descuentos
                const node = template.content.cloneNode(true);
                const img = node.querySelector('.product-img');
                const title = node.querySelector('.product-title');
                const price = node.querySelector('.product-price');
                const link = node.querySelector('.product-link');
                if (img) img.src = product.imagen_url || product.image || '/assets/img/products/placeholder.png';
                if (img) img.alt = product.nombre || product.title;
                if (title) title.textContent = product.nombre || product.title;
                const formatPrice = window.formatPrice || function (v) {
                    try {
                        const n = Number(v) || 0;
                        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n);
                    } catch (e) {
                        return '$' + (Number(v) || 0).toFixed(2);
                    }
                };
                if (price) price.textContent = formatPrice(product.precio ?? product.price ?? 0);
                const stockEl = node.querySelector('.product-stock');
                if (stockEl) {
                    const stockVal = (product.stock !== undefined && product.stock !== null) ? Number(product.stock) : null;
                    if (stockVal === null) {
                        stockEl.textContent = '—';
                    } else if (stockVal <= 0) {
                        stockEl.textContent = 'Sin existencia';
                        stockEl.style.color = '#c00';
                    } else {
                        stockEl.textContent = String(stockVal);
                    }
                }
                if (link) link.href = product.url || ('#/product/' + (product.id_producto || product.id));
                productsGrid.appendChild(node);
            } else {
                // Fallback simple
                const div = document.createElement('div');
                div.className = 'product-card';
                div.innerHTML = `<strong>${product.nombre || product.title}</strong><br><span>${product.descripcion || product.description}</span>`;
                productsGrid.appendChild(div);
            }
        });
    });
});
