const ShopifyProduct = require('../models/ShopifyProduct');
const SkuMapping = require('../models/SkuMapping');
const rapidApiService = require('../services/rapidApiService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class SkuReconciliationController {

    /**
     * FASE 2: Reconciliar SKUs entre Shopify y RapidAPI
     * GET /api/reconcile/start?limit=50
     */
    async startReconciliation(req, res) {
        console.log('\n' + '='.repeat(70));
        console.log('🔄 FASE 2: RECONCILIACIÓN DE SKUs SHOPIFY ↔ RAPIDAPI');
        console.log('='.repeat(70) + '\n');

        try {
            const limit = parseInt(req.query.limit) || 50; // Procesar de a 50
            const startTime = Date.now();

            // 1. Obtener productos de Shopify que NO tienen mapping
            console.log('📦 Obteniendo productos sin mapping...');
            
            const productsWithoutMapping = await ShopifyProduct.findAll({
                where: {
                    variant_id: {
                        [Op.notIn]: sequelize.literal(
                            '(SELECT shopify_variant_id FROM sku_mapping)'
                        )
                    },
                    status: 'active'
                },
                limit: limit,
                order: [['id', 'ASC']]
            });

            if (productsWithoutMapping.length === 0) {
                return res.json({
                    success: true,
                    message: 'Todos los productos ya tienen mapping',
                    data: { processed: 0 }
                });
            }

            console.log(`   ✅ ${productsWithoutMapping.length} productos por procesar\n`);

            // 2. Procesar cada producto
            let successCount = 0;
            let failedCount = 0;
            const results = [];

            for (const product of productsWithoutMapping) {
                try {
                    console.log(`\n🔍 Procesando: ${product.title}`);
                    
                    // Buscar en RapidAPI
                    const searchResults = await rapidApiService.searchProduct(
                        product.title,
                        product.product_type || 'magic'
                    );

                    // Encontrar mejor match
                    const { match, score, method } = rapidApiService.findBestMatch(
                        product.title,
                        searchResults
                    );

                    // Crear registro de mapping
                    const mappingData = {
                        shopify_product_id: product.id,
                        shopify_variant_id: product.variant_id,
                        shopify_sku_original: product.shopify_sku,
                        product_name: product.title,
                        product_type: product.product_type,
                        match_method: method,
                        confidence_score: score
                    };

                    if (match) {
                        mappingData.rapidapi_sku = match.sku;
                        mappingData.validated = score >= 95; // Auto-validar si score > 95%
                        mappingData.validated_at = score >= 95 ? new Date() : null;
                        mappingData.validated_by = score >= 95 ? 'system_auto' : null;
                        mappingData.rapidapi_response = match;
                        
                        console.log(`   ✅ Match encontrado: ${match.name}`);
                        console.log(`   📊 Score: ${score.toFixed(2)}% | Método: ${method}`);
                        console.log(`   🏷️  SKU RapidAPI: ${match.sku}`);
                        successCount++;
                    } else {
                        mappingData.last_error = 'No se encontró match adecuado';
                        console.log(`   ⚠️  No se encontró match adecuado`);
                        failedCount++;
                    }

                    await SkuMapping.create(mappingData);
                    results.push({ product: product.title, success: !!match, score });

                    // Rate limiting
                    await rapidApiService.sleep(rapidApiService.requestDelay);

                } catch (error) {
                    console.error(`   ❌ Error procesando ${product.title}:`, error.message);
                    
                    // Guardar error en mapping
                    await SkuMapping.create({
                        shopify_product_id: product.id,
                        shopify_variant_id: product.variant_id,
                        shopify_sku_original: product.shopify_sku,
                        product_name: product.title,
                        product_type: product.product_type,
                        match_method: 'not_found',
                        last_error: error.message,
                        retry_count: 1
                    });
                    
                    failedCount++;
                }
            }

            // 3. Estadísticas finales
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            console.log('\n' + '='.repeat(70));
            console.log('📊 RESUMEN DE RECONCILIACIÓN');
            console.log('='.repeat(70));
            console.log(`✅ Exitosos: ${successCount}`);
            console.log(`❌ Fallidos: ${failedCount}`);
            console.log(`⏱️  Tiempo: ${duration}s`);
            console.log('='.repeat(70) + '\n');

            return res.json({
                success: true,
                message: 'Reconciliación completada',
                data: {
                    processed: productsWithoutMapping.length,
                    successful: successCount,
                    failed: failedCount,
                    duration_seconds: parseFloat(duration),
                    results: results
                }
            });

        } catch (error) {
            console.error('\n❌ ERROR CRÍTICO:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Obtener estadísticas de reconciliación
     * GET /api/reconcile/stats
     */
    async getStats(req, res) {
        try {
            const totalProducts = await ShopifyProduct.count();
            const totalMapped = await SkuMapping.count();
            const validated = await SkuMapping.count({ where: { validated: true } });
            const pending = totalProducts - totalMapped;
            
            const byMethod = await SkuMapping.findAll({
                attributes: [
                    'match_method',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['match_method']
            });

            return res.json({
                success: true,
                data: {
                    total_shopify_products: totalProducts,
                    total_mapped: totalMapped,
                    validated: validated,
                    pending_mapping: pending,
                    by_method: byMethod,
                    completion_percentage: ((totalMapped / totalProducts) * 100).toFixed(2) + '%'
                }
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new SkuReconciliationController();