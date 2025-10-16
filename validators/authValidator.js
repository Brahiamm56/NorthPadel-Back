const Joi = require('joi');

// Reglas para el registro de un nuevo usuario
const registerSchema = Joi.object({
  nombre: Joi.string().min(3).required(),
  apellido: Joi.string().allow('').optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  telefono: Joi.string().allow('').optional(),
});

// Reglas para el inicio de sesión
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
};