/*
    ERROR HANDLER MIDDLEWARE

    Maneja todos los errores de la aplicación de forma centralizada
*/

const logger = require('../utils/logger');

// ===========================================================
// CLASE DE ERROR PERSONALIZADA
// ===========================================================

class AppError extends Error {
    constructor (message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

        Error.captureStackTrace(this, this.constructor);
    }
}


// ===========================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ===========================================================

function errorHandler(err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log del error
    if (err.statusCode === 500) {
        logger.error('Error 500:', {
            message: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method
        });
    } else {
        logger.warn(`Error ${err.statusCode}:`, err.message);
    }


    // Respuesta según entorno
    if (process.env.NODE_ENV === 'development') {
        // Desarrollo: Enviar toda la información
        res.status(err.statusCode).json(
            {
                success: false,
                status: err.status,
                error: err.message,
                stack: err.stack,
                details: err
            }
        );
    } else {
        // Producción: Solo información segura
        if (err.isOperational) {
            // Error operacional: enviar al cliente
            res.status(err.statusCode).json(
                {
                    success: false,
                    status: err.status,
                    error: err.message
                }
            );
        } else {
            // Error de programación: no exponer detalles
            logger.error('ERROR DE PROGRAMACIÓN NO MANEJADO:', err);
            res.status(500).json(
                {
                    success: false,
                    status: 'error',
                    error: 'Algo salió mal en el servidor'
                }
            );
        }
    }
}


// ===========================================================
// MANEJADOR DE RUTAS NO ENCONTRADAS
// ===========================================================

function notFoundHandler(req, res, next) {
    const error = new AppError(
        `Ruta no encontrada: ${req.originalUrl}`,
        404
    );
    next(error);
}


// ===========================================================
// MANEJADORES DE ERRORES ESPECÍFICOS
// ===========================================================

// Error de Sequelize (Base de datos)
function handleSequelizeError(err) {
    if (err.name === 'SequelizeValidationError') {
        const message = err.errors.map(e => e.message).join(', ');
        return new AppError(message, 400);
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        const message = 'Este registro ya existe';
        return new AppError(message, 409);
    }

    return new AppError('Error en la base de datos', 500, false);
}


// Error de JSON inválido
function handleJSONError(err) {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return new AppError('JSON inválido en el body', 400);
    }
    return err;
}


// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler,
    handleSequelizeError,
    handleJSONError
};