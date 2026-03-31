/*
    SCRYFALL SERVICE

    Servicio para sincronizar cartas de Magic desde Scryfall API
    - Descargar bulk data completo
    - Filtrar solo inglés y español
    - Actualización diaria
*/

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const StreamArray = require('stream-json/streamers/StreamArray');
const { chain } = require('stream-chain');
const logger = require('../utils/logger');
const MtgCard = require('../models/MtgCard');

const SCRYFALL_API = 'https://api.scryfall.com';
const REQUEST_DELAY = 100; // 100ms entre request (respeta rate limit de Scryfall)

// Configuración de axios con User-Agent (buena práctica, no requerido)
const axiosConfig = {
    headers: {
        'User-Agent': 'PriceRadarTCG/1.0 (Oasis Games Chile; https://priceradar.cl)'
    }
};

// ===========================================================
// OBTENER DATA BULK
// ===========================================================

/**
 * Obtiene la URL del archivo bulk data más reciente
 * @returns {Promise<Object>} Información del bulk data
*/

async function getBulkDataInfo() {
    try {
        logger.info('📡 Consultando bulk data de Scryfall...');

        const response = await axios.get(`${SCRYFALL_API}/bulk-data`, axiosConfig);

        // Buscar el bulk data de 'All Cards'
        const allCards = response.data.data.find(
            bulk => bulk.type === 'all_cards'
        );

        if (!allCards) {
            throw new Error('No se encontró el bulk data de "all_cards"');
        }

        logger.info(`🆗 Bulk data encontrado: ${allCards.name}`);
        logger.info(`📊 Tamaño: ${(allCards.size / 1024 / 1024).toFixed(2)} MB`);
        logger.info(`🕰️ Actualizado: ${allCards.updated_at}`);

        return allCards;

    } catch (error) {
        logger.error('❌ Error obteniendo info de bulk data:', error.message);
        throw error;
    }
}


/**
 * Descarga el archivo bulk data a disco (evita límites de memoria)
 * @param {string} downloadUri - URL de descarga
 * @returns {Promise<string>} Ruta del archivo descargado
 */
async function downloadBulkDataToFile(downloadUri) {
    const tempDir = path.join(__dirname, '../../temp');
    const tempFile = path.join(tempDir, 'scryfall-bulk.json');

    try {
        // Crear directorio temporal si no existe
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        logger.info('⬇️ Descargando bulk data a disco...');
        logger.info(`📦 Tamaño esperado: ~2.3 GB (puede tomar 1-3 minutos)`);
        logger.info(`💾 Guardando en: ${tempFile}`);

        // Descargar archivo en streaming
        const response = await axios({
            method: 'get',
            url: downloadUri,
            responseType: 'stream',
            timeout: 600000, // 10 minutos
            ...axiosConfig
        });

        const writer = fs.createWriteStream(tempFile);
        
        // Progreso de descarga
        let downloaded = 0;
        const totalSize = parseInt(response.headers['content-length'], 10);
        
        response.data.on('data', (chunk) => {
            downloaded += chunk.length;
            const percent = ((downloaded / totalSize) * 100).toFixed(1);
            if (downloaded % (50 * 1024 * 1024) === 0) { // Log cada 50MB
                logger.info(`📥 Descargado: ${(downloaded / 1024 / 1024).toFixed(0)} MB (${percent}%)`);
            }
        });

        await pipeline(response.data, writer);

        logger.success(`✅ Descarga completada: ${(downloaded / 1024 / 1024).toFixed(0)} MB`);
        
        return tempFile;

    } catch (error) {
        logger.error('❌ Error descargando bulk data:', error.message);
        // Limpiar archivo temporal si existe
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        throw error;
    }
}


/**
 * Procesa el archivo JSON en streaming (NO carga en memoria)
 * Filtra, transforma e inserta cartas en tiempo real
 * @param {string} filePath - Ruta del archivo JSON
 * @returns {Promise<Object>} Estadísticas del procesamiento
 */
async function processStreamingBulkData(filePath) {
    return new Promise((resolve, reject) => {
        logger.info('📖 Procesando archivo en streaming...');
        logger.info('🔄 Parseando, filtrando e insertando en tiempo real');

        let totalProcessed = 0;
        let totalFiltered = 0;
        let totalInserted = 0;
        let enCount = 0;
        let esCount = 0;
        
        let batchBuffer = [];
        const BATCH_SIZE = 500; // Insertar cada 500 cartas

        // Stream JSON parser
        const jsonStream = chain([
            fs.createReadStream(filePath, { encoding: 'utf8' }),
            StreamArray.withParser()
        ]);

        // Procesar cada carta en streaming
        jsonStream.on('data', async ({ value: card }) => {
            totalProcessed++;

            // Filtrar: solo EN/ES con imágenes
            if ((card.lang === 'en' || card.lang === 'es') && 
                (card.image_uris || card.card_faces)) {
                
                totalFiltered++;
                if (card.lang === 'en') enCount++;
                if (card.lang === 'es') esCount++;

                // Transformar al formato BD
                const transformedCard = transformCard(card);
                batchBuffer.push(transformedCard);

                // Insertar en lotes
                if (batchBuffer.length >= BATCH_SIZE) {
                    jsonStream.pause(); // Pausar mientras insertamos
                    
                    try {
                        await MtgCard.bulkCreate(batchBuffer, { 
                            ignoreDuplicates: true,
                            logging: false 
                        });
                        totalInserted += batchBuffer.length;
                        
                        if (totalInserted % 5000 === 0) {
                            logger.info(`💾 Insertadas ${totalInserted} cartas...`);
                        }
                        
                        batchBuffer = []; // Limpiar buffer
                    } catch (error) {
                        logger.error(`❌ Error insertando lote: ${error.message}`);
                    }
                    
                    jsonStream.resume(); // Continuar stream
                }
            }

            // Log progreso cada 50K cartas procesadas
            if (totalProcessed % 50000 === 0) {
                logger.info(`📊 Procesadas ${totalProcessed} cartas (${totalFiltered} filtradas)`);
            }
        });

        jsonStream.on('end', async () => {
            // Insertar cartas restantes en buffer
            if (batchBuffer.length > 0) {
                try {
                    await MtgCard.bulkCreate(batchBuffer, { 
                        ignoreDuplicates: true,
                        logging: false 
                    });
                    totalInserted += batchBuffer.length;
                } catch (error) {
                    logger.error(`❌ Error insertando último lote: ${error.message}`);
                }
            }

            // Limpiar archivo temporal
            try {
                fs.unlinkSync(filePath);
                logger.info('🧹 Archivo temporal eliminado');
            } catch (error) {
                logger.warn('⚠️ No se pudo eliminar archivo temporal');
            }

            logger.success('✅ Procesamiento streaming completado');
            logger.info(`📊 Estadísticas:`);
            logger.info(`   - Total procesadas: ${totalProcessed}`);
            logger.info(`   - Total filtradas: ${totalFiltered}`);
            logger.info(`   - Inglés: ${enCount}`);
            logger.info(`   - Español: ${esCount}`);
            logger.info(`   - Insertadas en BD: ${totalInserted}`);

            resolve({
                totalProcessed,
                totalFiltered,
                englishCards: enCount,
                spanishCards: esCount,
                inserted: totalInserted
            });
        });

        jsonStream.on('error', (error) => {
            logger.error('❌ Error en streaming:', error.message);
            
            // Intentar limpiar archivo
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (e) {
                // Ignorar error de limpieza
            }
            
            reject(error);
        });
    });
}


// ===========================================================
// TRANSFORMAR DATOS
// ===========================================================

/**
 * Transforma una carta de Scryfall al formato de la BD
 * @param {Object} scryfallCard - Carta en formato Scryfall
 * @returns {Object} Carta en formato BD
 */

function transformCard(scryfallCard) {
    return {
        scryfall_id: scryfallCard.id,
        oracle_id: scryfallCard.oracle_id,
        name: scryfallCard.name,
        printed_name: scryfallCard.printed_name || scryfallCard.name,
        lang: scryfallCard.lang,

        set_code: scryfallCard.set,
        set_name: scryfallCard.set_name,
        set_type: scryfallCard.set_type,
        released_at: scryfallCard.released_at,
        collector_number: scryfallCard.collector_number,

        mana_cost: scryfallCard.mana_cost || null,
        cmc: scryfallCard.cmc || 0,
        type_line: scryfallCard.type_line,
        oracle_text: scryfallCard.oracle_text || null,

        power: scryfallCard.power || null,
        toughness: scryfallCard.toughness || null,
        loyalty: scryfallCard.loyalty || null,

        colors: scryfallCard.colors || [],
        color_identity: scryfallCard.color_identity || [],
        keywords: scryfallCard.keywords || [],

        rarity: scryfallCard.rarity,

        // URLs de imágenes (no descargamos, solo guardamos las URLs)
        image_uris: scryfallCard.image_uris || null,

        layout: scryfallCard.layout,
        card_faces: scryfallCard.card_faces || null,
        flavor_text: scryfallCard.flavor_text || null,
        artist: scryfallCard.artist || null,

        last_synced_at: new Date()
    };
}


// ===========================================================
// SINCRONIZACIÓN COMPLETA
// ===========================================================

/**
 * Sincronización completa: descarga y guarda todas las cartas
 * @returns {Promise<Object>} Estadísticas de la sincronización
 */

async function fullSync() {
    const startTime = Date.now();

    try {
        logger.info('🚀 Iniciando sincronización completa con Scryfall');

        // 1. Obtener info del bulk data
        const bulkInfo = await getBulkDataInfo();

        // 2. Descargar archivo a disco (streaming - no usa RAM)
        const tempFilePath = await downloadBulkDataToFile(bulkInfo.download_uri);

        // 3. Limpiar tabla ANTES de procesar (libera espacio)
        logger.info('🗑️ Limpiando tabla existente...');
        await MtgCard.destroy({ where: {}, truncate: true });

        // 4. Procesar en streaming: parsear + filtrar + insertar
        // Esto NO carga todo en memoria, procesa carta por carta
        const stats = await processStreamingBulkData(tempFilePath);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        logger.success('🎉 Sincronización completa exitosa');
        logger.info(`⌚ Duración total: ${duration} segundos`);

        return {
            success: true,
            duration: parseFloat(duration),
            totalCards: stats.inserted,
            englishCards: stats.englishCards,
            spanishCards: stats.spanishCards,
            processed: stats.totalProcessed,
            filtered: stats.totalFiltered
        };

    } catch (error) {
        logger.error('❌ Error en sincronización completa:', error.message);
        throw error;
    }
}


// ===========================================================
// ESTADÍSTICAS
// ===========================================================

/**
 * Obtiene estadísticas de las cartas almacenadas
 * @returns {Promise<Object>} Estadísticas
 */

async function getStats() {
    try {
        const total = await MtgCard.count();
        const english = await MtgCard.count({ where: { lang: 'en' } });
        const spanish = await MtgCard.count({ where: { lang: 'es' } });

        const sets = await MtgCard.findAll(
            {
                attributes: ['set_code', 'set_name', 'released_at'],
                group: ['set_code', 'set_name', 'released_at'],
                raw: true
            }
        );

        const lastSync = await MtgCard.findOne(
            {
                attributes: ['last_synced_at'],
                order: [['last_synced_at', 'DESC']],
                limit: 1
            }
        );


        return {
            total_cards: total,
            by_language: {
                english,
                spanish
            },
            total_sets: sets.length,
            last_sync: lastSync?.last_synced_at || null
        };


    } catch (error) {
        logger.error('❌ Error al obtener las estadísticas:', error.message);
        throw error;
    }
}


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    fullSync,
    getStats,
    getBulkDataInfo
};