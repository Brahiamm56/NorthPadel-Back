const { db } = require('../../config/firebase');
const { getComplejoById } = require('../../repositories/complejos.repository');
const { createReserva } = require('../../repositories/reservas.repository');
const { getUserById } = require('../../repositories/users.repository');
const notificationService = require('../notifications.service');

// Servicio: crear una nueva reserva
const createReservaService = async ({
  usuarioId,
  complejoId,
  canchaId,
  fecha,
  hora,
  estado,
}) => {
  console.log(`[POST /api/reservas] Intentando crear reserva para usuarioId: ${usuarioId}`);
  console.log(`[POST /api/reservas] Datos: cancha=${canchaId}, fecha=${fecha}, hora=${hora}`);

  if (!complejoId || !canchaId || !fecha || !hora) {
    return {
      status: 400,
      body: {
        message: 'Faltan datos requeridos: complejoId, canchaId, fecha, hora',
      },
    };
  }

  // Obtener información del complejo y la cancha
  const complejoDoc = await getComplejoById(complejoId);
  if (!complejoDoc.exists) {
    return {
      status: 404,
      body: { message: 'Complejo no encontrado.' },
    };
  }

  const complejoData = complejoDoc.data();
  const cancha = complejoData.canchas?.find((c) => c.id === canchaId);

  if (!cancha) {
    return {
      status: 404,
      body: { message: 'Cancha no encontrada.' },
    };
  }

  // Verificar disponibilidad: solo bloquear si hay reservas CONFIRMADAS
  const reservasConfirmadasQuery = db
    .collection('reservas')
    .where('canchaId', '==', canchaId)
    .where('fecha', '==', fecha)
    .where('hora', '==', hora)
    .where('estado', '==', 'Confirmada');

  const reservasConfirmadas = await reservasConfirmadasQuery.get();

  if (!reservasConfirmadas.empty) {
    console.log(`[POST /api/reservas] ❌ Horario ya ocupado por reserva confirmada`);
    return {
      status: 409,
      body: {
        message: 'Este horario ya está reservado. Por favor, elige otro.',
      },
    };
  }

  // Obtener información del usuario
  const userRecord = await getUserById(usuarioId);
  const userData = userRecord && userRecord.data ? userRecord.data : {};

  const nuevaReserva = {
    complejoId,
    canchaId,
    canchaNombre: cancha.nombre,
    canchaImagenUrl: cancha.imagenUrl || null,
    fecha,
    hora,
    fechaHora: new Date(`${fecha}T${hora}`),
    estado: estado || 'Pendiente',
    usuarioId,
    usuarioNombre: userData.nombre || 'Usuario',
    usuarioEmail: userData.email || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    reminderSent: false,
    imminentNotificationSent: false,
  };

  const docRef = await createReserva(nuevaReserva);

  console.log(
    `[POST /api/reservas] ✅ Reserva creada con ID: ${docRef.id} - Estado: ${nuevaReserva.estado}`,
  );

  // Notificaciones (se mantiene la misma lógica, con try/catch internos)
  try {
    const adminsSnapshot = await db
      .collection('users')
      .where('role', '==', 'admin')
      .where('complejoId', '==', complejoId)
      .get();

    if (!adminsSnapshot.empty) {
      const adminDoc = adminsSnapshot.docs[0];
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
          adminDoc.id,
        );
        console.log(
          `✅ Notificación enviada al admin ${adminDoc.id} sobre nueva reserva ${docRef.id}`,
        );
      }
    }
  } catch (notificationError) {
    console.error('Error enviando notificación al admin:', notificationError);
  }

  if (nuevaReserva.estado === 'confirmada' && userData.pushToken) {
    try {
      const canReceive = await notificationService.canUserReceiveNotification(
        usuarioId,
        'confirmations',
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
          usuarioId,
        );
        console.log(`✅ Notificación de confirmación enviada para reserva ${docRef.id}`);

        const fechaHoraReserva = new Date(`${fecha}T${hora}`);
        await notificationService.scheduleReminder(
          docRef.id,
          cancha.nombre,
          fechaHoraReserva,
          userData.pushToken,
          usuarioId,
        );
      }
    } catch (notificationError) {
      console.error('Error enviando notificación de confirmación:', notificationError);
    }
  }

  return {
    status: 201,
    body: {
      id: docRef.id,
      ...nuevaReserva,
      message: 'Reserva creada exitosamente. Pendiente de confirmación del administrador.',
    },
  };
};

module.exports = {
  createReservaService,
};
