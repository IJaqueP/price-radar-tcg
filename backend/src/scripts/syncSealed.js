/**
 * Sync dirigido: descarga SOLO productos sellados desde Shopify y actualiza la BD.
 * Mucho más rápido que el sync completo porque filtra directamente en la API.
 *
 * Ejecutar: node src/scripts/syncSealed.js
 *
 * Queries usadas contra Shopify:
 *   product_type:"Sealed Magic the Gathering"
 *   product_type:"Sealed Pokemon TCG"
 *   product_type:"Sealed Bandai"
 *   product_type:"Sealed One Piece"
 *   product_type:"Sealed Gundam"
 *   product_type:"Sealed"   (captura tipos genéricos)
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const ShopifyProduct = require('../models/ShopifyProduct');
const shopifyService = require('../services/shopifyService');

// Tipos de productos sellados que buscamos en Shopify
const SEALED_QUERIES = [
    'product_type:"Sealed Magic the Gathering"',
    'product_type:"Sealed Pokemon TCG"',
    'product_type:"Sealed Bandai"',
    'product_type:"Sealed One Piece"',
    'product_type:"Sealed Gundam"',
    'product_type:"Sealed Riftbound"',
    'product_type:Sealed',
];

async function syncSealedProducts() {
    try {
        console.log('🔄 Iniciando sync de productos sellados desde Shopify...\n');

        await sequelize.authenticate();
        console.log('✅ BD conectada\n');

        let allRaw = [];
        const seenIds = new Set();

        for (const q of SEALED_QUERIES) {
            console.log(`\n🔍 Query: ${q}`);
            let products;
            try {
                products = await shopifyService.getProductsByQuery(q);
            } catch (err) {
                console.error(`   ⚠️  Error con query "${q}": ${err.message}`);
                continue;
            }

            // Deduplicar por product id (Shopify puede devolver el mismo producto en varias queries)
            let added = 0;
            for (const edge of products) {
                const pid = edge.node.id;
                if (!seenIds.has(pid)) {
                    seenIds.add(pid);
                    allRaw.push(edge);
                    added++;
                }
            }
            console.log(`   ➕ ${added} nuevos (${products.length - added} duplicados ignorados)`);
        }

        console.log(`\n📦 Total productos únicos de Shopify: ${allRaw.length}`);

        // Normalizar
        const normalized = shopifyService.normalizeProducts(allRaw);
        console.log(`📋 Variantes a sincronizar (con SKU): ${normalized.length}\n`);

        if (normalized.length === 0) {
            console.log('⚠️  Sin variantes para sincronizar. Revisa los product_types en Shopify.');
            process.exit(0);
        }

        // Upsert
        console.log('💾 Sincronizando a BD...');
        let created = 0;
        let updated = 0;
        let errors = 0;

        for (let i = 0; i < normalized.length; i++) {
            const product = normalized[i];
            if ((i + 1) % 50 === 0) {
                console.log(`   ${i + 1}/${normalized.length}`);
            }
            try {
                const [, isNew] = await ShopifyProduct.upsert(product, {
                    conflictFields: ['variant_id'],
                    returning: true,
                });
                if (isNew) created++;
                else updated++;
            } catch (err) {
                errors++;
                if (errors <= 5) console.error(`   ❌ ${product.variant_id}: ${err.message}`);
            }
        }

        console.log(`\n✅ Sync completado:`);
        console.log(`   ➕ Creados  : ${created}`);
        console.log(`   🔄 Actualizados: ${updated}`);
        console.log(`   ❌ Errores  : ${errors}`);
        console.log(`   📊 Total    : ${created + updated}\n`);

        // Resumen final en BD
        const { Op } = require('sequelize');
        const total = await ShopifyProduct.count({ where: { product_type: { [Op.iLike]: 'Sealed%' } } });
        const inStock = await ShopifyProduct.count({
            where: {
                product_type: { [Op.iLike]: 'Sealed%' },
                status: 'active',
                inventory_quantity: { [Op.gt]: 0 },
            },
        });
        const inStockWithSku = await ShopifyProduct.count({
            where: {
                product_type: { [Op.iLike]: 'Sealed%' },
                status: 'active',
                inventory_quantity: { [Op.gt]: 0 },
                shopify_sku: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
            },
        });

        const byType = await ShopifyProduct.findAll({
            attributes: ['product_type', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
            where: { product_type: { [Op.iLike]: 'Sealed%' }, status: 'active', inventory_quantity: { [Op.gt]: 0 } },
            group: ['product_type'],
            raw: true,
            order: [[sequelize.literal('n'), 'DESC']],
        });

        console.log('📊 Estado final en BD:');
        console.log(`   Sellados totales en BD      : ${total}`);
        console.log(`   Sellados activos con stock   : ${inStock}`);
        console.log(`   Sellados con stock + SKU     : ${inStockWithSku}`);
        console.log('\n   Por tipo (activos con stock):');
        byType.forEach(r => console.log(`     ${r.product_type}: ${r.n}`));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

syncSealedProducts();
