// products_discount.js
// Funcionalidad para manejar productos con descuentos y ofertas

document.addEventListener('DOMContentLoaded', function () {
    // Función global para formatear precios
    window.formatPrice = function (value) {
        try {
            return new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 2
            }).format(Number(value) || 0);
        } catch (e) {
            return '$ ' + (Number(value) || 0).toFixed(2);
        }
    };

    // Función para aplicar descuentos a productos
    window.applyProductDiscount = function (product) {
        const precio = parseFloat(product.precio || product.price || 0);
        const descuento = parseFloat(product.porcentaje_descuento || product.descuento || 0);

        if (descuento > 0 && descuento <= 100) {
            const precioFinal = precio * (1 - descuento / 100);
            return {
                ...product,
                precio_original: precio,
                precio_final: precioFinal,
                tiene_descuento: true,
                porcentaje_descuento: descuento
            };
        }

        return {
            ...product,
            precio_original: precio,
            precio_final: precio,
            tiene_descuento: false,
            porcentaje_descuento: 0
        };
    };

    // Función para renderizar producto con descuento
    window.renderProductWithDiscount = function (product, template) {
        if (!template) return null;

        const productWithDiscount = window.applyProductDiscount(product);
        const node = template.content.cloneNode(true);

        // Elementos básicos
        const img = node.querySelector('.product-img');
        const title = node.querySelector('.product-title');
        const link = node.querySelector('.product-link');

        if (img) {
            img.src = product.imagen_url || product.image || '/assets/img/products/placeholder.png';
            img.alt = product.nombre || product.title || 'Producto';
        }

        if (title) {
            title.textContent = product.nombre || product.title || 'Producto';
        }

        if (link) {
            link.href = product.url || ('#/product/' + (product.id_producto || product.id || ''));
        }

        // Elementos de precio y descuento
        const priceOriginal = node.querySelector('.product-price-original');
        const price = node.querySelector('.product-price');
        const discount = node.querySelector('.product-discount');
        const badge = node.querySelector('.product-badge--sale');

        if (productWithDiscount.tiene_descuento) {
            // Mostrar precio original tachado
            if (priceOriginal) {
                priceOriginal.textContent = window.formatPrice(productWithDiscount.precio_original);
                priceOriginal.style.display = 'inline';
                priceOriginal.style.textDecoration = 'line-through';
                priceOriginal.style.color = '#999';
                priceOriginal.style.marginRight = '8px';
            }

            // Mostrar precio con descuento
            if (price) {
                price.textContent = window.formatPrice(productWithDiscount.precio_final);
                price.style.color = '#e74c3c';
                price.style.fontWeight = 'bold';
            }

            // Mostrar porcentaje de descuento
            if (discount) {
                discount.textContent = `-${productWithDiscount.porcentaje_descuento}%`;
                discount.style.display = 'inline';
                discount.style.color = '#e74c3c';
                discount.style.fontSize = '0.9em';
                discount.style.fontWeight = 'bold';
                discount.style.marginLeft = '8px';
            }

            // Mostrar badge de oferta
            if (badge) {
                badge.style.display = 'inline-block';
            }
        } else {
            // Precio normal
            if (price) {
                price.textContent = window.formatPrice(productWithDiscount.precio_final);
            }

            if (priceOriginal) priceOriginal.style.display = 'none';
            if (discount) discount.style.display = 'none';
            if (badge) badge.style.display = 'none';
        }

        // Stock
        const stockEl = node.querySelector('.product-stock');
        if (stockEl) {
            const stockVal = (product.stock !== undefined && product.stock !== null) ? Number(product.stock) : null;
            if (stockVal === null) {
                stockEl.textContent = '—';
            } else if (stockVal <= 0) {
                stockEl.textContent = 'Sin existencia';
                stockEl.style.color = '#c00';
            } else {
                stockEl.textContent = `${stockVal} disponible${stockVal === 1 ? '' : 's'}`;
                stockEl.style.color = '#28a745';
            }
        }

        // Botón de agregar al carrito
        const addButton = node.querySelector('.add-to-cart');
        if (addButton) {
            addButton.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Usar precio final (con descuento si aplica)
                const productForCart = {
                    id_producto: product.id_producto || product.id,
                    nombre: product.nombre || product.title,
                    precio: productWithDiscount.precio_final,
                    cantidad: 1
                };

                // Agregar al carrito
                let basket = JSON.parse(localStorage.getItem('basket') || '[]');
                const existing = basket.find(item => item.id_producto === productForCart.id_producto);

                if (existing) {
                    existing.cantidad += 1;
                } else {
                    basket.push(productForCart);
                }

                localStorage.setItem('basket', JSON.stringify(basket));

                // Disparar evento para actualizar UI
                try {
                    window.dispatchEvent(new CustomEvent('basket:updated', {
                        detail: { basket: basket }
                    }));
                } catch (e) { /* ignore */ }

                // Feedback visual
                addButton.textContent = '✓ Agregado';
                addButton.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    addButton.textContent = 'Agregar';
                    addButton.style.backgroundColor = '';
                }, 1500);
            });
        }

        return node;
    };

    // Filtrar productos en oferta
    window.getProductsOnSale = function (products) {
        return products.filter(product => {
            const descuento = parseFloat(product.porcentaje_descuento || product.descuento || 0);
            return descuento > 0;
        });
    };
});