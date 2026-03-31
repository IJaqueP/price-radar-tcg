/* --- PRICE RADAR TCG - SERVER --- 
        * Punto de entrada principal del backend

        * Este archivo hace lo siguiente:
            1. Carga las variables de entorno (.env)
            2. Importa la aplicación express (app.js)
            3. Inicia el servidor en el puerto configurado
            4. Maneja errores de inicio
*/

// ===========================================================
// IMPORTAR DEPENDENCIAS
// ===========================================================

// dotenv: Lee el archivo .env y carga las variables en process.env
require('dotenv').config();

// Importar la aplicación Express desde src/app.js
const app = require('./src/app');

// Importar la configuración de base de datos para crear tablas
const { sequelize } = require('./src/config/database');

// ===========================================================
// CREAR TABLAS EN LA BASE DE DATOS
// ===========================================================

async function initializeDatabase() {
    try {
        console.log('🔄 Verificando conexión a la base de datos...');
        
        // Probar conexión
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida correctamente');
        
        // Crear tablas si no existen (sin alter para evitar conflictos)
        console.log('🔄 Sincronizando modelos con la base de datos...');
        await sequelize.sync({ alter: false });
        console.log('✅ Tablas verificadas correctamente');
        
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error.message);
        console.error('💡 Verifica que PostgreSQL esté corriendo y las credenciales en .env sean correctas');
        process.exit(1);
    }
}

// ===========================================================
// CONFIGURACIÓN DEL SERVIDOR
// ===========================================================

// Obtener el puerto desde variables de entorno, o usar 3000 por defecto
const PORT = process.env.PORT || 3000;

// Obtener el entorno (development o production)
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===========================================================
// INICIAR EL SERVIDOR
// ===========================================================

/* 
    app.listen() inicia el servidor HTTP
    Sus parámetros son:
    1. Puerto (3000)
    2. Callback que se ejecuta cuando el servidor arranca correctamente
*/

// Inicializar la base de datos primero, luego iniciar el servidor
let server;

initializeDatabase().then(() => {
    server = app.listen(PORT, '0.0.0.0', () => {
        console.log('=========================================================');
        console.log('🚀🚀 PRICE RADAR TCG - BACKEND INICIADO 🚀🚀');
        console.log('DESARROLLO PARA OASIS GAMES');
        console.log('=========================================================');
        console.log(`🛜 Servidor corriendo en: http://localhost:${PORT}`);
        console.log(`🛜 También accesible en: http://127.0.0.1:${PORT}`);
        console.log(`🌎 Entorno: ${NODE_ENV}`);
        console.log(`🕰️ Fecha de inicio: ${new Date().toLocaleString('es-CL')}`);
        console.log('=========================================================');

        // Solo en desarrollo, mostrar esta información adicional
        if (NODE_ENV === 'development') {
            console.log('\n🗒️ Endpoints disponibles:');
            console.log('\n   🔎 Health & diagnóstico');
            console.log(`   GET    http://localhost:${PORT}/api/health                -> Estado básico del backend`);
            console.log(`   GET    http://localhost:${PORT}/api/health/detailed       -> Estado detallado (DB, memoria, config)`);
            console.log(`   GET    http://localhost:${PORT}/api/test                  -> Test rápido de conectividad`);

            console.log('\n   📦 Productos & comparación');
            console.log(`   GET    http://localhost:${PORT}/api/products/alerts       -> Productos con alertas de precio`);
            console.log(`   GET    http://localhost:${PORT}/api/products/list         -> Listado paginado de productos`);
            console.log(`   GET    http://localhost:${PORT}/api/products/:id          -> Detalle de producto`);
            console.log(`   PATCH  http://localhost:${PORT}/api/products/:id/price    -> Actualizar precio en Shopify`);
            console.log(`   POST   http://localhost:${PORT}/api/products/:id/compare  -> Forzar comparación de precio`);
            console.log(`   GET    http://localhost:${PORT}/api/products/sealed/:game -> Sellado por juego (stock > 0)`);

            console.log('\n   🧩 Reconciliación de sellado (JustTCG)');
            console.log(`   POST   http://localhost:${PORT}/api/sealed/reconcile      -> Ejecutar reconciliación`);
            console.log(`   GET    http://localhost:${PORT}/api/sealed/stats          -> Estadísticas de reconciliación`);
            console.log(`   GET    http://localhost:${PORT}/api/sealed/mappings       -> Listar mappings`);
            console.log(`   GET    http://localhost:${PORT}/api/sealed/mappings/:id   -> Ver mapping específico`);
            console.log(`   PUT    http://localhost:${PORT}/api/sealed/mappings/:id   -> Actualizar mapping`);
            console.log(`   DELETE http://localhost:${PORT}/api/sealed/mappings/:id   -> Eliminar mapping`);

            console.log('\n   🃏 MTG (Scryfall)');
            console.log(`   POST   http://localhost:${PORT}/api/mtg/sync              -> Sincronizar cartas MTG`);
            console.log(`   GET    http://localhost:${PORT}/api/mtg/stats             -> Estadísticas MTG`);
            console.log(`   GET    http://localhost:${PORT}/api/mtg/search            -> Buscar cartas MTG`);
            console.log(`   GET    http://localhost:${PORT}/api/mtg/autocomplete      -> Autocompletado MTG`);
            console.log(`   GET    http://localhost:${PORT}/api/mtg/sets              -> Listar ediciones MTG`);
            console.log(`   GET    http://localhost:${PORT}/api/mtg/sets/:setCode/cards -> Cartas por edición`);
            console.log(`   GET    http://localhost:${PORT}/api/mtg/cards             -> Listado de cartas MTG`);
            console.log(`   GET    http://localhost:${PORT}/api/mtg/cards/:id         -> Detalle carta MTG`);

            console.log('\n   🛍️ Shopify');
            console.log(`   POST   http://localhost:${PORT}/api/shopify/sync/initial  -> Sync inicial (sin guardar)`);
            console.log(`   POST   http://localhost:${PORT}/api/shopify/sync/initial-db -> Sync inicial + guardar en BD`);
            console.log(`   GET    http://localhost:${PORT}/api/shopify/stats         -> Estadísticas rápidas Shopify`);
            console.log(`   POST   http://localhost:${PORT}/api/shopify/webhooks/products/create -> Webhook creación producto`);
            console.log(`   POST   http://localhost:${PORT}/api/shopify/webhooks/products/update -> Webhook actualización producto`);
            console.log(`   POST   http://localhost:${PORT}/api/shopify/webhooks/products/delete -> Webhook eliminación producto`);
            console.log(`   POST   http://localhost:${PORT}/api/shopify/webhooks/inventory_levels/update -> Webhook stock en tiempo real`);

            console.log('\n   🔄 Sync interno');
            console.log(`   GET    http://localhost:${PORT}/api/sync/shopify-products -> Sync de productos Shopify`);
            console.log(`   GET    http://localhost:${PORT}/api/sync/stats            -> Estadísticas de sync`);

            console.log('\n💡 Tip: Usa Ctrl + C para detener el servidor\n');
        }

        // Iniciar cron job de renovación de Shopify Token
        const { startTokenRefreshCron } = require('./src/jobs/shopifyTokenRefreshCron');
        startTokenRefreshCron();

        // Iniciar cron job de reconciliación+refresh para dashboard de sellados
        const { startSealedSyncCron } = require('./src/jobs/sealedSyncCron');
        startSealedSyncCron();

        // Registrar webhooks de Shopify para sync en tiempo real
        const { registerAllWebhooks } = require('./src/services/webhookRegistrationService');
        const backendUrl = process.env.BACKEND_URL;
        registerAllWebhooks(backendUrl).then(result => {
            if (result.skipped) {
                console.log('⚠️  Webhooks no registrados (falta BACKEND_URL en .env)');
                console.log('   Agrega BACKEND_URL=https://tu-dominio.com para sync en tiempo real');
            } else if (result.error) {
                console.log(`⚠️  Error registrando webhooks: ${result.error}`);
            } else {
                console.log(`✅ Webhooks Shopify: ${result.registered}/${result.total} registrados (sync en tiempo real activo)`);
            }
        });
    });
});

// ===========================================================
// MANEJO DE ERRORES DE SERVIDOR
// ===========================================================

// Captura errores que ocurran al iniciar el servidor
// Ejemplo: puerto ya en uso, permisos insuficientes, etc
app.on('error', (error) => {
    console.log('❌❌ ERROR AL INICIAR EL SERVIDOR:');
    console.log(error);

    // Si el puerto está ocupado
    if (error.code === 'EADDRINUSE') {
        console.log(`\n🗒️ El puerto ${PORT} se encuentra en uso.`);
        console.log('💡 Puedes resolverlo de las siguientes formas:');
        console.log('   1. Cambia el puerto en el archivo .env');
        console.log('   2. Detén el proceso que está usando este puerto');
    }

    // Salir del proceso con error
    process.exit(1);
});

// ===========================================================
// MANEJO DE CIERRE GRACEFUL
// ===========================================================

// Captura señal SIGTERM (cuando se detiene el servidor desde la terminal)
process.on('SIGTERM', () => {
    console.log('\n\n🅰️ SIGTERM recibido. Cerrando servidor...');

    // Cerrar el servidor de forma ordenada
    // Esto permite que las conexiones actuales terminen antes de cerrar
    if (server) {
        server.close(() => {
            console.log('\uD83C\uDD97 Servidor cerrado correctamente');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Capturar CTRL + C
process.on('SIGINT', () => {
    console.log('\n\n🅰️   SIGINT recibido (CTRL + C). Cerrando servidor...');
    process.exit(0);
});
