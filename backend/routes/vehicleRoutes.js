const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/vehicleController');

router.use(verifyToken);
router.get('/', controller.getAllVehicle);
router.get('/:id', controller.getVehicleByID);
router.post('/', requireRole('super_admin', 'city_admin'), controller.createVehicle);
router.post('/:id/status', requireRole('super_admin', 'city_admin'), controller.changeVehicleStatus);

module.exports = router;
