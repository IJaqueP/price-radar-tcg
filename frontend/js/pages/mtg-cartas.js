/* ============================================
   MTG CARTAS PAGE - PRICE RADAR TCG
   ============================================
   
   Buscador de cartas de MTG
   
   ============================================ */

import api from '../utils/api.js';
import CONFIG from '../config.js';

let searchResults = [];
let showImages = true;

/**
 * Renderiza la página
 * @param {HTMLElement} container - Contenedor donde renderizar
 */
export async function render(container) {
    console.log('🎴 Renderizando MTG Cartas...');
    
    container.innerHTML = getMtgCartasHTML();
    
    await initMtgCartas();
    
    console.log('✅ MTG Cartas renderizado');
}

/**
 * Genera el HTML de la página
 */
function getMtgCartasHTML() {
    return `
        <div class="mtg-browser-container">
            <div class="mtg-header">
                <h1 class="page-title">
                    <i class="bi bi-card-list"></i>
                    Buscador de Cartas
                </h1>
                <p class="page-subtitle">
                    Busca cualquier carta de Magic: The Gathering
                </p>
            </div>

            <section class="search-section">
                <div class="search-container">
                    <div class="search-controls">
                        <div class="language-toggle">
                            <label>IDIOMA:</label>
                            <label class="radio-label">
                                <input type="radio" name="language" value="en" checked>
                                <span>EN</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="language" value="es">
                                <span>ES</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="search-input-group">
                        <i class="bi bi-search search-icon"></i>
                        <input 
                            type="text" 
                            id="search-input" 
                            class="search-input"
                            placeholder="Buscar carta..."
                            autocomplete="off"
                        >
                        <button id="search-btn" class="btn-search">
                            <i class="bi bi-search"></i>
                            Buscar
                        </button>
                    </div>
                </div>

                <div id="search-results" class="search-results">
                    <p class="empty-message">Escribe el nombre de una carta para buscar</p>
                </div>
            </section>
        </div>
        
        <!-- Modal Quick Edit -->
        <div id="quick-edit-modal" class="modal-overlay">
            <div class="modal-content quick-edit-modal">
                <button class="modal-close" id="close-modal">&times;</button>
                <div id="modal-body">
                    <!-- Se llenará dinámicamente -->
                </div>
            </div>
        </div>
    `;
}

/**
 * Inicializa la página
 */
async function initMtgCartas() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const languageRadios = document.querySelectorAll('input[name="language"]');
    const closeModal = document.getElementById('close-modal');
    
    searchBtn.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
            hideAutocomplete();
        }
    });
    
    // Cambiar idioma
    languageRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            hideAutocomplete();
            searchInput.value = '';
            
            // Cambiar placeholder según idioma
            if (e.target.value === 'es') {
                searchInput.placeholder = 'Buscar carta en español...';
            } else {
                searchInput.placeholder = 'Buscar carta en inglés...';
            }
            
            document.getElementById('search-results').innerHTML = 
                '<p class="empty-message">Escribe el nombre de una carta para buscar</p>';
        });
    });
    
    // Cerrar modal
    closeModal.addEventListener('click', closeQuickEditModal);
    document.getElementById('quick-edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'quick-edit-modal') {
            closeQuickEditModal();
        }
    });
    
    // Autocompletado
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
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-group')) {
            hideAutocomplete();
        }
    });
}

async function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results');
    const query = searchInput.value.trim();
    const selectedLang = document.querySelector('input[name="language"]:checked').value;
    
    if (!query) {
        searchResultsContainer.innerHTML = '<p class="empty-message">Escribe el nombre de una carta</p>';
        return;
    }

    searchResultsContainer.innerHTML = `
        <div class="loading-message">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Buscando...</span>
            </div>
            <p>Buscando cartas...</p>
        </div>
    `;

    try {
        // Buscar en AMBOS idiomas, no filtrar por idioma
        const response = await api.get(`${CONFIG.ENDPOINTS.MTG_SEARCH}?name=${encodeURIComponent(query)}`);
        
        if (!response.data || response.data.length === 0) {
            searchResultsContainer.innerHTML = '<p class="empty-message">No se encontraron cartas</p>';
            return;
        }

        // Filtrar los resultados por idioma preferido en el frontend
        // Priorizar el idioma seleccionado pero mostrar ambos si hay matches
        const sortedResults = response.data.sort((a, b) => {
            if (a.lang === selectedLang && b.lang !== selectedLang) return -1;
            if (a.lang !== selectedLang && b.lang === selectedLang) return 1;
            return 0;
        });

        renderSearchResults(sortedResults);
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        searchResultsContainer.innerHTML = '<p class="error-message">❌ Error en la búsqueda</p>';
    }
}

async function renderSearchResults(cards) {
    searchResults = cards;
    const resultsContainer = document.getElementById('search-results');
    
    // Obtener todos los oracle_ids únicos para buscar nombres en español en una sola consulta
    const oracleIds = [...new Set(cards.map(c => c.oracle_id).filter(id => id))];
    
    // Buscar todas las versiones en español de una vez
    let spanishNamesMap = {};
    if (oracleIds.length > 0) {
        try {
            // Hacer una consulta con todos los oracle_ids separados por coma
            const oracleIdsParam = oracleIds.join(',');
            const response = await api.get(`${CONFIG.ENDPOINTS.MTG_CARDS}?oracle_id=${encodeURIComponent(oracleIdsParam)}&lang=es&limit=500`);
            
            if (response.data && response.data.cards) {
                response.data.cards.forEach(card => {
                    if (card.oracle_id && card.printed_name) {
                        spanishNamesMap[card.oracle_id] = card.printed_name;
                    }
                });
            }
        } catch (error) {
            console.error('Error al buscar nombres en español:', error);
        }
    }
    
    // Renderizar todos los items de cartas con los nombres en español ya obtenidos
    const cardItems = cards.map(card => renderCardItemSync(card, spanishNamesMap));
    
    resultsContainer.innerHTML = `
        <div class="results-header">
            <h3>Resultados de búsqueda (${cards.length})</h3>
        </div>
        <div class="cards-list">
            ${cardItems.join('')}
        </div>
    `;
}

function renderCardItemSync(card, spanishNamesMap = {}) {
    const imageUrl = card.image_uris?.normal || card.image_uris?.small || '';
    
    // Detectar variantes
    let variantText = '';
    if (card.frame_effects) {
        const effects = Array.isArray(card.frame_effects) ? card.frame_effects.join(', ') : card.frame_effects;
        variantText = effects;
    } else if (card.promo) {
        variantText = 'Promo';
    }
    
    // Determinar nombres en inglés y español
    const englishName = card.name; // name siempre es el Oracle name (inglés)
    let spanishName = '(No disponible en español)';
    
    if (card.lang === 'es' && card.printed_name) {
        // Si la carta es española, usar printed_name
        spanishName = card.printed_name;
    } else if (card.oracle_id && spanishNamesMap[card.oracle_id]) {
        // Si tenemos el nombre en español en el mapa
        spanishName = spanishNamesMap[card.oracle_id];
    }
    
    return `
        <div class="card-list-item" data-card-id="${card.scryfall_id}">
            <div class="card-image-container">
                <img src="${imageUrl}" alt="${englishName}" class="card-thumbnail">
            </div>
            <div class="card-details">
                <div class="card-main-info">
                    <h4 class="card-title">${englishName}</h4>
                    <p class="card-spanish-name">${spanishName}</p>
                    ${variantText ? `<p class="card-variant-info">${variantText}</p>` : ''}
                    <p class="card-set-info">[${card.set_code.toUpperCase()}] ${card.set_name}</p>
                </div>
                <div class="card-actions">
                    <button class="btn-quick-edit" onclick="openQuickEdit('${card.scryfall_id}', '${englishName.replace(/'/g, "\\'")}', '${imageUrl}', '${card.set_code}')">
                        QUICK EDIT
                    </button>
                    <button class="btn-idiomas" disabled title="Próximamente">
                        Idiomas
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function loadAutocomplete(query) {
    const selectedLang = document.querySelector('input[name="language"]:checked').value;
    
    try {
        // Buscar en AMBOS idiomas para el autocomplete
        const response = await api.get(`${CONFIG.ENDPOINTS.MTG_AUTOCOMPLETE}?q=${encodeURIComponent(query)}&limit=15`);
        
        if (!response.data || response.data.length === 0) {
            hideAutocomplete();
            return;
        }

        // Ordenar resultados priorizando el idioma seleccionado
        const sortedResults = response.data.sort((a, b) => {
            if (a.lang === selectedLang && b.lang !== selectedLang) return -1;
            if (a.lang !== selectedLang && b.lang === selectedLang) return 1;
            return 0;
        });

        // Limitar a 8 resultados después de ordenar
        showAutocomplete(sortedResults.slice(0, 8));
        
    } catch (error) {
        console.error('Error en autocompletado:', error);
    }
}

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
    
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            const cardName = item.dataset.name;
            document.getElementById('search-input').value = cardName;
            hideAutocomplete();
            performSearch();
        });
    });
}

function hideAutocomplete() {
    const dropdown = document.getElementById('autocomplete-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Funciones del modal Quick Edit
window.openQuickEdit = function(scryfallId, cardName, imageUrl, setCode) {
    const modal = document.getElementById('quick-edit-modal');
    const modalBody = document.getElementById('modal-body');
    
    // Precio placeholder (TCGPlayer en CLP - valor ficticio)
    const priceUSD = 24.99;
    const priceCLP = Math.round(priceUSD * 950); // Conversión ficticia
    
    modalBody.innerHTML = `
        <div class="quick-edit-header">
            <img src="${imageUrl}" alt="${cardName}" class="quick-edit-card-image">
            <div class="quick-edit-info">
                <h2>${cardName}</h2>
                <p class="set-badge">${setCode.toUpperCase()}</p>
                <p class="price-info">Precio TCGPlayer: <strong>$${priceCLP.toLocaleString('es-CL')} CLP</strong></p>
                <p class="inventory-total">Total en inventario: <strong>0 cartas</strong></p>
            </div>
        </div>
        
        <div class="conditions-grid">
            <!-- Columna 1: Inglés -->
            <div class="condition-column">
                <h3 class="column-header">English</h3>
                ${renderConditionCell('Near Mint', 'en', false, priceCLP)}
                ${renderConditionCell('Lightly Played', 'en', false, priceCLP * 0.9)}
                ${renderConditionCell('Moderately Played', 'en', false, priceCLP * 0.8)}
                ${renderConditionCell('Heavily Played', 'en', false, priceCLP * 0.7)}
                ${renderConditionCell('Damaged', 'en', false, priceCLP * 0.5)}
            </div>
            
            <!-- Columna 2: Español -->
            <div class="condition-column">
                <h3 class="column-header">Español</h3>
                ${renderConditionCell('Near Mint', 'es', false, priceCLP * 0.8)}
                ${renderConditionCell('Lightly Played', 'es', false, priceCLP * 0.72)}
                ${renderConditionCell('Moderately Played', 'es', false, priceCLP * 0.64)}
                ${renderConditionCell('Heavily Played', 'es', false, priceCLP * 0.56)}
                ${renderConditionCell('Damaged', 'es', false, priceCLP * 0.4)}
            </div>
            
            <!-- Columna 3: Inglés Foil -->
            <div class="condition-column">
                <h3 class="column-header">English Foil</h3>
                ${renderConditionCell('Near Mint', 'en', true, priceCLP * 1.5)}
                ${renderConditionCell('Lightly Played', 'en', true, priceCLP * 1.35)}
                ${renderConditionCell('Moderately Played', 'en', true, priceCLP * 1.2)}
                ${renderConditionCell('Heavily Played', 'en', true, priceCLP * 1.05)}
                ${renderConditionCell('Damaged', 'en', true, priceCLP * 0.75)}
            </div>
            
            <!-- Columna 4: Español Foil -->
            <div class="condition-column">
                <h3 class="column-header">Español Foil</h3>
                ${renderConditionCell('Near Mint', 'es', true, priceCLP * 1.2)}
                ${renderConditionCell('Lightly Played', 'es', true, priceCLP * 1.08)}
                ${renderConditionCell('Moderately Played', 'es', true, priceCLP * 0.96)}
                ${renderConditionCell('Heavily Played', 'es', true, priceCLP * 0.84)}
                ${renderConditionCell('Damaged', 'es', true, priceCLP * 0.6)}
            </div>
        </div>
        
        <div class="modal-footer">
            <button class="btn btn-success" onclick="submitQuickEdit()">
                <i class="bi bi-check-circle"></i> SAVE
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function renderConditionCell(condition, lang, foil, price) {
    const conditionShort = {
        'Near Mint': 'NM',
        'Lightly Played': 'LP',
        'Moderately Played': 'MP',
        'Heavily Played': 'HP',
        'Damaged': 'DMG'
    }[condition];
    
    const cellId = `${conditionShort}-${lang}${foil ? '-foil' : ''}`;
    
    return `
        <div class="condition-cell">
            <div class="condition-label">${condition}${foil ? ' Foil' : ''}</div>
            <div class="condition-controls">
                <button class="btn-qty" onclick="changeQuantity('${cellId}', -1)">-1</button>
                <span class="quantity-display" id="qty-${cellId}">0</span>
                <button class="btn-qty" onclick="changeQuantity('${cellId}', 1)">+1</button>
            </div>
            <div class="condition-price">$${Math.round(price).toLocaleString('es-CL')}</div>
        </div>
    `;
}

window.changeQuantity = function(cellId, delta) {
    const qtyElement = document.getElementById(`qty-${cellId}`);
    let currentQty = parseInt(qtyElement.textContent);
    currentQty = Math.max(0, currentQty + delta);
    qtyElement.textContent = currentQty;
    
    // Actualizar total
    updateInventoryTotal();
}

function updateInventoryTotal() {
    const quantities = document.querySelectorAll('.quantity-display');
    let total = 0;
    quantities.forEach(qty => {
        total += parseInt(qty.textContent);
    });
    
    const totalElement = document.querySelector('.inventory-total strong');
    if (totalElement) {
        totalElement.textContent = `${total} carta${total !== 1 ? 's' : ''}`;
    }
}

window.submitQuickEdit = function() {
    alert('Funcionalidad de guardado aún no implementada.\nLos cambios no se guardarán.');
}

function closeQuickEditModal() {
    const modal = document.getElementById('quick-edit-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}
