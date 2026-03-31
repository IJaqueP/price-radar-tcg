/*
    CURRENCY SERVICE
    Obtiene y cachea el tipo de cambio USD → CLP
    Usa la API gratuita exchangerate-api.com (no requiere API key)
*/

const axios = require('axios');
const logger = require('../utils/logger');

let cachedRate = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hora

const FALLBACK_RATE = 950; // Tipo de cambio fallback si la API falla

/**
 * Obtiene el tipo de cambio USD → CLP (con caché de 1 hora)
 * @returns {Promise<number>} Tipo de cambio
 */
async function getUsdToClp() {
    const now = Date.now();

    if (cachedRate && (now - cacheTimestamp) < CACHE_DURATION_MS) {
        return cachedRate;
    }

    try {
        const apiUrl = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest/';
        const response = await axios.get(`${apiUrl}USD`, { timeout: 10000 });

        if (response.data && response.data.rates && response.data.rates.CLP) {
            cachedRate = response.data.rates.CLP;
            cacheTimestamp = now;
            logger.info(`Tipo de cambio actualizado: 1 USD = ${cachedRate} CLP`);
            return cachedRate;
        }

        throw new Error('Respuesta sin rate CLP');
    } catch (error) {
        logger.error('Error obteniendo tipo de cambio USD→CLP:', error.message);

        if (cachedRate) {
            logger.warn(`Usando tipo de cambio cacheado: ${cachedRate}`);
            return cachedRate;
        }

        logger.warn(`Usando tipo de cambio fallback: ${FALLBACK_RATE}`);
        return FALLBACK_RATE;
    }
}

/**
 * Convierte un monto de USD a CLP
 * @param {number} usdAmount - Monto en USD
 * @returns {Promise<number>} Monto en CLP (redondeado)
 */
async function usdToClp(usdAmount) {
    const rate = await getUsdToClp();
    const margin = parseFloat(process.env.EXCHANGE_RATE_MARGIN) || 1;
    return Math.round(usdAmount * rate * margin);
}

module.exports = { getUsdToClp, usdToClp };
