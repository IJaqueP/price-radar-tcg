/**
 * Script para verificar los product_types en la BD
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { Sequelize } = require('sequelize');

async function checkProductTypes() {
    try {
        console.log('🔍 Verificando product_types en shopify_products...\n');
        
        await sequelize.authenticate();
        
        // Obtener todos los product_types únicos
        const results = await sequelize.query(
            `SELECT DISTINCT product_type, COUNT(*) as count 
             FROM shopify_products 
             WHERE product_type IS NOT NULL 
             GROUP BY product_type 
             ORDER BY count DESC 
             LIMIT 50`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        
        console.log('📊 Product Types encontrados:\n');
        results.forEach(row => {
            console.log(`   ${row.product_type.padEnd(30)} → ${row.count} productos`);
        });
        
        console.log(`\n✅ Total de categorías: ${results.length}`);
        
        await sequelize.close();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkProductTypes();
