const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const { protect } = require('../middlewares/authMiddleware');
const notificationService = require('../services/notifications.service');
const adminController = require('../controllers/admin.controller');

// GET /api/admin/canchas - Obtiene las canchas del complejo del admin
router.get('/canchas', protect, adminController.getCanchas);

// --- ENDPOINT MODIFICADO ---
// POST /api/admin/canchas - Crea una nueva cancha con más detalles
router.post('/canchas', protect, adminController.createCancha);

// PUT /api/admin/canchas/:canchaId - Actualiza la información completa de una cancha
router.put('/canchas/:canchaId', protect, adminController.updateCancha);

// DELETE /api/admin/canchas/:canchaId - Elimina una cancha específica del complejo
router.delete('/canchas/:canchaId', protect, adminController.deleteCancha);

// PUT /api/admin/canchas/:canchaId/toggle-status - Cambia el estado de publicación de una cancha
router.put('/canchas/:canchaId/toggle-status', protect, adminController.toggleCanchaStatus);

// PATCH /api/admin/canchas/:canchaId - Actualiza el estado de publicación de una cancha
router.patch('/canchas/:canchaId', protect, adminController.patchCanchaActiva);

// POST /api/admin/canchas/:canchaId/bloquear - Bloquea un horario específico de una cancha
router.post('/canchas/:canchaId/bloquear', protect, adminController.bloquearHorario);

// POST /api/admin/canchas/:canchaId/desbloquear - Desbloquea un horario específico de una cancha
router.post('/canchas/:canchaId/desbloquear', protect, adminController.desbloquearHorario);

// GET /api/admin/canchas/:canchaId/disponibilidad - Obtiene los horarios ocupados para una cancha en una fecha específica
router.get(
  '/canchas/:canchaId/disponibilidad',
  protect,
  adminController.getDisponibilidadCancha
);

// GET /api/admin/reservas - Obtiene las reservas del complejo del admin con nombre de usuario y cancha
// Soporta filtro opcional por fecha: ?fecha=YYYY-MM-DD
// Soporta filtro opcional por estado: ?estado=Pendiente|Confirmada|Cancelada
router.get('/reservas', protect, adminController.getReservas);

// PUT /api/admin/reservas/:reservaId/confirmar - Confirma una reserva específica
router.put(
  '/reservas/:reservaId/confirmar',
  protect,
  adminController.confirmarReserva
);

// PUT /api/admin/reservas/:reservaId/cancelar - Cancela una reserva específica
router.put(
  '/reservas/:reservaId/cancelar',
  protect,
  adminController.cancelarReserva
);

// GET /api/admin/reservas/:reservaId/diagnostico - Endpoint de diagnóstico para verificar el esquema
router.get(
  '/reservas/:reservaId/diagnostico',
  protect,
  adminController.diagnosticoReserva
);

// GET /api/admin/perfil-complejo - Obtiene la información básica del complejo del admin
router.get('/perfil-complejo', protect, adminController.getPerfilComplejo);

module.exports = router;

