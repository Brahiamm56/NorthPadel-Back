const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { protect } = require('../middlewares/authMiddleware');

// GET /api/reservas/ (Para obtener las reservas del usuario)
router.get('/', protect, async (req, res) => {
  try {
    const usuarioId = req.user.userId;
    console.log(`[GET /api/reservas] Buscando reservas para usuarioId: ${usuarioId}`);
    
    const snapshot = await db.collection('reservas').where('usuarioId', '==', usuarioId).get();
    
    console.log(`[GET /api/reservas] Se encontraron ${snapshot.size} reservas`);
    
    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    const reservas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(reservas);
  } catch (error) {
    console.error("Error al obtener las reservas: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// POST /api/reservas/ (Para crear una nueva reserva)
router.post('/', protect, async (req, res) => {
  try {
    const usuarioId = req.user.userId;
    const { complejoId, canchaId, fecha, hora, estado } = req.body;

    console.log(`[POST /api/reservas] Intentando crear reserva para usuarioId: ${usuarioId}`);
    console.log(`[POST /api/reservas] Datos: cancha=${canchaId}, fecha=${fecha}, hora=${hora}`);

    // Validar datos requeridos
    if (!complejoId || !canchaId || !fecha || !hora) {
      return res.status(400).json({ 
        message: 'Faltan datos requeridos: complejoId, canchaId, fecha, hora' 
      });
    }

    // Obtener información del complejo y la cancha
    const complejoDoc = await db.collection('complejos').doc(complejoId).get();
    if (!complejoDoc.exists) {
      return res.status(404).json({ message: 'Complejo no encontrado.' });
    }

    const complejoData = complejoDoc.data();
    const cancha = complejoData.canchas?.find(c => c.id === canchaId);
    
    if (!cancha) {
      return res.status(404).json({ message: 'Cancha no encontrada.' });
    }

    // Verificar disponibilidad: solo bloquear si hay reservas CONFIRMADAS
    const reservasConfirmadasQuery = db.collection('reservas')
      .where('canchaId', '==', canchaId)
      .where('fecha', '==', fecha)
      .where('hora', '==', hora)
      .where('estado', '==', 'Confirmada');

    const reservasConfirmadas = await reservasConfirmadasQuery.get();

    if (!reservasConfirmadas.empty) {
      console.log(`[POST /api/reservas] ❌ Horario ya ocupado por reserva confirmada`);
      return res.status(409).json({ 
        message: 'Este horario ya está reservado. Por favor, elige otro.' 
      });
    }

    // Obtener información del usuario
    const userDoc = await db.collection('users').doc(usuarioId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Crear reserva con estado Pendiente por defecto
    const nuevaReserva = {
      complejoId,
      canchaId,
      canchaNombre: cancha.nombre,
      canchaImagenUrl: cancha.imagenUrl || null,
      fecha,
      hora,
      estado: estado || 'Pendiente', // Estado por defecto: Pendiente
      usuarioId,
      usuarioNombre: userData.nombre || 'Usuario',
      usuarioEmail: req.user.email || userData.email || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('reservas').add(nuevaReserva);
    
    console.log(`[POST /api/reservas] ✅ Reserva creada con ID: ${docRef.id} - Estado: ${nuevaReserva.estado}`);

    res.status(201).json({ 
      id: docRef.id,
      ...nuevaReserva,
      message: 'Reserva creada exitosamente. Pendiente de confirmación del administrador.'
    });

  } catch (error) {
    console.error("Error al crear la reserva: ", error);
    res.status(500).json({ message: "Error interno del servidor al crear la reserva." });
  }
});

module.exports = router;
