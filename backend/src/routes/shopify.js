/*
    RUTAS DE SHOPIFY
    Endpoints para gestionar productos desde Shopify
*/

const express = require('express');
const router = express.Router();
const shopifyController = require('../controllers/shopifyController');

// ===========================================================
// SYNC INICIAL
// ===========================================================

/*
    POST /api/shopify/sync/initial

    Ejecuta la sincronización inicial completa
    Obtiene TODOS los productos, los clasifica y retorna para guardar en la base de datos

    ADVERTENCIA: Puede tardar +10 minutos
*/
router.post('/sync/initial', async (req, res) => {
    try {
        const result = await shopifyController.initialSync();

        res.json(
            {
                success: true,
                message: 'Sincronización inicial completada',
                data: {
                    stats: result.stats,
                    total_products: result.products.length,
                    tcg_products: result.tcg_products_only.length
                },
                note: 'Los productos clasificados están listos para guardar en BD (Fase 2)'
            }
        );

    } catch (error) {
        res.status(500).json(
            {
                success: false,
                error: error.message,
                message: 'Error en sincronización inicial'
            }
        );
    }
});

/*
    POST /api/shopify/sync/initial-db
    Sincronización inicial CON guardado en base de datos

    ESTA RUTA GUARDA EN POSTGRESQL
*/
router.post('/sync/initial-db', shopifyController.initialSyncWithDatabase);


// ===========================================================
// OBTENER MUESTRA
// ===========================================================

/*
    GET /api/shopify/sample?limit=50

    Obtiene una muestra de productos para testing (sin sync completo)
*/





// ===========================================================
// ESTADÍSTICAS RÁPIDAS
// ===========================================================

/*
    GET /api/shopify/stats

    Obtiene estadísticas generales (rápido, solo conteo total)
*/
router.get('/stats', async (req, res) => {
    try {
        const result = await shopifyController.getQuickStats();

        res.json(
            {
                success: true,
                data: result
            }
        );

    } catch (error) {
        res.status(500).json(
            {
                success: false,
                error: error.message
            }
        );
    }
});

// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = router;