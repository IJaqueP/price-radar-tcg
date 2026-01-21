/* ============================================
   CONFIGURACIÓN PAGE - PRICE RADAR TCG
   ============================================
   
   Página de configuración del sistema (placeholder)
   
   ============================================ */

export async function render(container) {
    console.log('⚙️ Renderizando página de Configuración...');
    
    container.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h1 class="page-title">
                    <i class="bi bi-gear"></i>
                    Configuración
                </h1>
                <p class="page-subtitle">Ajustes del sistema</p>
            </div>
            
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="bi bi-tools"></i>
                </div>
                <h3 class="empty-state-title">Página en construcción</h3>
                <p class="empty-state-message">
                    Los ajustes de configuración estarán disponibles próximamente.
                </p>
            </div>
        </div>
    `;
}