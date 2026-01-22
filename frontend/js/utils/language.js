/* ===========================================================
    LANGUAGE MANAGER
    
    Gestiona el cambio de idioma en el Visual Spoiler
    Almacena preferencia en localStorage
=========================================================== */

class LanguageManager {
    constructor() {
        this.currentLang = this.getStoredLanguage() || 'es';
        this.listeners = [];
    }

    /**
     * Obtiene el idioma almacenado en localStorage
     * @returns {string}
     */
    getStoredLanguage() {
        return localStorage.getItem('mtg_language') || 'es';
    }

    /**
     * Guarda el idioma en localStorage
     * @param {string} lang - Código de idioma (en o es)
     */
    setStoredLanguage(lang) {
        localStorage.setItem('mtg_language', lang);
    }

    /**
     * Obtiene el idioma actual
     * @returns {string}
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Cambia el idioma actual
     * @param {string} lang - Código de idioma (en o es)
     */
    setLanguage(lang) {
        if (lang !== 'en' && lang !== 'es') {
            console.warn('Idioma no soportado:', lang);
            return;
        }

        this.currentLang = lang;
        this.setStoredLanguage(lang);
        
        // Notificar a todos los listeners
        this.notifyListeners(lang);
    }

    /**
     * Agrega un listener para cambios de idioma
     * @param {Function} callback - Función a ejecutar cuando cambie el idioma
     */
    onLanguageChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notifica a todos los listeners
     * @param {string} lang - Nuevo idioma
     */
    notifyListeners(lang) {
        this.listeners.forEach(callback => {
            try {
                callback(lang);
            } catch (error) {
                console.error('Error en listener de idioma:', error);
            }
        });
    }

    /**
     * Obtiene el nombre del idioma en formato legible
     * @param {string} lang - Código de idioma
     * @returns {string}
     */
    getLanguageName(lang) {
        const names = {
            'en': 'English',
            'es': 'Español'
        };
        return names[lang] || lang;
    }

    /**
     * Traduce textos comunes de la interfaz
     * @param {string} key - Clave de traducción
     * @returns {string}
     */
    translate(key) {
        const translations = {
            en: {
                loading: 'Loading...',
                noCards: 'No cards found',
                selectSet: 'Select a set to view cards',
                allRarities: 'All',
                common: 'Common',
                uncommon: 'Uncommon',
                rare: 'Rare',
                mythic: 'Mythic',
                search: 'Search...',
                cards: 'cards',
                manaCost: 'Mana Cost',
                type: 'Type',
                rarity: 'Rarity',
                set: 'Set',
                number: 'Number',
                artist: 'Artist'
            },
            es: {
                loading: 'Cargando...',
                noCards: 'No se encontraron cartas',
                selectSet: 'Selecciona un set para ver las cartas',
                allRarities: 'Todas',
                common: 'Común',
                uncommon: 'Poco común',
                rare: 'Rara',
                mythic: 'Mítica',
                search: 'Buscar...',
                cards: 'cartas',
                manaCost: 'Coste de maná',
                type: 'Tipo',
                rarity: 'Rareza',
                set: 'Set',
                number: 'Número',
                artist: 'Artista'
            }
        };

        return translations[this.currentLang][key] || key;
    }
}

// Exportar instancia única
const languageManager = new LanguageManager();
export default languageManager;
