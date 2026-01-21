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
    console.log(`🚀 Initializing ${CONFIG.APP.NAME} v${CONFIG.APP.VERSION}`);
    
    try {
        showLoader();
        
        // Load navbar component
        await loadNavbar();
        
        // Load default page
        await navigateTo(CONFIG.APP.DEFAULT_PAGE);
        
        // Setup navigation listeners
        setupNavigation();
        
        hideLoader();
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing application:', error);
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
    
    try {
        showLoader();
        
        const contentElement = document.getElementById('app-content');
        
        // Dynamic import of page module
        const pageModule = await import(`./pages/${pageName}.js`);
        
        // Load page content
        if (typeof pageModule.render === 'function') {
            await pageModule.render(contentElement);
        }
        
        // Update app state
        AppState.currentPage = pageName;
        
        // Update active nav item
        updateActiveNav(pageName);
        
        hideLoader();
        
    } catch (error) {
        console.error(`Error loading page ${pageName}:`, error);
        hideLoader();
        showError(`Error al cargar la página: ${pageName}`);
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