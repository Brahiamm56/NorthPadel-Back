const adminCanchasService = require('../services/admin/canchas.service');
const adminReservasService = require('../services/admin/reservas.service');

// --- CANCHAS ---

// GET /api/admin/canchas
const getCanchas = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const result = await adminCanchasService.getCanchas({ adminId });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al obtener las canchas del admin: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// POST /api/admin/canchas
const createCancha = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const result = await adminCanchasService.createCancha({
      adminId,
      ...req.body,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al crear la cancha: ', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor al crear la cancha.' });
  }
};

// PUT /api/admin/canchas/:canchaId
const updateCancha = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const datosActualizados = req.body;

    const result = await adminCanchasService.updateCancha({
      adminId,
      canchaId,
      datosActualizados,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al actualizar la cancha: ', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor al actualizar la cancha.' });
  }
};

// DELETE /api/admin/canchas/:canchaId
const deleteCancha = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;

    const result = await adminCanchasService.deleteCancha({ adminId, canchaId });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al eliminar la cancha: ', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor al eliminar la cancha.' });
  }
};

// PUT /api/admin/canchas/:canchaId/toggle-status
const toggleCanchaStatus = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const { activa } = req.body;

    const result = await adminCanchasService.toggleCanchaStatus({
      adminId,
      canchaId,
      activa,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al actualizar estado de la cancha: ', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor.' });
  }
};
// GET /api/admin/canchas/:canchaId/disponibilidad
const getDisponibilidadCancha = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const { fecha } = req.query;

    const result = await adminCanchasService.getDisponibilidadCancha({
      adminId,
      canchaId,
      fecha,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al obtener disponibilidad de la cancha: ', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor.' });
  }
};

// PATCH /api/admin/canchas/:canchaId
const patchCanchaActiva = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const { activa } = req.body;

    const result = await adminCanchasService.patchCanchaActiva({
      adminId,
      canchaId,
      activa,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al actualizar cancha: ', error);
    return res.status(500).json({
      message: 'Error interno del servidor al actualizar la cancha',
    });
  }
};

// POST /api/admin/canchas/:canchaId/bloquear
const bloquearHorario = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const { fecha, hora } = req.body;

    const result = await adminCanchasService.bloquearHorario({
      adminId,
      canchaId,
      fecha,
      hora,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al bloquear horario: ', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor.' });
  }
};

// POST /api/admin/canchas/:canchaId/desbloquear
const desbloquearHorario = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const { fecha, hora } = req.body;

    const result = await adminCanchasService.desbloquearHorario({
      adminId,
      canchaId,
      fecha,
      hora,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al desbloquear horario: ', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor.' });
  }
};
// --- RESERVAS ---

// GET /api/admin/reservas
const getReservas = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { fecha, estado } = req.query;

    const result = await adminReservasService.getReservas({
      adminId,
      fecha,
      estado,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al obtener las reservas del admin: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// PUT /api/admin/reservas/:reservaId/confirmar
const confirmarReserva = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const adminId = req.user.userId;

    const result = await adminReservasService.confirmarReserva({
      reservaId,
      adminId,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al confirmar la reserva: ', error);
    return res.status(500).json({
      message: 'Error interno del servidor al confirmar la reserva.',
    });
  }
};

// PUT /api/admin/reservas/:reservaId/cancelar
const cancelarReserva = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const adminId = req.user.userId;
    const { motivo } = req.body || {};

    const result = await adminReservasService.cancelarReserva({
      reservaId,
      adminId,
      motivo,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al cancelar la reserva: ', error);
    return res.status(500).json({
      message: 'Error interno del servidor al cancelar la reserva.',
    });
  }
};

// GET /api/admin/reservas/:reservaId/diagnostico
const diagnosticoReserva = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const adminId = req.user.userId;

    const result = await adminReservasService.diagnosticoReserva({
      reservaId,
      adminId,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en diagnóstico: ', error);
    return res.status(500).json({
      message: 'Error interno del servidor en diagnóstico.',
      error: error.message,
    });
  }
};

// --- PERFIL COMPLEJO ---

// GET /api/admin/perfil-complejo
const getPerfilComplejo = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await adminReservasService.getPerfilComplejo({ userId });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[PERFIL-COMPLEJO] Error:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  getCanchas,
  createCancha,
  updateCancha,
  deleteCancha,
  toggleCanchaStatus,
  patchCanchaActiva,
  bloquearHorario,
  desbloquearHorario,
  getDisponibilidadCancha,
  getReservas,
  confirmarReserva,
  cancelarReserva,
  diagnosticoReserva,
  getPerfilComplejo,
};
