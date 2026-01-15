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

// ===========================================================
// CREAR APLICACIÓN EXPRESS
// ===========================================================

// express() crea una instancia de la aplicación 
const app = express();

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
        origin: '*', // Permitir todos los orígenes (en producción, especificar dominio exacto)
        methods: ['GET', 'POST', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
));

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
                products: '/api/products'
            }
        }
    );
});

/**
    HEALTH CHECK
        - GET /api/health
        Endpoint para verificar que el servidor está funcionando
        Útil para monitorio y deployment
*/
app.get('/api/health', (req, res) => {
    res.json(
        {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(), // Segundos desde que arrancó el servidor
            environment: process.env.NODE_ENV || 'development'
        }
    );
});

// ===========================================================
// IMPORTAR Y USAR RUTAS DE LA API
// ===========================================================

// Rutas de Shopify
const shopifyRoutes = require('./routes/shopify');
app.use('/api/shopify', shopifyRoutes);

// Rutas de productos
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);


// ===========================================================
// RUTA 404 - NO ENCONTRADA
// ===========================================================

/*
    Esta ruta se ejecutará si ninguna otra ruta coincide
    DEBE estar al final, después de todas las rutas válidas
*/
app.use((req, res) => {
    res.status(404).json(
        {
            error: 'Ruta no encontrada',
            message: `La ruta ${req.method} ${req.path} no existe`,
            availableEndpoints: [
                'GET /',
                'GET /api/health',
                'GET /api/shopify/stats',
                'POST /api/shopify/sync/initial'
            ]
        }
    );
});

// ===========================================================
// MANEJO DE ERRORES GLOBALES
// ===========================================================

/*
    Este middleware captura TODOS los errores que ocurran en la aplicación
    Express sabe que es un error handler porque tiene 4 parámetros (err, req, res, next)
*/
app.use((err, req, res, next) => {
    console.error('❌ ERROR EN LA APLICACIÓN:');
    console.error(err.stack); // Muestra el stack trace del error

    // Determinar el código de estado HTTP
    const statusCode = err.statusCode || 500;

    // En desarrollo, mostrar el error completo
    // En producción, ocultar detalles sensibles
    const errorResponse = {
        error: err.message || 'Error interno del servidor',
        status: statusCode
    };

    // Solo en desarrollo, agregar el stack trace
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err;
    }

    res.status(statusCode).json(errorResponse);
});

// ===========================================================
// EXPORTAR LA APLICACIÓN
// ===========================================================

// Exportar app para que server.js pueda usarla
module.exports = app;


// ===========================================================
// INICIAR CRON JOBS
// ===========================================================

/*
const { startCronJobs } = require('./jobs/syncJob');

// Iniciará cron jobs si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
    startCronJobs();
}

*/