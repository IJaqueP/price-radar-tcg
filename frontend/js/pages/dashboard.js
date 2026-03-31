/* ============================================
   DASHBOARD PAGE - PRICE RADAR TCG
   ============================================
   
   Página principal del sistema.
   Muestra productos con alertas de precio.
   
   Funcionalidades:
   - Lista de productos con alertas
   - Filtros por juego
   - Búsqueda
   - Actualización de precios
   - Estadísticas en tiempo real
   
   ============================================ */

import api, { ApiError } from '../utils/api.js';
import CONFIG from '../config.js';
import { showLoader, hideLoader } from '../utils/loader.js';

// Estado local del dashboard
let currentProducts = [];
let currentFilter = 'all';
let currentSearch = '';
let currentThreshold = CONFIG.PRICE_ALERT.THRESHOLD_PERCENTAGE;

/**
 * Renderiza la página del dashboard
 * @param {HTMLElement} container - Contenedor donde renderizar
 */
export async function render(container) {
    console.log('📊 Renderizando Dashboard...');
    
    // Renderizar estructura HTML
    container.innerHTML = getDashboardHTML();
    
    // Inicializar funcionalidad
    await initDashboard();
    
    console.log('✅ Dashboard renderizado');
}

/**
 * Genera el HTML del dashboard
 * @returns {string} HTML completo
 */
function getDashboardHTML() {
    return `
        <div class="dashboard-container">
            <!-- Header con Estadísticas -->
            <div class="dashboard-header">
                <div class="header-content">
                    <h1 class="page-title">
                        <i class="bi bi-speedometer2"></i>
                        Radar Price
                    </h1>
                    <p class="page-subtitle">
                        Productos con diferencias de precio superiores al 
                        <input 
                            type="number" 
                            id="threshold-input" 
                            class="threshold-input" 
                            value="${currentThreshold}" 
                            min="0" 
                            max="100" 
                            step="0.5"
                        />%
                    </p>
                </div>
                <button class="btn-primary-custom" id="btn-sync" type="button">
                    <i class="bi bi-arrow-repeat"></i>
                    <span>Sincronizar Ahora</span>
                </button>
            </div>

            <!-- Tarjetas de Estadísticas -->
            <div class="stats-grid" id="stats-grid">
                <!-- Se cargarán dinámicamente -->
            </div>

            <!-- Filtros y Búsqueda -->
            <div class="filters-section">
                <div class="filters-left">
                    <button class="filter-btn active" data-filter="all">
                        <i class="bi bi-grid"></i>
                        <span>Todos</span>
                        <span class="filter-count" id="count-all">0</span>
                    </button>
                    <button class="filter-btn" data-filter="magic">
                        <i class="bi bi-star"></i>
                        <span>Magic</span>
                        <span class="filter-count" id="count-magic">0</span>
                    </button>
                    <button class="filter-btn" data-filter="pokemon">
                        <i class="bi bi-circle"></i>
                        <span>Pokémon</span>
                        <span class="filter-count" id="count-pokemon">0</span>
                    </button>
                    <button class="filter-btn" data-filter="onepiece">
                        <i class="bi bi-flag"></i>
                        <span>One Piece</span>
                        <span class="filter-count" id="count-onepiece">0</span>
                    </button>
                    <button class="filter-btn" data-filter="gundam">
                        <i class="bi bi-robot"></i>
                        <span>Gundam</span>
                        <span class="filter-count" id="count-gundam">0</span>
                    </button>
                </div>
                <div class="filters-right">
                    <div class="search-box">
                        <i class="bi bi-search"></i>
                        <input 
                            type="text" 
                            placeholder="Buscar producto..." 
                            id="search-input"
                            autocomplete="off"
                        />
                    </div>
                </div>
            </div>

            <!-- Tabla de Productos -->
            <div class="table-section">
                <div class="table-products-wrapper">
                    <table class="table-products" id="products-table">
                        <thead>
                            <tr>
                                <th class="col-product">PRODUCTO</th>
                                <th class="col-game">JUEGO</th>
                                <th class="col-stock">STOCK</th>
                                <th class="col-price">PRECIO SHOPIFY</th>
                                <th class="col-price">PRECIO MERCADO</th>
                                <th class="col-diff">DIFERENCIA</th>
                                <th class="col-actions">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody id="products-tbody">
                            <!-- Se cargará dinámicamente -->
                        </tbody>
                    </table>
                </div>

                <!-- Estado Vacío -->
                <div class="empty-state hidden" id="empty-state">
                    <i class="bi bi-inbox"></i>
                    <h3>No hay productos para mostrar</h3>
                    <p>No se encontraron productos con alertas de precio.</p>
                </div>

                <!-- Estado de Error -->
                <div class="error-state hidden" id="error-state">
                    <i class="bi bi-exclamation-triangle"></i>
                    <h3>Error al cargar productos</h3>
                    <p id="error-message">Ocurrió un error al obtener los datos.</p>
                    <button class="btn-primary-custom" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise"></i>
                        Reintentar
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Inicializa el dashboard (carga datos y eventos)
 */
async function initDashboard() {
    // Cargar productos
    await loadProducts();
    
    // Event listeners
    setupEventListeners();

    // Event delegation para acciones de tabla (edit/view)
    setupTableActions();
}

/**
 * Carga los productos con alertas desde el backend
 */
async function loadProducts() {
    try {
        showLoader();

        const response = await api.getProductAlerts({
            limit: 200,
            threshold: currentThreshold
        });
        
        currentProducts = response.products || [];
        
        // Actualizar estadísticas
        updateStats(response.stats || calculateStats(currentProducts));
        
        // Renderizar tabla
        renderProductsTable();
        
        hideLoader();
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        hideLoader();
        showErrorState(error.message);
    }
}

/**
 * Renderiza la tabla de productos
 */
function renderProductsTable() {
    const tbody = document.getElementById('products-tbody');
    
    if (!tbody) return;
    
    // Filtrar productos según filtros activos
    const filteredProducts = filterProducts(currentProducts);
    
    // Si no hay productos, mostrar estado vacío
    if (filteredProducts.length === 0) {
        tbody.innerHTML = '';
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    
    // Generar filas de la tabla
    tbody.innerHTML = filteredProducts.map(product => `
        <tr data-product-id="${product.id}">
            <!-- Producto con imagen -->
            <td class="col-product">
                <div class="product-info-row">
                    ${product.image_url 
                        ? `<img src="${product.image_url}" alt="" class="product-thumb" loading="lazy" />`
                        : `<div class="product-thumb-placeholder"><i class="bi bi-box-seam"></i></div>`
                    }
                    <div class="product-info">
                        <span class="product-name">${product.title}</span>
                        <span class="product-sku">SKU: ${product.sku || 'N/A'}</span>
                    </div>
                </div>
            </td>
            
            <!-- Juego -->
            <td class="col-game">
                <span class="badge-game badge-${product.game}">
                    ${getGameLabel(product.game)}
                </span>
            </td>
            
            <!-- Stock -->
            <td class="col-stock">
                <span class="stock-display" style="color: ${getStockColor(product.stock)}; font-weight: 600; font-size: 14px;">
                    ${product.stock != null ? product.stock : 0}
                </span>
            </td>
            
            <!-- Precio Shopify -->
            <td class="col-price">
                <span class="price-value">$${formatPriceCLP(product.shopify_price)}</span>
            </td>
            
            <!-- Precio Mercado (CLP convertido) -->
            <td class="col-price">
                <span class="price-value">$${formatPriceCLP(product.market_price)}</span>
            </td>
            
            <!-- Diferencia -->
            <td class="col-diff">
                ${getPriceDiffBadge(product.price_difference)}
            </td>
            
            <!-- Acciones -->
            <td class="col-actions">
                <div class="actions-group">
                    <button 
                        class="btn-action btn-edit" 
                        data-action="edit-product"
                        data-product-id="${product.id}"
                        data-product-price="${product.shopify_price}"
                        data-product-stock="${product.stock != null ? product.stock : 0}"
                        title="Actualizar producto"
                    >
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button 
                        class="btn-action btn-view" 
                        data-action="view-shopify"
                        data-shopify-url="${product.shopify_url || ''}"
                        title="Ver en Shopify"
                    >
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Actualizar contadores de filtros
    updateFilterCounts();
}

/**
 * Filtra productos según filtros activos
 */
function filterProducts(products) {
    let filtered = products;
    
    // Filtro por juego
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.game === currentFilter);
    }
    
    // Filtro por búsqueda
    if (currentSearch) {
        const search = currentSearch.toLowerCase();
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(search) ||
            (p.sku && p.sku.toLowerCase().includes(search))
        );
    }
    
    return filtered;
}

/**
 * Actualiza las estadísticas en las tarjetas
 */
function updateStats(stats) {
    const statsGrid = document.getElementById('stats-grid');
    
    if (!statsGrid) return;
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon stat-icon-primary">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <div class="stat-content">
                <h3 class="stat-value">${stats.total_alerts || 0}</h3>
                <p class="stat-label">Productos con Alerta</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon stat-icon-danger">
                <i class="bi bi-arrow-up-circle"></i>
            </div>
            <div class="stat-content">
                <h3 class="stat-value">${stats.higher_prices || 0}</h3>
                <p class="stat-label">Precios Más Altos</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon stat-icon-success">
                <i class="bi bi-arrow-down-circle"></i>
            </div>
            <div class="stat-content">
                <h3 class="stat-value">${stats.lower_prices || 0}</h3>
                <p class="stat-label">Precios Más Bajos</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon stat-icon-info">
                <i class="bi bi-currency-dollar"></i>
            </div>
            <div class="stat-content">
                <h3 class="stat-value">${stats.avg_difference || '0'}%</h3>
                <p class="stat-label">Diferencia Promedio</p>
            </div>
        </div>
    `;
}

/**
 * Actualiza los contadores de los filtros
 */
function updateFilterCounts() {
    document.getElementById('count-all').textContent = currentProducts.length;
    document.getElementById('count-magic').textContent = 
        currentProducts.filter(p => p.game === 'magic').length;
    document.getElementById('count-pokemon').textContent = 
        currentProducts.filter(p => p.game === 'pokemon').length;
    document.getElementById('count-onepiece').textContent = 
        currentProducts.filter(p => p.game === 'onepiece').length;
    document.getElementById('count-gundam').textContent = 
        currentProducts.filter(p => p.game === 'gundam').length;
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Botón de sincronizar
    const btnSync = document.getElementById('btn-sync');
    if (btnSync) {
        btnSync.addEventListener('click', handleSync);
    }
    
    // Filtros de juego
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.currentTarget.dataset.filter;
            handleFilterChange(filter);
        });
    });
    
    // Búsqueda
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            renderProductsTable();
        });
    }

    // Threshold editable
    const thresholdInput = document.getElementById('threshold-input');
    if (thresholdInput) {
        let thresholdTimeout;
        thresholdInput.addEventListener('input', (e) => {
            clearTimeout(thresholdTimeout);
            const val = parseFloat(e.target.value);
            if (!Number.isFinite(val) || val < 0) return;
            thresholdTimeout = setTimeout(() => {
                currentThreshold = val;
                loadProducts();
            }, 500);
        });
    }
}

/**
 * Maneja el cambio de filtro
 */
function handleFilterChange(filter) {
    currentFilter = filter;
    
    // Actualizar UI de filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Re-renderizar tabla
    renderProductsTable();
}

/**
 * Maneja la sincronización
 */
async function handleSync() {
    const btn = document.getElementById('btn-sync');
    
    try {
        btn.classList.add('loading');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Sincronizando...';
        
        await api.syncInitialWithDB();
        
        // Recargar productos
        await loadProducts();
        
        alert('✅ Sincronización completada');
        
    } catch (error) {
        console.error('Error en sincronización:', error);
        alert('❌ Error en sincronización: ' + error.message);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Sincronizar Ahora';
    }
}

/**
 * Muestra el estado vacío
 */
function showEmptyState() {
    const table = document.querySelector('.table-products-wrapper');
    const emptyState = document.getElementById('empty-state');
    
    if (table) table.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
}

/**
 * Oculta el estado vacío
 */
function hideEmptyState() {
    const table = document.querySelector('.table-products-wrapper');
    const emptyState = document.getElementById('empty-state');
    
    if (table) table.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
}

/**
 * Muestra el estado de error
 */
function showErrorState(message) {
    const table = document.querySelector('.table-products-wrapper');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    
    if (table) table.classList.add('hidden');
    if (errorState) errorState.classList.remove('hidden');
    if (errorMessage) errorMessage.textContent = message;
}

// ============================================
// UTILIDADES DE FORMATO
// ============================================

function formatPrice(price) {
    return parseFloat(price).toFixed(2);
}

function formatPriceCLP(price) {
    return Math.round(parseFloat(price)).toLocaleString('es-CL');
}

function getGameLabel(game) {
    const labels = {
        magic: 'Magic',
        pokemon: 'Pokémon',
        onepiece: 'One Piece',
        gundam: 'Gundam',
        riftbound: 'Riftbound'
    };
    return labels[game] || game;
}

function getStockBadge(stock) {
    if (stock >= CONFIG.STOCK.HIGH) {
        return `<span class="badge-stock stock-high"><i class="bi bi-check-circle"></i> ${stock} unidades</span>`;
    } else if (stock >= CONFIG.STOCK.MEDIUM) {
        return `<span class="badge-stock stock-medium"><i class="bi bi-dash-circle"></i> ${stock} unidades</span>`;
    } else if (stock >= CONFIG.STOCK.LOW) {
        return `<span class="badge-stock stock-low"><i class="bi bi-exclamation-circle"></i> ${stock} unidades</span>`;
    } else {
        return `<span class="badge-stock stock-out"><i class="bi bi-x-circle"></i> Sin stock</span>`;
    }
}

function getStockColor(stock) {
    const s = stock != null ? stock : 0;
    if (s >= CONFIG.STOCK.HIGH) return '#22c55e';
    if (s >= CONFIG.STOCK.MEDIUM) return '#f59e0b';
    if (s >= CONFIG.STOCK.LOW) return '#ef4444';
    return '#6b7280';
}

function getPriceDiffBadge(difference) {
    const diff = parseFloat(difference);
    const absValue = Math.abs(diff).toFixed(1);
    
    if (diff > 0) {
        return `<span class="badge-price price-higher" title="Nuestro precio es mayor que el de API"><i class="bi bi-arrow-up"></i> +${absValue}% sobre API</span>`;
    } else if (diff < 0) {
        return `<span class="badge-price price-lower" title="Nuestro precio es menor que el de API"><i class="bi bi-arrow-down"></i> ${absValue}% bajo API</span>`;
    } else {
        return `<span class="badge-price price-equal"><i class="bi bi-dash"></i> 0% igual API</span>`;
    }
}

function calculateStats(products) {
    return {
        total_alerts: products.length,
        higher_prices: products.filter(p => p.price_difference > 0).length,
        lower_prices: products.filter(p => p.price_difference < 0).length,
        avg_difference: products.length > 0
            ? (products.reduce((sum, p) => sum + Math.abs(p.price_difference), 0) / products.length).toFixed(1)
            : '0'
    };
}

// ============================================
// DATOS MOCK (TEMPORAL - hasta tener backend)
// ============================================

function getMockProducts() {
    const mockProducts = [
        {
            id: 1,
            title: 'Magic: The Gathering - Murders at Karlov Manor Bundle',
            sku: 'MTG-MKM-BUNDLE',
            game: 'magic',
            stock: 15,
            shopify_price: 45.99,
            market_price: 42.00,
            price_difference: 9.5
        },
        {
            id: 2,
            title: 'Pokemon TCG: Scarlet & Violet Temporal Forces Elite Trainer Box',
            sku: 'PKM-TEF-ETB',
            game: 'pokemon',
            stock: 8,
            shopify_price: 52.99,
            market_price: 48.50,
            price_difference: 9.3
        },
        {
            id: 3,
            title: 'One Piece Card Game - Paramount War Booster Box',
            sku: 'OP-PW-BB',
            game: 'onepiece',
            stock: 120,
            shopify_price: 89.99,
            market_price: 95.00,
            price_difference: -5.3
        },
        {
            id: 4,
            title: 'Gundam Card Game - Booster Pack Set 01',
            sku: 'GND-BP01',
            game: 'gundam',
            stock: 45,
            shopify_price: 34.99,
            market_price: 32.00,
            price_difference: 9.3
        },
        {
            id: 5,
            title: 'Magic: The Gathering - Commander Masters Draft Booster Box',
            sku: 'MTG-CMM-DBB',
            game: 'magic',
            stock: 3,
            shopify_price: 259.99,
            market_price: 245.00,
            price_difference: 6.1
        }
    ];

    return {
        success: true,
        products: mockProducts,
        stats: calculateStats(mockProducts)
    };
}

// ============================================
// ACCIONES VIA EVENT DELEGATION (evita problemas con comillas en títulos)
// ============================================

// Usar event delegation en el tbody para manejar clicks en botones
function setupTableActions() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    tbody.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;

        if (action === 'edit-product') {
            const productId = parseInt(btn.dataset.productId);
            const currentPrice = parseFloat(btn.dataset.productPrice);
            const currentStock = parseInt(btn.dataset.productStock) || 0;
            const product = currentProducts.find(p => p.id === productId);
            const productTitle = product ? product.title : 'Producto';

            showEditProductModal(productId, productTitle, currentPrice, currentStock);
        }

        if (action === 'view-shopify') {
            const shopifyUrl = btn.dataset.shopifyUrl;
            if (shopifyUrl) {
                window.open(shopifyUrl, '_blank');
            } else {
                alert('URL de Shopify no disponible para este producto.');
            }
        }
    });
}

/**
 * Muestra el modal para editar precio y stock de un producto
 */
function showEditProductModal(productId, title, currentPrice, currentStock) {
    // Eliminar modal previo si existe
    const existing = document.getElementById('edit-product-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'edit-product-modal';
    modal.className = 'edit-modal-overlay';
    modal.innerHTML = `
        <div class="edit-modal-content">
            <div class="edit-modal-header">
                <h3><i class="bi bi-pencil-square"></i> Actualizar Producto</h3>
                <button class="edit-modal-close" id="edit-modal-close">&times;</button>
            </div>
            <div class="edit-modal-body">
                <p class="edit-modal-title">${title}</p>
                <div class="edit-modal-field">
                    <label for="edit-price">Precio (CLP)</label>
                    <input type="number" id="edit-price" value="${Math.round(currentPrice)}" min="0" step="10" />
                </div>
                <div class="edit-modal-field">
                    <label for="edit-stock">Stock</label>
                    <input type="number" id="edit-stock" value="${currentStock}" min="0" step="1" />
                </div>
            </div>
            <div class="edit-modal-footer">
                <button class="edit-modal-btn cancel" id="edit-modal-cancel">Cancelar</button>
                <button class="edit-modal-btn save" id="edit-modal-save">Guardar cambios</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Focus en el campo de precio
    setTimeout(() => document.getElementById('edit-price').focus(), 100);

    // Cerrar modal
    const closeModal = () => modal.remove();
    document.getElementById('edit-modal-close').addEventListener('click', closeModal);
    document.getElementById('edit-modal-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Guardar
    document.getElementById('edit-modal-save').addEventListener('click', async () => {
        const newPrice = parseFloat(document.getElementById('edit-price').value);
        const newStock = parseInt(document.getElementById('edit-stock').value);

        // Validaciones
        if (!Number.isFinite(newPrice) || newPrice <= 0) {
            alert('Precio inválido. Debe ser un número mayor a 0.');
            return;
        }
        if (!Number.isFinite(newStock) || newStock < 0) {
            alert('Stock inválido. Debe ser un entero >= 0.');
            return;
        }

        // Determinar qué cambió
        const changes = {};
        if (Math.round(newPrice) !== Math.round(currentPrice)) changes.new_price = newPrice;
        if (newStock !== currentStock) changes.new_stock = newStock;

        if (Object.keys(changes).length === 0) {
            alert('No hay cambios que guardar.');
            return;
        }

        const saveBtn = document.getElementById('edit-modal-save');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
            const result = await api.updateProduct(productId, changes);

            closeModal();

            if (result.warning) {
                alert(`⚠️ ${result.message}\n${result.warning}`);
            } else {
                alert(`✅ Producto actualizado correctamente.`);
            }

            await loadProducts();
        } catch (error) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar cambios';
            alert(`❌ Error: ${error.message}`);
        }
    });
}