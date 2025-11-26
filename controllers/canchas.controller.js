const { getComplejosService } = require('../services/canchas/getComplejos.service');
const { getCanchaDetalleService } = require('../services/canchas/getCanchaDetalle.service');

// GET /api/canchas/
const getComplejos = async (req, res) => {
  try {
    const result = await getComplejosService();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al obtener los complejos: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// GET /api/canchas/:complejoId/:canchaId
const getCanchaDetalle = async (req, res) => {
  try {
    const { complejoId, canchaId } = req.params;
    const { fecha } = req.query;

    const result = await getCanchaDetalleService({ complejoId, canchaId, fecha });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al obtener el detalle de la cancha: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  getComplejos,
  getCanchaDetalle,
};
