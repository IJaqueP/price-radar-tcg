/**
 * SEARCH HELPERS - Utilidades para normalización de búsqueda
 * 
 * Este archivo contiene funciones reutilizables para normalizar textos
 * antes de hacer búsquedas. La idea es estandarizar el texto removiendo
 * caracteres especiales, acentos, mayúsculas, etc.
 * 
 * Esto permite búsquedas más precisas y sin depender de formateo exacto.
 */

/**
 * Normaliza un string para búsqueda
 * Proceso:
 * 1. Convierte a minúsculas
 * 2. Remueve acentos y diacríticos (é -> e, ñ -> n, etc)
 * 3. Remueve caracteres especiales (comas, puntos, paréntesis, comillas, etc)
 * 4. Remueve espacios múltiples
 * 5. Trimea espacios al inicio y final
 * 
 * Ejemplos:
 * "Pokémon: 'Lugia ex & Latias ex' Premium Collection" 
 *  -> "pokemon lugia ex latias ex premium collection"
 * 
 * @param {string} text - Texto a normalizar
 * @returns {string} - Texto normalizado
 */
function normalizeSearchText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        // Paso 1: Convertir a minúsculas
        .toLowerCase()
        // Paso 2: Normalizar Unicode y remover diacríticos
        // NFD = descompone caracteres acentuados, luego filtramos diacríticos
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Paso 3: Remover caracteres especiales (mantener solo letras, números, espacios)
        // Permite: a-z, 0-9, espacios
        .replace(/[^a-z0-9\s]/g, '')
        // Paso 4: Reemplazar múltiples espacios con uno solo
        .replace(/\s+/g, ' ')
        // Paso 5: Trimear espacios al inicio y final
        .trim();
}

/**
 * Extrae palabras clave de un texto normalizado
 * Útil para búsquedas por palabras clave individuales
 * 
 * Ejemplo:
 * "pokemon lugia ex latias ex" -> ["pokemon", "lugia", "ex", "latias"]
 * 
 * @param {string} text - Texto normalizado
 * @returns {Array<string>} - Array de palabras únicas
 */
function extractKeywords(text) {
    if (!text) return [];
    
    const normalized = normalizeSearchText(text);
    // Split por espacios, filtra strings vacíos, remueve duplicados
    const keywords = normalized.split(' ').filter(word => word.length > 0);
    return [...new Set(keywords)]; // Set remueve duplicados
}

/**
 * Verifica si un texto contiene todas las palabras clave
 * (búsqueda AND - todas las palabras deben estar presentes)
 * 
 * Ejemplo:
 * containsAllKeywords("pokemon lugia ex", ["pokemon", "lugia"])
 * -> true
 * 
 * @param {string} text - Texto a verificar (ya debe estar normalizado)
 * @param {Array<string>} keywords - Palabras clave a buscar
 * @returns {boolean} - True si contiene todas las palabras
 */
function containsAllKeywords(text, keywords) {
    if (!text || !keywords || keywords.length === 0) {
        return false;
    }

    const normalizedText = normalizeSearchText(text);
    return keywords.every(keyword => normalizedText.includes(keyword));
}

/**
 * Verifica si un texto contiene alguna de las palabras clave
 * (búsqueda OR - al menos una palabra debe estar presente)
 * 
 * Ejemplo:
 * containsAnyKeyword("pokemon lugia", ["charizard", "lugia"])
 * -> true (porque contiene "lugia")
 * 
 * @param {string} text - Texto a verificar (ya debe estar normalizado)
 * @param {Array<string>} keywords - Palabras clave a buscar
 * @returns {boolean} - True si contiene al menos una palabra
 */
function containsAnyKeyword(text, keywords) {
    if (!text || !keywords || keywords.length === 0) {
        return false;
    }

    const normalizedText = normalizeSearchText(text);
    return keywords.some(keyword => normalizedText.includes(keyword));
}

/**
 * Calcula similitud entre dos strings normalizados (Levenshtein distance)
 * Útil para detectar coincidencias aproximadas
 * 
 * Devuelve un score entre 0 y 1 (1 = coincidencia perfecta)
 * 
 * @param {string} str1 - Primer string (normalizado)
 * @param {string} str2 - Segundo string (normalizado)
 * @returns {number} - Score de similitud (0-1)
 */
function calculateSimilarity(str1, str2) {
    const s1 = normalizeSearchText(str1);
    const s2 = normalizeSearchText(str2);

    if (s1 === s2) return 1.0; // Coincidencia perfecta

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    // Calcular Levenshtein distance
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Calcula la distancia de edición (Levenshtein) entre dos strings
 * Número mínimo de ediciones (inserción, eliminación, sustitución)
 * necesarias para transformar un string en otro
 * 
 * @private
 * @param {string} s1 - Primer string
 * @param {string} s2 - Segundo string (debe ser más corto)
 * @returns {number} - Distancia de edición
 */
function getEditDistance(s1, s2) {
    const costs = [];

    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) {
            costs[s2.length] = lastValue;
        }
    }

    return costs[s2.length];
}

/**
 * Normaliza comillas especiales para búsqueda
 * Remueve comillas curvas (""") y comillas escapadas (\")
 * Útil para búsquedas donde el título en BD tiene comillas que el usuario no incluye
 * 
 * Ejemplo:
 * 'Lorwyn Eclipsed: "Collector Booster Pack"' 
 *  -> 'Lorwyn Eclipsed: Collector Booster Pack'
 * 
 * @param {string} text - Texto con posibles comillas especiales
 * @returns {string} - Texto sin comillas problemáticas
 */
function normalizeQuotes(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        // Remover comillas curvas (izquierda y derecha)
        .replace(/[""]/g, '')
        // Remover comillas escapadas
        .replace(/\\"/g, '')
        // Remover comillas normales si es necesario (opcional, pero útil)
        .replace(/"/g, '')
        .trim();
}

/**
 * Normaliza un título para búsqueda incluiendo comillas
 * Combina normalizeQuotes + normalizeSearchText
 * 
 * @param {string} text - Título a normalizar
 * @returns {string} - Título normalizado para búsqueda
 */
function normalizeTitleForSearch(text) {
    // Primero remover comillas especiales
    const withoutQuotes = normalizeQuotes(text);
    // Luego aplicar normalización completa
    return normalizeSearchText(withoutQuotes);
}

// ===========================================================
// EXPORTAR FUNCIONES
// ===========================================================

module.exports = {
    normalizeSearchText,
    normalizeQuotes,
    normalizeTitleForSearch,
    extractKeywords,
    containsAllKeywords,
    containsAnyKeyword,
    calculateSimilarity
};
