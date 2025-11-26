// admin_orders.js - Gestión de órdenes de venta en el panel admin

(function() {
    'use strict';

    let currentPage = 1;
    let currentFilters = {};
    let totalPages = 1;

    // Elementos del DOM
    const elements = {
        // Filtros
        filterDateFrom: null,
        filterDateTo: null,
        filterStatus: null,
        applyFiltersBtn: null,
        clearFiltersBtn: null,
        
        // Estadísticas
        totalSales: null,
        ordersToday: null,
        averageOrder: null,
        pendingOrders: null,
        
        // Tabla y paginación
        ordersTableBody: null,
        paginationInfo: null,
        pageInfo: null,
        prevPageBtn: null,
        nextPageBtn: null,
        refreshBtn: null,
        exportBtn: null,
        
        // Modal
        modal: null,
        modalTitle: null,
        closeModalBtn: null,
        modalCancelBtn: null,
        updateStatusBtn: null,
        
        // Detalles del modal
        detailId: null,
        detailCustomer: null,
        detailDate: null,
        detailStatus: null,
        detailPayment: null,
        detailTotal: null,
        detailProducts: null
    };

    function initializeElements() {
        // Filtros
        elements.filterDateFrom = document.getElementById('filter-date-from');
        elements.filterDateTo = document.getElementById('filter-date-to');
        elements.filterStatus = document.getElementById('filter-status');
        elements.applyFiltersBtn = document.getElementById('apply-filters');
        elements.clearFiltersBtn = document.getElementById('clear-filters');
        
        // Estadísticas
        elements.totalSales = document.getElementById('total-sales');
        elements.ordersToday = document.getElementById('orders-today');
        elements.averageOrder = document.getElementById('average-order');
        elements.pendingOrders = document.getElementById('pending-orders');
        
        // Tabla
        elements.ordersTableBody = document.getElementById('orders-tbody');
        elements.paginationInfo = document.getElementById('pagination-info');
        elements.pageInfo = document.getElementById('page-info');
        elements.prevPageBtn = document.getElementById('prev-page');
        elements.nextPageBtn = document.getElementById('next-page');
        elements.refreshBtn = document.getElementById('refresh-orders');
        elements.exportBtn = document.getElementById('export-orders');
        
        // Modal
        elements.modal = document.getElementById('order-modal');
        elements.modalTitle = document.getElementById('modal-title');
        elements.closeModalBtn = document.getElementById('close-modal');
        elements.modalCancelBtn = document.getElementById('modal-cancel');
        elements.updateStatusBtn = document.getElementById('update-status');
        
        // Detalles
        elements.detailId = document.getElementById('detail-id');
        elements.detailCustomer = document.getElementById('detail-customer');
        elements.detailDate = document.getElementById('detail-date');
        elements.detailStatus = document.getElementById('detail-status');
        elements.detailPayment = document.getElementById('detail-payment');
        elements.detailTotal = document.getElementById('detail-total');
        elements.detailProducts = document.getElementById('detail-products');
    }

    function attachEventListeners() {
        // Filtros
        if (elements.applyFiltersBtn) {
            elements.applyFiltersBtn.addEventListener('click', applyFilters);
        }
        
        if (elements.clearFiltersBtn) {
            elements.clearFiltersBtn.addEventListener('click', clearFilters);
        }
        
        // Paginación
        if (elements.prevPageBtn) {
            elements.prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
        }
        
        if (elements.nextPageBtn) {
            elements.nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
        }
        
        // Botones de acción
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', () => loadOrders());
        }
        
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', exportOrders);
        }
        
        // Modal
        if (elements.closeModalBtn) {
            elements.closeModalBtn.addEventListener('click', closeModal);
        }
        
        if (elements.modalCancelBtn) {
            elements.modalCancelBtn.addEventListener('click', closeModal);
        }
        
        if (elements.updateStatusBtn) {
            elements.updateStatusBtn.addEventListener('click', updateOrderStatus);
        }
        
        // Cerrar modal al hacer clic fuera
        if (elements.modal) {
            elements.modal.addEventListener('click', (e) => {
                if (e.target === elements.modal) {
                    closeModal();
                }
            });
        }
    }

    async function loadStats() {
        try {
            const response = await fetch('/php/api/orders.php?action=stats');
            const data = await response.json();
            
            if (data.ok && elements.totalSales) {
                elements.totalSales.textContent = formatCurrency(data.total_sales);
                elements.ordersToday.textContent = data.orders_today;
                elements.averageOrder.textContent = formatCurrency(data.average_order);
                elements.pendingOrders.textContent = data.pending_orders;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async function loadOrders(page = 1) {
        if (!elements.ordersTableBody) return;
        
        try {
            // Mostrar loading
            elements.ordersTableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="7" class="text-center">
                        <div class="loading-spinner">Cargando órdenes...</div>
                    </td>
                </tr>
            `;

            const params = new URLSearchParams({
                action: 'list',
                page: page,
                limit: 20,
                ...currentFilters
            });

            const response = await fetch(`/php/api/orders.php?${params}`);
            const data = await response.json();

            if (!data.ok) {
                throw new Error(data.message || 'Error loading orders');
            }

            currentPage = data.pagination.current_page;
            totalPages = data.pagination.total_pages;
            
            renderOrdersTable(data.orders);
            updatePaginationInfo(data.pagination);
            
        } catch (error) {
            console.error('Error loading orders:', error);
            elements.ordersTableBody.innerHTML = `
                <tr class="error-row">
                    <td colspan="7" class="text-center error-text">
                        Error al cargar las órdenes: ${error.message}
                    </td>
                </tr>
            `;
        }
    }

    function renderOrdersTable(orders) {
        if (!elements.ordersTableBody) return;
        
        if (orders.length === 0) {
            elements.ordersTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7" class="text-center">
                        No se encontraron órdenes con los filtros aplicados.
                    </td>
                </tr>
            `;
            return;
        }

        const rows = orders.map(order => {
            const statusClass = getStatusClass(order.estado_pago);
            const formattedDate = formatDate(order.fecha_venta);
            
            return `
                <tr class="order-row" data-order-id="${order.id_venta}">
                    <td class="order-id">#${order.id_venta}</td>
                    <td class="customer-info">
                        <div class="customer-name">${escapeHtml(order.comprador_nombre || 'N/A')}</div>
                        <div class="customer-email">${escapeHtml(order.comprador_email || 'N/A')}</div>
                    </td>
                    <td class="order-date">${formattedDate}</td>
                    <td class="order-total">${formatCurrency(order.monto_total)}</td>
                    <td class="order-status">
                        <span class="status-badge ${statusClass}">${capitalizeFirst(order.estado_pago)}</span>
                    </td>
                    <td class="payment-method">${capitalizeFirst(order.metodo_pago || 'N/A')}</td>
                    <td class="order-actions">
                        <button class="btn btn-sm btn-primary view-details" data-order-id="${order.id_venta}">
                            Ver Detalles
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        elements.ordersTableBody.innerHTML = rows;

        // Agregar event listeners para los botones de detalles
        elements.ordersTableBody.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                if (orderId) {
                    showOrderDetails(orderId);
                }
            });
        });
    }

    function updatePaginationInfo(pagination) {
        if (elements.paginationInfo) {
            const start = (pagination.current_page - 1) * pagination.per_page + 1;
            const end = Math.min(start + pagination.per_page - 1, pagination.total_orders);
            elements.paginationInfo.textContent = 
                `Mostrando ${start}-${end} de ${pagination.total_orders} órdenes`;
        }
        
        if (elements.pageInfo) {
            elements.pageInfo.textContent = `Página ${pagination.current_page} de ${pagination.total_pages}`;
        }
        
        if (elements.prevPageBtn) {
            elements.prevPageBtn.disabled = pagination.current_page <= 1;
        }
        
        if (elements.nextPageBtn) {
            elements.nextPageBtn.disabled = pagination.current_page >= pagination.total_pages;
        }
    }

    async function showOrderDetails(orderId) {
        if (!elements.modal) return;
        
        try {
            // Mostrar modal con loading
            elements.modalTitle.textContent = `Detalles de la Orden #${orderId}`;
            elements.detailProducts.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Cargando productos...</td>
                </tr>
            `;
            elements.modal.style.display = 'flex';
            
            const response = await fetch(`/php/api/orders.php?action=details&id=${orderId}`);
            const data = await response.json();
            
            if (!data.ok) {
                throw new Error(data.message || 'Error loading order details');
            }
            
            populateOrderDetails(data.order, data.products);
            
        } catch (error) {
            console.error('Error loading order details:', error);
            alert('Error al cargar los detalles de la orden: ' + error.message);
            closeModal();
        }
    }

    function populateOrderDetails(order, products) {
        if (elements.detailId) elements.detailId.textContent = `#${order.id_venta}`;
        if (elements.detailCustomer) {
            elements.detailCustomer.innerHTML = `
                <div>${escapeHtml(order.comprador_nombre || 'N/A')}</div>
                <div class="text-muted">${escapeHtml(order.comprador_email || 'N/A')}</div>
            `;
        }
        if (elements.detailDate) elements.detailDate.textContent = formatDate(order.fecha_venta);
        if (elements.detailStatus) {
            const statusClass = getStatusClass(order.estado_pago);
            elements.detailStatus.innerHTML = `<span class="status-badge ${statusClass}">${capitalizeFirst(order.estado_pago)}</span>`;
        }
        if (elements.detailPayment) elements.detailPayment.textContent = capitalizeFirst(order.metodo_pago || 'N/A');
        if (elements.detailTotal) elements.detailTotal.textContent = formatCurrency(order.monto_total);
        
        // Productos
        if (elements.detailProducts) {
            if (products.length === 0) {
                elements.detailProducts.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">No hay productos en esta orden.</td>
                    </tr>
                `;
            } else {
                const productsHtml = products.map(product => `
                    <tr>
                        <td class="product-info">
                            <div class="product-name">${escapeHtml(product.producto_nombre || 'Producto sin nombre')}</div>
                            ${product.producto_descripcion ? `<div class="product-desc">${escapeHtml(product.producto_descripcion)}</div>` : ''}
                        </td>
                        <td class="text-center">${product.cantidad}</td>
                        <td class="text-right">${formatCurrency(product.precio_unitario)}</td>
                        <td class="text-right font-weight-bold">${formatCurrency(product.subtotal)}</td>
                    </tr>
                `).join('');
                
                elements.detailProducts.innerHTML = productsHtml;
            }
        }
        
        // Guardar el ID de la orden para actualización de estado
        if (elements.updateStatusBtn) {
            elements.updateStatusBtn.setAttribute('data-order-id', order.id_venta);
            elements.updateStatusBtn.setAttribute('data-current-status', order.estado_pago);
        }
    }

    function closeModal() {
        if (elements.modal) {
            elements.modal.style.display = 'none';
        }
    }

    async function updateOrderStatus() {
        const orderId = elements.updateStatusBtn?.getAttribute('data-order-id');
        const currentStatus = elements.updateStatusBtn?.getAttribute('data-current-status');
        
        if (!orderId) return;
        
        const newStatus = prompt('Nuevo estado (pendiente, pagado, cancelado):', currentStatus);
        
        if (!newStatus || newStatus === currentStatus) return;
        
        if (!['pendiente', 'pagado', 'cancelado'].includes(newStatus)) {
            alert('Estado no válido. Debe ser: pendiente, pagado o cancelado');
            return;
        }
        
        try {
            const response = await fetch('/php/api/orders.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_venta: parseInt(orderId),
                    estado_pago: newStatus
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                alert('Estado actualizado correctamente');
                closeModal();
                loadOrders(currentPage);
                loadStats();
            } else {
                throw new Error(data.message || 'Error updating status');
            }
            
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar el estado: ' + error.message);
        }
    }

    function applyFilters() {
        currentFilters = {};
        
        if (elements.filterDateFrom?.value) {
            currentFilters.date_from = elements.filterDateFrom.value;
        }
        
        if (elements.filterDateTo?.value) {
            currentFilters.date_to = elements.filterDateTo.value;
        }
        
        if (elements.filterStatus?.value) {
            currentFilters.status = elements.filterStatus.value;
        }
        
        currentPage = 1;
        loadOrders();
    }

    function clearFilters() {
        if (elements.filterDateFrom) elements.filterDateFrom.value = '';
        if (elements.filterDateTo) elements.filterDateTo.value = '';
        if (elements.filterStatus) elements.filterStatus.value = '';
        
        currentFilters = {};
        currentPage = 1;
        loadOrders();
    }

    function changePage(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            loadOrders(page);
        }
    }

    function exportOrders() {
        const params = new URLSearchParams({
            action: 'list',
            limit: 1000, // Exportar más registros
            ...currentFilters
        });
        
        window.open(`/php/api/orders.php?${params}&export=csv`, '_blank');
    }

    // Utility functions
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount || 0);
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getStatusClass(status) {
        const classes = {
            'pendiente': 'status-pending',
            'pagado': 'status-paid',
            'cancelado': 'status-cancelled'
        };
        return classes[status] || 'status-unknown';
    }

    function capitalizeFirst(str) {
        if (!str) return 'N/A';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Inicializar cuando el DOM esté listo y los includes cargados
    function init() {
        initializeElements();
        attachEventListeners();
        loadStats();
        loadOrders();
    }

    // Esperar a que los includes se carguen
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.addEventListener('includes:loaded', init, { once: true });
        });
    } else {
        document.addEventListener('includes:loaded', init, { once: true });
    }
})();