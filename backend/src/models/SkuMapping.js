const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SkuMapping = sequelize.define('SkuMapping', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    // Relación con Shopify
    shopify_product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'shopify_products',
            key: 'id'
        },
        comment: 'ID del producto en nuestra tabla shopify_products'
    },

    shopify_variant_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'ID de la variante en Shopify (único)'
    },

    // SKU Original de Shopify
    shopify_sku_original: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'SKU original que tiene en Shopify'
    },

    // SKU Validado de la API
    rapidapi_sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'SKU validado desde RapidAPI'
    },

    match_method: {
        type: DataTypes.ENUM('exact', 'fuzzy', 'manual', 'not_found'),
        defaultValue: 'not_found',
        comment: 'Método de matching usado'
    },

    // Estado de validación
    validated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Mapping validado correctamente'
    },

    validated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de validación'
    },

    validated_by: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Usuario o sistema que validó'
    },

    // Metadata del producto para matching
    product_name: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Nombre del producto para búsqueda'
    },

    product_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Tipo de producto (Magic, Pokémon, One Piece...)'
    },

    // Información de RapidAPI
    last_error: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Último error al intentar validar'
    },

    retry_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Cantidad de reintentos de validación'
    }

}, {
    tableName: 'sku_mapping',
    timestamps: true,
    indexes: [
        { fields: ['shopify_product_id'] },
        { fields: ['shopify_variant_id'], unique: true },
        { fields: ['rapidapi_sku'] },
        { fields: ['validated'] },
        { fields: ['match_method'] },
        { fields: ['product_name'] }
    ]
});

module.exports = SkuMapping;