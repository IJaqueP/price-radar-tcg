/*
    FILTROS Y CATEGORIZADORES DE PRODUCTOS

    Funciones para identificar si un producto es TCG, sellado, single, etc
    y clasificarlo por juego
*/

// ===========================================================
// IDENTIFICAR SI ES PRODUCTO TCG
// ===========================================================

/*
    Determina si un producto es TCG

    @param {Object} product - Producto de Shopify
    @returns {boolean} true si es TCG
*/
function isTCGProduct(product) {
    const title = (product.title || '').toLowerCase();
    const vendor = (product.vendor || '').toLowerCase();
    const productType = (product.product_type || '').toLowerCase();
    const tags = (product.tags || '').toLowerCase();

    // Texto combinado para buscar
    const text = `${title} ${vendor} ${productType} ${tags}`;

    // Keywords de TCG
    const tcgKeywords = [
        'magic',
        'mtg',
        'pokemon',
        'pokémon',
        'riftbound',
        'one piece',
        'gundam',
        'trading card',
        'tcg',
        'booster',
        'elite trainer',
        'etb',
        'pokemon sealed',
        'commander',
        'draft',
        'prerelease',
        'mtg sealed',
        'secret lair series',
        'op sealed',
        'booster pack',
        'gundam sealed',
        'booster display',
        'booster',
        'gundam tcg'
    ];

    // Vendor conocidos de TCG
    const tcgVendor = [
        'wizards of the coast',
        'pokemon company',
        'bandai',
        'bushiroad'
    ];

    // Product types de TCG
    const tcgTypes = [
        'tcg',
        'trading card',
        'card game',
        'collectible card'
    ];

    // Verificar keywords
    const hasKeyword = tcgKeywords.some(keyword => text.includes(keyword));

    // Verificar vendors
    const hasTCGVendor = tcgVendor.some(v => vendor.includes(v));

    // Verificar product types
    const hasTCGType = tcgTypes.some(type => productType.includes(type));

    return hasKeyword || hasTCGVendor || hasTCGType;
}

// ===========================================================
// IDENTIFICAR CATEGORÍA (SELLADO vs SINGLE)
// ===========================================================

/*
    Determina si un producto es sellado (booster box, ETB, etc.)
    @param {Object} product - Producto de Shopify
    @returns {boolean} true si es sellado
*/
function isSealedProduct(product) {
    const title = (product.title || '').toLowerCase();
    const tags = (product.tags || '').toLowerCase();
    const text = `${title} ${tags}`;

    // Keywords de productos sellados
    const sealedKeywords = [
        'booster box',
        'boosterbox',
        'elite trainer box',
        'etb',
        'bundle',
        'collection box',
        'build and battle',
        'theme deck',
        'starter deck',
        'structure deck',
        'commander deck',
        'preconstructed',
        'gift box',
        'premium collection',
        'trainer kit',
        'pre-release',
        'prerelease',
        'draft booster',
        'set booster',
        'collector booster',
        'fat pack',
        'toolkit',
        'battle deck',
        'intro pack',
        'pokemon sealed',
        'pokemonsealed',
        'mtg sealed',
        'mtgsealed',
        'op sealed',
        'opsealed',
        'one piece sealed',
        'gundam sealed',
        'gundamsealed',
        'gundamtcg',
        'gundam tcg'
    ];

    return sealedKeywords.some(keyword => text.includes(keyword));
}

/*
    Determina si un producto es single (carta individual)

    @param {Object} product - Producto de Shopify
    @returns {boolean} true si es single
*/
function isSingleCard(product) {
    const title = (product.title || '').toLowerCase();
    const tags = (product.tags || '').toLowerCase();
    const text = `${title} ${tags}`;

    // Keywords de singles
    const singleKeywords = [
        'single',
        'card - ',
        'foil',
        'holo',
        'reverse',
        'rare',
        'mythic',
        'common',
        'uncommon',
        'secret rare',
        'ultra rare',
        'full art',
        'alternate art',
        'extended art',
        'borderless',
        'showcase'
    ];

    // Si tiene keywords de sellado, NO es single
    if (isSealedProduct(product)) {
        return false;
    }

    return singleKeywords.some(keyword => text.includes(keyword));
}

/*
    Determina la categoría del producto

    @param {Object} product - Producto de Shopify
    @returns {string} 'sealed', 'single', 'accessory', 'event', 'other'
*/
function categorizeProduct(product) {
    const title = (product.title || '').toLowerCase();
    const tags = (product.tags || '').toLowerCase();
    const text = `${title} ${tags}`;

    // Verificar si es sellado
    if (isSealedProduct(product)) {
        return 'sealed';
    }

    // Verificar si es single
    if (isSingleCard(product)) {
        return 'single';
    }

    // Verificar si es evento
    const eventKeywords = ['event', 'tournament', 'participation'];
    if (eventKeywords.some(keyword => text.includes(keyword))) {
        return 'event';
    }

    // Verificar si es accesorio
    const accessoryKeywords = [
        'sleeve',
        'deckbox',
        'deck box',
        'playmat',
        'dice',
        'counter',
        'binder',
        'page'
    ];
    if (accessoryKeywords.some(keyword => text.includes(keyword))) {
        return 'accesory';
    }

    return 'other';
}

// ===========================================================
// IDENTIFICAR JUEGO
// ===========================================================

/*
    Identifica a qué juego pertenece el producto

    @param {Object} product - Producto de Shopify
    @returns {string} 'magic', 'pokemon', 'onepiece', 'gundam', 'onepiece', 'unknown'
*/
function identifyGame(product) {
    const title = (product.title || '').toLowerCase();
    const vendor = (product.vendor || '').toLowerCase();
    const tags = (product.tags || '').toLowerCase();
    const productType = (product.product_type || '').toLowerCase();

    const text = `${title} ${vendor} ${tags} ${productType}`;

    // Magic: The Gathering
    if (text.includes('magic') ||
        text.includes('mtg') ||
        vendor.includes('wizards of the coast')
    ) {
    return 'magic';
    }

    // Pokémon
    if (text.includes('pokemon') ||
        text.includes('pokémon') ||
        vendor.includes('pokemon company')
    ) {
        return 'pokemon';
    }

    // Gundam
    if (text.includes('gundam') ||
        text.includes('mobile suit')
    ) {
        return 'gundam';
    }

    // One Piece
    if (text.includes('one piece') ||
        text.includes('onepiece') ||
        text.includes('op') ||
        vendor.includes('bandai')
    ) {
        return 'onepiece';
    }

    // Riftbound
    if (text.includes('riftbound')) {
        return 'riftbound';
    }

    return 'unknown';
}

// ===========================================================
// FUNCIÓN COMPLETA DE CLASIFICACIÓN
// ===========================================================

/*
    Clasifica completamente un producto

    @param {Object} product - Producto de Shopify
    @returns {Object} { isTCG, category, game }
*/
function classifyProduct(product) {
    const ifTCG = isTCGProduct(product);

    if (!isTCG) {
        return {
            isTCG: false,
            category: 'not-tcg',
            game: 'not-tcg'
        };
    }

    return {
        isTCG: true,
        category: categorizeProduct(product),
        game: identifyGame(product)
    };
}

// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    isTCGProduct,
    isSealedProduct,
    isSingleCard,
    categorizeProduct,
    identifyGame,
    classifyProduct
};
