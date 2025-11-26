const { db } = require('../config/firebase');

// Repositorio de complejos: acceso a la colección 'complejos'

// Obtener todos los complejos
const getAllComplejos = async () => {
  const snapshot = await db.collection('complejos').get();
  return snapshot;
};

// Obtener complejo por ID
const getComplejoById = async (id) => {
  const doc = await db.collection('complejos').doc(id).get();
  return doc;
};

module.exports = {
  getAllComplejos,
  getComplejoById,
};
