/* ============================================
    MAIN APPLICATION ENTRY POINT
============================================ */

import CONFIG from './config.js';
import { showLoader, hideLoader } from './utils/loader.js';

// Application State
const AppState = {
    currentPage: null,
    user: null,
    isLoading: false,
};

// Initialize Application
async function initApp() {
    console.log(`%c🚀 Initializing ${CONFIG.APP.NAME} v${CONFIG.APP.VERSION}`, 'color: green; font-size: 16px; font-weight: bold');
    console.log(`%cBackend API: ${CONFIG.API_BASE_URL}`, 'color: blue');
    
    try {
        showLoader();
        
        // Load navbar component
        await loadNavbar();
        
        // Load default page
        await navigateTo(CONFIG.APP.DEFAULT_PAGE);
        
        // Setup navigation listeners
        setupNavigation();
        
        hideLoader();
        console.log('%c✅ Application initialized successfully', 'color: green; font-weight: bold');
        
    } catch (error) {
        console.error('%c❌ Error initializing application:', 'color: red; font-weight: bold', error);
        hideLoader();
        showError('Error al inicializar la aplicación. Por favor, recarga la página.');
    }
}

// Load Navbar Component
async function loadNavbar() {
    try {
        const navbarModule = await import('./components/navbar.js');
        const navbarElement = document.getElementById('navbar');
        
        if (navbarElement) {
            navbarElement.innerHTML = navbarModule.getNavbarHTML();
            navbarModule.initNavbar();
        }
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

// Navigate to Page
async function navigateTo(pageName) {
    if (AppState.currentPage === pageName) return;
    
    console.log(`%c[NAV] Navegando a: ${pageName}`, 'color: purple; font-weight: bold');
    
    try {
        showLoader();
        
        const contentElement = document.getElementById('app-content');
        
        // Dynamic import of page module
        console.log(`[NAV] Importando módulo: ./pages/${pageName}.js`);
        const pageModule = await import(`./pages/${pageName}.js`);
        
        // Load page content
        if (typeof pageModule.render === 'function') {
            console.log(`[NAV] Renderizando página...`);
            await pageModule.render(contentElement);
            console.log(`[NAV] Página renderizada exitosamente`);
        } else {
            throw new Error(`La página ${pageName} no tiene función render()`);
        }
        
        // Update app state
        AppState.currentPage = pageName;
        
        // Update active nav item
        updateActiveNav(pageName);
        
        hideLoader();
        
    } catch (error) {
        console.error(`%c[NAV] ERROR al cargar ${pageName}:`, 'color: red; font-weight: bold', error);
        hideLoader();
        showError(`Error al cargar la página: ${pageName}<br><small>${error.message}</small>`);
    }
}

// Update Active Navigation Item
function updateActiveNav(pageName) {
    document.querySelectorAll('[data-page]').forEach(navItem => {
        if (navItem.dataset.page === pageName) {
            navItem.classList.add('active');
        } else {
            navItem.classList.remove('active');
        }
    });
}

// Setup Navigation Event Listeners
function setupNavigation() {
    document.addEventListener('click', (e) => {
        const navLink = e.target.closest('[data-page]');
        
        if (navLink) {
            e.preventDefault();
            const pageName = navLink.dataset.page;
            navigateTo(pageName);
        }
    });
}

// Show Error Message
function showError(message) {
    const contentElement = document.getElementById('app-content');
    
    if (contentElement) {
        contentElement.innerHTML = `
            <div class="container-custom">
                <div class="alert alert-danger mt-4" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    ${message}
                </div>
            </div>
        `;
    }
}

// Export functions for use in other modules
export { AppState, navigateTo, showError };

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}