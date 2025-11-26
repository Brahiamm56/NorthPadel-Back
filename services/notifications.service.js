const { Expo } = require('expo-server-sdk');
const { db } = require('../config/firebase');

class NotificationService {
  constructor() {
    this.expo = new Expo();
    this.retryAttempts = 3;
    this.rateLimitMap = new Map(); // Para rate limiting por usuario
  }

  // Verificar rate limiting (máximo 1 notificación por minuto por usuario)
  checkRateLimit(userId) {
    const now = Date.now();
    const lastSent = this.rateLimitMap.get(userId);
    
    if (lastSent && (now - lastSent) < 60000) { // 1 minuto
      return false;
    }
    
    this.rateLimitMap.set(userId, now);
    return true;
  }

  // Enviar notificación a un usuario específico con reintentos
  async sendNotification(userPushToken, title, body, data = {}, userId = null) {
    try {
      // Rate limiting
      if (userId && !this.checkRateLimit(userId)) {
        console.log(`Rate limit excedido para usuario ${userId}`);
        return { success: false, reason: 'rate_limit_exceeded' };
      }

      // Validar token
      if (!Expo.isExpoPushToken(userPushToken)) {
        console.error('Token inválido:', userPushToken);
        return { success: false, reason: 'invalid_token' };
      }

      const message = {
        to: userPushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      };

      let attempts = 0;
      let lastError = null;

      while (attempts < this.retryAttempts) {
        try {
          const tickets = await this.expo.sendPushNotificationsAsync([message]);
          
          // Procesar resultados
          for (const ticket of tickets) {
            if (ticket.status === 'error') {
              console.error('Error en notificación:', ticket.message);
              
              // Si el token es inválido, removerlo de la base de datos
              if (ticket.details?.error === 'DeviceNotRegistered') {
                await this.removeInvalidToken(userPushToken);
              }
              
              lastError = ticket.message;
            } else {
              console.log('✅ Notificación enviada exitosamente');
              return { success: true, ticket };
            }
          }
          
          attempts++;
          if (attempts < this.retryAttempts) {
            // Esperar antes de reintentar (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          }
        } catch (error) {
          lastError = error.message;
          attempts++;
          if (attempts < this.retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          }
        }
      }

      console.error('❌ No se pudo enviar notificación después de', this.retryAttempts, 'intentos');
      return { success: false, error: lastError };

    } catch (error) {
      console.error('Error enviando notificación:', error);
      throw error;
    }
  }

  // Enviar notificación a múltiples usuarios en lotes
  async sendNotifications(userPushTokens, title, body, data = {}) {
    const results = [];
    const chunks = this.chunkArray(userPushTokens, 100); // Expo permite máximo 100 por chunk

    for (const chunk of chunks) {
      const messages = chunk.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      }));

      try {
        const tickets = await this.expo.sendPushNotificationsAsync(messages);
        results.push(...tickets);
      } catch (error) {
        console.error('Error enviando lote de notificaciones:', error);
      }
    }

    return results;
  }

  // Programar recordatorio (2 horas antes)
  async scheduleReminder(reservaId, canchaNombre, fechaHora, userPushToken, userId) {
    try {
      const reminderTime = new Date(fechaHora);
      reminderTime.setHours(reminderTime.getHours() - 2);

      const now = new Date();
      if (reminderTime <= now) {
        console.log('El recordatorio ya pasó o es muy pronto');
        return;
      }

      const delay = reminderTime - now;

      setTimeout(async () => {
        try {
          // Verificar que la reserva aún existe y no fue cancelada
          const reservaDoc = await db.collection('reservas').doc(reservaId).get();
          if (!reservaDoc.exists || reservaDoc.data().estado === 'cancelada') {
            console.log('Reserva cancelada o no existe, omitiendo recordatorio');
            return;
          }

          await this.sendNotification(
            userPushToken,
            '⏰ Recordatorio de Reserva',
            `Tu reserva en ${canchaNombre} es en 2 horas`,
            {
              type: 'reminder',
              reservaId,
              canchaNombre,
            },
            userId
          );
        } catch (error) {
          console.error('Error enviando recordatorio programado:', error);
        }
      }, delay);

      console.log(`✅ Recordatorio programado para ${reminderTime.toISOString()}`);
    } catch (error) {
      console.error('Error programando recordatorio:', error);
    }
  }

  // Enviar confirmación de reserva
  async sendReservaConfirmation(userPushToken, reservaData, userId) {
    const { canchaNombre, fecha, hora, id } = reservaData;
    
    return await this.sendNotification(
      userPushToken,
      '✅ Reserva Confirmada',
      `Tu reserva en ${canchaNombre} para el ${fecha} a las ${hora} ha sido confirmada`,
      {
        type: 'reserva_confirmation',
        reservaId: id,
        canchaNombre,
        fecha,
        hora,
      },
      userId
    );
  }

  // Enviar alerta de clima
  async sendWeatherAlert(userPushToken, canchaNombre, fecha, condicion, userId) {
    return await this.sendNotification(
      userPushToken,
      '🌧️ Alerta Climática',
      `Pronóstico de ${condicion} para ${fecha}. Considera reprogramar tu reserva en ${canchaNombre}`,
      {
        type: 'weather_alert',
        canchaNombre,
        fecha,
        condicion,
      },
      userId
    );
  }

  // Enviar notificación de cancelación
  async sendReservaCancellation(userPushToken, reservaData, userId) {
    const { canchaNombre, fecha, hora } = reservaData;
    
    return await this.sendNotification(
      userPushToken,
      '❌ Reserva Cancelada',
      `Tu reserva en ${canchaNombre} para el ${fecha} a las ${hora} ha sido cancelada`,
      {
        type: 'reserva_cancellation',
        canchaNombre,
        fecha,
        hora,
      },
      userId
    );
  }

  // Remover token inválido de la base de datos
  async removeInvalidToken(pushToken) {
    try {
      const usersSnapshot = await db.collection('users')
        .where('pushToken', '==', pushToken)
        .get();

      const batch = db.batch();
      usersSnapshot.forEach(doc => {
        batch.update(doc.ref, { pushToken: null });
      });

      await batch.commit();
      console.log('✅ Token inválido removido de', usersSnapshot.size, 'usuarios');
    } catch (error) {
      console.error('Error removiendo token inválido:', error);
    }
  }

  // Obtener preferencias de notificaciones de un usuario
  async getUserPreferences(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      return {
        notificationsEnabled: userData.notificationsEnabled !== false, // Por defecto true
        preferences: userData.notificationPreferences || {
          reminders: true,
          confirmations: true,
          weatherAlerts: true,
        }
      };
    } catch (error) {
      console.error('Error obteniendo preferencias del usuario:', error);
      return null;
    }
  }

  // Verificar si un usuario puede recibir notificaciones
  async canUserReceiveNotification(userId, notificationType) {
    const preferences = await this.getUserPreferences(userId);
    if (!preferences) return false;
    
    return preferences.notificationsEnabled && 
           preferences.preferences[notificationType] !== false;
  }

  // Utilidad para dividir arrays en chunks
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = new NotificationService();
