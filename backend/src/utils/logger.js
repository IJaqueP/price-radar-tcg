/*
    LOGGER SIMPLE

    Sistema de logging para trackear eventos importantes
*/

const fs = require('fs');
const path = require('path');

// ===========================================================
// CONFIGURACIÓN
// ===========================================================

const LOG_DIR = path.join(__dirname, '../../logs');

// Crear directorio de logs si no existe
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ===========================================================
// FUNCIONES AUXILIARES
// ===========================================================

function getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getCurrentTimestamp() {
    return new Date().toISOString();
}

function getLogFile() {
    return path.join(LOG_DIR, `app-${getCurrentDate()}.log`);
}

function formatMessage(level, message, data = null) {
    const timestamp = getCurrentTimestamp();
    let formatted = `[${timestamp}] [${level}] ${message}`;

    if (data) {
        formatted += `\n${JSON.stringify(data, null, 2)}`;
    }

    return formatted;
}

// ===========================================================
// FUNCIONES DE LOGGING
// ===========================================================

function log(level, message, data = null) {
    const formatted = formatMessage(level, message, data);

    // Escribir en consola
    console.log(formatted);

    // Escribir en archivo
    try {
        fs.appendFileSync(getLogFile(), formatted + '\n');
    } catch (error) {
        console.error('Error al escribir log:', error.message);
    }
}

function info(message, data = null) {
    log('INFO', message, data);
}

function success(message, data = null) {
    log('SUCCESS', message, data);
}

function warn(message, data = null) {
    log('WARNING', message, data);
}

function error(message, data = null) {
    log('ERROR', message, data);
}

function debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
        log('DEBUG', message, data);
    }
}

// ===========================================================
// EXPORTAR
// ===========================================================

module.exports = {
    info,
    success,
    warn,
    error,
    debug
}