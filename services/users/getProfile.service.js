const { getUserById } = require('../../repositories/users.repository');

/**
 * Servicio para obtener el perfil de un usuario
 * @param {string} userId - ID del usuario en Firebase
 */
const getProfileService = async (userId) => {
    try {
        console.log('🔍 Obteniendo perfil para userId:', userId);

        // Obtener usuario desde Firebase
        const user = await getUserById(userId);

        console.log('📦 Usuario obtenido de Firebase:', JSON.stringify(user, null, 2));

        if (!user) {
            console.log('❌ Usuario no encontrado en Firebase');
            return {
                status: 404,
                body: { message: 'Usuario no encontrado.' },
            };
        }

        // Los datos del usuario están en user.data, no en user directamente
        const userData = user.data;

        const response = {
            uid: user.id, // El id del documento
            email: userData.email || '',
            nombre: userData.nombre || '',
            apellido: userData.apellido || '',
            telefono: userData.telefono || '',
            fotoUrl: userData.fotoUrl || '',
            rol: userData.rol || 'usuario',
            emailVerified: userData.emailVerified || false,
            createdAt: userData.createdAt || null,
        };

        console.log('✅ Respuesta del servicio getProfile:', JSON.stringify(response, null, 2));

        // Devolver los datos del usuario
        return {
            status: 200,
            body: response,
        };
    } catch (error) {
        console.error('❌ Error en getProfileService:', error);
        return {
            status: 500,
            body: { message: 'Error al obtener el perfil del usuario.' },
        };
    }
};

module.exports = {
    getProfileService,
};
