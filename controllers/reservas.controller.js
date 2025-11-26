const { getReservasService } = require('../services/reservas/getReservas.service');
const { createReservaService } = require('../services/reservas/createReserva.service');
const { confirmReservaService } = require('../services/reservas/confirmReserva.service');
const { cancelReservaService } = require('../services/reservas/cancelReserva.service');

// GET /api/reservas/
const getReservas = async (req, res) => {
  try {
    const usuarioId = req.user.userId;
    const result = await getReservasService({ usuarioId });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al obtener las reservas: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// POST /api/reservas/
const createReserva = async (req, res) => {
  try {
    const usuarioId = req.user.userId;
    const { complejoId, canchaId, fecha, hora, estado } = req.body;

    const result = await createReservaService({
      usuarioId,
      complejoId,
      canchaId,
      fecha,
      hora,
      estado,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al crear la reserva: ', error);
    return res
      .status(500)
      .json({ message: 'Error interno del servidor al crear la reserva.' });
  }
};

// PUT /api/reservas/:id/confirm
const confirmReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;

    const result = await confirmReservaService({ id, usuarioId });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al confirmar la reserva: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// PUT /api/reservas/:id/cancel
const cancelReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;

    const result = await cancelReservaService({ id, usuarioId });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al cancelar la reserva: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  getReservas,
  createReserva,
  confirmReserva,
  cancelReserva,
};
