/*
    MODELO: SYNC HISTORY
    Historial de sincronizaciones
*/

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SyncHistory = sequelize.define('SyncHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    // Tipo de sincronización
    sync_type: {
        type: DataTypes.STRING(50),
        allowNull: false
    },

    // Estadísticas
    products_processed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    products_added: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    products_updated: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    products_deleted: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },

    // Estado
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'in_progress'
    },
    error_message: {
        type: DataTypes.TEXT
    },

    // Duración
    started_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    completed_at: {
        type: DataTypes.DATE
    },
    duration_seconds: {
        type: DataTypes.INTEGER
    }
}, {
    tableName: 'sync_history',
    timestamps: false,
    indexes: [
        { fields: ['sync_type'] },
        { fields: ['started_at'] }
    ]
});

module.exports = SyncHistory;