/*
    CRON JOB - SINCRONIZACIÓN AUTOMÁTICA

    Ejecuta tareas programadas:
    - Sincronización diaria de productos
    - Comparación de precios
    - Limpieza de datos antiguos
*/

const cron = require('node-cron');
const { Product } = require('../models');
const shopifyService = require('../services/shopifyService');
const priceComparisonService = require('../services/priceComparisonService');
const logger = require('../utils/logger');

// ===========================================================
// TAREA: SINCRONIZACIÓN DIARIA COMPLETA
// ===========================================================

/*
    Sincroniza productos desde Shopify y compara precios
    Se ejecuta diariamente a las 2:00 AM
*/
async function dailyFullSync() {
    logger.info('🌀 Iniciando sincronización diaria automática');

    try {
        const startTime = Date.now();

        // 1. Sincronizar productos desde Shopify
        logger.info('Sincronizando productos desde Shopify...');
        const shopifyProducts = await shopifyService.getAllProducts();


        // 2. Actualizar productos en BD
        let updated = 0;
        let added = 0;

        for (const product of shopifyProducts) {
            const [dbProduct, created] = await Product.upsert(
                {
                    shopify_id: product.id,
                    shopify_gid: product.gid,
                    title: product.title,
                    price: product.variants[0]?.price,
                    inventory_quantity: product.variants[0]?.inventory_quantity
                    // ... otros campos que llegasen a ser necesarios
                }
            );

            if (created) {
                added++;
            } else {
                updated++;
            }
        }

        logger.success(`Productos sincronizados: ${added} nuevos, ${updated} actualizados`);


        // 3. Obtener productos TCG para comparación
        logger.info('⚖️ Comparando precios con el mercado...');
        const tcgProducts = await Product.findAll(
            {
                where: { is_tcg: true },
                limit: 100 // Limitar para no exceder rate limits
            }
        );


        // 4. Comparar precios
        const comparisonResults = await priceComparisonService.compareBulkPrices(tcgProducts);

        logger.success(`🆗 Comparación completada: ${comparisonResults.alerts_generated} alertas generadas`);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.success(`🥳 Sincronización diaria completada en ${duration}s`);

        return {
            success: true,
            duration,
            products: { added, updated },
            comparisons: comparisonResults
        };


    } catch (error) {
        logger.error('❌ Error en sincronización diaria:', error.message);
        throw error;
    }
}


// ===========================================================
// TAREA: COMPARACIÓN RÁPIDA
// ===========================================================

/*
    Compara precios de productos con alertas existentes
    Se ejecuta cada 6 horas
*/
async function quickPriceCheck() {
    logger.info('Iniciando verificación rápida de precios...');

    try {
        // Obtener productos que ya tienen alertas activas
        const productsWithAlerts = await priceComparisonService.getProductsWithAlerts();
        
        // Re-comparar solo esos productos
        const results = await priceComparisonService.compareBulkPrices(
            productsWithAlerts.slice(0, 50) // Máximo 50 para no exceder límites
        );
        
        logger.success(`✅ Verificación rápida completada: ${results.alerts_generated} alertas`);
        
        return results;
        
    } catch (error) {
        logger.error('❌ Error en verificación rápida:', error.message);
        throw error;
    }
}

// ===========================================================
// TAREA: LIMPIEZA DE DATOS ANTIGUOS
// ===========================================================

/**
 * Elimina comparaciones de precios antiguas
 * Se ejecuta semanalmente
 */
async function cleanOldData() {
    logger.info('🧹 Limpiando datos antiguos');
    
    try {
        const { PriceComparison } = require('../models');
        const { Op } = require('sequelize');
        
        // Eliminar comparaciones mayores a 30 días
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const deleted = await PriceComparison.destroy({
            where: {
                comparison_date: {
                    [Op.lt]: thirtyDaysAgo
                }
            }
        });
        
        logger.success(`✅ Eliminadas ${deleted} comparaciones antiguas`);
        
        return { deleted };
        
    } catch (error) {
        logger.error('❌ Error limpiando datos:', error.message);
        throw error;
    }
}

// ===========================================================
// PROGRAMAR TAREAS
// ===========================================================

/**
 * Inicia todos los cron jobs
 */
function startCronJobs() {
    logger.info('⏰ Iniciando tareas programadas (cron jobs)');
    
    // Sincronización completa diaria a las 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        logger.info('⏰ Ejecutando sincronización diaria programada');
        await dailyFullSync();
    });
    
    // Verificación rápida cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
        logger.info('⏰ Ejecutando verificación rápida programada');
        await quickPriceCheck();
    });
    
    // Limpieza de datos cada domingo a las 3:00 AM
    cron.schedule('0 3 * * 0', async () => {
        logger.info('⏰ Ejecutando limpieza de datos programada');
        await cleanOldData();
    });
    
    logger.success('✅ Tareas programadas iniciadas correctamente');
    logger.info('📅 Programación:');
    logger.info('   - Sincronización completa: Diariamente a las 2:00 AM');
    logger.info('   - Verificación rápida: Cada 6 horas');
    logger.info('   - Limpieza de datos: Domingos a las 3:00 AM');
}

// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    startCronJobs,
    dailyFullSync,
    quickPriceCheck,
    cleanOldData
};