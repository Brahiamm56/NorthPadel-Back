const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser } = require('../repositories/users.repository');

// Servicio para registrar un nuevo usuario
const registerUser = async ({ nombre, apellido, email, password, telefono }) => {
  if (!email || !password || !nombre) {
    return {
      status: 400,
      body: { message: 'Nombre, email y contraseña son requeridos.' },
    };
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return {
      status: 409,
      body: { message: 'El email ya está en uso.' },
    };
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = {
    nombre,
    apellido: apellido || '',
    email: email.toLowerCase(),
    password: hashedPassword,
    telefono: telefono || '',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    // Campos de notificaciones
    pushToken: null,
    notificationsEnabled: true,
    notificationPreferences: {
      reminders: true,
      confirmations: true,
      weatherAlerts: true,
    },
  };

  const userId = await createUser(newUser);

  return {
    status: 201,
    body: { message: 'Usuario registrado exitosamente', userId },
  };
};

module.exports = {
  registerUser,
};

