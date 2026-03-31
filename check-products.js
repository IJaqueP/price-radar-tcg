const { ShopifyProduct } = require('./backend/src/models');

async function checkProducts() {
    try {
        // Contar productos por tipo y stock
        const magicCount = await ShopifyProduct.count({
            where: {
                product_type: 'Sealed Magic the Gathering',
                status: 'active',
                inventory_quantity: { [require('sequelize').Op.gte]: 1 }
            }
        });

        const pokemonCount = await ShopifyProduct.count({
            where: {
                product_type: 'Sealed Pokemon TCG',
                status: 'active',
                inventory_quantity: { [require('sequelize').Op.gte]: 1 }
            }
        });

        console.log(`Magic con stock: ${magicCount}`);
        console.log(`Pokemon con stock: ${pokemonCount}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProducts();
