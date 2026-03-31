/**
 * Controlador de API para Reconciliación de Productos Sellados
 *
 * Endpoints:
 * POST /api/sealed/reconcile - Ejecutar reconciliación
 * GET /api/sealed/stats - Obtener estadísticas
 * GET /api/sealed/mappings - Listar mappings
 */

const {
  reconcileSealedProducts,
  runSealedSyncCycle,
  getReconciliationStats,
} = require('../services/sealedProductReconciliationService');
const { SealedProductMapping } = require('../models');
const { Op } = require('sequelize');

/**
 * POST /api/sealed/reconcile
 * Ejecuta un ciclo de reconciliación de productos sellados
 */
async function reconcile(req, res) {
  try {
    const {
      limit = 100,
      minConfidence = 70,
      dryRun = false,
      game = null,
      verbose = true,
      onlyInStock = true,
      onlyUnmapped = true,
      skuStrict = true,
      matchBySkuOnly = true,
    } = req.body;

    console.log(`\n${'='.repeat(60)}`);
    console.log('SEALED PRODUCTS RECONCILIATION');
    console.log(`${'='.repeat(60)}`);

    const results = await reconcileSealedProducts({
      limit,
      minConfidence,
      dryRun,
      game,
      verbose,
      onlyInStock,
      onlyUnmapped,
      skuStrict,
      matchBySkuOnly,
    });

    return res.json({
      success: true,
      data: results,
      dryRun: dryRun ? 'No changes were saved (dry run mode)' : 'Changes saved to database',
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * POST /api/sealed/sync-cycle
 * Ejecuta ciclo completo:
 * 1) reconciliación de matches
 * 2) refresco de diferencias de precio
 */
async function runSyncCycle(req, res) {
  try {
    const {
      reconcile = {},
      refresh = {},
      verbose = true,
    } = req.body || {};

    const result = await runSealedSyncCycle({
      reconcile,
      refresh,
      verbose,
    });

    return res.json({
      success: true,
      data: result,
      message: 'Ciclo de sync sellado completado',
    });
  } catch (error) {
    console.error('Run sync cycle error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /api/sealed/stats
 * Obtiene estadísticas de los mappings
 */
async function getStats(req, res) {
  try {
    const stats = await getReconciliationStats();

    // Obtener información adicional
    const gameBreakdown = await SealedProductMapping.sequelize.query(`
      SELECT game, COUNT(*) as count, AVG(match_confidence) as avg_confidence
      FROM SealedProductMappings
      GROUP BY game
      ORDER BY count DESC
    `, { raw: true });

    const methodBreakdown = await SealedProductMapping.sequelize.query(`
      SELECT match_method, COUNT(*) as count, AVG(match_confidence) as avg_confidence
      FROM SealedProductMappings
      GROUP BY match_method
      ORDER BY count DESC
    `, { raw: true });

    return res.json({
      success: true,
      data: {
        summary: stats,
        gameBreakdown: gameBreakdown,
        methodBreakdown: methodBreakdown,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /api/sealed/mappings
 * Listar mappings con filtros opcionales
 */
async function getMappings(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      game = null,
      minConfidence = null,
      maxConfidence = null,
      method = null,
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir filtros
    const where = {};

    if (game) {
      where.game = game;
    }

    if (minConfidence !== null) {
      where.match_confidence = {
        ...where.match_confidence,
        [Op.gte]: parseFloat(minConfidence),
      };
    }

    if (maxConfidence !== null) {
      where.match_confidence = {
        ...where.match_confidence,
        [Op.lte]: parseFloat(maxConfidence),
      };
    }

    if (method) {
      where.match_method = method;
    }

    const { count, rows } = await SealedProductMapping.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [['match_confidence', 'DESC']],
      include: [
        {
          model: require('../models/ShopifyProduct'),
          as: 'shopify_product',
          attributes: ['id', 'title', 'current_price'],
        },
      ],
    });

    return res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
        mappings: rows,
      },
    });
  } catch (error) {
    console.error('Get mappings error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /api/sealed/mappings/:id
 * Obtener detalles de un mapping específico
 */
async function getMappingDetail(req, res) {
  try {
    const { id } = req.params;

    const mapping = await SealedProductMapping.findByPk(id);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Mapping not found',
      });
    }

    return res.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    console.error('Get mapping detail error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * DELETE /api/sealed/mappings/:id
 * Eliminar un mapping
 */
async function deleteMapping(req, res) {
  try {
    const { id } = req.params;

    const mapping = await SealedProductMapping.findByPk(id);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Mapping not found',
      });
    }

    await mapping.destroy();

    return res.json({
      success: true,
      message: 'Mapping deleted successfully',
    });
  } catch (error) {
    console.error('Delete mapping error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * PUT /api/sealed/mappings/:id
 * Actualizar un mapping
 */
async function updateMapping(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Campos permitidos para actualizar
    const allowedFields = [
      'match_confidence',
      'match_notes',
      'edition',
      'language',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (field in updateData) {
        updates[field] = updateData[field];
      }
    }

    const mapping = await SealedProductMapping.findByPk(id);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Mapping not found',
      });
    }

    await mapping.update(updates);

    return res.json({
      success: true,
      data: mapping,
      message: 'Mapping updated successfully',
    });
  } catch (error) {
    console.error('Update mapping error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  reconcile,
  runSyncCycle,
  getStats,
  getMappings,
  getMappingDetail,
  deleteMapping,
  updateMapping,
};
