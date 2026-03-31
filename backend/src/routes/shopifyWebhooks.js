const express = require('express');
const router = express.Router();
const { verifyShopifyWebhook } = require('../middleware/shopifyWebhookAuth');
const shopifyWebhookController = require('../controllers/shopifyWebhookController');

const rawJson = express.raw({ type: 'application/json' });

// Crea o actualiza productos/variantes (nombre, SKU, precio, stock, estado, etc.)
router.post('/products/create', rawJson, verifyShopifyWebhook, (req, res) =>
    shopifyWebhookController.handleProductUpsert(req, res)
);

router.post('/products/update', rawJson, verifyShopifyWebhook, (req, res) =>
    shopifyWebhookController.handleProductUpsert(req, res)
);

// Elimina productos borrados en Shopify
router.post('/products/delete', rawJson, verifyShopifyWebhook, (req, res) =>
    shopifyWebhookController.handleProductDelete(req, res)
);

// Ajusta stock ante cambios de inventario por ubicación
router.post('/inventory_levels/update', rawJson, verifyShopifyWebhook, (req, res) =>
    shopifyWebhookController.handleInventoryUpdate(req, res)
);

module.exports = router;
