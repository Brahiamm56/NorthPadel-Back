const { registerUser } = require('../services/register.service');
const { loginUser } = require('../services/login.service');
const { googleLogin } = require('../services/googleLogin.service');

// Controlador para registro
const register = async (req, res) => {
  try {
    const result = await registerUser(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al registrar el usuario: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Controlador para login con email/password
const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error al iniciar sesión: ', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Controlador para login con Google
const googleLoginController = async (req, res) => {
  try {
    const result = await googleLogin(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[Google Login] Error:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  register,
  login,
  googleLogin: googleLoginController,
};

