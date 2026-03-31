/**
 * Script para sincronizar productos de Shopify a la BD
 * Ejecutar: node syncShopify.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const ShopifyProduct = require('../models/ShopifyProduct');
const shopifyService = require('../services/shopifyService');

async function syncShopifyProducts() {
    try {
        console.log('🔄 Iniciando sincronización de Shopify...\n');

        // Conectar a la BD
        await sequelize.authenticate();
        console.log('✅ Conexión a BD establecida\n');

        // Obtener todos los productos de Shopify
        const shopifyProducts = await shopifyService.getAllProducts();
        console.log(`\n📦 ${shopifyProducts.length} productos obtenidos de Shopify\n`);

        // Normalizar productos
        const normalizedProducts = shopifyService.normalizeProducts(shopifyProducts);
        console.log(`\n📋 ${normalizedProducts.length} variantes para sincronizar\n`);

        // Sincronizar en BD (upsert)
        console.log('💾 Sincronizando a base de datos...');
        let created = 0;
        let updated = 0;

        for (let i = 0; i < normalizedProducts.length; i++) {
            const product = normalizedProducts[i];
            
            // Mostrar progreso cada 100 productos
            if ((i + 1) % 100 === 0) {
                console.log(`   ${i + 1}/${normalizedProducts.length}`);
            }

            try {
                const [record, isNew] = await ShopifyProduct.upsert(product, {
                    where: { variant_id: product.variant_id },
                    returning: true
                });

                if (isNew) {
                    created++;
                } else {
                    updated++;
                }
            } catch (error) {
                console.error(`Error sincronizando producto ${product.variant_id}:`, error.message);
            }
        }

        console.log(`\n✅ Sincronización completada:`);
        console.log(`   ➕ Creados: ${created}`);
        console.log(`   🔄 Actualizados: ${updated}`);
        console.log(`   📊 Total: ${created + updated}\n`);

        // Contar productos sealed
        const sealedCount = await ShopifyProduct.count({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('product_type')),
                'LIKE',
                '%sealed%'
            )
        });

        console.log(`📦 Productos Sealed en BD: ${sealedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante sincronización:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

syncShopifyProducts();
