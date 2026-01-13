/*
    INDEX DE MODELOS

    Centraliza todos los modelos y define sus relaciones
*/

const Product = require('./Product');
const ProductMapping = require('./ProductMapping');
const PriceComparison = require('./PriceComparison');
const SyncHistory = require('./SyncHistory');

// ===========================================================
// DEFINIR RELACIONES
// ===========================================================

// Product <-> ProductMapping (1:1)
Product.hasOne(ProductMapping, {
    foreignKey: 'product_id',
    as: 'mapping'
});
ProductMapping.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
});

// Product <-> PriceComparison (1:N)
Product.hasMany(PriceComparison, {
    foreignKey: 'product_id',
    as: 'price_comparisons'
});
PriceComparison.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
});


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    Product,
    ProductMapping,
    PriceComparison,
    SyncHistory
};