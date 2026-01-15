/* ===========================================================
    API CLIENT - PRICE RADAR TCG
==============================================================

    Cliente HTTP para comunicación con el backend.
    Maneja todas las peticiones REST al servidor.


=========================================================== */

import CONFIG from '../config.js';

// ===========================================================
// CLIENTE API
// ===========================================================

class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Método genérico para hacer requests
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new ApiError(
                    data.error || data.message || 'Error en la petición',
                    response.status,
                    data
                );
            }

            return data;

        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            // Error de red u otro error
            throw new ApiError(
                error.message || 'Error de conexión con el servidor',
                0,
                null
            );
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request(url, {
            method: 'GET'
        });
    }

    /**
     * POST request
     */
    async post(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    /**
     * PATCH request
     */
    async patch(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// ===========================================================
// INSTANCIA DEL CLIENTE
// ===========================================================

const api = new ApiClient(CONFIG.API_BASE_URL);

// ===========================================================
// MÉTODOS ESPECÍFICOS DE LA API
// ===========================================================

/**
 * Productos - Obtener productos con alertas
 */
api.getProductAlerts = (filters = {}) => {
    return api.get('/products/alerts', filters);
};

/**
 * Productos - Listar todos los productos
 */
api.listProducts = (filters = {}) => {
    return api.get('/products/list', filters);
};

/**
 * Productos - Obtener detalle de un producto
 */
api.getProductDetail = (productId) => {
    return api.get(`/products/${productId}`);
};

/**
 * Productos - Actualizar precio de un producto
 */
api.updateProductPrice = (productId, newPrice) => {
    return api.patch(`/products/${productId}/price`, { new_price: newPrice });
};

/**
 * Productos - Comparar precio de un producto
 */
api.compareProductPrice = (productId) => {
    return api.post(`/products/${productId}/compare`);
};

/**
 * Shopify - Obtener estadísticas
 */
api.getShopifyStats = () => {
    return api.get('/shopify/stats');
};

/**
 * Shopify - Sincronización inicial
 */
api.syncInitial = () => {
    return api.post('/shopify/sync/initial');
};

/**
 * Shopify - Sincronización con base de datos
 */
api.syncInitialWithDB = () => {
    return api.post('/shopify/sync/initial-db');
};

// ===========================================================
// EXPORTAR
// ===========================================================

export { ApiError };
export default api;