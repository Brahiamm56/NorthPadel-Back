const { db } = require('../../config/firebase');
const notificationService = require('../notifications.service');

// GET /api/admin/reservas
const getReservas = async ({ adminId, fecha, estado }) => {
  try {
    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return { status: 403, body: { message: 'Acceso denegado.' } };
    }

    const complejoId = adminDoc.data().complejoId;
    if (!complejoId) {
      return { status: 404, body: { message: 'Admin sin complejo asignado.' } };
    }

    const complejoDoc = await db.collection('complejos').doc(complejoId).get();
    if (!complejoDoc.exists) {
      return { status: 404, body: { message: 'Complejo no encontrado.' } };
    }
    const canchasDelComplejo = complejoDoc.data().canchas || [];

    let query = db.collection('reservas').where('complejoId', '==', complejoId);

    if (fecha) {
      query = query.where('fecha', '==', fecha);
    }

    if (estado && ['Pendiente', 'Confirmada', 'Cancelada'].includes(estado)) {
      query = query.where('estado', '==', estado);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return { status: 200, body: [] };
    }

    const reservasPromises = snapshot.docs.map(async (doc) => {
      const reservaData = doc.data();
      let usuarioNombre = 'Usuario Anónimo';
      let canchaNombre = 'Cancha no encontrada';
      let canchaImagenUrl = null;

      if (reservaData.usuarioId) {
        const userDoc = await db.collection('users').doc(reservaData.usuarioId).get();
        if (userDoc.exists) {
          usuarioNombre = userDoc.data().nombre || 'Nombre no especificado';
        }
      }

      const canchaEncontrada = canchasDelComplejo.find(
        (c) => c.id === reservaData.canchaId
      );
      if (canchaEncontrada) {
        canchaNombre = canchaEncontrada.nombre;
        canchaImagenUrl = canchaEncontrada.imagenUrl || null;
      }

      return {
        id: doc.id,
        ...reservaData,
        usuarioNombre,
        canchaNombre,
        canchaImagenUrl,
      };
    });

    const reservasPopulated = await Promise.all(reservasPromises);
    return { status: 200, body: reservasPopulated };
  } catch (error) {
    console.error('Error al obtener las reservas del admin: ', error);
    return { status: 500, body: { message: 'Error interno del servidor.' } };
  }
};

// PUT /api/admin/reservas/:reservaId/confirmar
const confirmarReserva = async ({ reservaId, adminId }) => {
  try {
    console.log(
      `[CONFIRMAR] Iniciando confirmación de reserva ${reservaId} por admin ${adminId}`
    );

    if (!reservaId || reservaId.trim() === '') {
      console.log(`[CONFIRMAR] ❌ ID de reserva inválido: ${reservaId}`);
      return { status: 400, body: { message: 'ID de reserva inválido.' } };
    }

    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      console.log(`[CONFIRMAR] ❌ Usuario ${adminId} no es administrador`);
      return {
        status: 403,
        body: {
          message:
            'Acceso denegado. Solo administradores pueden confirmar reservas.',
        },
      };
    }

    const complejoId = adminDoc.data().complejoId;
    if (!complejoId) {
      console.log(`[CONFIRMAR] ❌ Admin ${adminId} sin complejo asignado`);
      return { status: 403, body: { message: 'Administrador sin complejo asignado.' } };
    }

    console.log(
      `[CONFIRMAR] Admin ${adminId} del complejo ${complejoId} intentando confirmar reserva ${reservaId}`
    );

    const reservaRef = db.collection('reservas').doc(reservaId);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      console.log(`[CONFIRMAR] ❌ Reserva ${reservaId} no encontrada`);
      return { status: 404, body: { message: 'Reserva no encontrada.' } };
    }

    const reservaData = reservaDoc.data();
    console.log(
      `[CONFIRMAR] Datos de la reserva:`,
      JSON.stringify(reservaData, null, 2)
    );

    if (reservaData.complejoId !== complejoId) {
      console.log(
        `[CONFIRMAR] ❌ Reserva ${reservaId} pertenece al complejo ${reservaData.complejoId}, admin es del complejo ${complejoId}`
      );
      return {
        status: 403,
        body: { message: 'No tienes permisos para confirmar esta reserva.' },
      };
    }

    console.log(`[CONFIRMAR] Estado actual de la reserva: ${reservaData.estado}`);

    if (
      reservaData.estado === 'Confirmada' ||
      reservaData.estado === 'confirmada'
    ) {
      console.log(
        `[CONFIRMAR] ❌ Reserva ${reservaId} ya está confirmada con estado: ${reservaData.estado}`
      );
      return {
        status: 400,
        body: { message: 'La reserva ya está confirmada.' },
      };
    }

    if (reservaData.estado === 'Cancelada' || reservaData.estado === 'cancelada') {
      console.log(
        `[CONFIRMAR] ❌ Reserva ${reservaId} está cancelada con estado: ${reservaData.estado}`
      );
      return {
        status: 400,
        body: { message: 'No se puede confirmar una reserva cancelada.' },
      };
    }

    if (
      reservaData.estado === 'Completada' ||
      reservaData.estado === 'completada'
    ) {
      console.log(
        `[CONFIRMAR] ❌ Reserva ${reservaId} está completada con estado: ${reservaData.estado}`
      );
      return {
        status: 400,
        body: { message: 'No se puede confirmar una reserva completada.' },
      };
    }

    const fechaConfirmacion = new Date();
    const updateData = {
      estado: 'Confirmada',
      confirmedAt: fechaConfirmacion,
      confirmedBy: adminId,
      updatedAt: fechaConfirmacion,
    };

    console.log(
      `[CONFIRMAR] Actualizando reserva ${reservaId} con datos:`,
      JSON.stringify(updateData, null, 2)
    );

    await reservaRef.update(updateData);

    console.log(
      `[AUDIT] ✅ Reserva ${reservaId} confirmada exitosamente por admin ${adminId} el ${fechaConfirmacion.toISOString()}`
    );

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
            console.log(
              `✅ Notificación de confirmación enviada al usuario ${reservaData.usuarioId}`
            );

            if (reservaData.fechaHora) {
              const fechaHoraReserva = new Date(reservaData.fechaHora);
              await notificationService.scheduleReminder(
                reservaId,
                reservaData.canchaNombre,
                fechaHoraReserva,
                userData.pushToken,
                reservaData.usuarioId
              );
              console.log(
                `⏰ Recordatorio programado para reserva ${reservaId}`
              );
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Error enviando notificación al usuario:', notificationError);
    }

    const reservaActualizada = await reservaRef.get();

    return {
      status: 200,
      body: {
        id: reservaId,
        ...reservaActualizada.data(),
        message: 'Reserva confirmada exitosamente.',
      },
    };
  } catch (error) {
    console.error('Error al confirmar la reserva: ', error);
    return {
      status: 500,
      body: {
        message: 'Error interno del servidor al confirmar la reserva.',
      },
    };
  }
};

// PUT /api/admin/reservas/:reservaId/cancelar
const cancelarReserva = async ({ reservaId, adminId, motivo }) => {
  try {
    console.log(
      `[CANCELAR] Iniciando cancelación de reserva ${reservaId} por admin ${adminId}`
    );

    if (!reservaId || reservaId.trim() === '') {
      console.log(`[CANCELAR] ❌ ID de reserva inválido: ${reservaId}`);
      return { status: 400, body: { message: 'ID de reserva inválido.' } };
    }

    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      console.log(`[CANCELAR] ❌ Usuario ${adminId} no es administrador`);
      return {
        status: 401,
        body: {
          message:
            'Acceso denegado. Solo administradores pueden cancelar reservas.',
        },
      };
    }

    const complejoId = adminDoc.data().complejoId;
    if (!complejoId) {
      console.log(`[CANCELAR] ❌ Admin ${adminId} sin complejo asignado`);
      return { status: 403, body: { message: 'Administrador sin complejo asignado.' } };
    }

    console.log(
      `[CANCELAR] Admin ${adminId} del complejo ${complejoId} intentando cancelar reserva ${reservaId}`
    );

    const reservaRef = db.collection('reservas').doc(reservaId);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      console.log(`[CANCELAR] ❌ Reserva ${reservaId} no encontrada`);
      return { status: 404, body: { message: 'Reserva no encontrada.' } };
    }

    const reservaData = reservaDoc.data();
    console.log(
      `[CANCELAR] Datos de la reserva:`,
      JSON.stringify(reservaData, null, 2)
    );

    if (reservaData.complejoId !== complejoId) {
      console.log(
        `[CANCELAR] ❌ Reserva ${reservaId} pertenece al complejo ${reservaData.complejoId}, admin es del complejo ${complejoId}`
      );
      return {
        status: 403,
        body: { message: 'No tienes permisos para cancelar esta reserva.' },
      };
    }

    console.log(`[CANCELAR] Estado actual de la reserva: ${reservaData.estado}`);

    if (reservaData.estado === 'Cancelada' || reservaData.estado === 'cancelada') {
      console.log(
        `[CANCELAR] ❌ Reserva ${reservaId} ya está cancelada con estado: ${reservaData.estado}`
      );
      return {
        status: 400,
        body: { message: 'La reserva ya está cancelada.' },
      };
    }

    if (
      reservaData.estado === 'Completada' ||
      reservaData.estado === 'completada'
    ) {
      console.log(
        `[CANCELAR] ❌ Reserva ${reservaId} está completada con estado: ${reservaData.estado}`
      );
      return {
        status: 400,
        body: 'No se puede cancelar una reserva completada.',
      };
    }

    const fechaCancelacion = new Date();
    const updateData = {
      estado: 'Cancelada',
      canceledAt: fechaCancelacion,
      canceledBy: adminId,
      motivo: motivo || 'Cancelada por administrador',
      updatedAt: fechaCancelacion,
    };

    console.log(
      `[CANCELAR] Actualizando reserva ${reservaId} con datos:`,
      JSON.stringify(updateData, null, 2)
    );

    await reservaRef.update(updateData);

    console.log(
      `[AUDIT] ✅ Reserva ${reservaId} cancelada exitosamente por admin ${adminId} el ${fechaCancelacion.toISOString()}`
    );

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
            console.log(
              `✅ Notificación de cancelación enviada al usuario ${reservaData.usuarioId}`
            );
          }
        }
      }
    } catch (notificationError) {
      console.error(
        'Error enviando notificación de cancelación al usuario:',
        notificationError
      );
    }

    const reservaActualizada = await reservaRef.get();

    return {
      status: 200,
      body: {
        id: reservaId,
        ...reservaActualizada.data(),
        message: 'Reserva cancelada exitosamente.',
      },
    };
  } catch (error) {
    console.error('Error al cancelar la reserva: ', error);
    return {
      status: 500,
      body: {
        message: 'Error interno del servidor al cancelar la reserva.',
      },
    };
  }
};

// GET /api/admin/reservas/:reservaId/diagnostico
const diagnosticoReserva = async ({ reservaId, adminId }) => {
  try {
    console.log(
      `[DIAGNÓSTICO] Verificando reserva ${reservaId} para admin ${adminId}`
    );

    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return {
        status: 401,
        body: { message: 'Acceso denegado. Solo administradores.' },
      };
    }

    const complejoId = adminDoc.data().complejoId;
    if (!complejoId) {
      return {
        status: 403,
        body: { message: 'Administrador sin complejo asignado.' },
      };
    }

    const reservaRef = db.collection('reservas').doc(reservaId);
    const reservaDoc = await reservaRef.get();

    if (!reservaDoc.exists) {
      return { status: 404, body: { message: 'Reserva no encontrada.' } };
    }

    const reservaData = reservaDoc.data();

    const diagnostico = {
      reservaId,
      existe: true,
      datos: reservaData,
      campos: {
        complejoId: reservaData.complejoId,
        canchaId: reservaData.canchaId,
        usuarioId: reservaData.usuarioId,
        estado: reservaData.estado,
        fecha: reservaData.fecha,
        hora: reservaData.hora,
        fechaCreacion: reservaData.fechaCreacion,
      },
      validaciones: {
        perteneceAlComplejo: reservaData.complejoId === complejoId,
        estadoActual: reservaData.estado,
        puedeCancelar: reservaData.estado === 'Confirmada',
        tieneFechaCreacion: !!reservaData.fechaCreacion,
      },
      adminInfo: {
        adminId,
        complejoId,
        role: adminDoc.data().role,
      },
    };

    console.log('[DIAGNÓSTICO] Resultado:', JSON.stringify(diagnostico, null, 2));

    return { status: 200, body: diagnostico };
  } catch (error) {
    console.error('Error en diagnóstico: ', error);
    return {
      status: 500,
      body: {
        message: 'Error interno del servidor en diagnóstico.',
        error: error.message,
      },
    };
  }
};

// GET /api/admin/perfil-complejo
const getPerfilComplejo = async ({ userId }) => {
  try {
    const adminDoc = await db.collection('users').doc(userId).get();

    if (!adminDoc.exists) {
      console.log(`[PERFIL-COMPLEJO] ❌ Usuario ${userId} no encontrado`);
      return { status: 404, body: { message: 'Usuario no encontrado.' } };
    }

    const adminData = adminDoc.data();

    if (!adminData.complejoId) {
      console.log(
        `[PERFIL-COMPLEJO] ❌ Usuario ${userId} sin complejo asignado`
      );
      return {
        status: 404,
        body: { message: 'No tienes un complejo asignado.' },
      };
    }

    const complejoId = adminData.complejoId;

    const complejoDoc = await db.collection('complejos').doc(complejoId).get();

    if (!complejoDoc.exists) {
      console.log(
        `[PERFIL-COMPLEJO] ❌ Complejo ${complejoId} no encontrado`
      );
      return { status: 404, body: { message: 'Complejo no encontrado.' } };
    }

    const complejoData = complejoDoc.data();

    console.log(
      `[PERFIL-COMPLEJO] ✅ Datos del complejo ${complejoId} obtenidos para admin ${userId}`
    );

    return {
      status: 200,
      body: {
        id: complejoDoc.id,
        nombre: complejoData.nombre || '',
        telefono: complejoData.telefono || '',
      },
    };
  } catch (error) {
    console.error('[PERFIL-COMPLEJO] Error:', error);
    return { status: 500, body: { message: 'Error interno del servidor.' } };
  }
};

module.exports = {
  getReservas,
  confirmarReserva,
  cancelarReserva,
  diagnosticoReserva,
  getPerfilComplejo,
};
