/* ============================================
   MTG SPOILER PAGE - PRICE RADAR TCG
   ============================================
   
   Grid de todas las ediciones disponibles (estilo Mythic Spoiler)
   
   ============================================ */

import api from '../utils/api.js';
import CONFIG from '../config.js';

let allSets = [];

/**
 * Renderiza la página
 * @param {HTMLElement} container - Contenedor donde renderizar
 */
export async function render(container) {
    console.log('🎴 Renderizando MTG Spoiler...');
    
    container.innerHTML = getMtgSpoilerHTML();
    
    await initMtgSpoiler();
    
    console.log('✅ MTG Spoiler renderizado');
}

/**
 * Genera el HTML de la página
 */
function getMtgSpoilerHTML() {
    return `
        <div class="mtg-browser-container">
            <div class="mtg-header">
                <h1 class="page-title">
                    <i class="bi bi-grid-3x3"></i>
                    Visual Spoiler
                </h1>
                <p class="page-subtitle">
                    Explora todas las ediciones de Magic disponibles
                </p>
            </div>

            <section class="sets-section">
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
async function initMtgSpoiler() {
    await loadSets();
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
 * Ver todas las cartas de un set
 */
async function viewCompleteSet(setCode) {
    const setsGrid = document.getElementById('sets-grid');
    
    // Crear un contenedor temporal para los resultados
    let resultsContainer = document.getElementById('spoiler-set-view');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'spoiler-set-view';
        setsGrid.parentElement.insertBefore(resultsContainer, setsGrid);
    }
    
    resultsContainer.innerHTML = `
        <div class="loading-message">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando set...</span>
            </div>
            <p>Cargando edición completa...</p>
        </div>
    `;
    
    resultsContainer.scrollIntoView({ behavior: 'smooth' });

    try {
        const endpoint = CONFIG.ENDPOINTS.MTG_SET_CARDS.replace(':setCode', setCode);
        const response = await api.get(endpoint);
        
        if (!response.data || !response.data.cards || response.data.cards.length === 0) {
            resultsContainer.innerHTML = '<p class="empty-message">No se encontraron cartas en esta edición</p>';
            return;
        }

        renderSetView(response.data, resultsContainer);
        
    } catch (error) {
        console.error('Error cargando set completo:', error);
        resultsContainer.innerHTML = '<p class="error-message">❌ Error cargando la edición</p>';
    }
}

/**
 * Renderizar vista de set completo
 */
function renderSetView(setData, container) {
    container.innerHTML = `
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
                <button class="btn btn-secondary" onclick="document.getElementById('spoiler-set-view').innerHTML = ''; window.scrollTo(0, 0);">
                    <i class="bi bi-arrow-left"></i> Volver a ediciones
                </button>
            </div>
            
            <div class="set-view-grid">
                ${setData.cards.map(card => renderSetCardItem(card)).join('')}
            </div>
        </div>
    `;
}

/**
 * Renderizar carta en vista de set
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
 * Formatear fecha
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
}
