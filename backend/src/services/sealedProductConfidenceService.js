/**
 * Servicio de Confianza de Matching para Productos Sellados
 *
 * Calcula un score de confianza (0-100) para validar qué tan correcto es
 * el matching entre un producto Shopify y su equivalente en JustTCG
 */

const {
  normalizeString,
  similarity,
} = require('./sealedProductParsingService');

/**
 * Calcula confianza total del matching
 *
 * Factores evaluados:
 * 1. Coincidencia de tipo de producto (40 puntos) - CRÍTICO
 * 2. Coincidencia de set (30 puntos) - CRÍTICO
 * 3. Coincidencia de lenguaje (20 puntos)
 * 4. Coincidencia de edición (5 puntos)
 * 5. Validación de rarity = "Sealed" (5 puntos)
 */
function calculateMatchConfidence(shopifyProduct, justTCGCard, variant, parsed) {
  let score = 0;
  const maxScore = 100;
  const reasons = [];

  // ===== FACTOR 1: TIPO DE PRODUCTO (40 puntos) =====
  if (parsed.productType && justTCGCard.name) {
    const normShopifyType = normalizeString(parsed.productType);
    const normCardName = normalizeString(justTCGCard.name);

    // Búsqueda exacta
    if (normCardName.includes(normShopifyType)) {
      score += 40;
      reasons.push('✓ Exact product type match');
    } else {
      // Búsqueda fuzzy
      const sim = similarity(normCardName, normShopifyType);
      if (sim >= 80) {
        score += 35;
        reasons.push(`~ Product type fuzzy match (${sim.toFixed(0)}%)`);
      } else if (sim >= 60) {
        score += 20;
        reasons.push(`⚠ Weak product type match (${sim.toFixed(0)}%)`);
      } else {
        reasons.push(`✗ Product type mismatch`);
      }
    }
  }

  // ===== FACTOR 2: NOMBRE DEL SET (30 puntos) =====
  if (parsed.setName && justTCGCard.set_name) {
    const normShopifySet = normalizeString(parsed.setName);
    const normCardSet = normalizeString(justTCGCard.set_name);

    // Búsqueda exacta
    if (normShopifySet === normCardSet) {
      score += 30;
      reasons.push('✓ Exact set match');
    } else {
      // Búsqueda fuzzy
      const sim = similarity(normShopifySet, normCardSet);
      if (sim >= 85) {
        score += 28;
        reasons.push(`✓ Set match (${sim.toFixed(0)}%)`);
      } else if (sim >= 70) {
        score += 20;
        reasons.push(`~ Set fuzzy match (${sim.toFixed(0)}%)`);
      } else if (sim >= 50) {
        score += 10;
        reasons.push(`⚠ Weak set match (${sim.toFixed(0)}%)`);
      } else {
        reasons.push(`✗ Set mismatch`);
      }
    }
  }

  // ===== FACTOR 3: LENGUAJE (20 puntos) =====
  if (parsed.language && variant.language) {
    if (parsed.language === variant.language) {
      score += 20;
      reasons.push(`✓ Exact language match (${parsed.language})`);
    } else {
      // Si esperamos English pero no lo encontramos, penalizar menos
      if (parsed.language === 'English' && variant.language !== 'English') {
        score += 10;
        reasons.push(`⚠ Expected English, got ${variant.language}`);
      } else if (variant.language === 'English') {
        score += 15;
        reasons.push(`~ Using English as default`);
      } else {
        reasons.push(`✗ Language mismatch: ${parsed.language} vs ${variant.language}`);
      }
    }
  }

  // ===== FACTOR 4: EDICIÓN (5 puntos) =====
  if (parsed.edition && variant.printing) {
    if (variant.printing.includes(parsed.edition)) {
      score += 5;
      reasons.push(`✓ Edition match (${parsed.edition})`);
    } else {
      reasons.push(`⚠ Edition mismatch: expected ${parsed.edition}, got ${variant.printing}`);
    }
  } else if (!parsed.edition) {
    // Si no hay edición especificada en Shopify, es OK
    score += 5;
    reasons.push(`✓ No edition required`);
  }

  // ===== FACTOR 5: VALIDACIÓN (5 puntos) =====
  if (justTCGCard.rarity === 'Sealed' && variant.condition === 'Sealed') {
    score += 5;
    reasons.push(`✓ Sealed product validated`);
  } else {
    reasons.push(`✗ Not a sealed product`);
  }

  return {
    confidenceScore: Math.min(score, maxScore),
    maxScore: maxScore,
    percentage: (Math.min(score, maxScore) / maxScore) * 100,
    reasons: reasons,
    factors: {
      productType: Math.min(40, score),
      setName: score > 40 ? Math.min(30, score - 40) : 0,
      language: score > 70 ? Math.min(20, score - 70) : 0,
      edition: score > 90 ? Math.min(5, score - 90) : 0,
      validation: score >= 95 ? 5 : 0,
    },
  };
}

/**
 * Clasifica el nivel de confianza del matching
 */
function classifyConfidenceLevel(confidencePercentage) {
  if (confidencePercentage >= 95) {
    return {
      level: 'EXCELLENT',
      description: 'Muy confiable, usar sin revisión',
      color: '🟢',
      actionRequired: false,
    };
  } else if (confidencePercentage >= 85) {
    return {
      level: 'GOOD',
      description: 'Confiable, revisión recomendada',
      color: '🟢',
      actionRequired: false,
    };
  } else if (confidencePercentage >= 70) {
    return {
      level: 'ACCEPTABLE',
      description: 'Aceptable, verificación manual sugerida',
      color: '🟡',
      actionRequired: true,
    };
  } else if (confidencePercentage >= 50) {
    return {
      level: 'WEAK',
      description: 'Débil, revisión urgente necesaria',
      color: '🟠',
      actionRequired: true,
    };
  } else {
    return {
      level: 'FAILED',
      description: 'Fallido, rechazar este matching',
      color: '🔴',
      actionRequired: true,
    };
  }
}

/**
 * Detecta si hay información conflictiva o inconsistente
 */
function detectConflicts(shopifyProduct, justTCGCard, variant, parsed) {
  const conflicts = [];

  // Conflicto: el producto Shopify es de un juego pero JustTCG es de otro
  if (parsed.game && justTCGCard.game) {
    const normalizedShopifyGame = normalizeString(parsed.game);
    const normalizedCardGame = normalizeString(justTCGCard.game);

    if (
      normalizedShopifyGame !== normalizedCardGame &&
      !normalizedCardGame.includes(normalizedShopifyGame)
    ) {
      conflicts.push({
        type: 'GAME_MISMATCH',
        severity: 'HIGH',
        message: `Game mismatch: Shopify="${parsed.game}", JustTCG="${justTCGCard.game}"`,
      });
    }
  }

  // Conflicto: tipo de producto no es "Sealed"
  if (justTCGCard.rarity !== 'Sealed') {
    conflicts.push({
      type: 'NOT_SEALED',
      severity: 'CRITICAL',
      message: `Product is not sealed: rarity="${justTCGCard.rarity}"`,
    });
  }

  return conflicts;
}

/**
 * Genera un reporte detallado del matching
 */
function generateMatchingReport(
  shopifyProduct,
  justTCGCard,
  variant,
  parsed,
  confidenceResult
) {
  const conflicts = detectConflicts(shopifyProduct, justTCGCard, variant, parsed);
  const classificationLevel = classifyConfidenceLevel(
    confidenceResult.percentage
  );

  return {
    summary: {
      shopifyProductId: shopifyProduct.id,
      shopifyTitle: shopifyProduct.title,
      justTCGCardId: justTCGCard.id,
      justTCGCardName: justTCGCard.name,
      variantId: variant.id,
    },
    confidence: {
      score: confidenceResult.confidenceScore,
      percentage: confidenceResult.percentage.toFixed(2),
      level: classificationLevel.level,
      description: classificationLevel.description,
      shouldAccept: confidenceResult.percentage >= 70,
      requiresReview: confidenceResult.percentage < 85,
    },
    details: {
      game: {
        shopify: parsed.game,
        justTCG: justTCGCard.game,
        match: parsed.game === justTCGCard.game,
      },
      set: {
        shopify: parsed.setName,
        justTCG: justTCGCard.set_name,
        match: normalizeString(parsed.setName) === normalizeString(justTCGCard.set_name),
      },
      productType: {
        shopify: parsed.productType,
        justTCG: justTCGCard.name,
        match: normalizeString(parsed.productType).includes(normalizeString(justTCGCard.name)),
      },
      language: {
        shopify: parsed.language,
        justTCG: variant.language,
        match: parsed.language === variant.language,
      },
      edition: {
        shopify: parsed.edition || 'None',
        justTCG: variant.printing,
        match: !parsed.edition || variant.printing.includes(parsed.edition),
      },
    },
    tcgplayerIds: {
      productId: justTCGCard.tcgplayerId,
      variantSkuId: variant.tcgplayerSkuId,
      price: variant.price,
    },
    conflicts: conflicts,
    reasons: confidenceResult.reasons,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  calculateMatchConfidence,
  classifyConfidenceLevel,
  detectConflicts,
  generateMatchingReport,
};
