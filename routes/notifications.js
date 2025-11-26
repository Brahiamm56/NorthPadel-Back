const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const notificationService = require('../services/notifications.service');
const weatherService = require('../services/weather.service');
const NotificationJobs = require('../jobs/notificationJobs');
const { protect } = require('../middlewares/authMiddleware');
const {
  validatePushToken,
  validateNotificationPreferences,
  validateTestNotification,
  validateTokenRegistration,
  checkNotificationsEnabled,
  validateUserExists,
  testNotificationRateLimit,
} = require('../middlewares/notifications');

// Middleware de autenticación para todas las rutas
router.use(protect);

// POST /api/notifications/register-token
// Registrar un nuevo push token para el usuario
router.post('/register-token', validateTokenRegistration, async (req, res) => {
  try {
    const { pushToken, userId } = req.body;

    // Verificar que el usuario autenticado sea el mismo del request
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para registrar token de otro usuario'
      });
    }

    // Actualizar el push token del usuario
    await db.collection('users').doc(userId).update({
      pushToken,
      tokenUpdatedAt: new Date().toISOString(),
    });

    console.log(`✅ Push token registrado para usuario ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Push token registrado exitosamente',
    });

  } catch (error) {
    console.error('Error registrando push token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// PUT /api/notifications/preferences
// Actualizar preferencias de notificaciones del usuario
router.put('/preferences', validateNotificationPreferences, async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.user.userId;

    // Actualizar preferencias del usuario
    await db.collection('users').doc(userId).update({
      notificationPreferences: preferences,
      preferencesUpdatedAt: new Date().toISOString(),
    });

    console.log(`✅ Preferencias actualizadas para usuario ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Preferencias actualizadas exitosamente',
      preferences,
    });

  } catch (error) {
    console.error('Error actualizando preferencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// GET /api/notifications/preferences
// Obtener preferencias actuales del usuario
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.userId;
    const preferences = await notificationService.getUserPreferences(userId);

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      preferences,
    });

  } catch (error) {
    console.error('Error obteniendo preferencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// POST /api/notifications/test
// Enviar notificación de prueba
router.post('/test', validateTestNotification, testNotificationRateLimit, async (req, res) => {
  try {
    const { userId, message, title } = req.body;

    // Verificar que el usuario autenticado sea el mismo del request
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para enviar notificación a otro usuario'
      });
    }

    // Obtener información del usuario
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const userData = userDoc.data();

    if (!userData.pushToken) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no tiene un push token registrado',
      });
    }

    // Enviar notificación de prueba
    const result = await notificationService.sendNotification(
      userData.pushToken,
      title || '🧪 Notificación de Prueba',
      message,
      {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      userId
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Notificación de prueba enviada exitosamente',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No se pudo enviar la notificación',
        error: result.error || result.reason,
      });
    }

  } catch (error) {
    console.error('Error enviando notificación de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// POST /api/notifications/enable
// Habilitar notificaciones para el usuario
router.post('/enable', async (req, res) => {
  try {
    const userId = req.user.userId;

    await db.collection('users').doc(userId).update({
      notificationsEnabled: true,
      enabledAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: 'Notificaciones habilitadas exitosamente',
    });

  } catch (error) {
    console.error('Error habilitando notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// POST /api/notifications/disable
// Deshabilitar notificaciones para el usuario
router.post('/disable', async (req, res) => {
  try {
    const userId = req.user.userId;

    await db.collection('users').doc(userId).update({
      notificationsEnabled: false,
      disabledAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: 'Notificaciones deshabilitadas exitosamente',
    });

  } catch (error) {
    console.error('Error deshabilitando notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// GET /api/notifications/status
// Obtener estado actual de notificaciones del usuario
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.userId;

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const userData = userDoc.data();

    res.status(200).json({
      success: true,
      status: {
        notificationsEnabled: userData.notificationsEnabled !== false,
        hasPushToken: !!userData.pushToken,
        preferences: userData.notificationPreferences || {
          reminders: true,
          confirmations: true,
          weatherAlerts: true,
        },
        tokenUpdatedAt: userData.tokenUpdatedAt,
        preferencesUpdatedAt: userData.preferencesUpdatedAt,
      },
    });

  } catch (error) {
    console.error('Error obteniendo estado de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// DELETE /api/notifications/token
// Eliminar push token del usuario
router.delete('/token', async (req, res) => {
  try {
    const userId = req.user.userId;

    await db.collection('users').doc(userId).update({
      pushToken: null,
      tokenRemovedAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: 'Push token eliminado exitosamente',
    });

  } catch (error) {
    console.error('Error eliminando push token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// GET /api/notifications/weather/:location
// Obtener pronóstico del clima para una ubicación (solo para admins)
router.get('/weather/:location', async (req, res) => {
  try {
    // Verificar si es admin
    const userId = req.user.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No autorizado. Solo administradores pueden acceder a esta información.',
      });
    }

    const { location } = req.params;
    const { date } = req.query;

    // Si no se proporciona fecha, usar mañana
    const targetDate = date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const weatherData = await weatherService.getWeatherForecast(location, targetDate);

    res.status(200).json({
      success: true,
      weather: weatherData,
    });

  } catch (error) {
    console.error('Error obteniendo pronóstico del clima:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
});

// POST /api/notifications/jobs/:jobName/run
// Ejecutar un job manualmente (solo para admins)
router.post('/jobs/:jobName/run', async (req, res) => {
  try {
    // Verificar si es admin
    const userId = req.user.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No autorizado. Solo administradores pueden ejecutar jobs.',
      });
    }

    const { jobName } = req.params;
    const jobs = NotificationJobs.start();

    await jobs.runJobManually(jobName);

    res.status(200).json({
      success: true,
      message: `Job "${jobName}" ejecutado exitosamente`,
    });

  } catch (error) {
    console.error('Error ejecutando job:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
});

module.exports = router;
