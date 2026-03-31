/**
 * Servicio de Parsing para Productos Sellados
 *
 * Extrae información estructurada de títulos de productos sellados de Shopify
 * Soporta: Magic The Gathering, Pokémon, One Piece, Gundam
 *
 * Estructura típica de títulos:
 * - "Commander Legends: Collector Booster Box - English"
 * - "Pokémon Scarlet & Violet Booster Pack (Japanese)"
 * - "One Piece Starter Deck Ace & Luffy"
 * - "Gundam Build Fighters Booster Box"
 */

const levenshtein = (a, b) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const similarity = (a, b) => {
  const maxLength = Math.max(a.length, b.length);
  const distance = levenshtein(a, b);
  return ((maxLength - distance) / maxLength) * 100;
};

/**
 * Tipos de productos sellados soportados
 */
const SEALED_PRODUCT_TYPES = {
  // Magic: The Gathering
  'Booster Box': {
    patterns: [/booster\s+box/i, /booster\s+box\s*$/i],
    aliases: ['Box', 'BB'],
  },
  'Booster Pack': {
    patterns: [/booster\s+pack/i, /(?<!collector)(?<!set)(?<!draft)\s*booster\s*pack/i],
    aliases: ['Pack', 'BP'],
  },
  'Collector Booster': {
    patterns: [/collector\s+booster/i],
    aliases: ['Collector', 'CB'],
  },
  'Set Booster': {
    patterns: [/set\s+booster/i],
    aliases: ['SB'],
  },
  'Draft Booster': {
    patterns: [/draft\s+booster/i],
    aliases: ['DB'],
  },
  'Starter Deck': {
    patterns: [/starter\s+deck/i, /theme\s+deck/i],
    aliases: ['Deck', 'SD'],
  },
  'Commander Deck': {
    patterns: [/commander\s+deck/i],
    aliases: ['CD'],
  },
  'Planeswalker Deck': {
    patterns: [/planeswalker\s+deck/i],
    aliases: ['PW Deck'],
  },

  // Pokémon - pueden ser iguales a MTG
  'Deck Box': {
    patterns: [/deck\s+box/i],
    aliases: [],
  },
  'Bundle': {
    patterns: [/bundle/i],
    aliases: ['Gift Box'],
  },
  'Blister Pack': {
    patterns: [/blister\s+pack/i],
    aliases: ['Blister'],
  },

  // One Piece / Gundam
  'Battle Deck': {
    patterns: [/battle\s+deck/i],
    aliases: [],
  },
  'Structure Deck': {
    patterns: [/structure\s+deck/i],
    aliases: [],
  },
};

/**
 * Idiomas soportados
 */
const LANGUAGE_MAP = {
  English: [/english|eng\b|english edition/i],
  Japanese: [/japanese|japan|jpn|日本語|jp\b/i],
  German: [/german|deu|deutsch/i],
  French: [/french|fra|français|french edition/i],
  Italian: [/italian|ita|italiano/i],
  Spanish: [/spanish|esp|español/i],
  Portuguese: [/portuguese|por|português|portuguese edition/i],
  Russian: [/russian|rus|русский/i],
  'Simplified Chinese': [/simplified chinese|chinese.*simplified|简体中文/i],
  'Traditional Chinese': [/traditional chinese|chinese.*traditional|繁體中文/i],
  Korean: [/korean|kor|한국어/i],
};

/**
 * Ediciones especiales
 */
const EDITION_MAP = {
  '1st Edition': [/1st\s+edition|first\s+edition/i],
  'Unlimited': [/unlimited/i],
  'Limited Edition': [/limited\s+edition/i],
  'Special Edition': [/special\s+edition/i],
};

/**
 * Mapeo de juegos basado en palabras clave en el título
 */
const GAME_KEYWORDS = {
  'magic-the-gathering': [
    /magic|the\s+gathering|mtg|\bm:tg\b/i,
    /planeswalker|phyrexian|planar/i,
  ],
  pokemon: [
    /pokémon|pokemon|pkmn|pokémon\s+tcg/i,
    /charizard|pikachu|alakazam|dragonite/i,
  ],
  'one-piece-card-game': [
    /one\s+piece|op\s+tcg|one\-piece/i,
    /luffy|zoro|sanji|strawhats|mugiwara/i,
  ],
  gundam: [
    /gundam|mobile\s+suit|gundam\s+wing/i,
    /zeon|amuro|char|federation/i,
  ],
};

/**
 * Detecta si un producto es sellado
 */
function isSealedProduct(title) {
  const sealedKeywords = [
    /booster\s+(box|pack|bundle)/i,
    /collector.*booster/i,
    /starter\s+deck/i,
    /commander\s+deck/i,
    /theme\s+deck/i,
    /planeswalker\s+deck/i,
    /battle\s+deck/i,
    /structure\s+deck/i,
    /deck\s+box/i,
    /bundle/i,
    /blister\s+pack/i,
    /gift\s+box/i,
    /set\s+booster/i,
    /draft\s+booster/i,
  ];

  return sealedKeywords.some((pattern) => pattern.test(title));
}

/**
 * Extrae el tipo de producto sellado del título
 */
function extractProductType(title) {
  for (const [productType, config] of Object.entries(SEALED_PRODUCT_TYPES)) {
    for (const pattern of config.patterns) {
      if (pattern.test(title)) {
        return productType;
      }
    }
  }
  return null;
}

/**
 * Extrae el idioma del título
 * Por defecto: English (99% de productos no especifican idioma)
 */
function extractLanguage(title) {
  for (const [language, patterns] of Object.entries(LANGUAGE_MAP)) {
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return language;
      }
    }
  }
  return 'English'; // Valor por defecto
}

/**
 * Extrae la edición del título si existe
 */
function extractEdition(title) {
  for (const [edition, patterns] of Object.entries(EDITION_MAP)) {
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return edition;
      }
    }
  }
  return null;
}

/**
 * Detecta el juego basado en palabras clave del título
 */
function detectGame(title) {
  for (const [game, patterns] of Object.entries(GAME_KEYWORDS)) {
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return game;
      }
    }
  }
  return null;
}

/**
 * Normaliza strings para comparación
 */
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, ' ')      // Normalizar espacios
    .trim();
}

/**
 * Extrae el nombre del set del título
 * Estrategia: obtener texto antes del primer ":" o "|" o "-"
 */
function extractSetName(title) {
  // Remover información de condición/idioma al final
  let cleanTitle = title
    .replace(/\s*[-–—]\s*(near\s+mint|lightly\s+played|mint|english|japanese|german|french|spanish|portuguese|russian|chinese|korean)/gi, '')
    .replace(/\s*[()[\]]\s*(near\s+mint|lightly\s+played|mint|english|japanese|german|french|spanish|portuguese|russian|chinese|korean)[)[\]]\s*/gi, '');

  // Dividir por delimitadores comunes
  const parts = cleanTitle.split(/[\s:\|]/);

  // Tomar las primeras partes como nombre del set
  // Filtrar palabras que son claramente tipos de productos
  const productTypeKeywords = ['booster', 'starter', 'deck', 'bundle', 'planeswalker', 'box', 'pack', 'collector', 'set', 'draft'];

  let setName = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    // Detener si encontramos una palabra de tipo de producto
    if (productTypeKeywords.some((kw) => part.toLowerCase().includes(kw))) {
      break;
    }
    if (part && part.length > 1) {
      setName = setName ? `${setName} ${part}` : part;
    }
  }

  return setName.trim() || title;
}

/**
 * Parsea un producto sellado de Shopify
 * Retorna objeto estructurado con toda la información extraída
 */
function parseSealedProduct(shopifyProduct) {
  const title = shopifyProduct.title || '';

  if (!isSealedProduct(title)) {
    return {
      isSealed: false,
      error: 'Product is not a sealed product',
    };
  }

  const game = detectGame(title);
  const productType = extractProductType(title);
  const setName = extractSetName(title);
  const language = extractLanguage(title);
  const edition = extractEdition(title);

  return {
    isSealed: true,
    originalTitle: title,
    game,
    productType,
    setName,
    language,
    edition,
    confidence: calculateParsingConfidence(title, { game, productType, setName }),
    validations: {
      hasGame: !!game,
      hasProductType: !!productType,
      hasSetName: !!setName,
    },
  };
}

/**
 * Calcula la confianza del parsing basado en qué datos se pudieron extraer
 */
function calculateParsingConfidence(title, parsed) {
  let score = 0;

  // Juego identificado: 40%
  if (parsed.game) score += 40;

  // Tipo de producto identificado: 30%
  if (parsed.productType) score += 30;

  // Set name extraído: 30%
  if (parsed.setName && parsed.setName.length > 3) score += 30;

  return score;
}

module.exports = {
  isSealedProduct,
  parseSealedProduct,
  extractProductType,
  extractLanguage,
  extractEdition,
  detectGame,
  extractSetName,
  normalizeString,
  similarity,
  levenshtein,
  SEALED_PRODUCT_TYPES,
  LANGUAGE_MAP,
  GAME_KEYWORDS,
};
