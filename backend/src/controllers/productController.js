/*
    PRODUCT CONTROLLER

    Controlador para manejo de productos y alertas de precios
*/

const { Op } = require('sequelize');
const { Product, ProductMapping, PriceComparison, SealedProductMapping, ShopifyProduct } = require('../models');
const priceComparisonService = require('../services/priceComparisonService');
const shopifyService = require('../services/shopifyService');
const { usdToClp } = require('../services/currencyService');
const logger = require('../utils/logger');

// ===========================================================
// OBTENER PRODUCTOS CON ALERTAS
// ===========================================================

/*
    GET /api/products/alerts
    Obtiene productos con alertas de precio
*/
async function getProductAlerts(req, res) {
    try {
        const { game, category, limit = 50, threshold: thresholdParam } = req.query;
        const threshold = thresholdParam !== undefined
            ? parseFloat(thresholdParam)
            : (parseFloat(process.env.PRICE_THRESHOLD_PERCENTAGE) || 3);

        logger.info('Obteniendo productos con alertas', { game, category });

        // Mapear filtro de juego del frontend a valores de reconciliación
        const gameFilterMap = {
            magic: ['magic-the-gathering', 'mtg'],
            pokemon: ['pokemon'],
            onepiece: ['one-piece-card-game'],
            gundam: ['gundam'],
            riftbound: ['riftbound']
        };

        const whereMapping = {};
        if (game && gameFilterMap[game]) {
            whereMapping.game = { [Op.in]: gameFilterMap[game] };
        }

        if (category) {
            whereMapping.product_type = category;
        }

        const mappings = await SealedProductMapping.findAll({
            where: whereMapping,
            include: [
                {
                    model: ShopifyProduct,
                    as: 'shopify_product',
                    required: true,
                    where: {
                        status: 'active',
                        inventory_quantity: { [Op.gt]: 0 }
                    },
                    attributes: [
                        'id',
                        'shopify_id',
                        'title',
                        'shopify_sku',
                        'inventory_quantity',
                        'current_price',
                        'variant_id',
                        'product_type',
                        'vendor',
                        'raw_data'
                    ]
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        const gameOutputMap = {
            'magic-the-gathering': 'magic',
            mtg: 'magic',
            pokemon: 'pokemon',
            'one-piece-card-game': 'onepiece',
            gundam: 'gundam',
            riftbound: 'riftbound'
        };

        // Convertir precios de JustTCG (USD) a CLP
        const formattedProducts = (await Promise.all(
            mappings.map(async (mapping) => {
                const product = mapping.shopify_product;
                const marketPriceUsd = parseFloat(mapping.justtcg_price);
                const shopifyPrice = parseFloat(product.current_price);

                if (!Number.isFinite(marketPriceUsd) || !Number.isFinite(shopifyPrice) || marketPriceUsd === 0) {
                    return null;
                }

                // Convertir precio de mercado de USD a CLP
                const marketPriceClp = await usdToClp(marketPriceUsd);

                // Recalcular diferencia con precios en la misma moneda (CLP)
                const diff = ((shopifyPrice - marketPriceClp) / marketPriceClp) * 100;

                if (!Number.isFinite(diff)) return null;

                const imageUrl = product.raw_data?.images?.[0]?.src ||
                    product.raw_data?.images?.[0]?.url ||
                    product.raw_data?.image?.src ||
                    product.raw_data?.image?.url ||
                    null;

                const shopifyHandle = product.raw_data?.handle || '';
                // Build Shopify admin URL from the product GID (gid://shopify/Product/123456)
                const shopifyNumericId = product.shopify_id ? product.shopify_id.split('/').pop() : '';
                const shopifyAdminUrl = shopifyNumericId
                    ? `https://${process.env.SHOPIFY_STORE_URL || 'mtg-oasis.myshopify.com'}/admin/products/${shopifyNumericId}`
                    : (shopifyHandle ? `https://${process.env.SHOPIFY_STORE_URL || 'mtg-oasis.myshopify.com'}/products/${shopifyHandle}` : '');

                return {
                    id: product.id,
                    title: product.title,
                    sku: product.shopify_sku || 'N/A',
                    game: gameOutputMap[mapping.game] || mapping.game,
                    category: mapping.product_type || product.product_type,
                    image_url: imageUrl,
                    shopify_url: shopifyAdminUrl,
                    variant_id: product.variant_id,
                    stock: product.inventory_quantity != null ? product.inventory_quantity : 0,
                    shopify_price: shopifyPrice,
                    market_price: marketPriceClp,
                    market_price_usd: marketPriceUsd,
                    price_difference: parseFloat(diff.toFixed(1)),
                    price_position: diff > 0 ? 'above_api' : diff < 0 ? 'below_api' : 'equal_api',
                    confidence: parseFloat(mapping.match_confidence),
                    match_method: mapping.match_method,
                    last_comparison: mapping.last_updated || mapping.updatedAt
                };
            })
        ))
            .filter(Boolean)
            .filter(item => Math.abs(item.price_difference) > threshold)
            .sort((a, b) => Math.abs(b.price_difference) - Math.abs(a.price_difference))
            .slice(0, parseInt(limit));

        const stats = {
            total_alerts: formattedProducts.length,
            higher_prices: formattedProducts.filter(p => p.price_difference > 0).length,
            lower_prices: formattedProducts.filter(p => p.price_difference < 0).length,
            avg_difference: formattedProducts.length > 0
                ? (formattedProducts.reduce((sum, p) => sum + Math.abs(p.price_difference), 0) / formattedProducts.length).toFixed(1)
                : '0'
        };

        res.json(
            {
                success: true,
                products: formattedProducts,
                stats,
                count: formattedProducts.length,
                threshold_percentage: threshold,
                source: 'sealed_product_mappings'
            }
        );


    } catch (error) {
        logger.error('Error obteniendo alertas:', error.message);
        res.status(500).json(
            {
                success: false,
                error: error.message
            }
        );
    }
}


// ===========================================================
// LISTAR TODOS LOS PRODUCTOS TCG
// ===========================================================

/*
    GET /api/products/list
    Lista todos los productos TCG
*/
async function listProducts(req, res) {
    try {
        const { game, category, page = 1, limit = 50} = req.query;

        const whereClause = {
            is_tcg: true
        };

        if (game) whereClause.game = game;
        if (category) whereClause.category = category;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: products } = await Product.findAndCountAll(
            {
                where: whereClause,
                limit: parseInt(limit),
                offset,
                order: [['created_at', 'DESC']]
            }
        );

        res.json(
            {
                success: true,
                products,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / parseInt(limit))
                }
            }
        );
    

    } catch (error) {
        logger.error('Error listando productos:', error.message);
        res.status(500).json(
            {
                success: false,
                error: error.message
            }
        );
    }
}


// ===========================================================
// OBTENER DETALLE DE PRODUCTO
// ===========================================================

/*
    GET /api/products/:id
    Obtiene detalle completo de un producto
*/
async function getProductDetail(req, res) {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id, {
            include: [
                {
                    model: ProductMapping,
                    as: 'mapping'
                },
                {
                    model: PriceComparison,
                    as: 'price_comparisons',
                    order: [['comparison_date', 'DESC']],
                    limit: 10
                }
            ]
        });

        if (!product) {
            return res.status(404).json(
                {
                    success: false,
                    error: 'Producto no encontrado'
                }
            );
        }

        res.json(
            {
                success: true,
                product
            }
        );


    } catch (error) {
        logger.error('Error obteniendo producto:', error.message);
        res.status(500).json(
            {
                success: false,
                error: error.message
            }
        );
    }
}


// ===========================================================
// ACTUALIZAR PRECIO EN SHOPIFY
// ===========================================================

/*
    PATCH /api/products/:id/price
    Actualiza el precio de un producto en Shopify
*/
async function updateProductPrice(req, res) {
    try {
        const { id } = req.params;
        const { new_price } = req.body;

        if (!new_price || isNaN(new_price)) {
            return res.status(400).json(
                {
                    success: false,
                    error: 'Precio inválido'
                }
            );
        }

        logger.info(`Actualizando precio del producto ${id} a $${new_price}`);


        // 1. Obtener producto de BD
        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json(
                {
                    success: false,
                    error: 'Producto no encontrado'
                }
            );
        }


        // 2. Actualizar en Shopify (usando variant ID)
        // Nota: Necesitarás guardar el variant_id en tu modelo Product
        const variantId = product.shopify_id; // O variant_id si está separado

        await shopifyService.updateProductPrice(variantId, parseFloat(new_price));


        // 3. Actualizar en base de datos local
        await product.update(
            {
                price: parseFloat(new_price)
            }
        );

        logger.success(`Precio actualizado exitosamente`);

        res.json(
            {
                success: true,
                message: 'Precio actualizado exitosamente',
                product: {
                    id: product.id,
                    title: product.title,
                    old_price: product.price,
                    new_price: parseFloat(new_price)
                }
            }
        );


    } catch (error) {
        logger.error('Error actualizando precio:', error.message);
        res.status(500).json(
            {
                success: false,
                error: error.message
            }
        );
    }
}


// ===========================================================
// COMPARAR PRECIO DE UN PRODUCTO
// ===========================================================

/*
    POST /api/products/:id/compare
    Fuerza una comparación de precio para un producto específico
*/
async function compareProductPrice(req, res) {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json(
                {
                    success: false,
                    error: 'Producto no encontrado'
                }
            );
        }

        const result = await priceComparisonService.compareProductPrice(product);

        res.json(
            {
                success: true,
                result
            }
        );


    } catch (error) {
        logger.error('Error comparando precio:', error.message);
        res.status(500).json(
            {
                success: false,
                error: error.message
            }
        );
    }
}


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    getProductAlerts,
    listProducts,
    getProductDetail,
    updateProductPrice,
    compareProductPrice
};