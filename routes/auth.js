const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

// --- ENDPOINT PARA REGISTRAR UN NUEVO USUARIO ---
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos.' });
    }

    const userQuery = await db.collection('users').where('email', '==', email).get();
    if (!userQuery.empty) {
      return res.status(409).json({ message: 'El email ya está en uso.' });
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

    const docRef = await db.collection('users').add(newUser);
    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: docRef.id });

  } catch (error) {
    console.error("Error al registrar el usuario: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// --- ENDPOINT PARA INICIAR SESIÓN ---
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar que se proporcionen email y password
        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
        }

        const userQuery = await db.collection('users').where('email', '==', email.toLowerCase()).get();
        if (userQuery.empty) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();

        // Validar que el usuario tenga un campo password
        if (!userData.password) {
            console.error(`Usuario ${email} no tiene campo password. Posible usuario creado manualmente.`);
            return res.status(500).json({ message: 'Error en la configuración del usuario. Por favor, regístrate nuevamente.' });
        }

        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta.' });
        }

        const payload = {
            userId: userDoc.id,
            role: userData.role,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'tu_secreto_por_defecto', { expiresIn: '1h' });

        // ✅ Construir objeto de usuario
        const userResponse = {
            id: userDoc.id,
            nombre: userData.nombre,
            email: userData.email,
            role: userData.role
        };

        // ✅ Si es admin, incluir complejoId
        if (userData.role === 'admin' && userData.complejoId) {
            userResponse.complejoId = userData.complejoId;
        }

        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error("Error al iniciar sesión: ", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
});

// --- ENDPOINT PARA LOGIN CON GOOGLE ---
// POST /api/auth/google-login
router.post('/google-login', async (req, res) => {
  try {
    const { email, nombre, uid, photoURL } = req.body;

    // Validación de campos requeridos
    if (!email) {
      console.log('[Google Login] Error: Email no proporcionado');
      return res.status(400).json({ message: 'El email es requerido.' });
    }

    if (!uid) {
      console.log('[Google Login] Error: UID de Firebase no proporcionado');
      return res.status(400).json({ message: 'El UID de Firebase es requerido.' });
    }

    const normalizedEmail = email.toLowerCase();
    
    // Generar nombre a partir del email si no se proporciona
    const userName = nombre || normalizedEmail.split('@')[0];

    console.log(`[Google Login] Procesando login para: ${normalizedEmail}`);

    // Usar transacción para evitar duplicados
    const result = await db.runTransaction(async (transaction) => {
      // Buscar usuario existente por email
      const userQuery = await db.collection('users').where('email', '==', normalizedEmail).get();
      
      let userDoc;
      let userData;
      let isNewUser = false;

      if (userQuery.empty) {
        // Usuario no existe, crear nuevo
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
          // Campos de notificaciones (consistente con register)
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
        // Usuario existe, actualizar información
        userDoc = userQuery.docs[0];
        userData = userDoc.data();
        
        console.log(`[Google Login] Usuario existente encontrado: ${normalizedEmail}`);

        // Actualizar datos del usuario
        const updateData = {
          firebaseUid: uid,
          photoURL: photoURL || userData.photoURL || null,
          updatedAt: new Date(),
        };

        // Si el usuario se registró con email y ahora usa Google, actualizar authProvider
        if (userData.authProvider !== 'google') {
          updateData.authProvider = 'google';
        }

        // Actualizar nombre solo si viene de Google y el actual está vacío o es el email
        if (nombre && (!userData.nombre || userData.nombre === normalizedEmail.split('@')[0])) {
          updateData.nombre = nombre;
        }

        transaction.update(userDoc.ref, updateData);
        
        // Merge para la respuesta
        userData = { ...userData, ...updateData };
        userDoc = { id: userDoc.id };
      }

      return { userDoc, userData, isNewUser };
    });

    const { userDoc, userData, isNewUser } = result;

    // Generar JWT
    const payload = {
      userId: userDoc.id,
      role: userData.role,
    };

    const token = jwt.sign(
      payload, 
      process.env.JWT_SECRET || 'tu_secreto_por_defecto', 
      { expiresIn: '7d' }
    );

    // Construir respuesta del usuario
    const userResponse = {
      id: userDoc.id,
      email: userData.email,
      nombre: userData.nombre,
      role: userData.role,
      photoURL: userData.photoURL,
    };

    // Si es admin, incluir complejoId
    if (userData.role === 'admin' && userData.complejoId) {
      userResponse.complejoId = userData.complejoId;
    }

    console.log(`[Google Login] ${isNewUser ? 'Nuevo usuario creado' : 'Usuario actualizado'}: ${normalizedEmail}`);

    res.status(200).json({
      message: isNewUser ? 'Usuario registrado exitosamente con Google' : 'Inicio de sesión exitoso con Google',
      token,
      user: userResponse,
    });

  } catch (error) {
    console.error('[Google Login] Error:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// --- ¡LÍNEA MÁS IMPORTANTE! ---
// Asegúrate de que esta línea esté al final y sea correcta.
module.exports = router;
