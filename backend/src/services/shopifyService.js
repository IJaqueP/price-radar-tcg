/*
    SHOPIFY SERVICE (GRAPHQL)

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
// FUNCIÓN GENÉRICA PARA GRAPHQL QUERIES
// ===========================================================

/*
    Ejecuta una query GraphQL en Shopify
    @param {string} query - Query GraphQL
    @param {Object} variables - Variables para la query
    @returns {Promise<Object>} Respuesta de GraphQL
*/
async function executeGraphQL(query, variables = {}) {
    ensureConfigured();

    try {
        const response = await axios.post(
            shopifyConfig.graphqlUrl,
            {
                query,
                variables
            },
            {
                headers: shopifyConfig.headers,
                timeout: 30000
            }
        );

        // Verificar errores de GraphQL
        if (response.data.errors) {
            throw new Error(
                'GraphQL Errors: ' + JSON.stringify(response.data.errors, null, 2)
            );
        }

        return response.data.data;
    
    } catch (error) {
        console.error('❌ Error en GraphQL query:', error.message);

        if (error.response) {
            throw new Error(
                `Shopify GraphQL error ${error.response.status}: ${JSON.stringify(error.response.data)}`
            );
        } else if (error.request) {
            throw new Error('No se pudo contectar con Shopify. Verificar conexión a internet')
        } else {
            throw error;
        }
    } 
}


// ===========================================================
// OBTENER PRODUCTOS
// ===========================================================

/*
    Obtiene productos de Shopify con paginación

    IMPORTANTE: Shopify devuelve máximo 250 productos por request.
    Si tienes 250+ productos, necesita hacer múltiples request.

    @param {Object} options - Opciones de filtrado
    @param {number} options.first - Cantidad de productos (máx 250)
    @param {string} options.after - Cursor para paginación
    @param {string} options.query - Query de búsqueda (opcional)
    @returns {Promise<Object>} Productos y pageInfo
*/
async function getProducts(options = {}) {
    const { first = 250, after = null, query = null } = options;

    // Query GraphQL
    const graphqlQuery = `
        query getProducts($first: Int!, $after: String, $query: String) {
            products(first: $first, after: $after, query: $query) {
                edges {
                    node {
                        id
                        legacyResourceId
                        title
                        vendor
                        productType
                        tags
                        status
                        createdAt
                        updatedAt

                        variants(first: 10) {
                            edges {
                                node {
                                    id
                                    legacyResourceId
                                    sku
                                    price
                                    compareAtPrice
                                    inventoryQuantity
                                    barcode
                                }
                            }
                        }
                    }
                    cursor
                }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
    `;

    const variables = {
        first,
        after,
        query
    };

    console.log(`📡 Consultando Shopify GraphQL: ${first} productos${after ? ' (página siguiente)' : ''}`);

    const data = await executeGraphQL(graphqlQuery, variables);

    console.log(`🆗 Obtenidos ${data.products.edges.length} productos`);

    return {
        products: data.products.edges.map(edge => formatProduct(edge.node)),
        pageInfo: data.products.pageInfo
    };
}


/*
    Obtiene TODOS los productos usando paginación cursor-based
    @param {Object} options - Opciones de filtrado
    @returns {Promise<Array>} Todos los productos
*/
async function getAllProducts(options = {}) {
    ensureConfigured();

    let allProducts = [];
    let hasNextPage = true;
    let cursor = null;
    let pageCount = 0;

    console.log('📦 Iniciando obtención de todos los productos con GraphQL');

    while (hasNextPage) {
        pageCount++;
        console.log(`🗒️ Obteniendo página ${pageCount}`);

        const result = await getProducts(
            {
                first: 250,
                after: cursor,
                query: options.query || null
            }
        );

        allProducts = allProducts.concat(result.products);

        hasNextPage = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;

        // Pausa de 500mx entre requests (rate limitng)
        if (hasNextPage) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log(`🆗 Total de productos obtenidos: ${allProducts.length}`);

    return allProducts;
}

/*
    Obtiene un producto específico por ID
    @param {string} productId - ID de GraphQL (gid://shopify/Product/123) o legacy ID
    @returns {Promise<Object>} Producto
*/  
async function getProductById(productId) {
    ensureConfigured();

    // Convertir legacy ID a GraphQL si es necesario
    const gid = productId.includes('gid://')
    ? productId
    : `gid://shopify/Product/${productId}`;

    const query = `
        query getProduct($id: ID!) {
            product(id: $id) {
            id
            legacyResourceId
            title
            vendor
            productType
            tags
            status
            createdAt
            updatedAt

            variants(first: 10) {
                edges {
                    node {
                        id
                        legacyResourceId
                        sku
                        price
                        compareAtPrice
                        inventoryQuantity
                        barcode
                    }
                }
            }
            }
        }
    `;

    const data = await executeGraphQL(query, { id: gid });

    if (!data.product) {
        throw new Error(`Producto ${productId} no encontrado`);
    }

    return formatProduct(data.product);
}


// ===========================================================
// ACTUALIZA PRECIO (MUTATION)
// ===========================================================

/*
    Actualiza el precio de un producto usando GraphQL Mutation

    @param {string} variantId - ID de la variante (gis o legacy)
    @param {number} newPrice - Nuevo precio
    @returns {Promise<Object>} Variante actualizada
*/
async function updateProductPrice(variantId, newPrice) {
    ensureConfigured();

    // Convertir legacy ID a GraphQL si es necesario
    const gid = variantId.includes('gid://')
    ? variantId
    : `gid://shopify/ProductVariant/${variantId}`;

    const mutation = `
        mutation updateVariantPrice($input: ProductVariantInput!) {
            productVariantUpdate(input: $input) {
                productVariant {
                    id
                    legacyResourceId
                    price
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
            id: gid,
            price: newPrice.toString()
        }
    };

    console.log(`💸 Actualizando precio de variante ${variantId} a ${newPrice}`);

    const data = await executeGraphQL(mutation, variables);

    if (data.productVariantUpdate.userErrors.length > 0) {
        throw new Error(
            'Errores al actualizar precio: ' +
            JSON.stringify(data.productVariantUpdate.userErrors)
        );
    }

    console.log(`🆗 Precio actualizado correctamente`);

    return data.productVariantUpdate.productVariant;
}

// ===========================================================
// CONTAR PRODUCTOS
// ===========================================================

/*
    Obtiene el conteo de productos (más rápido que obtener todos)

    @returns {Promise<number>} Cantidad de productos
*/
async function getProductCount() {
    ensureConfigured();

    const query = `
        query {
            productsCount {
                count
            }
        }
    `;

    const data = await executeGraphQL(query);

    return data.productsCount.count;
}


// ===========================================================
// FUNCIONES AUXILIARES
// ===========================================================
/*
    Formatea un producto de GraphQL a formato consistente
*/
function formatProduct(graphqlProduct) {
    // Extraer primera variante (mayoría de sellados tienen solo 1)
    const firstVariant = graphqlProduct.variants.edges[0]?.node || {};

    return {
        id: graphqlProduct.legacyResourceId, // ID numérico (compatible con código anterior)
        gid: graphqlProduct.id, // ID de GraphQL
        title: graphqlProduct.title,
        vendor: graphqlProduct.vendor,
        product_type: graphqlProduct.productType,
        tags: graphqlProduct.tags.join(', '), // GraphQL devuelve array, convertir a string
        status: graphqlProduct.status.toLowerCase(),
        created_at: graphqlProduct.createdAt,
        updated_at: graphqlProduct.updatedAt,

        variants: [
            {
                id: firstVariant.legacyResourceId,
                gid: firstVariant.id,
                sku: firstVariant.sku,
                price: firstVariant.price,
                compare_at_price: firstVariant.compareAtPrice,
                inventory_quantity: firstVariant.inventoryQuantity,
                barcode: firstVariant.barcode
            }
        ]
    };
}




// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    executeGraphQL,
    getProducts,
    getAllProducts,
    getProductById,
    updateProductPrice,
    getProductCount
};
