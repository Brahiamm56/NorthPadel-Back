const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase'); // Importamos nuestra conexión a la BD

// --- DEFINIMOS NUESTRO PRIMER ENDPOINT ---
// GET /api/canchas/ - Obtiene todos los complejos con sus canchas
router.get('/', async (req, res) => {
  try {
    // 1. Apuntar a la colección 'complejos' en Firestore
    const complejosRef = db.collection('complejos');
    const snapshot = await complejosRef.get();

    // Si no hay complejos, devolver un array vacío
    if (snapshot.empty) {
      console.log('No se encontraron complejos.');
      return res.status(200).json([]);
    }

    // 2. Mapear los resultados para darles el formato que necesitamos
    const complejos = [];
    snapshot.forEach(doc => {
      complejos.push({
        id: doc.id, // El ID del documento
        ...doc.data() // Todos los datos dentro del documento (nombre, canchas, etc.)
      });
    });

    // 3. Enviar la respuesta con los datos
    res.status(200).json(complejos);

  } catch (error) {
    console.error("Error al obtener los complejos: ", error);
    res.status(500).send("Error interno del servidor al obtener los complejos.");
  }
});

// --- AÑADE ESTE NUEVO ENDPOINT ---
// GET /api/canchas/:complejoId/:canchaId - Obtiene el detalle de una cancha específica
router.get('/:complejoId/:canchaId', async (req, res) => {
  try {
    // 1. Obtener los IDs de los parámetros de la URL
    const { complejoId, canchaId } = req.params;

    // 2. Obtener el documento del complejo específico
    const complejoRef = db.collection('complejos').doc(complejoId);
    const doc = await complejoRef.get();

    // Si el complejo no existe, enviar un error 404
    if (!doc.exists) {
      return res.status(404).send('No se encontró el complejo.');
    }

    // 3. Buscar la cancha específica dentro del array de canchas del complejo
    const complejoData = doc.data();
    const cancha = complejoData.canchas.find(c => c.id === canchaId);

    // Si la cancha no se encuentra en ese complejo, enviar un error 404
    if (!cancha) {
      return res.status(404).send('No se encontró la cancha en este complejo.');
    }

    // 4. (Opcional) Enriquecer los datos con más detalles (como en los mocks del frontend)
    const canchaDetalle = {
      ...cancha, // Incluye los datos básicos: id, nombre, imagenUrl, precioHora
      complejoNombre: complejoData.nombre,
      descripcion: `${cancha.nombre} es una de nuestras canchas premium en ${complejoData.nombre}. Cuenta con superficie de césped sintético de última generación y excelente iluminación.`,
      caracteristicas: ['Techada', 'Blindex', 'Iluminación LED', 'Vestuarios'],
      horariosDisponibles: ['18:00', '19:00', '20:00', '21:00', '22:00']
    };

    // 5. Enviar la respuesta con los detalles de la cancha
    res.status(200).json(canchaDetalle);

  } catch (error) {
    console.error("Error al obtener el detalle de la cancha: ", error);
    res.status(500).send("Error interno del servidor.");
  }
});

// No olvides exportar el router para poder usarlo en index.js
module.exports = router;
