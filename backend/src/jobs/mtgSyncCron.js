/*
    CRON JOB: SINCRONIZACIÓN MTG
    
    Ejecuta sincronización con Scryfall todos los días a las 12:01 AM
*/

const cron = require('node-cron');
const scryfallService = require('../services/scryfallService');
const logger = require('../utils/logger');

// ===========================================================
// TAREA DE SINCRONIZACIÓN
// ===========================================================

async function runSyncTask() {
    try {
        logger.info('⏰ Cron Job: Iniciando sincronización automática MTG');
        
        const result = await scryfallService.fullSync();
        
        logger.success('✅ Sincronización automática completada');
        logger.info(`📊 Total cartas: ${result.total_cards}`);
        logger.info(`⏱️  Duración: ${result.duration_seconds}s`);
        
    } catch (error) {
        logger.error('❌ Error en sincronización automática:', error.message);
    }
}

// ===========================================================
// CONFIGURAR CRON
// ===========================================================

function startMtgSyncCron() {
    // Cron expression: "1 0 * * *" = 12:01 AM todos los días
    // Minuto Hora Día Mes DiaSemana
    
    const cronExpression = '1 0 * * *'; // 12:01 AM diario
    
    cron.schedule(cronExpression, runSyncTask, {
        timezone: "America/Santiago" // Ajusta a tu zona horaria
    });
    
    logger.success('✅ Cron job MTG configurado: todos los días a las 12:01 AM');
}

// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    startMtgSyncCron,
    runSyncTask
};