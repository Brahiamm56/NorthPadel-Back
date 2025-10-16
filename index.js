// Importar las dependencias
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carga las variables de entorno

// Al importar este archivo, se ejecuta el código de conexión a Firebase
const { db } = require('./config/firebase');

// --- 1. IMPORTAR LAS RUTAS ---
const canchasRoutes = require('./routes/canchas');
const reservasRoutes = require('./routes/reservas');
const authRoutes = require('./routes/auth'); // <-- LÍNEA AÑADIDA

// Crear la aplicación de Express
const app = express();

// Middlewares
app.use(cors()); // Habilita CORS para permitir peticiones desde tu app
app.use(express.json()); // Permite que el servidor entienda peticiones con cuerpo en formato JSON

// --- 2. USAR LAS RUTAS ---
// Cualquier petición a /api/canchas será manejada por canchasRoutes
app.use('/api/canchas', canchasRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/auth', authRoutes); // <-- LÍNEA AÑADIDA

// Definir una ruta de prueba
app.get('/', (req, res) => {
  res.send('¡El servidor de NorthPadel está funcionando!');
});

// Definir el puerto
const PORT = process.env.PORT || 3000;

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});