const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/scheduleController');
const bookingController = require('../controllers/bookingController');

router.use(verifyToken);
router.get('/availability', requireRole('super_admin', 'city_admin'), controller.getAvailability);
router.get('/incoming', requireRole('city_admin'), controller.getIncomingSchedules);
router.get('/', controller.getAllSchedules);
router.get('/:id/seats', controller.getScheduleSeats);
router.get('/:id/manifest', bookingController.getManifest);
router.post('/', requireRole('super_admin', 'city_admin'), controller.createSchedule);
router.post('/:id/cancel', requireRole('super_admin', 'city_admin'), controller.cancelSchedule);
router.post('/:id/replace-vehicle', requireRole('super_admin', 'city_admin'), controller.replaceVehicle);

module.exports = router;
