const axios = require('axios');
const shopifyConfig = require('../config/shopify');
const logger = require('../utils/logger');

const WEBHOOK_TOPICS = [
    'PRODUCTS_CREATE',
    'PRODUCTS_UPDATE',
    'PRODUCTS_DELETE',
    'INVENTORY_LEVELS_UPDATE'
];

function topicToPath(topic) {
    const map = {
        'PRODUCTS_CREATE': 'products/create',
        'PRODUCTS_UPDATE': 'products/update',
        'PRODUCTS_DELETE': 'products/delete',
        'INVENTORY_LEVELS_UPDATE': 'inventory_levels/update'
    };
    return map[topic] || topic.toLowerCase().replace('_', '/');
}

async function graphql(query, variables = {}) {
    const res = await axios.post(shopifyConfig.graphqlUrl, { query, variables }, {
        headers: shopifyConfig.headers,
        timeout: 15000
    });
    return res.data;
}

async function getExistingWebhooks() {
    const query = `{
        webhookSubscriptions(first: 50) {
            edges {
                node {
                    id
                    topic
                    endpoint {
                        ... on WebhookHttpEndpoint {
                            callbackUrl
                        }
                    }
                }
            }
        }
    }`;

    const data = await graphql(query);
    return (data.data?.webhookSubscriptions?.edges || []).map(e => e.node);
}

async function deleteWebhook(id) {
    const mutation = `mutation webhookSubscriptionDelete($id: ID!) {
        webhookSubscriptionDelete(id: $id) {
            userErrors { field message }
            deletedWebhookSubscriptionId
        }
    }`;

    await graphql(mutation, { id });
}

async function createWebhook(topic, callbackUrl) {
    const mutation = `mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
            webhookSubscription {
                id
                topic
            }
            userErrors { field message }
        }
    }`;

    const variables = {
        topic,
        webhookSubscription: {
            callbackUrl,
            format: 'JSON'
        }
    };

    const data = await graphql(mutation, variables);
    const result = data.data?.webhookSubscriptionCreate;
    const errors = result?.userErrors || [];

    if (errors.length > 0) {
        throw new Error(`Error registrando webhook ${topic}: ${JSON.stringify(errors)}`);
    }

    return result.webhookSubscription;
}

async function registerAllWebhooks(backendUrl) {
    if (!backendUrl) {
        logger.warn('[WEBHOOKS] No se configuró BACKEND_URL en .env — webhooks no registrados. Sync solo por cron.');
        return { registered: 0, skipped: true };
    }

    const baseUrl = backendUrl.replace(/\/$/, '');
    logger.info(`[WEBHOOKS] Registrando webhooks con callback base: ${baseUrl}`);

    try {
        const existing = await getExistingWebhooks();

        // Eliminar webhooks existentes que apunten a nuestro dominio
        for (const wh of existing) {
            const url = wh.endpoint?.callbackUrl || '';
            if (url.startsWith(baseUrl)) {
                await deleteWebhook(wh.id);
                logger.info(`[WEBHOOKS] Eliminado webhook viejo: ${wh.topic} -> ${url}`);
            }
        }

        // Registrar los nuevos
        let registered = 0;
        for (const topic of WEBHOOK_TOPICS) {
            const path = topicToPath(topic);
            const callbackUrl = `${baseUrl}/api/shopify/webhooks/${path}`;

            try {
                await createWebhook(topic, callbackUrl);
                logger.info(`[WEBHOOKS] ✅ ${topic} -> ${callbackUrl}`);
                registered++;
            } catch (err) {
                logger.error(`[WEBHOOKS] ❌ ${topic}: ${err.message}`);
            }
        }

        logger.info(`[WEBHOOKS] ${registered}/${WEBHOOK_TOPICS.length} webhooks registrados`);
        return { registered, total: WEBHOOK_TOPICS.length };
    } catch (err) {
        logger.error(`[WEBHOOKS] Error general registrando webhooks: ${err.message}`);
        return { registered: 0, error: err.message };
    }
}

module.exports = { registerAllWebhooks };
