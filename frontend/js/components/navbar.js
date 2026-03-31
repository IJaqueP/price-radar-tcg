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
                    <img src="assets/logo-tcg-mio.png" alt="Logo" class="navbar-logo">
                    <span class="navbar-title">Nexus Cards</span>
                    <span class="navbar-subtitle">Oasis Games</span>
                </div>

            <!-- Navegación Principal -->
            <ul class="navbar-menu">
                <li>
                    <a href="#" class="navbar-link active" data-page="dashboard">
                        <i class="bi bi-speedometer2"></i>
                        <span>Radar Price</span>
                    </a>
                </li>
                
                <!-- Magic Dropdown -->
                <li class="navbar-dropdown">
                    <a href="#" class="navbar-link">
                        <i class="bi bi-star"></i>
                        <span>Magic</span>
                        <i class="bi bi-chevron-down dropdown-icon"></i>
                    </a>
                    <ul class="navbar-submenu">
                        <li>
                            <a href="#" data-page="magic-sealed">
                                <i class="bi bi-box-seam"></i>
                                <span>Sellado</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" data-page="mtg-cartas">
                                <i class="bi bi-card-list"></i>
                                <span>Cartas</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" data-page="mtg-ediciones">
                                <i class="bi bi-collection-fill"></i>
                                <span>Ediciones</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" data-page="mtg-spoiler">
                                <i class="bi bi-grid-3x3"></i>
                                <span>Spoiler</span>
                            </a>
                        </li>
                    </ul>
                </li>
                
                <!-- Pokemon Dropdown -->
                <li class="navbar-dropdown">
                    <a href="#" class="navbar-link">
                        <i class="bi bi-circle"></i>
                        <span>Pokémon</span>
                        <i class="bi bi-chevron-down dropdown-icon"></i>
                    </a>
                    <ul class="navbar-submenu">
                        <li>
                            <a href="#" data-page="pokemon-sealed">
                                <i class="bi bi-box-seam"></i>
                                <span>Sellado</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-card-list"></i>
                                <span>Singles</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-collection-fill"></i>
                                <span>Ediciones</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-grid-3x3"></i>
                                <span>Spoiler</span>
                            </a>
                        </li>
                    </ul>
                </li>
                
                <!-- One Piece Dropdown -->
                <li class="navbar-dropdown">
                    <a href="#" class="navbar-link">
                        <i class="bi bi-flag"></i>
                        <span>One Piece</span>
                        <i class="bi bi-chevron-down dropdown-icon"></i>
                    </a>
                    <ul class="navbar-submenu">
                        <li>
                            <a href="#" data-page="onepiece-sealed">
                                <i class="bi bi-box-seam"></i>
                                <span>Sellado</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-card-list"></i>
                                <span>Singles</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-collection-fill"></i>
                                <span>Ediciones</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-grid-3x3"></i>
                                <span>Spoiler</span>
                            </a>
                        </li>
                    </ul>
                </li>
                
                <!-- Gundam Dropdown -->
                <li class="navbar-dropdown">
                    <a href="#" class="navbar-link">
                        <i class="bi bi-robot"></i>
                        <span>Gundam</span>
                        <i class="bi bi-chevron-down dropdown-icon"></i>
                    </a>
                    <ul class="navbar-submenu">
                        <li>
                            <a href="#" data-page="gundam-sealed">
                                <i class="bi bi-box-seam"></i>
                                <span>Sellado</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-card-list"></i>
                                <span>Singles</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-collection-fill"></i>
                                <span>Ediciones</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-grid-3x3"></i>
                                <span>Spoiler</span>
                            </a>
                        </li>
                    </ul>
                </li>
                
                <!-- Riftbound Dropdown -->
                <li class="navbar-dropdown">
                    <a href="#" class="navbar-link">
                        <i class="bi bi-book"></i>
                        <span>Riftbound</span>
                        <i class="bi bi-chevron-down dropdown-icon"></i>
                    </a>
                    <ul class="navbar-submenu">
                        <li>
                            <a href="#" data-page="riftbound-sealed">
                                <i class="bi bi-box-seam"></i>
                                <span>Sellado</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-card-list"></i>
                                <span>Singles</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-collection-fill"></i>
                                <span>Ediciones</span>
                            </a>
                        </li>
                        <li class="disabled">
                            <a href="#" class="text-muted">
                                <i class="bi bi-grid-3x3"></i>
                                <span>Spoiler</span>
                            </a>
                        </li>
                    </ul>
                </li>
                
                <!-- Accesorios Dropdown -->
                <li class="navbar-dropdown">
                    <a href="#" class="navbar-link">
                        <i class="bi bi-box"></i>
                        <span>Accesorios</span>
                        <i class="bi bi-chevron-down dropdown-icon"></i>
                    </a>
                    <ul class="navbar-submenu">
                        <li>
                            <a href="#" data-page="accessories-products">
                                <i class="bi bi-box-seam"></i>
                                <span>Productos</span>
                            </a>
                        </li>
                    </ul>
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

    // Configurar toggle para móviles
    const toggleBtn = document.getElementById('navbar-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');

    if (toggleBtn && navbarMenu) {
        toggleBtn.addEventListener('click', () => {
            navbarMenu.classList.toggle('show');
            console.log('📱 Toggle menu móvil');
        });
    }

    // Inicializar todos los dropdowns
    initAllDropdowns();

    // Cerrar menú móvil al hacer click en un link
    const navLinks = document.querySelectorAll('.navbar-link[data-page], .navbar-submenu a[data-page]');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbarMenu) {
                navbarMenu.classList.remove('show');
            }
        });
    });

    console.log('🆗 Navbar inicializado');
}

/**
 * Inicializa TODOS los dropdowns del navbar
 */
function initAllDropdowns() {
    const dropdowns = document.querySelectorAll('.navbar-dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.navbar-link');
        const submenu = dropdown.querySelector('.navbar-submenu');
        
        if (!toggle || !submenu) return;
        
        // Hover para desktop
        dropdown.addEventListener('mouseenter', () => {
            submenu.classList.add('show');
        });
        
        dropdown.addEventListener('mouseleave', () => {
            submenu.classList.remove('show');
        });
        
        // Click para móvil - Solo en el toggle principal, NO en los items del submenu
        toggle.addEventListener('click', (e) => {
            // Si el click es en un item del submenu, no hacer nada
            if (e.target.closest('.navbar-submenu')) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            // Cerrar otros dropdowns
            dropdowns.forEach(other => {
                if (other !== dropdown) {
                    other.querySelector('.navbar-submenu')?.classList.remove('show');
                }
            });
            
            submenu.classList.toggle('show');
        });
        
        // Permitir que los enlaces del submenu funcionen normalmente
        const submenuLinks = submenu.querySelectorAll('a[data-page]');
        submenuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Cerrar el submenu pero permitir que la navegación continúe
                submenu.classList.remove('show');
                // NO prevenir el evento, dejar que main.js lo maneje
            });
        });
    });
    
    // Cerrar al hacer click fuera DE FORMA GLOBAL
    document.addEventListener('click', (e) => {
        // Si el click fue en un enlace de datos (para navegación), cerrar dropdown pero permitir navegación
        if (e.target.closest('[data-page]')) {
            dropdowns.forEach(dropdown => {
                dropdown.querySelector('.navbar-submenu')?.classList.remove('show');
            });
            return;
        }
        
        // Si el click fue fuera del navbar, cerrar todos los dropdowns
        if (!e.target.closest('.navbar-dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.querySelector('.navbar-submenu')?.classList.remove('show');
            });
        }
    });
}


/**
    * Actualiza el estado de sincronización en el navbar
    * @param {string} status - Estado: 'syncing', 'synced', 'error'
    * @param {string} message - Mensaje opcional
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
