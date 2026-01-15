/* ============================================
   LOADER UTILITIES
   ============================================ */

import CONFIG from '../config.js';

let loaderTimeout = null;

/**
 * Show the application loader
 */
export function showLoader() {
    const loader = document.getElementById('app-loader');
    
    if (loader) {
        loader.classList.remove('hidden');
        loader.classList.add('fade-in');
    }
}

/**
 * Hide the application loader
 */
export function hideLoader() {
    const loader = document.getElementById('app-loader');
    
    if (loader) {
        if (loaderTimeout) {
            clearTimeout(loaderTimeout);
        }
        
        loaderTimeout = setTimeout(() => {
            loader.classList.add('fade-out');
            
            setTimeout(() => {
                loader.classList.remove('fade-in', 'fade-out');
                loader.classList.add('hidden');
            }, 200);
        }, CONFIG.UI.LOADER_MIN_DISPLAY_TIME);
    }
}

/**
 * Show loader for a specific element
 */
export function showElementLoader(element) {
    if (!element) return;
    
    const loader = document.createElement('div');
    loader.className = 'element-loader';
    loader.innerHTML = `
        <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
        </div>
    `;
    
    element.style.position = 'relative';
    element.appendChild(loader);
}

/**
 * Hide loader from specific element
 */
export function hideElementLoader(element) {
    if (!element) return;
    
    const loader = element.querySelector('.element-loader');
    if (loader) {
        loader.remove();
    }
}

/**
 * Execute async function with loader
 */
export async function withLoader(asyncFn, element = null) {
    try {
        if (element) {
            showElementLoader(element);
        } else {
            showLoader();
        }
        
        const result = await asyncFn();
        return result;
        
    } finally {
        if (element) {
            hideElementLoader(element);
        } else {
            hideLoader();
        }
    }
}

export default {
    showLoader,
    hideLoader,
    showElementLoader,
    hideElementLoader,
    withLoader,
};