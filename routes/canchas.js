const express = require('express');
const router = express.Router();
const canchasController = require('../controllers/canchas.controller');

// GET /api/canchas/ - Obtiene todos los complejos (sin cambios)
router.get('/', canchasController.getComplejos);

// --- ENDPOINT DE DETALLE MODIFICADO ---
// GET /api/canchas/:complejoId/:canchaId?fecha=YYYY-MM-DD
router.get('/:complejoId/:canchaId', canchasController.getCanchaDetalle);

// No olvides exportar el router para poder usarlo en index.js
module.exports = router;
