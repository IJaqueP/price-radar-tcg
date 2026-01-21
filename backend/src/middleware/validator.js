/*
    VALIDATOR MIDDLEWARE

    Middleware para validar requests con express-validator
*/

const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

// ===========================================================
// MIDDLEWARE DE VALIDACIÓN
// ===========================================================

/*
    Verificar los resultados de express-validator, y retornar errores
    formateados si hay problemas
*/
function validate(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Formatear errores
        const formattedErrors = errors.array().map(err => (
            {
                field: err.path || err.param,
                message: err.msg,
                value: err.value
            }
        ));

        // Crear mensaje de error
        const message = formattedErrors
            .map(e => `${e.field}: ${e.message}`)
            .join(', ');

            return next(new AppError(message, 400));
    
    }

    next();

}


// ===========================================================
// VALIDACIONES COMUNES
// ===========================================================

const { body, param, query } = require('express-validator');

// Validación de ID numérico
const validateId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID debe ser un número positivo')
];

// Validación de paginación
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('page debe ser un número positivo'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('limit debe estar entre 1 y 1000')
];

// Validación de precio
const validatePrice = [
    body('new_price')
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número positivo')
];

// Validación de filtros de producto
const validateProductFilters = [
    query('game')
        .optional()
        .isIn(['magic', 'pokemon', 'riftbound', 'one piece', 'gundam'])
        .withMessage('Juego no válido'),
    query('category')
        .optional()
        .isString()
        .trim()
];


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    validate,
    validateId,
    validatePagination,
    validatePrice,
    validateProductFilters
};