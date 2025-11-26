const { generateUploadSignature } = require('../services/users/uploadSignature.service');
const { updateProfileService } = require('../services/users/updateProfile.service');
const { getProfileService } = require('../services/users/getProfile.service');

// POST /api/users/upload-signature
const uploadSignature = async (req, res) => {
  try {
    const result = await generateUploadSignature();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al generar la firma de Cloudinary para avatar: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await getProfileService(userId);

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al obtener el perfil: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nombre, apellido, telefono, fotoUrl } = req.body;

    const result = await updateProfileService({
      userId,
      nombre,
      apellido,
      telefono,
      fotoUrl,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al actualizar el perfil: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  uploadSignature,
  getProfile,
  updateProfile,
};
