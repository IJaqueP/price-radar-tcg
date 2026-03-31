/* ===========================================================
    API CLIENT - PRICE RADAR TCG
==============================================================

    Cliente HTTP para comunicación con el backend.
    Maneja todas las peticiones REST al servidor.

=========================================================== */

import CONFIG from '../config.js';

// ===========================================================
// CLASE DE ERROR PERSONALIZADA
// ===========================================================

/**
 * Error personalizado para peticiones API
 */
class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// ===========================================================
// CLIENTE API
// ===========================================================

class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.defaultTimeoutMs = 30000;
    }

    /**
     * Método genérico para hacer requests
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const { timeoutMs = this.defaultTimeoutMs, ...requestOptions } = options;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        console.log(`%c[API] ${requestOptions.method || 'GET'} ${url}`, 'color: blue; font-weight: bold');
        
        const config = {
            mode: 'cors',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...requestOptions.headers
            },
            ...requestOptions
        };

        try {
            const response = await fetch(url, config);
            
            console.log(`%c[API] Response ${response.status}`, response.ok ? 'color: green' : 'color: red');
            
            let data = null;
            const contentType = response.headers.get('content-type') || '';

            if (response.status !== 204) {
                if (contentType.includes('application/json')) {
                    try {
                        data = await response.json();
                    } catch (e) {
                        console.error('[API] Error al parsear JSON:', e);
                        throw new ApiError('Error al parsear respuesta del servidor', response.status, null);
                    }
                } else {
                    const textResponse = await response.text();
                    data = textResponse ? { message: textResponse } : null;
                }
            }

            if (!response.ok) {
                throw new ApiError(
                    data?.error || data?.message || 'Error en la petición',
                    response.status,
                    data
                );
            }

            return data;

        } catch (error) {
            console.error('%c[API] ERROR:', 'color: red; font-weight: bold', error);
            
            if (error instanceof ApiError) {
                throw error;
            }

            if (error?.name === 'AbortError') {
                throw new ApiError(
                    `Tiempo de espera agotado (${Math.round(timeoutMs / 1000)}s). Verifica conexión o estado del backend.`,
                    408,
                    null
                );
            }

            throw new ApiError(
                `No se puede conectar al servidor en ${this.baseUrl}. Verifica que el backend esté corriendo.`,
                0,
                null
            );
        } finally {
            clearTimeout(timeoutId);
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
 * Shopify - Obtener estudísticas
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
