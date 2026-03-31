const cron = require('node-cron');
const { runSealedSyncCycle } = require('../services/sealedProductReconciliationService');

let isRunning = false;

function buildCronExpression(hours) {
  const h = Number.isFinite(hours) && hours > 0 ? Math.floor(hours) : 24;

  if (h >= 24) {
    // Diario a medianoche.
    return '0 0 * * *';
  }

  return `0 */${h} * * *`;
}

async function executeSealedSyncCycle() {
  if (isRunning) {
    console.log('⏭️  [SEALED-CRON] Ciclo omitido: ya hay una ejecución en curso');
    return;
  }

  isRunning = true;
  const startedAt = Date.now();

  try {
    console.log('\n🔄 [SEALED-CRON] Iniciando ciclo automático...');

    const result = await runSealedSyncCycle({
      reconcile: {
        limit: parseInt(process.env.SEALED_RECONCILE_LIMIT || '100', 10),
        minConfidence: parseInt(process.env.SEALED_MIN_CONFIDENCE || '70', 10),
        dryRun: false,
        game: process.env.SEALED_SYNC_GAME || null,
        onlyInStock: String(process.env.SEALED_ONLY_IN_STOCK || 'true').toLowerCase() !== 'false',
        onlyUnmapped: String(process.env.SEALED_ONLY_UNMAPPED || 'true').toLowerCase() !== 'false',
        skuStrict: String(process.env.SEALED_SKU_STRICT || 'true').toLowerCase() !== 'false',
      },
      refresh: {
        limit: parseInt(process.env.SEALED_REFRESH_LIMIT || '300', 10),
        game: process.env.SEALED_SYNC_GAME || null,
        onlyInStock: String(process.env.SEALED_ONLY_IN_STOCK || 'true').toLowerCase() !== 'false',
      },
      verbose: String(process.env.SEALED_SYNC_VERBOSE || 'false').toLowerCase() === 'true',
    });

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`✅ [SEALED-CRON] Ciclo completado en ${elapsed}s`);
    console.log(`   Matched nuevos: ${result.reconcile?.matched || 0}`);
    console.log(`   Diferencias refrescadas: ${result.refresh?.refreshed || 0}`);
    console.log(`   Sobre umbral: ${result.refresh?.above_threshold || 0}\n`);
  } catch (error) {
    console.error('❌ [SEALED-CRON] Error en ciclo automático:', error.message);
  } finally {
    isRunning = false;
  }
}

function startSealedSyncCron() {
  const enabled = String(process.env.ENABLE_SEALED_SYNC_CRON || 'false').toLowerCase() === 'true';

  if (!enabled) {
    console.log('ℹ️  [SEALED-CRON] Deshabilitado (ENABLE_SEALED_SYNC_CRON=false)');
    return;
  }

  const everyHours = parseInt(
    process.env.SEALED_SYNC_FREQUENCY_HOURS || process.env.SYNC_FREQUENCY_HOURS || '24',
    10
  );

  const expression = buildCronExpression(everyHours);
  console.log(`⏰ [SEALED-CRON] Programado (${expression}) timezone America/Santiago`);

  cron.schedule(
    expression,
    () => {
      executeSealedSyncCycle();
    },
    {
      timezone: 'America/Santiago',
    }
  );

  const runOnStartup = String(process.env.SEALED_SYNC_RUN_ON_STARTUP || 'false').toLowerCase() === 'true';
  if (runOnStartup) {
    executeSealedSyncCycle();
  }
}

module.exports = {
  startSealedSyncCron,
  executeSealedSyncCycle,
};
