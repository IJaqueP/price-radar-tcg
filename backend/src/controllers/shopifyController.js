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
                handle: product.handle,
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

                // Imagen
                image_url: product.image?.src || null,

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
// GUARDAR PRODUCTOS EN BASE DE DATOS
// ===========================================================

async function saveProductsToDatabase(classifiedProducts) {
    const { Product, SyncHistory } = require('../models');

    logger.info('💾 Guardando productos en base de datos');

    // Crear registro de sincronización
    const syncRecord = await SyncHistory.create(
        {
            sync_type: 'initial_sync',
            products_processed: classifiedProducts.length,
            status: 'in_progress'
        }
    );

    try {
        let added = 0;
        let updated = 0;

        for (const product of classifiedProducts) {
            const [dbProduct, created] = await Product.upsert(
                {
                    shopify_id: product.shopify_id,
                    shopify_gid: product.shopify_gid || product.gid,
                    title: product.title,
                    handle: product.handle,
                    vendor: product.vendor,
                    product_type: product.product_type,
                    tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.tags || '',
                    is_tcg: product.is_tcg,
                    is_sealed: product.category === 'sealed',
                    is_single: product.category === 'single',
                    game: product.game,
                    category: product.category,
                    price: product.price,
                    compare_at_price: product.compare_at_price,
                    currency: 'USD',
                    inventory_quantity: product.inventory_quantity,
                    has_variants: product.has_variants || false,
                    variant_count: product.variant_count || 0,
                    image_url: product.image_url,
                    shopify_created_at: product.created_at,
                    shopify_updated_at: product.updated_at
                }
            );

            if (created) {
                added++;
            } else {
                updated++;
            }
        }


        // Actualizar registro de sincronización
        await syncRecord.update(
            {
                products_added: added,
                products_updated: updated,
                status: 'completed',
                completed_at: new Date(),
                duration_seconds: Math.floor((new Date() - syncRecord.started_at) / 1000)
            }
        );

        logger.success(`🆗 Productos guardados: ${added} nuevos, ${updated} actualizados`);

        return { added, updated };

    } catch (error) {
        // Actualizar registro con error
        await syncRecord.update(
            {
                status: 'failed',
                error_message: error.message,
                completed_at: new Date()
            }
        );

        throw error;
    }
}


// ===========================================================
// GENERAR ESTADÍSTICAS
// ===========================================================
function generateStats(classifiedProducts) {
    const tcgProducts = classifiedProducts.filter(p => p.is_tcg);
    const nonTcgProducts = classifiedProducts.filter(p => !p.is_tcg);

    return {
        total: classifiedProducts.length,
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
}


// ===========================================================
// SINCRONIZACIÓN INICIAL CON BASE DE DATOS
// ===========================================================

async function initialSyncWithDatabase(req, res) {
    try {
        logger.info('🔂 Iniciando sincronización inicial con la base de datos');

        const startTime = Date.now();

        // 1. Obtener productos de Shopify
        logger.info('📦 Obteniendo productos de Shopify');
        const products = await shopifyService.getAllProducts();
        logger.success(`🆗 ${products.length} productos obtenidos`);

        // 2. Clasificar productos
        logger.info('🔎 Clasificando productos');
        const classifiedProducts = products.map(product => {
            const classification = classifyProduct(product);
            return {
                shopify_id: product.id,
                shopify_gid: product.gid,
                title: product.title,
                handle: product.handle,
                vendor: product.vendor,
                product_type: product.product_type,
                tags: product.tags,
                price: parseFloat(product.variants[0]?.price || 0),
                compare_at_price: product.variants[0]?.compareAtPrice ? parseFloat(product.variants[0].compareAtPrice) : null,
                inventory_quantity: product.variants[0]?.inventory_quantity || 0,
                has_variants: product.variants?.length > 1,
                variant_count: product.variants?.length || 0,
                image_url: product.image?.src || null,
                created_at: product.created_at,
                updated_at: product.updated_at,
                // Clasificación
                is_tcg: classification.isTCG,
                category: classification.category,
                game: classification.game
            };
        });

        // 3. Guardar en base de datos
        const { added, updated } = await saveProductsToDatabase(classifiedProducts);

        // 4. Generar estadísticas
        const stats = generateStats(classifiedProducts);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        logger.success(`🆗 Sincronización inicial completa en ${duration}s`);

        res.json(
            {
                success: true,
                message: 'Sincronización inicial completada',
                duration_seconds: parseFloat(duration),
                database: {
                    products_added: added,
                    products_updated: updated
                },
                statistics: stats
            }
        );

    } catch (error) {
        logger.error('❌ Error en sincronización inicial', { error: error.message });
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
    initialSync,
    initialSyncWithDatabase,
    getQuickStats
};