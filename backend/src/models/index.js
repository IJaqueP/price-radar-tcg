/*
    INDEX DE MODELOS

    Centraliza todos los modelos y define sus relaciones
*/

const Product = require('./Product');
const ProductMapping = require('./ProductMapping');
const PriceComparison = require('./PriceComparison');
const SyncHistory = require('./SyncHistory');
const ShopifyProduct = require('./ShopifyProduct');
const SkuMapping = require('./SkuMapping');
const SealedProductMapping = require('./SealedProductMapping');

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

// ShopifyProduct <-> SkuMapping (1:1)
ShopifyProduct.hasOne(SkuMapping, {
    foreignKey: 'shopify_product_id',
    as: 'sku_mapping'
});
SkuMapping.belongsTo(ShopifyProduct, {
    foreignKey: 'shopify_product_id',
    as: 'shopify_product'
});

// ShopifyProduct <-> SealedProductMapping (1:1)
ShopifyProduct.hasOne(SealedProductMapping, {
    foreignKey: 'shopify_product_id',
    as: 'sealed_mapping'
});
SealedProductMapping.belongsTo(ShopifyProduct, {
    foreignKey: 'shopify_product_id',
    as: 'shopify_product'
});


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    Product,
    ProductMapping,
    PriceComparison,
    SyncHistory,
    ShopifyProduct,
    SkuMapping,
    SealedProductMapping
};