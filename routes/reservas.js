const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { protect } = require('../middlewares/authMiddleware');
const notificationService = require('../services/notifications.service');

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
      fechaHora: new Date(`${fecha}T${hora}`), // Agregar fechaHora para notificaciones
      estado: estado || 'Pendiente', // Estado por defecto: Pendiente
      usuarioId,
      usuarioNombre: userData.nombre || 'Usuario',
      usuarioEmail: req.user.email || userData.email || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      // Campos para notificaciones
      reminderSent: false,
      imminentNotificationSent: false,
    };

    const docRef = await db.collection('reservas').add(nuevaReserva);
    
    console.log(`[POST /api/reservas] ✅ Reserva creada con ID: ${docRef.id} - Estado: ${nuevaReserva.estado}`);

    // Enviar notificación al ADMINISTRADOR del complejo
    try {
      // Buscar el admin del complejo
      const adminsSnapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .where('complejoId', '==', complejoId)
        .get();
      
      if (!adminsSnapshot.empty) {
        const adminDoc = adminsSnapshot.docs[0]; // Tomar el primer admin del complejo
        const adminData = adminDoc.data();
        
        if (adminData.pushToken && adminData.notificationsEnabled !== false) {
          await notificationService.sendNotification(
            adminData.pushToken,
            '🔔 Nueva Reserva Pendiente',
            `${userData.nombre || 'Un usuario'} solicita reservar ${cancha.nombre} el ${fecha} a las ${hora}`,
            {
              type: 'nueva_reserva',
              reservaId: docRef.id,
              canchaNombre: cancha.nombre,
              fecha,
              hora,
              usuarioNombre: userData.nombre || 'Usuario',
            },
            adminDoc.id
          );
          console.log(`✅ Notificación enviada al admin ${adminDoc.id} sobre nueva reserva ${docRef.id}`);
        }
      }
    } catch (notificationError) {
      console.error('Error enviando notificación al admin:', notificationError);
      // No fallar la creación de reserva si falla la notificación
    }

    // Enviar notificación de confirmación si el estado es 'confirmada'
    if (nuevaReserva.estado === 'confirmada' && userData.pushToken) {
      try {
        const canReceive = await notificationService.canUserReceiveNotification(
          usuarioId, 
          'confirmations'
        );

        if (canReceive) {
          await notificationService.sendReservaConfirmation(
            userData.pushToken,
            {
              id: docRef.id,
              canchaNombre: cancha.nombre,
              fecha,
              hora,
            },
            usuarioId
          );
          console.log(`✅ Notificación de confirmación enviada para reserva ${docRef.id}`);

          // Programar recordatorio (2 horas antes)
          const fechaHoraReserva = new Date(`${fecha}T${hora}`);
          await notificationService.scheduleReminder(
            docRef.id,
            cancha.nombre,
            fechaHoraReserva,
            userData.pushToken,
            usuarioId
          );
        }
      } catch (notificationError) {
        console.error('Error enviando notificación de confirmación:', notificationError);
        // No fallar la creación de reserva si falla la notificación
      }
    }

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

// PUT /api/reservas/:id/confirm
// Confirmar una reserva (solo para admins)
router.put('/:id/confirm', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;

    // Verificar si es admin
    const userDoc = await db.collection('users').doc(usuarioId).get();
    const userData = userDoc.data();

    if (userData.role !== 'admin') {
      return res.status(403).json({ 
        message: 'No autorizado. Solo administradores pueden confirmar reservas.' 
      });
    }

    // Obtener la reserva
    const reservaDoc = await db.collection('reservas').doc(id).get();
    if (!reservaDoc.exists) {
      return res.status(404).json({ message: 'Reserva no encontrada.' });
    }

    const reservaData = reservaDoc.data();

    if (reservaData.estado === 'confirmada') {
      return res.status(400).json({ message: 'La reserva ya está confirmada.' });
    }

    // Actualizar estado a confirmada
    await db.collection('reservas').doc(id).update({
      estado: 'confirmada',
      updatedAt: new Date(),
      confirmedAt: new Date().toISOString(),
    });

    // Enviar notificación de confirmación al usuario
    try {
      const reservaUserDoc = await db.collection('users').doc(reservaData.usuarioId).get();
      const reservaUserData = reservaUserDoc.data();

      if (reservaUserData.pushToken) {
        const canReceive = await notificationService.canUserReceiveNotification(
          reservaData.usuarioId, 
          'confirmations'
        );

        if (canReceive) {
          await notificationService.sendReservaConfirmation(
            reservaUserData.pushToken,
            {
              id,
              canchaNombre: reservaData.canchaNombre,
              fecha: reservaData.fecha,
              hora: reservaData.hora,
            },
            reservaData.usuarioId
          );
          console.log(`✅ Notificación de confirmación enviada para reserva ${id}`);

          // Programar recordatorio (2 horas antes)
          const fechaHoraReserva = new Date(`${reservaData.fecha}T${reservaData.hora}`);
          await notificationService.scheduleReminder(
            id,
            reservaData.canchaNombre,
            fechaHoraReserva,
            reservaUserData.pushToken,
            reservaData.usuarioId
          );
        }
      }
    } catch (notificationError) {
      console.error('Error enviando notificación de confirmación:', notificationError);
    }

    res.status(200).json({ 
      message: 'Reserva confirmada exitosamente.',
      reserva: {
        id,
        ...reservaData,
        estado: 'confirmada',
        updatedAt: new Date(),
      }
    });

  } catch (error) {
    console.error("Error al confirmar la reserva: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// PUT /api/reservas/:id/cancel
// Cancelar una reserva
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;

    // Obtener la reserva
    const reservaDoc = await db.collection('reservas').doc(id).get();
    if (!reservaDoc.exists) {
      return res.status(404).json({ message: 'Reserva no encontrada.' });
    }

    const reservaData = reservaDoc.data();

    // Verificar que el usuario sea el dueño de la reserva o un admin
    const userDoc = await db.collection('users').doc(usuarioId).get();
    const userData = userDoc.data();

    if (reservaData.usuarioId !== usuarioId && userData.role !== 'admin') {
      return res.status(403).json({ 
        message: 'No autorizado para cancelar esta reserva.' 
      });
    }

    if (reservaData.estado === 'cancelada') {
      return res.status(400).json({ message: 'La reserva ya está cancelada.' });
    }

    // Actualizar estado a cancelada
    await db.collection('reservas').doc(id).update({
      estado: 'cancelada',
      updatedAt: new Date(),
      cancelledAt: new Date().toISOString(),
    });

    // Enviar notificación de cancelación al usuario (si no fue el mismo quien canceló)
    if (reservaData.usuarioId !== usuarioId) {
      try {
        const reservaUserDoc = await db.collection('users').doc(reservaData.usuarioId).get();
        const reservaUserData = reservaUserDoc.data();

        if (reservaUserData.pushToken) {
          const canReceive = await notificationService.canUserReceiveNotification(
            reservaData.usuarioId, 
            'confirmations'
          );

          if (canReceive) {
            await notificationService.sendReservaCancellation(
              reservaUserData.pushToken,
              {
                canchaNombre: reservaData.canchaNombre,
                fecha: reservaData.fecha,
                hora: reservaData.hora,
              },
              reservaData.usuarioId
            );
            console.log(`✅ Notificación de cancelación enviada para reserva ${id}`);
          }
        }
      } catch (notificationError) {
        console.error('Error enviando notificación de cancelación:', notificationError);
      }
    }

    res.status(200).json({ 
      message: 'Reserva cancelada exitosamente.',
      reserva: {
        id,
        ...reservaData,
        estado: 'cancelada',
        updatedAt: new Date(),
      }
    });

  } catch (error) {
    console.error("Error al cancelar la reserva: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

module.exports = router;
