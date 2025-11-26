const { getComplejoById } = require('../../repositories/complejos.repository');
const { getReservasConfirmadasPorCanchaYFecha } = require('../../repositories/reservas.repository');

// Servicio: obtener detalle de una cancha con horarios reservados y bloqueados
const getCanchaDetalleService = async ({ complejoId, canchaId, fecha }) => {
  // 1. Obtener el documento del complejo
  const complejoDoc = await getComplejoById(complejoId);
  if (!complejoDoc.exists) {
    return {
      status: 404,
      body: { message: 'No se encontró el complejo.' },
    };
  }

  // 2. Buscar la cancha específica
  const complejoData = complejoDoc.data();
  const cancha = complejoData.canchas.find((c) => c.id === canchaId);
  if (!cancha) {
    return {
      status: 404,
      body: { message: 'No se encontró la cancha.' },
    };
  }

  let horariosReservados = [];
  let horariosBloqueados = [];

  if (fecha) {
    // 3a. Obtener reservas confirmadas
    const reservasSnapshot = await getReservasConfirmadasPorCanchaYFecha(canchaId, fecha);
    if (!reservasSnapshot.empty) {
      horariosReservados = reservasSnapshot.docs.map((doc) => doc.data().hora);
    }

    // 3b. Obtener bloqueos de la cancha para esa fecha
    if (cancha.bloqueos) {
      horariosBloqueados = cancha.bloqueos
        .filter((bloqueo) => bloqueo.fecha === fecha)
        .map((bloqueo) => bloqueo.hora);
    }
  }

  // 4. Enriquecer los datos con horarios reservados y bloqueados separados
  const canchaDetalle = {
    ...cancha,
    complejoNombre: complejoData.nombre,
    caracteristicas: ['Techada', 'Blindex', 'Iluminación LED', 'Vestuarios'],
    horariosReservados,
    horariosBloqueados,
  };

  return {
    status: 200,
    body: canchaDetalle,
  };
};

module.exports = {
  getCanchaDetalleService,
};
