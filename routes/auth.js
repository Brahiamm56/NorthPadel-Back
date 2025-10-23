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
      return res.status(400).send('Nombre, email y contraseña son requeridos.');
    }

    const userQuery = await db.collection('users').where('email', '==', email).get();
    if (!userQuery.empty) {
      return res.status(409).send('El email ya está en uso.');
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
    };

    const docRef = await db.collection('users').add(newUser);
    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: docRef.id });

  } catch (error) {
    console.error("Error al registrar el usuario: ", error);
    res.status(500).send("Error interno del servidor.");
  }
});

// --- ENDPOINT PARA INICIAR SESIÓN ---
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar que se proporcionen email y password
        if (!email || !password) {
            return res.status(400).send('Email y contraseña son requeridos.');
        }

        const userQuery = await db.collection('users').where('email', '==', email.toLowerCase()).get();
        if (userQuery.empty) {
            return res.status(404).send('Usuario no encontrado.');
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();

        // Validar que el usuario tenga un campo password
        if (!userData.password) {
            console.error(`Usuario ${email} no tiene campo password. Posible usuario creado manualmente.`);
            return res.status(500).send('Error en la configuración del usuario. Por favor, regístrate nuevamente.');
        }

        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            return res.status(401).send('Contraseña incorrecta.');
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
        res.status(500).send("Error interno del servidor.");
    }
});

// --- ¡LÍNEA MÁS IMPORTANTE! ---
// Asegúrate de que esta línea esté al final y sea correcta.
module.exports = router;
