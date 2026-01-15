/*
    TCGGO SERVICE (VÍA RAPIDAPI)

    Servicio para obtener precios de mercado desde TCGGO API
    Funciones para buscar productos y obtener precios actualizados
*/

const axios = require('axios');
const { rapidApiConfig, ensureConfigured } = require('../config/rapidapi');
const logger = require('../utils/logger');

// ===========================================================
// RATE LIMITING SIMPLE
// ===========================================================

let requestCount = {
    minute: 0,
    day: 0,
    lastMinuteReset: Date.now(),
    lastDayReset: Date.now()
};

/*
    Verifica y actualiza el rate limit
    @throws {Error} si se excede el límite
*/
function checkRateLimit() {
    const now = Date.now();

    // Reset contador por minuto
    if (now - requestCount.lastMinuteReset > 60000) {
        requestCount.minute = 0;
        requestCount.lastMinuteReset = now;
    }

    // Reset contador por día
    if (now - requestCount.lastDayReset > 86400000) {
        requestCount.day = 0;
        requestCount.lastDayReset = now;
    }

    // Verificar límites
    if (requestCount.minute >= rapidApiConfig.rateLimit.maxRequestsPerMinute) {
        throw new Error('Rate limit excedido: máximo por minuto alcanzado');
    }

    if (requestCount.day >= rapidApiConfig.rateLimit.maxRequestsPerDay) {
        throw new Error('Rate limit excedido: máximo diario alcanzado');
    }

    requestCount.minute++;
    requestCount.day++;
}


// ===========================================================
// FUNCIÓN GENÉRICA PARA REQUESTS
// ===========================================================

/*
    Ejecuta un request a TCGGO API
    @param {string} endpoint - Endpoint relativo
    @param {Object} params - Query parameters
    @returns {Promise<Object>} Respuesta de la API
*/
async function makeRequest(endpoint, params = {}) {
    ensureConfigured();
    checkRateLimit();

    try {
        const url = `${rapidApiConfig.baseUrl}${endpoint}`;

        logger.debug('TCGGO Request:', { url, params });

        const response = await axios.get(url, {
            headers: rapidApiConfig.headers,
            params,
            timeout: rapidApiConfig.timeout
        });

        return response.data;

    } catch (error) {
        console.error('Error en TCGGO API request:', {
            endpoint,
            error: error.message
        });

        if (error.response) {
            throw new Error(
                `TCGGO API error ${error.response.status}: ${JSON.stringify(error.response.data)}`
            );
        } else if (error.request) {
            throw new Error('No se pudo conectar con TCGGO API.');
        } else {
            throw error;
        }
    }
}


// ===========================================================
// BUSCAR PRODUCTO
// ===========================================================

/*
    Busca un producto en TCGGO por nombre
    @param {string} productName - Nombre del producto
    @param {string} game - Juego (magic, pokemon, etc)
    @returns {Promise<Array>} Lista de productos encontrados
*/
async function searchProduct(productName, game = null) {
    logger.info(`Buscando producto en TCGGO: ${productName}`);

    const params = {
        query: productName
    };

    if (game) {
        params.game = game;
    }

    try {
        const results = await makeRequest('/search', params);

        logger.success(`Encontrados ${results.length || 0} productos en TCGGO`);

        return results;

    } catch (error) {
        logger.error('Error buscando producto en TCGGO:', error.message);
        return [];
    }
}


// ===========================================================
// OBTENER PRECIO DE PRODUCTO
// ===========================================================

/*
    Obtiene el precio de un producto específico
    @param {string} tcggoId - ID del producto en TCGGO
    @returns {Promise<Object>} Información de precio
*/
async function getProductPrice(tcggoId) {
    logger.info(`Obteniendo precio de TCGGO: ${tcggoId}`);

    try {
        const priceData = await makeRequest('/price', {
            product_id: tcggoId
        });

        return {
            tcggo_id: tcggoId,
            price_usd: priceData.price_usd || null,
            price_eur: priceData.price_eur || null,
            cardmarket_price: priceData.cardmarket_price || null,
            tcgplayer_price: priceData.tcgplayer_price || null,
            avg_price: calculateAveragePrice(priceData),
            last_updated: new Date()
        };


    } catch (error) {
        logger.error('Error obteniendo precio:', error.message);
        return null;
    }
}


/*
    Obtiene precios de múltiples productos
    @param {Array<string>} tcggoIds - Array de IDs de TCGGO
    @returns {Promise<Array>} Array de precios
*/
async function getBulkPrices(tcggoIds) {
    logger.info(`Obteniendo precios en bulk: ${tcggoIds.length} productos`);

    const prices = [];

    for (const id of tcggoIds) {
        try {
            const price = await getProductPrice(id);
            if (price) {
                prices.push(price);
            }

            // Pausa entre requests (rate limiting)
            await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2s = 50 req/min-max


        } catch (error) {
            logger.warning(`Error obteniendo precio de ${id}:`, error.message);
        }
    }

    return prices;
}


// ===========================================================
// FUNCIONES AUXILIARES
// ===========================================================

/*
    Calcula el precio promedio considerando múltiples fuentes
    @param {Object} priceData - Datos de precio de TCGGO
    @returns {number} Precio promedio en USD
*/
function calculateAveragePrice(priceData) {
    const prices = [];

    if (priceData.cardmarket_price) prices.push(parseFloat(priceData.cardmarket_price));
    if (priceData.tcgplayer_price) prices.push(parseFloat(priceData.tcgplayer_price));
    if (priceData.price_usd) prices.push(parseFloat(priceData.price_usd));

    if (prices.length === 0) return null;

    const sum = prices.reduce((a, b) => a + b, 0);
    return (sum / prices.length).toFixed(2);
}


/*
    Normaliza el nombre de un producto para búsqueda
    @param {string} productName - Nombre original
    @returns {string} Nombre normalizado
*/
function normalizeProductName(productName) {
    return productName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}


// ===========================================================
// ESTADÍSTICAS DE USO
// ===========================================================

/*
    Obtiene estadísticas de uso de la API
    @returns {Object} Estadísticas
*/
function getUsageStats() {
    return {
        requests_this_minute: requestCount.minute,
        requests_today: requestCount.day,
        limit_per_minute: rapidApiConfig.rateLimit.maxRequestsPerMinute,
        limit_per_day: rapidApiConfig.rateLimit.maxRequestsPerDay,
        remaining_minute: rapidApiConfig.rateLimit.maxRequestsPerMinute - requestCount.minute,
        remaining_day: rapidApiConfig.rateLimit.maxRequestsPerDay - requestCount.day
    };
}


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    searchProduct,
    getProductPrice,
    getBulkPrices,
    normalizeProductName,
    getUsageStats
};