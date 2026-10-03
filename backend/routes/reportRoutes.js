const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/reportController');

router.use(verifyToken);
router.get('/dashboard/today', controller.getTodayDashboard);
router.get('/daily-sales', controller.getDailySales);
router.get('/route-revenue', requireRole('super_admin', 'city_admin'), controller.getRouteRevenue);
router.get('/vehicle-utilization', requireRole('super_admin', 'city_admin'), controller.getVehicleUtilization);
router.get('/driver-performance', requireRole('super_admin', 'city_admin'), controller.getDriverPerformance);
router.get('/cash-collection', controller.getCashCollection);
router.get('/trip-history', requireRole('super_admin'), controller.getTripHistory);

module.exports = router;
