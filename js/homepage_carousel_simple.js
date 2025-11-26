// homepage_carousel.js
// Agrega navegación por flechas a las secciones de productos del homepage

(function () {
    'use strict';

    function setupSectionCarousel(gridId, sectionKey) {
        const grid = document.getElementById(gridId);
        const prevBtn = document.querySelector(`button[data-section="${sectionKey}"].nav-prev`);
        const nextBtn = document.querySelector(`button[data-section="${sectionKey}"].nav-next`);
        
        if (!grid || !prevBtn || !nextBtn) return;

        const products = Array.from(grid.querySelectorAll('.product-card'));
        const itemsPerPage = 5;
        let currentPage = 0;
        const totalPages = Math.ceil(products.length / itemsPerPage);

        function showPage(pageIndex) {
            products.forEach((product, index) => {
                const startIndex = pageIndex * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                
                if (index >= startIndex && index < endIndex) {
                    product.style.display = 'block';
                } else {
                    product.style.display = 'none';
                }
            });

            // Update button states
            prevBtn.disabled = pageIndex === 0;
            nextBtn.disabled = pageIndex >= totalPages - 1;
            
            prevBtn.style.opacity = pageIndex === 0 ? '0.3' : '1';
            nextBtn.style.opacity = pageIndex >= totalPages - 1 ? '0.3' : '1';
        }

        // Setup navigation handlers
        prevBtn.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                showPage(currentPage);
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages - 1) {
                currentPage++;
                showPage(currentPage);
            }
        });

        // Show initial page
        showPage(0);
        
        console.log(`Carousel setup for ${sectionKey}: ${products.length} products, ${totalPages} pages`);
    }

    function initializeCarousels() {
        // Wait for products to be loaded
        const checkProducts = () => {
            const gridsWithProducts = document.querySelectorAll('.products-grid .product-card');
            
            if (gridsWithProducts.length === 0) {
                setTimeout(checkProducts, 200);
                return;
            }

            console.log('Products detected, setting up carousels...');
            
            // Setup each section
            const sections = [
                { gridId: 'ofertas-grid', sectionKey: 'ofertas' },
                { gridId: 'nuevas-grid', sectionKey: 'nuevas' },
                { gridId: 'hogar-grid', sectionKey: 'hogar' },
                { gridId: 'cuidado-grid', sectionKey: 'cuidado' },
                { gridId: 'electronica-grid', sectionKey: 'electronica' },
                { gridId: 'vehiculos-grid', sectionKey: 'vehiculos' }
            ];

            sections.forEach(({ gridId, sectionKey }) => {
                setupSectionCarousel(gridId, sectionKey);
            });
        };

        checkProducts();
    }

    // Initialize after DOM and includes are loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.addEventListener('includes:loaded', initializeCarousels, { once: true });
        });
    } else {
        document.addEventListener('includes:loaded', initializeCarousels, { once: true });
    }

    // Fallback - try to initialize after 2 seconds
    setTimeout(initializeCarousels, 2000);
})();