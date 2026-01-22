/* ===========================================================
    VISUAL SPOILER PAGE
    
    Lógica principal del Visual Spoiler de Magic: The Gathering
    Carga sets, muestra cartas, maneja filtros
=========================================================== */

import mtgApi from '../services/mtgApi.js';
import languageManager from '../utils/language.js';

class VisualSpoiler {
    constructor() {
        // Estado de la aplicación
        this.state = {
            sets: [],
            currentSet: null,
            allCards: [],
            filteredCards: [],
            selectedColors: [],
            selectedRarity: '',
            searchQuery: '',
            currentLang: languageManager.getCurrentLanguage()
        };

        // Referencias a elementos del DOM
        this.elements = {
            loader: document.getElementById('global-loader'),
            setSelector: document.getElementById('set-selector'),
            rarityFilter: document.getElementById('rarity-filter'),
            cardSearch: document.getElementById('card-search'),
            colorButtons: document.querySelectorAll('.color-btn'),
            cardsGrid: document.getElementById('cards-grid'),
            emptyState: document.getElementById('empty-state'),
            loadingState: document.getElementById('loading-cards'),
            setName: document.getElementById('set-name'),
            setInfo: document.getElementById('set-info'),
            cardCount: document.getElementById('card-count'),
            spoilerTitle: document.getElementById('spoiler-title'),
            currentLangText: document.getElementById('current-lang'),
            langButtons: document.querySelectorAll('[data-lang]')
        };

        this.init();
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        try {
            this.showLoader();
            
            // Configurar listeners de idioma
            this.setupLanguageListeners();
            
            // Actualizar UI con idioma actual
            this.updateLanguageUI();
            
            // Cargar sets disponibles
            await this.loadSets();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            this.hideLoader();
            
        } catch (error) {
            console.error('Error inicializando Visual Spoiler:', error);
            this.hideLoader();
            this.showError('Error al cargar la aplicación');
        }
    }

    /**
     * Configura listeners de cambio de idioma
     */
    setupLanguageListeners() {
        // Botones de idioma
        this.elements.langButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = btn.dataset.lang;
                this.changeLanguage(lang);
            });
        });

        // Listener para cambios de idioma
        languageManager.onLanguageChange((lang) => {
            this.state.currentLang = lang;
            this.reloadCurrentSet();
        });
    }

    /**
     * Cambia el idioma de la aplicación
     */
    async changeLanguage(lang) {
        this.showLoader();
        languageManager.setLanguage(lang);
        this.updateLanguageUI();
        await this.loadSets();
        this.hideLoader();
    }

    /**
     * Actualiza la UI con el idioma actual
     */
    updateLanguageUI() {
        const langName = languageManager.getLanguageName(this.state.currentLang);
        if (this.elements.currentLangText) {
            this.elements.currentLangText.textContent = langName;
        }
    }

    /**
     * Carga todos los sets disponibles
     */
    async loadSets() {
        try {
            const sets = await mtgApi.getSets(this.state.currentLang);
            this.state.sets = sets;
            this.renderSetSelector();
            
        } catch (error) {
            console.error('Error cargando sets:', error);
            this.showError('Error al cargar las expansiones');
        }
    }

    /**
     * Renderiza el selector de sets
     */
    renderSetSelector() {
        if (!this.elements.setSelector) return;

        this.elements.setSelector.innerHTML = '<option value="">Selecciona una expansión...</option>';

        this.state.sets.forEach(set => {
            const option = document.createElement('option');
            option.value = set.set_code;
            option.textContent = `${set.set_name} (${set.card_count || 0})`;
            option.dataset.setName = set.set_name;
            option.dataset.releaseDate = set.released_at;
            this.elements.setSelector.appendChild(option);
        });
    }

    /**
     * Configura todos los event listeners
     */
    setupEventListeners() {
        // Selector de set
        if (this.elements.setSelector) {
            this.elements.setSelector.addEventListener('change', (e) => {
                this.handleSetChange(e.target.value);
            });
        }

        // Filtro de rareza
        if (this.elements.rarityFilter) {
            this.elements.rarityFilter.addEventListener('change', (e) => {
                this.state.selectedRarity = e.target.value;
                this.applyFilters();
            });
        }

        // Búsqueda
        if (this.elements.cardSearch) {
            this.elements.cardSearch.addEventListener('input', (e) => {
                this.state.searchQuery = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Botones de color
        this.elements.colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleColorToggle(btn);
            });
        });
    }

    /**
     * Maneja el cambio de set
     */
    async handleSetChange(setCode) {
        if (!setCode) {
            this.clearCards();
            return;
        }

        try {
            this.showLoadingCards();
            
            // Obtener información del set seleccionado
            const selectedOption = this.elements.setSelector.selectedOptions[0];
            this.state.currentSet = {
                code: setCode,
                name: selectedOption.dataset.setName,
                releaseDate: selectedOption.dataset.releaseDate
            };

            // Actualizar título
            this.updateSetHeader();

            // Cargar cartas del set
            const result = await mtgApi.getCards({
                set_code: setCode,
                lang: this.state.currentLang,
                limit: 500 // Cargar todas las cartas del set
            });

            this.state.allCards = result.cards || [];
            this.state.filteredCards = [...this.state.allCards];

            // Renderizar cartas
            this.renderCards();
            
        } catch (error) {
            console.error('Error cargando cartas:', error);
            this.showError('Error al cargar las cartas del set');
            this.hideLoadingCards();
        }
    }

    /**
     * Recarga el set actual (útil para cambio de idioma)
     */
    async reloadCurrentSet() {
        if (this.state.currentSet) {
            await this.handleSetChange(this.state.currentSet.code);
        }
    }

    /**
     * Actualiza el header con información del set
     */
    updateSetHeader() {
        if (this.state.currentSet) {
            if (this.elements.setName) {
                this.elements.setName.textContent = this.state.currentSet.name;
            }
            if (this.elements.setInfo) {
                const releaseDate = new Date(this.state.currentSet.releaseDate).toLocaleDateString();
                this.elements.setInfo.textContent = `Lanzamiento: ${releaseDate}`;
            }
        }
    }

    /**
     * Maneja el toggle de colores
     */
    handleColorToggle(button) {
        const color = button.dataset.color;
        
        if (button.classList.contains('active')) {
            button.classList.remove('active');
            this.state.selectedColors = this.state.selectedColors.filter(c => c !== color);
        } else {
            button.classList.add('active');
            this.state.selectedColors.push(color);
        }

        this.applyFilters();
    }

    /**
     * Aplica todos los filtros a las cartas
     */
    applyFilters() {
        let filtered = [...this.state.allCards];

        // Filtrar por rareza
        if (this.state.selectedRarity) {
            filtered = filtered.filter(card => card.rarity === this.state.selectedRarity);
        }

        // Filtrar por colores
        if (this.state.selectedColors.length > 0) {
            filtered = mtgApi.filterByColors(filtered, this.state.selectedColors);
        }

        // Filtrar por búsqueda
        if (this.state.searchQuery) {
            filtered = filtered.filter(card => 
                card.name.toLowerCase().includes(this.state.searchQuery)
            );
        }

        this.state.filteredCards = filtered;
        this.renderCards();
    }

    /**
     * Renderiza las cartas en el grid
     */
    renderCards() {
        if (!this.elements.cardsGrid) return;

        this.hideLoadingCards();

        // Actualizar contador
        if (this.elements.cardCount) {
            this.elements.cardCount.textContent = this.state.filteredCards.length;
        }

        // Si no hay cartas, mostrar empty state
        if (this.state.filteredCards.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        // Renderizar cartas
        this.elements.cardsGrid.innerHTML = '';

        this.state.filteredCards.forEach(card => {
            const cardElement = this.createCardElement(card);
            this.elements.cardsGrid.appendChild(cardElement);
        });
    }

    /**
     * Crea el elemento HTML de una carta
     */
    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        cardDiv.dataset.scryfallId = card.scryfall_id;

        // Obtener URL de imagen
        const imageUrl = this.getCardImageUrl(card);

        cardDiv.innerHTML = `
            <div class="card-image-wrapper">
                <span class="rarity-indicator rarity-${card.rarity}"></span>
                <img 
                    src="${imageUrl}" 
                    alt="${card.name}"
                    class="card-image"
                    loading="lazy"
                    onerror="this.src='assets/card-placeholder.svg'"
                >
            </div>
        `;

        // Click para mostrar modal con detalles
        cardDiv.addEventListener('click', () => {
            this.showCardModal(card);
        });

        return cardDiv;
    }

    /**
     * Obtiene la URL de la imagen de la carta
     */
    getCardImageUrl(card) {
        if (card.image_uris && card.image_uris.normal) {
            return card.image_uris.normal;
        }

        // Si es una carta de doble cara
        if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
            return card.card_faces[0].image_uris.normal;
        }

        return 'assets/card-placeholder.svg';
    }

    /**
     * Muestra el modal con detalles de la carta
     */
    showCardModal(card) {
        const modal = new bootstrap.Modal(document.getElementById('cardModal'));
        
        // Llenar información del modal
        document.getElementById('modal-card-name').textContent = card.name;
        document.getElementById('modal-card-image').src = this.getCardImageUrl(card);
        document.getElementById('modal-mana-cost').textContent = card.mana_cost || '-';
        document.getElementById('modal-type').textContent = card.type_line || '-';
        document.getElementById('modal-rarity').textContent = card.rarity || '-';
        document.getElementById('modal-set').textContent = card.set_name || '-';
        document.getElementById('modal-number').textContent = card.collector_number || '-';
        document.getElementById('modal-oracle-text').textContent = card.oracle_text || '-';
        document.getElementById('modal-flavor-text').textContent = card.flavor_text || '';
        document.getElementById('modal-artist').textContent = card.artist || '-';

        modal.show();
    }

    /**
     * Limpia las cartas mostradas
     */
    clearCards() {
        this.state.allCards = [];
        this.state.filteredCards = [];
        this.state.currentSet = null;
        
        if (this.elements.cardsGrid) {
            this.elements.cardsGrid.innerHTML = '';
        }
        
        if (this.elements.setName) {
            this.elements.setName.textContent = 'Cargando sets...';
        }
        
        if (this.elements.setInfo) {
            this.elements.setInfo.textContent = 'Selecciona una expansión para ver las cartas';
        }
        
        if (this.elements.cardCount) {
            this.elements.cardCount.textContent = '0';
        }
    }

    /**
     * Muestra el loader global
     */
    showLoader() {
        if (this.elements.loader) {
            this.elements.loader.style.display = 'flex';
        }
    }

    /**
     * Oculta el loader global
     */
    hideLoader() {
        if (this.elements.loader) {
            this.elements.loader.style.display = 'none';
        }
    }

    /**
     * Muestra el estado de carga de cartas
     */
    showLoadingCards() {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = 'flex';
        }
        if (this.elements.cardsGrid) {
            this.elements.cardsGrid.style.display = 'none';
        }
        this.hideEmptyState();
    }

    /**
     * Oculta el estado de carga de cartas
     */
    hideLoadingCards() {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = 'none';
        }
        if (this.elements.cardsGrid) {
            this.elements.cardsGrid.style.display = 'grid';
        }
    }

    /**
     * Muestra el empty state
     */
    showEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'block';
        }
        if (this.elements.cardsGrid) {
            this.elements.cardsGrid.style.display = 'none';
        }
    }

    /**
     * Oculta el empty state
     */
    hideEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }
    }

    /**
     * Muestra un mensaje de error
     */
    showError(message) {
        console.error(message);
        alert(message); // Puedes reemplazar esto con un toast más elegante
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new VisualSpoiler();
});
