/* ============================================
   VENTAS PAGE - PRICE RADAR TCG
   ============================================
   
   Página de gestión de ventas (placeholder)
   
   ============================================ */

export async function render(container) {
    console.log('📊 Renderizando página de Ventas...');
    
    container.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h1 class="page-title">
                    <i class="bi bi-cart-check"></i>
                    Ventas
                </h1>
                <p class="page-subtitle">Gestión de ventas y pedidos</p>
            </div>
            
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="bi bi-cart-x"></i>
                </div>
                <h3 class="empty-state-title">Página en construcción</h3>
                <p class="empty-state-message">
                    La funcionalidad de ventas estará disponible próximamente.
                </p>
            </div>
        </div>
    `;
}