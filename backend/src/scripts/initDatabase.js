/*
    SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS

    Crea todas las tablas en PostgreSQL

    USO: node src/scripts/initDatabase.js

*/

const { sequelize, testConnection } = require('../config/database');
const { Product, ProductMapping, PriceComparison, SyncHistory } = require('../models');

async function initDatabase() {
    console.log('INICIANDO CONFIGURACIÓN DE LA BASE DE DATOS\n');

    try {
        // 1. Test de conexión
        console.log('🥇 Probando conexión a PostgreSQL');
        const isConnected = await testConnection();

        if (!isConnected) {
            console.error('❌ No se pudo conectar a la base de datos');
            console.log('\n 💡 Asegúrate de tener las variables correctas en .env');
            console.log('   - DB_HOST');
            console.log('   - DB_NAME');
            console.log('   - DB_USER');
            console.log('   - DB_PASSWORD');
            process.exit(1);
        }

        // 2. Sincronizar modelos (crear tablas)
        console.log('\n🥈 Creando tablas...');

        // force: true -> elimina y recrea las tablas (⚠️⚠️ CUIDADO EN PRODUCCIÓN!!)
        // alter: true -> modifica las tablas existentes
        await sequelize.sync({ force: false, alter: true });

        console.log('🆗 Tablas creadas exitosamente');

        // 3. Verificar tablas creadas
        console.log('\n 🥉 Verificando tablas');
        const tables = await sequelize.getQueryInterface().showAllTables();
        console.log('📝 Tablas en la base de datos:', tables);

        // 4. Resumen
        console.log('\n🆗 BASE DE DATOS CONFIGURADA EXITOSAMENTE\n');
        console.log('📊 Modelos disponibles:');
        console.log('   - Product');
        console.log('   - ProductMapping');
        console.log('   - PriceComparison');
        console.log('   - SyncHistory');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error al inicializar la base de datos:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar
initDatabase();