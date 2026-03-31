/*
    CONFIGURACIÓN DE BASE DE DATOS POSTGRESQL

    Configura Sequelize con PostgreSQL para:
        1. Conexión a Althen hosting
        2. Pool de conexiones
        3. SSL (requerido para hosting externo)
        4. Timezone UTC
*/

const { Sequelize } = require('sequelize');
require('dotenv').config();

// ===========================================================
// VALIDACIÓN DE VARIABLES DE ENTORNO
// ===========================================================

const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.warn('⚠️    Variables de base de datos faltantes:', missingVars.join(', '));
    console.warn('⚠️    La aplicación funcionará sin base de datos hasta que sea configurada');
}


// ===========================================================
// CONFIGURACIÓN CON SEQUELIZE
// ===========================================================

const sequelize = new Sequelize(
    process.env.DB_NAME || 'price_radar_tcg_oasis',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',

        // SSL Configuration (requerido para hosting externo)
        dialectOptions: {
            ssl: process.env.DB_SSL === 'true' ? {
                require: true,
                rejectUnauthorized: false // Necesario para algunos proveedores
            } : false
        },

        // Pool de conexiones
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },

        // Logging
        logging: process.env.NODE_ENV === 'development' ? console.log : false,

        // Timezone
        timezone: '+00:00',

        // Define configuración por defecto
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    }
);


// ===========================================================
// FUNCIONES DE TEST DE CONEXIÓN
// ===========================================================

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('🆗 Conexión a PostgreSQL exitosa');
        return true;
    } catch (error) {
        console.log('❌ Error al conectar a PostgreSQL:', error.message);
        return false;
    }
}


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    sequelize,
    testConnection
};