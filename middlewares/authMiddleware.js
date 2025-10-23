const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  // Buscamos el token en los headers de la petición
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extraemos el token (ej: "Bearer eyJhbGci...")
      token = req.headers.authorization.split(' ')[1];

      // Verificamos y decodificamos el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_por_defecto');

      // Añadimos los datos del usuario (del token) al objeto 'req'
      // para que las rutas posteriores puedan usarlo.
      req.user = {
          userId: decoded.userId,
          role: decoded.role
      };

      return next(); // Si todo está bien, continuamos
    } catch (error) {
      return res.status(401).json({ message: 'Token no válido o expirado' });
    }
  } else {
    return res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};

module.exports = { protect };