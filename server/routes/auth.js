const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticate, getMe);

module.exports = router;
