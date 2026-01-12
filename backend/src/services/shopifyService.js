/*
    SHOPIFY SERVICE

    Este servicio maneja toda la comunicación con la API de Shopify.
    Funciones para obtener productos, actualizar precios, etc.
*/

const axios = require('axios');
const { shopifyConfig, validateConfig } = require('../config/shopify');

// ===========================================================
// VALIDAR CONEXIÓN
// ===========================================================

/*
    Verifica que las credenciales de Shopify estén configuradas
    @throws {Error} si las credenciales no son válidas
*/
function ensureConfigured() {
    const validation = validateConfig();

    if (!validation.valid) {
        throw new Error(
            'Shopify no está configurado correctamente:\n' +
            validation.errors.join('\n')
        );
    }
}

// ===========================================================
// OBTENER PRODUCTOS
// ===========================================================

/*
    Obtiene productos de Shopify con paginación

    IMPORTANTE: Shopify devuelve máximo 250 productos por request.
    Si tienes 250+ productos, necesita hacer múltiples request.

    @params {Object} options - Opciones de filtrado
    @params {number} options.limit - Productos por página (máx 250)
    @params {string} options.status - Estado (active, draft, archived)
    @params {string} options.product_type - Tipo de producto
    @params {string} options.vendor - Fabricante
    @params {string} options.sinceId - ID del último producto (para paginación)
    @returns {Promise<Array} Array de productos
*/
async function getProducts(options = {}) {
    ensureConfigured();

    // Opciones por defecto
    const {
        limit = 250,
        status = 'active',
        product_type = null,
        vendor = null,
        sinceId = null
    } = options;

    // Construir query params
    const params = new URLSearchParams(
        {
            limit: limit.toString(),
            status
        }
    );

    if (product_type) params.append('product_type', product_type);
    if (vendor) params.append('vendor', vendor);
    if (sinceId) params.append('since_id', sinceId);

    // URL completa
    const url = `${shopifyConfig.apiUrl}/products.json?${params.toString()}`;

    try {
        console.log(`📡 Consultando Shopify: ${url}`);

        const response = await axios.get(url, {
            headers: shopifyConfig.headers,
            timeout: 30000 // 30 segundos timeout
        });

        console.log(`🆗 Obtenidos: ${response.data.products.length} productos de Shopify`);

        return response.data.products;

    } catch (error) {
        console.error('❌ Error al obtener productos de Shopify:', error.message);

        if (error.response) {
            // Error de la API (401, 403, 404, etc)
            throw new Error(
                `Shopify API error ${error.response.status}: ${error.response.data.errors || error.message}`
            );
        } else if (error.request) {
            // Error de red (sin respuesta)
            throw new Error('No se pudo conectar con Shopify. Verifica tu conexión a internet.')
        } else {
            // Cualquier otro error
            throw error;
        }
    }
}

/*
    Obtiene TODOS los productos usando paginación automática

    @params {Object} filters - Filtros (product_type, vendor, etc)
    @returns {Promise<Array>} Todos los productos
*/

async function getAllProducts(filters = {}) {
    ensureConfigured();

    let allProducts = [];
    let lastId = null;
    let hasMore = true;
    let pageCount = 0;

    console.log('📦 Iniciando obtención de todos los productos de Shopify...');

    while (hasMore) {
        pageCount++;
        console.log(`🗒️ Obteniendo página ${pageCount}...`);

        const products = await getProducts(
            {
                ...filters,
                limit: 250,
                sinceId: lastId
            }
        );

        if (products.length === 0) {
            hasMore = false;
        } else {
            allProducts = allProducts.concat(products);
            lastId = products[products.length - 1].id;

            // Si obtuvimos menos de 250, es la última página
            if (products.length < 250) {
                hasMore = false;
            }

            // Pausa de 500ms entre requests (rate limiting de Shopify)
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log(`🆗 Total de productos obtenidos: ${allProducts.length}`);

    return allProducts;
}

/*
    Obtiene un producto específico por ID

    @params {number} productId - ID del producto
    @returns {Promise<Object>} Producto
*/
async function getProductById(productId) {
    ensureConfigured();

    const url = `${shopifyConfig.apiUrl}/products/${productId}.json`;

    try {
        const response = await axios.get(url, {
            headers: shopifyConfig.headers
        });

        return response.data.product;

    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new Error(`Producto ${productId} no encontrado en Shopify`);
        }
        throw Error;
    }
}

// ===========================================================
// ACTUALIZA PRECIO
// ===========================================================

/*
    Actualiza el precio de un producto en Shopify

    @param {number} productId - ID del producto
    @param {number} variantId - ID de la variante
    @param {number} newPrice - Nuevo precio
    @returns {Promise<Object>} Variante actualizada
*/
async function updateProductPrice(productId, variantId, newPrice) {
    ensureConfigured();

    const url = `${shopifyConfig.apiUrl}/variant/${variantId}.json`;

    const data = {
        variant: {
            id: variantId,
            price: newPrice.toString()
        }
    };

    try {
        console.log(`Actualiza precio del producto ${productId} a $${newPrice}`);

        const response = await axios.put(url, data, {
            headers: shopifyConfig.headers
        });

        console.log(`Precio actualizado correctamente`);

        return response.data.variant;

    } catch (error) {
        console.error(`❌ Error al actualizar el precio:`, error.message);
        throw error;
    }
}

// ===========================================================
// CONTAR PRODUCTOS
// ===========================================================

/*
    Obtiene el conteo de productos (más rápido que obtener todos)

    @param {Object} filters - Filtros
    @returns {Promise<number>} Cantidad de productos
*/
async function getProductCount(filters = {}) {
    ensureConfigured();

    const params = new URLSearchParams();
    if (filters.product_type) params.append('product_type', filters.product_type);
    if (filters.vendor) params.append('vendor', filters.vendor);
    if (filters.status) params.append('status', filters.status || 'active');

    const url = `${shopifyConfig.apiUrl}/products/count.json?${params.toString()}`;

    try {
        const response = await axios.get(url, {
            headers: shopifyConfig.headers
        });

        return response.data.count;

    } catch (error) {
        console.error('❌ Error al contar productos:', error.message);
        throw error;
    }
}

// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    getProducts,
    getAllProducts,
    getProductById,
    updateProductPrice,
    getProductCount
};
