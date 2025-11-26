const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary con las credenciales del .env
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Servicio: generar firma de Cloudinary para avatar
const generateUploadSignature = async () => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = 'northpadel/avatars'; // Carpeta específica para fotos de usuarios

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    process.env.API_SECRET,
  );

  return {
    status: 200,
    body: {
      timestamp,
      signature,
      folder,
      api_key: process.env.API_KEY,
    },
  };
};

module.exports = {
  generateUploadSignature,
};
