/*
    MODELO: PRODUCT
    Representa un producto de Shopify con su clasificación TCG
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    // Identificadores de Shopify
    shopify_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    shopify_gid: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },

    // Información básica
    title: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    handle: {
        type: DataTypes.STRING(500),
    },
    vendor: {
        type: DataTypes.STRING(255)
    },
    product_type: {
        type: DataTypes.STRING(500)
    },
    tags: {
        type: DataTypes.TEXT
    },

    // Clasificación TCG
    is_tcg: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_sealed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_single: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    game: {
        type: DataTypes.STRING(50)
    },
    category: {
        type: DataTypes.STRING(50)
    },

    // Precio y stock
    price: {
        type: DataTypes.DECIMAL(10, 2)
    },
    compare_at_price: {
        type: DataTypes.DECIMAL(10, 2)
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD'
    },
    inventory_quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },

    // Variantes
    has_variants: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    variant_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },

    // Imágenes
    image_url: {
        type: DataTypes.TEXT
    },

    // Timestamps de Shopify
    shopify_created_at: {
        type: DataTypes.DATE
    },
    shopify_updated_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'products',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['is_tcg'] },
        { fields: ['game'] },
        { fields: ['category'] },
        { fields: ['is_sealed'] },
        { fields: ['shopify_id'] }
    ]
});

module.exports = Product;