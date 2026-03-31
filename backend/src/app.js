/*
    PRICE RADAR TCG - EXPRESS APP
    Configuración de la aplicación Express

    Este archivo hace lo siguiente:
        1. Crea la aplicación Express
        2. Configura middlewares (CORS, JSON parser, etc)
        3. Define rutas básicas
        4. Maneja errores globales

    ❌ NO INICIA EL SERVIDOR, esto ya se hace en server.js
*/

// ===========================================================
// IMPORTACIÓN DE DEPENDENCIAS
// ===========================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const syncRoutes = require('./routes/syncRoutes');
const reconcileRoutes = require('./routes/reconcileRoutes');
const sealedRoutes = require('./routes/sealedRoutes');

// ===========================================================
// CREAR APLICACIÓN EXPRESS
// ===========================================================

// express() crea una instancia de la aplicación 
const app = express();
const shopifyWebhookRoutes = require('./routes/shopifyWebhooks');

// ===========================================================
// MIDDLEWARES GLOBALES
// ===========================================================

/*
    MIDDLEWARES: ¿Qué es?
    Son funciones que se ejecutan ANTES de llegar a tus rutas.
    Se ejecutan en orden, desde arriba hacia abajo.
    Un ejemplo de flujo sería el siguiente:
        1. Llega una petición: GET/api/products
        2. Pasa por CORS middleware -> Agrega headers de seguridad
        3. Pasa por JSON middleware -> Parsea el body si viene en JSON
        4. Llega a tu ruta -> Ejecuta tu código
        5. Responde al cliente
*/


// CORS: Permite que el frontend (otro dominio/puerto) haga peticiones al backend
app.use(cors(
    {
        origin: '*',
        methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
        credentials: false,
        maxAge: 86400
    }
));

// Webhooks de Shopify requieren body raw para validar firma HMAC.
app.use('/api/shopify/webhooks', shopifyWebhookRoutes);

// JSON Parser: Convierte el body de las peticiones JSON a objeto JavaScript
// Ejemplo: { "name": "Charizard" } -> req.body.name === "Charizard"
app.use(express.json());

// URL Encoded: Parsea formularios HTML tradicionales
app.use(express.urlencoded({ extended: true }));

// Logger simple: Registra todas las peticiones (desarrollo)
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next(); //next() pasa al siguiente middleware o ruta
});

// ===========================================================
// RUTAS BÁSICAS
// ===========================================================

/*
    RUTA RAÍZ
        - GET /
        Responde con información básica de la API
*/
app.get('/', (req, res) => {
    res.json(
        {
            message: 'Price Radar TCG - API Backend',
            version: '1.0.0',
            status: 'active',
            endpoints: {
                health: '/api/health',
                products: '/api/products',
                mtg: '/api/mtg'
            }
        }
    );
});

// Test endpoint simple
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working!',
        timestamp: new Date().toISOString()
    });
});


// ===========================================================
// IMPORTAR Y USAR RUTAS DE LA API
// ===========================================================

// Rutas de Health Check
const healthRoutes = require('./routes/health');
app.use('/api', healthRoutes);

// Rutas de Shopify
const shopifyRoutes = require('./routes/shopify');
app.use('/api/shopify', shopifyRoutes);

// Rutas de productos
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

// Rutas de MTG (Magic: The Gathering)
const mtgRoutes = require('./routes/mtg');
app.use('/api/mtg', mtgRoutes);

// Ruta de sincronización con Shopify
app.use('/api/sync', syncRoutes);

// Rutas de reconciliación SKU
app.use('/api/reconcile', reconcileRoutes);

// Rutas de reconciliación de productos sellados
app.use('/api/sealed', sealedRoutes);

// ===========================================================
// SERVIR FRONTEND (archivos estáticos)
// ===========================================================
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Cualquier ruta que no sea /api/* sirve index.html (SPA fallback)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ===========================================================
// MANEJO DE ERRORES GLOBALES
// ===========================================================

// Manejador de rutas no encontradas (404)
app.use(notFoundHandler);

// Manejador global de errores (500, etc)
app.use(errorHandler);


// ===========================================================
// EXPORTAR LA APLICACIÓN
// ===========================================================

// Exportar app para que server.js pueda usarla
module.exports = app;


// ===========================================================
// INICIAR CRON JOBS
// ===========================================================

const { startMtgSyncCron } = require('./jobs/mtgSyncCron');

// Iniciar cron job de MTG en producción
if (process.env.NODE_ENV === 'production') {
    startMtgSyncCron();
    console.log('✅ Cron jobs MTG iniciados');
}