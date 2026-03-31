const crypto = require('crypto');

function verifyShopifyWebhook(req, res, next) {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (!secret) {
        return res.status(500).json({
            success: false,
            error: 'SHOPIFY_WEBHOOK_SECRET no está configurado'
        });
    }

    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    if (!hmacHeader) {
        return res.status(401).json({
            success: false,
            error: 'Header X-Shopify-Hmac-Sha256 faltante'
        });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const digest = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');

    const expected = Buffer.from(digest, 'utf8');
    const received = Buffer.from(hmacHeader, 'utf8');

    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        return res.status(401).json({
            success: false,
            error: 'Firma de webhook inválida'
        });
    }

    next();
}

module.exports = {
    verifyShopifyWebhook
};
