// functions/index.js

// Importar las dependencias necesarias de Firebase Functions y Admin SDK
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializar el Admin SDK (esto permite a la función interactuar con Firestore, etc.)
// No necesita credenciales aquí, las toma automáticamente del entorno de Firebase.
admin.initializeApp();

// Obtener una referencia a Firestore
const db = admin.firestore();

/**
 * Cloud Function que se dispara CADA VEZ que se CREA un nuevo documento
 * en la colección 'reservas'.
 */
exports.onReservaCreada = functions.firestore
    .document("reservas/{reservaId}") // Escucha en la ruta 'reservas/CUALQUIER_ID'
    .onCreate(async (snap, context) => {
        // snap.data() contiene los datos del NUEVO documento de reserva creado
        const nuevaReserva = snap.data();
        const reservaId = context.params.reservaId; // El ID del nuevo documento

        console.log(`Nueva reserva detectada (${reservaId}):`, nuevaReserva);

        // --- PASOS LÓGICOS ---

        // 1. Obtener el ID del complejo de la nueva reserva
        const complejoId = nuevaReserva.complejoId;
        if (!complejoId) {
            console.error("La reserva no tiene complejoId. No se puede notificar.");
            return null; // Termina la ejecución de la función
        }

        // 2. Buscar al administrador de ese complejo
        console.log(`Buscando administrador para complejoId: ${complejoId}`);
        const usersRef = db.collection("users");
        const adminQuery = await usersRef
            .where("complejoId", "==", complejoId)
            .where("role", "==", "admin")
            .limit(1) // Solo debería haber un admin por complejo
            .get();

        if (adminQuery.empty) {
            console.error(`No se encontró administrador para el complejo ${complejoId}.`);
            return null;
        }

        const adminData = adminQuery.docs[0].data();
        const adminId = adminQuery.docs[0].id;
        console.log(`Administrador encontrado: ${adminData.nombre} (ID: ${adminId})`);

        // 3. (Futuro) Obtener el Token de Notificación Push del Admin
        // Necesitaríamos guardar el token (expoPushToken) en el documento del admin
        // const expoPushToken = adminData.expoPushToken;
        // if (!expoPushToken) {
        //    console.log(`El admin ${adminData.nombre} no tiene un token de notificación.`);
        //    return null;
        // }

        // 4. Construir y Enviar la Notificación Push (Ejemplo Básico)
        const mensaje = {
            // to: expoPushToken, // Descomentar cuando tengamos el token
            sound: "default",
            title: "¡Nueva Reserva!",
            body: `Se ha creado una nueva reserva para la cancha ${nuevaReserva.canchaId || "?"} a las ${nuevaReserva.hora || "?"}.`,
            data: { reservaId: reservaId }, // Datos extras que quieras enviar a la app
        };

        console.log("Preparando para enviar notificación:", mensaje);

        // Aquí iría la lógica para enviar la notificación usando Expo Push API o FCM
        // try {
        //    await fetch('[https://exp.host/--/api/v2/push/send](https://exp.host/--/api/v2/push/send)', {
        //      method: 'POST',
        //      headers: { /* ... headers ... */ },
        //      body: JSON.stringify([mensaje])
        //    });
        //    console.log("Notificación enviada exitosamente.");
        // } catch (error) {
        //    console.error("Error al enviar la notificación:", error);
        // }

        // Por ahora, solo logueamos que llegamos a este punto
        console.log("Simulación: Notificación enviada (o se intentaría enviar).");


        return null; // Indica que la función terminó correctamente
    });

