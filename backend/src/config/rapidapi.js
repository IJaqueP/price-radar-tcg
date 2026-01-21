/*
    CONFIGURACIÓN DE RAPIDAPI - TCGGO API

    Maneja la conexión con TCGGO API vía RapidAPI para obtener precios de mercado
*/

require('dotenv').config();

// ===========================================================
// CONFIGURACIÓN DE RAPIDAPI
// ===========================================================

const rapidApiConfig = {
    // API Key de RapidAPI
    apiKey: process.env.RAPIDAPI_KEY,

    // Host de la API
    host: process.env.RAPIDAPI_HOST || 'cardmarket-api-tcg.p.rapidapi.com',

    // URL base
    baseUrl: process.env.RAPIDAPI_BASE_URL || 'https://cardmarket-api-tcg.p.rapidapi.com',

    // Headers requeridos
    get headers() {
        return {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': this.host,
            'Content-Type': 'application/json'
        };
    },

    // Timeout (30 segundos)
    timeout: 30000,

    // Configuración de rate limiting
    rateLimit: {
        maxRequestsPerMinute: 50,
        maxRequestsPerDay: 500
    }
};

// ===========================================================
// VALIDACIÓN DE CONFIGURACIÓN
// ===========================================================

/*
    Valida que las credenciales de RapidAPI están configuradas
    @returns {Object} { valid: boolean, errors: string[] }
*/
function validateConfig() {
    const errors = [];

    if (!rapidApiConfig.apiKey) {
        errors.push('RAPIDAPI_KEY no está configurada en .env');
    }

    if (!rapidApiConfig.host) {
        errors.push('RAPIDAPI_HOST no está configurada en .env');
    }

    if (!rapidApiConfig.baseUrl) {
        errors.push('RAPIDAPI_BASE_URL no está configurado en .env');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}


/*
    Verifica si RapidAPI está configurado
    @throws {Error} si las credenciales no son válidas
*/
function ensureConfigured() {
    const validation = validateConfig();

    if (!validation.valid) {
        throw new Error(
            'RapidAPI no está configurado correctamente:\n' +
            validation.errors.join('\n')
        );
    }
}


// ===========================================================
// ENDPOINTS DISPONIBLES
// ===========================================================

const endpoints = {
    // Buscar productos por nombre
    searchProduct: '/search',

    // Obtener precio de producto específico
    getPrice: '/price',

    // Obtener información de set/expansión
    getSet: '/set',

    // Obtener productos de un juego
    getGameProducts: '/game/:game/products'
};


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    rapidApiConfig,
    endpoints,
    validateConfig,
    ensureConfigured
};