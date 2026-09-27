const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/userController');

router.use(verifyToken, requireRole('super_admin'));
router.get('/', controller.getAllUsers);
router.post('/', controller.createUser);
router.patch('/:id/status', controller.toggleUserStatus);

module.exports = router;
