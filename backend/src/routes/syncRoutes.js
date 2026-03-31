const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// FASE 1: Sincronizar productos desde Shopify
router.get('/shopify-products', syncController.syncShopifyProducts);

// Obtener estadísticas
router.get('/stats', syncController.getStats);

module.exports = router;