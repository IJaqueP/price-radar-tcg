/* ===========================================================
    MTG API SERVICE
    
    Cliente para comunicarse con nuestro backend de MTG
    Obtiene cartas, sets y estadísticas desde el backend
=========================================================== */

import CONFIG from '../config.js';

class MtgApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
    }

    /**
     * Obtiene todos los sets disponibles
     * @param {string} lang - Idioma (en o es)
     * @returns {Promise<Array>}
     */
    async getSets(lang = 'en') {
        try {
            const response = await fetch(`${this.baseUrl}/mtg/sets?lang=${lang}`);
            
            if (!response.ok) {
                throw new Error('Error obteniendo sets');
            }
            
            const data = await response.json();
            return data.data || [];
            
        } catch (error) {
            console.error('Error en getSets:', error);
            throw error;
        }
    }

    /**
     * Obtiene cartas de un set específico
     * @param {Object} filters - Filtros de búsqueda
     * @param {string} filters.set_code - Código del set (requerido)
     * @param {string} filters.lang - Idioma (en o es)
     * @param {string} filters.name - Nombre de la carta (búsqueda)
     * @param {string} filters.rarity - Rareza
     * @param {number} filters.page - Página actual
     * @param {number} filters.limit - Límite por página
     * @returns {Promise<Object>}
     */
    async getCards(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            // Agregar filtros a los parámetros
            if (filters.set_code) params.append('set_code', filters.set_code);
            if (filters.lang) params.append('lang', filters.lang);
            if (filters.name) params.append('name', filters.name);
            if (filters.rarity) params.append('rarity', filters.rarity);
            if (filters.page) params.append('page', filters.page);
            if (filters.limit) params.append('limit', filters.limit);
            
            const response = await fetch(`${this.baseUrl}/mtg/cards?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error('Error obteniendo cartas');
            }
            
            const data = await response.json();
            return data.data || { cards: [], pagination: {} };
            
        } catch (error) {
            console.error('Error en getCards:', error);
            throw error;
        }
    }

    /**
     * Obtiene una carta específica por ID
     * @param {string} scryfallId - ID de Scryfall
     * @param {string} lang - Idioma (en o es)
     * @returns {Promise<Object>}
     */
    async getCard(scryfallId, lang = 'en') {
        try {
            const response = await fetch(`${this.baseUrl}/mtg/cards/${scryfallId}?lang=${lang}`);
            
            if (!response.ok) {
                throw new Error('Error obteniendo carta');
            }
            
            const data = await response.json();
            return data.data || null;
            
        } catch (error) {
            console.error('Error en getCard:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas generales
     * @returns {Promise<Object>}
     */
    async getStats() {
        try {
            const response = await fetch(`${this.baseUrl}/mtg/stats`);
            
            if (!response.ok) {
                throw new Error('Error obteniendo estadísticas');
            }
            
            const data = await response.json();
            return data.data || {};
            
        } catch (error) {
            console.error('Error en getStats:', error);
            throw error;
        }
    }

    /**
     * Filtra cartas por color localmente
     * @param {Array} cards - Array de cartas
     * @param {Array} colors - Array de colores seleccionados ['W', 'U', 'B', 'R', 'G']
     * @returns {Array}
     */
    filterByColors(cards, colors) {
        if (!colors || colors.length === 0) {
            return cards;
        }

        return cards.filter(card => {
            const cardColors = card.colors || [];
            
            // Si la carta es incolora
            if (cardColors.length === 0) {
                return colors.includes('C');
            }
            
            // Verificar si la carta contiene alguno de los colores seleccionados
            return colors.some(color => cardColors.includes(color));
        });
    }
}

// Exportar instancia única
const mtgApi = new MtgApiService();
export default mtgApi;
