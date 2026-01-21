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
                        Dashboard de Alertas
                    </h1>
                    <p class="page-subtitle">
                        Productos con diferencias de precio superiores al ${CONFIG.PRICE_ALERT.THRESHOLD_PERCENTAGE}%
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
                                <th>Producto</th>
                                <th>Juego</th>
                                <th class="text-center">Stock</th>
                                <th class="text-right">Precio Shopify</th>
                                <th class="text-right">Precio Mercado</th>
                                <th class="text-center">Diferencia</th>
                                <th class="text-center">Acciones</th>
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
}

/**
 * Carga los productos con alertas desde el backend
 */
async function loadProducts() {
    try {
        showLoader();
        
        // TODO: Cuando el backend tenga el endpoint /products/alerts
        // const response = await api.get('/products/alerts');
        
        // TEMPORAL: Usar datos de ejemplo
        const response = getMockProducts();
        
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
            <td>
                <div class="product-cell">
                    <img 
                        src="${product.image_url || ''}" 
                        alt="${product.title}"
                        class="product-image"
                        onerror="this.src=''"
                    />
                    <div class="product-info">
                        <span class="product-name" title="${product.title}">
                            ${truncateText(product.title, 50)}
                        </span>
                        <div class="product-meta">
                            <span>SKU: ${product.sku || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </td>
            
            <!-- Juego -->
            <td>
                <span class="badge-game badge-${product.game}">
                    ${getGameLabel(product.game)}
                </span>
            </td>
            
            <!-- Stock -->
            <td class="text-center">
                ${getStockBadge(product.stock)}
            </td>
            
            <!-- Precio Shopify -->
            <td class="text-right">
                <span class="price-cell">
                    $${formatPrice(product.shopify_price)}
                </span>
            </td>
            
            <!-- Precio Mercado -->
            <td class="text-right">
                <span class="price-cell">
                    $${formatPrice(product.market_price)}
                </span>
            </td>
            
            <!-- Diferencia -->
            <td class="text-center">
                ${getPriceDiffBadge(product.price_difference)}
            </td>
            
            <!-- Acciones -->
            <td class="text-center">
                <div class="actions-cell">
                    <button 
                        class="btn-action btn-edit" 
                        onclick="window.dashboardActions.editPrice(${product.id})"
                        title="Actualizar precio"
                    >
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button 
                        class="btn-action btn-view" 
                        onclick="window.dashboardActions.viewDetails(${product.id})"
                        title="Ver detalles"
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
        
        // TODO: Llamar endpoint de sincronización cuando esté listo
        // await api.post('/shopify/sync/manual');
        
        // TEMPORAL: Simular sincronización
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Recargar productos
        await loadProducts();
        
        alert('✅ Sincronización completada');
        
    } catch (error) {
        console.error('Error en sincronización:', error);
        alert('❌ Error en sincronización: ' + error.message);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
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

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatPrice(price) {
    return parseFloat(price).toFixed(2);
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
        return `<span class="badge-stock stock-high"><i class="bi bi-check-circle"></i> ${stock}</span>`;
    } else if (stock >= CONFIG.STOCK.MEDIUM) {
        return `<span class="badge-stock stock-medium"><i class="bi bi-dash-circle"></i> ${stock}</span>`;
    } else if (stock >= CONFIG.STOCK.LOW) {
        return `<span class="badge-stock stock-low"><i class="bi bi-exclamation-circle"></i> ${stock}</span>`;
    } else {
        return `<span class="badge-stock stock-out"><i class="bi bi-x-circle"></i> Sin stock</span>`;
    }
}

function getPriceDiffBadge(difference) {
    const diff = parseFloat(difference);
    const absValue = Math.abs(diff).toFixed(1);
    
    if (diff > 0) {
        return `<span class="badge-price price-higher"><i class="bi bi-arrow-up"></i> +${absValue}%</span>`;
    } else if (diff < 0) {
        return `<span class="badge-price price-lower"><i class="bi bi-arrow-down"></i> ${absValue}%</span>`;
    } else {
        return `<span class="badge-price price-equal"><i class="bi bi-dash"></i> 0%</span>`;
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
            image_url: '',
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
            image_url: '',
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
            image_url: '',
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
            image_url: '',
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
            image_url: '',
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
// ACCIONES EXPORTADAS (para botones inline)
// ============================================

window.dashboardActions = {
    editPrice: (productId) => {
        console.log('Editar precio del producto:', productId);
        alert(`Función de editar precio en desarrollo.\nProducto ID: ${productId}`);
    },
    
    viewDetails: (productId) => {
        console.log('Ver detalles del producto:', productId);
        alert(`Función de ver detalles en desarrollo.\nProducto ID: ${productId}`);
    }
};