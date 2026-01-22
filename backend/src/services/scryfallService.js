/*
    SCRYFALL SERVICE

    Servicio para sincronizar cartas de Magic desde Scryfall API
    - Descargar bulk data completo
    - Filtrar solo inglés y español
    - Actualización diaria
*/

const axios = require('axios');
const logger = require('../utils/logger');
const MtgCard = require('../models/MtgCard');

const SCRYFALL_API = 'https://api.scryfall.com';
const REQUEST_DELAY = 100; // 100ms entre request (respeta rate limit de Scryfall)

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

        const response = await axios.get(`${SCRYFALL_API}/bulk-data`);

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
 * @param {string} downloadUri - URL de descarga
 * @returns {Promise<Array>} Array de todas las cartas
 */
async function downloadBulkData(downloadUri) {
    try {
        logger.info('⬇️ Descargando bulk data...');

        const response = await axios.get(downloadUri, {
            timeout: 300000, // 5 minutos de timeout
            maxContentLength: 600 * 1024 * 1024 // 600 MB máximo
        });

        const allCards = response.data;

        logger.success(`🆗 Descargado: ${allCards.length} cartas totales`);

        return allCards;


    } catch (error) {
        logger.error('❌ Error descargando bulk data:', error.message);
        throw error;
    }
}


// ===========================================================
// FILTRAR CARTAS
// ===========================================================

/**
 * Filtra cartas para incluir solo inglés y español
 * @param {Array} allCards - Todas las cartas descargadas
 * @returns {Array} Cartas filtradas
 */
function filterCards(allCards) {
    logger.info('🔎 Filtrando cartas en inglés y español');

    const filtered = allCards.filter(card => {
        // Solo inglés y español
        if (card.lang !== 'en' && card.lang !== 'es') {
            return false;
        }

        // Excluir cartas sin imagen
        if (!card.image_uris && !card.card_faces) {
            return false;
        }

        return true;
    });

    const enCount = filtered.filter(c => c.lang === 'en').length;
    const esCount = filtered.filter(c => c.lang === 'es').length;

    logger.info(`📊 Filtrado completo:`);
    logger.info(`   - Inglés: ${enCount} cartas`);
    logger.info(`   - Español: ${esCount} cartas`);
    logger.info(`   - Total: ${filtered.length} cartas`);

    return filtered;

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


        // 2. Descargar todas las cartas
        const allCards = await downloadBulkData(bulkInfo.download_uri);


        // 3. Filtrar solo inglés y español
        const filteredCards = filterCards(allCards);


        // 4. Transformar al formato de BD
        logger.info('🌀 Transformando datos');
        const transformedCards = filteredCards.map(transformCard);


        // 5. Limpiar tabla existente
        logger.info('🗑️ Limpiando tabla existente...');
        await MtgCard.destroy({ where: {}, truncate: true });


        // 6. Insertar en lotes (para no sobrecargar la BD)
        logger.info('💾 Insertando cartas en base de datos');
        const batchSize = 1000;
        let inserted = 0;


        for (let i = 0; i < transformedCards.length; i += batchSize) {
            const batch = transformedCards.slice(i, i + batchSize);
            await MtgCard.bulkCreate(batch, {
                ignoreDuplicates: true,
                logging: false
            });
            inserted += batch.length;

            const progress = ((inserted / transformedCards.length) * 100).toFixed(1);
            logger.info(`   Progreso: ${inserted}/${transformedCards.length} (${progress}%)`);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        logger.success('🆗 Sincronización completa');
        logger.info(`⌚ Duración: ${duration} segundos`);


        return {
            success: true,
            total_cards: inserted,
            duration_seconds: duration,
            synced_at: new Date()
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