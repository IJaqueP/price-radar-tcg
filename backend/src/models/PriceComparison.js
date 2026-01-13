/*
    MODELO: PRICE COMPARISON
    Comparaciones de precios con alertas
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PriceComparison = sequelize.define('PriceComparison', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },

    // Precios
    shopify_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    tcggo_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    tcggo_price_mxn: {
        type: DataTypes.DECIMAL(10, 2)
    },

    // Diferencia calculada
    price_difference_percentage: {
        type: DataTypes.DECIMAL(5, 2)
    },
    price_difference_amount: {
        type: DataTypes.DECIMAL(10, 2)
    },

    // Estado de la alerta
    is_below_threshold: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    alert_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    // Timestamp de la comparación
    comparison_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'price_comparisons',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['product_id'] },
        { fields: ['is_below_threshold'] },
        { fields: ['comparison_date'] }
    ]
});

module.exports = PriceComparison;