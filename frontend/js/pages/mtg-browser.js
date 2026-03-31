/* ============================================
   MTG BROWSER PAGE - PRICE RADAR TCG
   ============================================
   
   Página para buscar y visualizar cartas de MTG.
   
   Funcionalidades:
   - Búsqueda de cartas por nombre
   - Vista de todas las ediciones
   - Filtros por idioma
   - Toggle de imágenes
   
   ============================================ */

import api from '../utils/api.js';
import CONFIG from '../config.js';
import { showLoader, hideLoader } from '../utils/loader.js';

// Estado local
let allSets = [];
let searchResults = [];
let showImages = true;

/**
 * Renderiza la página
 * @param {HTMLElement} container - Contenedor donde renderizar
 */
export async function render(container) {
    console.log('🎴 Renderizando MTG Browser...');
    
    // Renderizar estructura HTML
    container.innerHTML = getMtgBrowserHTML();
    
    // Inicializar funcionalidad
    await initMtgBrowser();
    
    console.log('✅ MTG Browser renderizado');
}

/**
 * Genera el HTML de la página
 */
function getMtgBrowserHTML() {
    return `
        <div class="mtg-browser-container">
            <!-- Header -->
            <div class="mtg-header">
                <h1 class="page-title">
                    <i class="bi bi-collection"></i>
                    Magic: The Gathering Card Browser
                </h1>
                <p class="page-subtitle">
                    Busca y explora todas las cartas de MTG sincronizadas desde Scryfall
                </p>
            </div>

            <!-- Sección de Búsqueda -->
            <section class="search-section">
                <div class="search-container">
                    <div class="search-input-group">
                        <i class="bi bi-search search-icon"></i>
                        <input 
                            type="text" 
                            id="search-input" 
                            class="search-input"
                            placeholder="Buscar carta (inglés o español)..."
                            autocomplete="off"
                        >
                        <button id="search-btn" class="btn-search">
                            <i class="bi bi-search"></i>
                            Buscar
                        </button>
                    </div>
                    
                    <div class="search-options">
                        <label class="checkbox-label">
                            <input type="checkbox" id="images-toggle" checked>
                            <span>Mostrar imágenes</span>
                        </label>
                    </div>
                </div>

                <!-- Resultados de Búsqueda -->
                <div id="search-results" class="search-results">
                    <!-- Los resultados aparecerán aquí -->
                </div>
            </section>

            <hr class="section-divider">

            <!-- Sección de Ediciones -->
            <section class="sets-section">
                <h2 class="section-title">
                    <i class="bi bi-box-seam"></i>
                    Ediciones Disponibles
                </h2>
                
                <div id="sets-loading" class="loading-message">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p>Cargando ediciones...</p>
                </div>
                
                <div id="sets-grid" class="sets-grid">
                    <!-- Las ediciones aparecerán aquí -->
                </div>
            </section>
        </div>
    `;
}

/**
 * Inicializa la página
 */
async function initMtgBrowser() {
    // Cargar sets al inicio
    await loadSets();
    
    // Event listeners
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const imagesToggle = document.getElementById('images-toggle');
    
    searchBtn.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
            hideAutocomplete();
        }
    });
    
    // Autocompletado con debounce
    let autocompleteTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(autocompleteTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            hideAutocomplete();
            return;
        }
        
        autocompleteTimeout = setTimeout(() => {
            loadAutocomplete(query);
        }, 300);
    });
    
    // Cerrar autocomplete al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-group')) {
            hideAutocomplete();
        }
    });
    
    imagesToggle.addEventListener('change', (e) => {
        showImages = e.target.checked;
        if (searchResults.length > 0) {
            renderSearchResults(searchResults);
        }
    });
}

/**
 * Cargar todos los sets desde la API
 */
async function loadSets() {
    try {
        const setsLoading = document.getElementById('sets-loading');
        const setsGrid = document.getElementById('sets-grid');
        
        const response = await api.get(CONFIG.ENDPOINTS.MTG_SETS);
        
        setsLoading.style.display = 'none';
        
        if (!response.data || response.data.length === 0) {
            setsGrid.innerHTML = '<p class="empty-message">No hay ediciones disponibles</p>';
            return;
        }

        allSets = response.data;
        renderSets(response.data);
        
    } catch (error) {
        console.error('Error cargando sets:', error);
        document.getElementById('sets-loading').innerHTML = 
            '<p class="error-message">❌ Error cargando ediciones</p>';
    }
}

/**
 * Renderizar sets en el grid
 */
function renderSets(sets) {
    const setsGrid = document.getElementById('sets-grid');
    
    setsGrid.innerHTML = sets.map(set => `
        <div class="set-card" data-set-code="${set.set_code}">
            <div class="set-card-content">
                <h3 class="set-name">${set.set_name}</h3>
                <div class="set-code">${set.set_code.toUpperCase()}</div>
                <div class="set-info">
                    <span class="set-count">
                        <i class="bi bi-collection"></i>
                        ${set.card_count} cartas
                    </span>
                    <span class="set-date">
                        <i class="bi bi-calendar"></i>
                        ${formatDate(set.released_at)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Agregar event listeners a las tarjetas
    document.querySelectorAll('.set-card').forEach(card => {
        card.addEventListener('click', () => {
            const setCode = card.dataset.setCode;
            viewCompleteSet(setCode);
        });
    });
}

/**
 * Buscar cartas
 */
async function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const query = searchInput.value.trim();
    
    if (!query) {
        searchResults.innerHTML = '<p class="empty-message">Escribe el nombre de una carta</p>';
        return;
    }

    searchResults.innerHTML = `
        <div class="loading-message">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Buscando...</span>
            </div>
            <p>Buscando cartas...</p>
        </div>
    `;

    try {
        const response = await api.get(`${CONFIG.ENDPOINTS.MTG_SEARCH}?name=${encodeURIComponent(query)}`);
        
        if (!response.data || response.data.length === 0) {
            searchResults.innerHTML = '<p class="empty-message">No se encontraron cartas</p>';
            return;
        }

        renderSearchResults(response.data);
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        searchResults.innerHTML = '<p class="error-message">❌ Error en la búsqueda</p>';
    }
}

/**
 * Renderizar resultados de búsqueda
 */
function renderSearchResults(cards) {
    searchResults = cards;
    const resultsContainer = document.getElementById('search-results');
    
    resultsContainer.innerHTML = `
        <div class="results-header">
            <h3>Resultados de búsqueda (${cards.length})</h3>
        </div>
        <div class="cards-grid">
            ${cards.map(card => renderCardItem(card)).join('')}
        </div>
    `;
}

/**
 * Renderizar una carta individual
 */
function renderCardItem(card) {
    // Imagen (si está habilitada)
    const imageHTML = (showImages && card.image_uris?.normal) 
        ? `<img src="${card.image_uris.normal}" alt="${card.name}" class="card-image">`
        : '';
    
    // Detectar variantes
    let variantHTML = '';
    if (card.frame_effects || card.promo) {
        const variant = card.frame_effects || 'Promo';
        variantHTML = `<span class="card-variant">${variant}</span>`;
    }
    
    // Idioma
    const langHTML = card.lang === 'es' 
        ? '<span class="card-lang spanish">ES</span>' 
        : '<span class="card-lang">EN</span>';
    
    return `
        <div class="card-result">
            ${imageHTML}
            <div class="card-info">
                <h4 class="card-name">${card.name}</h4>
                <div class="card-set">
                    [${card.set_code.toUpperCase()}] ${card.set_name}
                </div>
                <div class="card-meta">
                    ${langHTML}
                    ${variantHTML}
                </div>
            </div>
        </div>
    `;
}

/**
 * Ver todas las cartas de un set
 */
async function viewCompleteSet(setCode) {
    const searchResultsContainer = document.getElementById('search-results');
    
    searchResultsContainer.innerHTML = `
        <div class="loading-message">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando set...</span>
            </div>
            <p>Cargando edición completa...</p>
        </div>
    `;
    
    // Scroll hacia los resultados
    searchResultsContainer.scrollIntoView({ behavior: 'smooth' });

    try {
        const endpoint = CONFIG.ENDPOINTS.MTG_SET_CARDS.replace(':setCode', setCode);
        const response = await api.get(endpoint);
        
        if (!response.data || !response.data.cards || response.data.cards.length === 0) {
            searchResultsContainer.innerHTML = '<p class="empty-message">No se encontraron cartas en esta edición</p>';
            return;
        }

        renderSetView(response.data);
        
    } catch (error) {
        console.error('Error cargando set completo:', error);
        searchResultsContainer.innerHTML = '<p class="error-message">❌ Error cargando la edición</p>';
    }
}

/**
 * Renderizar vista de set completo (estilo Mythic Spoiler)
 */
function renderSetView(setData) {
    const resultsContainer = document.getElementById('search-results');
    
    resultsContainer.innerHTML = `
        <div class="set-view">
            <div class="set-view-header">
                <h2>
                    <i class="bi bi-box-seam"></i>
                    ${setData.set_name}
                </h2>
                <p class="set-view-info">
                    <span class="badge bg-primary">${setData.set_code.toUpperCase()}</span>
                    <span>${setData.total} cartas</span>
                </p>
            </div>
            
            <div class="set-view-grid">
                ${setData.cards.map(card => renderSetCardItem(card)).join('')}
            </div>
        </div>
    `;
}

/**
 * Renderizar carta en vista de set (estilo grid compacto)
 */
function renderSetCardItem(card) {
    const imageUrl = card.image_uris?.normal || card.image_uris?.small || '';
    
    return `
        <div class="set-card-item" title="${card.name} - #${card.collector_number}">
            <img 
                src="${imageUrl}" 
                alt="${card.name}"
                loading="lazy"
            >
            <div class="set-card-number">#${card.collector_number}</div>
        </div>
    `;
}

/**
 * Cargar sugerencias de autocompletado
 */
async function loadAutocomplete(query) {
    try {
        const response = await api.get(`${CONFIG.ENDPOINTS.MTG_AUTOCOMPLETE}?q=${encodeURIComponent(query)}&limit=8`);
        
        if (!response.data || response.data.length === 0) {
            hideAutocomplete();
            return;
        }

        showAutocomplete(response.data);
        
    } catch (error) {
        console.error('Error en autocompletado:', error);
    }
}

/**
 * Mostrar dropdown de autocompletado
 */
function showAutocomplete(suggestions) {
    let dropdown = document.getElementById('autocomplete-dropdown');
    
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'autocomplete-dropdown';
        dropdown.className = 'autocomplete-dropdown';
        document.querySelector('.search-input-group').appendChild(dropdown);
    }
    
    dropdown.innerHTML = suggestions.map(name => `
        <div class="autocomplete-item" data-name="${name}">
            <i class="bi bi-search"></i>
            <span>${name}</span>
        </div>
    `).join('');
    
    dropdown.style.display = 'block';
    
    // Event listeners para cada sugerencia
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            const cardName = item.dataset.name;
            document.getElementById('search-input').value = cardName;
            hideAutocomplete();
            performSearch();
        });
    });
}

/**
 * Ocultar dropdown de autocompletado
 */
function hideAutocomplete() {
    const dropdown = document.getElementById('autocomplete-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

/**
 * Formatear fecha
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
}