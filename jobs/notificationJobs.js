const cron = require('node-cron');
const { db } = require('../config/firebase');
const notificationService = require('../services/notifications.service');
const weatherService = require('../services/weather.service');

class NotificationJobs {
  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
  }

  // Iniciar todos los jobs programados
  static start() {
    const instance = new NotificationJobs();
    
    console.log('🚀 Iniciando sistema de jobs programados...');
    
    // Reprogramar recordatorios existentes al iniciar
    instance.reprogramarRecordatoriosAlIniciar();
    
    // Job 1: Verificar recordatorios cada hora
    const reminderJob = cron.schedule('0 * * * *', async () => {
      await instance.checkPendingReminders();
    }, {
      scheduled: false,
      timezone: 'America/Argentina/Buenos_Aires'
    });

    // Job 2: Verificar clima cada mañana a las 8 AM
    const weatherJob = cron.schedule('0 8 * * *', async () => {
      await instance.checkWeatherAlerts();
    }, {
      scheduled: false,
      timezone: 'America/Argentina/Buenos_Aires'
    });

    // Job 3: Limpieza de tokens inválidos cada domingo a las 2 AM
    const cleanupJob = cron.schedule('0 2 * * 0', async () => {
      await instance.cleanupInvalidTokens();
    }, {
      scheduled: false,
      timezone: 'America/Argentina/Buenos_Aires'
    });

    // Job 4: Verificar reservas próximas (cada 30 minutos)
    const upcomingJob = cron.schedule('*/30 * * * *', async () => {
      await instance.checkUpcomingReservas();
    }, {
      scheduled: false,
      timezone: 'America/Argentina/Buenos_Aires'
    });

    // Guardar referencias a los jobs
    instance.jobs.set('reminders', reminderJob);
    instance.jobs.set('weather', weatherJob);
    instance.jobs.set('cleanup', cleanupJob);
    instance.jobs.set('upcoming', upcomingJob);

    // Iniciar todos los j obs
    Object.values(instance.jobs).forEach(job => job.start());

    console.log('✅ Jobs programados iniciados:');
    console.log('  - Recordatorios: Cada hora (xx:00)');
    console.log('  - Clima: Todos los días a las 8:00 AM');
    console.log('  - Limpieza: Domingos a las 2:00 AM');
    console.log('  - Próximas: Cada 30 minutos');

    return instance;
  }

  // Detener todos los jobs
  stop() {
    console.log('🛑 Deteniendo jobs programados...');
    Object.values(this.jobs).forEach(job => job.stop());
    this.jobs.clear();
    console.log('✅ Todos los jobs detenidos');
  }

  // Verificar recordatorios pendientes (próximas 2 horas)
  async checkPendingReminders() {
    if (this.isRunning) {
      console.log('⏳ Job de recordatorios ya en ejecución, omitiendo...');
      return;
    }

    this.isRunning = true;
    try {
      console.log('🔍 Verificando recordatorios pendientes...');
      
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);

      // Buscar reservas en las próximas 2 horas que no tengan recordatorio enviado
      const reservasSnapshot = await db.collection('reservas')
        .where('fechaHora', '>=', now.toISOString())
        .where('fechaHora', '<=', twoHoursFromNow.toISOString())
        .where('estado', '==', 'confirmada')
        .get();

      let remindersSent = 0;

      for (const doc of reservasSnapshot.docs) {
        const reserva = doc.data();
        
        // Verificar si ya se envió el recordatorio
        if (reserva.reminderSent) {
          continue;
        }

        try {
          // Obtener información del usuario
          const userDoc = await db.collection('users').doc(reserva.usuarioId).get();
          if (!userDoc.exists) continue;

          const user = userDoc.data();

          // Verificar preferencias de notificaciones
          const canReceive = await notificationService.canUserReceiveNotification(
            reserva.usuarioId, 
            'reminders'
          );

          if (canReceive && user.pushToken) {
            await notificationService.sendNotification(
              user.pushToken,
              '⏰ Recordatorio de Reserva',
              `Tu reserva en ${reserva.canchaNombre} es en las próximas 2 horas`,
              {
                type: 'reminder',
                reservaId: doc.id,
                canchaNombre: reserva.canchaNombre,
                fecha: reserva.fecha,
                hora: reserva.hora,
              },
              reserva.usuarioId
            );

            // Marcar recordatorio como enviado
            await db.collection('reservas').doc(doc.id).update({
              reminderSent: true,
              reminderSentAt: new Date().toISOString(),
            });

            remindersSent++;
            console.log(`⏰ Recordatorio enviado para reserva ${doc.id}`);
          }
        } catch (error) {
          console.error(`Error enviando recordatorio para reserva ${doc.id}:`, error.message);
        }
      }

      console.log(`✅ Verificación de recordatorios completada. ${remindersSent} recordatorios enviados`);
    } catch (error) {
      console.error('Error en job de recordatorios:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Verificar alertas climáticas
  async checkWeatherAlerts() {
    try {
      console.log('🌤️ Verificando alertas climáticas...');
      const result = await weatherService.checkWeatherForReservas();
      console.log(`✅ Verificación climática completada: ${result.processed} reservas procesadas, ${result.alerts} alertas enviadas`);
    } catch (error) {
      console.error('Error en job de clima:', error);
    }
  }

  // Limpieza de tokens inválidos
  async cleanupInvalidTokens() {
    try {
      console.log('🧹 Iniciando limpieza de tokens inválidos...');
      
      // Buscar usuarios con tokens que podrían ser inválidos
      const usersSnapshot = await db.collection('users')
        .where('pushToken', '!=', null)
        .get();

      let cleaned = 0;

      for (const doc of usersSnapshot.docs) {
        const user = doc.data();
        
        // Si el token no tiene el formato de Expo, removerlo
        if (user.pushToken && !user.pushToken.startsWith('ExponentPushToken')) {
          await db.collection('users').doc(doc.id).update({
            pushToken: null,
            tokenCleanedAt: new Date().toISOString(),
          });
          cleaned++;
          console.log(`🧹 Token inválido removido para usuario ${doc.id}`);
        }
      }

      console.log(`✅ Limpieza completada. ${cleaned} tokens removidos`);
    } catch (error) {
      console.error('Error en job de limpieza:', error);
    }
  }

  // Verificar reservas próximas (para notificaciones inmediatas)
  async checkUpcomingReservas() {
    try {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      const reservasSnapshot = await db.collection('reservas')
        .where('fechaHora', '>=', now.toISOString())
        .where('fechaHora', '<=', thirtyMinutesFromNow.toISOString())
        .where('estado', '==', 'confirmada')
        .where('imminentNotificationSent', '==', false)
        .get();

      for (const doc of reservasSnapshot.docs) {
        const reserva = doc.data();
        
        try {
          const userDoc = await db.collection('users').doc(reserva.usuarioId).get();
          if (!userDoc.exists) continue;

          const user = userDoc.data();
          const canReceive = await notificationService.canUserReceiveNotification(
            reserva.usuarioId, 
            'reminders'
          );

          if (canReceive && user.pushToken) {
            await notificationService.sendNotification(
              user.pushToken,
              '🏸 ¡Tu reserva es pronto!',
              `Tu reserva en ${reserva.canchaNombre} comienza en menos de 30 minutos`,
              {
                type: 'imminent',
                reservaId: doc.id,
                canchaNombre: reserva.canchaNombre,
              },
              reserva.usuarioId
            );

            await db.collection('reservas').doc(doc.id).update({
              imminentNotificationSent: true,
              imminentNotificationSentAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`Error enviando notificación inminente para reserva ${doc.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error en job de reservas próximas:', error);
    }
  }

  // Obtener estadísticas de los jobs
  getStats() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      timezone: 'America/Argentina/Buenos_Aires',
    };
  }

  // Ejecutar un job manualmente (para testing)
  async runJobManually(jobName) {
    console.log(`🔧 Ejecutando job "${jobName}" manualmente...`);
    
    switch (jobName) {
      case 'reminders':
        await this.checkPendingReminders();
        break;
      case 'weather':
        await this.checkWeatherAlerts();
        break;
      case 'cleanup':
        await this.cleanupInvalidTokens();
        break;
      case 'upcoming':
        await this.checkUpcomingReservas();
        break;
      default:
        throw new Error(`Job "${jobName}" no encontrado`);
    }
    
    console.log(`✅ Job "${jobName}" ejecutado manualmente`);
  }

  // Reprogramar recordatorios al iniciar el servidor
  async reprogramarRecordatoriosAlIniciar() {
    try {
      console.log('🔄 Reprogramando recordatorios existentes...');
      
      const now = new Date();
      const dosDiasAdelante = new Date(now.getTime() + (48 * 60 * 60 * 1000));
      
      // Obtener reservas confirmadas (solo filtro por estado para evitar error de índice)
      const reservasSnapshot = await db.collection('reservas')
        .where('estado', '==', 'confirmada')
        .get();
      
      let reprogramadas = 0;
      
      for (const doc of reservasSnapshot.docs) {
        const reserva = doc.data();
        
        try {
          // Filtrar por fecha en memoria (en próximas 48 horas)
          if (!reserva.fechaHora) continue;
          
          const fechaHoraReserva = new Date(reserva.fechaHora);
          if (fechaHoraReserva <= now || fechaHoraReserva > dosDiasAdelante) {
            continue;
          }
          
          // Verificar si ya se envió el recordatorio
          if (reserva.reminderSent) {
            continue;
          }
          
          // Obtener información del usuario
          const userDoc = await db.collection('users').doc(reserva.usuarioId).get();
          if (!userDoc.exists) continue;
          
          const userData = userDoc.data();
          
          // Verificar que tenga push token y preferencias habilitadas
          const canReceive = await notificationService.canUserReceiveNotification(
            reserva.usuarioId, 
            'reminders'
          );
          
          if (canReceive && userData.pushToken) {
            // Reprogramar recordatorio
            await notificationService.scheduleReminder(
              doc.id,
              reserva.canchaNombre,
              fechaHoraReserva,
              userData.pushToken,
              reserva.usuarioId
            );
            
            reprogramadas++;
          }
        } catch (error) {
          console.error(`Error reprogramando recordatorio para reserva ${doc.id}:`, error.message);
        }
      }
      
      console.log(`✅ ${reprogramadas} recordatorios reprogramados exitosamente`);
      
    } catch (error) {
      console.error('❌ Error reprogramando recordatorios al iniciar:', error);
    }
  }
}

module.exports = NotificationJobs;
