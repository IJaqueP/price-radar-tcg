/*
    PRODUCT CONTROLLER

    Controlador para manejo de productos y alertas de precios
*/

const { where } = require('sequelize');
const { Product, ProductMapping, PriceComparison } = require('../models');
const priceComparisonService = require('../services/priceComparisonService');
const shopifyService = require('../services/shopifyService');
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
        const { game, category, limit = 50 } = req.query;

        logger.info('Obteniendo productos con alertas', { game, category });

        
        // Obtener productos con alertas
        const products = await priceComparisonService.getProductsWithAlerts(
            {
                game,
                category
            }
        );


        // Limitar resultados
        const limitedProducts = products.slice(0, parseInt(limit));


        // Formatear respuesta
        const formattedProducts = limitedProducts.map(product => {
            const latestComparison = product.price_comparisons[0];

            return {
                id: product.id,
                title: product.title,
                sku: product.variants?.[0]?.sku || 'N/A',
                game: product.game,
                category: product.category,
                image_url: product.image_url,
                stock: product.inventory_quantity,
                shopify_price: parseFloat(product.price),
                market_price: parseFloat(latestComparison.tcggo_price),
                price_difference: parseFloat(latestComparison.price_difference_percentage),
                last_comparison: latestComparison.comparison_date
            };
        });


        // Obtener estadísticas
        const stats = await priceComparisonService.getComparisonStats();

        res.json(
            {
                success: true,
                products: formattedProducts,
                stats,
                count: formattedProducts.length
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