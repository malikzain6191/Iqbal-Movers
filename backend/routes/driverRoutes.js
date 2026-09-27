const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/driverController');

router.use(verifyToken);
router.get('/', controller.getAllDrivers);
router.post('/', requireRole('super_admin', 'city_admin'), controller.createDriver);
router.post('/:id/suspend', requireRole('super_admin', 'city_admin'), controller.toggleDriverStatus);

module.exports = router;
