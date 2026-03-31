const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShopifyProduct = sequelize.define('ShopifyProduct', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },

    // ID único de Shopify (GraphQL gid)
    shopify_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'ID único del producto en Shopify'
    },

    // Información básica del producto
    title: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Título del producto en Shopify'
    },

    shopify_sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'SKU actual en Shopify (puede necesitar corrección)'
    },

    // Precio actual en CLP
    current_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Precio actual en CLP'
    },

    // Variantes (algunos productos tienen múltiples variantes)
    variant_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'ID de la variante si aplica'
    },

    variant_title: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Título de la variante (ej: Normal, Foil, etc)'
    },

    // Estado del producto
    status: {
        type: DataTypes.ENUM('active', 'draft', 'archived'),
        defaultValue: 'active',
        comment: 'Estado del producto en Shopify'
    },

    // Inventario
    inventory_quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Cantidad en inventario'
    },

    // Metadata adicional
    product_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Tipo de producto (ej: Magic, Pokémon, Riftbound)'
    },

    vendor: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Vendedor o Marca'
    },

    // Control de sincronización
    last_synced_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Última vez que se sincronizó desde Shopify'
    },

    // Flag para saber si ya tiene SKU validado
    sku_validated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Si el SKU ya fue validado con RapidApi'
    },

    // Datos raw de Shopify (por si necesitamos algo más)
    raw_data: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Datos completos del producto desde Shopify'
    }

}, {
    tableName: 'shopify_products',
    timestamps: true,
    indexes: [
        { fields: ['shopify_id'] },
        { fields: ['variant_id'], unique: true },
        { fields: ['shopify_sku'] },
        { fields: ['title'] },
        { fields: ['sku_validated'] },
        { fields: ['status'] }
    ]
});

module.exports = ShopifyProduct;