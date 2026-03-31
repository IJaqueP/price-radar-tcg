/**
 * Servicio de Búsqueda Jerárquica para Productos Sellados en JustTCG
 *
 * Implementa la búsqueda jerárquica:
 * Game → Set → Tipo de Producto → Lenguaje → Edición
 *
 * Utiliza el endpoint /cards de JustTCG pero filtrando por:
 * - rarity = "Sealed"
 * - printing = tipo de producto
 * - language = idioma
 */

const axios = require('axios');
const {
  normalizeString,
  similarity,
  levenshtein,
} = require('./sealedProductParsingService');

const BASE_URL = process.env.JUSTTCG_BASE_URL || 'https://api.justtcg.com/v1';
const API_KEY = process.env.JUSTTCG_API_KEY;

/**
 * Cliente HTTP configurado para JustTCG
 */
const justTCGClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * PASO 1: Obtener información del SET desde JustTCG
 */
async function findSet(game, setNameQuery) {
  try {
    const response = await justTCGClient.get('/sets', {
      params: {
        game: game,
        q: setNameQuery,
        limit: 20,
        orderBy: 'name',
      },
    });

    if (!response.data.data || response.data.data.length === 0) {
      return null;
    }

    // Retornar el SET que más coincida con el query
    const sets = response.data.data;
    
    // Si hay coincidencia exacta, usarla
    const exactMatch = sets.find(
      (s) => normalizeString(s.name) === normalizeString(setNameQuery)
    );
    if (exactMatch) return exactMatch;

    // Si no, usar el que tenga mayor similitud
    const bestMatch = sets.reduce((best, current) => {
      const currentSimilarity = similarity(
        normalizeString(current.name),
        normalizeString(setNameQuery)
      );
      const bestSimilarity = similarity(
        normalizeString(best.name),
        normalizeString(setNameQuery)
      );
      return currentSimilarity > bestSimilarity ? current : best;
    });

    return bestMatch;
  } catch (error) {
    console.error(`Error finding set ${setNameQuery}:`, error.message);
    return null;
  }
}

/**
 * PASO 2: Buscar productos SELLADOS en un SET específico
 */
async function findSealedProductsInSet(game, setId, productTypeQuery) {
  try {
    const response = await justTCGClient.get('/cards', {
      params: {
        game: game,
        set: setId,
        q: productTypeQuery,  // "Booster Box", "Starter Deck", etc.
        limit: 50,
        include_null_prices: false,
      },
    });

    if (!response.data.data) {
      return [];
    }

    // Filtrar SOLO productos SELLADOS (rarity === "Sealed")
    const sealedProducts = response.data.data.filter(
      (card) => card.rarity === 'Sealed'
    );

    return sealedProducts;
  } catch (error) {
    console.error(
      `Error finding sealed products in set ${setId}:`,
      error.message
    );
    return [];
  }
}

/**
 * PASO 3: Encontrar la variante correcta por LENGUAJE y EDICIÓN
 */
function findVariantByLanguageAndEdition(product, targetLanguage, targetEdition) {
  if (!product.variants || product.variants.length === 0) {
    return null;
  }

  // 1. Búsqueda exacta: lenguaje + edición
  let variant = product.variants.find(
    (v) =>
      v.language === targetLanguage &&
      (!targetEdition || v.printing.includes(targetEdition))
  );

  if (variant) {
    return {
      variant,
      matchType: 'exact',
      confidence: 100,
    };
  }

  // 2. Búsqueda por lenguaje (edición puede no coincidir)
  variant = product.variants.find((v) => v.language === targetLanguage);

  if (variant) {
    return {
      variant,
      matchType: 'language_match',
      confidence: 90,
      note: `Edition mismatch: expected "${targetEdition}", got "${variant.printing}"`,
    };
  }

  // 3. Fallback: English es idioma por defecto
  if (targetLanguage !== 'English') {
    variant = product.variants.find((v) => v.language === 'English');
    if (variant) {
      return {
        variant,
        matchType: 'default_english',
        confidence: 70,
        note: `Language not found, using English instead`,
      };
    }
  }

  // 4. Última opción: usar la primera variante disponible
  return {
    variant: product.variants[0],
    matchType: 'first_available',
    confidence: 50,
    note: `No exact language match, using first available variant: ${product.variants[0].language}`,
  };
}

/**
 * BÚSQUEDA JERÁRQUICA PRINCIPAL
 *
 * Busca un producto sellado en JustTCG siguiendo esta jerarquía:
 * 1. Game
 * 2. Set
 * 3. Tipo de Producto Sellado
 * 4. Lenguaje
 * 5. Edición
 */
async function searchSealedProduct(
  game,
  setName,
  productType,
  language = 'English',
  edition = null
) {
  try {
    // Validaciones iniciales
    if (!game || !setName || !productType) {
      return {
        success: false,
        error: 'Missing required parameters: game, setName, productType',
        confidence: 0,
      };
    }

    // PASO 1: Encontrar el SET
    const setData = await findSet(game, setName);

    if (!setData) {
      return {
        success: false,
        error: `Set not found: "${setName}" for game "${game}"`,
        confidence: 0,
      };
    }

    // PASO 2: Buscar productos SELLADOS en el SET
    const sealedProducts = await findSealedProductsInSet(
      game,
      setData.set,
      productType
    );

    if (sealedProducts.length === 0) {
      return {
        success: false,
        error: `No sealed products found for "${productType}" in set "${setName}"`,
        confidence: 0,
        suggestion: `Try searching for different product type in this set`,
      };
    }

    // PASO 3: Seleccionar el producto más relevante
    // (Si hay múltiples, usar el primero que coincida con el nombre)
    const selectedProduct = sealedProducts[0];

    // PASO 4: Encontrar la variante correcta por lenguaje/edición
    const variantMatch = findVariantByLanguageAndEdition(
      selectedProduct,
      language,
      edition
    );

    if (!variantMatch) {
      return {
        success: false,
        error: `No variants found for product "${selectedProduct.name}"`,
        confidence: 0,
      };
    }

    return {
      success: true,
      card: selectedProduct,
      variant: variantMatch.variant,
      set: setData,
      matchDetails: {
        matchType: variantMatch.matchType,
        confidence: variantMatch.confidence,
        note: variantMatch.note,
      },
    };
  } catch (error) {
    console.error('Error in hierarchical search:', error);
    return {
      success: false,
      error: `Search error: ${error.message}`,
      confidence: 0,
    };
  }
}

/**
 * BÚSQUEDA POR TCGPlayer ID (Método rápido)
 */
async function searchByTCGPlayerId(tcgplayerId, game = 'mtg') {
  try {
    const response = await justTCGClient.get('/cards', {
      params: {
        tcgplayerId: tcgplayerId,
        game: game,
        include_null_prices: false,
      },
    });

    if (!response.data.data || response.data.data.length === 0) {
      return null;
    }

    const product = response.data.data[0];

    // JustTCG puede devolver rarity vacío para algunos sellados (especialmente Pokemon).
    // Si vino por tcgplayerId exacto y tiene variantes, lo consideramos válido.
    if (!product.variants || product.variants.length === 0) {
      return null;
    }

    return {
      success: true,
      card: product,
      variant: product.variants[0],
      method: 'tcgplayer_id',
      confidence: 99,
    };
  } catch (error) {
    console.error(`Error searching by TCGPlayer ID ${tcgplayerId}:`, error.message);
    return null;
  }
}

/**
 * BÚSQUEDA POR SKU DE VARIANTE (Método ultra-rápido)
 */
async function searchByVariantSku(tcgplayerSkuId) {
  try {
    const normalizedSku = String(tcgplayerSkuId).trim();

    const response = await justTCGClient.get('/cards', {
      params: {
        tcgplayerSkuId: normalizedSku,
        include_null_prices: false,
      },
    });

    if (!response.data.data || response.data.data.length === 0) {
      return null;
    }

    const product = response.data.data[0];
    const variant = product.variants.find(
      (v) => String(v.tcgplayerSkuId) === normalizedSku
    );

    if (!variant) {
      return null;
    }

    return {
      success: true,
      card: product,
      variant: variant,
      method: 'variant_sku',
      confidence: 98,
    };
  } catch (error) {
    console.error(
      `Error searching by variant SKU ${tcgplayerSkuId}:`,
      error.message
    );
    return null;
  }
}

/**
 * BÚSQUEDA POR LOTES (Batch Lookup) para múltiples productos
 * 
 * Nota: Actualmente soporta máximo 20 items en plan free,
 * 100 en pro, 200 en enterprise
 */
async function batchSearchByTCGPlayerId(tcgplayerIds, game = 'mtg') {
  try {
    const batchRequests = tcgplayerIds.map((id) => ({
      tcgplayerId: id,
    }));

    const response = await justTCGClient.post('/cards', batchRequests);

    if (!response.data.data) {
      return [];
    }

    // Filtrar solo productos sellados
    return response.data.data.filter((card) => card.rarity === 'Sealed');
  } catch (error) {
    console.error('Error in batch search:', error.message);
    return [];
  }
}

module.exports = {
  findSet,
  findSealedProductsInSet,
  findVariantByLanguageAndEdition,
  searchSealedProduct,
  searchByTCGPlayerId,
  searchByVariantSku,
  batchSearchByTCGPlayerId,
};
