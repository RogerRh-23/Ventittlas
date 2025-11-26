// debug_products.js
// Script de debug para mostrar qué productos y categorías están disponibles

(function() {
    async function debugProducts() {
        try {
            console.log('=== DEBUG PRODUCTS ===');
            
            const response = await fetch('/php/api/products.php');
            const data = await response.json();
            
            if (!data || !data.success || !Array.isArray(data.productos)) {
                console.error('No products data available:', data);
                return;
            }
            
            const products = data.productos;
            console.log(`Total products: ${products.length}`);
            
            // Mostrar categorías únicas
            const categories = new Set();
            products.forEach(p => {
                if (p.categoria) {
                    categories.add(p.categoria);
                }
            });
            
            console.log('Available categories:', Array.from(categories));
            
            // Mostrar algunos productos de ejemplo
            console.log('Sample products:');
            products.slice(0, 5).forEach(p => {
                console.log(`- ${p.nombre} (Categoría: ${p.categoria || 'Sin categoría'})`);
            });
            
            // Contar productos por categoría
            const categoryCount = {};
            products.forEach(p => {
                const cat = p.categoria || 'Sin categoría';
                categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            });
            
            console.log('Products per category:');
            Object.entries(categoryCount).forEach(([cat, count]) => {
                console.log(`- ${cat}: ${count} productos`);
            });
            
        } catch (error) {
            console.error('Error debugging products:', error);
        }
    }
    
    // Ejecutar debug después de cargar
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(debugProducts, 1000);
    });
})();