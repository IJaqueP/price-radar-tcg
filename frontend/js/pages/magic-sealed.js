/* ============================================
   MAGIC SEALED PRODUCTS PAGE
   ============================================
   
   Página para visualizar productos sellados de Magic
   (Booster Box, Bundles, etc.)
   
   Diseño basado en mtg-cartas.js
   
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
    console.log('📦 Renderizando Magic Sellado...');
    
    container.innerHTML = getMagicSealedHTML();
    
    console.log('✅ HTML renderizado, inicializando...');
    await initMagicSealed();
    
    console.log('✅ Magic Sellado completamente inicializado');
}

/**
 * Genera el HTML
 */
function getMagicSealedHTML() {
    return `
        <div class="magic-sealed-container">
            <!-- Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">
                        <i class="bi bi-star"></i>
                        Magic: Productos Sellados
                    </h1>
                    <p class="page-subtitle">
                        Gestión de productos sellados de Magic: The Gathering
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
 * Inicializa la funcionalidad
 */
async function initMagicSealed() {
    // Event listener para búsqueda
    const searchInput = document.getElementById('search-input');
    searchInput?.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        currentPage = 1;
        renderProducts();
    });

    // Event listener para sincronización
    const btnSync = document.getElementById('btn-sync-sealed');
    btnSync?.addEventListener('click', loadProducts);

    // Cargar productos iniciales
    await loadProducts();
}

/**
 * Carga productos desde el API
 */
async function loadProducts() {
    try {
        showLoader();
        console.log('🔄 Iniciando carga de Magic Sealed...');

        const response = await api.get('/products/sealed/magic', { limit: 1000 });
        
        console.log('✅ Respuesta recibida del backend:', response);

        // Verificar si tenemos productos
        if (!response) {
            console.error('❌ Respuesta vacía');
            showError('❌ Error: Respuesta vacía del servidor');
            return;
        }

        // Extraer productos
        const products = response.products || response.data || [];
        console.log(`📊 Productos encontrados: ${products.length}`);
        
        if (products.length === 0) {
            console.warn('⚠️ No hay productos con stock disponibles');
            allProducts = [];
            renderProducts();
            return;
        }

        allProducts = products;
        console.log(`✅ ${allProducts.length} productos cargados exitosamente`);
        currentPage = 1; // Resetear a página 1
        renderProducts();
        
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        console.error('Stack:', error.stack);
        const errorMsg = error?.message || 'Error desconocido al cargar productos';
        showError(`❌ ${errorMsg}`);
    } finally {
        hideLoader();
    }
}

/**
 * Renderiza los productos filtrados y paginados
 */
function renderProducts() {
    // Filtrar productos por búsqueda
    const filteredProducts = allProducts.filter(product => 
        product.title.toLowerCase().includes(currentSearch) ||
        (product.sku && product.sku.toLowerCase().includes(currentSearch))
    );

    // Actualizar contador
    updateResultsCount(filteredProducts.length, allProducts.length);

    // Calcular paginación
    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);

    // Renderizar grid
    const gridContainer = document.getElementById('products-grid');
    if (productsToShow.length === 0) {
        gridContainer.innerHTML = getEmptyState();
        return;
    }

    gridContainer.innerHTML = productsToShow.map(product => getProductCard(product)).join('');

    // Renderizar paginación
    renderPagination(totalPages, filteredProducts.length);

    // Event listeners para botones de cada producto
    attachProductEventListeners();
}

/**
 * Genera HTML de una tarjeta de producto
 */
function getProductCard(product) {
    const imageUrl = product.image_url || 'assets/logo-oasis.png';
    const stockBadge = getStockBadge(product.stock);
    const priceFormatted = `$${product.price.toLocaleString('es-CL')}`;

    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                <img 
                    src="${imageUrl}" 
                    alt="${product.title}"
                    onerror="this.src='assets/logo-oasis.png'"
                >
                ${stockBadge}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                ${product.sku ? `<p class="product-sku">SKU: ${product.sku}</p>` : ''}
                ${product.vendor ? `<p class="product-vendor">${product.vendor}</p>` : ''}
                <div class="product-price">${priceFormatted}</div>
            </div>
            <div class="product-actions">
                <button 
                    class="btn-view-shopify btn-sm" 
                    data-url="${product.shopify_url}"
                    title="Ver en Shopify"
                >
                    <i class="bi bi-shop"></i>
                    <span>Ver en Shopify</span>
                </button>
                <button 
                    class="btn-edit-price btn-sm" 
                    data-product-id="${product.id}"
                    data-current-price="${product.price}"
                    title="Editar precio"
                >
                    <i class="bi bi-pencil"></i>
                    <span>Editar Precio</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Genera badge de stock
 */
function getStockBadge(stock) {
    if (stock === 0 || stock === null) {
        return '<span class="badge-stock out-of-stock">Sin Stock</span>';
    } else if (stock <= 5) {
        return `<span class="badge-stock low-stock">${stock} disponibles</span>`;
    } else {
        return `<span class="badge-stock in-stock">${stock} disponibles</span>`;
    }
}

/**
 * Actualiza el contador de resultados
 */
function updateResultsCount(filtered, total) {
    const countElement = document.getElementById('results-count');
    if (countElement) {
        if (currentSearch) {
            countElement.textContent = `${filtered} de ${total} productos`;
        } else {
            countElement.textContent = `${total} productos`;
        }
    }
}

/**
 * Renderiza la paginación
 */
function renderPagination(totalPages, totalResults) {
    const paginationContainer = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<nav><ul class="pagination">';

    // Botón anterior
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;

    // Páginas
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    // Botón siguiente
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;

    paginationHTML += '</ul></nav>';
    paginationContainer.innerHTML = paginationHTML;

    // Event listeners para paginación
    const pageLinks = paginationContainer.querySelectorAll('.page-link');
    pageLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.currentTarget.dataset.page);
            if (page && page !== currentPage && page >= 1 && page <= totalPages) {
                currentPage = page;
                renderProducts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

/**
 * Estado vacío
 */
function getEmptyState() {
    return `
        <div class="empty-state">
            <i class="bi bi-inbox" style="font-size: 4rem; color: var(--text-muted);"></i>
            <h3>No se encontraron productos</h3>
            <p>Intenta con otro término de búsqueda</p>
        </div>
    `;
}

/**
 * Agrega event listeners a los botones de productos
 */
function attachProductEventListeners() {
    // Botones "Ver en Shopify"
    document.querySelectorAll('.btn-view-shopify').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const url = btn.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        });
    });

    // Botones "Editar Precio"
    document.querySelectorAll('.btn-edit-price').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = btn.dataset.productId;
            const currentPrice = btn.dataset.currentPrice;
            showEditPriceModal(productId, currentPrice);
        });
    });
}

/**
 * Muestra modal para editar precio (placeholder)
 */
function showEditPriceModal(productId, currentPrice) {
    const newPrice = prompt(`Editar precio\n\nPrecio actual: $${parseFloat(currentPrice).toLocaleString('es-CL')}\n\nIngresa nuevo precio (CLP):`, currentPrice);
    
    if (newPrice && !isNaN(newPrice) && parseFloat(newPrice) > 0) {
        updateProductPrice(productId, parseFloat(newPrice));
    }
}

/**
 * Actualiza el precio de un producto
 */
async function updateProductPrice(productId, newPrice) {
    try {
        showLoader();

        const response = await api.patch(`/products/${productId}/update`, {
            new_price: newPrice
        });

        if (response.success) {
            alert('✅ Precio actualizado correctamente');
            await loadProducts(); // Recargar productos
        } else {
            alert('❌ Error al actualizar precio');
        }

    } catch (error) {
        console.error('Error actualizando precio:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        hideLoader();
    }
}

/**
 * Muestra mensaje de error
 */
function showError(message) {
    const gridContainer = document.getElementById('products-grid');
    gridContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle"></i>
            ${message}
        </div>
    `;
}
