/* ============================================
   MTG PRODUCTOS PAGE - PRICE RADAR TCG
   ============================================
   
   Página para gestionar productos sellados de MTG
   (Sobres, cajas, bundles, etc.)
   
   Se implementará cuando conectemos con Shopify
   
   ============================================ */

/**
 * Renderiza la página
 * @param {HTMLElement} container - Contenedor donde renderizar
 */
export async function render(container) {
    console.log('📦 Renderizando MTG Productos...');
    
    container.innerHTML = getMtgProductosHTML();
    
    console.log('✅ MTG Productos renderizado');
}

/**
 * Genera el HTML de la página
 */
function getMtgProductosHTML() {
    return `
        <div class="mtg-productos-container">
            <div class="mtg-header">
                <h1 class="page-title">
                    <i class="bi bi-box-seam"></i>
                    Magic: Productos Sellados
                </h1>
                <p class="page-subtitle">
                    Gestión de sobres, cajas, bundles y productos sellados de MTG
                </p>
            </div>

            <div class="coming-soon">
                <i class="bi bi-tools" style="font-size: 4rem; color: var(--primary-color);"></i>
                <h2>Página en construcción</h2>
                <p>Esta sección se activará cuando conectemos con Shopify</p>
                <p class="text-muted">Aquí podrás gestionar todos los productos sellados sincronizados desde tu tienda</p>
            </div>
        </div>
    `;
}
