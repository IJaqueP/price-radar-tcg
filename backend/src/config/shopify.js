/*
    CONFIGURACIÓN DE SHOPIFY

    Este archivo maneja la configuración y validación de credenciales de Shopify.
    Lee las variables de entorno y las expone de forma estructurada.
*/

// Cargar variables de entorno
require('dotenv').config();

// ===========================================================
// CONFIGURACIÓN DE SHOPIFY
// ===========================================================

const shopifyConfig = {
    // URL de la tienda (sin http://)
    // Ejemplo: "oasis-games.myshopify.com"
    storeUrl: process.env.SHOPIFY_STORE_URL,

    // Access Token (empieza con shpat_)
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,

    // Versión de la API a usar
    // Shopify actualiza su API cada 3 meses
    // Formato: "YYYY-MM (ejemplo: "2024-01)"
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',

    // URL de GraphQL Admin Api
    get graphqlUrl() {
        if (!this.storeUrl) {
            return null;
        }
        return `https://${this.storeUrl}/admin/api/${this.apiVersion}/graphql.json`;
    },

    // Headers para GraphQL
    get headers() {
        return {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.accessToken
        };
    }
};

    
// ===========================================================
// VALIDACIÓN DE CONFIGURACIÓN
// ===========================================================

/*
    Valida que todas las credenciales estén configuradas
    @returns {Object} { valid: boolean, errors: string[] }
*/
function validateConfig() {
    const errors = [];

    if (!shopifyConfig.storeUrl) {
        errors.push('SHOPIFY_STORE_URL no está configurada en .env');
    }

    if (!shopifyConfig.accessToken) {
        errors.push('SHOPIFY_ACCESS_TOKEN no está configurada en .env');
    } else if (!shopifyConfig.accessToken.startsWith('shpat_')) {
        errors.push('SHOPIFY_ACCESS_TOKEN no es válido (debe empezar con shpat_)');
    }

    if (!shopifyConfig.apiVersion) {
        errors.push('SHOPIFY_API_VERSION no está configurado');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    shopifyConfig,
    validateConfig
};