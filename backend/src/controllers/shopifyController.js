/*
    SHOPIFY CONTROLLER
    Lógica de negocio para manejo de productos de Shopify
*/

const shopifyService = require('../services/shopifyService');
const { classifyProduct } = require('../utils/productFilters');
const logger = require('../utils/logger');

// ===========================================================
// SYNC INICIAL (SOLO DEBERÍA HACERSE LA PRIMERA VEZ)
// ===========================================================

/*
    Sincronización inicial completa
    Obtiene TODOS los productos, los clasifica y retorna para guardar en BD

    NOTA: Esta función NO guardará nada en BD aún, ya que se hará en fase 2
    Por ahora solo retorna los productos clasificados
*/
async function initialSync() {
    try {
        logger.info('🌀 Iniciando sincronización inicial');

        // 1. Obtener TODOS los productos (sin filtros)
        logger.info('📦 Obteniendo TODOS los productos de Shopify');
        const allProducts = await shopifyService.getAllProducts(
            {
                status: 'active'
            }
        );

        logger.success(`🆗 Obtenidos: ${allProducts.length} productos totales`);

        // 2. Clasificar TODOS los productos
        logger.info(`🔎 CLASIFICANDO TODOS LOS PRODUCTOS `);

        const classifiedProducts = allProducts.map(product => {
            const classification = classifyProduct(product);

            return {
                shopify_id: product.id,
                shopify_gid: product.gid,
                title: product.title,
                vendor: product.vendor,
                product_type: product.product_type,
                tags: product.tags,
                status: product.status,

                // Variante principal (mayoría de sellados tiene 1 sola variante)
                variant_id: product.variants[0]?.id,
                variant_gid: product.variants[0]?.gid,
                sku: product.variants[0]?.sku,
                price: parseFloat(product.variants[0]?.price || 0),
                inventory_quantity: product.variants[0]?.inventory_quantity || 0,
                barcode: product.variants[0]?.barcode,

                // Clasificación automática
                is_tcg: classification.isTCG,
                category: classification.category,
                game: classification.game,

                // Timestamps
                created_at: product.created_at,
                updated_at: product.updated_at
            };
        });

        logger.success(`🆗 Clasificación completa de ${classifiedProducts.length} productos`);

        // 3. Estadísticas básicas
        const tcgProducts = classifiedProducts.filter(p => p.is_tcg);
        const nonTcgProducts = classifiedProducts.filter(p => !p.is_tcg);

        const stats = {
            total: allProducts.length,
            tcg: tcgProducts.length,
            non_tcg: nonTcgProducts.length,

            tcg_breakdown: {
                sealed: tcgProducts.filter(p => p.category === 'sealed').length,
                single: tcgProducts.filter(p => p.category === 'single').length,
                event: tcgProducts.filter(p => p.category === 'event').length,
                accessory: tcgProducts.filter(p => p.category === 'accessory').length,
                other: tcgProducts.filter(p => p.category === 'other').length
            },

            by_game: {
                magic: tcgProducts.filter(p => p.game === 'magic').length,
                pokemon: tcgProducts.filter(p => p.game === 'pokemon').length,
                gundam: tcgProducts.filter(p => p.game === 'gundam').length,
                onepiece: tcgProducts.filter(p => p.game === 'onepiece').length,
                riftbound: tcgProducts.filter(p => p.game === 'riftbound').length,
                unknown: tcgProducts.filter(p => p.game === 'unknown').length
            }
        };

        logger.info('📊 Estadísticas del sync:', stats);

        //. Retornar TODO para guardar en BD (Fase 2)
        return {
            success: true,
            message: 'Sync inicial completado. Los productos están listos para ser guardados en la base de datos.',
            stats,
            products: classifiedProducts,
            tcg_products_only: tcgProducts
        };

    } catch (error) {
        logger.error('❌ Error en sync inicial:', error.message);
        throw error;
    }
}


// ===========================================================
// OBTENER ESTADÍSTICAS RÁPIDAS
// ===========================================================
/*
    Obtiene conteo total de productos (rápido, sin clasificar)
*/
async function getQuickStats() {
    try {
        logger.info('📊 Obteniendo estadísticas rápidas desde Shopify');

        const totalCount = await shopifyService.getProductCount();

        return {
            success: true,
            stats: {
                total_products: totalCount,
                note: 'Para estadística detallada (TCG, Categoría, Juegos), ejecutar Sync Inicial ( initialSync() )'
            }
        };

    } catch (error) {
        logger.error('❌ Error obteniendo estadísticas:', error.message);
        throw error;
    }
}


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    initialSync,
    getQuickStats
};