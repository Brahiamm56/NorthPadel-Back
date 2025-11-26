const { getAllComplejos } = require('../../repositories/complejos.repository');

// Servicio: obtener todos los complejos con sus canchas
const getComplejosService = async () => {
  const snapshot = await getAllComplejos();

  if (snapshot.empty) {
    return {
      status: 200,
      body: [],
    };
  }

  const complejos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    status: 200,
    body: complejos,
  };
};

module.exports = {
  getComplejosService,
};
