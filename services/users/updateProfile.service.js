const { getUserById, updateUserById } = require('../../repositories/users.repository');

// Servicio: actualizar perfil de usuario
const updateProfileService = async ({ userId, nombre, apellido, telefono, fotoUrl }) => {
  const userRecord = await getUserById(userId);

  if (!userRecord) {
    return {
      status: 404,
      body: { message: 'Usuario no encontrado.' },
    };
  }

  const updateData = {};

  if (nombre !== undefined) {
    updateData.nombre = nombre;
  }
  if (apellido !== undefined) {
    updateData.apellido = apellido;
  }
  if (telefono !== undefined) {
    updateData.telefono = telefono;
  }
  if (fotoUrl !== undefined) {
    updateData.fotoUrl = fotoUrl;
  }

  if (Object.keys(updateData).length === 0) {
    return {
      status: 400,
      body: { message: 'No se proporcionaron campos para actualizar.' },
    };
  }

  updateData.updatedAt = new Date();

  await updateUserById(userId, updateData);

  const updatedUserRecord = await getUserById(userId);
  const userData = updatedUserRecord.data;

  const userResponse = {
    id: userId,
    nombre: userData.nombre,
    apellido: userData.apellido,
    email: userData.email,
    telefono: userData.telefono,
    fotoUrl: userData.fotoUrl || null,
    role: userData.role,
    updatedAt: userData.updatedAt,
  };

  return {
    status: 200,
    body: {
      message: 'Perfil actualizado exitosamente',
      user: userResponse,
    },
  };
};

module.exports = {
  updateProfileService,
};
