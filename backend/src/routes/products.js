/*
    RUTAS DE PRODUCTOS
    Endpoints para gestión de productos y alertas
*/

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const sealedProductsController = require('../controllers/sealedProductsController');


// ===========================================================
// RUTAS DE PRODUCTOS SELLADOS
// ===========================================================

/*
    GET /api/products/sealed/:game
    Obtiene productos sellados por juego
    Params: game (magic, pokemon, onepiece, gundam, riftbound, accessory)
    Query: search, page, limit, sort, order
*/
router.get('/sealed/:game', sealedProductsController.getSealedProductsByGame);


// ===========================================================
// RUTAS DE PRODUCTOS (GENERAL)
// ===========================================================

/*
    GET /api/products/alerts
    Obtiene productos con alertas de precio
    Query params: game, category, limit
*/
router.get('/alerts', productController.getProductAlerts);


/*
    GET /api/products/list
    Lista todos los productos TCG
    Query params: game, category, page, limit
*/
router.get('/list', productController.listProducts);


/*
    GET /api/products/:id
    Obtiene detalle de un producto específico
*/
router.get('/:id', productController.getProductDetail);


/*
    PATCH /api/products/:id/update
    Actualiza precio y/o stock de un producto (BD + Shopify)
    Body: { new_price?: number, new_stock?: number }
*/
router.patch('/:id/update', sealedProductsController.updateProduct);


/*
    POST /api/products/:id/compare
    Fuerza comparación de precio de un producto
*/
router.post('/:id/compare', productController.compareProductPrice);


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = router;