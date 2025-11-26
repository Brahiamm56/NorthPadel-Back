// Importar las dependencias
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carga las variables de entorno

// Al importar este archivo, se ejecuta el código de conexión a Firebase
const { db } = require('./config/firebase');

// Importar sistema de jobs programados
let NotificationJobs = {
  start: () => {
    console.log('⚠️ Sistema de notificaciones programadas no disponible (módulo ./jobs/notificationJobs no encontrado).');
  }
};

try {
  NotificationJobs = require('./jobs/notificationJobs');
} catch (error) {
  console.warn('⚠️ No se pudo cargar ./jobs/notificationJobs. Las notificaciones programadas estarán deshabilitadas.', error.message);
}

// --- 1. IMPORTAR LAS RUTAS ---
const canchasRoutes = require('./routes/canchas');
const reservasRoutes = require('./routes/reservas');
const authRoutes = require('./routes/auth'); // <-- LÍNEA AÑADIDA
const adminRoutes = require('./routes/admin');
const notificationsRoutes = require('./routes/notifications'); // <-- Rutas de notificaciones
const userRoutes = require('./routes/users'); // <-- Rutas de usuarios

// Crear la aplicación de Express
const app = express();

// Middlewares
app.use(cors()); // Habilita CORS para permitir peticiones desde tu app
app.use(express.json()); // Permite que el servidor entienda peticiones con cuerpo en formato JSON

// Middleware para registrar todas las peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// --- 2. USAR LAS RUTAS ---
// Cualquier petición a /api/canchas será manejada por canchasRoutes
app.use('/api/canchas', canchasRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/auth', authRoutes); // <-- LÍNEA AÑADIDA
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes); // <-- Rutas de notificaciones
app.use('/api/users', userRoutes); // <-- Rutas de usuarios

// Definir una ruta de prueba
app.get('/', (req, res) => {
  res.send('¡El servidor de NorthPadel está funcionando!');
});

// Definir el puerto
const PORT = process.env.PORT || 3000;

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  
  // Iniciar jobs programados si las notificaciones están habilitadas
  if (process.env.NOTIFICATION_ENABLED !== 'false') {
    console.log('🚀 Iniciando sistema de notificaciones programadas...');
    try {
      NotificationJobs.start();
      console.log('✅ Sistema de notificaciones programadas iniciado correctamente');
    } catch (error) {
      console.error('❌ Error iniciando sistema de notificaciones:', error);
    }
  } else {
    console.log('⚠️ Notificaciones deshabilitadas (NOTIFICATION_ENABLED=false)');
  }
});