/**
 * Script para identificar y marcar correctamente productos
 * SEALED, SINGLE o ACCESSORY
 * 
 * Un producto es SEALED si:
 * 1. El product_type contiene "Sealed"
 * 2. O las colecciones contienen: "Sealed", "Booster", "Starter Deck", "Collector", etc
 * 3. O el raw_data tiene indicadores de producto sellado
 * 
 * Un producto es ACCESSORY si:
 * 1. El product_type contiene "Accessory" / "Accesorio"
 * 2. O el título/colecciones contienen keywords de accesorios
 * 
 * Si no es SEALED ni ACCESSORY, se clasifica como SINGLE.
 * 
 * Ejecutar: node identifySealedProducts.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const ShopifyProduct = require('../models/ShopifyProduct');

// Palabras clave que indican un producto SEALED
const SEALED_KEYWORDS = [
    'sealed',
    'booster',
    'collector',
    'draft',
    'set booster',
    'starter deck',
    'commander deck',
    'bundle',
    'box',
    'display'
];

// Palabras clave que indican accesorios
const ACCESSORY_KEYWORDS = [
    'sleeve',
    'sleeves',
    'binder',
    'portfolio',
    'playmat',
    'deck box',
    'deckbox',
    'storage',
    'box',
    'dice',
    'counter',
    'mat',
    'album',
    'toploader',
    'card case',
    'protect',
    'protector'
];

async function identifySealedProducts() {
    try {
        console.log('🔍 Identificando productos SEALED...\n');

        await sequelize.authenticate();
        console.log('✅ Conexión a BD establecida\n');

        const BATCH_SIZE = 5000; // Procesar en lotes de 5000
        let offset = 0;
        let totalUpdated = 0;
        let totalSealed = 0;
        let totalAccessories = 0;
        let totalSingles = 0;

        while (true) {
            // Obtener lote de productos
            const products = await ShopifyProduct.findAll({
                attributes: ['id', 'title', 'product_type', 'raw_data'],
                raw: true,
                limit: BATCH_SIZE,
                offset: offset
            });

            if (products.length === 0) break; // No más productos

            console.log(`📦 Procesando lote: offset ${offset} - ${offset + products.length}`);

            for (const product of products) {
                const category = determineCategory(product);

                if (category === 'sealed') {
                    totalSealed++;

                    if (!product.product_type?.toLowerCase().includes('sealed')) {
                        const newProductType = determineSealedProductType(product);

                        await ShopifyProduct.update(
                            { product_type: newProductType },
                            { where: { id: product.id }, individualHooks: false }
                        );

                        totalUpdated++;
                    }
                } else if (category === 'accessory') {
                    totalAccessories++;

                    if (!product.product_type?.toLowerCase().includes('accessor')) {
                        const newProductType = determineAccessoryProductType(product);

                        await ShopifyProduct.update(
                            { product_type: newProductType },
                            { where: { id: product.id }, individualHooks: false }
                        );

                        totalUpdated++;
                    }
                } else {
                    totalSingles++;

                    if (!product.product_type?.toLowerCase().includes('single')) {
                        const newProductType = determineSingleProductType(product);

                        await ShopifyProduct.update(
                            { product_type: newProductType },
                            { where: { id: product.id }, individualHooks: false }
                        );

                        totalUpdated++;
                    }
                }
            }

            offset += BATCH_SIZE;
        }

        console.log(`\n✅ Identificación completada:`);
        console.log(`   📦 Productos SEALED encontrados: ${totalSealed}`);
        console.log(`   🧰 Productos ACCESSORY encontrados: ${totalAccessories}`);
        console.log(`   🃏 Productos SINGLE encontrados: ${totalSingles}`);
        console.log(`   ✏️  Productos actualizados: ${totalUpdated}\n`);

        // Verificar product_type actualizado
        const sealedInDb = await ShopifyProduct.count({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('product_type')),
                'LIKE',
                '%sealed%'
            )
        });

        console.log(`📊 Productos Sealed en BD (actualizado): ${sealedInDb}`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * Determina si un producto es SEALED basado en múltiples factores
 */
function checkIfSealed(product) {
    // Verificar product_type
    if (product.product_type?.toLowerCase().includes('sealed')) {
        return true;
    }

    // Verificar título
    const titleLower = product.title?.toLowerCase() || '';
    for (const keyword of SEALED_KEYWORDS) {
        if (titleLower.includes(keyword)) {
            return true;
        }
    }

    // Verificar colecciones en raw_data
    if (product.raw_data) {
        try {
            const rawData = typeof product.raw_data === 'string'
                ? JSON.parse(product.raw_data)
                : product.raw_data;

            const collections = rawData.collections || [];
            if (Array.isArray(collections)) {
                for (const collection of collections) {
                    const collName = collection.toLowerCase();
                    for (const keyword of SEALED_KEYWORDS) {
                        if (collName.includes(keyword)) {
                            return true;
                        }
                    }
                }
            }
        } catch (e) {
            // Ignorar errores de parsing JSON
        }
    }

    return false;
}

/**
 * Determina si un producto es ACCESSORY basado en múltiples factores
 */
function checkIfAccessory(product) {
    // Verificar product_type
    const productTypeLower = product.product_type?.toLowerCase() || '';
    if (productTypeLower.includes('accessory') || productTypeLower.includes('accesorio')) {
        return true;
    }

    // Verificar título
    const titleLower = product.title?.toLowerCase() || '';
    for (const keyword of ACCESSORY_KEYWORDS) {
        if (titleLower.includes(keyword)) {
            return true;
        }
    }

    // Verificar colecciones en raw_data
    if (product.raw_data) {
        try {
            const rawData = typeof product.raw_data === 'string'
                ? JSON.parse(product.raw_data)
                : product.raw_data;

            const collections = rawData.collections || [];
            if (Array.isArray(collections)) {
                for (const collection of collections) {
                    const collName = collection.toLowerCase();
                    for (const keyword of ACCESSORY_KEYWORDS) {
                        if (collName.includes(keyword)) {
                            return true;
                        }
                    }
                }
            }
        } catch (e) {
            // Ignorar errores de parsing JSON
        }
    }

    return false;
}

/**
 * Determina la categoría: sealed / accessory / single
 */
function determineCategory(product) {
    if (checkIfSealed(product)) return 'sealed';
    if (checkIfAccessory(product)) return 'accessory';
    return 'single';
}

/**
 * Determina el tipo de producto correcto basado en el análisis
 */
function determineSealedProductType(product) {
    const titleLower = product.title?.toLowerCase() || '';
    let gamePrefix = 'Sealed';

    if (titleLower.includes('pokemon') || titleLower.includes('pokémon')) {
        gamePrefix = 'Sealed Pokemon TCG';
    } else if (titleLower.includes('magic') || titleLower.includes('mtg')) {
        gamePrefix = 'Sealed Magic the Gathering';
    } else if (titleLower.includes('one piece')) {
        gamePrefix = 'Sealed One Piece TCG';
    } else if (titleLower.includes('gundam')) {
        gamePrefix = 'Sealed Gundam TCG';
    } else if (titleLower.includes('bandai')) {
        if (titleLower.includes('one piece') || titleLower.includes('op')) {
            gamePrefix = 'Sealed One Piece TCG';
        } else {
            gamePrefix = 'Sealed Bandai';
        }
    }

    return gamePrefix;
}

/**
 * Determina el tipo de producto ACCESSORY basado en el juego
 */
function determineAccessoryProductType(product) {
    const titleLower = product.title?.toLowerCase() || '';
    let gamePrefix = 'Accessory';

    if (titleLower.includes('pokemon') || titleLower.includes('pokémon')) {
        gamePrefix = 'Accessory Pokemon TCG';
    } else if (titleLower.includes('magic') || titleLower.includes('mtg')) {
        gamePrefix = 'Accessory Magic the Gathering';
    } else if (titleLower.includes('one piece')) {
        gamePrefix = 'Accessory One Piece TCG';
    } else if (titleLower.includes('gundam')) {
        gamePrefix = 'Accessory Gundam TCG';
    } else if (titleLower.includes('bandai')) {
        if (titleLower.includes('one piece') || titleLower.includes('op')) {
            gamePrefix = 'Accessory One Piece TCG';
        } else {
            gamePrefix = 'Accessory Bandai';
        }
    }

    return gamePrefix;
}

/**
 * Determina el tipo de producto SINGLE basado en el juego
 */
function determineSingleProductType(product) {
    const titleLower = product.title?.toLowerCase() || '';
    let gamePrefix = 'Single';

    if (titleLower.includes('pokemon') || titleLower.includes('pokémon')) {
        gamePrefix = 'Single Pokemon TCG';
    } else if (titleLower.includes('magic') || titleLower.includes('mtg')) {
        gamePrefix = 'Single Magic the Gathering';
    } else if (titleLower.includes('one piece')) {
        gamePrefix = 'Single One Piece TCG';
    } else if (titleLower.includes('gundam')) {
        gamePrefix = 'Single Gundam TCG';
    } else if (titleLower.includes('bandai')) {
        if (titleLower.includes('one piece') || titleLower.includes('op')) {
            gamePrefix = 'Single One Piece TCG';
        } else {
            gamePrefix = 'Single Bandai';
        }
    }

    return gamePrefix;
}

identifySealedProducts();
