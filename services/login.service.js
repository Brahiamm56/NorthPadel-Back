const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail } = require('../repositories/users.repository');

// Servicio para iniciar sesión con email y contraseña
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    return {
      status: 400,
      body: { message: 'Email y contraseña son requeridos.' },
    };
  }

  const userRecord = await findUserByEmail(email);
  if (!userRecord) {
    return {
      status: 404,
      body: { message: 'Usuario no encontrado.' },
    };
  }

  const userData = userRecord.data;

  // Validar que el usuario tenga un campo password
  if (!userData.password) {
    console.error(`Usuario ${email} no tiene campo password. Posible usuario creado manualmente.`);
    return {
      status: 500,
      body: { message: 'Error en la configuración del usuario. Por favor, regístrate nuevamente.' },
    };
  }

  const isMatch = await bcrypt.compare(password, userData.password);
  if (!isMatch) {
    return {
      status: 401,
      body: { message: 'Contraseña incorrecta.' },
    };
  }

  const payload = {
    userId: userRecord.id,
    role: userData.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'tu_secreto_por_defecto', { expiresIn: '1h' });

  const userResponse = {
    id: userRecord.id,
    nombre: userData.nombre,
    email: userData.email,
    role: userData.role,
  };

  if (userData.role === 'admin' && userData.complejoId) {
    userResponse.complejoId = userData.complejoId;
  }

  return {
    status: 200,
    body: {
      message: 'Inicio de sesión exitoso',
      token,
      user: userResponse,
    },
  };
};

module.exports = {
  loginUser,
};

