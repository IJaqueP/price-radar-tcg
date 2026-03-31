/*
    PRICE COMPARISON SERVICE

    Servicio para comparar precios entre Shopify y el mercado (TCGGO), 
    para generar alertas de diferencias significativas
*/

const { Product, PriceComparison } = require('../models');
const tcggoService = require('./tcggoService');
const logger = require('../utils/logger');

// ===========================================================
// COMPARAR PRECIOS DE UN PRODUCTO
// ===========================================================

/*
    Compara el precio de un producto con el mercado
    @param {Object} product - Producto de la base de datos
    @returns {Promise<Object>} Resultado de la comparación
*/
async function compareProductPrice(product) {
    try {
        logger.info(`Comparando precio de producto: ${product.title}`);

        // 1. Verificar si el producto tiene mapeo a TCGGO
        const mapping = await product.getMapping();

        if (!mapping || !mapping.tcggo_id) {
            logger.warn(`Producto ${product.id} no tiene mapeo a TCGGO`);
            return {
                success: false,
                reason: 'no_mapping',
                message: 'Producto no mapeado a TCGGO'
            };
        }

        
        // 2. Obtener precio del mercado desde TCGGO
        const marketPrice = await tcggoService.getProductPrice(mapping.tcggo_id);

        if (!marketPrice || !marketPrice.avg_price) {
            logger.warn(`No se pudo obtener precio de mercado para ${product.title}`);
            return {
                success: false,
                reason: 'no_market_price',
                message: 'Precio de mercado no disponible'
            };
        }


        // 3. Calcular diferencia de precio
        const shopifyPrice = parseFloat(product.price);
        const tcggoPrice = parseFloat(marketPrice.avg_price);

        const difference = calculatePriceDifference(shopifyPrice, tcggoPrice);


        // 4. Determinar si genera alerta
        const threshold = parseFloat(process.env.PRICE_THRESHOLD_PERCENTAGE) || 3;
        const isAlert = Math.abs(difference.percentage) >= threshold;


        // 5. Guardar comparación en base de datos
        const comparison = await PriceComparison.create(
            {
                product_id: product.id,
                shopify_price: shopifyPrice,
                tcggo_price: tcggoPrice,
                tcggo_price_mxn: null, // TODO: Implementar conversión de moneda
                price_difference_percentage: difference.percentage,
                price_difference_amount: difference.amount,
                is_below_threshold: isAlert,
                alert_sent: false,
                comparison_date: new Date()
            }
        );

        logger.success(`Comparación guardada para ${product.title}: ${difference.percentage}`);

        return {
            success: true,
            comparison,
            alert: isAlert,
            difference
        };


    } catch (error) {
        logger.error(`Error comparando precio de ${product.title}:`, error.message);
        throw error;
    }
}


// ===========================================================
// COMPARAR PRECIOS EN LOTE
// ===========================================================

/*
    Compara precios de múltiples productos
    @param {Array<Object>} products - Lista de productos
    @returns {Promise<Object>} Estadística de comparación
*/
async function compareBulkPrices(products) {
    logger.info(`Iniciando comparación en lote de ${products.length} productos`);

    const results = {
        total: products.length,
        successful: 0,
        failed: 0,
        alerts_generated: 0,
        no_mapping: 0,
        no_market_price: 0,
        comparisons: []
    };

    for (const product of products) {
        try {
            const result = await compareProductPrice(product);

            if (result.success) {
                results.successful++;
                if (result.alert) {
                    results.alerts_generated++;
                }
                results.comparisons.push(result.comparison);
            } else {
                results.failed++;
                if (result.reason === 'no_mapping') results.no_mapping++;
                if (result.reason === 'no_market_price') results.no_market_price++;
            }


            // Pausa para respetar rate limits
            await new Promise(resolve => setTimeout(resolve, 1500));


        } catch (error) {
            logger.error(`Error en producto ${product.id}:`, error.message);
            results.failed++;
        }
    }

    logger.success('Comparación en lote completada', results);

    return results;
}


// ===========================================================
// OBTENER PRODUCTOS CON ALERTAS
// ===========================================================

/*
    Obtiene productos con alertas de precio activas
    @param {Object} filters - Filtros opcionales
    @returns {Promise<Array>} Lista de productos con alertas
*/
async function getProductsWithAlerts(filters = {}) {
    try {
        const whereClause = {
            is_tcg: true
        };

        // Filtrar por juego
        if (filters.game) {
            whereClause.game = filters.game;
        }

        // Filtrar por categoría
        if (filters.category) {
            whereClause.category = filters.category;
        }

        // Obtener productos con sus últimas comparaciones
        const products = await Product.findAll(
            {
                where: whereClause,
                include: [
                    {
                        model: PriceComparison,
                        as: 'price_comparisons',
                        where: {
                            is_below_threshold: true
                        },
                        order: [['comparison_date', 'DESC']],
                        limit: 1,
                        required: true
                    }
                ]
            }
        );

        logger.info(`Encontrados ${products.length} productos con alertas`);

        return products;


    } catch (error) {
        logger.error('Error obteniendo productos con alertas:', error.message);
        throw error;
    }
}


// ===========================================================
// OBTENER ESTADÍSTICAS DE COMPARACIONES
// ===========================================================

/*
    Obtiene estadísticas generales de comparaciones
    @returns {Promise<Object>} Estadísticas
*/
async function getComparisonStats() {
    try {
        const { Op } = require('sequelize');
        const { sequelize } = require('../config/database');

        // Total de productos con alertas activas
        const totalAlerts = await PriceComparison.count(
            {
                where: {
                    is_below_threshold: true,
                    comparison_date: {
                        [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
                    }
                },
                distinct: true,
                col: 'product_id'
            }
        );


        // Productos con precio mayor al mercado
        const higherPrices = await PriceComparison.count(
            {
                where: {
                    is_below_threshold: true,
                    price_difference_percentage: {
                        [Op.gt]: 0
                    },
                    comparison_date: {
                        [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                distinct: true,
                col: 'product_id'
            }
        );


        // Productos con precio menor al mercado
        const lowerPrices = await PriceComparison.count(
            {
                where: {
                    is_below_threshold: true,
                    price_difference_percentage: {
                        [Op.lt]: 0
                    },
                    comparison_date: {
                        [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                distinct: true,
                col: 'product_id'
            }
        );


        // Diferencia promedio
        const avgDifference = await PriceComparison.findOne(
            {
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('price_difference_percentage')), 'avg']
                ],
                where: {
                    is_below_threshold: true,
                    comparison_date: {
                        [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                raw: true
            }
        );


        return {
            total_alerts: totalAlerts,
            higher_prices: higherPrices,
            lower_prices: lowerPrices,
            avg_difference: avgDifference?.avg ? parseFloat(avgDifference.avg).toFixed(1) : '0'
        };


    } catch (error) {
        logger.error('Error obteniendo estadísticas:', error.message);
        throw error;
    }
}


// ===========================================================
// FUNCIONES AUXILIARES
// ===========================================================

/*
    Calcula la diferencia de precio entre Shopify y mercado
    @param {number} shopifyPrice - Precio en Shopify
    @param {number} marketPrice - Precio del mercado
    @returns {Object} { percentage, amount, direction }
*/
function calculatePriceDifference(shopifyPrice, marketPrice) {
    const amount = shopifyPrice - marketPrice;
    const percentage = ((amount / marketPrice) * 100).toFixed(2);
    const direction = amount > 0 ? 'higher' : amount < 0 ? 'lower' : 'equal';

    return {
        percentage: parseFloat(percentage),
        amount: parseFloat(amount.toFixed(2)),
        direction
    };
}


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    compareProductPrice,
    compareBulkPrices,
    getProductsWithAlerts,
    getComparisonStats,
    calculatePriceDifference
};