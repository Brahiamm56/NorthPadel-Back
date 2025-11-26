const { db } = require('../config/firebase');

// Repositorio de usuarios: encapsula el acceso a Firestore

// Buscar usuario por email (normalizado en minúsculas)
const findUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase();
  const snapshot = await db.collection('users').where('email', '==', normalizedEmail).get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, data: doc.data(), ref: doc.ref };
};

// Crear un nuevo usuario y devolver su ID de documento
const createUser = async (userData) => {
  const docRef = await db.collection('users').add(userData);
  return docRef.id;
};

// Obtener usuario por ID
const getUserById = async (id) => {
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, data: doc.data(), ref: doc.ref };
};

// Actualizar usuario por ID
const updateUserById = async (id, updateData) => {
  await db.collection('users').doc(id).update(updateData);
};

module.exports = {
  findUserByEmail,
  createUser,
  getUserById,
  updateUserById,
};

