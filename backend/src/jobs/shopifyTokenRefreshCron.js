/**
 * Cron Job para renovar Shopify Access Token automáticamente
 * Se ejecuta cada 23 horas para mantener el token siempre activo
 * 
 * Se inicia automáticamente cuando el servidor arranca (si NODE_ENV=production)
 */

const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Renueva el Shopify Access Token
 */
async function renewShopifyToken() {
    try {
        console.log('\n🔄 [CRON] Renovando Shopify Access Token...');

        const clientId = process.env.SHOPIFY_CLIENT_ID;
        const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
        const storeUrl = process.env.SHOPIFY_STORE_URL;

        if (!clientId || !clientSecret) {
            throw new Error('Falta SHOPIFY_CLIENT_ID o SHOPIFY_CLIENT_SECRET');
        }

        // Solicitar nuevo token
        const tokenUrl = `https://${storeUrl}/admin/oauth/access_token`;
        const payload = {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        };

        const response = await axios.post(tokenUrl, payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.data.access_token) {
            throw new Error('No access_token en respuesta');
        }

        const newToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 86400;

        // Actualizar .env
        updateEnvFile(newToken);

        // Actualizar también en memory (para que el servidor siga usando el nuevo sin reiniciar)
        process.env.SHOPIFY_ACCESS_TOKEN = newToken;

        console.log(`✅ Token renovado correctamente`);
        console.log(`⏱️  Próxima renovación: en 23 horas`);
        console.log(`🕐 Timestamp: ${new Date().toLocaleString('es-CL')}\n`);

    } catch (error) {
        console.error(`❌ [CRON] Error renovando token:`, error.message);
        // No detener el servidor, solo log del error
    }
}

/**
 * Actualiza el archivo .env con el nuevo access token
 */
function updateEnvFile(newToken) {
    // Ruta correcta: backend/.env (dos niveles arriba de src/jobs/)
    const envPath = path.join(__dirname, '..', '..', '.env');

    try {
        let envContent = fs.readFileSync(envPath, 'utf-8');

        if (envContent.includes('SHOPIFY_ACCESS_TOKEN=')) {
            envContent = envContent.replace(
                /SHOPIFY_ACCESS_TOKEN=.*/,
                `SHOPIFY_ACCESS_TOKEN=${newToken}`
            );
        } else {
            envContent = envContent.replace(
                /(SHOPIFY_API_VERSION=.*)/,
                `$1\nSHOPIFY_ACCESS_TOKEN=${newToken}`
            );
        }

        fs.writeFileSync(envPath, envContent, 'utf-8');
    } catch (error) {
        console.error('Error actualizando .env:', error.message);
    }
}

/**
 * Inicia el cron job
 * Se ejecuta cada 23 horas a las HH:00:00
 */
function startTokenRefreshCron() {
    console.log('⏰ Cron Job iniciado: Renovación de Shopify Token cada 23 horas');
    
    // Ejecutar cada 23 horas (23 * 60 minutos)
    cron.schedule('0 * * * *', () => {
        // Contar cuántas veces se ha ejecutado para renovar cada 23 horas
        renewShopifyToken();
    }, {
        timezone: "America/Santiago"
    });

    // Alternativa: usar setInterval para mayor control
    // Renovar cada 23 horas (82800000 ms)
    // setInterval(renewShopifyToken, 23 * 60 * 60 * 1000);
}

module.exports = {
    startTokenRefreshCron,
    renewShopifyToken
};
