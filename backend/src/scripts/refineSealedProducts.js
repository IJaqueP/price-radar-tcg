/**
 * Script para refinar productos "Sealed" genéricos
 * Clasifica en: MTG, Pokémon, One Piece, Gundam o Accessory
 * 
 * Ejecutar: node refineSealedProducts.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const ShopifyProduct = require('../models/ShopifyProduct');

// Palabras clave para cada juego
const GAME_KEYWORDS = {
    'mtg': ['magic', 'mtg', 'gathering', 'planeswalker', 'mana', 'enchantment', 'creature', 'sorcery', 'instant', 'artifact', 'land', 'spell'],
    'pokemon': ['pokemon', 'pokémon', 'pikachu', 'charizard', 'blastoise', 'venusaur', 'pokéball', 'tcg'],
    'one-piece': ['one piece', 'op', 'luffy', 'zoro', 'nami', 'sanji', 'brook', 'straw hat', 'mugiwara', 'opsealed'],
    'gundam': ['gundam', 'mobile suit', 'ms', 'zeon', 'newtypes', 'amuro', 'char'],
    'bandai': ['bandai']
};

async function refineSealedProducts() {
    try {
        console.log('🔍 Refinando productos "Sealed" genéricos...\n');

        await sequelize.authenticate();
        console.log('✅ Conexión a BD establecida\n');

        const BATCH_SIZE = 5000;
        let offset = 0;
        let totalRefined = 0;
        let gameStats = {
            'mtg': 0,
            'pokemon': 0,
            'one-piece': 0,
            'gundam': 0,
            'accessory': 0
        };

        while (true) {
            // Obtener lote de productos "Sealed" genéricos
            const products = await ShopifyProduct.findAll({
                attributes: ['id', 'title', 'vendor', 'raw_data'],
                where: { product_type: 'Sealed' },
                raw: true,
                limit: BATCH_SIZE,
                offset: offset
            });

            if (products.length === 0) break;

            console.log(`📦 Procesando lote: offset ${offset} - ${offset + products.length}`);

            for (const product of products) {
                const classification = classifyProduct(product);
                const newProductType = getProductType(classification);

                await ShopifyProduct.update(
                    { product_type: newProductType },
                    { where: { id: product.id }, individualHooks: false }
                );

                gameStats[classification]++;
                totalRefined++;
            }

            offset += BATCH_SIZE;
        }

        console.log(`\n✅ Refinamiento completado:`);
        console.log(`   📦 Productos procesados: ${totalRefined}`);
        console.log(`\n📊 Clasificación final:`);
        console.log(`   🎴 Magic the Gathering: ${gameStats['mtg']}`);
        console.log(`   🔴 Pokémon: ${gameStats['pokemon']}`);
        console.log(`   ⚔️  One Piece: ${gameStats['one-piece']}`);
        console.log(`   🤖 Gundam: ${gameStats['gundam']}`);
        console.log(`   🛠️  Accesorios: ${gameStats['accessory']}\n`);

        // Verificar conteos finales por tipo
        const finalCounts = await ShopifyProduct.findAll({
            attributes: [
                'product_type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('product_type')),
                'LIKE',
                '%sealed%'
            ),
            group: ['product_type'],
            raw: true
        });

        console.log('📊 Estado final de la BD:');
        for (const row of finalCounts) {
            console.log(`   ${row.product_type}: ${row.count}`);
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * Clasifica un producto en uno de los juegos soportados o como accessory
 */
function classifyProduct(product) {
    const titleLower = product.title?.toLowerCase() || '';
    const vendorLower = product.vendor?.toLowerCase() || '';

    // Chequear vendor primero
    if (vendorLower.includes('magic')) {
        return 'mtg';
    }
    if (vendorLower.includes('pokemon') || vendorLower.includes('pokémon')) {
        return 'pokemon';
    }
    if (vendorLower.includes('bandai')) {
        // Bandai puede ser One Piece o Gundam
        if (titleLower.includes('one piece') || titleLower.includes('op')) {
            return 'one-piece';
        }
        return 'gundam'; // Default para Bandai
    }

    // Chequear título
    for (const game in GAME_KEYWORDS) {
        const keywords = GAME_KEYWORDS[game];
        for (const keyword of keywords) {
            if (titleLower.includes(keyword)) {
                // Validaciones adicionales para One Piece
                if (game === 'one-piece' && titleLower.includes('piece')) {
                    return 'one-piece';
                }
                // Evitar falsos positivos
                if (game === 'mtg' && (titleLower.includes('pokemon') || titleLower.includes('bandai'))) {
                    continue;
                }
                return game;
            }
        }
    }

    // Si no coincide con ningún juego
    return 'accessory';
}

/**
 * Obtiene el product_type correcto basado en la clasificación
 */
function getProductType(classification) {
    const types = {
        'mtg': 'Sealed Magic the Gathering',
        'pokemon': 'Sealed Pokemon TCG',
        'one-piece': 'Sealed One Piece TCG',
        'gundam': 'Sealed Gundam TCG',
        'accessory': 'Accessory'
    };
    return types[classification] || 'Accessory';
}

refineSealedProducts();
