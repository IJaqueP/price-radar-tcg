/**
 * Rutas para Reconciliación de Productos Sellados
 * 
 * Endpoints:
 * POST   /sealed/reconcile     - Ejecutar reconciliación
 * GET    /sealed/stats         - Obtener estadísticas
 * GET    /sealed/mappings      - Listar mappings
 * GET    /sealed/mappings/:id  - Detalle de mapping
 * PUT    /sealed/mappings/:id  - Actualizar mapping
 * DELETE /sealed/mappings/:id  - Eliminar mapping
 */

const express = require('express');
const router = express.Router();
const {
  reconcile,
  runSyncCycle,
  getStats,
  getMappings,
  getMappingDetail,
  deleteMapping,
  updateMapping,
} = require('../controllers/sealedProductReconciliationController');

/**
 * POST /api/sealed/reconcile
 * Ejecuta un ciclo completo de reconciliación de productos sellados
 * 
 * Body:
 * {
 *   "limit": 100,           // Número de productos a procesar
 *   "minConfidence": 70,    // Confianza mínima para guardar
 *   "dryRun": false,        // Si true, no guarda cambios
 *   "verbose": true,        // Si true, imprime logs detallados
 *   "onlyInStock": true,    // Si true, solo procesa stock > 0
 *   "onlyUnmapped": true,   // Si true, excluye ya mapeados
 *   "skuStrict": true,      // Si true, SKU en Shopify exige match exacto por SKU en JustTCG
 *   "matchBySkuOnly": true  // Si true, NO usa fallback por nombre/set
 * }
 */
router.post('/reconcile', reconcile);

/**
 * POST /api/sealed/sync-cycle
 * Ejecuta ciclo completo: reconciliar + refrescar diferencias
 */
router.post('/sync-cycle', runSyncCycle);

/**
 * GET /api/sealed/stats
 * Obtiene estadísticas de los mappings
 */
router.get('/stats', getStats);

/**
 * GET /api/sealed/mappings
 * Lista mappings con filtros opcionales
 * 
 * Query params:
 * ?page=1&limit=50&game=mtg&minConfidence=70&maxConfidence=100&method=hierarchical_search
 */
router.get('/mappings', getMappings);

/**
 * GET /api/sealed/mappings/:id
 * Detalle de un mapping específico
 */
router.get('/mappings/:id', getMappingDetail);

/**
 * PUT /api/sealed/mappings/:id
 * Actualizar un mapping
 */
router.put('/mappings/:id', updateMapping);

/**
 * DELETE /api/sealed/mappings/:id
 * Eliminar un mapping
 */
router.delete('/mappings/:id', deleteMapping);

module.exports = router;
