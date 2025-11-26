const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const usersController = require('../controllers/users.controller');

// --- ENDPOINT PARA GENERAR FIRMA DE CLOUDINARY PARA AVATAR ---
// POST /api/users/upload-signature
router.post('/upload-signature', protect, usersController.uploadSignature);

// --- ENDPOINT PARA OBTENER PERFIL DE USUARIO ---
// GET /api/users/profile
router.get('/profile', protect, usersController.getProfile);

// --- ENDPOINT PARA ACTUALIZAR PERFIL DE USUARIO ---
// PUT /api/users/profile
router.put('/profile', protect, usersController.updateProfile);

module.exports = router;
