/*
    HEALTH CHECK ROUTES

    Endpoints para verificar estado del servidor
*/

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');


// ===========================================================
// HEALTH CHECK BÁSICO
// ===========================================================

router.get('/health', async (req, res) => {
    res.json(
        {
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV
        }
    );
});


// ===========================================================
// HEALTH CHECK DETALLADO
// ===========================================================

router.get('/health/detailed', async (req, res) => {
    const health = {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        checks: {}
    };

    // Check 1: Base de datos
    try {
        await sequelize.authenticate();
        health.checks.database = {
            status: 'healthy',
            message: 'Conexión a PostgreSQL exitosa'
        };

    } catch (error) {
        health.checks.database = {
            status: 'unhealthy',
            message: error.message
        };
        health.success = false;
        health.status = 'unhealthy';
    }

    // Check 2: Memoria
    const memUsage = process.memoryUsage();
    health.checks.memory = {
        status: 'healthy',
        usage: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`
        }
    };

    // Check 3: Configuración
    health.checks.config = {
        status: 'healthy',
        rapidApiKey: !!process.env.RAPIDAPI_KEY,
        shopifyToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
        databaseConfigured: !!process.env.DB_NAME
    };

    const statusCode = health.success ? 200 : 503;
    res.status(statusCode).json(health);

});


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = router;