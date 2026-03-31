/* ============================================
   MTG EDICIONES PAGE - PRICE RADAR TCG
   ============================================
   
   Buscador de ediciones con visualización de cartas
   
   ============================================ */

import api from '../utils/api.js';
import CONFIG from '../config.js';

/**
 * Renderiza la página
 * @param {HTMLElement} container - Contenedor donde renderizar
 */
export async function render(container) {
    console.log('📚 Renderizando MTG Ediciones...');
    
    container.innerHTML = getMtgEdicionesHTML();
    
    await initMtgEdiciones();
    
    console.log('✅ MTG Ediciones renderizado');
}

/**
 * Genera el HTML de la página
 */
function getMtgEdicionesHTML() {
    return `
        <div class="mtg-browser-container">
            <div class="mtg-header">
                <h1 class="page-title">
                    <i class="bi bi-collection-fill"></i>
                    Buscador de Ediciones
                </h1>
                <p class="page-subtitle">
                    Busca una edición específica para ver todas sus cartas
                </p>
            </div>

            <section class="search-section">
                <div class="search-container">
                    <div class="search-input-group">
                        <i class="bi bi-search search-icon"></i>
                        <input 
                            type="text" 
                            id="edition-search-input" 
                            class="search-input"
                            placeholder="Buscar edición (ej: Lorwyn, Dominaria, Foundations)..."
                            autocomplete="off"
                        >
                        <button id="edition-search-btn" class="btn-search">
                            <i class="bi bi-search"></i>
                            Buscar
                        </button>
                    </div>
                </div>

                <div id="edition-results" class="search-results">
                    <p class="empty-message">Escribe el nombre de una edición para buscar</p>
                </div>
            </section>
        </div>
    `;
}

/**
 * Inicializa la página
 */
async function initMtgEdiciones() {
    const searchBtn = document.getElementById('edition-search-btn');
    const searchInput = document.getElementById('edition-search-input');
    
    searchBtn.addEventListener('click', searchEdition);
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchEdition();
        }
    });
}

async function searchEdition() {
    const searchInput = document.getElementById('edition-search-input');
    const resultsContainer = document.getElementById('edition-results');
    const query = searchInput.value.trim();
    
    if (!query) {
        resultsContainer.innerHTML = '<p class="empty-message">Escribe el nombre de una edición</p>';
        return;
    }

    resultsContainer.innerHTML = `
        <div class="loading-message">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Buscando...</span>
            </div>
            <p>Buscando edición...</p>
        </div>
    `;

    try {
        // Buscar el código del set primero
        const setsResponse = await api.get(CONFIG.ENDPOINTS.MTG_SETS);
        
        const matchingSet = setsResponse.data.find(set => 
            set.set_name.toLowerCase().includes(query.toLowerCase()) ||
            set.set_code.toLowerCase() === query.toLowerCase()
        );
        
        if (!matchingSet) {
            resultsContainer.innerHTML = '<p class="empty-message">No se encontró la edición</p>';
            return;
        }
        
        // Cargar las cartas del set
        await loadSetCards(matchingSet.set_code);
        
    } catch (error) {
        console.error('Error buscando edición:', error);
        resultsContainer.innerHTML = '<p class="error-message">❌ Error en la búsqueda</p>';
    }
}

async function loadSetCards(setCode) {
    const resultsContainer = document.getElementById('edition-results');
    
    try {
        const endpoint = CONFIG.ENDPOINTS.MTG_SET_CARDS.replace(':setCode', setCode);
        const response = await api.get(endpoint);
        
        if (!response.data || !response.data.cards || response.data.cards.length === 0) {
            resultsContainer.innerHTML = '<p class="empty-message">No se encontraron cartas en esta edición</p>';
            return;
        }

        renderSetView(response.data);
        
    } catch (error) {
        console.error('Error cargando cartas del set:', error);
        resultsContainer.innerHTML = '<p class="error-message">❌ Error cargando las cartas</p>';
    }
}

function renderSetView(setData) {
    const resultsContainer = document.getElementById('edition-results');
    
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
