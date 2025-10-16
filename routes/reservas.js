const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');



// --- NUEVO ENDPOINT PARA OBTENER LAS RESERVAS ---
// GET /api/reservas/ - Obtiene todas las reservas (por ahora)
router.get('/', async (req, res) => {
  try {
    // En el futuro, aquí filtraríamos por el ID del usuario:
    // const { usuarioId } = req.query; 
    // const snapshot = await db.collection('reservas').where('usuarioId', '==', usuarioId).get();

    // Por ahora, para probar, obtenemos todas las reservas
    const snapshot = await db.collection('reservas').get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const reservas = [];
    snapshot.forEach(doc => {
      reservas.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json(reservas);

  } catch (error) {
    console.error("Error al obtener las reservas: ", error);
    res.status(500).send("Error interno del servidor.");
  }
});
// --- ENDPOINT PARA CREAR UNA NUEVA RESERVA ---
// POST /api/reservas/
router.post('/', async (req, res) => {
  try {
    // 1. Obtenemos los datos de la reserva desde el cuerpo de la petición
    const { complejoId, canchaId, fecha, hora, usuarioId } = req.body;

    // Validamos que todos los datos necesarios estén presentes
    if (!complejoId || !canchaId || !fecha || !hora || !usuarioId) {
      return res.status(400).send('Faltan datos para crear la reserva.');
    }

    // 2. Creamos un nuevo objeto de reserva con los datos recibidos
    const nuevaReserva = {
      complejoId,
      canchaId,
      fecha, // ej: "2025-10-16"
      hora,  // ej: "19:00"
      usuarioId, // El ID del usuario que está haciendo la reserva
      estado: 'Confirmada', // Estado inicial de la reserva
      fechaCreacion: new Date() // Guardamos la fecha en que se creó
    };

    // 3. Añadimos la nueva reserva a una colección 'reservas' en Firestore
    const docRef = await db.collection('reservas').add(nuevaReserva);

    // 4. Respondemos con un mensaje de éxito y el ID de la nueva reserva
    res.status(201).json({ 
        message: 'Reserva creada exitosamente', 
        reservaId: docRef.id 
    });

  } catch (error) {
    console.error("Error al crear la reserva: ", error);
    res.status(500).send("Error interno del servidor al crear la reserva.");
  }
});

module.exports = router;
