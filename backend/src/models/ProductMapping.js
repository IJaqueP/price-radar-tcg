/*
    MODELO: PRODUCT MAPPING
    Mapeo entre productos de Shopify y TCGGO API
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductMapping = sequelize.define('ProductMapping', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'products',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },

    // Identificador en TCGGO
    tcggo_id: {
        type: DataTypes.STRING(255)
    },
    tcggo_name: {
        type: DataTypes.STRING(500)
    },

    // Confianza del match
    match_confidence: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0.00
    },
    match_method: {
        type: DataTypes.STRING(50)
    },

    // Estado del mapeo
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    needs_review: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'product_mappings',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tcggo_id'] },
        { fields: ['needs_review'] }
    ]
});

module.exports = ProductMapping;