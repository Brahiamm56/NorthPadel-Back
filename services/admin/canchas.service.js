const { db, admin } = require('../../config/firebase');
const { getUserById } = require('../../repositories/users.repository');
const { getComplejoById } = require('../../repositories/complejos.repository');

// Helpers internos
const getAdminWithComplejo = async (adminId) => {
  const adminRecord = await getUserById(adminId);
  if (!adminRecord) return null;
  const adminData = adminRecord.data;
  if (!adminData.complejoId) return null;
  return { adminData, complejoId: adminData.complejoId };
};

// GET /api/admin/canchas
const getCanchas = async ({ adminId }) => {
  const adminWithComplejo = await getAdminWithComplejo(adminId);
  if (!adminWithComplejo) {
    return {
      status: 403,
      body: { message: 'Administrador no válido o sin complejo asignado.' },
    };
  }

  const { complejoId } = adminWithComplejo;
  const complejoDoc = await getComplejoById(complejoId);
  if (!complejoDoc.exists) {
    return {
      status: 404,
      body: { message: 'Complejo no encontrado.' },
    };
  }

  const canchas = complejoDoc.data().canchas || [];
  return {
    status: 200,
    body: canchas,
  };
};

// POST /api/admin/canchas
const createCancha = async ({
  adminId,
  nombre,
  precioHora,
  imagenUrl,
  descripcion,
  esTechada,
  vendePelotitas,
  horaInicio,
  horaFin,
}) => {
  if (!nombre || !precioHora || !imagenUrl) {
    return {
      status: 400,
      body: { message: 'Nombre, precio e imagen son requeridos.' },
    };
  }

  const adminWithComplejo = await getAdminWithComplejo(adminId);
  if (!adminWithComplejo) {
    return {
      status: 403,
      body: { message: 'Administrador no válido o sin complejo asignado.' },
    };
  }

  const { complejoId } = adminWithComplejo;
  const complejoRef = db.collection('complejos').doc(complejoId);

  const nuevaCancha = {
    id: `cancha-${Date.now()}`,
    nombre,
    precioHora,
    imagenUrl,
    descripcion: descripcion || '',
    esTechada: esTechada || false,
    vendePelotitas: vendePelotitas || false,
    horaInicio: horaInicio || '08:00',
    horaFin: horaFin || '23:00',
    activa: true,
  };

  await complejoRef.update({
    canchas: admin.firestore.FieldValue.arrayUnion(nuevaCancha),
  });

  return {
    status: 201,
    body: { message: 'Cancha creada exitosamente', cancha: nuevaCancha },
  };
};

// PUT /api/admin/canchas/:canchaId
const updateCancha = async ({ adminId, canchaId, datosActualizados }) => {
  if (!datosActualizados || Object.keys(datosActualizados).length === 0) {
    return {
      status: 400,
      body: { message: 'Debe proporcionar al menos un campo para actualizar.' },
    };
  }

  const adminWithComplejo = await getAdminWithComplejo(adminId);
  if (!adminWithComplejo) {
    return {
      status: 403,
      body: { message: 'Administrador no válido o sin complejo asignado.' },
    };
  }

  const { complejoId } = adminWithComplejo;
  const complejoRef = db.collection('complejos').doc(complejoId);
  const complejoDoc = await complejoRef.get();

  if (!complejoDoc.exists) {
    return {
      status: 404,
      body: { message: 'Complejo no encontrado.' },
    };
  }

  const complejoData = complejoDoc.data();
  const canchasActuales = complejoData.canchas || [];

  const canchaExiste = canchasActuales.some((cancha) => cancha.id === canchaId);
  if (!canchaExiste) {
    return {
      status: 404,
      body: { message: 'Cancha no encontrada en el complejo.' },
    };
  }

  const canchasActualizadas = canchasActuales.map((cancha) =>
    cancha.id === canchaId ? { ...cancha, ...datosActualizados } : cancha,
  );

  await complejoRef.update({ canchas: canchasActualizadas });

  const canchaActualizada = canchasActualizadas.find((cancha) => cancha.id === canchaId);

  return {
    status: 200,
    body: { message: 'Cancha actualizada exitosamente', cancha: canchaActualizada },
  };
};

// DELETE /api/admin/canchas/:canchaId
const deleteCancha = async ({ adminId, canchaId }) => {
  const adminWithComplejo = await getAdminWithComplejo(adminId);
  if (!adminWithComplejo) {
    return {
      status: 403,
      body: { message: 'Administrador no válido o sin complejo asignado.' },
    };
  }

  const { complejoId } = adminWithComplejo;
  const complejoRef = db.collection('complejos').doc(complejoId);
  const complejoDoc = await complejoRef.get();

  if (!complejoDoc.exists) {
    return {
      status: 404,
      body: { message: 'Complejo no encontrado.' },
    };
  }

  const complejoData = complejoDoc.data();
  const canchasActuales = complejoData.canchas || [];

  const canchaAEliminar = canchasActuales.find((cancha) => cancha.id === canchaId);
  if (!canchaAEliminar) {
    return {
      status: 404,
      body: { message: 'Cancha no encontrada en el complejo.' },
    };
  }

  await complejoRef.update({
    canchas: admin.firestore.FieldValue.arrayRemove(canchaAEliminar),
  });

  return {
    status: 200,
    body: {
      message: 'Cancha eliminada exitosamente',
      canchaId,
    },
  };
};

// PUT /api/admin/canchas/:canchaId/toggle-status
const toggleCanchaStatus = async ({ adminId, canchaId, activa }) => {
  const adminWithComplejo = await getAdminWithComplejo(adminId);
  if (!adminWithComplejo) {
    return {
      status: 403,
      body: { message: 'Admin sin complejo asignado.' },
    };
  }

  const { complejoId } = adminWithComplejo;
  const complejoRef = db.collection('complejos').doc(complejoId);
  const complejoDoc = await complejoRef.get();

  if (!complejoDoc.exists) {
    return {
      status: 404,
      body: { message: 'Complejo no encontrado.' },
    };
  }

  const complejoData = complejoDoc.data();
  const canchasActuales = complejoData.canchas || [];

  const canchasActualizadas = canchasActuales.map((cancha) =>
    cancha.id === canchaId ? { ...cancha, activa } : cancha,
  );

  await complejoRef.update({ canchas: canchasActualizadas });

  return {
    status: 200,
    body: { message: 'Estado de la cancha actualizado exitosamente.' },
  };
};

// PATCH /api/admin/canchas/:canchaId
const patchCanchaActiva = async ({ adminId, canchaId, activa }) => {
  if (typeof activa !== 'boolean') {
    return {
      status: 400,
      body: {
        message: 'El campo activa debe ser un valor booleano (true/false)',
      },
    };
  }

  const adminRecord = await getUserById(adminId);
  if (!adminRecord || adminRecord.data.role !== 'admin') {
    return {
      status: 403,
      body: { message: 'Acceso denegado. Se requiere rol de administrador.' },
    };
  }

  const adminData = adminRecord.data;
  const complejoId = adminData.complejoId;
  if (!complejoId) {
    return {
      status: 403,
      body: { message: 'Administrador sin complejo asignado.' },
    };
  }

  const complejoRef = db.collection('complejos').doc(complejoId);
  const complejoDoc = await complejoRef.get();

  if (!complejoDoc.exists) {
    return {
      status: 404,
      body: { message: 'Complejo no encontrado.' },
    };
  }

  const complejoData = complejoDoc.data();
  const canchasActuales = complejoData.canchas || [];

  const canchaIndex = canchasActuales.findIndex((cancha) => cancha.id === canchaId);
  if (canchaIndex === -1) {
    return {
      status: 404,
      body: { message: 'Cancha no encontrada' },
    };
  }

  const canchasActualizadas = canchasActuales.map((cancha, index) =>
    index === canchaIndex
      ? { ...cancha, activa, updatedAt: new Date().toISOString() }
      : cancha,
  );

  await complejoRef.update({ canchas: canchasActualizadas });

  const canchaActualizada = canchasActualizadas[canchaIndex];

  return {
    status: 200,
    body: {
      id: canchaActualizada.id,
      ...canchaActualizada,
    },
  };
};

// POST /api/admin/canchas/:canchaId/bloquear
const bloquearHorario = async ({ adminId, canchaId, fecha, hora }) => {
  if (!fecha || !hora) {
    return {
      status: 400,
      body: { message: 'Fecha y hora son requeridos.' },
    };
  }

  const adminWithComplejo = await getAdminWithComplejo(adminId);
  if (!adminWithComplejo) {
    return {
      status: 403,
      body: { message: 'Administrador no válido o sin complejo asignado.' },
    };
  }

  const { complejoId } = adminWithComplejo;
  const complejoRef = db.collection('complejos').doc(complejoId);
  const complejoDoc = await complejoRef.get();

  if (!complejoDoc.exists) {
    return {
      status: 404,
      body: { message: 'Complejo no encontrado.' },
    };
  }

  const complejoData = complejoDoc.data();
  const canchasActuales = complejoData.canchas || [];

  const canchaIndex = canchasActuales.findIndex((c) => c.id === canchaId);
  if (canchaIndex === -1) {
    return {
      status: 404,
      body: { message: 'Cancha no encontrada en el complejo.' },
    };
  }

  const canchasActualizadas = canchasActuales.map((cancha, index) => {
    if (index === canchaIndex) {
      const bloqueosActuales = cancha.bloqueos || [];
      const yaExiste = bloqueosActuales.some(
        (b) => b.fecha === fecha && b.hora === hora,
      );
      if (yaExiste) return cancha;
      return {
        ...cancha,
        bloqueos: [...bloqueosActuales, { fecha, hora }],
      };
    }
    return cancha;
  });

  await complejoRef.update({ canchas: canchasActualizadas });

  return {
    status: 200,
    body: {
      message: 'Horario bloqueado exitosamente',
      fecha,
      hora,
    },
  };
};

// POST /api/admin/canchas/:canchaId/desbloquear
const desbloquearHorario = async ({ adminId, canchaId, fecha, hora }) => {
  if (!fecha || !hora) {
    return {
      status: 400,
      body: { message: 'Fecha y hora son requeridos.' },
    };
  }

  const adminWithComplejo = await getAdminWithComplejo(adminId);
  if (!adminWithComplejo) {
    return {
      status: 403,
      body: { message: 'Administrador no válido o sin complejo asignado.' },
    };
  }

  const { complejoId } = adminWithComplejo;
  const complejoRef = db.collection('complejos').doc(complejoId);
  const complejoDoc = await complejoRef.get();

  if (!complejoDoc.exists) {
    return {
      status: 404,
      body: { message: 'Complejo no encontrado.' },
    };
  }

  const complejoData = complejoDoc.data();
  const canchasActuales = complejoData.canchas || [];

  const canchaIndex = canchasActuales.findIndex((c) => c.id === canchaId);
  if (canchaIndex === -1) {
    return {
      status: 404,
      body: { message: 'Cancha no encontrada en el complejo.' },
    };
  }

  const canchasActualizadas = canchasActuales.map((cancha, index) => {
    if (index === canchaIndex) {
      const bloqueosActuales = cancha.bloqueos || [];
      const bloqueosActualizados = bloqueosActuales.filter(
        (b) => !(b.fecha === fecha && b.hora === hora),
      );
      return {
        ...cancha,
        bloqueos: bloqueosActualizados,
      };
    }
    return cancha;
  });

  await complejoRef.update({ canchas: canchasActualizadas });

  return {
    status: 200,
    body: {
      message: 'Horario desbloqueado exitosamente',
      fecha,
      hora,
    },
  };
};

// GET /api/admin/canchas/:canchaId/disponibilidad
const getDisponibilidadCancha = async ({ adminId, canchaId, fecha }) => {
  try {
    const adminWithComplejo = await getAdminWithComplejo(adminId);
    if (!adminWithComplejo) {
      return {
        status: 403,
        body: {
          message: 'Administrador no válido o sin complejo asignado.',
        },
      };
    }

    const { complejoId } = adminWithComplejo;

    if (!canchaId) {
      return {
        status: 400,
        body: { message: 'El ID de la cancha es requerido.' },
      };
    }

    if (!fecha) {
      return {
        status: 400,
        body: { message: 'La fecha es requerida (formato YYYY-MM-DD).' },
      };
    }

    // 1. Reservas confirmadas
    const reservasSnapshot = await db
      .collection('reservas')
      .where('complejoId', '==', complejoId)
      .where('canchaId', '==', canchaId)
      .where('fecha', '==', fecha)
      .where('estado', '==', 'Confirmada')
      .get();

    const horariosReservados = [];
    if (!reservasSnapshot.empty) {
      reservasSnapshot.forEach((doc) => {
        const reservaData = doc.data();
        if (reservaData.hora) {
          horariosReservados.push(reservaData.hora);
        }
      });
    }

    // 2. Bloqueos de la cancha
    const complejoDoc = await getComplejoById(complejoId);
    let horariosBloqueados = [];

    if (complejoDoc.exists) {
      const complejoData = complejoDoc.data();
      const cancha = complejoData.canchas?.find((c) => c.id === canchaId);

      if (cancha && cancha.bloqueos) {
        horariosBloqueados = cancha.bloqueos
          .filter((bloqueo) => bloqueo.fecha === fecha)
          .map((bloqueo) => bloqueo.hora);
      }
    }

    return {
      status: 200,
      body: {
        horariosReservados,
        horariosBloqueados,
      },
    };
  } catch (error) {
    console.error('Error al obtener disponibilidad de la cancha: ', error);
    return {
      status: 500,
      body: { message: 'Error interno del servidor.' },
    };
  }
};

module.exports = {
  getCanchas,
  createCancha,
  updateCancha,
  deleteCancha,
  toggleCanchaStatus,
  patchCanchaActiva,
  bloquearHorario,
  desbloquearHorario,
  getDisponibilidadCancha,
};
