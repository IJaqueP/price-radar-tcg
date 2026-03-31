/**
 * Controlador de Reconciliación de Productos Sellados
 *
 * Orquesta el proceso completo de matching entre productos Shopify y JustTCG
 * Para productos SELLADOS únicamente: Booster Box, Starter Deck, etc.
 *
 * Flujo:
 * 1. Obtener productos sellados de Shopify sin mapear
 * 2. Parsear títulos para extraer información estructurada
 * 3. Buscar en JustTCG usando jerarquía: Game → Set → Producto → Lenguaje
 * 4. Calcular confianza del matching
 * 5. Guardar mappings con score de confianza
 */

const { ShopifyProduct, SealedProductMapping } = require('../models');
const { Op } = require('sequelize');
const {
  parseSealedProduct,
  isSealedProduct,
} = require('../services/sealedProductParsingService');
const {
  searchByTCGPlayerId,
  searchByVariantSku,
} = require('../services/sealedProductSearchService');
const {
  calculateMatchConfidence,
  classifyConfidenceLevel,
  generateMatchingReport,
} = require('../services/sealedProductConfidenceService');

/**
 * Ejecuta un ciclo de reconciliación para productos sellados
 */
async function reconcileSealedProducts(options = {}) {
  const {
    limit = 100,
    minConfidence = 70, // Solo guardar matches >= 70%
    dryRun = false,
    game = null, // Filtrar por juego específico si se proporciona
    verbose = true,
    onlyInStock = true,
    onlyUnmapped = true,
    skuStrict = true,
  } = options;

  const results = {
    total: 0,
    processed: 0,
    matched: 0,
    unmatched: 0,
    errors: 0,
    mappings: [],
    errors_list: [],
  };

  try {
    // PASO 1: Obtener productos activos desde ShopifyProduct
    const whereClause = {
      status: 'active',
    };

    if (onlyInStock) {
      whereClause.inventory_quantity = { [require('sequelize').Op.gt]: 0 };
    }

    // Priorizar productos sellados ya clasificados en BD para evitar muestreos irrelevantes.
    whereClause.product_type = { [require('sequelize').Op.iLike]: 'Sealed%' };

    const allProducts = await ShopifyProduct.findAll({
      where: whereClause,
      limit: limit * 5,
      order: [['id', 'ASC']],
    });

    // PASO 2: Excluir mapeados si corresponde
    let productsToProcess = allProducts;
    if (onlyUnmapped) {
      const mappedRows = await SealedProductMapping.findAll({
        attributes: ['shopify_product_id'],
        raw: true,
      });
      const mappedIds = new Set(mappedRows.map((r) => r.shopify_product_id));
      productsToProcess = productsToProcess.filter((p) => !mappedIds.has(p.id));
    }

    // PASO 3: Filtrar sellados
    let sealedProducts = productsToProcess.filter((p) => isSealedProduct(p.title));

    // PASO 4: Filtrar por juego si viene en la request
    if (game) {
      const normalizedGame = String(game).toLowerCase().trim();
      sealedProducts = sealedProducts.filter((p) => {
        const parsed = parseSealedProduct(p);
        const parsedGame = String(parsed.game || '').toLowerCase();
        const productType = String(p.product_type || '').toLowerCase();

        if (normalizedGame === 'pokemon') {
          return parsedGame === 'pokemon' || productType.includes('pokemon');
        }
        if (normalizedGame === 'magic' || normalizedGame === 'mtg' || normalizedGame === 'magic-the-gathering') {
          return parsedGame === 'magic-the-gathering' || parsedGame === 'mtg' || productType.includes('magic');
        }
        if (normalizedGame === 'onepiece' || normalizedGame === 'one-piece-card-game') {
          return parsedGame === 'one-piece-card-game' || productType.includes('bandai') || productType.includes('one piece');
        }
        if (normalizedGame === 'gundam') {
          return parsedGame === 'gundam' || productType.includes('gundam') || productType.includes('bandai');
        }

        return parsedGame === normalizedGame || productType.includes(normalizedGame);
      });
    }

    // PASO 4.1: Solo SKU con formato TCGPlayer. Ignorar UPC/EAN por ahora.
    const beforeSkuFilter = sealedProducts.length;
    sealedProducts = sealedProducts.filter((p) =>
      isLikelyTcgplayerSku(p.shopify_sku)
    );
    const skippedNonTcgSku = beforeSkuFilter - sealedProducts.length;

    // PASO 5: Aplicar límite final
    sealedProducts = sealedProducts.slice(0, limit);
    results.total = sealedProducts.length;

    if (verbose) {
      console.log(
        `\n📦 Starting sealed product reconciliation...`
      );
      console.log(`   Found ${results.total} sealed products\n`);
      if (skippedNonTcgSku > 0) {
        console.log(`   Skipped ${skippedNonTcgSku} products with non-TCGPlayer SKU format`);
      }
    }

    // PASO 2: Procesar en lotes con control de rate limiting
    const BATCH_SIZE = 5; // 5 productos concurrentes
    const BATCH_DELAY = 6000; // 6 segundos entre lotes (respeta límite de 10 req/min)

    for (let i = 0; i < sealedProducts.length; i += BATCH_SIZE) {
      const batch = sealedProducts.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      if (verbose) {
        console.log(`🔄 Processing batch ${batchNumber}...`);
      }

      const batchPromises = batch.map((product) =>
        reconcileProduct(product, minConfidence, dryRun, { skuStrict })
      );

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        results.processed++;

        if (result.success) {
          results.matched++;
          results.mappings.push({
            shopifyId: result.shopifyProductId,
            tcgplayerId: result.tcgplayerId,
            confidence: result.confidence,
            method: result.method,
          });

          if (verbose) {
            console.log(
              `   ✓ ${result.productTitle.substring(0, 40)} → ${result.justTCGName} (${result.confidence.toFixed(0)}%)`
            );
          }
        } else {
          results.unmatched++;

          if (verbose) {
            console.log(
              `   ✗ ${result.productTitle.substring(0, 40)} - ${result.error}`
            );
          }

          results.errors_list.push({
            shopifyId: result.shopifyProductId,
            title: result.productTitle,
            error: result.error,
          });
        }
      }

      // Rate limiting entre lotes
      if (i + BATCH_SIZE < sealedProducts.length) {
        if (verbose) {
          console.log(`   ⏳ Waiting 6s to respect rate limits...\n`);
        }
        await sleep(BATCH_DELAY);
      }
    }

    // RESUMEN
    if (verbose) {
      console.log(`\n✅ Reconciliation complete!`);
      console.log(`   Total: ${results.total}`);
      console.log(`   Matched: ${results.matched} (${((results.matched / results.total) * 100).toFixed(1)}%)`);
      console.log(`   Unmatched: ${results.unmatched}`);
      console.log(`   Errors: ${results.errors}\n`);
    }

    return results;
  } catch (error) {
    console.error('Error in reconciliation:', error);
    return {
      ...results,
      errors: 1,
      error: error.message,
    };
  }
}

/**
 * Reconcilia un producto individual
 */
async function reconcileProduct(shopifyProduct, minConfidence = 70, dryRun = false, options = {}) {
  try {
    const { skuStrict = true } = options;

    // Parsear producto
    const parsed = parseSealedProduct(shopifyProduct);

    let searchResult = null;
    let skuMatchAttempted = false;

    // ESTRATEGIA 1: Si existe SKU en Shopify, intentar match exacto por ese SKU
    if (shopifyProduct.shopify_sku) {
      const rawSku = String(shopifyProduct.shopify_sku).trim();
      const numericSku = rawSku.replace(/[^0-9]/g, '');
      skuMatchAttempted = true;

      searchResult = await searchByVariantSku(rawSku);

      if (!searchResult && numericSku && numericSku !== rawSku) {
        searchResult = await searchByVariantSku(numericSku);
      }

      if (searchResult && searchResult.success) {
        searchResult.method = 'variant_sku';
      }

      // ESTRATEGIA 1.1: fallback por TCGPlayer ID extraído del SKU
      if (!searchResult) {
        const tcgplayerId = extractTCGPlayerIdFromSku(rawSku);
        if (tcgplayerId) {
          const guessedGame = parsed.game || inferGameFromProductType(shopifyProduct.product_type);
          searchResult = await searchByTCGPlayerId(tcgplayerId, guessedGame || 'pokemon');
          if (searchResult && searchResult.success) {
            searchResult.method = 'tcgplayer_id';
          }
        }
      }

      // Si SKU strict está activo y el formato SKU lo amerita, exigir match exacto por SKU.
      if (!searchResult && shouldEnforceStrictSku(rawSku, skuStrict)) {
        return {
          success: false,
          shopifyProductId: shopifyProduct.id,
          productTitle: shopifyProduct.title,
          error: `Exact SKU match not found for SKU: ${rawSku}`,
        };
      }
    } else {
      return {
        success: false,
        shopifyProductId: shopifyProduct.id,
        productTitle: shopifyProduct.title,
        error: 'Missing Shopify SKU for SKU-only matching',
      };
    }

    // ESTRATEGIA 2: Si existe TCGPlayer SKU explícitamente, usarlo
    if (!searchResult && shopifyProduct.tcgplayer_sku_id) {
      skuMatchAttempted = true;
      searchResult = await searchByVariantSku(shopifyProduct.tcgplayer_sku_id);

      if (searchResult && searchResult.success) {
        searchResult.method = 'variant_sku';
      }
    }

    // Sin match por SKU: fallo directo.
    if (!searchResult && skuMatchAttempted) {
      return {
        success: false,
        shopifyProductId: shopifyProduct.id,
        productTitle: shopifyProduct.title,
        error: 'No SKU-based match found',
      };
    }

    // Si no se encontró nada
    if (!searchResult || !searchResult.success) {
      return {
        success: false,
        shopifyProductId: shopifyProduct.id,
        productTitle: shopifyProduct.title,
        error: searchResult?.error || 'No match found',
      };
    }

    // Calcular confianza del matching
    const parsedForConfidence = {
      ...parsed,
      game: parsed.game || inferGameFromProductType(shopifyProduct.product_type) || inferGameFromCardId(searchResult.card?.id) || 'pokemon',
      productType: parsed.productType || shopifyProduct.product_type || inferProductTypeFromName(searchResult.card?.name) || 'Sealed Product',
      setName: parsed.setName || searchResult.card?.set_name || searchResult.card?.set || 'Unknown Set',
      language: parsed.language || searchResult.variant?.language || 'English',
      edition: parsed.edition || null,
    };

    const confidenceResult = calculateMatchConfidence(
      shopifyProduct,
      searchResult.card,
      searchResult.variant,
      parsedForConfidence
    );

    // Validar que confianza sea suficiente
    if (confidenceResult.percentage < minConfidence) {
      return {
        success: false,
        shopifyProductId: shopifyProduct.id,
        productTitle: shopifyProduct.title,
        error: `Confidence too low: ${confidenceResult.percentage.toFixed(0)}% < ${minConfidence}%`,
        confidence: confidenceResult.percentage,
      };
    }

    // GUARDAR MAPPING (si no es dry run)
    if (!dryRun) {
      const mappingPayload = {
        shopify_product_id: shopifyProduct.id,
        shopify_variant_id: shopifyProduct.variant_id,
        shopify_title: shopifyProduct.title,
        justtcg_card_id: searchResult.card.id,
        justtcg_variant_id: searchResult.variant.id,
        justtcg_rarity: 'Sealed',
        tcgplayer_id: searchResult.card.tcgplayerId,
        tcgplayer_sku_id: searchResult.variant.tcgplayerSkuId,
        product_type: parsedForConfidence.productType,
        set_name: parsedForConfidence.setName,
        game: parsedForConfidence.game,
        language: parsedForConfidence.language,
        edition: parsedForConfidence.edition,
        match_confidence: confidenceResult.percentage,
        match_method: searchResult.method,
        match_notes: confidenceResult.reasons.join('; '),
        shopify_price: shopifyProduct.current_price,
        justtcg_price: searchResult.variant.price,
        price_difference_pct:
          ((shopifyProduct.current_price - searchResult.variant.price) /
            searchResult.variant.price) *
          100,
      };

      const existing = await SealedProductMapping.findOne({
        where: { shopify_product_id: shopifyProduct.id },
      });

      if (existing) {
        await existing.update(mappingPayload);
      } else {
        await SealedProductMapping.create(mappingPayload);
      }
    }

    return {
      success: true,
      shopifyProductId: shopifyProduct.id,
      productTitle: shopifyProduct.title,
      justTCGName: searchResult.card.name,
      confidence: confidenceResult.percentage,
      method: searchResult.method,
      tcgplayerId: searchResult.card.tcgplayerId,
      variantSkuId: searchResult.variant.tcgplayerSkuId,
    };
  } catch (error) {
    return {
      success: false,
      shopifyProductId: shopifyProduct.id,
      productTitle: shopifyProduct.title,
      error: `Processing error: ${error.message}`,
    };
  }
}

/**
 * Intenta extraer TCGPlayer ID del SKU de Shopify
 * Formatos comunes: "TCG-123456-NM", "123456-BOX", etc.
 */
function extractTCGPlayerIdFromSku(sku) {
  if (!sku) return null;

  // Patrón 1: "TCG-123456" al inicio
  const match1 = sku.match(/^TCG-(\d+)/i);
  if (match1) return match1[1];

  // Patrón 2: Números separados por guión
  const match2 = sku.match(/^(\d+)-/);
  if (match2) return match2[1];

  // Patrón 3: Solo números
  const match3 = sku.match(/^(\d{6,})/);
  if (match3) return match3[1];

  return null;
}

/**
 * Detecta SKU tipo barcode (UPC/EAN/GTIN) que normalmente no matchea directo con JustTCG.
 */
function isLikelyBarcodeSku(sku) {
  if (!sku) return false;
  const clean = String(sku).trim();
  return /^\d{12,14}$/.test(clean);
}

function isLikelyTcgplayerSku(sku) {
  if (!sku) return false;
  const clean = String(sku).trim();

  if (!clean) return false;
  if (isLikelyBarcodeSku(clean)) return false;

  return /^TCG-\d+/i.test(clean) || /^\d+-/.test(clean) || /^\d{6,10}$/.test(clean);
}

/**
 * Solo aplica strict por SKU cuando el formato parece realmente TCGPlayer.
 */
function shouldEnforceStrictSku(sku, skuStrictEnabled) {
  if (!skuStrictEnabled) return false;

  const clean = String(sku || '').trim();
  if (!clean) return false;

  const tcgFormat = /^TCG-\d+/i.test(clean) || /^\d+-/.test(clean) || /^\d{6,10}$/.test(clean);
  if (tcgFormat) return true;

  // UPC/EAN/GTIN: permitir fallback por búsqueda jerárquica.
  if (isLikelyBarcodeSku(clean)) return false;

  // Formato desconocido: mantener strict para evitar matches erróneos.
  return true;
}

function inferGameFromProductType(productType) {
  const value = String(productType || '').toLowerCase();
  if (value.includes('pokemon')) return 'pokemon';
  if (value.includes('magic')) return 'magic-the-gathering';
  if (value.includes('gundam')) return 'gundam';
  if (value.includes('one piece') || value.includes('bandai')) return 'one-piece-card-game';
  if (value.includes('riftbound')) return 'riftbound';
  return null;
}

function inferGameFromCardId(cardId) {
  const value = String(cardId || '').toLowerCase();
  if (value.startsWith('pokemon-')) return 'pokemon';
  if (value.startsWith('mtg-')) return 'magic-the-gathering';
  if (value.startsWith('one-piece-')) return 'one-piece-card-game';
  if (value.startsWith('gundam-')) return 'gundam';
  return null;
}

function inferProductTypeFromName(name) {
  const value = String(name || '');
  if (/booster\s*box/i.test(value)) return 'Booster Box';
  if (/booster\s*pack/i.test(value)) return 'Booster Pack';
  if (/elite\s*trainer\s*box/i.test(value)) return 'Elite Trainer Box';
  if (/starter\s*deck/i.test(value)) return 'Starter Deck';
  if (/bundle/i.test(value)) return 'Bundle';
  return null;
}

/**
 * Refresca precios de API y diferencia porcentual para mappings existentes.
 */
async function refreshMappedPriceDifferences(options = {}) {
  const {
    limit = 300,
    game = null,
    onlyInStock = true,
    verbose = true,
  } = options;

  const threshold = parseFloat(process.env.PRICE_THRESHOLD_PERCENTAGE) || 3;
  const results = {
    total: 0,
    processed: 0,
    refreshed: 0,
    skipped: 0,
    above_threshold: 0,
    errors: 0,
    errors_list: [],
  };

  try {
    const whereMapping = {};
    if (game) {
      whereMapping.game = game;
    }

    const includeShopify = {
      model: ShopifyProduct,
      as: 'shopify_product',
      required: true,
      where: {
        status: 'active',
      },
    };

    if (onlyInStock) {
      includeShopify.where.inventory_quantity = { [Op.gt]: 0 };
    }

    const mappings = await SealedProductMapping.findAll({
      where: whereMapping,
      include: [includeShopify],
      limit,
      order: [['updatedAt', 'DESC']],
    });

    results.total = mappings.length;

    if (verbose) {
      console.log('\n🔄 Refreshing mapped price differences...');
      console.log(`   Mappings to refresh: ${results.total}`);
    }

    for (const mapping of mappings) {
      try {
        const shopifyProduct = mapping.shopify_product;
        const shopifyPrice = parseFloat(shopifyProduct.current_price);

        if (!Number.isFinite(shopifyPrice) || shopifyPrice <= 0) {
          results.skipped++;
          continue;
        }

        let searchResult = null;
        if (mapping.tcgplayer_sku_id) {
          searchResult = await searchByVariantSku(String(mapping.tcgplayer_sku_id));
        }

        if (!searchResult && mapping.tcgplayer_id) {
          searchResult = await searchByTCGPlayerId(String(mapping.tcgplayer_id), mapping.game);
        }

        if (!searchResult || !searchResult.success) {
          results.skipped++;
          continue;
        }

        const apiPrice = parseFloat(searchResult.variant?.price);
        if (!Number.isFinite(apiPrice) || apiPrice <= 0) {
          results.skipped++;
          continue;
        }

        const diffPct = ((shopifyPrice - apiPrice) / apiPrice) * 100;

        await mapping.update({
          shopify_price: shopifyPrice,
          justtcg_price: apiPrice,
          price_difference_pct: diffPct,
          last_price_sync: new Date(),
          last_updated: new Date(),
        });

        results.refreshed++;
        if (Math.abs(diffPct) > threshold) {
          results.above_threshold++;
        }
      } catch (error) {
        results.errors++;
        results.errors_list.push({
          shopify_product_id: mapping.shopify_product_id,
          error: error.message,
        });
      } finally {
        results.processed++;
      }
    }

    if (verbose) {
      console.log(`   Refreshed: ${results.refreshed}`);
      console.log(`   Above ${threshold}%: ${results.above_threshold}`);
      console.log(`   Skipped: ${results.skipped}`);
      console.log(`   Errors: ${results.errors}\n`);
    }

    return results;
  } catch (error) {
    return {
      ...results,
      errors: results.errors + 1,
      error: error.message,
    };
  }
}

/**
 * Ejecuta ciclo completo para dejar dashboard listo:
 * 1) Reconciliar matches
 * 2) Refrescar diferencias de precios
 */
async function runSealedSyncCycle(options = {}) {
  const {
    reconcile = {},
    refresh = {},
    verbose = true,
  } = options;

  const startedAt = new Date();
  const reconcileResults = await reconcileSealedProducts({
    limit: reconcile.limit ?? 100,
    minConfidence: reconcile.minConfidence ?? 70,
    dryRun: reconcile.dryRun ?? false,
    game: reconcile.game ?? null,
    verbose,
    onlyInStock: reconcile.onlyInStock ?? true,
    onlyUnmapped: reconcile.onlyUnmapped ?? true,
    skuStrict: reconcile.skuStrict ?? true,
  });

  const refreshResults = await refreshMappedPriceDifferences({
    limit: refresh.limit ?? 300,
    game: refresh.game ?? reconcile.game ?? null,
    onlyInStock: refresh.onlyInStock ?? true,
    verbose,
  });

  const finishedAt = new Date();
  return {
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    reconcile: reconcileResults,
    refresh: refreshResults,
  };
}

/**
 * Obtiene estadísticas de los mappings
 */
async function getReconciliationStats() {
  const total = await SealedProductMapping.count();
  const excellent = await SealedProductMapping.count({
    where: {
      match_confidence: { [require('sequelize').Op.gte]: 95 },
    },
  });
  const good = await SealedProductMapping.count({
    where: {
      match_confidence: {
        [require('sequelize').Op.gte]: 85,
        [require('sequelize').Op.lt]: 95,
      },
    },
  });
  const acceptable = await SealedProductMapping.count({
    where: {
      match_confidence: {
        [require('sequelize').Op.gte]: 70,
        [require('sequelize').Op.lt]: 85,
      },
    },
  });
  const weak = await SealedProductMapping.count({
    where: {
      match_confidence: {
        [require('sequelize').Op.gte]: 50,
        [require('sequelize').Op.lt]: 70,
      },
    },
  });

  return {
    total,
    byConfidenceLevel: {
      excellent: excellent,
      good: good,
      acceptable: acceptable,
      weak: weak,
      failed: total - excellent - good - acceptable - weak,
    },
    averageConfidence: await SealedProductMapping.sequelize.query(
      'SELECT AVG(match_confidence) as avg FROM SealedProductMappings'
    ),
  };
}

/**
 * Utilidad: sleep
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  reconcileSealedProducts,
  reconcileProduct,
  refreshMappedPriceDifferences,
  runSealedSyncCycle,
  getReconciliationStats,
  extractTCGPlayerIdFromSku,
};
