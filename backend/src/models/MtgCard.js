/*
    MODELO: MTG_CARDS
    Almacena todas las cartas de Magic: The Gathering desde Scryfall
    Se almacenan los siguientes idiomas:
        - Inglés
        - Español
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MtgCard = sequelize.define('MtgCard', {
    // ID único de Sequelize
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    // IDs de Scryfall
    scryfall_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: 'ID único de esta impresión específica en Scryfall'
    },

    oracle_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID que agrupa todas las impresiones de la misma carta'
    },

    // Información básica
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre de la carta'
    },

    lang: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: 'en',
        comment: 'Idioma: en o es'
    },

    // Set/Expansión
    set_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Código del set (ej: lrw, dom, neo)'
    },

    set_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre completo del set'
    },

    set_type: {
        type: DataTypes.STRING(50),
        comment: 'Tipo de set: expansion, core, masters, etc'
    },

    released_at: {
        type: DataTypes.DATEONLY,
        comment: 'Fecha de lanzamiento del set'
    },

    collector_number: {
        type: DataTypes.STRING(20),
        comment: 'Número de colección en el set'
    },

    // Características de la carta
    mana_cost: {
        type: DataTypes.STRING(50),
        comment: 'Coste de maná: {3}{U}{U}'
    },

    cmc: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Coste de maná convertido'
    },

    type_line: {
        type: DataTypes.STRING(200),
        comment: 'Línea de tipo'
    },

    oracle_text: {
        type: DataTypes.TEXT,
        comment: 'Texto de la carta (traducido según idioma)'
    },

    power: {
        type: DataTypes.STRING(10),
        comment: 'Poder de la criatura'
    },

    toughness: {
        type: DataTypes.STRING(10),
        comment: 'Resistencia de la criatura'
    },

    loyalty: {
        type: DataTypes.STRING(10),
        comment: 'Lealtad del planeswalker'
    },

    // Colores
    colors: {
        type: DataTypes.JSONB,
        comment: 'Array de colores: ["W", "U", "B", "R", "G"]'
    },

    keywords: {
        type: DataTypes.JSONB,
        comment: 'Array de keywords'
    },

    // Rareza
    rarity: {
        type: DataTypes.STRING(20),
        comment: 'common, uncommon, rare, mythic'
    },

    // URLs de imágenes (desde scryfall CDN - NO SE DESCARGAN)
    image_uris: {
        type: DataTypes.JSONB,
        comment: 'URLs de imágenes: {small, normal, large, png, art_crop}'
    },

    // Metadata
    layout: {
        type: DataTypes.STRING(50),
        comment: 'Layout: normal, split, flip, transform, etc.'
    },

    card_faces: {
        type: DataTypes.JSONB,
        comment: 'Para cartas dobles (ambas caras)'
    },

    flavor_text: {
        type: DataTypes.TEXT,
        comment: 'Texto de ambientación'
    },

    artist: {
        type: DataTypes.STRING(100),
        comment: 'Artista'
    },

    // Control de sincronización
    last_synced_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Última sincronización con scryfall'
    }
}, {
    tableName: 'mtg_cards',
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ['scryfall_id'] },
        { fields: ['oracle_id'] },
        { fields: ['name'] },
        { fields: ['set_code'] },
        { fields: ['lang'] },
        { fields: ['set_code', 'lang'] },
        { fields: ['name', 'lang'] },
        { fields: ['rarity'] },
        { fields: ['released_at'] }
    ]
});

module.exports = MtgCard;