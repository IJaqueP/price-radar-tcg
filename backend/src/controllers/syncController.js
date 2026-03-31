const ShopifyProduct = require('../models/ShopifyProduct');
const shopifyService = require('../services/shopifyService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class SyncController { 

    /**
     * FASE 1: Sincronizar productos desde Shopify
     * GET /api/sync/shopify-products
     */

    async syncShopifyProducts(req, res) {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 FASE 1: OBTENCIÓN Y AUDITORÍA DE PRODUCTOS DESDE SHOPIFY');
        console.log('='.repeat(60) + '\n');

        try {
            const startTime = Date.now();

            // 1. Obtener todos los productos desde Shopify
            const shopifyProducts = await shopifyService.getAllProducts();

            if (shopifyProducts.length === 0) {
                return res.status(404).json(
                    {
                        success: false,
                        message: 'No se encontraron productos en Shopify',
                        data: {
                            products_found: 0
                        }
                    }
                );
            }


            // 2. Normalizar datos
            const normalizedProducts = shopifyService.normalizeProducts(shopifyProducts);

            // 3. Guardar en base de datos (upset para evitar duplicados)
            console.log('\n💾 Guardando productos en base de datos');

            let insertedCount = 0;
            let updatedCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const product of normalizedProducts) {
                try {
                    const [record, created] = await ShopifyProduct.upsert(product, {
                        returning: true,
                        conflictFields: ['variant_id']
                    });

                    if (created) {
                        insertedCount++;
                    } else {
                        updatedCount++;
                    }

                } catch (error) {
                    errorCount++;
                    errors.push(
                        {
                            product: product.title,
                            sku: product.shopify_sku,
                            error: error.message
                        }
                    );
                    console.error(`     ❌ Error con producto ${product.title}:`, error.message);
                }
            }

            // 4. Estadísticas finales
            
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            console.log('\n' + '='.repeat(60));
            console.log('📊 RESUMEN DE SINCRONIZACIÓN');
            console.log('='.repeat(60));
            console.log(`🆗 Productos insertados: ${insertedCount}`);
            console.log(`🌀 Productos actualizados: ${updatedCount}`);
            console.log(`❌ Errores: ${errorCount}`);
            console.log(`🕰️ Tiempo total: ${duration} s`);
            console.log('='.repeat(60) + '\n');

            // 5. Análisis de SKUs
            const productsWithSku = await ShopifyProduct.count(
                {
                    where: {
                        shopify_sku: { [Op.ne]: null }
                    }
                }
            );

            const productsWithoutSku = await ShopifyProduct.count(
                {
                    where: {
                        [Op.or]: [
                            { shopify_sku: null },
                            { shopify_sku: '' }
                        ]
                    }
                }
            );

            console.log('🔎 ANÁLISIS DE SKUs');
            console.log('-'.repeat(60));
            console.log(`🆗 Productos CON SKU: ${productsWithSku}`);
            console.log(`🅰️ Productos SIN SKU: ${productsWithoutSku}`);
            console.log('-'.repeat(60) + '\n');


            // 6. Respuesta
            return res.status(200).json(
                {
                    success: true,
                    message: 'Sincronización de productos desde Shopify completada',
                    data: {
                        total_products: normalizedProducts.length,
                        inserted: insertedCount,
                        updated: updatedCount,
                        error_details: errors.length > 0 ? errors : undefined,
                        duration_second: parseFloat(duration),
                        sku_analysis: {
                            with_sku: productsWithSku,
                            without_sku: productsWithoutSku,
                            percentage_with_sku: ((productsWithSku / normalizedProducts.length) * 100).toFixed(2) + '%'
                        }
                    }
                }
            );

        } catch (error) {
            console.error('\n❌ ERROR CRÍTICO EN SINCRONIZACIÓN:', error);

            return res.status(500).json(
                {
                    success: false,
                    message: 'Error en la sincronización de productos',
                    error: error.message
                }
            );
        }
    }


    /**
     * Obtener estadísticas de productos sincronizados
     * GET /api/sync/stats
     */

    async getStats(req, res) {
        try {
            const totalProducts = await ShopifyProduct.count();
            const withSku = await ShopifyProduct.count(
                {
                    where: { shopify_sku: { [Op.ne]: null } }
                }
            );
            const validated = await ShopifyProduct.count(
                {
                    where: { sku_validated: true }
                }
            );
            const byStatus = await ShopifyProduct.findAll(
                {
                    attributes: [
                        'status',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                    ],
                    group: ['status']
                }
            );

            return res.json(
                {
                    success: true,
                    data: {
                        total_products: totalProducts,
                        with_sku: withSku,
                        without_sku: totalProducts - withSku,
                        sku_validated: validated,
                        pending_validation: totalProducts - validated,
                        by_status: byStatus
                    }
                }
            );


        } catch (error) {
            return res.status(500).json(
                {
                    success: false,
                    error: error.message
                }
            );
        }
    }
}

module.exports = new SyncController();