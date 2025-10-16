const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
  
    if (error) {
      // Si hay un error de validación, enviamos una respuesta 400 (Bad Request)
      // con los detalles del error.
      return res.status(400).json({
        message: error.details[0].message,
      });
    }
  
    // Si no hay errores, continuamos con la siguiente función (la lógica del endpoint)
    next();
  };
  
  module.exports = validate;