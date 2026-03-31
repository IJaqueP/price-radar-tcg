const express = require('express');
const router = express.Router();
const skuReconciliationController = require('../controllers/skuReconciliationController');

// FASE 2: Iniciar reconciliación de SKUs
router.get('/start', skuReconciliationController.startReconciliation);

// Obtener estadísticas
router.get('/stats', skuReconciliationController.getStats);

module.exports = router;