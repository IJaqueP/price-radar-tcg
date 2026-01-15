/* ===========================================================
    NAVBAR COMPONENT - PRICE RADAR TCG
=========================================================== 

    Este componente maneja la barra de navegación superior.

    Funcionalidades:
        - Muestra el logo y nombre de la aplicación
        - Links de navegación
        - Indicador de página activa
        - Responsivo
*/

/*
    Genera el HTML del navbar
    @returns {string} HTML del navbar completo
*/
export function getNavbarHTML() {
    return `
        <nav class="navbar-custom">
            <div class="navbar-container">
                <!-- Logo y Nombre -->
                <div class="navbar-brand">
                    <i class="bi bi-lightning-charge-fill navbar-icon"></i>
                    <span class="navbar-title">Price Radar TCG</span>
                    <span class="navbar-subtitle">Oasis Games</span>
                </div>

            <!-- Navegación Principal -->
            <ul class="navbar-menu">
                <li>
                    <a href="#" class="navbar-link active" data-page="dashboard">
                        <i class="bi bi-speedometer2"></i>
                        <span>Dashboard</span>
                    </a>
                </li>
                <li>
                    <a href="#" class="navbar-link" data-page="ventas">
                        <i class="bi bi-graph-up"></i>
                        <span>Ventas</span>
                    </a>
                </li>
                <li>
                    <a href="#" class="navbar-link" data-page="configuracion">
                        <i class="bi bi-gear"></i>
                        <span>Configuración</span>
                    </a>
                </li>
            </ul>

            <!-- Indicador de Sincronización -->
                <div class="navbar-actions">
                    <div class="sync-status" id="sync-status">
                        <i class="bi bi-cloud-check"></i>
                        <span class="sync-text">Sincronizado</span>
                    </div>
                </div>

            <!-- Botón Mobile Menú (Para futuro) -->
                <button class="navbar-toggle" id="navbar-toggle" aria-label="Menú">
                    <i class="bi bi-list"></i>
                </button>
            </div>
        </nav>
    `;
}


/*
    Inicializa el navbar después de renderizarlo.
    Agrega event listeners y funcionalidades adicionales.
*/
export function initNavbar() {
    console.log('🆗 Inicializando navbar');

    // Configurar toggle para móviles (funcionalidad futura)
    const toggleBtn = document.getElementById('navbar-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');

    if (toggleBtn && navbarMenu) {
        toggleBtn.addEventListener('click', () => {
            navbarMenu.classList.toggle('show');
            console.log('📱 Toggle menu móvil');
        });
    }

    // Cerrar menú móvil al hacer click en un link
    const navLinks = document.querySelectorAll('.navbar-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbarMenu) {
                navbarMenu.classList.remove('show');
            }
        });
    });

    console.log('🆗 Navbar inicializado');
}


/*
    Actualiza el estado de sincronización en el navbar
    @param {string} status - Estado: 'syncing', 'synced', 'error'
    @param {string} message - Mensaje opcional
*/
export function updateSyncStatus(status, message = '') {
    const syncElement = document.getElementById('sync-status');

    if (!syncElement) return;

    // Remover clases anteriores
    syncElement.classList.remove('syncing', 'synced', 'error');

    // Agregar clase según estado
    syncElement.classList.add(status);

    // Actualizar ícono y texto
    const icon = syncElement.querySelector('i');
    const text = syncElement.querySelector('.sync-text');

    switch(status){
        case 'syncing':
            icon.className = 'bi bi-arrow-repeat spinning';
            text.textContent = message || 'Sincronizando...';
            break;
        case 'synced':
            icon.className = 'bi bi-cloud-check';
            text.textContent = message || 'Sincronizado';
            break;
        case 'error':
            icon.className = 'bi bi-exclamation-triangle';
            text.textContent = message || 'Error de sincronización';
            break;
    }
}


/*
    Muestra notificación en el navbar
    @param {string} message - Mensaje a mostrar
    @param {string} type - Tipo: 'success', 'error', 'info'
*/
export function showNavbarNotification(message, type = 'info') {
    const navbar = document.querySelector('.navbar-custom');

    if (!navbar) return;

    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `navbar-notification ${type}`;
    notification.innerHTML = `
        <i class='bi bi-info-circle'></i>
        <span>${message}</span>
    `;

    navbar.appendChild(notification);

    // Mostrar con animación
    setTimeout(() => notification.classList.add('show'), 10);

    // Remover después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
