/*
    MTG CONTROLLER
    
    Controlador para endpoints de Magic: The Gathering
*/

const scryfallService = require('../services/scryfallService');
const MtgCard = require('../models/MtgCard');
const logger = require('../utils/logger');
const { Op, where } = require('sequelize');
const { sequelize } = require('../config/database');

// ===========================================================
// SINCRONIZACIÓN
// ===========================================================

/**
 * POST /api/mtg/sync
 * Ejecuta sincronización completa con Scryfall
 */
async function syncCards(req, res) {
    try {
        logger.info('🚀 Iniciando sincronización manual de cartas MTG');
        
        const result = await scryfallService.fullSync();
        
        res.json({
            success: true,
            message: 'Sincronización completada exitosamente',
            data: result
        });
        
    } catch (error) {
        logger.error('Error en sincronización:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error en la sincronización',
            error: error.message
        });
    }
}

/**
 * GET /api/mtg/stats
 * Obtiene estadísticas de las cartas almacenadas
 */
async function getStats(req, res) {
    try {
        const stats = await scryfallService.getStats();
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        logger.error('Error obteniendo estadísticas:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas',
            error: error.message
        });
    }
}

// ===========================================================
// CONSULTAS DE CARTAS
// ===========================================================

/**
 * GET /api/mtg/sets
 * Lista todos los sets disponibles
 */
async function getSets(req, res) {
    try {
        const { lang = 'en' } = req.query;
        
        const sets = await MtgCard.findAll({
            attributes: [
                'set_code',
                'set_name',
                'set_type',
                'released_at',
                [sequelize.fn('COUNT', sequelize.col('id')), 'card_count']
            ],
            where: { lang },
            group: ['set_code', 'set_name', 'set_type', 'released_at'],
            order: [['released_at', 'DESC']],
            raw: true
        });
        
        res.json({
            success: true,
            data: sets
        });
        
    } catch (error) {
        logger.error('Error obteniendo sets:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo sets',
            error: error.message
        });
    }
}

/**
 * GET /api/mtg/cards
 * Lista cartas con filtros
 */
async function getCards(req, res) {
    try {
        const {
            set_code,
            oracle_id,
            lang = 'en',
            name,
            rarity,
            page = 1,
            limit = 100
        } = req.query;
        
        const whereClause = { lang };
        
        if (set_code) whereClause.set_code = set_code;
        
        // Soportar múltiples oracle_ids separados por coma
        if (oracle_id) {
            if (oracle_id.includes(',')) {
                const ids = oracle_id.split(',').map(id => id.trim()).filter(id => id);
                whereClause.oracle_id = { [Op.in]: ids };
            } else {
                whereClause.oracle_id = oracle_id;
            }
        }
        
        if (rarity) whereClause.rarity = rarity;
        if (name) {
            whereClause.name = {
                [Op.iLike]: `%${name}%`
            };
        }
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const { count, rows: cards } = await MtgCard.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset,
            order: [['collector_number', 'ASC']],
            attributes: [
                'id',
                'scryfall_id',
                'oracle_id',
                'name',
                'printed_name',
                'lang',
                'mana_cost',
                'type_line',
                'oracle_text',
                'power',
                'toughness',
                'rarity',
                'image_uris',
                'collector_number',
                'artist',
                'set_code',
                'set_name'
            ]
        });
        
        res.json({
            success: true,
            data: {
                cards,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / parseInt(limit))
                }
            }
        });
        
    } catch (error) {
        logger.error('Error obteniendo cartas:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo cartas',
            error: error.message
        });
    }
}

/**
 * GET /api/mtg/cards/:id
 * Obtiene una carta específica
 */
async function getCard(req, res) {
    try {
        const { id } = req.params;
        const { lang = 'en' } = req.query;
        
        const card = await MtgCard.findOne({
            where: {
                scryfall_id: id
            }
        });
        
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Carta no encontrada'
            });
        }
        
        // Si se solicita en otro idioma, buscar la traducción
        if (lang !== card.lang) {
            const translation = await MtgCard.findOne({
                where: {
                    oracle_id: card.oracle_id,
                    set_code: card.set_code,
                    lang
                }
            });
            
            if (translation) {
                return res.json({
                    success: true,
                    data: translation
                });
            }
        }
        
        res.json({
            success: true,
            data: card
        });
        
    } catch (error) {
        logger.error('Error obteniendo carta:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo carta',
            error: error.message
        });
    }
}

/**
 * GET /api/mtg/search
 * Buscar cartas por nombre (inglés o español)
 */
async function searchCards(req, res) {
    try {
        const { name, lang, limit = 100 } = req.query;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Parámetro "name" es requerido'
            });
        }

        // Buscar en ambos campos: name (inglés) y printed_name (localizado)
        const whereClause = {
            [Op.or]: [
                { name: { [Op.iLike]: `%${name}%` } },
                { printed_name: { [Op.iLike]: `%${name}%` } }
            ]
        };

        // Filtrar por idioma si se especifica
        if (lang) {
            whereClause.lang = lang;
        }

        const cards = await MtgCard.findAll({
            where: whereClause,
            limit: parseInt(limit),
            order: [
                ['name', 'ASC'],
                ['released_at', 'DESC'],
                ['set_code', 'ASC']
            ]
        });

        res.json({
            success: true,
            total: cards.length,
            data: cards
        });

    } catch (error) {
        logger.error('Error en búsqueda de cartas:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error en búsqueda',
            error: error.message
        });
    }
}

/**
 * GET /api/mtg/sets/:setCode/cards
 * Obtener cartas de un set específico
 */
async function getSetCards(req, res) {
    try {
        const { setCode } = req.params;
        const { lang } = req.query;

        const whereClause = {
            set_code: setCode.toLowerCase()
        };

        if (lang) {
            whereClause.lang = lang;
        }

        const cards = await MtgCard.findAll({
            where: whereClause,
            order: [['collector_number', 'ASC']]
        });

        if (cards.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Set no encontrado'
            });
        }

        res.json({
            success: true,
            data: {
                set_code: setCode,
                set_name: cards[0].set_name,
                total: cards.length,
                cards: cards
            }
        });

    } catch (error) {
        logger.error('Error obteniendo cartas del set:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo cartas del set',
            error: error.message
        });
    }
}

/**
 * GET /api/mtg/autocomplete
 * Autocompletado de nombres de cartas
 */
async function autocompleteCards(req, res) {
    try {
        const { q, limit = 10, lang } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Buscar en name (inglés) y printed_name (localizado)
        const whereCondition = {
            [Op.or]: [
                { name: { [Op.iLike]: `${q}%` } },
                { printed_name: { [Op.iLike]: `${q}%` } }
            ]
        };

        // Si se especifica idioma, filtrar solo por ese idioma
        if (lang && (lang === 'en' || lang === 'es')) {
            whereCondition.lang = lang;
        }

        const cards = await MtgCard.findAll({
            attributes: ['name', 'printed_name', 'lang'],
            where: whereCondition,
            limit: parseInt(limit) * 3,
            order: [['name', 'ASC']]
        });

        // Crear lista con nombres únicos, priorizando el nombre correcto según idioma
        const uniqueNames = [];
        const seenNames = new Set();
        
        cards.forEach(card => {
            const displayName = (card.lang === 'es' && card.printed_name) ? card.printed_name : card.name;
            if (!seenNames.has(displayName)) {
                seenNames.add(displayName);
                uniqueNames.push(displayName);
            }
        });

        res.json({
            success: true,
            data: uniqueNames.slice(0, parseInt(limit))
        });

    } catch (error) {
        logger.error('Error en autocompletado:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error en autocompletado',
            error: error.message
        });
    }
}

// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    syncCards,
    getStats,
    getSets,
    getCards,
    getCard,
    searchCards,
    getSetCards,
    autocompleteCards
};