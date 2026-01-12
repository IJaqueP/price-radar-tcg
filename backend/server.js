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
app.listen(PORT, () => {
    console.log('=========================================================');
    console.log('🚀🚀 PRICE RADAR TCG - BACKEND INICIADO 🚀🚀');
    console.log('DESARROLLO PARA OASIS GAMES');
    console.log('=========================================================');
    console.log(`🛜 Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`🌎 Entorno: ${NODE_ENV}`);
    console.log(`🕰️ Fecha de inicio: ${new Date().toLocaleString('es-CL')}`);
    console.log('=========================================================');

    // Solo en desarrollo, mostrar esta información adicional
    if (NODE_ENV === 'development') {
        console.log('\n🗒️ Endpoints disponibles:');
        console.log(`   GET http://localhost:${PORT}/api/health`);
        console.log(`   GET http://localhost:${PORT}/api/products`);
        console.log('\n💡 Tip: Usa Ctrl + C para detener el servidor\n');
    }
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
    app.close(() => {
        console.log('🆗 Servidor cerrado correctamente');
        process.exit(0);
    });
});

// Capturar CTRL + C
process.on('SIGINT', () => {
    console.log('\n\n🅰️   SIGINT recibido (CTRL + C). Cerrando servidor...');
    process.exit(0);
});
