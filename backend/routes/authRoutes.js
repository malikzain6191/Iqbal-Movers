const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const controller = require('../controllers/authController');

router.post('/login', controller.login);
router.get('/me', verifyToken, controller.me);

module.exports = router;
