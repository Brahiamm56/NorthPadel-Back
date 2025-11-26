const { getReservaById, updateReservaById } = require('../../repositories/reservas.repository');
const { getUserById } = require('../../repositories/users.repository');
const notificationService = require('../notifications.service');

// Servicio: confirmar reserva (usuario admin en reservas.js)
const confirmReservaService = async ({ id, usuarioId }) => {
  const userRecord = await getUserById(usuarioId);
  const userData = userRecord && userRecord.data ? userRecord.data : null;

  if (!userData || userData.role !== 'admin') {
    return {
      status: 403,
      body: {
        message: 'No autorizado. Solo administradores pueden confirmar reservas.',
      },
    };
  }

  const reservaDoc = await getReservaById(id);
  if (!reservaDoc.exists) {
    return {
      status: 404,
      body: { message: 'Reserva no encontrada.' },
    };
  }

  const reservaData = reservaDoc.data();

  if (reservaData.estado === 'confirmada') {
    return {
      status: 400,
      body: { message: 'La reserva ya está confirmada.' },
    };
  }

  await updateReservaById(id, {
    estado: 'confirmada',
    updatedAt: new Date(),
    confirmedAt: new Date().toISOString(),
  });

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
        await notificationService.sendReservaConfirmation(
          reservaUserData.pushToken,
          {
            id,
            canchaNombre: reservaData.canchaNombre,
            fecha: reservaData.fecha,
            hora: reservaData.hora,
          },
          reservaData.usuarioId,
        );
        console.log(`✅ Notificación de confirmación enviada para reserva ${id}`);

        const fechaHoraReserva = new Date(`${reservaData.fecha}T${reservaData.hora}`);
        await notificationService.scheduleReminder(
          id,
          reservaData.canchaNombre,
          fechaHoraReserva,
          reservaUserData.pushToken,
          reservaData.usuarioId,
        );
      }
    }
  } catch (notificationError) {
    console.error('Error enviando notificación de confirmación:', notificationError);
  }

  return {
    status: 200,
    body: {
      message: 'Reserva confirmada exitosamente.',
      reserva: {
        id,
        ...reservaData,
        estado: 'confirmada',
        updatedAt: new Date(),
      },
    },
  };
};

module.exports = {
  confirmReservaService,
};
