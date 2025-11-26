const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// --- ENDPOINT PARA REGISTRAR UN NUEVO USUARIO ---
// POST /api/auth/register
router.post('/register', authController.register);

// --- ENDPOINT PARA INICIAR SESIÓN ---
// POST /api/auth/login
router.post('/login', authController.login);

// --- ENDPOINT PARA LOGIN CON GOOGLE ---
// POST /api/auth/google-login
router.post('/google-login', authController.googleLogin);

module.exports = router;
