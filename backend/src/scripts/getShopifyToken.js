/**
 * Script para obtener/renovar Access Token de Shopify vía OAuth 2.0
 * Ejecutar: node getShopifyToken.js
 * 
 * Este script usa el Client ID y Secret para obtener un access token válido
 * y lo guarda en el archivo .env
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getShopifyAccessToken() {
    try {
        console.log('🔐 Obteniendo Access Token de Shopify vía OAuth 2.0...\n');

        const clientId = process.env.SHOPIFY_CLIENT_ID;
        const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
        const storeUrl = process.env.SHOPIFY_STORE_URL;

        if (!clientId || !clientSecret) {
            throw new Error('❌ Falta SHOPIFY_CLIENT_ID o SHOPIFY_CLIENT_SECRET en .env');
        }

        // Endpoint para obtener el access token
        const tokenUrl = `https://${storeUrl}/admin/oauth/access_token`;

        // Payload para OAuth 2.0
        const payload = {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        };

        console.log(`📍 Tienda: ${storeUrl}`);
        console.log(`🔑 Client ID: ${clientId.substring(0, 8)}...`);
        console.log(`🔐 Solicitando token...\n`);

        const response = await axios.post(tokenUrl, payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.data.access_token) {
            throw new Error('No access_token en respuesta: ' + JSON.stringify(response.data));
        }

        const accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 86400; // Default 24 horas

        console.log('✅ Token obtenido correctamente!\n');
        console.log(`🎫 Access Token: ${accessToken.substring(0, 20)}...`);
        console.log(`⏱️  Expira en: ${Math.floor(expiresIn / 3600)} horas\n`);

        // Actualizar el .env con el nuevo token
        updateEnvFile(accessToken);

        console.log('💾 Token guardado en .env');
        console.log('✅ Listo para sincronizar productos!\n');

        return accessToken;

    } catch (error) {
        console.error('❌ Error obteniendo token:', error.message);
        
        if (error.response?.status === 401) {
            console.error('💡 Verifica que SHOPIFY_CLIENT_ID y SHOPIFY_CLIENT_SECRET sean correctos');
        }
        
        process.exit(1);
    }
}

/**
 * Actualiza el archivo .env con el nuevo access token
 */
function updateEnvFile(newToken) {
    // Ruta correcta: backend/.env (dos niveles arriba de src/scripts/)
    const envPath = path.join(__dirname, '..', '..', '.env');

    // Leer el archivo actual
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Reemplazar o agregar la línea SHOPIFY_ACCESS_TOKEN
    if (envContent.includes('SHOPIFY_ACCESS_TOKEN=')) {
        envContent = envContent.replace(
            /SHOPIFY_ACCESS_TOKEN=.*/,
            `SHOPIFY_ACCESS_TOKEN=${newToken}`
        );
    } else {
        // Agregar después de SHOPIFY_API_VERSION
        envContent = envContent.replace(
            /(SHOPIFY_API_VERSION=.*)/,
            `$1\nSHOPIFY_ACCESS_TOKEN=${newToken}`
        );
    }

    // Escribir el archivo actualizado
    fs.writeFileSync(envPath, envContent, 'utf-8');
}

// Ejecutar
getShopifyAccessToken();
