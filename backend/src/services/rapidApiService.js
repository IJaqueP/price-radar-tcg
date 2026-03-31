/*
    RAPIDAPI SERVICE
    Maneja comunicación con RapidAPI (CardMarket via RapidAPI)
*/

const axios = require('axios');
require('dotenv').config();

class RapidApiService {
    constructor() {
        this.apiKey = process.env.RAPIDAPI_KEY;
        this.apiHost = process.env.RAPIDAPI_HOST;
        this.baseUrl = process.env.RAPIDAPI_BASE_URL;
        
        // Configuración de rate limiting (según plan de RapidAPI)
        this.requestDelay = 100; // 100ms entre requests
        this.maxRetries = 3;
    }

    /**
     * Buscar producto en RapidAPI por nombre
     * @param {string} productName - Nombre del producto a buscar
     * @param {string} game - Juego (magic, pokemon, etc)
     * @returns {Promise<Array>} - Resultados de búsqueda
     */
    async searchProduct(productName, game = 'magic') {
        try {
            console.log(`🔍 Buscando en RapidAPI: "${productName}" (${game})`);

            const response = await axios.get(`${this.baseUrl}/search`, {
                params: {
                    name: productName,
                    game: game
                },
                headers: {
                    'X-RapidAPI-Key': this.apiKey,
                    'X-RapidAPI-Host': this.apiHost
                },
                timeout: 10000
            });

            if (response.data && response.data.products) {
                console.log(`   ✅ Encontrados ${response.data.products.length} resultados`);
                return response.data.products;
            }

            console.log(`   ⚠️ No se encontraron productos`);
            return [];

        } catch (error) {
            console.error(`   ❌ Error buscando en RapidAPI:`, error.message);
            
            if (error.response?.status === 429) {
                console.log(`   ⏸️ Rate limit alcanzado, esperando...`);
                await this.sleep(2000);
            }
            
            throw error;
        }
    }

    /**
     * Obtener precio de producto por SKU
     * @param {string} sku - SKU del producto
     * @returns {Promise<Object>} - Información de precio
     */
    async getProductPrice(sku) {
        try {
            console.log(`💰 Obteniendo precio para SKU: ${sku}`);

            const response = await axios.get(`${this.baseUrl}/price`, {
                params: { sku: sku },
                headers: {
                    'X-RapidAPI-Key': this.apiKey,
                    'X-RapidAPI-Host': this.apiHost
                },
                timeout: 10000
            });

            if (response.data) {
                console.log(`   ✅ Precio obtenido: ${response.data.price}`);
                return response.data;
            }

            return null;

        } catch (error) {
            console.error(`   ❌ Error obteniendo precio:`, error.message);
            throw error;
        }
    }

    /**
     * Matching de producto con lógica fuzzy
     * @param {string} shopifyName - Nombre del producto en Shopify
     * @param {Array} rapidApiResults - Resultados de RapidAPI
     * @returns {Object} - Mejor match encontrado
     */
    findBestMatch(shopifyName, rapidApiResults) {
        if (!rapidApiResults || rapidApiResults.length === 0) {
            return { match: null, score: 0, method: 'not_found' };
        }

        // Normalizar nombre de Shopify
        const normalizedShopify = this.normalizeProductName(shopifyName);

        let bestMatch = null;
        let bestScore = 0;
        let matchMethod = 'fuzzy';

        for (const product of rapidApiResults) {
            const normalizedApi = this.normalizeProductName(product.name);
            
            // Exact match
            if (normalizedApi === normalizedShopify) {
                return { 
                    match: product, 
                    score: 100, 
                    method: 'exact' 
                };
            }

            // Fuzzy match (similarity score)
            const score = this.calculateSimilarity(normalizedShopify, normalizedApi);
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = product;
            }
        }

        // Solo aceptar matches con score > 80%
        if (bestScore >= 80) {
            return { match: bestMatch, score: bestScore, method: matchMethod };
        }

        return { match: null, score: 0, method: 'not_found' };
    }

    /**
     * Normalizar nombre de producto para comparación
     */
    normalizeProductName(name) {
        return name
            .toLowerCase()
            .replace(/\[.*?\]/g, '') // Quitar [set]
            .replace(/[^a-z0-9\s]/g, '') // Solo letras y números
            .replace(/\s+/g, ' ') // Espacios múltiples
            .trim();
    }

    /**
     * Calcular similaridad entre dos strings (0-100)
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 100;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return ((longer.length - editDistance) / longer.length) * 100;
    }

    /**
     * Levenshtein distance algorithm
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Sleep/delay utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new RapidApiService();