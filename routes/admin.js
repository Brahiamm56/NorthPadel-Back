const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const { protect } = require('../middlewares/authMiddleware');
const notificationService = require('../services/notifications.service');

// GET /api/admin/canchas - Obtiene las canchas del complejo del admin
router.get('/canchas', protect, async (req, res) => {
    try {
        const adminId = req.user.userId;
        const adminDoc = await db.collection('users').doc(adminId).get();
        if (!adminDoc.exists || !adminDoc.data().complejoId) {
            return res.status(403).json({ message: 'Administrador no válido o sin complejo asignado.' });
        }
        const complejoId = adminDoc.data().complejoId;
        const complejoDoc = await db.collection('complejos').doc(complejoId).get();
        if (!complejoDoc.exists) {
            return res.status(404).json({ message: 'Complejo no encontrado.' });
        }
        const canchas = complejoDoc.data().canchas || [];
        res.status(200).json(canchas);
    } catch (error) {
        console.error("Error al obtener las canchas del admin: ", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
});

// --- ENDPOINT MODIFICADO ---
// POST /api/admin/canchas - Crea una nueva cancha con más detalles
router.post('/canchas', protect, async (req, res) => {
  try {
    const adminId = req.user.userId;
    // 1. Recibimos los nuevos campos del body
    const { 
        nombre, 
        precioHora, 
        imagenUrl, 
        descripcion, 
        esTechada, 
        vendePelotitas,
        horaInicio,
        horaFin
    } = req.body;

    // 2. Validamos que los datos necesarios están presentes
    if (!nombre || !precioHora || !imagenUrl) {
        return res.status(400).json({ message: 'Nombre, precio e imagen son requeridos.' });
    }

    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || !adminDoc.data().complejoId) {
        return res.status(403).json({ message: 'Administrador no válido o sin complejo asignado.' });
    }
    const complejoId = adminDoc.data().complejoId;

    // 3. Creamos el nuevo objeto de cancha con todos los detalles
    const nuevaCancha = {
        id: `cancha-${Date.now()}`,
        nombre,
        precioHora,
        imagenUrl,
        descripcion: descripcion || '', // Valor por defecto si no se envía
        esTechada: esTechada || false,   // Valor por defecto
        vendePelotitas: vendePelotitas || false, // Valor por defecto
        horaInicio: horaInicio || '08:00', // Hora de inicio de disponibilidad
        horaFin: horaFin || '23:00',       // Hora de fin de disponibilidad
        publicada: true, // Por defecto, una cancha nueva está publicada
    };

    const complejoRef = db.collection('complejos').doc(complejoId);
    await complejoRef.update({
        canchas: admin.firestore.FieldValue.arrayUnion(nuevaCancha)
    });

    res.status(201).json({ message: 'Cancha creada exitosamente', cancha: nuevaCancha });

  } catch (error) {
    console.error("Error al crear la cancha: ", error);
    res.status(500).json({ message: "Error interno del servidor al crear la cancha." });
  }
});

// PUT /api/admin/canchas/:canchaId - Actualiza la información completa de una cancha
router.put('/canchas/:canchaId', protect, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const datosActualizados = req.body;

    // Validar que al menos un dato para actualizar esté presente
    if (!datosActualizados || Object.keys(datosActualizados).length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar al menos un campo para actualizar.' });
    }

    // Validar y obtener el complejoId del administrador
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || !adminDoc.data().complejoId) {
      return res.status(403).json({ message: 'Administrador no válido o sin complejo asignado.' });
    }

    const complejoId = adminDoc.data().complejoId;

    // Obtener el documento del complejo
    const complejoRef = db.collection('complejos').doc(complejoId);
    const complejoDoc = await complejoRef.get();

    if (!complejoDoc.exists) {
      return res.status(404).json({ message: 'Complejo no encontrado.' });
    }

    // Obtener el array de canchas actual
    const complejoData = complejoDoc.data();
    const canchasActuales = complejoData.canchas || [];

    // Verificar que la cancha existe en el array
    const canchaExiste = canchasActuales.some(cancha => cancha.id === canchaId);
    if (!canchaExiste) {
      return res.status(404).json({ message: 'Cancha no encontrada en el complejo.' });
    }

    // Actualizar la cancha específica manteniendo los demás datos
    const canchasActualizadas = canchasActuales.map(cancha => {
      if (cancha.id === canchaId) {
        // Combinar la cancha original con los datos actualizados
        return { ...cancha, ...datosActualizados };
      }
      return cancha;
    });

    // Guardar los cambios en Firestore
    await complejoRef.update({ canchas: canchasActualizadas });

    // Encontrar la cancha actualizada para devolverla en la respuesta
    const canchaActualizada = canchasActualizadas.find(cancha => cancha.id === canchaId);

    res.status(200).json({ 
      message: 'Cancha actualizada exitosamente',
      cancha: canchaActualizada
    });

  } catch (error) {
    console.error("Error al actualizar la cancha: ", error);
    res.status(500).json({ message: "Error interno del servidor al actualizar la cancha." });
  }
});

// DELETE /api/admin/canchas/:canchaId - Elimina una cancha específica del complejo
router.delete('/canchas/:canchaId', protect, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;

    // Validar y obtener el complejoId del administrador
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || !adminDoc.data().complejoId) {
      return res.status(403).json({ message: 'Administrador no válido o sin complejo asignado.' });
    }

    const complejoId = adminDoc.data().complejoId;

    // Obtener el documento del complejo
    const complejoRef = db.collection('complejos').doc(complejoId);
    const complejoDoc = await complejoRef.get();

    if (!complejoDoc.exists) {
      return res.status(404).json({ message: 'Complejo no encontrado.' });
    }

    // Obtener el array de canchas actual
    const complejoData = complejoDoc.data();
    const canchasActuales = complejoData.canchas || [];

    // Buscar la cancha específica que se va a eliminar
    const canchaAEliminar = canchasActuales.find(cancha => cancha.id === canchaId);

    if (!canchaAEliminar) {
      return res.status(404).json({ message: 'Cancha no encontrada en el complejo.' });
    }

    // Usar FieldValue.arrayRemove para eliminar la cancha del array
    await complejoRef.update({
      canchas: admin.firestore.FieldValue.arrayRemove(canchaAEliminar)
    });

    res.status(200).json({ 
      message: 'Cancha eliminada exitosamente',
      canchaId: canchaId
    });

  } catch (error) {
    console.error("Error al eliminar la cancha: ", error);
    res.status(500).json({ message: "Error interno del servidor al eliminar la cancha." });
  }
});

// PUT /api/admin/canchas/:canchaId/toggle-status - Cambia el estado de publicación de una cancha
router.put('/canchas/:canchaId/toggle-status', protect, async (req, res) => {
    try {
        const adminId = req.user.userId;
        const { canchaId } = req.params;
        const { publicada } = req.body;

        const adminDoc = await db.collection('users').doc(adminId).get();
        const complejoId = adminDoc.data().complejoId;
        if (!complejoId) {
            return res.status(403).json({ message: 'Admin sin complejo asignado.' });
        }

        const complejoRef = db.collection('complejos').doc(complejoId);
        const complejoDoc = await complejoRef.get();
        if (!complejoDoc.exists) {
            return res.status(404).json({ message: 'Complejo no encontrado.' });
        }

        const complejoData = complejoDoc.data();
        const canchasActuales = complejoData.canchas || [];

        const canchasActualizadas = canchasActuales.map(cancha => {
            if (cancha.id === canchaId) {
                return { ...cancha, publicada: publicada };
            }
            return cancha;
        });

        await complejoRef.update({ canchas: canchasActualizadas });

        res.status(200).json({ message: 'Estado de la cancha actualizado exitosamente.' });

    } catch (error) {
        console.error("Error al actualizar estado de la cancha: ", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
});

// PATCH /api/admin/canchas/:canchaId - Actualiza el estado de publicación de una cancha
router.patch('/canchas/:canchaId', protect, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const { publicada } = req.body;

    // Validar que publicada sea un boolean
    if (typeof publicada !== 'boolean') {
      return res.status(400).json({ 
        message: 'El campo publicada debe ser un valor booleano (true/false)' 
      });
    }

    // Obtener el documento del administrador y validar
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }

    const complejoId = adminDoc.data().complejoId;
    if (!complejoId) {
      return res.status(403).json({ message: 'Administrador sin complejo asignado.' });
    }

    // Buscar el complejo
    const complejoRef = db.collection('complejos').doc(complejoId);
    const complejoDoc = await complejoRef.get();

    if (!complejoDoc.exists) {
      return res.status(404).json({ message: 'Complejo no encontrado.' });
    }

    const complejoData = complejoDoc.data();
    const canchasActuales = complejoData.canchas || [];

    // Buscar la cancha específica
    const canchaIndex = canchasActuales.findIndex(cancha => cancha.id === canchaId);
    
    if (canchaIndex === -1) {
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }

    // Actualizar el campo publicada y agregar timestamp
    const canchasActualizadas = canchasActuales.map((cancha, index) => {
      if (index === canchaIndex) {
        return { 
          ...cancha, 
          publicada: publicada,
          updatedAt: new Date().toISOString()
        };
      }
      return cancha;
    });

    // Guardar cambios en Firestore
    await complejoRef.update({ canchas: canchasActualizadas });

    // Obtener la cancha actualizada
    const canchaActualizada = canchasActualizadas[canchaIndex];

    // Responder con la cancha actualizada
    res.status(200).json({
      id: canchaActualizada.id,
      ...canchaActualizada
    });

  } catch (error) {
    console.error('Error al actualizar cancha:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al actualizar la cancha' 
    });
  }
});

// POST /api/admin/canchas/:canchaId/bloquear - Bloquea un horario específico de una cancha
router.post('/canchas/:canchaId/bloquear', protect, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const { fecha, hora } = req.body;

    // Validar datos requeridos
    if (!fecha || !hora) {
      return res.status(400).json({ message: 'Fecha y hora son requeridos.' });
    }

    // Validar y obtener complejoId del admin
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || !adminDoc.data().complejoId) {
      return res.status(403).json({ message: 'Administrador no válido o sin complejo asignado.' });
    }

    const complejoId = adminDoc.data().complejoId;

    // Obtener el documento del complejo
    const complejoRef = db.collection('complejos').doc(complejoId);
    const complejoDoc = await complejoRef.get();

    if (!complejoDoc.exists) {
      return res.status(404).json({ message: 'Complejo no encontrado.' });
    }

    const complejoData = complejoDoc.data();
    const canchasActuales = complejoData.canchas || [];

    // Buscar la cancha específica
    const canchaIndex = canchasActuales.findIndex(c => c.id === canchaId);
    if (canchaIndex === -1) {
      return res.status(404).json({ message: 'Cancha no encontrada en el complejo.' });
    }

    // Actualizar la cancha agregando el bloqueo
    const canchasActualizadas = canchasActuales.map((cancha, index) => {
      if (index === canchaIndex) {
        const bloqueosActuales = cancha.bloqueos || [];
        // Verificar si ya existe el bloqueo
        const yaExiste = bloqueosActuales.some(b => b.fecha === fecha && b.hora === hora);
        if (yaExiste) {
          return cancha; // No agregar duplicado
        }
        return {
          ...cancha,
          bloqueos: [...bloqueosActuales, { fecha, hora }]
        };
      }
      return cancha;
    });

    // Guardar cambios
    await complejoRef.update({ canchas: canchasActualizadas });

    res.status(200).json({ 
      message: 'Horario bloqueado exitosamente',
      fecha,
      hora
    });

  } catch (error) {
    console.error("Error al bloquear horario: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// POST /api/admin/canchas/:canchaId/desbloquear - Desbloquea un horario específico de una cancha
router.post('/canchas/:canchaId/desbloquear', protect, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const { fecha, hora } = req.body;

    // Validar datos requeridos
    if (!fecha || !hora) {
      return res.status(400).json({ message: 'Fecha y hora son requeridos.' });
    }

    // Validar y obtener complejoId del admin
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || !adminDoc.data().complejoId) {
      return res.status(403).json({ message: 'Administrador no válido o sin complejo asignado.' });
    }

    const complejoId = adminDoc.data().complejoId;

    // Obtener el documento del complejo
    const complejoRef = db.collection('complejos').doc(complejoId);
    const complejoDoc = await complejoRef.get();

    if (!complejoDoc.exists) {
      return res.status(404).json({ message: 'Complejo no encontrado.' });
    }

    const complejoData = complejoDoc.data();
    const canchasActuales = complejoData.canchas || [];

    // Buscar la cancha específica
    const canchaIndex = canchasActuales.findIndex(c => c.id === canchaId);
    if (canchaIndex === -1) {
      return res.status(404).json({ message: 'Cancha no encontrada en el complejo.' });
    }

    // Actualizar la cancha eliminando el bloqueo
    const canchasActualizadas = canchasActuales.map((cancha, index) => {
      if (index === canchaIndex) {
        const bloqueosActuales = cancha.bloqueos || [];
        const bloqueosActualizados = bloqueosActuales.filter(
          b => !(b.fecha === fecha && b.hora === hora)
        );
        return {
          ...cancha,
          bloqueos: bloqueosActualizados
        };
      }
      return cancha;
    });

    // Guardar cambios
    await complejoRef.update({ canchas: canchasActualizadas });

    res.status(200).json({ 
      message: 'Horario desbloqueado exitosamente',
      fecha,
      hora
    });

  } catch (error) {
    console.error("Error al desbloquear horario: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// GET /api/admin/canchas/:canchaId/disponibilidad - Obtiene los horarios ocupados para una cancha en una fecha específica
router.get('/canchas/:canchaId/disponibilidad', protect, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { canchaId } = req.params;
    const { fecha } = req.query;

    // Validar que el administrador existe y tiene un complejoId
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || !adminDoc.data().complejoId) {
      return res.status(403).json({ message: 'Administrador no válido o sin complejo asignado.' });
    }

    const complejoId = adminDoc.data().complejoId;

    // Validar que canchaId y fecha existen
    if (!canchaId) {
      return res.status(400).json({ message: 'El ID de la cancha es requerido.' });
    }

    if (!fecha) {
      return res.status(400).json({ message: 'La fecha es requerida (formato YYYY-MM-DD).' });
    }

    // 1. Consultar SOLO reservas CONFIRMADAS en Firestore
    // Las reservas Pendientes y Canceladas NO bloquean el horario
    const reservasSnapshot = await db.collection('reservas')
      .where('complejoId', '==', complejoId)
      .where('canchaId', '==', canchaId)
      .where('fecha', '==', fecha)
      .where('estado', '==', 'Confirmada') // ← SOLO CONFIRMADAS
      .get();

    // Extraer solo las horas de las reservas confirmadas
    const horariosReservados = [];
    if (!reservasSnapshot.empty) {
      reservasSnapshot.forEach(doc => {
        const reservaData = doc.data();
        if (reservaData.hora) {
          horariosReservados.push(reservaData.hora);
        }
      });
    }

    // 2. Obtener bloqueos de la cancha
    const complejoDoc = await db.collection('complejos').doc(complejoId).get();
    let horariosBloqueados = [];
    
    if (complejoDoc.exists) {
      const complejoData = complejoDoc.data();
      const cancha = complejoData.canchas?.find(c => c.id === canchaId);
      
      if (cancha && cancha.bloqueos) {
        // Filtrar bloqueos solo para la fecha solicitada
        horariosBloqueados = cancha.bloqueos
          .filter(bloqueo => bloqueo.fecha === fecha)
          .map(bloqueo => bloqueo.hora);
      }
    }

    // Devolver objeto con ambos arrays
    res.status(200).json({
      horariosReservados,
      horariosBloqueados
    });

  } catch (error) {
    console.error("Error al obtener disponibilidad de la cancha: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// GET /api/admin/reservas - Obtiene las reservas del complejo del admin con nombre de usuario y cancha
// Soporta filtro opcional por fecha: ?fecha=YYYY-MM-DD
// Soporta filtro opcional por estado: ?estado=Pendiente|Confirmada|Cancelada
router.get('/reservas', protect, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { fecha, estado } = req.query; // Filtros opcionales

    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const complejoId = adminDoc.data().complejoId;
    if (!complejoId) {
      return res.status(404).json({ message: 'Admin sin complejo asignado.' });
    }

    // 1. Obtenemos los datos del complejo UNA SOLA VEZ
    const complejoDoc = await db.collection('complejos').doc(complejoId).get();
    if (!complejoDoc.exists) {
        return res.status(404).json({ message: 'Complejo no encontrado.' });
    }
    const canchasDelComplejo = complejoDoc.data().canchas || [];

    // 2. Construir query con filtros opcionales
    let query = db.collection('reservas').where('complejoId', '==', complejoId);
    
    // Filtrar por fecha si se proporciona
    if (fecha) {
      query = query.where('fecha', '==', fecha);
    }
    
    // Filtrar por estado si se proporciona
    if (estado && ['Pendiente', 'Confirmada', 'Cancelada'].includes(estado)) {
      query = query.where('estado', '==', estado);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const reservasPromises = snapshot.docs.map(async (doc) => {
      const reservaData = doc.data();
      let usuarioNombre = 'Usuario Anónimo';
      let canchaNombre = 'Cancha no encontrada';
      let canchaImagenUrl = null; // Inicializar con null por defecto

      // Popular nombre de usuario
      if (reservaData.usuarioId) {
        const userDoc = await db.collection('users').doc(reservaData.usuarioId).get();
        if (userDoc.exists) {
          usuarioNombre = userDoc.data().nombre || 'Nombre no especificado';
        }
      }

      // --- ¡LÓGICA PARA POPULAR NOMBRE E IMAGEN DE CANCHA! ---
      const canchaEncontrada = canchasDelComplejo.find(c => c.id === reservaData.canchaId);
      if (canchaEncontrada) {
          canchaNombre = canchaEncontrada.nombre;
          canchaImagenUrl = canchaEncontrada.imagenUrl || null; // Obtener imagenUrl, null si no existe
      }
      // --- FIN DE LÓGICA ---

      return {
        id: doc.id,
        ...reservaData,
        usuarioNombre: usuarioNombre,
        canchaNombre: canchaNombre,
        canchaImagenUrl: canchaImagenUrl, // Añadimos el nuevo campo
      };
    });

    const reservasPopulated = await Promise.all(reservasPromises);
    res.status(200).json(reservasPopulated);

  } catch (error) {
    console.error("Error al obtener las reservas del admin: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// PUT /api/admin/reservas/:reservaId/confirmar - Confirma una reserva específica
router.put('/reservas/:reservaId/confirmar', protect, async (req, res) => {
  try {
    const { reservaId } = req.params;
    const adminId = req.user.userId;

    console.log(`[CONFIRMAR] Iniciando confirmación de reserva ${reservaId} por admin ${adminId}`);

    // Validar formato del ID de reserva
    if (!reservaId || reservaId.trim() === '') {
      console.log(`[CONFIRMAR] ❌ ID de reserva inválido: ${reservaId}`);
      return res.status(400).json({ message: 'ID de reserva inválido.' });
    }

    // Verificar que el usuario sea administrador
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      console.log(`[CONFIRMAR] ❌ Usuario ${adminId} no es administrador`);
      return res.status(403).json({ message: 'Acceso denegado. Solo administradores pueden confirmar reservas.' });
    }

    // Verificar que el admin tenga complejo asignado
    const complejoId = adminDoc.data().complejoId;
    if (!complejoId) {
      console.log(`[CONFIRMAR] ❌ Admin ${adminId} sin complejo asignado`);
      return res.status(403).json({ message: 'Administrador sin complejo asignado.' });
    }

    console.log(`[CONFIRMAR] Admin ${adminId} del complejo ${complejoId} intentando confirmar reserva ${reservaId}`);

    // Buscar la reserva en la base de datos
    const reservaRef = db.collection('reservas').doc(reservaId);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      console.log(`[CONFIRMAR] ❌ Reserva ${reservaId} no encontrada`);
      return res.status(404).json({ message: 'Reserva no encontrada.' });
    }

    const reservaData = reservaDoc.data();
    console.log(`[CONFIRMAR] Datos de la reserva:`, JSON.stringify(reservaData, null, 2));

    // Verificar que la reserva pertenece al complejo del admin
    if (reservaData.complejoId !== complejoId) {
      console.log(`[CONFIRMAR] ❌ Reserva ${reservaId} pertenece al complejo ${reservaData.complejoId}, admin es del complejo ${complejoId}`);
      return res.status(403).json({ message: 'No tienes permisos para confirmar esta reserva.' });
    }

    console.log(`[CONFIRMAR] Estado actual de la reserva: ${reservaData.estado}`);

    // Verificar que la reserva no esté ya confirmada
    if (reservaData.estado === 'Confirmada' || reservaData.estado === 'confirmada') {
      console.log(`[CONFIRMAR] ❌ Reserva ${reservaId} ya está confirmada con estado: ${reservaData.estado}`);
      return res.status(400).json({ message: 'La reserva ya está confirmada.' });
    }

    // Verificar que la reserva no esté cancelada
    if (reservaData.estado === 'Cancelada' || reservaData.estado === 'cancelada') {
      console.log(`[CONFIRMAR] ❌ Reserva ${reservaId} está cancelada con estado: ${reservaData.estado}`);
      return res.status(400).json({ message: 'No se puede confirmar una reserva cancelada.' });
    }

    // Verificar que la reserva no esté completada
    if (reservaData.estado === 'Completada' || reservaData.estado === 'completada') {
      console.log(`[CONFIRMAR] ❌ Reserva ${reservaId} está completada con estado: ${reservaData.estado}`);
      return res.status(400).json({ message: 'No se puede confirmar una reserva completada.' });
    }

    // Actualizar el estado de la reserva a confirmada
    const fechaConfirmacion = new Date();
    const updateData = {
      estado: 'Confirmada',
      confirmedAt: fechaConfirmacion,
      confirmedBy: adminId,
      updatedAt: fechaConfirmacion
    };

    console.log(`[CONFIRMAR] Actualizando reserva ${reservaId} con datos:`, JSON.stringify(updateData, null, 2));

    await reservaRef.update(updateData);

    // Log de auditoría
    console.log(`[AUDIT] ✅ Reserva ${reservaId} confirmada exitosamente por admin ${adminId} el ${fechaConfirmacion.toISOString()}`);

    // Enviar notificación al USUARIO sobre la confirmación
    try {
      const userDoc = await db.collection('users').doc(reservaData.usuarioId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        if (userData.pushToken && userData.notificationsEnabled !== false) {
          const canReceive = await notificationService.canUserReceiveNotification(
            reservaData.usuarioId, 
            'confirmations'
          );
          
          if (canReceive) {
            await notificationService.sendReservaConfirmation(
              userData.pushToken,
              {
                id: reservaId,
                canchaNombre: reservaData.canchaNombre,
                fecha: reservaData.fecha,
                hora: reservaData.hora,
              },
              reservaData.usuarioId
            );
            console.log(`✅ Notificación de confirmación enviada al usuario ${reservaData.usuarioId}`);
            
            // Programar recordatorio (2 horas antes)
            if (reservaData.fechaHora) {
              const fechaHoraReserva = new Date(reservaData.fechaHora);
              await notificationService.scheduleReminder(
                reservaId,
                reservaData.canchaNombre,
                fechaHoraReserva,
                userData.pushToken,
                reservaData.usuarioId
              );
              console.log(`⏰ Recordatorio programado para reserva ${reservaId}`);
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Error enviando notificación al usuario:', notificationError);
      // No fallar la confirmación si falla la notificación
    }

    // Obtener reserva actualizada
    const reservaActualizada = await reservaRef.get();

    // Respuesta de éxito con datos completos
    res.status(200).json({
      id: reservaId,
      ...reservaActualizada.data(),
      message: 'Reserva confirmada exitosamente.'
    });

  } catch (error) {
    console.error("Error al confirmar la reserva: ", error);
    res.status(500).json({ message: "Error interno del servidor al confirmar la reserva." });
  }
});

// PUT /api/admin/reservas/:reservaId/cancelar - Cancela una reserva específica
router.put('/reservas/:reservaId/cancelar', protect, async (req, res) => {
  try {
    const { reservaId } = req.params;
    const adminId = req.user.userId;

    console.log(`[CANCELAR] Iniciando cancelación de reserva ${reservaId} por admin ${adminId}`);

    // Validar formato del ID de reserva
    if (!reservaId || reservaId.trim() === '') {
      console.log(`[CANCELAR] ❌ ID de reserva inválido: ${reservaId}`);
      return res.status(400).json({ message: 'ID de reserva inválido.' });
    }

    // Verificar que el usuario sea administrador
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      console.log(`[CANCELAR] ❌ Usuario ${adminId} no es administrador`);
      return res.status(401).json({ message: 'Acceso denegado. Solo administradores pueden cancelar reservas.' });
    }

    // Verificar que el admin tenga complejo asignado
    const complejoId = adminDoc.data().complejoId;
    if (!complejoId) {
      console.log(`[CANCELAR] ❌ Admin ${adminId} sin complejo asignado`);
      return res.status(403).json({ message: 'Administrador sin complejo asignado.' });
    }

    console.log(`[CANCELAR] Admin ${adminId} del complejo ${complejoId} intentando cancelar reserva ${reservaId}`);

    // Buscar la reserva en la base de datos
    const reservaRef = db.collection('reservas').doc(reservaId);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      console.log(`[CANCELAR] ❌ Reserva ${reservaId} no encontrada`);
      return res.status(404).json({ message: 'Reserva no encontrada.' });
    }

    const reservaData = reservaDoc.data();
    console.log(`[CANCELAR] Datos de la reserva:`, JSON.stringify(reservaData, null, 2));

    // Verificar que la reserva pertenece al complejo del admin
    if (reservaData.complejoId !== complejoId) {
      console.log(`[CANCELAR] ❌ Reserva ${reservaId} pertenece al complejo ${reservaData.complejoId}, admin es del complejo ${complejoId}`);
      return res.status(403).json({ message: 'No tienes permisos para cancelar esta reserva.' });
    }

    console.log(`[CANCELAR] Estado actual de la reserva: ${reservaData.estado}`);

    // Verificar que la reserva no esté ya cancelada
    if (reservaData.estado === 'Cancelada' || reservaData.estado === 'cancelada') {
      console.log(`[CANCELAR] ❌ Reserva ${reservaId} ya está cancelada con estado: ${reservaData.estado}`);
      return res.status(400).json({ message: 'La reserva ya está cancelada.' });
    }

    // Verificar que la reserva no esté completada
    if (reservaData.estado === 'Completada' || reservaData.estado === 'completada') {
      console.log(`[CANCELAR] ❌ Reserva ${reservaId} está completada con estado: ${reservaData.estado}`);
      return res.status(400).json({ message: 'No se puede cancelar una reserva completada.' });
    }

    // Actualizar el estado de la reserva a Cancelada
    const fechaCancelacion = new Date();
    const updateData = {
      estado: 'Cancelada',
      canceledAt: fechaCancelacion,
      canceledBy: adminId,
      motivo: req.body.motivo || 'Cancelada por administrador',
      updatedAt: fechaCancelacion
    };

    console.log(`[CANCELAR] Actualizando reserva ${reservaId} con datos:`, JSON.stringify(updateData, null, 2));

    await reservaRef.update(updateData);

    // Log de auditoría
    console.log(`[AUDIT] ✅ Reserva ${reservaId} cancelada exitosamente por admin ${adminId} el ${fechaCancelacion.toISOString()}`);

    // Enviar notificación al USUARIO sobre la cancelación
    try {
      const userDoc = await db.collection('users').doc(reservaData.usuarioId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        if (userData.pushToken && userData.notificationsEnabled !== false) {
          const canReceive = await notificationService.canUserReceiveNotification(
            reservaData.usuarioId, 
            'confirmations'
          );
          
          if (canReceive) {
            await notificationService.sendReservaCancellation(
              userData.pushToken,
              {
                canchaNombre: reservaData.canchaNombre,
                fecha: reservaData.fecha,
                hora: reservaData.hora,
              },
              reservaData.usuarioId
            );
            console.log(`✅ Notificación de cancelación enviada al usuario ${reservaData.usuarioId}`);
          }
        }
      }
    } catch (notificationError) {
      console.error('Error enviando notificación de cancelación al usuario:', notificationError);
      // No fallar la cancelación si falla la notificación
    }

    // Obtener reserva actualizada
    const reservaActualizada = await reservaRef.get();

    // Respuesta de éxito con datos completos
    res.status(200).json({
      id: reservaId,
      ...reservaActualizada.data(),
      message: 'Reserva cancelada exitosamente.'
    });

  } catch (error) {
    console.error("Error al cancelar la reserva: ", error);
    res.status(500).json({ message: "Error interno del servidor al cancelar la reserva." });
  }
});

// GET /api/admin/reservas/:reservaId/diagnostico - Endpoint de diagnóstico para verificar el esquema
router.get('/reservas/:reservaId/diagnostico', protect, async (req, res) => {
  try {
    const { reservaId } = req.params;
    const adminId = req.user.userId;

    console.log(`[DIAGNÓSTICO] Verificando reserva ${reservaId} para admin ${adminId}`);

    // Verificar que el usuario sea administrador
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(401).json({ message: 'Acceso denegado. Solo administradores.' });
    }

    const complejoId = adminDoc.data().complejoId;
    if (!complejoId) {
      return res.status(403).json({ message: 'Administrador sin complejo asignado.' });
    }

    // Buscar la reserva
    const reservaRef = db.collection('reservas').doc(reservaId);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      return res.status(404).json({ message: 'Reserva no encontrada.' });
    }

    const reservaData = reservaDoc.data();

    // Diagnóstico completo
    const diagnostico = {
      reservaId: reservaId,
      existe: true,
      datos: reservaData,
      campos: {
        complejoId: reservaData.complejoId,
        canchaId: reservaData.canchaId,
        usuarioId: reservaData.usuarioId,
        estado: reservaData.estado,
        fecha: reservaData.fecha,
        hora: reservaData.hora,
        fechaCreacion: reservaData.fechaCreacion
      },
      validaciones: {
        perteneceAlComplejo: reservaData.complejoId === complejoId,
        estadoActual: reservaData.estado,
        puedeCancelar: reservaData.estado === 'Confirmada',
        tieneFechaCreacion: !!reservaData.fechaCreacion
      },
      adminInfo: {
        adminId: adminId,
        complejoId: complejoId,
        role: adminDoc.data().role
      }
    };

    console.log(`[DIAGNÓSTICO] Resultado:`, JSON.stringify(diagnostico, null, 2));

    res.status(200).json(diagnostico);

  } catch (error) {
    console.error("Error en diagnóstico: ", error);
    res.status(500).json({ 
      message: "Error interno del servidor en diagnóstico.",
      error: error.message 
    });
  }
});

// GET /api/admin/perfil-complejo - Obtiene la información básica del complejo del admin
router.get('/perfil-complejo', protect, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Buscar al usuario admin
    const adminDoc = await db.collection('users').doc(userId).get();
    
    if (!adminDoc.exists) {
      console.log(`[PERFIL-COMPLEJO] ❌ Usuario ${userId} no encontrado`);
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const adminData = adminDoc.data();

    // 2. Verificar que tenga complejoId asignado
    if (!adminData.complejoId) {
      console.log(`[PERFIL-COMPLEJO] ❌ Usuario ${userId} sin complejo asignado`);
      return res.status(404).json({ message: 'No tienes un complejo asignado.' });
    }

    const complejoId = adminData.complejoId;

    // 3. Buscar el documento del complejo
    const complejoDoc = await db.collection('complejos').doc(complejoId).get();

    if (!complejoDoc.exists) {
      console.log(`[PERFIL-COMPLEJO] ❌ Complejo ${complejoId} no encontrado`);
      return res.status(404).json({ message: 'Complejo no encontrado.' });
    }

    const complejoData = complejoDoc.data();

    // 4. Devolver datos básicos del complejo
    console.log(`[PERFIL-COMPLEJO] ✅ Datos del complejo ${complejoId} obtenidos para admin ${userId}`);
    
    res.status(200).json({
      id: complejoDoc.id,
      nombre: complejoData.nombre || '',
      telefono: complejoData.telefono || '',
    });

  } catch (error) {
    console.error('[PERFIL-COMPLEJO] Error:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

module.exports = router;

