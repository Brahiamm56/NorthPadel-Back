const { getReservasByUsuarioId } = require('../../repositories/reservas.repository');

// Servicio: obtener reservas de un usuario
const getReservasService = async ({ usuarioId }) => {
  const snapshot = await getReservasByUsuarioId(usuarioId);

  console.log(`[GET /api/reservas] Buscando reservas para usuarioId: ${usuarioId}`);
  console.log(`[GET /api/reservas] Se encontraron ${snapshot.size} reservas`);

  if (snapshot.empty) {
    return {
      status: 200,
      body: [],
    };
  }

  const reservas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    status: 200,
    body: reservas,
  };
};

module.exports = {
  getReservasService,
};
