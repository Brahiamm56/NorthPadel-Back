const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

// Servicio para login/registro con Google
const googleLogin = async ({ email, nombre, uid, photoURL }) => {
  if (!email) {
    console.log('[Google Login] Error: Email no proporcionado');
    return {
      status: 400,
      body: { message: 'El email es requerido.' },
    };
  }

  if (!uid) {
    console.log('[Google Login] Error: UID de Firebase no proporcionado');
    return {
      status: 400,
      body: { message: 'El UID de Firebase es requerido.' },
    };
  }

  const normalizedEmail = email.toLowerCase();

  const userName = nombre || normalizedEmail.split('@')[0];

  console.log(`[Google Login] Procesando login para: ${normalizedEmail}`);

  const result = await db.runTransaction(async (transaction) => {
    const userQuery = await db.collection('users').where('email', '==', normalizedEmail).get();

    let userDoc;
    let userData;
    let isNewUser = false;

    if (userQuery.empty) {
      isNewUser = true;
      console.log(`[Google Login] Creando nuevo usuario: ${normalizedEmail}`);

      const newUser = {
        email: normalizedEmail,
        nombre: userName,
        role: 'user',
        firebaseUid: uid,
        photoURL: photoURL || null,
        authProvider: 'google',
        createdAt: new Date(),
        updatedAt: new Date(),
        pushToken: null,
        notificationsEnabled: true,
        notificationPreferences: {
          reminders: true,
          confirmations: true,
          weatherAlerts: true,
        },
      };

      const newDocRef = db.collection('users').doc();
      transaction.set(newDocRef, newUser);

      userDoc = { id: newDocRef.id };
      userData = newUser;
    } else {
      userDoc = userQuery.docs[0];
      userData = userDoc.data();

      console.log(`[Google Login] Usuario existente encontrado: ${normalizedEmail}`);

      const updateData = {
        firebaseUid: uid,
        photoURL: photoURL || userData.photoURL || null,
        updatedAt: new Date(),
      };

      if (userData.authProvider !== 'google') {
        updateData.authProvider = 'google';
      }

      if (nombre && (!userData.nombre || userData.nombre === normalizedEmail.split('@')[0])) {
        updateData.nombre = nombre;
      }

      transaction.update(userDoc.ref, updateData);

      userData = { ...userData, ...updateData };
      userDoc = { id: userDoc.id };
    }

    return { userDoc, userData, isNewUser };
  });

  const { userDoc, userData, isNewUser } = result;

  const payload = {
    userId: userDoc.id,
    role: userData.role,
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'tu_secreto_por_defecto',
    { expiresIn: '7d' },
  );

  const userResponse = {
    id: userDoc.id,
    email: userData.email,
    nombre: userData.nombre,
    role: userData.role,
    photoURL: userData.photoURL,
  };

  if (userData.role === 'admin' && userData.complejoId) {
    userResponse.complejoId = userData.complejoId;
  }

  console.log(`[Google Login] ${isNewUser ? 'Nuevo usuario creado' : 'Usuario actualizado'}: ${normalizedEmail}`);

  return {
    status: 200,
    body: {
      message: isNewUser
        ? 'Usuario registrado exitosamente con Google'
        : 'Inicio de sesión exitoso con Google',
      token,
      user: userResponse,
    },
  };
};

module.exports = {
  googleLogin,
};

