const { Op } = require('sequelize');
const ShopifyProduct = require('../models/ShopifyProduct');
const SkuMapping = require('../models/SkuMapping');
const SealedProductMapping = require('../models/SealedProductMapping');
const shopifyService = require('../services/shopifyService');
const logger = require('../utils/logger');

function parseWebhookPayload(req) {
    if (Buffer.isBuffer(req.body)) {
        const raw = req.body.toString('utf8');
        return raw ? JSON.parse(raw) : {};
    }
    return req.body || {};
}

function toGid(resourceType, numericId) {
    if (!numericId) return null;
    return `gid://shopify/${resourceType}/${numericId}`;
}

function buildIdCandidates({ gid, numericId }) {
    const out = [];
    if (gid) out.push(gid);
    if (numericId) {
        out.push(String(numericId));
    }
    return out;
}

function normalizeStatus(status) {
    const value = String(status || 'active').toLowerCase();
    if (['active', 'draft', 'archived'].includes(value)) {
        return value;
    }
    return 'active';
}

class ShopifyWebhookController {
    async handleProductUpsert(req, res) {
        try {
            const payload = parseWebhookPayload(req);
            const topic = req.get('X-Shopify-Topic') || 'products/update';

            const productGid = payload.admin_graphql_api_id || toGid('Product', payload.id);
            const variants = Array.isArray(payload.variants) ? payload.variants : [];

            if (!productGid || variants.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Webhook recibido sin variantes procesables'
                });
            }

            let processed = 0;
            let removed = 0;
            for (const variant of variants) {
                const variantGid = variant.admin_graphql_api_id || toGid('ProductVariant', variant.id);
                if (!variantGid) continue;

                const normalizedSku = (variant.sku && String(variant.sku).trim()) || (variant.barcode && String(variant.barcode).trim()) || null;

                // Si el producto pierde SKU/barcode, se elimina para mantener la BD solo con productos identificables.
                if (!normalizedSku) {
                    const existing = await ShopifyProduct.findOne({
                        where: { variant_id: variantGid },
                        attributes: ['id']
                    });

                    if (existing) {
                        await SkuMapping.destroy({ where: { shopify_product_id: existing.id } });
                        await SealedProductMapping.destroy({ where: { shopify_product_id: existing.id } });
                        await ShopifyProduct.destroy({ where: { id: existing.id } });
                        removed++;
                    }
                    continue;
                }

                const row = {
                    shopify_id: productGid,
                    title: payload.title || null,
                    // Shopify puede traer barcode sin sku; usamos barcode como identificador fallback.
                    shopify_sku: normalizedSku,
                    current_price: parseFloat(variant.price || 0),
                    variant_id: variantGid,
                    variant_title: variant.title && variant.title !== 'Default Title' ? variant.title : null,
                    status: normalizeStatus(payload.status),
                    inventory_quantity: Number.isFinite(Number(variant.inventory_quantity)) ? Number(variant.inventory_quantity) : 0,
                    product_type: payload.product_type || null,
                    vendor: payload.vendor || null,
                    last_synced_at: new Date(),
                    sku_validated: false,
                    raw_data: payload
                };

                await ShopifyProduct.upsert(row, {
                    returning: true,
                    conflictFields: ['variant_id']
                });
                processed++;
            }

            logger.info(`Webhook Shopify procesado (${topic})`, {
                product_id: productGid,
                variants: processed
            });

            return res.status(200).json({
                success: true,
                message: 'Webhook procesado',
                processed
            });
        } catch (error) {
            logger.error('Error procesando webhook de producto Shopify:', error.message);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async handleProductDelete(req, res) {
        try {
            const payload = parseWebhookPayload(req);
            const productIds = buildIdCandidates({
                gid: payload.admin_graphql_api_id || toGid('Product', payload.id),
                numericId: payload.id
            });

            if (productIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Webhook delete sin id de producto'
                });
            }

            const deleted = await ShopifyProduct.destroy({
                where: {
                    shopify_id: {
                        [Op.in]: productIds
                    }
                }
            });

            logger.info('Webhook Shopify delete procesado', {
                product_ids: productIds,
                deleted
            });

            return res.status(200).json({
                success: true,
                message: 'Webhook delete procesado',
                deleted
            });
        } catch (error) {
            logger.error('Error procesando webhook delete Shopify:', error.message);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async handleInventoryUpdate(req, res) {
        try {
            const payload = parseWebhookPayload(req);
            const inventoryItemId = payload.inventory_item_id;
            const available = Number(payload.available);

            if (!inventoryItemId || !Number.isFinite(available)) {
                return res.status(200).json({
                    success: true,
                    message: 'Webhook inventory sin datos suficientes'
                });
            }

            const variant = await shopifyService.getVariantByInventoryItemId(String(inventoryItemId));
            if (!variant || !variant.id) {
                return res.status(200).json({
                    success: true,
                    message: 'No se pudo mapear inventory_item_id a variante'
                });
            }

            const variantIds = buildIdCandidates({
                gid: variant.id,
                numericId: variant.id.split('/').pop()
            });

            const [updated] = await ShopifyProduct.update(
                {
                    inventory_quantity: available,
                    last_synced_at: new Date()
                },
                {
                    where: {
                        variant_id: {
                            [Op.in]: variantIds
                        }
                    }
                }
            );

            logger.info('Webhook inventory Shopify procesado', {
                inventory_item_id: inventoryItemId,
                variant_id: variant.id,
                updated
            });

            return res.status(200).json({
                success: true,
                message: 'Webhook inventory procesado',
                updated
            });
        } catch (error) {
            logger.error('Error procesando webhook inventory Shopify:', error.message);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new ShopifyWebhookController();
