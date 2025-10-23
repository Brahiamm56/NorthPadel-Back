const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase'); // Importamos nuestra conexión a la BD

// GET /api/canchas/ - Obtiene todos los complejos (sin cambios)
router.get('/', async (req, res) => {
  try {
    const complejosRef = db.collection('complejos');
    const snapshot = await complejosRef.get();
    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    const complejos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(complejos);
  } catch (error) {
    console.error("Error al obtener los complejos: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// --- ENDPOINT DE DETALLE MODIFICADO ---
// GET /api/canchas/:complejoId/:canchaId?fecha=YYYY-MM-DD
router.get('/:complejoId/:canchaId', async (req, res) => {
  try {
    const { complejoId, canchaId } = req.params;
    const { fecha } = req.query; // Obtenemos la fecha de la query string

    // 1. Obtener el documento del complejo
    const complejoDoc = await db.collection('complejos').doc(complejoId).get();
    if (!complejoDoc.exists) {
      return res.status(404).json({ message: 'No se encontró el complejo.' });
    }

    // 2. Buscar la cancha específica
    const complejoData = complejoDoc.data();
    const cancha = complejoData.canchas.find(c => c.id === canchaId);
    if (!cancha) {
      return res.status(404).json({ message: 'No se encontró la cancha.' });
    }

    // 3. Buscar SOLO reservas CONFIRMADAS para esa cancha y esa fecha
    // Las reservas Pendientes y Canceladas NO bloquean el horario
    let horariosReservados = [];
    let horariosBloqueados = [];
    
    if (fecha) {
        // 3a. Obtener reservas confirmadas
        const reservasSnapshot = await db.collection('reservas')
            .where('canchaId', '==', canchaId)
            .where('fecha', '==', fecha)
            .where('estado', '==', 'Confirmada') // ← SOLO CONFIRMADAS
            .get();
        
        if (!reservasSnapshot.empty) {
            horariosReservados = reservasSnapshot.docs.map(doc => doc.data().hora);
        }

        // 3b. Obtener bloqueos de la cancha para esa fecha
        if (cancha.bloqueos) {
            horariosBloqueados = cancha.bloqueos
                .filter(bloqueo => bloqueo.fecha === fecha)
                .map(bloqueo => bloqueo.hora);
        }
    }

    // 4. Enriquecer los datos con horarios reservados y bloqueados separados
    const canchaDetalle = {
      ...cancha, // Incluye: id, nombre, imagenUrl, precioHora, descripcion, esTechada, vendePelotitas, horaInicio, horaFin
      complejoNombre: complejoData.nombre,
      caracteristicas: ['Techada', 'Blindex', 'Iluminación LED', 'Vestuarios'],
      horariosReservados: horariosReservados, // Horarios con reservas confirmadas
      horariosBloqueados: horariosBloqueados  // Horarios bloqueados por el admin
    };

    res.status(200).json(canchaDetalle);

  } catch (error) {
    console.error("Error al obtener el detalle de la cancha: ", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// No olvides exportar el router para poder usarlo en index.js
module.exports = router;
