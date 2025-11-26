const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { protect } = require('../middlewares/authMiddleware');
const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary con las credenciales del .env
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET 
});

// --- ENDPOINT PARA GENERAR FIRMA DE CLOUDINARY PARA AVATAR ---
// POST /api/users/upload-signature
router.post('/upload-signature', protect, (req, res) => {
  try {
    const timestamp = Math.round((new Date()).getTime() / 1000);
    const folder = 'northpadel/avatars'; // Carpeta específica para fotos de usuarios

    // Genera la firma segura usando el API Secret
    const signature = cloudinary.utils.api_sign_request({
      timestamp: timestamp,
      folder: folder
    }, process.env.API_SECRET);

    res.status(200).json({ 
      timestamp, 
      signature,
      folder,
      api_key: process.env.API_KEY
    });
  } catch (error) {
    console.error("Error al generar la firma de Cloudinary para avatar: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// --- ENDPOINT PARA ACTUALIZAR PERFIL DE USUARIO ---
// PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nombre, apellido, telefono, fotoUrl } = req.body;

    // Verificar que el usuario exista en Firestore
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Construir objeto con solo los campos recibidos
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

    // Si no hay campos para actualizar, retornar error
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
    }

    // Agregar timestamp de actualización
    updateData.updatedAt = new Date();

    // Actualizar el documento del usuario
    await userRef.update(updateData);

    // Obtener el documento actualizado
    const updatedUserDoc = await userRef.get();
    const userData = updatedUserDoc.data();

    // Construir respuesta (excluyendo campos sensibles)
    const userResponse = {
      id: userId,
      nombre: userData.nombre,
      apellido: userData.apellido,
      email: userData.email,
      telefono: userData.telefono,
      fotoUrl: userData.fotoUrl || null,
      role: userData.role,
      updatedAt: userData.updatedAt
    };

    res.status(200).json({
      message: 'Perfil actualizado exitosamente',
      user: userResponse
    });

  } catch (error) {
    console.error("Error al actualizar el perfil: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

module.exports = router;
