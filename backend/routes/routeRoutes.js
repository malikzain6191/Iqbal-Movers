const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/routeController');

router.use(verifyToken);
router.get('/', controller.getAllRoutes);
router.post('/', requireRole('super_admin', 'city_admin'), controller.createRoute);

module.exports = router;
