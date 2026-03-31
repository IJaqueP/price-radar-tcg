const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Modelo SealedProductMapping
 * 
 * Mapea productos SELLADOS de Shopify con productos sellados de JustTCG
 * Soporta: Magic The Gathering, Pokémon, One Piece, Gundam
 * 
 * Productos Sellados: Booster Box, Booster Pack, Starter Deck, etc.
 */
const SealedProductMapping = sequelize.define(
  'SealedProductMapping',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // =========== REFERENCIAS A SHOPIFY ===========
    shopify_product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'shopify_products',
        key: 'id',
      },
      comment: 'FK a ShopifyProduct.id',
    },

    shopify_variant_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID de la variante en Shopify',
    },

    shopify_title: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Título del producto en Shopify al momento del matching',
    },

    // =========== DATOS DE JustTCG ===========
    justtcg_card_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'ID único de la carta/producto en JustTCG. Ej: mtg-commander-legends-booster-box',
    },

    justtcg_variant_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'ID único de la variante en JustTCG. Ej: mtg-commander-legends-booster-box_english_unopened',
    },

    justtcg_rarity: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Sealed',
      comment: 'Rarity en JustTCG. SIEMPRE "Sealed" para productos sellados',
    },

    // =========== IDENTIFICADORES EXTERNOS ===========
    tcgplayer_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      index: true,
      comment: 'ID universal de TCGPlayer para el producto',
    },

    tcgplayer_sku_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      index: true,
      comment: 'SKU específico de la variante en TCGPlayer. Ej: 123456-BOX para inglés, 123456-JP-BOX para japonés',
    },

    // =========== DETALLES DEL PRODUCTO SELLADO ===========
    product_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Tipo de producto. Ej: "Booster Box", "Booster Pack", "Starter Deck", "Collector Booster"',
    },

    set_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      index: true,
      comment: 'Nombre del set. Ej: "Commander Legends"',
    },

    game: {
      type: DataTypes.ENUM(
        'magic-the-gathering',
        'mtg',
        'pokemon',
        'one-piece-card-game',
        'gundam'
      ),
      allowNull: false,
      index: true,
      comment: 'Juego. Soportados: mtg, pokemon, one-piece-card-game, gundam',
    },

    language: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'English',
      comment: 'Idioma. Ej: English, Japanese, German, French, etc.',
    },

    edition: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Edición especial si aplica. Ej: "1st Edition", "Unlimited", etc.',
    },

    // =========== CALIDAD DEL MATCHING ===========
    match_confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Nivel de confianza del matching (0-100). > 85 = muy confiable',
    },

    match_method: {
      type: DataTypes.ENUM(
        'tcgplayer_id',       // Búsqueda exacta por TCGPlayer ID
        'variant_sku',        // Búsqueda por SKU de variante
        'hierarchical_search' // Búsqueda jerárquica: game→set→product_type→language
      ),
      allowNull: false,
      comment: 'Método utilizado para encontrar el match',
    },

    match_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre el matching. Ej: idioma no exacto, variante cercana, etc.',
    },

    // =========== CONTROL Y AUDITORÍA ===========
    last_updated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Última vez que se actualizó el mapping',
    },

    last_price_sync: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última vez que se sincronizó el precio desde JustTCG',
    },

    // =========== PRECIOS CAPTURADOS ===========
    shopify_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Precio en Shopify al momento del matching',
    },

    justtcg_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Precio en JustTCG al momento del matching',
    },

    price_difference_pct: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Diferencia de precio entre Shopify y JustTCG. Positivo = Shopify más caro',
    },
  },
  {
    tableName: 'SealedProductMappings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['game', 'set_name'],
        name: 'idx_game_set_name',
      },
      {
        fields: ['tcgplayer_id'],
        name: 'idx_tcgplayer_id',
      },
      {
        fields: ['tcgplayer_sku_id'],
        name: 'idx_tcgplayer_sku_id',
      },
      {
        fields: ['match_confidence'],
        name: 'idx_match_confidence',
      },
    ],
  }
);

module.exports = SealedProductMapping;
