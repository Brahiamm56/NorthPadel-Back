const { Expo } = require('expo-server-sdk');
const Joi = require('joi');

// Validar que un push token de Expo sea válido
const validatePushToken = (req, res, next) => {
  const { pushToken } = req.body;
  
  if (!pushToken) {
    return res.status(400).json({ 
      success: false,
      message: 'El push token es requerido' 
    });
  }

  if (!Expo.isExpoPushToken(pushToken)) {
    return res.status(400).json({ 
      success: false,
      message: 'Push token inválido. Debe ser un token de Expo válido' 
    });
  }
  
  next();
};

// Validar preferencias de notificaciones
const validateNotificationPreferences = (req, res, next) => {
  const schema = Joi.object({
    reminders: Joi.boolean().optional(),
    confirmations: Joi.boolean().optional(),
    weatherAlerts: Joi.boolean().optional(),
  });

  const { preferences } = req.body;

  if (!preferences) {
    return res.status(400).json({
      success: false,
      message: 'Las preferencias son requeridas'
    });
  }

  const { error } = schema.validate(preferences);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  next();
};

// Validar datos para notificación de prueba
const validateTestNotification = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    message: Joi.string().min(1).max(200).required(),
    title: Joi.string().min(1).max(100).optional(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  next();
};

// Validar registro de push token
const validateTokenRegistration = (req, res, next) => {
  const schema = Joi.object({
    pushToken: Joi.string().required(),
    userId: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  // Validar formato del token
  if (!Expo.isExpoPushToken(req.body.pushToken)) {
    return res.status(400).json({
      success: false,
      message: 'Push token inválido. Debe ser un token de Expo válido'
    });
  }

  next();
};

// Middleware para verificar si el usuario tiene notificaciones habilitadas
const checkNotificationsEnabled = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const { db } = require('../config/firebase');

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();
    
    if (userData.notificationsEnabled === false) {
      return res.status(403).json({
        success: false,
        message: 'Las notificaciones están deshabilitadas para este usuario'
      });
    }

    // Agregar datos del usuario al request para uso posterior
    req.user = {
      id: userId,
      pushToken: userData.pushToken,
      preferences: userData.notificationPreferences || {
        reminders: true,
        confirmations: true,
        weatherAlerts: true,
      }
    };

    next();
  } catch (error) {
    console.error('Error verificando notificaciones habilitadas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Validar que el usuario existe antes de operaciones de notificaciones
const validateUserExists = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const { db } = require('../config/firebase');

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    next();
  } catch (error) {
    console.error('Error validando usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para rate limiting de notificaciones
const createNotificationRateLimit = (maxNotifications = 5, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    const { userId } = req.body;
    const now = Date.now();
    const key = userId;

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);
    
    // Limpiar solicitudes antiguas
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    requests.set(key, validRequests);

    if (validRequests.length >= maxNotifications) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes de notificación. Por favor, espera antes de enviar otra.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Agregar esta solicitud
    validRequests.push(now);

    next();
  };
};

// Rate limiting específico para notificaciones de prueba
const testNotificationRateLimit = createNotificationRateLimit(3, 300000); // 3 por 5 minutos

module.exports = {
  validatePushToken,
  validateNotificationPreferences,
  validateTestNotification,
  validateTokenRegistration,
  checkNotificationsEnabled,
  validateUserExists,
  testNotificationRateLimit,
};
