/* ============================================
   RIFTBOUND SEALED PRODUCTS PAGE
   ============================================
   
   Página para visualizar productos sellados de Riftbound
   (Booster Box, Starter Decks, etc.)
   
   ============================================ */

import api from '../utils/api.js';
import { showLoader, hideLoader } from '../utils/loader.js';

// Estado local
let allProducts = [];
let currentPage = 1;
let currentSearch = '';
const PRODUCTS_PER_PAGE = 50;

/**
 * Renderiza la página
 */
export async function render(container) {
    console.log('📦 Renderizando Riftbound Sellado...');
    
    container.innerHTML = getRiftboundSealedHTML();
    await initRiftboundSealed();
    
    console.log('✅ Riftbound Sellado renderizado');
}

/**
 * Genera el HTML
 */
function getRiftboundSealedHTML() {
    return `
        <div class="riftbound-sealed-container">
            <!-- Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">
                        <i class="bi bi-book"></i>
                        Riftbound: Productos Sellados
                    </h1>
                    <p class="page-subtitle">
                        Gestión de productos sellados de Riftbound
                    </p>
                </div>
                <button class="btn-primary-custom" id="btn-sync-sealed" type="button">
                    <i class="bi bi-arrow-repeat"></i>
                    <span>Sincronizar</span>
                </button>
            </div>

            <!-- Barra de búsqueda -->
            <div class="search-bar">
                <div class="search-input-group">
                    <i class="bi bi-search"></i>
                    <input 
                        type="text" 
                        id="search-input" 
                        class="form-control" 
                        placeholder="Buscar producto..."
                    >
                </div>
                <div class="search-results-count" id="results-count">
                    <!-- Se actualizará dinámicamente -->
                </div>
            </div>

            <!-- Grid de Productos -->
            <div class="products-grid" id="products-grid">
                <!-- Se cargarán los productos aquí -->
            </div>

            <!-- Paginación -->
            <div class="pagination-container" id="pagination">
                <!-- Se generará dinámicamente -->
            </div>
        </div>
    `;
}

/**
 * Inicializa eventos y carga datos
 */
async function initRiftboundSealed() {
    // Event listeners
    document.getElementById('search-input')?.addEventListener('input', handleSearch);
    document.getElementById('btn-sync-sealed')?.addEventListener('click', handleSync);
    
    // Cargar productos iniciales
    await loadProducts();
}

/**
 * Carga productos desde el backend
 */
async function loadProducts() {
    try {
        showLoader();
        
        console.log('📥 Cargando productos de /products/sealed/riftbound...');
        const response = await api.get('/products/sealed/riftbound', { limit: 1000 });
        
        console.log('📦 Respuesta recibida:', response);
        
        if (response && response.products) {
            allProducts = response.products || [];
            console.log(`✅ ${allProducts.length} productos cargados`);
            renderProducts();
        } else {
            console.error('❌ Respuesta sin productos:', response);
            showError('Error: No se encontraron productos');
        }
        
    } catch (error) {
        console.error('❌ Error cargando productos Riftbound:', error);
        showError(error.message || 'Error al cargar productos. Por favor, intenta de nuevo.');
    } finally {
        hideLoader();
    }
}

/**
 * Renderiza los productos en el grid
 */
function renderProducts() {
    const grid = document.getElementById('products-grid');
    
    if (!grid) return;

    const normalizedSearch = currentSearch.toLowerCase();
    const filteredProducts = allProducts.filter(product =>
        product.title?.toLowerCase().includes(normalizedSearch) ||
        product.sku?.toLowerCase().includes(normalizedSearch)
    );

    updateResultsCount(filteredProducts.length, allProducts.length);

    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    const maxPage = Math.max(totalPages, 1);
    if (currentPage > maxPage) {
        currentPage = maxPage;
    }
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);

    if (productsToShow.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h3>No hay productos</h3>
                <p>No se encontraron productos sellados de Riftbound.</p>
            </div>
        `;
        renderPagination(totalPages, currentPage);
        return;
    }
    
    grid.innerHTML = productsToShow.map(product => getProductCard(product)).join('');
    renderPagination(totalPages, currentPage);
    
    // Event listeners para botones
    grid.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => handleViewProduct(btn.dataset.id));
    });
}

/**
 * Genera el HTML de una card de producto
 */
function getProductCard(product) {
    const imageUrl = product.image_url || 'assets/logo-oasis.png';
    const price = product.price ? `$${parseFloat(product.price).toLocaleString('es-CL')}` : 'Sin precio';
    const stock = product.stock || 0;
    const stockClass = stock > 10 ? 'in-stock' : stock > 0 ? 'low-stock' : 'out-of-stock';
    const stockText = stock > 0 ? `${stock} disponibles` : 'Sin stock';
    
    return `
        <div class="product-card">
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.title}" loading="lazy" onerror="this.src='assets/logo-oasis.png'">
                <span class="badge-stock ${stockClass}">${stockText}</span>
            </div>
            <div class="product-info">
                <h3 class="product-title" title="${product.title}">${product.title}</h3>
                <div class="product-meta">
                    <span class="product-price">${price}</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-view" data-id="${product.id}">
                    <i class="bi bi-eye"></i>
                    Ver detalles
                </button>
            </div>
        </div>
    `;
}

/**
 * Maneja la búsqueda
 */
function handleSearch(e) {
    currentSearch = e.target.value.trim();
    currentPage = 1;
    renderProducts();
}

/**
 * Maneja la sincronización
 */
async function handleSync() {
    const btn = document.getElementById('btn-sync-sealed');
    if (!btn) return;
    
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Sincronizando...';
    
    try {
        await api.syncInitialWithDB();
        await loadProducts();
        showSuccess('Productos sincronizados correctamente');
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
        showError('Error al sincronizar. Por favor, intenta de nuevo.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

/**
 * Maneja la visualización de un producto
 */
function handleViewProduct(productId) {
    console.log('Ver producto:', productId);
    // TODO: Implementar modal o navegación a detalle
}

/**
 * Renderiza la paginación
 */
function renderPagination(totalPages, currentPageNum) {
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination">';
    
    // Botón anterior
    html += `<button class="page-btn" ${currentPageNum === 1 ? 'disabled' : ''} data-page="${currentPageNum - 1}">
        <i class="bi bi-chevron-left"></i>
    </button>`;
    
    // Páginas
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPageNum - 2 && i <= currentPageNum + 2)) {
            html += `<button class="page-btn ${i === currentPageNum ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPageNum - 3 || i === currentPageNum + 3) {
            html += '<span class="page-dots">...</span>';
        }
    }
    
    // Botón siguiente
    html += `<button class="page-btn" ${currentPageNum === totalPages ? 'disabled' : ''} data-page="${currentPageNum + 1}">
        <i class="bi bi-chevron-right"></i>
    </button>`;
    
    html += '</div>';
    container.innerHTML = html;
    
    // Event listeners
    container.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                currentPage = parseInt(btn.dataset.page);
                renderProducts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

/**
 * Actualiza contador de resultados
 */
function updateResultsCount(filtered, total) {
    const counter = document.getElementById('results-count');
    if (counter) {
        if (currentSearch) {
            counter.textContent = `${filtered} de ${total} productos`;
            return;
        }

        counter.textContent = `${total} producto${total !== 1 ? 's' : ''}`;
    }
}

/**
 * Muestra mensaje de error
 */
function showError(message) {
    // TODO: Implementar sistema de notificaciones
    alert(message);
}

/**
 * Muestra mensaje de éxito
 */
function showSuccess(message) {
    // TODO: Implementar sistema de notificaciones
    alert(message);
}
