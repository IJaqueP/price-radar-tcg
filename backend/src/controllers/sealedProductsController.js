/*
    SEALED PRODUCTS CONTROLLER
    
    Controlador para gestión de productos sellados por juego
    Reemplaza a binderPOS para visualización de inventario
*/

const { Op } = require('sequelize');
const ShopifyProduct = require('../models/ShopifyProduct');
const shopifyService = require('../services/shopifyService');
const logger = require('../utils/logger');

// Mapeo de juegos a product_types
const GAME_TO_PRODUCT_TYPE = {
    'magic': 'Sealed Magic the Gathering',
    'pokemon': 'Sealed Pokemon TCG',
    'onepiece': 'Sealed Bandai', // One Piece y Gundam están bajo Bandai
    'gundam': 'Sealed Bandai',
    'riftbound': 'Sealed Riftbound',
    'accessories': ['Deck Box', 'Deck Boxes', 'Card Sleeves', 'Playmat', 'Playmats', 'Dice', 'Album', 'Albums']
};

// ===========================================================
// OBTENER PRODUCTOS SELLADOS POR JUEGO
// ===========================================================

/**
 * GET /api/products/sealed/:game
 * Obtiene productos sellados filtrados por juego
 * 
 * @param {string} game - magic, pokemon, onepiece, gundam, riftbound, accessory
 * @query {string} search - Búsqueda por título
 * @query {number} page - Página actual (default: 1)
 * @query {number} limit - Productos por página (default: 50)
 * @query {string} sort - Campo de ordenamiento (default: title)
 * @query {string} order - asc o desc (default: asc)
 */
async function getSealedProductsByGame(req, res) {
    try {
        const { game } = req.params;
        const { 
            search = '', 
            page = 1, 
            limit = 50,
            sort = 'title',
            order = 'asc'
        } = req.query;

        logger.info(`Obteniendo productos sellados para: ${game}`, { search, page, limit });

        // Validar juego
        if (!GAME_TO_PRODUCT_TYPE[game]) {
            return res.status(400).json({
                success: false,
                error: `Juego inválido: ${game}. Opciones: magic, pokemon, onepiece, gundam, riftbound, accessories`
            });
        }

        // Construir where clause
        const whereClause = {};
        
        // Filtrar por product_type (case-insensitive para evitar desajustes con Shopify)
        const productTypes = GAME_TO_PRODUCT_TYPE[game];
        if (Array.isArray(productTypes)) {
            whereClause[Op.or] = productTypes.map(t => ({ product_type: { [Op.iLike]: t } }));
        } else {
            whereClause.product_type = { [Op.iLike]: productTypes };
        }

        // Si es One Piece o Gundam (ambos bajo Bandai), filtrar por título
        // y combinar con búsqueda si existe
        if (game === 'onepiece') {
            if (search) {
                whereClause.title = { [Op.and]: [
                    { [Op.iLike]: '%one piece%' },
                    { [Op.iLike]: `%${search}%` }
                ]};
            } else {
                whereClause.title = { [Op.iLike]: '%one piece%' };
            }
        } else if (game === 'gundam') {
            if (search) {
                whereClause.title = { [Op.and]: [
                    { [Op.iLike]: '%gundam%' },
                    { [Op.iLike]: `%${search}%` }
                ]};
            } else {
                whereClause.title = { [Op.iLike]: '%gundam%' };
            }
        } else if (search) {
            // Búsqueda por título (solo si no es onepiece/gundam)
            whereClause.title = { [Op.iLike]: `%${search}%` };
        }

        // Solo productos activos
        whereClause.status = 'active';

        // Filtrar por stock (opcional, por defecto muestra todos)
        const { inStock } = req.query;
        if (inStock === 'true') {
            whereClause.inventory_quantity = { [Op.gte]: 1 };
        }

        // Paginación
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Consulta con conteo
        const { count, rows: products } = await ShopifyProduct.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset,
            order: [[sort, order.toUpperCase()]],
            attributes: [
                'id',
                'shopify_id',
                'title',
                'shopify_sku',
                'current_price',
                'variant_id',
                'variant_title',
                'inventory_quantity',
                'product_type',
                'vendor',
                'raw_data',
                'last_synced_at'
            ]
        });

        // Formatear productos con imágenes
        const formattedProducts = products.map(product => {
            const productData = product.toJSON();
            
            // Extraer imagen de raw_data
            let imageUrl = null;
            if (productData.raw_data?.images && productData.raw_data.images.length > 0) {
                imageUrl = productData.raw_data.images[0].src || productData.raw_data.images[0].url;
            } else if (productData.raw_data?.image) {
                imageUrl = productData.raw_data.image.src || productData.raw_data.image.url;
            }

            // URL de Shopify (tienda pública)
            const shopifyUrl = productData.raw_data?.onlineStoreUrl || 
                              `https://${process.env.SHOPIFY_STORE_URL}/products/${productData.raw_data?.handle || ''}`;

            return {
                id: productData.id,
                shopify_id: productData.shopify_id,
                title: productData.title,
                sku: productData.shopify_sku,
                price: parseFloat(productData.current_price),
                variant_id: productData.variant_id,
                variant_title: productData.variant_title,
                stock: productData.inventory_quantity,
                product_type: productData.product_type,
                vendor: productData.vendor,
                image_url: imageUrl,
                shopify_url: shopifyUrl,
                last_synced: productData.last_synced_at
            };
        });

        // Calcular páginas totales
        const totalPages = Math.ceil(count / parseInt(limit));

        res.json({
            success: true,
            game,
            products: formattedProducts,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: totalPages,
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        logger.error('Error obteniendo productos sellados:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// ===========================================================
// ACTUALIZAR PRECIO DE PRODUCTO (BD + SHOPIFY)
// ===========================================================

/**
 * PATCH /api/products/:id/price
 * Actualiza el precio de un producto en la BD local y en Shopify
 * 
 * @body {number} new_price - Nuevo precio en CLP
 */
async function updateProductPrice(req, res) {
    try {
        const { id } = req.params;
        const { new_price } = req.body;

        logger.info(`Actualizando precio del producto ${id} a ${new_price}`);

        // Validaciones
        if (!new_price || isNaN(new_price) || new_price <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Precio inválido. Debe ser un número mayor a 0'
            });
        }

        // Buscar producto en BD
        const product = await ShopifyProduct.findByPk(id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        const oldPrice = parseFloat(product.current_price);

        // Actualizar en BD local
        await product.update({
            current_price: new_price,
            last_synced_at: new Date()
        });

        logger.info(`✅ Precio actualizado en BD: ${oldPrice} → ${new_price}`);

        // Actualizar en Shopify
        try {
            await shopifyService.updateProductVariantPrice(
                product.variant_id,
                new_price
            );
            logger.info(`✅ Precio actualizado en Shopify`);
        } catch (shopifyError) {
            logger.error('⚠️  Error actualizando en Shopify:', shopifyError.message);
            // No fallar la request, pero avisar
            return res.json({
                success: true,
                message: 'Precio actualizado en BD, pero falló la sincronización con Shopify',
                product: {
                    id: product.id,
                    title: product.title,
                    old_price: oldPrice,
                    new_price: parseFloat(new_price)
                },
                warning: `Error en Shopify: ${shopifyError.message}`
            });
        }

        res.json({
            success: true,
            message: 'Precio actualizado correctamente en BD y Shopify',
            product: {
                id: product.id,
                title: product.title,
                old_price: oldPrice,
                new_price: parseFloat(new_price)
            }
        });

    } catch (error) {
        logger.error('Error actualizando precio:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    getSealedProductsByGame,
    updateProductPrice
};
