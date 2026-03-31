/*
    SHOPIFY SERVICE (GRAPHQL)

    Este servicio maneja toda la comunicación con la API de Shopify.
    Funciones para obtener productos, actualizar precios, etc.
*/

const axios = require('axios');
require('dotenv').config();

class ShopifyService {
    constructor() {
        this.storeUrl = process.env.SHOPIFY_STORE_URL;
        this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        this.apiVersion = process.env.SHOPIFY_API_VERSION;
        this.baseUrl = `https://${this.storeUrl}/admin/api/${this.apiVersion}`;

        // Configuración de rate limiting
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo
    }

    /**
     * Realiza una consulta GraphQL a Shopify
     * @param {string} query - Query GraphQl
     * @param {object} variables - Variables para la query
     * @returns {Promise<Object>} - Respuesta de Shopify
     */

    async graphqlQuery(query, variables = {}) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/graphql.json`,
                {
                    query,
                    variables
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': this.accessToken
                    }
                }
            );

            // Verificar errores de GraphQL
            if (response.data.errors) {
                console.error('GraphQL Errors:', response.data.errors);
                throw new Error(JSON.stringify(response.data.errors));
            }

            // Verificar rate limiting
            if (response.data.extensions?.cost) {
                const { currentlyAvailable, maximumAvailable } = response.data.extensions.cost.throttleStatus;
                console.log(`Rate Limit: ${currentlyAvailable}/${maximumAvailable}`);

                // Si queda menos del 10%, esperar un segundo
                if (currentlyAvailable < maximumAvailable * 0.1) {
                    console.log('Rate limit bajo, esperando 1 segundo...');
                    await this.sleep(1000);
                }
            }

            return response.data.data;

        } catch (error) {
            console.error('Error en GraphQL query:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene TODOS los productos de Shopify con paginación
     * @returns {Promise<Array>} - Array de productos
     */

    async getAllProducts() {
        console.log('🛜 Iniciando obtención de productos de Shopify');

        let allProducts = [];
        let hasNextPage = true;
        let cursor = null;
        let pageCount = 0;

        const query = `
            query GetProducts($cursor: String) {
                products(first: 250, after: $cursor) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    edges {
                        cursor
                        node {
                            id
                            title
                            handle
                            status
                            productType
                            vendor
                            createdAt
                            updatedAt
                            images(first: 1) {
                                edges {
                                    node {
                                        url
                                        altText
                                    }
                                }
                            }
                            collections(first: 10) {
                                edges {
                                    node {
                                        id
                                        title
                                        handle
                                    }
                                }
                            }
                            variants(first: 100) {
                                edges {
                                    node {
                                        id
                                        title
                                        sku
                                        barcode
                                        price
                                        inventoryQuantity
                                        availableForSale
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        try {
            while (hasNextPage) {
                pageCount++;
                console.log(`🗒️ Obteniendo página ${pageCount}`);

                const data = await this.graphqlQuery(query, { cursor });

                const products = data.products.edges;
                allProducts = allProducts.concat(products);

                hasNextPage = data.products.pageInfo.hasNextPage;
                cursor = data.products.pageInfo.endCursor;

                console.log(`   🆗 ${products.length} productos obtenidos (Total: ${allProducts.length})`);

                // Pequeño delay entre páginas para ser respetuosos con la API
                if (hasNextPage) {
                    await this.sleep(200);
                }
            }

            console.log(`\n🆗 COMPLETADO: ${allProducts.length} productos totales desde Shopify`);
            return allProducts;


        } catch (error) {
            console.error('❌ Error obteniendo productos:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene productos de Shopify filtrados por query (product_type, title, etc.)
     * Usa la sintaxis de búsqueda de Shopify: https://shopify.dev/docs/api/usage/search-syntax
     * Ejemplo: getProductsByQuery('product_type:Sealed*')
     * @param {string} shopifyQuery - Filtro de búsqueda
     * @returns {Promise<Array>} - Array de productos raw
     */
    async getProductsByQuery(shopifyQuery) {
        console.log(`🛜 Obteniendo productos de Shopify [query: "${shopifyQuery}"]`);

        let allProducts = [];
        let hasNextPage = true;
        let cursor = null;
        let pageCount = 0;

        const gqlQuery = `
            query GetFilteredProducts($cursor: String, $queryStr: String) {
                products(first: 250, after: $cursor, query: $queryStr) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    edges {
                        node {
                            id
                            title
                            handle
                            status
                            productType
                            vendor
                            createdAt
                            updatedAt
                            images(first: 1) {
                                edges {
                                    node {
                                        url
                                        altText
                                    }
                                }
                            }
                            collections(first: 10) {
                                edges {
                                    node {
                                        id
                                        title
                                        handle
                                    }
                                }
                            }
                            variants(first: 100) {
                                edges {
                                    node {
                                        id
                                        title
                                        sku
                                        barcode
                                        price
                                        inventoryQuantity
                                        availableForSale
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        try {
            while (hasNextPage) {
                pageCount++;
                console.log(`🗒️ Página ${pageCount}`);

                const data = await this.graphqlQuery(gqlQuery, { cursor, queryStr: shopifyQuery });

                const products = data.products.edges;
                allProducts = allProducts.concat(products);

                hasNextPage = data.products.pageInfo.hasNextPage;
                cursor = data.products.pageInfo.endCursor;

                console.log(`   🆗 ${products.length} productos (Total: ${allProducts.length})`);

                if (hasNextPage) {
                    await this.sleep(200);
                }
            }

            console.log(`\n🆗 COMPLETADO: ${allProducts.length} productos con query "${shopifyQuery}"`);
            return allProducts;

        } catch (error) {
            console.error('❌ Error obteniendo productos por query:', error.message);
            throw error;
        }
    }


    /**
     * Transforma datos desde Shopify a formato normalizado
     * @param {Array} shopifyProducts - Productos raw de Shopify
     * @returns {Array} - Productos normalizados
     */

    normalizeProducts(shopifyProducts) {
        console.log('\n🛠️ Normalizando datos de productos');

        const normalized = [];

        for (const edge of shopifyProducts) {
            const product = edge.node;
            
            // Extraer colecciones para luego identificar si es sealed
            const collections = product.collections?.edges?.map(e => e.node.title) || [];

            // Cada producto puede tener múltiples variantes
            for (const variantEdge of product.variants.edges) {
                const variant = variantEdge.node;
                const normalizedSku = (variant.sku && String(variant.sku).trim()) || (variant.barcode && String(variant.barcode).trim()) || null;

                normalized.push(
                    {
                        shopify_id: product.id,
                        title: product.title,
                        // Fallback a barcode para soportar tiendas que no usan SKU explícito.
                        shopify_sku: normalizedSku,
                        current_price: parseFloat(variant.price) || 0,
                        variant_id: variant.id,
                        variant_title: variant.title !== 'Default Title' ? variant.title : null,
                        status: product.status.toLowerCase(),
                        inventory_quantity: variant.inventoryQuantity || 0,
                        product_type: product.productType || null,
                        vendor: product.vendor || null,
                        last_synced_at: new Date(),
                        sku_validated: false,
                        raw_data: {
                            product: product,
                            variant: variant,
                            collections: collections
                        }
                    }
                );
            }
        }

        console.log(`🆗 ${normalized.length} variantes normalizadas`);
        return normalized; 
    }


    /**
     * BÚSQUEDA DE PRODUCTOS POR TÍTULO
     * 
     * Busca un producto por título usando GraphQL query.
     * Retorna detalles COMPLETOS del producto incluyendo:
     * - Status (ACTIVE, DRAFT, ARCHIVED)
     * - Variantes con inventario
     * - Colecciones
     * - Datos raw para análisis
     * 
     * @param {string} searchTitle - Título del producto a buscar
     * @returns {Promise<Object|null>} - Producto encontrado o null si no existe
     * @throws {Error} - Si hay error en la API
     */
    async searchProductByTitle(searchTitle) {
        if (!searchTitle || typeof searchTitle !== 'string') {
            throw new Error('searchTitle debe ser un string no vacío');
        }

        console.log(`\n🔍 Buscando producto: "${searchTitle}"`);

        // Importar helpers de búsqueda para normalizar (incluyendo comillas)
        const { normalizeTitleForSearch } = require('../utils/searchHelpers');
        const normalizedSearch = normalizeTitleForSearch(searchTitle);
        
        console.log(`   📝 Normalizado: "${normalizedSearch}"`);

        // GraphQL query para buscar productos por título
        // Nota: Shopify no tiene búsqueda SQL-like en GraphQL,
        // entonces traemos productos y filtramos en memoria
        const query = `
            query SearchProducts($query: String!) {
                products(first: 250, query: $query) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    edges {
                        node {
                            id
                            title
                            status
                            productType
                            vendor
                            createdAt
                            updatedAt
                            handle
                            description
                            collections(first: 10) {
                                edges {
                                    node {
                                        id
                                        title
                                        handle
                                    }
                                }
                            }
                            variants(first: 100) {
                                edges {
                                    node {
                                        id
                                        title
                                        sku
                                        barcode
                                        price
                                        inventoryQuantity
                                        availableForSale
                                        createdAt
                                        updatedAt
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        try {
            // Usar el parámetro query de Shopify para filtro inicial
            // Shopify busca por coincidencia parcial en el título
            const data = await this.graphqlQuery(query, { query: searchTitle });
            
            if (!data.products.edges || data.products.edges.length === 0) {
                console.log(`   ❌ No se encontraron productos con: "${searchTitle}"`);
                return null;
            }

            console.log(`   ✅ ${data.products.edges.length} producto(s) encontrado(s) por Shopify`);

            // Ahora filtramos por coincidencia normalizada exacta en memoria
            // normalizeTitleForSearch también remueve comillas especiales
            for (const edge of data.products.edges) {
                const product = edge.node;
                const normalizedTitle = normalizeTitleForSearch(product.title);

                console.log(`      - "${product.title}" -> "${normalizedTitle}"`);

                // Comparar títulos normalizados (ignora comillas, acentos, caracteres especiales)
                if (normalizedTitle === normalizedSearch) {
                    console.log(`   ✨ COINCIDENCIA EXACTA ENCONTRADA!`);
                    return product;
                }
            }

            console.log(`   ⚠️  Se encontraron productos pero NO coincidencia exacta`);
            console.log(`   💡 Sugerencia: Tal vez el producto tiene otro nombre o está archivado`);
            
            // Retornar el primero encontrado aunque no sea coincidencia exacta
            // (para debugging, el usuario puede ver qué sí existe)
            return data.products.edges[0].node;

        } catch (error) {
            console.error(`   ❌ Error buscando producto: ${error.message}`);
            throw error;
        }
    }

    /**
     * BÚSQUEDA DE MÚLTIPLES PRODUCTOS
     * 
     * Busca varios productos por títulos en un solo call.
     * Retorna array con resultados (algunos pueden ser null si no se encuentran)
     * 
     * Útil para:
     * - Validar que múltiples productos existan
     * - Debug de varios productos al mismo tiempo
     * - Comparativas
     * 
     * @param {Array<string>} searchTitles - Array de títulos a buscar
     * @returns {Promise<Array<Object>>} - Array de productos encontrados
     * @throws {Error} - Si hay error crítico
     */
    async searchProductsByTitles(searchTitles) {
        if (!Array.isArray(searchTitles)) {
            throw new Error('searchTitles debe ser un array');
        }

        console.log(`\n🔍 Buscando ${searchTitles.length} producto(s)...\n`);

        const results = [];

        for (const title of searchTitles) {
            try {
                const product = await this.searchProductByTitle(title);
                results.push({
                    searchedTitle: title,
                    found: product !== null,
                    product: product
                });
            } catch (error) {
                console.error(`   ❌ Error con "${title}": ${error.message}`);
                results.push({
                    searchedTitle: title,
                    found: false,
                    product: null,
                    error: error.message
                });
            }

            // Pequeño delay entre búsquedas para ser respetuoso con rate limit
            if (searchTitles.indexOf(title) < searchTitles.length - 1) {
                await this.sleep(100);
            }
        }

        return results;
    }

    /**
     * Actualiza el precio de una variante de producto en Shopify
     * @param {string} productId - ID del producto (formato: gid://shopify/Product/123)
     * @param {string} variantId - ID de la variante (formato: gid://shopify/ProductVariant/123)
     * @param {number} newPrice - Nuevo precio en CLP
     * @returns {Promise<Object>} - Variante actualizada
     */
    async updateProductVariantPrice(productId, variantId, newPrice) {
        console.log(`📝 Actualizando precio en Shopify: ${variantId} → $${newPrice}`);

        // Asegurar formato GID
        if (!productId.startsWith('gid://')) {
            productId = `gid://shopify/Product/${productId}`;
        }
        if (!variantId.startsWith('gid://')) {
            variantId = `gid://shopify/ProductVariant/${variantId}`;
        }

        const mutation = `
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                    productVariants {
                        id
                        price
                        title
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            productId: productId,
            variants: [
                {
                    id: variantId,
                    price: newPrice.toString()
                }
            ]
        };

        try {
            const data = await this.graphqlQuery(mutation, variables);

            if (data.productVariantsBulkUpdate.userErrors.length > 0) {
                const errors = data.productVariantsBulkUpdate.userErrors.map(e => e.message).join(', ');
                throw new Error(`Shopify errors: ${errors}`);
            }

            console.log('✅ Precio actualizado en Shopify');
            return data.productVariantsBulkUpdate.productVariants[0];

        } catch (error) {
            console.error(`❌ Error actualizando precio en Shopify: ${error.message}`);
            throw error;
        }
    }

    /**
     * Busca una variante a partir de inventory_item_id (webhook inventory_levels/update)
     * @param {string} inventoryItemId - ID numérico de Inventory Item
     * @returns {Promise<Object|null>} - Datos mínimos de variante/producto o null
     */
    async getVariantByInventoryItemId(inventoryItemId) {
        const gid = `gid://shopify/InventoryItem/${inventoryItemId}`;
        const query = `
            query getInventoryItem($id: ID!) {
                inventoryItem(id: $id) {
                    id
                    sku
                    variant {
                        id
                        title
                        inventoryQuantity
                        product {
                            id
                            title
                            status
                            productType
                            vendor
                        }
                    }
                }
            }
        `;

        try {
            const data = await this.graphqlQuery(query, { id: gid });
            const item = data.inventoryItem;
            if (!item || !item.variant) {
                return null;
            }

            return {
                id: item.variant.id,
                title: item.variant.title,
                inventoryQuantity: item.variant.inventoryQuantity,
                sku: item.sku,
                product: item.variant.product
            };
        } catch (error) {
            console.error(`❌ Error consultando inventory item ${inventoryItemId}: ${error.message}`);
            return null;
        }
    }

    /**
     * Obtiene el inventoryItemId y locationId de una variante desde Shopify
     * Usa inventory levels para obtener la location sin necesitar read_locations scope
     * @param {string} variantId - GID de la variante
     * @returns {Promise<{inventoryItemId: string, locationId: string}>}
     */
    async getVariantInventoryInfo(variantId) {
        if (!variantId.startsWith('gid://')) {
            variantId = `gid://shopify/ProductVariant/${variantId}`;
        }

        const query = `
            query getVariantInventory($id: ID!) {
                productVariant(id: $id) {
                    inventoryItem {
                        id
                        inventoryLevels(first: 1) {
                            edges {
                                node {
                                    location {
                                        id
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const data = await this.graphqlQuery(query, { id: variantId });
        const inventoryItem = data.productVariant?.inventoryItem;
        if (!inventoryItem?.id) {
            throw new Error('No se encontró inventoryItem para la variante');
        }

        const locationId = inventoryItem.inventoryLevels?.edges?.[0]?.node?.location?.id;
        if (!locationId) {
            throw new Error('No se encontró location para la variante. Verifica que tenga inventario asignado.');
        }

        return {
            inventoryItemId: inventoryItem.id,
            locationId
        };
    }

    /**
     * Actualiza el stock (inventory quantity) de una variante en Shopify
     * @param {string} variantId - GID de la variante
     * @param {number} quantity - Nueva cantidad
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async updateVariantStock(variantId, quantity) {
        console.log(`📦 Actualizando stock en Shopify: ${variantId} → ${quantity}`);

        const { inventoryItemId, locationId } = await this.getVariantInventoryInfo(variantId);

        const mutation = `
            mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
                inventorySetOnHandQuantities(input: $input) {
                    inventoryAdjustmentGroup {
                        reason
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            input: {
                reason: "correction",
                setQuantities: [
                    {
                        inventoryItemId,
                        locationId,
                        quantity: parseInt(quantity)
                    }
                ]
            }
        };

        const data = await this.graphqlQuery(mutation, variables);

        if (data.inventorySetOnHandQuantities.userErrors.length > 0) {
            const errors = data.inventorySetOnHandQuantities.userErrors.map(e => e.message).join(', ');
            throw new Error(`Shopify inventory errors: ${errors}`);
        }

        console.log('✅ Stock actualizado en Shopify');
        return data.inventorySetOnHandQuantities;
    }

    /**
     * Utilidad: Sleep/delay
     * @param {number} ms - Milisegundo a esperar
     */

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}


module.exports = new ShopifyService();