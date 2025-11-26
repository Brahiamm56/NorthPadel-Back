const { db } = require('../config/firebase');

// Repositorio de reservas: encapsula el acceso a Firestore para la colección 'reservas'

// Obtener todas las reservas de un usuario
const getReservasByUsuarioId = async (usuarioId) => {
  const snapshot = await db.collection('reservas').where('usuarioId', '==', usuarioId).get();
  return snapshot;
};

// Crear una nueva reserva y devolver el docRef
const createReserva = async (reservaData) => {
  const docRef = await db.collection('reservas').add(reservaData);
  return docRef;
};

// Obtener una reserva por ID
const getReservaById = async (id) => {
  const doc = await db.collection('reservas').doc(id).get();
  return doc;
};

// Actualizar una reserva por ID
const updateReservaById = async (id, updateData) => {
  await db.collection('reservas').doc(id).update(updateData);
};

// Obtener reservas CONFIRMADAS para una cancha y fecha
const getReservasConfirmadasPorCanchaYFecha = async (canchaId, fecha) => {
  const snapshot = await db
    .collection('reservas')
    .where('canchaId', '==', canchaId)
    .where('fecha', '==', fecha)
    .where('estado', '==', 'Confirmada')
    .get();

  return snapshot;
};

module.exports = {
  getReservasByUsuarioId,
  createReserva,
  getReservaById,
  updateReservaById,
  getReservasConfirmadasPorCanchaYFecha,
};
