const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const reservasController = require('../controllers/reservas.controller');

// GET /api/reservas/ (Para obtener las reservas del usuario)
router.get('/', protect, reservasController.getReservas);

// POST /api/reservas/ (Para crear una nueva reserva)
router.post('/', protect, reservasController.createReserva);

// PUT /api/reservas/:id/confirm
// Confirmar una reserva (solo para admins)
router.put('/:id/confirm', protect, reservasController.confirmReserva);

// PUT /api/reservas/:id/cancel
// Cancelar una reserva
router.put('/:id/cancel', protect, reservasController.cancelReserva);

module.exports = router;
