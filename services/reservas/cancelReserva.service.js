const { getReservaById, updateReservaById } = require('../../repositories/reservas.repository');
const { getUserById } = require('../../repositories/users.repository');
const notificationService = require('../notifications.service');

// Servicio: cancelar reserva (usuario dueño o admin)
const cancelReservaService = async ({ id, usuarioId }) => {
  const reservaDoc = await getReservaById(id);
  if (!reservaDoc.exists) {
    return {
      status: 404,
      body: { message: 'Reserva no encontrada.' },
    };
  }

  const reservaData = reservaDoc.data();

  const userRecord = await getUserById(usuarioId);
  const userData = userRecord && userRecord.data ? userRecord.data : null;

  if (!userData) {
    return {
      status: 404,
      body: { message: 'Usuario no encontrado.' },
    };
  }

  if (reservaData.usuarioId !== usuarioId && userData.role !== 'admin') {
    return {
      status: 403,
      body: { message: 'No autorizado para cancelar esta reserva.' },
    };
  }

  if (reservaData.estado === 'cancelada') {
    return {
      status: 400,
      body: { message: 'La reserva ya está cancelada.' },
    };
  }

  await updateReservaById(id, {
    estado: 'cancelada',
    updatedAt: new Date(),
    cancelledAt: new Date().toISOString(),
  });

  if (reservaData.usuarioId !== usuarioId) {
    try {
      const reservaUserRecord = await getUserById(reservaData.usuarioId);
      const reservaUserData = reservaUserRecord && reservaUserRecord.data
        ? reservaUserRecord.data
        : null;

      if (reservaUserData && reservaUserData.pushToken) {
        const canReceive = await notificationService.canUserReceiveNotification(
          reservaData.usuarioId,
          'confirmations',
        );

        if (canReceive) {
          await notificationService.sendReservaCancellation(
            reservaUserData.pushToken,
            {
              canchaNombre: reservaData.canchaNombre,
              fecha: reservaData.fecha,
              hora: reservaData.hora,
            },
            reservaData.usuarioId,
          );
          console.log(`✅ Notificación de cancelación enviada para reserva ${id}`);
        }
      }
    } catch (notificationError) {
      console.error('Error enviando notificación de cancelación:', notificationError);
    }
  }

  return {
    status: 200,
    body: {
      message: 'Reserva cancelada exitosamente.',
      reserva: {
        id,
        ...reservaData,
        estado: 'cancelada',
        updatedAt: new Date(),
      },
    },
  };
};

module.exports = {
  cancelReservaService,
};
