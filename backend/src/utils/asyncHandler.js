/*
    ASYNC HANDLER UTILITY

    Wrapper para funciones async/await que captura errores automáticamente
*/

/*
    Envuelve funciones async y pasa los errores al middleware de errores
    @param {Function} fn - Función async a envolver
    @returns {Function} Función que captura errores
*/

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = asyncHandler;