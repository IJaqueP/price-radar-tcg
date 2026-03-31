/**
 * JustTCG Matching Service
 * 
 * Maneja el matching de productos sellados Shopify con JustTCG
 * - Búsqueda por set
 * - Búsqueda por similitud de nombre
 * - Priorización de productos específicos vs genéricos
 */

const axios = require('axios');
const { normalizeString, similarity } = require('./sealedProductParsingService');

const JUSTTCG_BASE_URL = process.env.JUSTTCG_BASE_URL || 'https://api.justtcg.com/v1';
const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;

const REQUEST_DELAY_MS = 250;
const SET_CACHE = new Map();
const CARDS_CACHE = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Realiza una solicitud con reintentos automáticos para rate limits
 */
async function requestWithRetry(config, retries = 3) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await axios(config);
    } catch (error) {
      const status = error.response?.status;
      if (status === 429 && attempt < retries) {
        const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '0', 10);
        const wait = retryAfter > 0 ? retryAfter * 1000 : 750 * Math.pow(2, attempt);
        await sleep(wait);
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
  return null;
}

/**
 * Limpia el nombre del set removiendo prefijos y caracteres especiales
 */
function cleanSetName(setName) {
  if (!setName) return '';
  let name = setName
    .replace(/\[.*?\]/g, '')
    .replace(/"/g, '')
    .trim();

  const prefixes = [
    /^pokemon\s+/i,
    /^mtg\s+-?\s*/i,
    /^magic\s+the\s+gathering\s+/i,
    /^gundam\s+card\s+game\s+/i,
    /^gundam\s+/i,
    /^one\s+piece\s+card\s+game\s+/i,
    /^one\s+piece\s+/i,
  ];

  for (const rx of prefixes) {
    name = name.replace(rx, '');
  }

  return name.trim();
}

/**
 * Construye múltiples queries para buscar el set
 * Intenta diferentes partes del título para aumentar posibilidades de match
 */
function buildSetQueries(title, parsed) {
  const queries = [];

  const cleaned = cleanSetName(parsed.setName || '');
  if (cleaned) queries.push(cleaned);

  const dashParts = title.split(' - ');
  if (dashParts.length > 1) {
    const tail = dashParts.slice(1).join(' - ');
    const tailBeforeColon = tail.split(':')[0].trim();
    if (tailBeforeColon) queries.push(tailBeforeColon);
  }

  const colonParts = title.split(':');
  if (colonParts.length > 1) {
    const tail = colonParts.slice(1).join(':').trim();
    const tailBeforeDash = tail.split(' - ')[0].trim();
    if (tailBeforeDash) queries.push(tailBeforeDash);
  }

  return [...new Set(queries.filter(Boolean))];
}

/**
 * Busca un set en JustTCG por nombre
 */
async function findSet(gameId, setName) {
  const cacheKey = `${gameId}|${setName}`;
  if (SET_CACHE.has(cacheKey)) return SET_CACHE.get(cacheKey);

  const response = await requestWithRetry({
    method: 'GET',
    url: `${JUSTTCG_BASE_URL}/sets`,
    headers: { 'X-API-Key': JUSTTCG_API_KEY },
    params: {
      game: gameId,
      q: setName,
      orderBy: 'name',
      order: 'asc',
    },
    timeout: 15000,
  });

  const sets = Array.isArray(response?.data?.data) ? response.data.data : [];
  if (sets.length === 0) {
    SET_CACHE.set(cacheKey, null);
    return null;
  }

  const normalizedSet = normalizeString(setName);
  const exact = sets.find((s) => normalizeString(s.name) === normalizedSet);
  if (exact) {
    SET_CACHE.set(cacheKey, exact);
    return exact;
  }

  let best = sets[0];
  let bestScore = similarity(normalizedSet, normalizeString(best.name));

  for (const s of sets.slice(1)) {
    const score = similarity(normalizedSet, normalizeString(s.name));
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }

  SET_CACHE.set(cacheKey, best);
  return best;
}

/**
 * Busca un set en JustTCG usando múltiples queries
 */
async function findSetByQueries(gameId, setQueries) {
  for (const q of setQueries) {
    const set = await findSet(gameId, q);
    if (set) return { set, usedQuery: q };
  }
  return { set: null, usedQuery: null };
}

/**
 * Obtiene tarjetas selladas de un set
 */
async function findSealedCards(gameId, setId) {
  const cacheKey = `${gameId}|${setId}`;
  if (CARDS_CACHE.has(cacheKey)) return CARDS_CACHE.get(cacheKey);

  const response = await requestWithRetry({
    method: 'GET',
    url: `${JUSTTCG_BASE_URL}/cards`,
    headers: { 'X-API-Key': JUSTTCG_API_KEY },
    params: {
      game: gameId,
      set: setId,
      condition: 'Sealed',
      limit: 20,
      include_null_prices: false,
      include_price_history: false,
    },
    timeout: 15000,
  });

  const cards = Array.isArray(response?.data?.data) ? response.data.data : [];
  CARDS_CACHE.set(cacheKey, cards);
  return cards;
}

/**
 * Busca tarjetas selladas por query
 */
async function findSealedCardsByQuery(gameId, query, setId = null) {
  const response = await requestWithRetry({
    method: 'GET',
    url: `${JUSTTCG_BASE_URL}/cards`,
    headers: { 'X-API-Key': JUSTTCG_API_KEY },
    params: {
      game: gameId,
      set: setId || undefined,
      q: query,
      condition: 'Sealed',
      limit: 20,
      include_null_prices: false,
      include_price_history: false,
    },
    timeout: 15000,
  });

  return Array.isArray(response?.data?.data) ? response.data.data : [];
}

/**
 * Normaliza un título para búsqueda
 */
function normalizeTitleForSearch(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Selecciona la variante Sealed de una tarjeta
 */
function pickSealedVariant(card) {
  if (!card || !Array.isArray(card.variants) || card.variants.length === 0) {
    return null;
  }
  const sealed = card.variants.find((v) => (v.condition || '').toLowerCase() === 'sealed');
  return sealed || card.variants[0];
}

/**
 * Encuentra la mejor tarjeta que coincida con el título de Shopify
 * 
 * Algoritmo:
 * 1. Calcula similitud de nombre y combinado (nombre + set + details)
 * 2. Da bonus a productos específicos (sin Case, Display, Bundle, etc.)
 * 3. Si no hay match >= 60%, busca solo en productos específicos
 * 4. Retorna mejor match o null si score < 60%
 */
function pickBestCard(shopifyTitle, cards) {
  const normalizedShopify = normalizeTitleForSearch(shopifyTitle);
  let best = null;
  let bestScore = 0;
  const scored = [];

  for (const card of cards) {
    const nameText = `${card.name || ''}`.trim();
    const combinedText = `${card.name || ''} ${card.set_name || ''} ${card.details || ''}`.trim();

    const normalizedName = normalizeTitleForSearch(nameText);
    const normalizedCombined = normalizeTitleForSearch(combinedText);

    const scoreName = similarity(normalizedShopify, normalizedName);
    const scoreCombined = similarity(normalizedShopify, normalizedCombined);
    let score = Math.max(scoreName, scoreCombined);

    // BONIFICACIÓN: Preferir productos específicos (sin Case, Display, Bonus, etc)
    const isGeneric = /case|display|bonus|bundle|art bundle/i.test(card.name);
    if (!isGeneric) {
      score += 5; // +5% de bonus a productos más específicos
    }

    scored.push({ card, score });

    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }

  // PASE 2: Si no encontramos algo, preferir productos sin palabras "genéricas" en el nombre
  if (best && bestScore < 75) {
    const cardsWithoutGeneric = cards.filter(card => 
      !/case|display|bonus|bundle|art bundle|prerelease|promotional|promo/i.test(card.name)
    );
    
    if (cardsWithoutGeneric.length > 0) {
      // Re-score solo los productos específicos
      let bestSpecific = null;
      let bestSpecificScore = 0;
      
      for (const card of cardsWithoutGeneric) {
        const nameText = `${card.name || ''}`.trim();
        const combinedText = `${card.name || ''} ${card.set_name || ''} ${card.details || ''}`.trim();

        const normalizedName = normalizeTitleForSearch(nameText);
        const normalizedCombined = normalizeTitleForSearch(combinedText);

        const scoreName = similarity(normalizedShopify, normalizedName);
        const scoreCombined = similarity(normalizedShopify, normalizedCombined);
        let score = Math.max(scoreName, scoreCombined);
        
        // +15 puntos de bonus para productos específicos
        score += 15;
        
        if (score > bestSpecificScore) {
          bestSpecificScore = score;
          bestSpecific = card;
        }
      }
      
      if (bestSpecific && bestSpecificScore > bestScore) {
        best = bestSpecific;
        bestScore = bestSpecificScore;
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return {
    card: best && bestScore >= 60 ? best : null,
    score: bestScore,
    topCandidates: scored.slice(0, 5),
  };
}

module.exports = {
  requestWithRetry,
  buildSetQueries,
  findSet,
  findSetByQueries,
  findSealedCards,
  findSealedCardsByQuery,
  pickBestCard,
  pickSealedVariant,
  normalizeTitleForSearch,
  sleep,
  REQUEST_DELAY_MS,
  SET_CACHE,
  CARDS_CACHE,
};
