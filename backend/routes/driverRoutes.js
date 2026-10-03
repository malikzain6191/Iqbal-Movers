const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/driverController');
const itineraryController = require('../controllers/resourceItineraryController');

router.use(verifyToken);
router.get('/', controller.getAllDrivers);
router.get('/:id/itinerary', itineraryController.getDriverItinerary);
router.post('/', requireRole('super_admin', 'city_admin'), controller.createDriver);
router.post('/:id/suspend', requireRole('super_admin', 'city_admin'), controller.toggleDriverStatus);

module.exports = router;
