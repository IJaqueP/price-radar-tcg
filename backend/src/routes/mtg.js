/*
    RUTAS DE MTG
    Endpoints para Magic
*/

const express = require('express');
const router = express.Router();
const mtgController = require('../controllers/mtgController');

// Sincronización
router.post('/sync', mtgController.syncCards);
router.get('/stats', mtgController.getStats);

// Búsqueda y consultas
router.get('/search', mtgController.searchCards);
router.get('/autocomplete', mtgController.autocompleteCards);
router.get('/sets', mtgController.getSets);
router.get('/sets/:setCode/cards', mtgController.getSetCards);
router.get('/cards', mtgController.getCards);
router.get('/cards/:id', mtgController.getCard);

module.exports = router;