/* ===========================================================
    CONFIGURATION - PRICE RADAR TCG
=========================================================== */

const CONFIG = {
    // Backend API Base URL
    API_BASE_URL: 'http://127.0.0.1:3000/api',

    // API Endpoints
    ENDPOINTS: {
        PRODUCTS_ALERTS: '/products/alerts',
        PRODUCTS_LIST: '/products/list',
        PRODUCT_UPDATE_PRICE: '/products/:id/price',
        SYNC_HISTORY: '/sync/history',
        MTG_SEARCH: '/mtg/search',
        MTG_SETS: '/mtg/sets',
        MTG_SET_CARDS: '/mtg/sets/:setCode/cards',
        MTG_AUTOCOMPLETE: '/mtg/autocomplete',
        MTG_CARDS: '/mtg/cards',
    },

    // App Settings
    APP: {
        NAME: 'Oasis Price Check',
        VERSION: '1.0.0',
        DEFAULT_PAGE: 'dashboard',
    },

    // Price Alert Settings
    PRICE_ALERT: {
        THRESHOLD_PERCENTAGE: 3,
        COLORS: {
            HIGHER: '#dc3545',
            LOWER: '#28a745',
        }
    },

    // Stock Level Thresholds
    STOCK: {
        HIGH: 100,
        MEDIUM: 20,
        LOW: 1,
        OUT: 0,
    },

    // Supported Games
    GAMES: {
        MAGIC: 'Magic',
        POKEMON: 'Pokemon',
        GUNDAM: 'Gundam',
        ONE_PIECE: 'One Piece',
        RIFTBOUND: 'Riftbound',
    },

    // UI Settings
    UI: {
        LOADER_MIN_DISPLAY_TIME: 300,
        TOAST_DURATION: 3000,
        DEBOUNCE_DELAY: 300,
    },

    // Table Settings
    TABLE: {
        ROWS_PER_PAGE: 50,
        MAX_PRODUCT_NAME_LENGTH: 60,
    }
};

// Helper function to build complete endpoint URL
export function getEndpointUrl(endpoint, params = {}) {
    let url = `${CONFIG.API_BASE_URL}${endpoint}`;

    Object.keys(params).forEach(key => {
        url = url.replace(`:${key}`, params[key]);
    });

    return url;
}

export default CONFIG;