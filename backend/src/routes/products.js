/*
    RUTAS DE PRODUCTOS
    Endpoints para gestión de productos y alertas
*/

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');


// ===========================================================
// RUTAS DE PRODUCTOS
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
    PATCH /api/products/:id/price
    Actualiza el precio de un producto en Shopify
    Body: { new_price: number }
*/
router.patch('/:id/price', productController.updateProductPrice);


/*
    POST /api/products/:id/compare
    Fuerza comparación de precio de un producto
*/
router.post('/:id/compare', productController.compareProductPrice);


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = router;