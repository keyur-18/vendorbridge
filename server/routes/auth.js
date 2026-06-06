const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, getManagers } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticate, getMe);
router.get('/managers', authenticate, getManagers);

module.exports = router;
